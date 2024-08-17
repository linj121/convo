import logger from "@logger";
import { MessageInterface } from "wechaty/impls";
import AssistantService from "./index";
import { habitTracker } from "./commands";
import { MessageType } from "./types";
import type { Sayable } from "wechaty";
import { llmClients } from "./init";

class MessageProcessor {
  ctx: AssistantService;

  constructor(ctx: AssistantService) {
    this.ctx = ctx;
  }

  static async respond(ctx: MessageInterface, response: Sayable): Promise<void> {
    const room = ctx.room();
    if (room) {
      await room.say(response);
      return;
    }
    
    // Below are for Direct Messages
    if (ctx.self()) {
      const listener = ctx.listener();
      if (!listener) throw new Error("Message target cannot be resolved");
      await listener.say(response);
    } else {
      await ctx.say(response);
    }
  }

  async process(message: MessageInterface) {
    /**
     * Skip processing the message if it's older than the spawn time of our wechaty app 
     */
    if (message.date().getTime() < this.ctx.initializedAt) return;

    logger.info(`on(message) ${message.toString()}`);

    if (
      message.room() && 
      (await message.room()!.topic()) === "罗伯特" && 
      message.type() === MessageType.Text
    ) {
      const message_text = message.text();

      try {

        if (/^ *\/habit/i.test(message_text)) {

          await habitTracker(message);
  
        } else if (/^ *@(神奇海螺|jarvis)/i.test(message_text)) {
        
          const response = await this.intelliResponse(message);
          MessageProcessor.respond(message, response);

        }

      } catch (error) {
        
        logger.error(error)

        MessageProcessor.respond(message, "Something went wrong, please try again later");

      }

      return;
    }
  }

  async intelliResponse(message: MessageInterface): Promise<string> {
    if (message.type() !== MessageType.Text) { 
      throw new Error(`Expecting message of type of Text, got ${message.type()}`);
    }

    const llmClient = llmClients.default;

    const matches = message.text().match(/^ *@(神奇海螺|jarvis)/i);
    if (!matches) throw new Error("Trigger word not found");
    const extracted_msg = message.text().substring(matches[0].length).trim();

    const threadOwner: string = message.room() ? await message.room()!.topic() : message.talker().name();

    await llmClient.createMessage(extracted_msg, threadOwner);
    
    const response = await llmClient.getResponse(threadOwner);
    if (!response) throw new Error("Failed to get response using llm client");

    const truncated_msg: string = 
      extracted_msg.length >= 15 ? extracted_msg.substring(0, 15) + "..." : extracted_msg;
    const hydrated_response: string = 
      `@${message.talker().name()}\n` +
      `${truncated_msg}\n` +
      "===============\n" +
      response;

    return hydrated_response;

  }

}

export default MessageProcessor;