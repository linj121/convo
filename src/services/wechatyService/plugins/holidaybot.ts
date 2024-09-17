import { Message } from "wechaty";
import { MessageType } from "../types";
import PluginBase from "./pluginBase";
import { FileBox } from "file-box";
import { respond } from "@utils/wechatyUtils";
import logger from "@logger";
import path from "node:path";


class HolidayBot extends PluginBase {
  public pluginName: string = "Holiday Bot";
  public pluginVersion: string = "v0.0.1";
  public pluginDescription: string = "Let's celebrate!";

  public validators: Map<MessageType, (message: Message) => (Promise<boolean> | boolean)>;

  private readonly messageValidatorRegExp = {
    [MessageType.Text]: new RegExp("^.*中秋.*快乐"),
  };

  public constructor() {
    super();
    this.validators = new Map([
      [MessageType.Text, this.textMessageValidator],
    ]);
  }

  private textMessageValidator(message: Message): boolean {
    return this.messageValidatorRegExp[MessageType.Text].test(message.text());
  }

  public async pluginHandler(message: Message): Promise<void> {
    if (message.type() !== MessageType.Text) return;

    try {
      const filepath = path.normalize(`${__dirname}/../../../../assets/images/happy_mid_autumn_festival.jpg`);
      logger.debug(`filepath: ${filepath}`);
      const picture = FileBox.fromFile(filepath);
      respond(message, picture);
    } catch (error) {
      throw new Error("Failed to send pic", { cause: error });      
    }

  }
}

export default HolidayBot;