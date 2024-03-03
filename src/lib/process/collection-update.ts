import dayjs from "dayjs";

import electrumClient from "../api/electrum";
import { isCONTAINER } from "../api/electrum/utils";
import { getCollectionHolders } from "../api/market/atomicalmarket";
import DatabaseInstance from "../server/prisma.server";
import RedisInstance from "../server/redis.server";
import { sleep } from "../utils";

const CollectionUpdateProcess = async () => {
  try {
    do {
      console.log("start collection update");

      try {
        const timestamp = await RedisInstance.get(
          "update:timestamp:collections:all",
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

        const collectionWithCount: {
          minted: bigint;
          container: string;
        }[] = await DatabaseInstance.$queryRaw`
            SELECT COUNT(*) AS minted, container
            FROM atomical_dmitem
            WHERE
                status = 1
            GROUP BY
                container
          `;

        for (const collection of collectionWithCount) {
          try {
            await sleep(1000);

            const { result: containerId } =
              await electrumClient.atomicalsGetByContainer(
                collection.container,
              );

            if (containerId.status !== "verified") continue;

            const { result: containerInfo } = await electrumClient.atomicalsGet(
              containerId.atomical_id,
            );

            if (!isCONTAINER(containerInfo)) continue;

            const holderInfo = await getCollectionHolders(
              containerInfo.$request_container,
            );

            await RedisInstance.set(
              `holders:collections:${containerInfo.$request_container}`,
              JSON.stringify(holderInfo.holderList),
            );

            await DatabaseInstance.atomical_container.upsert({
              create: {
                atomical_id: containerInfo.atomical_id,
                atomical_number: containerInfo.atomical_number,
                container: containerInfo.$request_container,
                name: containerInfo.$request_container,
                deploy_time: containerInfo.mint_info.args.time,
                item_count:
                  containerInfo.$container_dmint_status?.dmint.items || 0,
                minted_count: Number(collection.minted),
                holders: holderInfo.holderCount,
                rank: 0,
                update_at: dayjs().unix(),
                icon_url: "",
              },
              update: {
                minted_count: Number(collection.minted),
                holders: holderInfo.holderCount,
                update_at: dayjs().unix(),
              },
              where: {
                container: collection.container,
              },
            });
          } catch (e) {
            console.error(
              "get collection update data failed:",
              collection.container,
            );
            console.error("error:", e);
            continue;
          }
        }

        await RedisInstance.set(
          "update:timestamp:collections:all",
          dayjs().unix(),
        );
      } catch (e) {
        console.error("update collection error:", e);
        await sleep(10000);
        continue;
      }
    } while (true);
  } catch (e) {
    console.error(e);
  }
};

CollectionUpdateProcess();
