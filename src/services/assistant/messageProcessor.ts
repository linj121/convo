import { MessageInterface } from "wechaty/impls";
import AssistantService from "./index";
import DailyCheckinService from "@services/dailycheckin";
import { CommandPayload, CheckinType } from "./types";
import logger from "@logger";

class MessageProcessor {
  ctx: AssistantService;

  constructor(ctx: AssistantService) {
    this.ctx = ctx;
  }

  async process(message: MessageInterface) {
    /**
     * Skip processing the message if it's older than the spawn time of our wechaty app 
     */
    if (message.date().getTime() < this.ctx.initializedAt) return;

    if (message.text() === "ping") {
      await message.say("pong");
      return;
    }

    if (
      message.room() && 
      (await message.room()!.topic()) === "罗伯特" && 
      message.type() === this.ctx.service.Message.Type.Text
    ) {
      this.checkin(message);
      return;
    }

    return;
  }

  private async checkin(message: MessageInterface) {
    const room = message.room();
    if (!room) {
      throw new Error("checkin command not in a group chat");
    }

    const messageText = message.text();

    const prefixTest = [
      /^ *\/checkin.*$/.test(messageText), 
      /^ *\/打卡.*$/.test(messageText)
    ];
    
    if (!prefixTest[0] && !prefixTest[1]) return;

    const language = prefixTest[0] ? "en" : "zh";

    /**
     * i18n, map text in various languages to unified types 
     */
    const checkinTranslations = {
      en: {
        [CheckinType.Leetcode]: "leetcode",
        [CheckinType.Workout]: "workout",
        [CheckinType.Reading]: "reading",
        [CheckinType.Cooking]: "cooking"
      },
      zh: {
        [CheckinType.Leetcode]: "力扣",
        [CheckinType.Workout]: "健身",
        [CheckinType.Reading]: "阅读",
        [CheckinType.Cooking]: "做饭"
      }
    };
    const checkinTypeMap: { [key: string]: CheckinType } = {
      "leetcode": CheckinType.Leetcode,
      "workout":  CheckinType.Workout,
      "reading":  CheckinType.Reading,
      "cooking":  CheckinType.Cooking,
      "力扣":  CheckinType.Leetcode,
      "健身":  CheckinType.Workout,
      "阅读":  CheckinType.Reading,
      "做饭":  CheckinType.Cooking
    };

    // Frequently used info
    const talker = message.talker();
    const talkerName = talker.name();
    const talkerId = talker.id;
    const talkerAlias = await talker.alias();

    const checkinRegex = {
      "en": /^ *\/checkin +(?<checkinType>leetcode|workout|reading|cooking)( +(?<params>(?=\S).+\S|\S))? *$/,
      "zh": /^ *\/打卡 +(?<checkinType>力扣|健身|阅读|做饭)( +(?<params>(?=\S).+\S|\S))? *$/
    };

    const wrongFormatInfo = {
      "en": `@${talkerName}, format incorrect, checkout the correct usage：\n` +
            "/checkin (leetcode|workout|reading|cooking) [-url 'url'] [-note 'text']\n" +
            "eg. /checkin workout, OR /checkin workout -note bench press * 10rm\n" +
            "eg. /checkin leetcode, OR /checkin leetcode -url https://leetcode.com/problems/lucky-numbers-in-a-matrix/",
      "zh": `@${talkerName}，格式错误，正确格式如下：\n` +
            "/打卡 (力扣|健身|阅读|做饭) [-url 'url'] [-note 'text']\n" +
            "例如，/打卡 健身，或者 /打卡 健身 -note 卧推 * 10力竭组\n" +
            "再如，/打卡 力扣，或者 /打卡 力扣 -url https://leetcode.com/problems/lucky-numbers-in-a-matrix/",
    }

    const testResult = checkinRegex[language].test(messageText);
    if (!testResult) {
      room!.say(wrongFormatInfo[language]);
      return;   
    }

    const checkinRegexMatch = messageText.match(checkinRegex[language]);
    if (!checkinRegexMatch || !checkinRegexMatch.groups) {
      throw new Error("Provided text message cannot be matched");
    }
    const checkinType = checkinTypeMap[checkinRegexMatch.groups.checkinType];
    const checkinTypeText = checkinTranslations[language][checkinType];
    const checkinParams = checkinRegexMatch.groups.params;

    const payload: CommandPayload = {
      messageTime: message.date().getTime(),
      talkerId: talkerId,
      talkerName: talkerName,
      talkerAlias: talkerAlias,
      checkinType: checkinType,
      url: undefined,
      note: undefined
    };

    logger.debug(`Initial payload${JSON.stringify(payload)}`);
    logger.debug(`checkinParams: ${checkinParams}`);

    /**
     * Parse flags from checkinParams and assign corresponding values to payload
     * -url <url>: eg. -url https://leetcode.com/problems/two-sum/
     * -note <text>: eg. -note benchpress * 6RM * 4sets
     */
    if (checkinParams) {
      const checkinParamsRegex : {
        [index: string]: RegExp
      } = {
        "url": /-url<a[^>]*> +(?<url>(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&\/\/=]*))<\/a>/,
        "note": /-note +(?<note>(?=\S).+\S|\S)/,
      };
      
      /**
       * If all params cannot match checkinParamsRegex, isParamsValid = false;
       * else if any one of the params matches, isParamsValid = true;
       * In other words, as long as one of the params is valid, set isParamsValid = true.
       */
      let isParamsValid: boolean = false;
      if (checkinParams) {
        for (const prop in checkinParamsRegex) {
          const match = checkinParams.match(checkinParamsRegex[prop]);
          if (!match) {
            continue;
          }
          if (!match.groups || !match.groups[prop]) {
            throw new Error("fail to capture groups in checkin params");
          }
          isParamsValid = true;
          (payload[prop as keyof CommandPayload] as string | undefined) = match.groups[prop];
        }
      }
      
      logger.debug(`Payload after extraction: ${JSON.stringify(payload)}`);

      if (!isParamsValid) {
        room!.say(wrongFormatInfo[language]);
        return;
      }
    }

    // TODO: 
    // call DailyCheckinService and persist payload to db
    // read user info from db and provide some interesting insights:
    // eg. longest consecutive checkin days, total checkin count
    await DailyCheckinService.submit(payload);
    const userInsights = await DailyCheckinService.getUserInsights(talkerName, checkinType);

    const sucessMessage = {
      "en": `@${talkerName}, checkin for ${checkinTypeText} success，exp+1`,
      "zh": `@${talkerName}，打卡${checkinTypeText}成功，经验+1`,
    }
    room!.say(sucessMessage[language]);

    logger.debug(`Final payload: ${JSON.stringify(payload)}`);
  }


}

export default MessageProcessor;