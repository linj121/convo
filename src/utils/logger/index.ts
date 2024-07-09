import { createLogger, format, transports } from "winston";
import type { LoggerOptions } from "winston";

const { combine, timestamp, label, printf, colorize } = format;

const CATEGORY = "CONVO";

const customFormat = printf(({ level, message, label, timestamp }) => {
  return `${timestamp} [${label}] ${level}: ${message}`;
});

const options: LoggerOptions = {
  level: "debug",
  format: combine(label({ label: CATEGORY }), timestamp(), colorize(), customFormat),
  transports: [new transports.Console()],
};

const logger = createLogger(options);

export default logger;
