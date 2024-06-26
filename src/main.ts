import { WechatyBuilder } from "wechaty";
import QRCode from "qrcode";
import { ChatGPTBot } from "./bot.js";
import { Scheduler } from "./scheduler/index.js";
import { config, task } from "./config.js";
const chatGPTBot = new ChatGPTBot();

const bot = WechatyBuilder.build({
  name: "wechat-assistant", // generate xxxx.memory-card.json and save login data for the next login
  puppet: "wechaty-puppet-wechat",
  puppetOptions: {
    uos: true,
  },
});

/* temporary global status **/
type GlobalStatus = {
  login: boolean,
  latestMessage: string
}
const globalStatus: GlobalStatus = {
  login: false,
  latestMessage: ""
};

async function main() {
  const initializedAt = Date.now();
  bot
    .on("scan", async (qrcode, status) => {
      const url = `https://wechaty.js.org/qrcode/${encodeURIComponent(qrcode)}`;
      console.log(`Scan QR Code to login: ${status}\n${url}`);
      console.log(await QRCode.toString(qrcode, { type: "terminal", small: true }));
    })
    .on("login", async (user) => {
      /* set global status **/
      globalStatus.login = true;
      chatGPTBot.setBotName(user.name());
      const scheduler = new Scheduler(bot, task);
      scheduler.start();
      console.log(`User ${user} logged in`);
      console.log(`群聊触发关键词: @${chatGPTBot.botName} ${config.chatTriggerRule}`);
      console.log(`私聊触发关键词: ${config.chatPrivateTriggerKeyword}`);
      console.log(`已设置 ${config.blockWords.length} 个聊天关键词屏蔽. ${config.blockWords}`);
      console.log(`已设置 ${config.chatgptBlockWords.length} 个ChatGPT回复关键词屏蔽. ${config.chatgptBlockWords}`);
      console.log(`[DEBUG] Current settings: ${JSON.stringify(config)}`);
    })
    .on("message", async (message) => {
      if (message.date().getTime() < initializedAt) {
        return;
      }
      if (message.text().startsWith("/ping")) {
        await message.say("pong");
        return;
      }
      try {
        /* set global status **/
        globalStatus.latestMessage = message.text();
        await chatGPTBot.onMessage(message);
      } catch (e) {
        console.error(e);
      }
    })
    .on("error", (e) => {
      console.error(`[ERROR] bot instance throws the following error: ${e}`);
    });
  try {
    await bot.start();
  } catch (e) {
    console.error(`⚠️ Bot start failed, can you log in through wechat on the web?: ${e}`);
  }
}

main();

/* test express server **/
import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";

dotenv.config();

const app: Express = express();
const port: string = config.port;

app.get("/", (req: Request, res: Response) => {
  res.send("Express + TypeScript Server");
});

app.get("/status", (req: Request, res: Response) => {
  res.json(globalStatus);
});


app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});