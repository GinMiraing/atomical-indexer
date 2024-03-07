import dayjs from "dayjs";

import electrumClient from "../api/electrum";
import { isDMINT, isFT, isREALM } from "../api/electrum/utils";
import DatabaseInstance from "../server/prisma.server";
import RedisInstance from "../server/redis.server";
import { sleep } from "../utils";

const IndexerProcess = async () => {
  try {
    const start = await RedisInstance.get("indexer:start");
    let startAtomicalNumber = start ? parseInt(start) : 0;

    do {
      try {
        await sleep(1000);

        const { global } = await electrumClient.atomicalsGetState(100, true);

        if (global.atomical_count === startAtomicalNumber) {
          await sleep(1000 * 60 * 10);
          continue;
        }

        const { result: atomical } = await electrumClient.atomicalsGetState(
          startAtomicalNumber,
          true,
        );

        if (isFT(atomical)) {
          await DatabaseInstance.atomical_token.upsert({
            create: {
              atomical_id: atomical.atomical_id,
              atomical_number: atomical.atomical_number,
              name: atomical.$request_ticker,
              bitworkc:
                atomical.$mint_mode === "fixed"
                  ? atomical.$mint_bitworkc || ""
                  : atomical.dft_info?.mint_bitworkc_current || "",
              bitworkr:
                atomical.$mint_mode === "fixed"
                  ? atomical.$mint_bitworkr || ""
                  : atomical.dft_info?.mint_bitworkr_current || "",
              status:
                atomical.$request_ticker_status.status === "verified"
                  ? 1
                  : atomical.$request_ticker_status.status.startsWith("pending")
                    ? 2
                    : 3,
              mint_mode: atomical.$mint_mode === "fixed" ? 1 : 2,
              deploy_time: atomical.mint_info.args.time,
              total_supply: atomical.$max_supply.toString(),
              circulating_supply: atomical.location_summary
                ? atomical.location_summary.circulating_supply.toString()
                : "0",
              mint_amount: atomical.$mint_amount.toString(),
              is_hot: false,
              rank: 0,
              holders: atomical.location_summary?.unique_holders || 0,
              minted: (
                BigInt(atomical.dft_info?.mint_count || 0) *
                BigInt(atomical.$mint_amount)
              ).toString(),
              update_at: dayjs().unix(),
              icon_url: "",
            },
            update: {},
            where: {
              atomical_id: atomical.atomical_id,
            },
          });
        } else if (isREALM(atomical)) {
          await DatabaseInstance.atomical_realm.upsert({
            create: {
              atomical_id: atomical.atomical_id,
              atomical_number: atomical.atomical_number,
              name: atomical.$full_realm_name || "",
              status:
                atomical.$request_realm_status.status === "verified"
                  ? 1
                  : atomical.$request_realm_status.status.startsWith("pending")
                    ? 2
                    : 3,
              mint_time: atomical.mint_info.args.time,
              update_at: dayjs().unix(),
            },
            update: {},
            where: {
              atomical_id: atomical.atomical_id,
            },
          });
        } else if (isDMINT(atomical)) {
          await DatabaseInstance.atomical_dmitem.upsert({
            create: {
              atomical_id: atomical.atomical_id,
              atomical_number: atomical.atomical_number,
              container: atomical.$parent_container_name || "",
              dmitem: atomical.$request_dmitem,
              status:
                atomical.$request_dmitem_status.status === "verified"
                  ? 1
                  : atomical.$request_dmitem_status.status.startsWith("pending")
                    ? 2
                    : 3,
              mint_time: atomical.mint_info.args.time,
              update_at: dayjs().unix(),
            },
            update: {},
            where: {
              atomical_id: atomical.atomical_id,
            },
          });
        }

        console.log("completed count:", startAtomicalNumber);

        startAtomicalNumber += 1;

        await RedisInstance.set("indexer:start", startAtomicalNumber);
      } catch (e) {
        console.error("indexer error:", e);
        await sleep(10000);
        continue;
      }
    } while (true);
  } catch (e) {
    console.error(e);
  }
};

IndexerProcess();
