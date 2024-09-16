import { MessageInterface } from "wechaty/impls";
import { MessageType } from "../types";
import PluginRegistry from "./pluginRegistry";


abstract class PluginBase {
  abstract pluginName: string;
  abstract pluginVersion: string;
  abstract pluginDescription: string;

  abstract validators: Map<MessageType, (message: MessageInterface) => (Promise<boolean> | boolean)>;

  public addSelfToRegistry() {
    PluginRegistry.getInstance().register(this);
  }

  abstract pluginHandler(message: MessageInterface): Promise<any>;
}


export default PluginBase;