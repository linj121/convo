import { Message } from "wechaty";
import { MessageType } from "../types";
import PluginBase from "./pluginBase";
import { FileBox } from "file-box";
import { respond } from "@utils/wechatyUtils";
import path from "node:path";


class HolidayBot extends PluginBase {
  public pluginName: string = "Holiday Bot";
  public pluginVersion: string = "v0.0.1";
  public pluginDescription: string = "发送带有“中秋”和“快乐”的消息来获得祝福";

  public validators: Map<MessageType, (message: Message) => (Promise<boolean> | boolean)>;

  private readonly messageValidatorRegExp = {
    [MessageType.Text]: new RegExp("^(?!.*description).*中秋.*快乐", "i"),
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
      const picture = FileBox.fromFile(filepath);
      respond(message, picture);
    } catch (error) {
      throw new Error("Failed to send pic", { cause: error });      
    }

  }
}

export default HolidayBot;