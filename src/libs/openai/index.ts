import { config } from "@config";
import logger from "@logger";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: config.OPENAI_API_KEY,
  project: config.OPENAI_PROJECT_ID || undefined
});

class OpenAIClient {
  assistant?: OpenAI.Beta.Assistants.Assistant;
  /**
   * threads key: the owner of the thread in wechat, 
   * either contact or group chat topic
   */
  threads?: Record<string, OpenAI.Beta.Threads.Thread>;

  private constructor() {}

  static async init(
    { assistantCreateOption }: 
    { assistantCreateOption: OpenAI.Beta.Assistants.AssistantCreateParams }
  ) {
    const client = new OpenAIClient();

    client.assistant = await openai.beta.assistants.create(assistantCreateOption);

    return client;
  }

  async createThread(threadOwner: string) {
    if (!this.threads) {
      const thread = await openai.beta.threads.create();
      this.threads = { [threadOwner]: thread };
      return;
    }

    if (!this.threads.hasOwnProperty(threadOwner)) {
      const thread = await openai.beta.threads.create();
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
  async createMessage(message: string, threadOwner: string) {
    if (!this.threads || !this.threads!.hasOwnProperty(threadOwner)) {
      await this.createThread(threadOwner);
    }

    const thread = this.threads![threadOwner];

    await openai.beta.threads.messages.create(thread.id, {
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
  async getResponse(threadOwner: string): Promise<string|undefined> {
    if (!this.assistant) {
      throw new Error("Assistant has not been initialized. Create assistant before anything else");
    }

    if (!this.threads || !this.threads!.hasOwnProperty(threadOwner)) {
      await this.createThread(threadOwner);
    }

    const thread = this.threads![threadOwner];

    let run = await openai.beta.threads.runs.createAndPoll(
      thread.id,
      { 
        assistant_id: this.assistant!.id,
      }
    );

    if (run.status !== "completed") {
      logger.debug(`[OpenAIClient] Run Status: ${run.status}`);
      return;
    }

    const messages = await openai.beta.threads.messages.list(
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
  async getResponseStream(threadOwner: string) {
    if (!this.assistant) {
      throw new Error("Assistant has not been initialized. Create assistant before anything else");
    }

    if (!this.threads || !this.threads!.hasOwnProperty(threadOwner)) {
      await this.createThread(threadOwner);
    }

    const thread = this.threads![threadOwner];

    const run = openai.beta.threads.runs
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
