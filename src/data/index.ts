import logger from "@logger";
import { config } from "@config";
import { Prisma, PrismaClient } from "@prisma/client";


class DatabaseSetup {
  public static prismaClient: PrismaClient<
    Prisma.PrismaClientOptions,
    'query' | 'info' | 'warn' | 'error'
  >;

  public static async initialize(): Promise<void> {
    try {
      this.prismaClient = new PrismaClient({
        log: [
          {
            emit: 'event',
            level: 'query',
          },
          {
            emit: 'event',
            level: 'error',
          },
          {
            emit: 'event',
            level: 'info',
          },
          {
            emit: 'event',
            level: 'warn',
          },
        ],
        datasourceUrl: `file:${config.DATABASE_URL}`
      });
      this.setupEventListeners();
      await this.prismaClient.$connect();
    } catch (error) {
      throw new Error("Failed to initialize db", { cause: error });
    }
  }

  /**
   * Redirect events to our custom logger
   */
  private static setupEventListeners(): void {
    const logEventTemplate = (e: Prisma.LogEvent) =>
      "\n" +
      "Timestamp: " + e.timestamp + "\n" +
      "Target: "    + e.target    + "\n" +
      "Message: "   + e.message;

    const queryEventTemplate = (e: Prisma.QueryEvent) =>
      "\n" +
      "Timestamp: " + e.timestamp + "\n" +
      "Target: "    + e.target    + "\n" +
      "Query: "     + e.query     + "\n" +
      "Params: "    + e.params    + "\n" +
      "Duration: "  + e.duration;

    this.prismaClient.$on("info", (e: Prisma.LogEvent) => {
      logger.verbose("[INFO(Prisma)]" + logEventTemplate(e));
    });
    this.prismaClient.$on("query", (e: Prisma.QueryEvent) => {
      logger.verbose("[QUERY(Prisma)]" + queryEventTemplate(e));
    });
    this.prismaClient.$on("warn", (e: Prisma.LogEvent) => {
      logger.verbose("[WARN(Prisma)]" + logEventTemplate(e));
    });
    this.prismaClient.$on("error", (e: Prisma.LogEvent) => {
      logger.verbose("[ERROR(Prisma)] " + logEventTemplate(e));
    });
  }
}


export default DatabaseSetup;
