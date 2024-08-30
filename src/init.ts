import { parseConfig } from "@config";
import logger from "@logger";
import DatabaseSetup from "@data";
import LlmRepository from "@data/llm.repository";
import assitantServiceInit from "@services/assistant/init";


async function init(): Promise<void> {
  try {
    const config = parseConfig();
    logger.info("Configuration parsed and loaded successfully");
    logger.debug("Loaded configuration -> " + JSON.stringify(config));

    DatabaseSetup.setupDB(config.DATABASE_PATH);
    logger.info("Database set up success");

    LlmRepository.initialize();

    await assitantServiceInit();

  } catch (error) {
    logger.error(`Got the following error when initializing, now quiting: ${error}`);
    process.exit(1);
  }
}

export default init;
