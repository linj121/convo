import AssistantService from "@services/assistant";
import logger from "@logger";

async function main() {
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
