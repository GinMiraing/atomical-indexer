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
  console.log("Token Update Process Start ========================");

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
            await sleep(500);

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
            temp.is_hot =
              tokenIndexerData.location_summary!.unique_holders > 500
                ? true
                : false;
            temp.update_at = dayjs().unix();

            const [holderData, atomicalMarketTokenData, bitatomTokenData] =
              await Promise.all([
                getTokenHolders(token.name),
                getTokenStatsInAtomicalMarket(token.name),
                getTokenStatsInBitatom(token.name),
              ]);

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

            if (atomicalMarketTokenData) {
              await RedisInstance.set(
                `market:atomicalmarket:tokens:${token.name}`,
                JSON.stringify({
                  floorPrice: atomicalMarketTokenData.floorPrice || 0,
                  listing: atomicalMarketTokenData.totalListed || 0,
                  volume24Hours: atomicalMarketTokenData.volume24Hour || 0,
                  volume7Days: atomicalMarketTokenData.volume7Days || 0,
                  volumeTotal: atomicalMarketTokenData.totalVolume || 0,
                  sell24Hours: atomicalMarketTokenData.sales24Hour || 0,
                  marketCap:
                    atomicalMarketTokenData.floorPrice *
                      tokenIndexerData.location_summary!.circulating_supply ||
                    0,
                }),
              );
            }

            if (bitatomTokenData) {
              await RedisInstance.set(
                `market:bitatom:tokens:${token.name}`,
                JSON.stringify({
                  floorPrice: bitatomTokenData.floorPrice || 0,
                  listing: bitatomTokenData.listings || 0,
                  volume24Hours: bitatomTokenData.volume_24h || 0,
                  volume7Days: bitatomTokenData.volume_7d || 0,
                  volumeTotal: bitatomTokenData.volume_total || 0,
                  sell24Hours: bitatomTokenData.sells_24h || 0,
                  marketCap: bitatomTokenData.market_cap || 0,
                }),
              );
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