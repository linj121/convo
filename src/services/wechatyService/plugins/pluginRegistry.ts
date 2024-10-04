import { Config, config } from "@config";
import { 
  isFromGroupChat,
  getTargetContactName,
  respond,
} from "@utils/wechatyUtils";
import { InvalidCommandLineArgument, UnauthorizedError } from "@utils/errors";
import { commandLineParser } from "@utils/functions";
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

  private readonly PLUGIN_MANAGER_HELP_MESSAGE: string = 
`Plugin Manager
• Usage: /plugin [OPTION]
• Option:
-l | --list     list all plugins
-e | --enable  [N] enable plugin number N
-d | --disable [N] disable plugin number N
-h | --help     display help message
• Example:
/plugin --list
/plugin --disable 2
/plugin -e 1
/plugin -h`;

  private readonly PLUGIN_MANAGER_TEXT_TRIGGER = new RegExp("^ */plugin", "i");


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

  private getPluginMetaData<P extends PluginBase>(plugin: P): PluginMetaData {
    const targetPluginMetaData = this.plugins.get(plugin); 
    if (!targetPluginMetaData) {
      throw new Error(`Plugin (${plugin.pluginName}) is not registered!`);
    }
    return targetPluginMetaData;
  }

  public enablePlugin<P extends PluginBase>(plugin: P): void {
    const targetPluginMetaData = this.getPluginMetaData(plugin);
    if (!targetPluginMetaData.enabled) targetPluginMetaData.enabled = true;
  }

  public disablePlugin<P extends PluginBase>(plugin: P): void {
    const targetPluginMetaData = this.getPluginMetaData(plugin);
    if (targetPluginMetaData.enabled) targetPluginMetaData.enabled = false;
  }

  /**
   * @param listEnabledOnly Default: `false`. `true`: only list enabled plugins; `false`: list all plugins
   * @returns A list of plugins
   */
  public listAllPlugins(listEnabledOnly: boolean = false): Array<PluginBase> {
    const pluginsList: Array<PluginBase> = [];
    for (const [plugin, pluginMetaData] of this.plugins) {
      if (!listEnabledOnly) pluginsList.push(plugin);
      else if (pluginMetaData.enabled) pluginsList.push(plugin);
    }
    return pluginsList;
  }

  private pluginListTextTemplate(pluginList: Array<PluginBase>): string {
    const title = "Plugin List 👇\n\n";

    const content = pluginList.map((plugin, index) => {
      const isPluginEnabled = this.getPluginMetaData(plugin).enabled;
      const pluginInfo = 
        `${index+1}. ${isPluginEnabled ? "[Enabled] ✅" : "[Disabled] ❌"}\n` +
        `• Name: ${plugin.pluginName}\n` +
        `• Version: ${plugin.pluginVersion}\n` +
        `• Description: ${plugin.pluginDescription}\n`;
      return pluginInfo;
    }).join("\n");

    return title + content;
  }

  /**
   * Authorize admin (current wechaty logged in user)
   */
  private async authorize(message: MessageInterface): Promise<void> {
    // Deny access from non-admin user. By default, current wechaty user is the admin.
    if (message.talker().name() !== message.wechaty.currentUser.name()) {
      await respond(message, "Permission denied. You are not an admin!");
      throw new UnauthorizedError("Unauthorized user for plugin manager");
    }
  }

  private async pluginManger(message: MessageInterface): Promise<void> {
    // Don't authorize contacts here
    // Authorize on specific operation (Read,Write)
    
    // Parsing
    // The command should look like this:
    // +--------------+------------------------------+
    //   command name        flag OR flag + value
    // +--------------+------------------------------+
    //      /plugin     --help, -l, --enable 1, -d 2
    // +--------------+------------------------------+
    const argV = commandLineParser(message.text());
    // Edge Cases
    const commandName = argV[0]?.value;
    if (argV.length === 0 || !commandName || !this.PLUGIN_MANAGER_TEXT_TRIGGER.test(commandName)) {
      throw new Error(`Error parsing the command: ${message.text()}`);
    }
    if (argV.length > 2) {
      const errorMsg = `[ERROR] Too many argument pairs. Expecting 1, got ${argV.length - 1}`;
      await respond(message, errorMsg + "\n" + "Enter /plugin -h for help");
      throw new InvalidCommandLineArgument(errorMsg);
    }
    const flag = argV[1]?.flag;
    if (!flag) {
      const errorMsg = "[ERROR] A flag must be provided!";
      await respond(message, errorMsg + "\n" + "Enter /plugin -h for help");
      throw new InvalidCommandLineArgument(errorMsg);
    }

    // Dispatch actions according to parsed flag
    // See this.PLUGIN_MANAGER_HELP_MESSAGE for available flags
    const value = argV[1]?.value;
    if (flag === "help" || flag === "h") {
      // Permission: Allow all contacts

      return await respond(message, this.PLUGIN_MANAGER_HELP_MESSAGE);

    } else if (flag === "list" || flag === "l") {
      // Permission: Allow all contacts

      const response = this.pluginListTextTemplate(this.listAllPlugins());
      return await respond(message, response);

    } else if (flag === "enable" || flag === "e" || flag === "disable" || flag === "d") {
      // Permission: Allow admin only
      await this.authorize(message);

      // flag argument validation
      if (!value) {
        const errorMsg = "[ERROR] Got empty argument. A number is required for this flag."
        await respond(message, errorMsg);
        throw new InvalidCommandLineArgument(errorMsg);
      }
      const pluginNum = parseInt(value);
      if (isNaN(pluginNum)) {
        const errorMsg = `[ERROR] Expecting a number for flag ${flag}, got ${value}`;
        await respond(message, errorMsg);
        throw new InvalidCommandLineArgument(errorMsg);
      }
      if (!(pluginNum >= 1 && pluginNum <= this.plugins.size)) {
        const errorMsg = `[ERROR] Expecting a plugin number from 1 to ${this.plugins.size}, got ${pluginNum}`;
        await respond(message, errorMsg);
        throw new InvalidCommandLineArgument(errorMsg);
      }

      // Get target plugin from its index (pluginNum = index + 1 in this.pluginListTextTemplate)
      const targetPlugin = Array.from(this.plugins.keys())[pluginNum - 1];
      const targetPluginMetaData = this.getPluginMetaData(targetPlugin);
      
      // enable/disable the target plugin
      if (["enable", "e"].includes(flag)) {
        if (targetPluginMetaData.enabled) {
          return await respond(message, `Plugin #${pluginNum} (${targetPlugin.pluginName}) is already enabled`);
        }
        targetPluginMetaData.enabled = true;
        return await respond(message, `[SUCCESS] Plugin #${pluginNum} (${targetPlugin.pluginName}) has been enabled`);
      } else if (["disable", "d"].includes(flag)) {
        if (!targetPluginMetaData.enabled) {
          return await respond(message, `Plugin #${pluginNum} (${targetPlugin.pluginName}) is already disabled`);
        }
        targetPluginMetaData.enabled = false;
        return await respond(message, `[SUCCESS] Plugin #${pluginNum} (${targetPlugin.pluginName}) has been disabled`);
      } else {
        throw new Error(`Unexpected flag ${flag}`);
      }

    } else {

      const errorMsg = `Invalid flag: ${flag}`;
      await respond(message, errorMsg + "\n" + "Enter /plugin -h for help");
      throw new InvalidCommandLineArgument(errorMsg);
    }
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
    if (!await this.checkMessageSource(message)) return;

    // Since message type checking and validator are not registered,
    // validate them manually here
    if (message.type() === MessageType.Text && 
        this.PLUGIN_MANAGER_TEXT_TRIGGER.test(message.text())
    ) {
      try {
        await this.pluginManger(message);
      } catch (error) {
        if (error instanceof UnauthorizedError || 
            error instanceof InvalidCommandLineArgument
        ) {
          // expected errors/behaviours
          logger.info(error);
        } else {
          // unexepected errors
          logger.error(error);
          await respond(message, "Something went wrong with the plugin manager. Please try again later.");
        }
      } finally {
        return;
      }
    }

    if (!this.checkMessageType(message)) return;

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
