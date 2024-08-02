import { parseConfig } from "@config";
import logger from "@logger";
import assitantServiceInit from "@services/assistant/init";


async function init(): Promise<void> {
  try {
    parseConfig();
    logger.info("Configuration parsed and loaded successfully");
  } catch (error) {
    logger.error(error);
    process.exit(1);
  }

  await assitantServiceInit();
}

export default init;
