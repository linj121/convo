import BaseRepository from "./base.repository";

class TaskRepository extends BaseRepository {
  private static task = this.prismaClient.task;
  
  // TODO:

};

export default TaskRepository;