import dayjs from "dayjs";

import electrumClient from "../api/electrum";
import { isREALM } from "../api/electrum/utils";
import DatabaseInstance from "../server/prisma.server";
import RedisInstance from "../server/redis.server";
import { sleep } from "../utils";

const ParentrealmUpdateProcess = async () => {
  try {
    do {
      try {
        const timestamp = await RedisInstance.get(
          "update:timestamp:parentrealm",
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

        const parentrealmsWithCount: {
          total: bigint;
          parent_id: string;
        }[] = await DatabaseInstance.$queryRaw`
            SELECT
              COUNT(*) AS total,
              parent_id
            FROM atomical_subrealm
            WHERE status = 1
            GROUP BY parent_id
          `;

        for (const parentrealm of parentrealmsWithCount) {
          try {
            await sleep(1000);

            const { result } = await electrumClient.atomicalsGetState(
              parentrealm.parent_id,
              true,
            );

            if (!isREALM(result)) continue;

            if (result.$request_realm_status.status !== "verified") continue;

            await DatabaseInstance.atomical_parentrealm.upsert({
              create: {
                atomical_id: parentrealm.parent_id,
                atomical_number: result.atomical_number,
                name: result.$request_realm,
                deploy_time: result.mint_info?.args?.time || 0,
                minted_count: Number(parentrealm.total),
                holders: 0,
                rank: 0,
                update_at: dayjs().unix(),
                icon_url: "",
              },
              update: {
                minted_count: Number(parentrealm.total),
                update_at: dayjs().unix(),
              },
              where: {
                atomical_id: parentrealm.parent_id,
              },
            });
          } catch (e) {
            console.error(
              "get parent realm update data failed:",
              parentrealm.parent_id,
            );
            console.error("error:", e);
            continue;
          }
        }

        await RedisInstance.set("update:timestamp:parentrealm", dayjs().unix());
      } catch (e) {
        console.error("update parent realm error:", e);
        await sleep(10000);
        continue;
      }
    } while (true);
  } catch (e) {
    console.error(e);
  }
};

ParentrealmUpdateProcess();
