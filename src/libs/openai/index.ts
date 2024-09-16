import { config } from "@config";
import logger from "@logger";
import OpenAI, { NotFoundError, toFile } from "openai";
import { MessageInterface } from "wechaty/impls";
import { TranscriptionCreateParams } from "openai/resources/audio/transcriptions";
import { AssistantRepository, ThreadRepository } from "@data/repositories";
import type { Assistant } from "@prisma/client";
import { DataRepositoryNotFoundError } from "@utils/errors";
import { FileBox, FileBoxInterface } from "file-box";

type ThreadOwner = string;

// Override SpeechCreateParams so that we can make these props optional
// and give them default values
interface SpeechParams extends Omit<OpenAI.Audio.Speech.SpeechCreateParams, "model" | "voice"> {
  model?: OpenAI.Audio.Speech.SpeechCreateParams["model"]
  voice?: OpenAI.Audio.Speech.SpeechCreateParams["voice"]
}

enum AssistantEnum {
  DEFAULT = "default",
  HABIT_TRACKER = "habit_tracker",
}

class OpenAIClient {
  public assistant?: OpenAI.Beta.Assistants.Assistant;
  public assistant_name?: AssistantEnum;
  public static openai: OpenAI;

  private constructor() {
    OpenAIClient.openai = new OpenAI({
      apiKey: config.OPENAI_API_KEY,
      project: config.OPENAI_PROJECT_ID || undefined
    });
  }

  static async init(
    { assistant_name, assistantCreateOption }: 
    { assistant_name: AssistantEnum, assistantCreateOption: OpenAI.Beta.Assistants.AssistantCreateParams }
  ): Promise<OpenAIClient> {
    const client = new OpenAIClient();

    await client.initAssistant(assistant_name, assistantCreateOption);

    return client;
  }

  public static async getThreadOwner(ctx: MessageInterface): Promise<ThreadOwner> {
    if (ctx.room()) return await ctx.room()!.topic();

    if (ctx.self()) return ctx.listener()!.name();
    
    return ctx.talker().name();
  }

  private async createAndInsertAssistant(
    assistantName: AssistantEnum, 
    assistantCreateOption:OpenAI.Beta.Assistants.AssistantCreateParams
  ): Promise<OpenAI.Beta.Assistants.Assistant> {
    try {
      const created_assistant = await OpenAIClient.openai.beta.assistants.create(assistantCreateOption);
      await AssistantRepository.upsert({
        assistant_id: created_assistant.id,
        name: assistantName
      });
      return created_assistant;
    } catch (error) {
      throw new Error(`Asssitant creation for ${assistantName} failed`, { cause: error });
    }
  }

  private async initAssistant(
    assistantName: AssistantEnum, 
    assistantCreateOption: OpenAI.Beta.Assistants.AssistantCreateParams
  ) {
    let assistant_cache: Assistant | undefined;
    let final_assistant: OpenAI.Beta.Assistants.Assistant | undefined;

    try {
      assistant_cache = await AssistantRepository.findOneByAssistantName(assistantName);
      logger.debug(`Found assistant from db: ${JSON.stringify(assistant_cache)}`);

      try {      
        final_assistant = await OpenAIClient.openai.beta.assistants.retrieve(assistant_cache.assistant_id);
      } catch (error) {
        if (error instanceof NotFoundError) {
          logger.debug(`assistant_id not found from openai backend: ${assistant_cache.assistant_id}`);
          final_assistant = await this.createAndInsertAssistant(assistantName, assistantCreateOption);
        } else {
          throw error;
        }
      }

    } catch (error) {
      if (error instanceof DataRepositoryNotFoundError) {
        final_assistant = await this.createAndInsertAssistant(assistantName, assistantCreateOption);
      } else {
        throw new Error("Failed to initialize assistants for openai client", { cause: error });
      }
    }

    this.assistant = final_assistant;
    this.assistant_name = assistantName;
  }

  private async createAndInsertThread(threadOwner: ThreadOwner): Promise<OpenAI.Beta.Threads.Thread> {
    try {
      const created_thread = await OpenAIClient.openai.beta.threads.create();
      await ThreadRepository.upsert({
        owner: threadOwner,
        thread_id: created_thread.id
      });
      return created_thread;
    } catch (error) {
      throw new Error(`Thread creation for ${threadOwner} failed`, { cause: error });
    }
  }

  private async getThreadID(threadOwner: ThreadOwner): Promise<OpenAI.Beta.Threads.Thread["id"]> {
    try {
      const thread = await ThreadRepository.findOneByThreadOwner(threadOwner);
      return thread.thread_id;
    } catch (error) {
      if (error instanceof DataRepositoryNotFoundError) {
        const new_thread = await this.createAndInsertThread(threadOwner);
        return new_thread.id;
      } else {
        throw error;
      }
    }
  }

  /**
   * Create a message in the thread. 
   * (Create a thread for the `threadOwner` if it hasn't been created yet)
   * @param message Plain text message to be sent
   * @param threadOwner thread owner in wechat (contact or group chat topic)
   */
  public async createMessage(message: string, threadOwner: ThreadOwner): Promise<OpenAI.Beta.Threads.Thread["id"]> {
    // if (!this.threads || !this.threads!.hasOwnProperty(threadOwner)) {
    //   await this.createThread(threadOwner);
    // }

    // const thread = this.threads![threadOwner];

    const thread_id = await this.getThreadID(threadOwner);

    const createFromThread = async (threadID: string) => 
      await OpenAIClient.openai.beta.threads.messages.create(
        threadID, 
        {
          role: "user",
          content: message,
        }
      );
    
    try {
      await createFromThread(thread_id);
      return thread_id;
    } catch (error) {
      if (error instanceof NotFoundError) {
        const new_thread_id = (await this.createAndInsertThread(threadOwner)).id;
        await createFromThread(new_thread_id);
        return thread_id;
      } else {
        throw new Error(`Failed to create message for ${threadOwner}`, { cause: error });
      }
    }

  }

  /**
   * Run a thread and get the last message from the updated thread.
   * Ref: https://platform.openai.com/docs/api-reference/messages/listMessages
   * @param threadOwner thread owner in wechat (contact or group chat topic)
   * @param threadID Optional. Supply this arg to avoid calling OpenAI API
   * @returns aisstant response in plain text
   */
  public async getResponse(threadOwner: ThreadOwner, threadID?: OpenAI.Beta.Threads.Thread["id"]): Promise<string|undefined> {
    if (!this.assistant) {
      throw new Error("Assistant has not been initialized. Create assistant before anything else");
    }

    const thread_id = threadID ?? await this.getThreadID(threadOwner);

    const run = await OpenAIClient.openai.beta.threads.runs.createAndPoll(
      thread_id,
      { 
        assistant_id: this.assistant.id,
      }
    );

    if (run.status !== "completed") {
      logger.debug(`[OpenAIClient] Run Status: ${run.status}`);
      return;
    }

    const messages = await OpenAIClient.openai.beta.threads.messages.list(
      run.thread_id
    );

    // List all messages in the thread:
    // for (const message of messages.data.reverse()) {
    //   loggger.debug(`${message.role} > ${message.content[0].type === "text" && message.content[0].text.value}`);
    // }

    if (messages.data[0].content[0].type !== "text") {
      return;
    }

    return messages.data[0].content[0].text.value;

  }

  /**
   * https://github.com/openai/openai-node/blob/master/helpers.md
   * @param threadOwner thread owner in wechat (contact or group chat topic)
   */
  async getResponseStream(threadOwner: ThreadOwner) {
    if (!this.assistant) {
      throw new Error("Assistant has not been initialized. Create assistant before anything else");
    }

    const thread_id = await this.getThreadID(threadOwner);

    const run = OpenAIClient.openai.beta.threads.runs
    .stream(thread_id, {
      assistant_id: this.assistant.id,
    })
    .on("textCreated", (text) => process.stdout.write("\nassistant > "))
    .on("textDelta", (textDelta, snapshot) => process.stdout.write(textDelta.value!))
    .on("toolCallCreated", (toolCall) => process.stdout.write(`\nassistant > ${toolCall.type}\n\n`))
    .on("toolCallDelta", (toolCallDelta, snapshot) => {
      if (toolCallDelta.type === "code_interpreter") {
        if (toolCallDelta.code_interpreter!.input) {
          process.stdout.write(toolCallDelta.code_interpreter!.input);
        }
        if (toolCallDelta.code_interpreter!.outputs) {
          process.stdout.write("\noutput >\n");
          toolCallDelta.code_interpreter!.outputs.forEach((output) => {
            if (output.type === "logs") {
              process.stdout.write(`\n${output.logs}\n`);
            }
          });
        }
      }
    });
  }

  /**
   * https://platform.openai.com/docs/api-reference/audio/createSpeech
   * @param speechParams 
   * @param speechParams.input text input to be tts-ed
   * @param speechParams.model Optional. Defaults to `tts-1`
   * @param speechParams.voice Optional. Defaults to `config.OPENAI_TTS_VOICE`
   * @param speechParams.response_format Optional. Defaults to `mp3`
   * @param speechParams.speed Optional. Defaults to `1`
   * @returns A buffer containing the speech audio content
   */
  public static async textToSpeech(speechParams: SpeechParams): Promise<Buffer> {
    // Setting default values
    if (!speechParams["model"]) speechParams["model"] = "tts-1";
    if (!speechParams["voice"]) speechParams["voice"] = config.OPENAI_TTS_VOICE;

    const response = await OpenAIClient.openai.audio.speech.create(
      speechParams as OpenAI.Audio.Speech.SpeechCreateParams
    );
    return Buffer.from(await response.arrayBuffer());
  }

  public static async textToSpeechFileBox(inputText: string, filename: string): Promise<FileBox> {
    try {
      const audioBuffer = await OpenAIClient.textToSpeech({ input: inputText });
      return FileBox.fromBuffer(audioBuffer, filename);
    } catch (error) {
      throw new Error("Failed to convert input text to speech file box", { cause: error });    
    }
  }

  /**
   * 
   * @param speech 
   * @returns 
   */
  public static async speechToText(
    speech: TranscriptionCreateParams["file"]
  ): Promise<string> {
    const transcription = await OpenAIClient.openai.audio.transcriptions.create({
      file: speech,
      model: "whisper-1",
      response_format: "json",
    });
    return transcription.text;
  }

  public static async speechFileBoxToText(speechFileBox: FileBox | FileBoxInterface): Promise<string> {
    try {
      const buffer = await speechFileBox.toBuffer();
      // https://community.openai.com/t/creating-readstream-from-audio-buffer-for-whisper-api/534380/3
      const compatibleBuffer = await toFile(buffer, "audio.mp3");
      return await OpenAIClient.speechToText(compatibleBuffer);
    } catch (error) {
      throw new Error("Failed to convert speech file box to text", { cause: error });    
    }
  }

  public async submitAndGetResponseFromAssistant(
    userMessage: string,
    threadOwner: ThreadOwner,
  ): Promise<string> {
    const threadID = await this.createMessage(userMessage, threadOwner);
    // Optimize response time by supplying threadID to this.getResponse 
    const response = await this.getResponse(threadOwner, threadID);
    if (!response) throw new Error(`Failed to get response from ${threadOwner} w/ id ${threadID}`);
    return response;
  }

  /**
   * Get llm response from a user message.
   * A message context is required for determining the thread owner.
   * This is a wrapper around submitAndGetResponseFromAssistant(2).
   */
  public async generateResponse(
    userMessage: string,
    ctx: MessageInterface
  ): Promise<string> {
    const threadOwner = await OpenAIClient.getThreadOwner(ctx);
    return await this.submitAndGetResponseFromAssistant(userMessage, threadOwner);
  }

}

export default OpenAIClient;
export { 
  AssistantEnum,
}
