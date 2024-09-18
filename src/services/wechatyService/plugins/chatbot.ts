import { Message } from "wechaty";
import { MessageType } from "../types";
import PluginBase from "./pluginBase";
import { config } from "@config";
import OpenAIClients from "@libs/openai/clients";
import OpenAIClient, { AssistantEnum } from "@libs/openai";
import { deletePartofString } from "@utils/functions";
import type { FileBox } from "file-box";
import { InvalidPluginInput } from "@utils/errors";
import { respond } from "@utils/wechatyUtils";

class ChatBot extends PluginBase {
  public pluginName: string = "Chat Bot"
  public pluginVersion: string = "v0.1.0";
  public pluginDescription: string = 
    "An intelligent conversational chat bot. " +
    `Send @ + one of the following: (${config.WECHATY_CHATBOT_NAME.join(",")}) + your message to talk to the bot! Support both text and audio messages.`;

  public validators: Map<MessageType, (message: Message) => (Promise<boolean> | boolean)>;

  public audioResponseEnabled: boolean = true;

  private messageValidatorRegExp = {
    [MessageType.Text]: new RegExp(`^ *@(${config.WECHATY_CHATBOT_NAME.join("|")})`, "i"),
    [MessageType.Audio]: new RegExp(`^ *(${config.WECHATY_CHATBOT_NAME.join("|")})`, "i"),
  };

  private llmClient = OpenAIClients.getOpenAIClient(AssistantEnum.DEFAULT);

  private static readonly QUOTE_MESSAGE_LENGTH: number = 20;

  constructor() {
    super();
    this.validators = new Map([
      [MessageType.Text, this.textMessageValidator],
      // - NOTE: This will make this plugin CATCH ALL audio messages
      // - REASON: If we use the validator here, the plugin registry dispatcher will transcribe the audio
      // in order to validate it. Then we'll have to transcribe the audio again in our handler.
      // Now if we use `() => true`, we lost some readability but we can save the transcription text
      // to local functions for further processing, without calling getAudioTranscription twice.
      // - POSSIBLE FIX: Get audio transcription at the registry level and pass the text to handlers.
      // eg. Augment the Message type and include extra properties like `transcription: string`, etc.
      [MessageType.Audio, () => true],
    ]);
  }

  private textMessageValidator(message: Message): boolean {
    return this.messageValidatorRegExp[MessageType.Text].test(message.text());
  }

  private async audioMessageValidator(transcription: string): Promise<boolean> {
    return this.messageValidatorRegExp[MessageType.Audio].test(transcription);
  }

  private async getAudioTranscription(message: Message): Promise<string> {
    return await OpenAIClient.speechFileBoxToText(await message.toFileBox());
  }

  private removeTrigger(messageText: string, messageType: keyof typeof this.messageValidatorRegExp): string {
    const matches = messageText.match(this.messageValidatorRegExp[messageType]);
    if (!matches) throw new Error(`${messageText} is not a match for chatbot`);
  
    // Remove the fisrt occurence of the trigger word to prevent infinite loop
    const startIndex = matches.index ?? 0;
    const endIndex = startIndex + matches[0].length;
    return deletePartofString(messageText, startIndex, endIndex).trim();
  }

  /**
   * 
   * @param userMessage Message sent by the talker that we'd like to quote
   * @param responseMessage Text response to the talker
   * @param metaData Optional.
   * @param metaData.talkerName Optional. Provide talker name to mention the talker in response msg 
   * @returns text response
   */
  private textResponseTemplate(
    userMessage: string, 
    responseMessage: string, 
    metaData?: {
      talkerName?: string
    }
  ): string {
    const quote: string = 
      userMessage.length >= ChatBot.QUOTE_MESSAGE_LENGTH 
      ? userMessage.substring(0, ChatBot.QUOTE_MESSAGE_LENGTH) + "..." 
      : userMessage;
    const mentionUser: string = metaData?.talkerName ? `@${metaData!.talkerName}\n` : "";
    const template: string = 
      mentionUser +
      `${quote}\n` +
      "===============\n" +
      responseMessage;
    
    return template;
  }

  /**
   * 
   * @param message the wechaty message object provided by on-message event
   * @returns [textResponse, audioResponse (undefined if audio response not enabled)]
   */
  private async getChatBotResponse(message: Message): Promise<[string, FileBox | undefined]> {
    // Message.type() === text  -> process the original text
    // Message.type() === audio -> process transcription extracted from the audio
    let messageText: string = message.text();
    const messageType = message.type();

    if (messageType === MessageType.Audio) {
      messageText = await this.getAudioTranscription(message);
      // IMPORTANT: Abort if the audio transcription is not a match.
      // Since we use `() => true` for audio message validator in the plugin registry,
      // we have to manually validate it here.
      if (!(await this.audioMessageValidator(messageText))) {
        throw new InvalidPluginInput();
      }
    } else if (messageType !== MessageType.Text) {
      // Type Guarding
      throw new InvalidPluginInput();
    }

    const sanitizedMessageText = this.removeTrigger(messageText, messageType);

    // LLM text response
    const llmResponse = await this.llmClient.generateResponse(sanitizedMessageText, message);
    const textResponse = this.textResponseTemplate(
      sanitizedMessageText, llmResponse, { talkerName: message.talker().name() }
    );
    
    // TTS audio response
    let audioResponse: FileBox | undefined;
    if (this.audioResponseEnabled) audioResponse = await OpenAIClient.textToSpeechFileBox(llmResponse, "response.mp3");
    
    return [textResponse, audioResponse];
  }

  public async pluginHandler(message: Message): Promise<void> {
    try {
      const [textResponse, audioResponse] = await this.getChatBotResponse(message);
      await respond(message, textResponse);
      // Always send audio response after text response
      if (this.audioResponseEnabled && audioResponse) await respond(message, audioResponse);
    } catch (error) {
      if (error instanceof InvalidPluginInput) return;
      else throw error;
    }
  }
}

export default ChatBot;