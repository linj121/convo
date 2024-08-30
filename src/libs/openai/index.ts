import { config } from "@config";
import logger from "@logger";
import LlmRepository from "@data/llm.repository";
import OpenAI, { NotFoundError } from "openai";
import { MessageInterface } from "wechaty/impls";
import { TranscriptionCreateParams } from "openai/resources/audio/transcriptions";

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
enum Tables {
  Assistant = "assistant",
  Thread = "thread",
}

class OpenAIClient {
  public assistant?: OpenAI.Beta.Assistants.Assistant;
  public assistant_name?: AssistantEnum;
  public static openai: OpenAI;
  public static SpeechParamsDefaults: Required<Pick<SpeechParams, "model" | "voice">>;

  private constructor() {
    OpenAIClient.openai = new OpenAI({
      apiKey: config.OPENAI_API_KEY,
      project: config.OPENAI_PROJECT_ID || undefined
    });
    OpenAIClient.SpeechParamsDefaults = {
      model: "tts-1",
      // Use tts-1 instead of tts-1-hd because it's more affordable and faster in response
      voice: config.OPENAI_TTS_VOICE
    };
  }

  static async init(
    { assistant_name, assistantCreateOption }: 
    { assistant_name: AssistantEnum, assistantCreateOption: OpenAI.Beta.Assistants.AssistantCreateParams }
  ): Promise<OpenAIClient> {
    const client = new OpenAIClient();

    await client.initAssistant(assistant_name, assistantCreateOption);

    return client;
  }

  public static async getThreadOwner(ctx: MessageInterface): Promise<string> {
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
      // TODO: upsert
      LlmRepository.insertOne(Tables.Assistant, {
        str_id: assistantName,
        actual_id: created_assistant.id,
      });
      return created_assistant;
    } catch (error) {
      throw new Error(`Asssitant creation for ${assistantName} failed`, { cause: error });
    }
  }

  private async initAssistant(
    assistantName: AssistantEnum, 
    assistantCreateOption:OpenAI.Beta.Assistants.AssistantCreateParams
  ) {
    const assistant_cache = LlmRepository.findOne(
      Tables.Assistant,
      { value: assistantName }
    ) as {
      id: string,
      name: string,
      assistant_id: string
    } | undefined;
    
    logger.debug(`Found assistant from db: ${JSON.stringify(assistant_cache)}`);

    let final_assistant: OpenAI.Beta.Assistants.Assistant | undefined;

    if (!assistant_cache) {
      final_assistant = await this.createAndInsertAssistant(assistantName, assistantCreateOption);
    } else {
      try {      
        final_assistant = await OpenAIClient.openai.beta.assistants.retrieve(
          assistant_cache.assistant_id
        );
      } catch (error) {
        if (error instanceof NotFoundError) {
          logger.debug(`assistant id not found from openai backend: ${assistant_cache.assistant_id}`);
          final_assistant = await this.createAndInsertAssistant(assistantName, assistantCreateOption);
        } else {
          throw error;
        }
      }
    }

    this.assistant = final_assistant;
    this.assistant_name = assistantName;
  }

  private async createAndInsertThread(threadOwner: ThreadOwner): Promise<OpenAI.Beta.Threads.Thread> {
    try {
      const created_thread = await OpenAIClient.openai.beta.threads.create();
      // TODO: use upsert
      LlmRepository.insertOne(Tables.Thread, {
        str_id: threadOwner,
        actual_id: created_thread.id,
      });
      return created_thread;
    } catch (error) {
      throw new Error(`Thread creation for ${threadOwner} failed`, { cause: error });
    }
  }

  private async getThreadID(threadOwner: ThreadOwner): Promise<OpenAI.Beta.Threads.Thread["id"]> {
    const thread_cache = LlmRepository.findOne(
      Tables.Thread,
      { value: threadOwner }
    ) as {
      id: string,
      owner: string,
      thread_id: string
    } | undefined;

    if (!thread_cache) {
      const new_thread = await this.createAndInsertThread(threadOwner);
      return new_thread.id;
    }

    return thread_cache.thread_id;
  }

  /**
   * Create a message in the thread. 
   * (Create a thread for the `threadOwner` if it hasn't been created yet)
   * @param message Plain text message to be sent
   * @param threadOwner thread owner in wechat (contact or group chat topic)
   */
  async createMessage(message: string, threadOwner: ThreadOwner): Promise<OpenAI.Beta.Threads.Thread["id"]> {
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
   * @returns aisstant response in plain text
   */
  async getResponse(threadOwner: ThreadOwner, threadID?: OpenAI.Beta.Threads.Thread["id"]): Promise<string|undefined> {
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
    const params = {...speechParams, ...OpenAIClient.SpeechParamsDefaults};
    const response = await OpenAIClient.openai.audio.speech.create(params);
    return Buffer.from(await response.arrayBuffer());
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

  public async submitAndGetResponseFromAssistant(
    message: string,
    threadOwner: ThreadOwner,
  ): Promise<string> {
    const threadID = await this.createMessage(message, threadOwner);
    // Optimize response time by feeding threadID to this.getResponse 
    const response = await this.getResponse(threadOwner, threadID);
    if (!response) throw new Error(`Failed to get response from ${threadOwner} w/ id ${threadID}`);
    return response;
  }

}

export default OpenAIClient;
export { 
  AssistantEnum,
}
