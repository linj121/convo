import { parseConfig } from "@config";
import logger from "@logger";

try {
  parseConfig();
  logger.info("Configuration parsed and loaded successfully");
} catch (error) {
  logger.error(error);
  process.exit(1);
}