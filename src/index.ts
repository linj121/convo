import init from "./init";
import { sleep } from "@utils/functions";

async function main() {
  await init();
  const { default: logger } = await import("@logger");
  const { default: WechatySerivce } = await import("@services/wechatyService");
  
  const wechatyService = new WechatySerivce({
    name: "im-assistant",
    puppet: "wechaty-puppet-wechat",
    puppetOptions: {
      uos: true,
    },
  });

  process.on("beforeExit", async (code: number) => {
    logger.info(`Getting code ${code}, about to exit, now performing clean ups ...`);
    await wechatyService.stop();
    await sleep(3);
    process.exit(0);
  });

  try {
    await wechatyService.start();
  } catch (error) {
    logger.error(`Wechaty app failed to start ${error}`);
  }
}

main();
