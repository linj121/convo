import { config } from "@config";
import OpenAIClient, { AssistantEnum } from "@libs/openai";
import { assistantPrompts } from "@utils/constants";

class OpenAIClients {
  public static assistantPrompts: Record<AssistantEnum, string>;

  public static openAIClients: Partial<Record<keyof typeof this.assistantPrompts, OpenAIClient>> = {};

  /**
   * Initialize openai clients with their corresponding instruction/prompt
   */
  public static async initialize(): Promise<void> {
    // Overwrite prompts if provided by config 
    OpenAIClients.assistantPrompts = {
      [AssistantEnum.DEFAULT]: config.ASSISTANT_PROMPT_DEFAULT || assistantPrompts[AssistantEnum.DEFAULT],
      [AssistantEnum.HABIT_TRACKER]: config.ASSISTANT_PROMPT_HABIT_TRACKER || assistantPrompts[AssistantEnum.HABIT_TRACKER],
    };

    for (const key of Object.keys(this.assistantPrompts) as Array<keyof typeof this.assistantPrompts>) {

      const client = await OpenAIClient.init({
        assistant_name: key,
        assistantCreateOption: {
          name: key + new Date().toISOString(),
          model: config.OPENAI_MODEL,
          tools: [{ type: "code_interpreter" }],
          instructions: this.assistantPrompts[key],
        }
      });
      this.openAIClients[key] = client;
    }
  }

  public static getOpenAIClient(client: AssistantEnum): OpenAIClient {
    const resultClient = this.openAIClients[client];
    if (!this.openAIClients) throw new Error("OpenAI clients empty. Did you forget to initialize?");
    if (!resultClient) throw new Error(`Failed to get the client ${client}`);
    return resultClient;
  }
}


export default OpenAIClients;