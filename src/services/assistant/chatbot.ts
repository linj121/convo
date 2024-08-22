import { MessageType } from "./types";
import { getLlmClient } from "./init";
import { MessageInterface } from "wechaty/impls";
import { AssistantEnum } from "@libs/openai";
import OpenAIClient from "@libs/openai";
import { FileBox, FileBoxInterface } from "file-box";
import { toFile } from "openai/uploads";
import logger from "@logger";
import { NotTriggeredError } from "@utils/errors";

export type AllowedChatbotInput = Extract<MessageType, MessageType.Text | MessageType.Audio>;

export const AllowedChatbotInput = {
  [MessageType.Text]: MessageType.Text,
  [MessageType.Audio]: MessageType.Audio
} as const;

const allowedChatbotInput = new Set<MessageType>([
  MessageType.Text,
  MessageType.Audio
]);

const chatbotTrigger: Record<AllowedChatbotInput, RegExp> = {
  [MessageType.Text]: /^ *@(神奇海螺|海螺|螺|jarvis)/i,
  [MessageType.Audio]: /^ *(神奇海螺|海螺|jarvis)/i
}

function validateChatbotInput(message: MessageInterface): void {
  if (!allowedChatbotInput.has(message.type())) {
    throw new Error(`Expecting message of type of Text, got ${message.type()}`);
    // return;
  }
}

function matchAndSanitizeInputMessage(inputMessage: string, messageType: AllowedChatbotInput): string {
  const matches = inputMessage.match(chatbotTrigger[messageType]);
  if (!matches) {
    throw new NotTriggeredError("Chatbot trigger word not found");
  }

  // Remove trigger word to prevent infinite loop
  return inputMessage.substring(matches[0].length).trim();
}

async function textToSpeechFileBox(inputText: string, filename: string): Promise<FileBox> {
  try {
    const audioBuffer = await OpenAIClient.textToSpeech({ input: inputText });
    return FileBox.fromBuffer(audioBuffer, filename);
  } catch (error) {
    throw new Error("Failed to convert input text to speech file box", { cause: error });    
  }
}

async function speechFileBoxToText(speechFileBox: FileBox | FileBoxInterface): Promise<string> {
  try {
    const buffer = await speechFileBox.toBuffer();
    // https://community.openai.com/t/creating-readstream-from-audio-buffer-for-whisper-api/534380/3
    const compatibleBuffer = await toFile(buffer, "audio.mp3");
    return await OpenAIClient.speechToText(compatibleBuffer);
  } catch (error) {
    throw new Error("Failed to convert speech file box to text", { cause: error });    
  }
}

function textResponseTemplate(
  userMessage: string, 
  responseMessage: string, 
  metaInfo?: {
    talkerName?: string
  }
): string {
  const truncatedUserMessage: string = 
    userMessage.length >= 15 ? userMessage.substring(0, 15) + "..." : userMessage;
  const mentionUser: string = metaInfo?.talkerName ? `@${metaInfo!.talkerName}\n` : "";
  const template: string = 
    mentionUser +
    `${truncatedUserMessage}\n` +
    "===============\n" +
    responseMessage;
  return template;
}

/**
 * 
 * @param message The message interface from wechaty
 * @param enableAudioResponse Defaults to `false`. Set to `true` to generate audio response
 * @returns `[text response message, corresponding audio content]`
 * @throws NotTriggeredError
 */
async function chatbot(
  message: MessageInterface, 
  enableAudioResponse: boolean = false
): Promise<[string, FileBox | undefined]>
{
  validateChatbotInput(message);

  const llmClient = getLlmClient(AssistantEnum.DEFAULT);

  let userMessage: string | undefined;

  // Handle different types of messages
  // text -> refined text
  // audio -> text -> refined text
  const messageType = message.type();
  if (messageType == MessageType.Text) {
    userMessage = matchAndSanitizeInputMessage(message.text(), messageType);
  } else if (messageType == MessageType.Audio) {
    const transcription = await speechFileBoxToText(await message.toFileBox());
    logger.debug(`Got transcription: ${transcription}`);
    userMessage = matchAndSanitizeInputMessage(transcription, messageType);
  } else {
    throw new Error(`Invalid input type: ${messageType}`);
  }


  const threadOwner: string = await OpenAIClient.getThreadOwner(message);

  const response = await llmClient.submitAndGetResponseFromAssistant(userMessage, threadOwner);

  let speech: FileBox | undefined;

  if (enableAudioResponse) speech = await textToSpeechFileBox(response, "response.mp3");

  const textResponse = textResponseTemplate(
    userMessage, response, { talkerName: message.talker().name() }
  );

  return [textResponse, speech];
}

export default chatbot;
export {
  chatbotTrigger
}