import { MessageInterface } from "wechaty/impls";
import { Sayable } from "wechaty";

/**
 * 
 * @param ctx The message object from wechaty
 * @param response A Sayable response object to send
 * Send response to:
 * 1. A room, if ctx is from a group chat
 * 2. DM, if ctx is from DM. When the message is send by self, send it to the receiver
 */
async function respond(ctx: MessageInterface, response: Sayable): Promise<void> {
  // Handle Group Messages
  const room = ctx.room();
  if (room) {
    await room.say(response);
    return;
  }
  
  // Handle Direct Messages
  if (ctx.self()) {
    const listener = ctx.listener();
    if (!listener) throw new Error("Message target cannot be resolved");
    await listener.say(response);
  } else {
    await ctx.say(response);
  }
}

/**
 * 
 * @param ctx The message object from wechaty
 * @returns Target contact name:
 * 1. Name of the listener if message is sent by self
 * 2. Name of the talker if message is sent by others
 */
async function getTargetContactName(ctx: MessageInterface): Promise<string> {
  if (ctx.self()) return ctx.listener()!.name();
  else return ctx.talker().name();
}

function isFromGroupChat(ctx: MessageInterface): boolean {
  return ctx.room() !== undefined ? true : false;
}

export {
  respond,
  getTargetContactName,
  isFromGroupChat
}