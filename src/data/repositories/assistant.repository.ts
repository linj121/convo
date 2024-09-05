import { Prisma } from "@prisma/client";
import type { assistant } from "@prisma/client";
import BaseRepository from "./base.repository";
import { 
  DataRepositoryError,
  DataRepositoryNotFoundError, 
} from "@utils/errors";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";


class AssistantRepository extends BaseRepository {
  private static assistant = this.prismaClient.assistant;

  public static async upsert(params: Prisma.assistantCreateInput) {
    try {
      const assistant = await this.assistant.upsert({
        create: {
          assistant_id: params.assistant_id,
          name: params.name
        },
        update: {
          assistant_id: params.assistant_id
        },
        where: {
          name: params.name
        }
      });
      return assistant;
    } catch (error) {
      throw new DataRepositoryError(
        `Error occured when upserting the following: ${JSON.stringify(params)}`, 
        { cause: error }
      );
    }
  }

  /**
   * @throws `DataRepositoryNotFoundError` if data not found
   */
  public static async findOne(params: Prisma.assistantFindUniqueOrThrowArgs): Promise<assistant> {
    try {
      const assistant = await this.assistant.findUniqueOrThrow({
        where: params.where
      });
      return assistant;
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.code === "P2025") {
        throw new DataRepositoryNotFoundError("Assistant not found", { cause: error });
      }
      throw new DataRepositoryError(
        `Error occured when finding the following: ${JSON.stringify({})}`, 
        { cause: error }
      );
    }
  }

  /**
   * @throws `DataRepositoryNotFoundError` if data not found
   */
  public static async findOneByAssistantName(assistantName: assistant["name"]) {
    return await this.findOne({
      where: {
        name: assistantName
      }
    });
  }
}

export default AssistantRepository;