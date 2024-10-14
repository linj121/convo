import { CronJob } from 'cron';
import type { Wechaty } from 'wechaty';


/**
 * Task:
 * primary key: task_name
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
 *    1.1. Init: Load all tasks from DB into MEM and start them (DB should already be populated with tasks from a config file)
 *    1.2. Add: create a new task in DB and start it
 *    1.3. Update: update the task in DB and restart it
 *    1.4. Delete: stop a task and delete it from DB
 *    1.5. Read: read a task(s) by names or ids from DB
 *    1.6. Enable/Disable task(s)
 * 2. start / stop tasks (by id / ALL)
 *    2.1. Read state of task(s) from MEM and start/stop them
 */


class Scheduler {
  private jobs: Array<CronJob> = [];
  
  public constructor(ctx: Wechaty) {
    this._initJobs(ctx);
  }

  private _initJobs(ctx: Wechaty) {
    // for (let i = 0; i < 3; i++) {
    //   this.jobs.push(new CronJob(
    //       '* * * * * *',
    //       async function () {
    //         // const contact = ctx.Contact.find({name: "沙爹王"});
    //         const room = await ctx.Room.find({ topic: "罗伯特" });
    //         if (!room) return;

    //         const message = `${new Date().toLocaleTimeString()} [Task ${i + 1}] You will see this message every second`;
    //         room.say(message);
    //       }, // onTick
    //       null, // onComplete
    //       false, // start
    //       'America/Toronto'
    //     )
    //   );
    // }
  }

  public startAllJobs() {
    this.jobs.forEach(task => task.start());
  }

  public stopAllJobs() {
    this.jobs.forEach(task => task.stop());
  }

}

export default Scheduler;