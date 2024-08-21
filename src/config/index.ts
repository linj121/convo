import { z } from 'zod';
import * as dotenv from 'dotenv';
import path from "node:path";

dotenv.config();

const _DEFAULT_DB_PATH: string = path.normalize(`${__dirname}/../../default.db`);

const configSchema = z.object({
  OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY is required"),
  OPENAI_MODEL: z.string().default("gpt-4o-mini"),
  OPENAI_PROJECT_ID: z.string().default(""),
  DATABASE_PATH: z.string().default(_DEFAULT_DB_PATH),
  // https://github.com/winstonjs/winston?tab=readme-ov-file#logging-levels
  LOG_LEVEL: z.enum(["silly", "debug", "verbose", "http", "info", "warn", "error"]),
});

type Config = z.infer<typeof configSchema>;

let config: Config;

const LOG_LEVEL = process.env.LOG_LEVEL || process.env.NODE_ENV === "production" ? "info" : "verbose";

/**
 * Call before accessing configuration
 * @returns The configuration object
 */
function parseConfig(): Config {
  const parsedConfig = configSchema.safeParse({
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_MODEL: process.env.OPENAI_MODEL,
    OPENAI_PROJECT_ID: process.env.OPENAI_PROJECT_ID,
    DATABASE_PATH: process.env.DATABASE_PATH,
    LOG_LEVEL: LOG_LEVEL,
  });

  if (!parsedConfig.success) {
    throw new Error(`Config validation error: ${parsedConfig.error.message}`);
  }

  config = parsedConfig.data;
  return config;
};

export { 
  config, 
  parseConfig,
  LOG_LEVEL
};
