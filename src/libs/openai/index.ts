import { config } from "@config";
import logger from "@logger";
import OpenAI from "openai";

type ThreadOwner = string;
enum AssistantEnum {
  DEFAULT = "default",
  HABIT_TRACKER = "habit_tracker",
}

class OpenAIClient {
  public assistant?: OpenAI.Beta.Assistants.Assistant;
  /**
   * threads key: the owner of the thread in wechat, 
   * either contact or group chat topic
   */
  public threads?: Record<ThreadOwner, OpenAI.Beta.Threads.Thread>;
  public static openai: OpenAI; 
  public static assistants_pool?: Record<AssistantEnum, OpenAI.Beta.Assistants.Assistant["id"]>;

  private constructor() {
    OpenAIClient.openai = new OpenAI({
      apiKey: config.OPENAI_API_KEY,
      project: config.OPENAI_PROJECT_ID || undefined
    });
  }

  static async init(
    { assistantCreateOption }: 
    { assistantCreateOption: OpenAI.Beta.Assistants.AssistantCreateParams }
  ) {
    const client = new OpenAIClient();

    client.assistant = await OpenAIClient.openai.beta.assistants.create(assistantCreateOption);

    return client;
  }

  async createThread(threadOwner: ThreadOwner) {
    if (!this.threads) {
      const thread = await OpenAIClient.openai.beta.threads.create();
      this.threads = { [threadOwner]: thread };
      return;
    }

    if (!this.threads.hasOwnProperty(threadOwner)) {
      const thread = await OpenAIClient.openai.beta.threads.create();
      this.threads[threadOwner] = thread;
      return;
    }
    
    throw new Error(`A thread with the owner ${threadOwner} already exists`);
  }    

  /**
   * Create a message in the thread. 
   * (Create a thread for the `threadOwner` if it hasn't been created yet)
   * @param message Plain text message to be sent
   * @param threadOwner thread owner in wechat (contact or group chat topic)
   */
  async createMessage(message: string, threadOwner: ThreadOwner) {
    if (!this.threads || !this.threads!.hasOwnProperty(threadOwner)) {
      await this.createThread(threadOwner);
    }

    const thread = this.threads![threadOwner];

    await OpenAIClient.openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: message,
    });
  }

  /**
   * Run a thread and get the last message from the updated thread.
   * Ref: https://platform.openai.com/docs/api-reference/messages/listMessages
   * @param threadOwner thread owner in wechat (contact or group chat topic)
   * @returns aisstant response in plain text
   */
  async getResponse(threadOwner: ThreadOwner): Promise<string|undefined> {
    if (!this.assistant) {
      throw new Error("Assistant has not been initialized. Create assistant before anything else");
    }

    if (!this.threads || !this.threads!.hasOwnProperty(threadOwner)) {
      throw new Error("No corresponding thread has been found. Init a thread and create messages first.");
    }

    const thread = this.threads![threadOwner];

    const run = await OpenAIClient.openai.beta.threads.runs.createAndPoll(
      thread.id,
      { 
        assistant_id: this.assistant!.id,
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

    if (!this.threads || !this.threads!.hasOwnProperty(threadOwner)) {
      throw new Error("No corresponding thread has been found. Init a thread and create messages first.");
    }

    const thread = this.threads![threadOwner];

    const run = OpenAIClient.openai.beta.threads.runs
    .stream(thread.id, {
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

}

export default OpenAIClient;
