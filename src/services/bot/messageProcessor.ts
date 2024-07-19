import { MessageInterface } from "wechaty/impls";
import WechatyApp from ".";
import logger from "@logger";

class MessageProcessor {
  ctx: WechatyApp;

  constructor(ctx: WechatyApp) {
    this.ctx = ctx;
  }

  async process(message: MessageInterface) {
    /**
     * Skip processing the message if it's older than the spawn time of our wechaty app 
     */
    if (message.date().getTime() < this.ctx.initializedAt) return;

    const talker = message.talker();
    const room = message.room();

    if (message.text() === "ping") {
      await message.say("pong");
      return;
    }

    // Group message for a certain group chat
    if (room && (await room.topic()) === "罗伯特" && message.type() === this.ctx.service.Message.Type.Text) {
      const prefixTest = [
        /^ *\/checkin.*$/.test(message.text()), 
        /^ *\/打卡.*$/.test(message.text())
      ];

      logger.debug(prefixTest);
      
      if (!prefixTest[0] && !prefixTest[1]) return;

      const language = prefixTest[0] ? "en" : "zh";

      const checkinRegex = {
        "en": /^ *\/checkin( +(?<checkinType>leetcode|workout|reading|cooking)) *$/,
        "zh": /^ *\/打卡( +(?<checkinType>力扣|健身|阅读|做饭)) *$/
      };

      const testResult = checkinRegex[language].test(message.text());
      if (!testResult) {
        const wrongFormatInfo = {
          "en": `@${talker.name()}, format incorrect, checkout the correct usage：\n` +
                "/checkin (leetcode|workout|reading|cooking)\n" +
                "eg. /checkin workout",
          "zh": `@${talker.name()}，格式错误，正确格式如下：\n` +
                "/打卡 (力扣|健身|阅读|做饭)\n" +
                "例如，/打卡 健身",
        }
        room.say(wrongFormatInfo[language]);
        return;   
      }

      const found = message.text().match(checkinRegex[language]);
      if (!found || !found.groups) {
        throw new Error("Provided text message cannot be matched");
      }
      const checkinType = found.groups.checkinType;
      const sucessMessage = {
        "en": `@${talker.name()}, checkin for ${checkinType} success，exp+1`,
        "zh": `@${talker.name()}，打卡${checkinType}成功，经验+1`,
      }
      room.say(sucessMessage[language]);

      return;
    }

    return;
  }
}

export default MessageProcessor;