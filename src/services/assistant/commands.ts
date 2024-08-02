import logger from "@logger";
import { MessageInterface } from "wechaty/impls";
import { llmClients } from "./init";
import { MessageType } from "./types";
import MsgProcessor from "./messageProcessor";

enum OptionType {
  EVENT = "e",
  TIMEZONE = "t",
  NOTE = "n",
  HELP = "h",
  VERSION = "v"
}

type HabitOptions = {
  event?: string;
  timezone?: string;
  note?: string;
  help?: boolean;
  version?: boolean;
}

const VERSION_MESSAGE: string = "Habit Tracker version 0.0.1";
const HELP_MESSAGE: string =
`A command for tracking habits
Usage: /habit [OPTIONS]
Options:
-e str  set custom event (leetcode, workout, ...)
-t str  set timezone (Asia/Shanghai, ...)
-n str  notes, enclosed by double quotes "
-h      display help message
-v      get current version

For more help on how to use this, head to https://aaa.bbb.ccc
`;
const DEFAULT_TIMEZONE = "America/Toronto";
const DEFAULT_TIMEZONE_ZH = "Asia/Shanghai";

function parse(command: string): HabitOptions {
  const pattern: RegExp =
    /(?:-(?<option1>[etn])\s+(?:"(?<note>[^"]+)"|(?<param>\S+)))|(?:-(?<option0>[hv]))/gm;
  const matches = command.matchAll(pattern);
  const options: HabitOptions = {};

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
 * eg. 
 * `
 * <br/> -> \n;
 * <a>url<a/> -> url;
 * “ -> ";
 * ” -> ";
 * `
 */
function preprocess(text: string): string {
  const processed = text
    .replace(/“|”/gm, '"')
    .replace(/<br\/>/gm, '\n')
    .replace(/<a[^>]*>(?<url>[^<]+)<\/a>/gm, "$<url>");
  return processed;
}

/**
 * Input validation
 */
function isValid(options: HabitOptions): boolean {
  // TODO:
  return true;
}

async function llmSummary(text: string, threadOwner: string): Promise<string> {
  const llmClient = llmClients.habitTrackerLLM;
  await llmClient.createMessage(text, threadOwner);
  const llmResponse = await llmClient.getResponse(threadOwner);
  if (!llmResponse) {
    throw new Error("Fail to get llm response");
  }
  return llmResponse;
}

async function postHabitPayload(payload: Object): Promise<void> {
  // TODO:
  return;
}

async function habitTracker(message: MessageInterface) {
  // Only process text message for now
  if (message.type() !== MessageType.Text) return;

  const text = preprocess(message.text());

  const options: HabitOptions = parse(text);

  if (!isValid(options)) {
    await MsgProcessor.respond(message, HELP_MESSAGE);
    return;
  }

  if (options.help) {
    await MsgProcessor.respond(message, HELP_MESSAGE);
    return;
  } 
  if (options.version) {
    await MsgProcessor.respond(message, VERSION_MESSAGE);
    return;
  }

  const talker = message.talker();
  const habit_payload = {
    /**
     * The number of milliseconds passed since 1970 UTC midnight
     */
    message_timestamp: message.date().getTime(),
    timezone: options.timezone,
    talker_id: talker.id,
    talker_name: talker.name(),
    talker_alias: await talker.alias(),
    event: options.event,
    note: options.note,
  }
  logger.debug(JSON.stringify(habit_payload));

  const threadOwner: string = message.room() ? await message.room()!.topic() : message.talker().name();
  const llm_summary_payload = {
    time: new Date(habit_payload.message_timestamp).toLocaleString("en-US", {
      timeZone: habit_payload.timezone || DEFAULT_TIMEZONE,
    }),
    name: habit_payload.talker_alias || habit_payload.talker_name,
    event: habit_payload.event,
    note: habit_payload.note,
  }
  const summary = await llmSummary(JSON.stringify(llm_summary_payload), threadOwner);
  MsgProcessor.respond(message, summary);

  postHabitPayload(habit_payload);

}

const test = () => {
  const command = 
  `/habit -t Asia/Shanghai -e workout -n “<br/>深蹲10000000kg<br/>100组<br/>https://shanghao.com<br/>“`;
  const processed = preprocess(command);
  console.log(processed);
  console.log(parse(processed));
}

//test();

export {
  parse,
  preprocess,
  habitTracker,
}