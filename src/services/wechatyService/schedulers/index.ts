import { 
  CronJob,
  type CronJobParams, 
} from 'cron';
import { 
  type Wechaty, 
} from 'wechaty';
import { ContactInterface, RoomInterface } from 'wechaty/impls';
import { 
  Job,
  TaskActionTemplate,
  TemplateMappings,
} from '../types';
import { type Task } from './taskSchema';
import taskExamples from './taskExamples';
import templateMappings, {
  TemplateContextMap
} from './templates';
import type { Config } from '@config';
import type { Logger } from '@logger';


/**
 * Task:
 * 0. task name
 * 1. frequency and timezone
 * 2. target (contact / room)
 * 3. action
 *    3.1. Pre-defined actions
 *       - Send a custom <message> (text, image, video, etc)
 *       - External API Calls:
 *         - Weather of one or more <location>s
 *         - News of the day
 * 
 * Management:
 * 1. add / update / delete / read tasks
 *    1.1. Init: Load all tasks from DB into MEM and start them (DB should already be populated with tasks from task examples)
 *    1.2. Add: create a new task in DB, add to jobs array and start it
 *    1.3. Update: update the task in DB and jobs array, then restart it
 *    1.4. Delete: stop a task and delete it from DB and jobs array
 *    1.5. Read: read a task(s) by its id from DB
 *    1.6. Enable/Disable task(s)
 * 2. start / stop tasks (by id / ALL)
 *    2.1. Read state of task(s) from MEM and start/stop them
 */


class Scheduler {
  private config: Config;
  private logger: Logger;
  private jobs: Array<Job> = [];
  private wechatyInstance: Wechaty;
  public defaultTimeZone: string;
  
  public constructor(args: {
    wechatyInstance: Wechaty,
    config: Config,
    logger: Logger
  }) {
    this.config = args.config;
    this.logger = args.logger;
    this.wechatyInstance = args.wechatyInstance;
    this.defaultTimeZone = this.config.TIMEZONE; // user-defined timezone OR OS local timezone
    this._initJobs();
  }

  private _initJobs() {

    for (const task of taskExamples) {
      const template = templateMappings[task.action.template];

      const onTickCallback = this.generateOnTickCb({
        task,
        template
      });

      // set to default time zone if time zone is not provided or an empty string
      // Priority: task.timeZone > user-defined timeZone > OS local time zone
      //                              ^^^   default time zone   ^^^ 
      const timeZone = (!task.timeZone) ? this.defaultTimeZone : task.timeZone; 

      const newCronjob = new CronJob(
        task.cronTime,
        onTickCallback,
        null, // onComplete
        false, // do not start until explicitly set to start 
        timeZone, // timezone
        null // context
      );

      this.jobs.push({
        cronjob: newCronjob,
        name: task.name,
        enabled: task.enabled
      });
    }
  }

  private generateOnTickCb<
    T extends TaskActionTemplate
  >(
    params: {
      task: Extract<Task, { action: { template: T } }>,
      template: TemplateMappings[T]
    }
  ): CronJobParams["onTick"] {
    const getTarget = this.getTarget.bind(this);
    const errlogger = this.logger.error.bind(this.logger);
    const context = (params.template.context ?? null) as TemplateContextMap[T];

    return async function () {
      try {
        const target = await getTarget(params.task.target);
        const sayable = await params.template.messageProducer.call(context, {
          action: params.task.action as Extract<Task["action"], { template: T }>, // TypeScript can't infer automatically
          otherArgs: params.template.otherArgs
        });
        await target.say(sayable);
      } catch (error) {
        errlogger(`Task "${params.task.name}" failed: ${error}`);
      }
    };
  }

  private async getTarget(taskTarget: Task["target"]): Promise<RoomInterface | ContactInterface> {
    let target: RoomInterface | ContactInterface | undefined;

    switch (taskTarget.type) {
      case "contact":
        target = await this.wechatyInstance.Contact.find(taskTarget.name);
        break;
      case "room":
        target = await this.wechatyInstance.Room.find(taskTarget.name);
        break;
      default:
        throw new Error("Invalid target type.");
    }

    if (!target) throw new Error(`Target [${taskTarget.name}] is not found`);
    return target;
  }

  public startAllJobs() {
    this.jobs.forEach(job => job.enabled && job.cronjob.start());
  }

  public stopAllJobs() {
    this.jobs.forEach(job => job.cronjob.stop());
  }

}

export default Scheduler;