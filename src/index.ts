import { spawn } from "child_process";
import { config } from "dotenv";

const spawnPromise = (command: string, args: string[]) => {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve("success");
      } else {
        reject(`Command failed with code ${code}`);
      }
    });
  });
};

config();

const main = async () => {
  try {
    await Promise.all([
      spawnPromise("node", ["./dist/lib/process/order-update.js"]),
      spawnPromise("node", ["./dist/lib/process/indexer.js"]),
      spawnPromise("node", ["./dist/lib/process/collection-update.js"]),
      spawnPromise("node", ["./dist/lib/process/token-update.js"]),
      spawnPromise("node", ["./dist/lib/process/status-update.js"]),
    ]);
    // Handle success if needed
  } catch (error) {
    console.error("Error:", error);
  }
};

main()
  .then(() => {
    console.log("done");
  })
  .catch((error) => console.error("Unhandled error in main:", error));
