import logger from "@logger";
import { MessageInterface } from "wechaty/impls";
import AssistantService from "./index";
import { habitTracker } from "./commands";
import { MessageType } from "./types";
import { FileBox } from "file-box";
import type { Sayable } from "wechaty";
import chatbot, { AllowedChatbotInput, chatbotTrigger } from "./chatbot";
import { NotTriggeredError } from "@utils/errors";
class MessageProcessor {
  public ctx: AssistantService;
  // public static rules: Record<string, Record<string, string>>;

  constructor(ctx: AssistantService) {
    this.ctx = ctx;
  }

  static async respond(ctx: MessageInterface, response: Sayable): Promise<void> {
    const room = ctx.room();
    if (room) {
      await room.say(response);
      return;
    }
    
    // The below are for Direct Messages
    if (ctx.self()) {
      const listener = ctx.listener();
      if (!listener) throw new Error("Message target cannot be resolved");
      await listener.say(response);
    } else {
      await ctx.say(response);
    }
  }

  public async handleChatbot(message: MessageInterface): Promise<void> {
    try {
      const [textResponse, speech] = await chatbot(message, true);
      await MessageProcessor.respond(message, textResponse);
      if (speech) await MessageProcessor.respond(message, speech);
    } catch (error) {
      if (error instanceof NotTriggeredError) return;
      else throw error;
    }
  }

  public async process(message: MessageInterface): Promise<void> {
    // Skip processing the message if it's older than the spawn time of our wechaty app 
    if (message.date().getTime() < this.ctx.initializedAt) return;

    logger.info(`on(message) ${message.toString()}`);

    if (
      message.room() &&
      ["罗伯特", "今天玩啥 哇酷哇酷！"].includes(await message.room()!.topic()) && 
      [MessageType.Text, MessageType.Audio].includes(message.type())
    ) {
      // Handle audio message here
      if (message.type() === MessageType.Audio) {
        return await this.handleChatbot(message);
      }

      // Handle text message below

      const message_text = message.text();

      try {

        if (/^ *\/habit/i.test(message_text)) {

          await habitTracker(message);
  
        } else if (chatbotTrigger[message.type() as AllowedChatbotInput].test(message_text)) {
          
          await this.handleChatbot(message);

        } else if (/^ *卡布奇诺/i.test(message_text)) {

          const fileBox = FileBox.fromFile(`${__dirname}/../../../cappucino.mp3`);
          await MessageProcessor.respond(message, fileBox);

        }

      } catch (error) {
        
        logger.error(error);

        await MessageProcessor.respond(message, "Something went wrong, please try again later");

      }

      return;
    }
  }

}

export default MessageProcessor;