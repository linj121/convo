import { Prisma } from "@prisma/client";
import type { Thread } from "@prisma/client";
import BaseRepository from "./base.repository";
import { 
  DataRepositoryError,
  DataRepositoryNotFoundError, 
} from "@utils/errors";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";


class ThreadRepository extends BaseRepository {
  private static thread = this.prismaClient.thread;

  public static async upsert(params: Prisma.ThreadCreateInput) {
    try {
      const thread = await this.thread.upsert({
        create: {
          thread_id: params.thread_id,
          owner: params.owner
        },
        update: {
          thread_id: params.thread_id
        },
        where: {
          owner: params.owner
        }
      });
      return thread;
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
  public static async findOne(params: Prisma.ThreadFindUniqueOrThrowArgs) {
    try {
      const thread = await this.thread.findUniqueOrThrow({
        where: params.where
      });
      return thread;
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.code === "P2025") {
        throw new DataRepositoryNotFoundError("Thread not found", { cause: error });
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
  public static async findOneByThreadOwner(threadOwner: Thread["owner"]) {
    return await this.findOne({
      where: {
        owner: threadOwner
      }
    });
  }
}

export default ThreadRepository;