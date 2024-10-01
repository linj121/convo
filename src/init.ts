import { parseConfig } from "@config";


async function init(): Promise<void> {
  try {
    const config = parseConfig();

    const { default: logger } = await import("@logger");
    logger.info("Configuration parsed and loaded successfully");
    logger.debug("Loaded configuration:\n" + JSON.stringify(config));

    const { default: DatabaseSetup } = await import("@data");
    await DatabaseSetup.initialize();

    const { default: OpenAIClients } = await import("@libs/openai/clients");
    await OpenAIClients.initialize();

  } catch (error) {
    throw new Error("Encountered an error when initializing, exiting...", { cause: error });
  }
}

export default init;
