import { Message } from "wechaty";
import { MessageType } from "../types";
import PluginBase from "./pluginBase";
import logger from "@logger";
import OpenAIClients from "@libs/openai/clients";
import { AssistantEnum } from "@libs/openai";
import { respond } from "@utils/wechatyUtils";


type HabitTrackerCommandStruct = {
  event?: string;
  timezone?: string;
  note?: string;
  help?: boolean;
  version?: boolean;
}

class HabitTracker extends PluginBase {
  public pluginName: string = "Habit Tracker";
  public pluginVersion: string = "v0.0.1";
  public pluginDescription: string = "A habit tracking bot that always cheers you up! Send /habit -h for more info.";

  public validators: Map<MessageType, (message: Message) => (Promise<boolean> | boolean)>;

  private readonly validatorRegExp = {
    [MessageType.Text]: new RegExp("^ */habit", "i"),
  };

  private readonly HELP_MESSAGE: string =
`A command for tracking habits
Usage: /habit [OPTIONS]
Options:
-e str  set custom event (leetcode, workout, ...)
-t str  set timezone (Asia/Shanghai, ...)
-n str  notes, enclosed by double quotes "
-h      display help message
-v      get current version`;
  private readonly DEFAULT_TIMEZONE = "America/Toronto";
  private readonly DEFAULT_TIMEZONE_ZH = "Asia/Shanghai";

  private llmClient = OpenAIClients.getOpenAIClient(AssistantEnum.HABIT_TRACKER);

  constructor() {
    super();
    this.validators = new Map([
      [MessageType.Text, this.textMessageValidator],
    ]);
  }

  private textMessageValidator(message: Message): boolean {
    return this.validatorRegExp[MessageType.Text].test(message.text());
  }

  private parse(command: string): HabitTrackerCommandStruct {
    const pattern: RegExp =
      /(?:-(?<option1>[etn])\s+(?:"(?<note>[^"]+)"|(?<param>\S+)))|(?:-(?<option0>[hv]))/gm;
    const matches = command.matchAll(pattern);
    const options: HabitTrackerCommandStruct = {};
  
    for (const match of matches) {
      if (!match.groups) continue;
  
      logger.debug(JSON.stringify(match.groups));
  
      switch (match.groups.option0) {
        case 'h':
          options.help = true;
          break;
        case 'v':
          options.version = true;
          break;
        default:
          break;
      }
  
      const param = match.groups.param ? match.groups.param.trim() : undefined;
      const note = match.groups.note ? match.groups.note.trim() : undefined;
      switch (match.groups.option1) {
        case 'e':
          options.event = param;
          break;
        case 't':
          options.timezone = param;
          break;
        case 'n':
          options.note = note;
          break;
        default:
          break;
      }
    }
    return options;
  }

  /**
   * Replace all html tags added by WeChat.
   */
  private preprocess(text: string): string {
    const processed = text
      .replace(/“|”/gm, '"')
      .replace(/<br\/>/gm, '\n')
      .replace(/<a[^>]*>(?<url>[^<]+)<\/a>/gm, "$<url>");
    return processed;
  }

  private isValid(options: HabitTrackerCommandStruct): boolean {
    // TODO: Input validation
    return true;
  }

  private async postHabitPayload(payload: Object): Promise<void> {
    // TODO: HTTP POST
    return;
  }

  public async pluginHandler(message: Message): Promise<void> {
    // Type guarding
    if (message.type() !== MessageType.Text) return;
  
    const command = this.preprocess(message.text());
    const options: HabitTrackerCommandStruct = this.parse(command);
  
    if (!this.isValid(options)) {
      await respond(message, this.HELP_MESSAGE);
      return;
    }
  
    if (options.help) {
      await respond(message, this.HELP_MESSAGE);
      return;
    } 
    if (options.version) {
      await respond(message, this.pluginVersion);
      return;
    }
  
    const talker = message.talker();
    const habit_payload = {
      message_timestamp: message.date().getTime(),
      timezone: options.timezone,
      talker_id: talker.id,
      talker_name: talker.name(),
      talker_alias: await talker.alias(),
      event: options.event,
      note: options.note,
    }
  
    const llm_summary_payload = {
      time: new Date(habit_payload.message_timestamp).toLocaleString("en-US", {
        timeZone: habit_payload.timezone || this.DEFAULT_TIMEZONE,
      }),
      name: habit_payload.talker_alias || habit_payload.talker_name,
      event: habit_payload.event,
      note: habit_payload.note,
    }
    const summary = await this.llmClient.generateResponse(JSON.stringify(llm_summary_payload), message);
    await respond(message, summary);
  
    this.postHabitPayload(habit_payload);
  }
}

export default HabitTracker;