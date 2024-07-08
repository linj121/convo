import { WechatyBuilder } from "wechaty";
import QRCode from "qrcode";

const bot = WechatyBuilder.build({
  name: "wechat-assistant",
  puppet: "wechaty-puppet-wechat",
  puppetOptions: {
    uos: true,
  },
});

bot
  .on("start", () => {
    console.log("Bot started successfully");
  })
  .on("scan", async (qrcode: string, status) => {
    const url = `https://wechaty.js.org/qrcode/${encodeURIComponent(qrcode)}`;
    console.log(`Scan QR Code to login: ${status}\n${url}`);
    console.log(await QRCode.toString(qrcode, { type: "terminal", small: true }));
  })
  .on("login", async (user) => {
    console.log(`Login sucess, got user:\n${user.toString()}`);
  })
  .on("logout", async (user, reason) => {
    console.log(`Logout sucess, the user was:\n${user.toString()}`);
    console.log(`Logout reason: ${reason}`);
  })
  .on("message", async (message) => {
    console.log(`Got message: ${message.toString()}`);
  })
  .on("error", async (error) => {
    console.error(`Bot errored: ${error.toJSON()}`);
  });

async function main() {
  try {
    await bot.start();
  } catch (error) {
    console.error(`Failed to start bot: ${error}`);
  }
}

main();
