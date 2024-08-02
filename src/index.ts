import init from "./init";
import { sleep } from "@utils/functions";

async function main() {
  await init();
  const { default: logger } = await import("@logger");
  const { default: AssistantService } = await import("@services/assistant");
  
  const assistant = new AssistantService({
    name: "im-assistant",
    puppet: "wechaty-puppet-wechat",
    puppetOptions: {
      uos: true,
    },
  });

  const app = assistant.service;

  const gracefulShutdownHandler: NodeJS.SignalsListener = async (signal) => {
    logger.info(`Received ${signal.toString()}, gracefully shutting down`);
    await app.stop();
    await sleep(3);
    process.exit(0);
  }
  process.on("SIGINT", gracefulShutdownHandler);
  process.on("SIGQUIT", gracefulShutdownHandler);
  process.on("SIGTERM", gracefulShutdownHandler);

  try {
    await app.start();
  } catch (error) {
    logger.error(`Wechaty app failed to start ${error}`);
  }
}

main();
