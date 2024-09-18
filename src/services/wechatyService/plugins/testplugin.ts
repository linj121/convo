import logger from "@logger";
import { MessageType } from "../types";
import PluginBase from "./pluginBase";
import { MessageInterface } from "wechaty/impls";
import { respond } from "@utils/wechatyUtils";


class TestPlugin extends PluginBase {
  public pluginName: string = "Test Plugin";
  public pluginVersion: string = "v0.0.1";
  public pluginDescription: string = "A test plugin. Send /test to test it.";

  public validators: Map<MessageType, (message: MessageInterface) => (Promise<boolean> | boolean)>;

  private readonly textValidatorRegex = new RegExp("^ */test", "i");

  constructor() {
    super();
    this.validators = new Map([
      [MessageType.Text, this.validator],
      [MessageType.Image, () => false],
      [MessageType.Attachment, () => false],
    ]);
  }

  private validator(msg: MessageInterface) {
    return this.textValidatorRegex.test(msg.text());
  }

  public async pluginHandler(message: MessageInterface): Promise<any> {
    logger.info("Running test plugin!");

    switch (message.type()) {
      case MessageType.Text:
        respond(message, "妈妈生的");
        break;
      case MessageType.Image:
        respond(message, "爸爸生的");
        break;
      case MessageType.Attachment:
        throw new Error("Testing error hanlding for test plugin");
      default:
        break;
    }
  }
}

export default TestPlugin;