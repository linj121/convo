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
  const { config } = await import("@config");
  const wechatyService = new WechatySerivce({
    wechatyOptions: {
      name: "wechaty-wechat", // Name of the json file that stores login credentials
      puppet: "wechaty-puppet-wechat", // Puppet provider: https://github.com/wechaty/puppet-wechat
      puppetOptions: {
        uos: true, // https://github.com/wechaty/puppet-wechat/issues/127
      }
    },
    logger: logger,
    config: config
  });

  await wechatyService.start();
}

main();
