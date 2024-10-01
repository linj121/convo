import init from "./init";


async function main() {
  await init();
  const { default: logger } = await import("@logger");

  ['SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT',
    'SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV', 'SIGUSR2', 'SIGTERM'
  ].forEach((sig: string) => {
      process.on(sig, () => {
        logger.info(`Received signal: ${sig}`);
        logger.info("Exiting. Bye!");
        process.exit(0);
      });
  });

  const { default: WechatySerivce } = await import("@services/wechatyService");
  const wechatyService = new WechatySerivce({
    name: "im-assistant",
    puppet: "wechaty-puppet-wechat",
    puppetOptions: {
      uos: true,
    },
  });

  await wechatyService.start();
}

main();
