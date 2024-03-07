import dayjs from "dayjs";

import electrumClient from "../api/electrum";
import {
  getTokenHolders,
  getTokenStatsInAtomicalMarket,
} from "../api/market/atomicalmarket";
import { getTokenStatsInBitatom } from "../api/market/bitatom";
import DatabaseInstance from "../server/prisma.server";
import RedisInstance from "../server/redis.server";
import { sleep } from "../utils";

const TokenUpdateProcess = async () => {
  try {
    do {
      console.log("start token update");

      try {
        const timestamp = await RedisInstance.get(
          "update:timestamp:tokens:all",
        );

        if (timestamp) {
          const now = dayjs().unix();
          const prev = Number(timestamp);

          const duration = 60 * 20;

          if (now - prev < duration) {
            await sleep(duration * 1000 + 5000);
            continue;
          }
        }

        const tokens = await DatabaseInstance.atomical_token.findMany({
          select: {
            atomical_id: true,
            name: true,
          },
        });

        for (const token of tokens) {
          try {
            await sleep(1000);

            const temp = {
              atomical_id: token.atomical_id,
              bitworkc: "",
              bitworkr: "",
              circulating_supply: "0",
              minted: "0",
              holders: 0,
              is_hot: false,
              update_at: 0,
            };

            const { result: tokenIndexerData } =
              await electrumClient.atomicalsGetFtInfo(token.atomical_id);

            if (
              !tokenIndexerData.dft_info &&
              !tokenIndexerData.location_summary
            )
              continue;

            temp.bitworkc =
              tokenIndexerData.$mint_mode === "fixed"
                ? tokenIndexerData.$mint_bitworkc || ""
                : tokenIndexerData.dft_info!.mint_bitworkc_current || "";
            temp.bitworkr =
              tokenIndexerData.$mint_mode === "fixed"
                ? tokenIndexerData.$mint_bitworkr || ""
                : tokenIndexerData.dft_info!.mint_bitworkr_current || "";
            temp.circulating_supply =
              tokenIndexerData.location_summary!.circulating_supply.toString() ||
              "0";
            temp.minted = (
              BigInt(tokenIndexerData.$mint_amount) *
              BigInt(tokenIndexerData.dft_info!.mint_count || 0)
            ).toString();
            temp.holders =
              tokenIndexerData.location_summary!.unique_holders || 0;
            temp.is_hot = false;
            temp.update_at = dayjs().unix();

            try {
              const holderData = await getTokenHolders(token.name);

              if (
                holderData &&
                holderData.holderList &&
                holderData.holderList.length > 0
              ) {
                await RedisInstance.set(
                  `holders:tokens:${token.name}`,
                  JSON.stringify(holderData.holderList),
                );
              }
            } catch (e) {
              console.error("get token holder data failed:", token.name);
              console.error("error:", e);
            }

            try {
              const atomicalMarketTokenData =
                await getTokenStatsInAtomicalMarket(token.name);

              if (atomicalMarketTokenData) {
                await RedisInstance.set(
                  `market:atomicalmarket:tokens:${token.name}`,
                  JSON.stringify({
                    floorPrice: atomicalMarketTokenData.floorPrice || 0,
                    totalListed: atomicalMarketTokenData.totalListed || 0,
                    volume1Day: atomicalMarketTokenData.volume1Day || 0,
                    volume7Days: atomicalMarketTokenData.volume7Days || 0,
                    volumeTotal: atomicalMarketTokenData.volumeTotal || 0,
                    sales1Day: atomicalMarketTokenData.sales1Day || 0,
                    marketCap:
                      atomicalMarketTokenData.floorPrice *
                        tokenIndexerData.location_summary!.circulating_supply ||
                      0,
                  }),
                );

                if (atomicalMarketTokenData.volumeTotal > 1000000) {
                  temp.is_hot = true;
                }
              }
            } catch (e) {
              // console.error(
              //   "get atomical market token data failed:",
              //   token.name,
              // );
              // console.error("error:", e);
            }

            try {
              const bitatomTokenData = await getTokenStatsInBitatom(token.name);

              if (bitatomTokenData) {
                await RedisInstance.set(
                  `market:bitatom:tokens:${token.name}`,
                  JSON.stringify({
                    floorPrice: bitatomTokenData.floorPrice || 0,
                    totalListed: bitatomTokenData.listings || 0,
                    volume1Day: bitatomTokenData.volume_24h || 0,
                    volume7Days: bitatomTokenData.volume_7d || 0,
                    volumeTotal: bitatomTokenData.volume_total || 0,
                    sales1Day: bitatomTokenData.sells_24h || 0,
                    marketCap: bitatomTokenData.market_cap || 0,
                  }),
                );
              }

              if (bitatomTokenData.volume_total > 1000000) {
                temp.is_hot = true;
              }
            } catch (e) {
              console.error(
                "get bitatom market token data failed:",
                token.name,
              );
              console.error("error:", e);
            }

            await DatabaseInstance.atomical_token.update({
              data: temp,
              where: {
                atomical_id: token.atomical_id,
              },
            });
          } catch (e) {
            console.error("get token update data failed:", token.name);
            console.error("error:", e);
            continue;
          }
        }

        await RedisInstance.set("update:timestamp:tokens:all", dayjs().unix());
      } catch (e) {
        console.error("update token error:", e);
        await sleep(10000);
        continue;
      }
    } while (true);
  } catch (e) {
    console.error(e);
  }
};

TokenUpdateProcess();
