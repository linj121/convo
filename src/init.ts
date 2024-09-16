import { parseConfig } from "@config";
import logger from "@logger";
import DatabaseSetup from "@data";
import OpenAIClients from "@libs/openai/clients";


async function init(): Promise<void> {
  try {
    const config = parseConfig();
    logger.info("Configuration parsed and loaded successfully");
    logger.debug("Loaded configuration:\n" + JSON.stringify(config));

    await DatabaseSetup.initialize();

    await OpenAIClients.initialize();

  } catch (error) {
    logger.error(`Got the following error when initializing, now quiting: ${error}`);
    process.exit(1);
  }
}

export default init;
