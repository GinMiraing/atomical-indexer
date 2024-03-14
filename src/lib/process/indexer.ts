import dayjs from "dayjs";

import electrumClient from "../api/electrum";
import { isDMINT } from "../api/electrum/utils";
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

        if (isDMINT(atomical)) {
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
