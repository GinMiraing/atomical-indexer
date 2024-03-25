import { Psbt } from "bitcoinjs-lib";
import dayjs from "dayjs";

import electrumClient from "../api/electrum";
import { isDMINT, isREALM } from "../api/electrum/utils";
import DatabaseInstance from "../server/prisma.server";
import RedisInstance from "../server/redis.server";
import { sleep } from "../utils";
import {
  detectScriptToAddressType,
  reverseBuffer,
} from "../utils/electrum-helper";

const deleteOffer = async (id: number) => {
  await DatabaseInstance.atomical_offer.update({
    data: {
      status: 2,
    },
    where: {
      id,
    },
  });
};

const OfferCheckProcess = async () => {
  try {
    do {
      try {
        const timestamp = await RedisInstance.get(
          "update:timestamp:offer:check",
        );

        if (timestamp) {
          const now = dayjs().unix();
          const prev = Number(timestamp);

          const duration = 60 * 10;

          if (now - prev < duration) {
            await sleep(duration * 1000 + 5000);
            continue;
          }
        }

        const offers = await DatabaseInstance.atomical_offer.findMany({
          select: {
            id: true,
            atomical_id: true,
            tx: true,
            value: true,
            vout: true,
            list_account: true,
            signed_psbt: true,
          },
          where: { status: 1 },
          orderBy: { id: "asc" },
        });

        for (const offer of offers) {
          await sleep(1000);

          const { result } = await electrumClient.atomicalsGetState(
            offer.atomical_id,
            true,
          );

          if (!result) {
            deleteOffer(offer.id);
            continue;
          }

          if (
            (!isREALM(result) && !isDMINT(result)) ||
            result.subtype.includes("request")
          ) {
            deleteOffer(offer.id);
            continue;
          }

          if (!result.location_info || result.location_info.length === 0) {
            deleteOffer(offer.id);
            continue;
          }

          const atomicalLocation = result.location_info[0];

          if (
            atomicalLocation.txid !== offer.tx ||
            atomicalLocation.index !== offer.vout ||
            atomicalLocation.value !== offer.value
          ) {
            deleteOffer(offer.id);
            continue;
          }

          try {
            const owner = detectScriptToAddressType(atomicalLocation.script);

            if (owner !== offer.list_account) {
              throw new Error("atomical not owned by the address");
            }
          } catch (e) {
            deleteOffer(offer.id);
            continue;
          }

          const psbt = Psbt.fromHex(offer.signed_psbt);

          const inputTx = psbt.txInputs[0];
          const inputTxId = reverseBuffer(inputTx.hash).toString("hex");

          if (
            inputTxId !== atomicalLocation.txid ||
            inputTx.index !== atomicalLocation.index
          ) {
            deleteOffer(offer.id);
            continue;
          }

          // check psbt witness
          const inputData = psbt.data.inputs[0];

          if (!inputData.witnessUtxo) {
            deleteOffer(offer.id);
            continue;
          }

          const address = detectScriptToAddressType(
            inputData.witnessUtxo.script.toString("hex"),
          );

          if (address !== offer.list_account) {
            deleteOffer(offer.id);
            continue;
          }

          console.log(`check success: ${offer.id}`);
        }

        await RedisInstance.set("update:timestamp:offer:check", dayjs().unix());
      } catch (e) {
        console.error("check offer error:", e);
        await sleep(10000);
        continue;
      }
    } while (true);
  } catch (e) {
    console.error(e);
  }
};

OfferCheckProcess();
