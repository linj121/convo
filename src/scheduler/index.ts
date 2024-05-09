import { CronJob } from "cron";
import { Wechaty } from "wechaty";
import { Task } from "../interface";
import { ContactInterface, RoomInterface } from "wechaty/impls";

// To whom => A list of users: [name: string, contactType: string["contact" | "room"]]
// What and when => List of tasks: [{name: string, cronTime: cronTime}]

export class Scheduler {
  private taskPool: CronJob[] = [];
  private bot: Wechaty;

  constructor(bot: Wechaty, tasks: Task[]) {
    this.bot = bot;
    for (const task of tasks) {
      const option = {
        cronTime: task.cronTime,
        onTick: () => this.taskWorker(task),
        start: false,
        timeZone: task.timeZone,
      };
      this.taskPool.push(CronJob.from(option));
    }
  }

  async taskWorker(task: Task) {
    const { taskName, targetType, targetName } = task;

    const type = targetType === "contact" ? this.bot.Contact : this.bot.Room;
    const field = targetType === "contact" ? "name" : "topic";
    const target = await type.find({ [field]: targetName });

    if (target) {
      const name = targetType === "contact" ? (target as ContactInterface).name() : await (target as RoomInterface).topic();
      const date = new Date();
      switch (taskName) {
        case "shanghao":
          const beijingTime = date.toLocaleString("zh-CN", {
            timeZone: "Asia/Shanghai",
          });
          const targetTime = new Date("2024-05-09T08:30:00");
          const timeDiffMillis = targetTime.getTime() - date.getTime();
          const diffSeconds = Math.floor(timeDiffMillis / 1000);
          const diffMinutes = Math.floor(diffSeconds / 60);
          const diffHours = Math.floor(diffMinutes / 60);
          const seconds = diffSeconds % 60;
          const minutes = diffMinutes % 60;
          const timeDiffFormatted = `${diffHours}小时${minutes}分钟${seconds}秒`;
          if (timeDiffMillis <= 0) break;
          // console.log(`尊敬的各位《${name}》的群友，请注意，现在是北京时间${beijingTime}，距离上号还有${timeDiffFormatted}`);
          await target.say(`尊敬的各位《${name}》的群友，请注意，现在是北京时间${beijingTime}，距离上号还有${timeDiffFormatted}`);
          break;
        case "greeting":
          const phrase = ["早上好", "中午好", "下午好", "晚上好"];
          const time = date.getHours();
          let greeting = "";
          if (time < 12) {
            greeting = phrase[0];
          } else if (time < 14) {
            greeting = phrase[1];
          } else if (time < 18) {
            greeting = phrase[2];
          } else {
            greeting = phrase[3];
          }
          await target.say(
            `${greeting} ${name}，现在是北京时间${date.toLocaleString("zh-CN", {
              timeZone: "Asia/Shanghai",
              calendar: "chinese",
            })}`
          );
          break;
        case "weather":
          break;
        case "news":
          break;
        case "joke":
          break;
        default:
          console.error(`Task named ${taskName} was not found`);
      }
    } else {
      console.error(`${targetType} named ${targetName} was not found`);
    }

    // const promises: Promise<void>[] = []

    // const contactNames: string[] = ["Qieee", "旅钟"];
    // contactNames.forEach(async (contactName) => {
    //   try {
    //     const contact = await this.bot.Contact.find({ name: contactName });
    //     if (contact) {
    //       const date = new Date();
    //       const name = contact.name();
    //       console.info("contact:", name);
    //       await contact.say(
    //         `早上好${name}，现在是北京时间${date.toLocaleString("zh-CN", {
    //           timeZone: "Asia/Shanghai",
    //           calendar: "chinese",
    //         })}`
    //       );
    //     } else {
    //       console.log(`${contactName} not found`);
    //     }
    //   } catch (error) {
    //     console.error(error);
    //   }
    // });
    // const roomTopics: string[] = ["今天玩啥 哇酷哇酷！", "BS Matters"];
    // roomTopics.forEach(async (roomTopic) => {
    //   try {
    //     const room = await this.bot.Room.find({ topic: roomTopic });
    //     if (room) {
    //       const date = new Date();
    //       const topic = await room.topic();
    //       console.info("room:", topic);
    //       await room.say(
    //         `早上好中国，现在是北京时间${date.toLocaleTimeString("zh-CN", {
    //           timeZone: "Asia/Shanghai",
    //           calendar: "chinese",
    //         })}`
    //       );
    //     } else {
    //       console.log(`${roomTopic} not found`);
    //     }
    //   } catch (error) {
    //     console.error(error);
    //   }
    // });
    // try {
    //   await Promise.all(promises);
    //   console.log("Batch task done!");
    // } catch (error) {
    //   console.error(error);
    // }
  }

  start() {
    this.taskPool.forEach((task) => task.start());
  }

  stop() {
    this.taskPool.forEach((task) => task.stop());
  }
}
