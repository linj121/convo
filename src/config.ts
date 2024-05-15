import * as dotenv from "dotenv";
dotenv.config();
import { IConfig, Task } from "./interface";

export const config: IConfig = {
  api: process.env.API,
  openai_api_key: process.env.OPENAI_API_KEY || "sk-123abc",
  model: process.env.MODEL || "gpt-3.5-turbo",
  chatPrivateTriggerKeyword: process.env.CHAT_PRIVATE_TRIGGER_KEYWORD || "",
  chatTriggerRule: process.env.CHAT_TRIGGER_RULE || "",
  disableGroupMessage: process.env.DISABLE_GROUP_MESSAGE === "true",
  temperature: process.env.TEMPERATURE ? parseFloat(process.env.TEMPERATURE) : 0.6,
  blockWords: process.env.BLOCK_WORDS?.split(",") || [],
  chatgptBlockWords: process.env.CHATGPT_BLOCK_WORDS?.split(",") || [],
  port: process.env.PORT || "8080",
  blockSelf: process.env.BLOCK_SELF === "true",
};

export const task: Task[] = [
  // {
  //   taskName: "countdown",
  //   cronTime: new Date(Date.now() + 3 * 60 * 1000),
  //   timeZone: "Asia/Shanghai",
  //   targetType: "contact",
  //   targetName: "郁涵",
  // },
  // {
  //   taskName: "countdown",
  //   cronTime: new Date(Date.now() + 3 * 60 * 1000),
  //   timeZone: "Asia/Shanghai",
  //   targetType: "contact",
  //   targetName: "旅钟",
  // },
  // {
  //   taskName: "countdown",
  //   cronTime: "0 * * * *",
  //   timeZone: "Asia/Shanghai",
  //   targetType: "room",
  //   targetName: "今天玩啥 哇酷哇酷！",
  // },
  // {
  //   taskName: "countdown",
  //   cronTime: new Date(Date.now() + 3 * 60 * 1000),
  //   timeZone: "Asia/Shanghai",
  //   targetType: "room",
  //   targetName: "BS Matters",
  // },
];
