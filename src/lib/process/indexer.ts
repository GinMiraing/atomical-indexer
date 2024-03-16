import dayjs from "dayjs";

import electrumClient from "../api/electrum";
import { isDMINT, isREALM, isSubRealm } from "../api/electrum/utils";
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
          await sleep(1000 * 60 * 1);
          continue;
        }

        const { result: atomical } = await electrumClient.atomicalsGetState(
          startAtomicalNumber,
          true,
        );

        if (isDMINT(atomical)) {
          await DatabaseInstance.atomical_dmitem.upsert({
            create: {
              atomical_id: atomical.atomical_id,
              atomical_number: atomical.atomical_number,
              container: atomical.$parent_container_name || "",
              dmitem: atomical.$request_dmitem || "",
              status:
                atomical.$request_dmitem_status.status === "verified"
                  ? 1
                  : atomical.$request_dmitem_status.status.startsWith("pending")
                    ? 2
                    : 3,
              mint_time: atomical.mint_info?.args?.time || 0,
              update_at: dayjs().unix(),
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
              name: atomical.$request_realm || "",
              status:
                atomical.$request_realm_status.status === "verified"
                  ? 1
                  : atomical.$request_realm_status.status.startsWith("pending")
                    ? 2
                    : 3,
              mint_time: atomical.mint_info?.args?.time || 0,
              update_at: dayjs().unix(),
            },
            update: {},
            where: {
              atomical_id: atomical.atomical_id,
            },
          });
        } else if (isSubRealm(atomical)) {
          await DatabaseInstance.atomical_subrealm.upsert({
            create: {
              atomical_id: atomical.atomical_id,
              atomical_number: atomical.atomical_number,
              parent_id: atomical.mint_data?.fields?.args?.parent_realm || "",
              name: atomical.$request_subrealm || "",
              full_name: atomical.$request_full_realm_name || "",
              status:
                atomical.$request_subrealm_status.status === "verified"
                  ? 1
                  : atomical.$request_subrealm_status.status.startsWith(
                        "pending",
                      )
                    ? 2
                    : 3,
              mint_time: atomical.mint_info?.args?.time || 0,
              update_at: dayjs().unix(),
            },
            update: {},
            where: {
              atomical_id: atomical.atomical_id,
            },
          });
        }

        startAtomicalNumber += 1;
        await RedisInstance.set("indexer:start", startAtomicalNumber);

        console.log("completed count:", startAtomicalNumber);
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
