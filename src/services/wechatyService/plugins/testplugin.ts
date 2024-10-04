import logger from "@logger";
import { MessageType } from "../types";
import PluginBase from "./pluginBase";
import { MessageInterface } from "wechaty/impls";
import { respond } from "@utils/wechatyUtils";


class TestPlugin extends PluginBase {
  public pluginName: string = "Test Plugin";
  public pluginVersion: string = "v0.0.1";
  public pluginDescription: string = "A test plugin. Send /ping to test it.";

  public validators: Map<MessageType, (message: MessageInterface) => (Promise<boolean> | boolean)>;

  private readonly textValidatorRegex = new RegExp("^ */ping", "i");

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
        respond(message, "pong!");
        break;
      case MessageType.Image:
        respond(message, "Got an image");
        break;
      case MessageType.Attachment:
        throw new Error("Testing error hanlding for test plugin");
      default:
        break;
    }
  }
}

export default TestPlugin;