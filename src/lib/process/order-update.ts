import dayjs from "dayjs";

import { getOrderHistoryInAtomicalMarket } from "../api/market/atomicalmarket";
import { getOrderHistoryInBitatom } from "../api/market/bitatom";
import DatabaseInstance from "../server/prisma.server";
import RedisInstance from "../server/redis.server";
import { sleep } from "../utils";

const OrderUpdateProcess = async () => {
  try {
    do {
      console.log("start order sync");

      let bitatomCompleted = false;
      let atomicalMarketCompleted = false;

      let bitatomOrderPage = 1;
      let atomicalMarketOrderOffset = 0;

      try {
        const timestamp = await RedisInstance.get("update:timestamp:order");

        if (timestamp) {
          const now = dayjs().unix();
          const prev = Number(timestamp);

          const duration = 60 * 30;

          if (now - prev < duration) {
            await sleep(duration * 1000 + 5000);
            continue;
          }
        }

        const tokens = await DatabaseInstance.atomical_token.findMany({
          select: {
            name: true,
          },
          where: {
            is_hot: true,
            status: 1,
          },
        });

        for (const token of tokens) {
          bitatomOrderPage = 1;
          atomicalMarketOrderOffset = 0;

          do {
            try {
              await sleep(2000);

              console.log(token.name);
              console.log(bitatomOrderPage);

              const orders = await getOrderHistoryInBitatom(
                token.name,
                bitatomOrderPage,
              );

              if (orders.length === 0) {
                break;
              }

              for (const order of orders) {
                try {
                  await RedisInstance.sadd(
                    `order:bitatom:${token.name}`,
                    order.id,
                  );
                } catch (e) {}

                await DatabaseInstance.order.upsert({
                  create: {
                    bid: order.id,
                    market: "bitatom",
                    type: 1,
                    name: token.name,
                    seller: order.seller.address,
                    buyer: order.buying_address || order.buyer.address,
                    price: BigInt(order.price),
                    amount: order.atom_utxo.value,
                    created_at: order.created_at,
                    tx: order.buy_txid,
                  },
                  update: {},
                  where: {
                    bid: order.id,
                  },
                });
              }

              bitatomOrderPage += 1;
            } catch (e) {
              console.log(e);
              continue;
            }
          } while (true);

          do {
            try {
              await sleep(2000);

              console.log(token.name);
              console.log(atomicalMarketOrderOffset);

              const orders = await getOrderHistoryInAtomicalMarket(
                token.name,
                1000,
                atomicalMarketOrderOffset,
              );

              if (orders.length === 0) {
                break;
              }

              for (const order of orders) {
                if (!order.txId) {
                  continue;
                }

                try {
                  await RedisInstance.sadd(
                    `order:atomicalmarket:${token.name}`,
                    order.bid_id,
                  );
                } catch (e) {}

                await DatabaseInstance.order.upsert({
                  create: {
                    bid: order.bid_id,
                    market: "atomicalmarket",
                    type: 1,
                    name: token.name,
                    seller: order.seller_address,
                    buyer: order.buyer_address,
                    price: BigInt(parseFloat(order.price_sats).toFixed(0)),
                    amount: order.atomical_content.Amount,
                    created_at: dayjs(order.date).unix(),
                    tx: order.txId,
                  },
                  update: {},
                  where: {
                    bid: order.bid_id,
                  },
                });
              }

              atomicalMarketOrderOffset += orders.length;
            } catch (e) {
              console.log(e);
              continue;
            }
          } while (true);
        }

        await RedisInstance.set("update:timestamp:order", dayjs().unix());
      } catch (e) {
        console.log(e);

        await sleep(1000 * 10);
        continue;
      }
    } while (true);
  } catch (e) {
    console.error(e);
  }
};

OrderUpdateProcess();
