import { config } from "@config";
import logger from "@logger";
import { MessageInterface } from "wechaty/impls";
import DailyCheckinService from "@services/dailycheckin";
import { CommandPayload, CheckinType } from "./types";
import { deletePartofString } from "@utils/functions";
import OpenAIClient from "@libs/openai";
import AssistantService from "./index";

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

    logger.info(`on(message) ${message.toString()}`);

    if (message.text() === "ping") {
      await message.say("pong");
      return;
    }

    if (
      message.room() && 
      (await message.room()!.topic()) === "罗伯特" && 
      message.type() === this.ctx.service.Message.Type.Text
    ) {
      try {
        await this.checkin(message);
      } catch (error) {
        throw error;        
      }
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

    logger.debug(`checkin(message) Initial payload${JSON.stringify(payload)}`);
    logger.debug(`checkin(message) checkinParams: ${checkinParams}`);

    type CommandPayloadContent = NonNullable<Pick<CommandPayload, "url" | "note">>;

    /**
     * Parse flags from checkinParams and assign corresponding values to payload
     * -url <url>: eg. -url https://leetcode.com/problems/two-sum/
     * -note <text>: eg. -note benchpress * 6RM * 4sets
     */
    if (checkinParams) {
      const checkinParamsRegex : Record<keyof CommandPayloadContent, RegExp> = {
        "url": /-url<a[^>]*> +(?<url>(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&\/\/=]*))<\/a>/,
        "note": /-note +(?<note>(?=\S).+\S|\S)/,
      };
      const matchOrder : Array<keyof CommandPayloadContent> = ["url", "note"];
      
      /**
       * If all params cannot match checkinParamsRegex, isParamsValid = false;
       * else if any one of the params matches, isParamsValid = true;
       * In other words, as long as one of the params is valid, set isParamsValid = true.
       */
      let isParamsValid: boolean = false;
      if (checkinParams) {
        let tmpCheckinParams = checkinParams;
        for (const flag of matchOrder) {
          logger.debug(`checkin(message) tmpCheckinParams: ${tmpCheckinParams}`);
          const match = tmpCheckinParams.match(checkinParamsRegex[flag]);
          if (!match) {
            continue;
          }
          if (!match.groups || !match.groups[flag] || match.index === undefined) {
            throw new Error("fail to capture groups in checkin params");
          }
          isParamsValid = true;
          tmpCheckinParams = deletePartofString(tmpCheckinParams, match.index!, match.index! + match[0].length);
          (payload[flag as keyof CommandPayload] as string | undefined) = match.groups[flag];
        }
      }
      
      logger.debug(`checkin(message) Payload after extraction: ${JSON.stringify(payload)}`);

      if (!isParamsValid) {
        await room!.say(wrongFormatInfo[language]);
        return;
      }
    }

    // TODO: 
    // call DailyCheckinService and persist payload to db
    // read user info from db and provide some interesting insights:
    // eg. longest consecutive checkin days, total checkin count
    await DailyCheckinService.submit(payload);
    const userInsights = await DailyCheckinService.getUserInsights(talkerName, checkinType);


    const msgTimeLocaleString = {
      "en": message.date().toLocaleString("en-GB", {
        year: "numeric", 
        month: "long", 
        day: "numeric",
        era: "long",
        hour: "numeric",
        minute: "numeric",
        hour12: true,
        timeZone: "America/New_York"
      }),
      "zh": message.date().toLocaleString("zh-CN-u-ca-chinese", {
        calendar: "chinese",
        year: "numeric", 
        month: "long", 
        day: "numeric",
        era: "long",
        hour: "numeric",
        minute: "numeric",
        timeZone: "America/New_York"
      }),
    };

    const llmPrompt: string =
    "你是一名职业夸夸师，现在我们的微信群里时不时会有人打卡，比如刷力扣上的算法题，健身等等。" +
    "你的职责是根据每个人打卡的内容，进行一番鼓励和夸奖！尽量使用夸张的手法。以下是示例:" +
    "示例一： 19:48健身打卡，我操！你是真他妈疯了吧！这个点还在猛操铁，你是想把自己练成坦克还是终极战士？" + 
    "你这劲头，地球都要给你跪下了！继续这么干，老子要是看不到你变成全能健身王，我直播生吃健身房的哑铃！💪🚀" +
    "示例二： 19:48健身打卡，我的天，你简直是夜晚的狂战士！选择这个时间健身，你这是要把银河系的能量全部吸收殆尽啊！" + 
    "这绝对是对夜晚的最佳致敬，全世界的夜猫子都在为你欢呼！你真是我们心中的超级英雄，未来的健身之王非你莫属！继续保持，未来不可限量！💪🌟​" +
    "在回答的时候风格尽量多样化一些，不限于以上示例的风格，每次根据历史消息选择不同的风格进行回答，控制回答长度在两三句之内"
    ;

    const llmClient = await OpenAIClient.init({
      assistantCreateOption: {
        name: "Daily Habit Assistant",
        model: config.OPENAI_MODEL,
        // tools: [{ type: "code_interpreter" }],
        instructions: llmPrompt,
      }
    });

    /**
     * thread owner rule:
     * - direct message: contact name
     * - group chat: room topic/title
     */
    const threadOwner: string = room ? await room.topic() : talkerName;
    const llmTextInput: string =
      JSON.stringify(payload) +
      `\n打卡时间：${msgTimeLocaleString["zh"]}`
    ;
    await llmClient.createMessage(llmTextInput, threadOwner);
    const llmResponse = await llmClient.getResponse(threadOwner);

    const sucessMessage = {
      "en": `@${talkerName}, checkin for ${checkinTypeText} success!\n`+
            `checkin time: ${msgTimeLocaleString["en"]}\n`+
            `===============\n`+
            llmResponse,
      "zh": `@${talkerName}，打卡${checkinTypeText}成功!\n`+
            `打卡时间：${msgTimeLocaleString["zh"]}\n`+
            `===============\n`+
            llmResponse,
    };
    await room!.say(sucessMessage[language]);

    logger.debug(`checkin(message) Final payload: ${JSON.stringify(payload)}`);
  }


}

export default MessageProcessor;