import { createLogger, format, transports } from "winston";
import type { LoggerOptions } from "winston";
import { config } from "@config";

const { combine, timestamp, printf, colorize } = format;

const customFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} ${level}: ${message}`;
});

// More on logging levels: https://github.com/winstonjs/winston?tab=readme-ov-file#logging-levels
const options: LoggerOptions = {
  level: config.LOG_LEVEL,
  format: combine(timestamp(), colorize(), customFormat),
  transports: [new transports.Console()],
};

const logger = createLogger(options);
type Logger = typeof logger;

export default logger;
export {
  Logger
};
