import dayjs from "dayjs";

import electrumClient from "../api/electrum";
import { isDMINT, isREALM, isSubRealm } from "../api/electrum/utils";
import DatabaseInstance from "../server/prisma.server";
import RedisInstance from "../server/redis.server";
import { sleep } from "../utils";

const StatusUpdateProcess = async () => {
  const selectClause = {
    atomical_id: true,
  };

  const whereClause = {
    status: 2,
  };

  try {
    do {
      try {
        const timestamp = await RedisInstance.get("update:timestamp:status");

        if (timestamp) {
          const now = dayjs().unix();
          const prev = Number(timestamp);

          const duration = 60 * 1;

          if (now - prev < duration) {
            await sleep(duration * 1000 + 5000);
            continue;
          }
        }

        const [dmitems, realms, subrealms] =
          await DatabaseInstance.$transaction([
            DatabaseInstance.atomical_dmitem.findMany({
              select: selectClause,
              where: whereClause,
            }),
            DatabaseInstance.atomical_realm.findMany({
              select: selectClause,
              where: whereClause,
            }),
            DatabaseInstance.atomical_subrealm.findMany({
              select: selectClause,
              where: whereClause,
            }),
          ]);

        if (dmitems.length > 0) {
          for (const dmitem of dmitems) {
            try {
              await sleep(1000);

              const { result } = await electrumClient.atomicalsGet(
                dmitem.atomical_id,
              );

              if (
                !isDMINT(result) ||
                !result.$request_dmitem_status ||
                result.$request_dmitem_status.status !== "verified"
              ) {
                continue;
              }

              await DatabaseInstance.atomical_dmitem.update({
                data: {
                  container: result.$parent_container_name,
                  status: 1,
                  update_at: dayjs().unix(),
                },
                where: {
                  atomical_id: dmitem.atomical_id,
                },
              });
            } catch (e) {
              console.error("update status failed:", dmitem.atomical_id);
              console.error("error:", e);
              continue;
            }
          }
        }

        if (realms.length > 0) {
          for (const realm of realms) {
            try {
              await sleep(1000);

              const { result } = await electrumClient.atomicalsGet(
                realm.atomical_id,
              );

              if (
                !isREALM(result) ||
                !result.$request_realm_status ||
                result.$request_realm_status.status !== "verified"
              ) {
                continue;
              }

              await DatabaseInstance.atomical_realm.update({
                data: {
                  status: 1,
                  update_at: dayjs().unix(),
                },
                where: {
                  atomical_id: realm.atomical_id,
                },
              });
            } catch (e) {
              console.error("update status failed:", realm.atomical_id);
              console.error("error:", e);
              continue;
            }
          }
        }

        if (subrealms.length > 0) {
          for (const subrealm of subrealms) {
            try {
              await sleep(1000);

              const { result } = await electrumClient.atomicalsGet(
                subrealm.atomical_id,
              );

              if (
                !isSubRealm(result) ||
                !result.$request_subrealm_status ||
                result.$request_subrealm_status.status !== "verified"
              ) {
                continue;
              }

              await DatabaseInstance.atomical_subrealm.update({
                data: {
                  status: 1,
                  update_at: dayjs().unix(),
                },
                where: {
                  atomical_id: subrealm.atomical_id,
                },
              });
            } catch (e) {
              console.error("update status failed:", subrealm.atomical_id);
              console.error("error:", e);
              continue;
            }
          }
        }

        await RedisInstance.set("update:timestamp:status", dayjs().unix());
      } catch (e) {
        console.error("update status error:", e);
        await sleep(10000);
        continue;
      }
    } while (true);
  } catch (e) {
    console.error(e);
  }
};

StatusUpdateProcess();
