import { Config, config } from "@config";
import { 
  isFromGroupChat,
  getTargetContactName,
  respond,
} from "@utils/wechatyUtils";
import { NotImplementedError } from "@utils/errors";
import { MessageInterface } from "wechaty/impls";
import { MessageType } from "../types";
import PluginBase from "./pluginBase";
import logger from "@logger";


type PluginMetaData = {
  enabled: boolean,
};

class PluginRegistry {
  /**
   * Singleton instance
   */
  private static instance: PluginRegistry;

  protected groupChatWhiteList: Set<string>;
  protected contactWhiteList: Set<string>;

  /**
   * Registered plugins and their corresponding meta data
   */
  protected plugins: Map<PluginBase, PluginMetaData>;

  /**
   * A mapping of message type and plugins that handles that type
   */
  protected pluginMappings: Map<MessageType, Array<PluginBase>>;

  private constructor(config: Config) {
    this.groupChatWhiteList = new Set(config.WECHATY_GROUPCHAT_WHITELIST);
    this.contactWhiteList = new Set(config.WECHATY_CONTACT_WHITELIST);
    
    this.plugins = new Map();
    this.pluginMappings = new Map();
  }

  public static getInstance(configuration: Config = config): PluginRegistry {
    if (!PluginRegistry.instance) {
      PluginRegistry.instance = new PluginRegistry(configuration);
    }
    return PluginRegistry.instance;
  }

  public register<P extends PluginBase>(plugin: P): void {
    this.addPlugin(plugin);
    this.addPluginMapping(plugin);
  }

  /**
   * 
   * @param plugin sub-class of PluginBase
   * @param pluginMetaData 
   */
  private addPlugin<P extends PluginBase>(plugin: P, pluginMetaData?: PluginMetaData): void {
    const defaultMetaData: PluginMetaData = {
      enabled: true,
    };
    this.plugins.set(plugin, pluginMetaData ?? defaultMetaData);
  }

  /**
   * Map a plugin to all the message types that it handles 
   * @param plugin sub-class of PluginBase
   */
  private addPluginMapping<P extends PluginBase>(plugin: P): void {
    for (const pluginMessageType of plugin.validators.keys()) {
      const pluginArray = this.pluginMappings.get(pluginMessageType);
      if (pluginArray === undefined) this.pluginMappings.set(pluginMessageType, [plugin]);
      else pluginArray.push(plugin);
    }
  }

  public enablePlugin<P extends PluginBase>(plugin: P) {
    throw new NotImplementedError();
  }

  public disablePlugin<P extends PluginBase>(plugin: P) {
    throw new NotImplementedError();
  }

  private checkMessageType(message: MessageInterface): boolean {
    return this.pluginMappings.has(message.type());
  }

  private async checkMessageSource(message: MessageInterface): Promise<boolean> {
    if (isFromGroupChat(message)) {
      return this.groupChatWhiteList.has(await message.room()!.topic());
    }

    return this.contactWhiteList.has(await getTargetContactName(message));
  }
  
  /**
   * Filter out messages that we don't want to process
   * @param message message object provided by on-message event
   * @returns A Promise\<boolean\>. `true`: continue handling the message; `false`: abort. 
   */
  private async shouldProcessMessage(message: MessageInterface): Promise<boolean> {
    if (!this.checkMessageType(message)) return false;
    return await this.checkMessageSource(message);
  }

  public async dispatchPlugins(message: MessageInterface): Promise<void> {
    if (!await this.shouldProcessMessage(message)) return;

    const pluginsHandlingCurrentMsgType = this.pluginMappings.get(message.type());
    if (pluginsHandlingCurrentMsgType === undefined) {
      throw new Error(`Plugins array that handle current message type ${message.type()} is undefined`);
    }

    for (const plugin of pluginsHandlingCurrentMsgType) {
      // Process plugin meta and only continue when a plugin is enabled
      const pluginMetaData = this.plugins.get(plugin);
      if (pluginMetaData === undefined) {
        throw new Error(`Current plugin ${plugin} is not registered`);
      }
      if (!pluginMetaData.enabled) return;

      // If the plugin validator determines the current message is a match,
      // dispatch the plugin by calling its handler and finish processing.
      // NOTE: If there are multiple plugins that handles the same kind of message,
      // only the first matched plugin will be dispatched.
      let pluginValidator = plugin.validators.get(message.type());
      if (pluginValidator === undefined) {
        throw new Error(`Failed to dispatch plugin: ${plugin.pluginName}, validator for type ${message.type()} is undefined`);
      }
      // Fix `this` context in the validator function
      pluginValidator = pluginValidator.bind(plugin);

      if (await pluginValidator(message)) {
        logger.debug(`Dispatching plugin: ${plugin.pluginName}`);
        try {
          await plugin.pluginHandler(message);
        } catch (error) {
          logger.error(error);
          await respond(message, `Something went wrong with the plugin: ${plugin.pluginName}, please try again later`);          
        } finally {
          // Exit the dispatcher no matter what
          return;
        }
      }
    }
  }

}

export default PluginRegistry;
