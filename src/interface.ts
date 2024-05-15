import { ChatCompletionRequestMessage } from "openai";

export interface IConfig {
  api?: string;
  openai_api_key: string;
  model: string;
  chatTriggerRule: string;
  disableGroupMessage: boolean;
  temperature: number;
  blockWords: string[];
  chatgptBlockWords: string[];
  chatPrivateTriggerKeyword: string;
  port: string;
  blockSelf: boolean,
}
export interface User {
  username: string;
  chatMessage: Array<ChatCompletionRequestMessage>;
}

export interface Task {
  taskName: string;
  cronTime: string | Date;
  timeZone?: string;
  targetType: "contact" | "room";
  targetName: string;
}
