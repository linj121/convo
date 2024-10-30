import type {
  CronJob,
} from "cron";

import type { 
  Sayable 
} from "wechaty";

import type { Task } from "./schedulers/taskSchema";

import type { TemplateContextMap } from "./schedulers/templates";

/**
 * Wechaty Puppet Unified Schema for Message
 */
enum MessageType {
  Unknown = 0,

  Attachment  = 1,    // Attach(6),
  Audio       = 2,    // Audio(1), Voice(34)
  Contact     = 3,    // ShareCard(42)
  ChatHistory = 4,    // ChatHistory(19)
  Emoticon    = 5,    // Sticker: Emoticon(15), Emoticon(47)
  Image       = 6,    // Img(2), Image(3)
  Text        = 7,    // Text(1)
  Location    = 8,    // Location(48)
  MiniProgram = 9,    // MiniProgram(33)
  GroupNote   = 10,   // GroupNote(53)
  Transfer    = 11,   // Transfers(2000)
  RedEnvelope = 12,   // RedEnvelopes(2001)
  Recalled    = 13,   // Recalled(10002)
  Url         = 14,   // Url(5)
  Video       = 15,   // Video(4), Video(43)
  Post        = 16,   // Moment, Channel, Tweet, etc
}

type Job = {
  cronjob: CronJob,
  name: string,
  enabled: boolean,
}

type TaskActionTemplate = Task["action"]["template"];

type OnTickMessageProducer<
  Ctx, 
  T extends TaskActionTemplate = TaskActionTemplate
> = (
  this: Ctx, 
  args: {
    action: Extract<Task["action"], { template: T }>,  
    otherArgs: any 
  }
) => Promise<Sayable> | Sayable;

type TemplateMappings = {
  [T in TaskActionTemplate]: {
    messageProducer: OnTickMessageProducer<TemplateContextMap[T], T>;
    otherArgs: Parameters<OnTickMessageProducer<TemplateContextMap[T], T>>[0]['otherArgs'];
    context?: TemplateContextMap[T];
  };
};

export {
  MessageType,
  Job,
  OnTickMessageProducer,
  TaskActionTemplate,
  TemplateMappings,
}
