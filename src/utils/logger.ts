import { createLogger, format, transports } from "winston";
import type { LoggerOptions } from "winston";
import { LOG_LEVEL } from "@config";

const { combine, timestamp, printf, colorize } = format;

// const CATEGORY = "CONVO";

const customFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} ${level}: ${message}`;
});


// More on logging levels: https://github.com/winstonjs/winston?tab=readme-ov-file#logging-levels
const options: LoggerOptions = {
  level: LOG_LEVEL,
  format: combine(timestamp(), colorize(), customFormat),
  transports: [new transports.Console()],
};

const logger = createLogger(options);

export default logger;
