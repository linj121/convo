import { Message } from "wechaty";
import { MessageType } from "../types";
import PluginBase from "./pluginBase";
import { FileBox } from "file-box";
import { respond } from "@utils/wechatyUtils";
import path from "node:path";


enum Holiday {
  MID_AUTUMN = "Mid-Autumn",
  CHRISTMAS = "Christmas",
  NEW_YEAR = "New Year"
}

type HolidayConfig = {
  name: Holiday,
  keywords: Array<string>,
  image: string,
  period: {
    start: Date,   // Use month and day for recurrence
    span: number   // Number of days the holiday lasts. Usually it's 1.
  }
}

class HolidayBot extends PluginBase {
  public pluginName: string = "Holiday Bot";
  public pluginVersion: string = "v0.3.0";
  public pluginDescription: string = 
    "Send a message with a holiday greeting to receive blessings. ";

  public validators: Map<MessageType, (message: Message) => (Promise<boolean> | boolean)>;

  private readonly holidays: HolidayConfig[] = [
    {
      name: Holiday.MID_AUTUMN,
      keywords: ["中秋", "快乐"],
      image: "happy_mid_autumn_festival.png",
      period: {
        start: new Date("2024-09-17"),
        span: 1
      }
    },
    {
      name: Holiday.CHRISTMAS,
      keywords: ["Merry", "Christmas"],
      image: "merry_christmas.jpg",
      period: {
        start: new Date("2024-12-25"),
        span: 1
      }
    },
    {
      name: Holiday.NEW_YEAR,
      keywords: ["Happy", "New", "Year"],
      image: "happy_new_year.jpg",
      period: {
        start: new Date("2024-01-01"),
        span: 1
      }
    }
  ];

  
  // adjusted holiday period
  // [start - tolerance, start + (span - 1) + tolerance]
  private readonly HOLIDAY_PERIOD_TOLERANCE: number = 3;

  private readonly messageValidatorRegExp: { [key: string]: RegExp } = {};

  public constructor() {
    super();

    this.pluginDescription += 
      "Supported holidays: \n" +
      this.holidays.map(holiday => 
        ` 📅 ${holiday.name}\n` +
        ` -> Keywords: ${holiday.keywords.join(" ")}`
      ).join("\n");
    
    // Regex Fuzzy Match
    this.holidays.forEach(holiday => {
      this.messageValidatorRegExp[holiday.name] = new RegExp(
        `^(?!.*description).*${holiday.keywords.join(".*")}`,
        "i"
      );
    });

    this.validators = new Map([
      [MessageType.Text, this.textMessageValidator],
    ]);
  }

  private textMessageValidator = (message: Message): boolean => {
    return Object.values(this.messageValidatorRegExp).some((regexp) =>
      regexp.test(message.text())
    );
  };

  private isWithinHolidayPeriod(holiday: HolidayConfig): boolean {
    const today = new Date();
    const todayMonth = today.getMonth();
    const todayDate = today.getDate();

    // Holidays recurs based on month and day
    const startMonth = holiday.period.start.getMonth();
    const startDate = holiday.period.start.getDate();

    const holidayStart = new Date(today.getFullYear(), startMonth, startDate);
    const holidayEnd = new Date(holidayStart);
    // If a holiday only lasts for 1 day, +0. eg. Christmas with a span of 1 day => Dec 15 to Dec 15
    holidayEnd.setDate(holidayEnd.getDate() + holiday.period.span - 1);

    const adjustedStart = new Date(holidayStart);
    adjustedStart.setDate(adjustedStart.getDate() - this.HOLIDAY_PERIOD_TOLERANCE);
    const adjustedEnd = new Date(holidayEnd);
    adjustedEnd.setDate(adjustedEnd.getDate() + this.HOLIDAY_PERIOD_TOLERANCE);

    const todayWithYear = new Date(today.getFullYear(), todayMonth, todayDate);
    return adjustedStart <= todayWithYear && todayWithYear <= adjustedEnd;
  }

  public async pluginHandler(message: Message): Promise<void> {
    if (message.type() !== MessageType.Text) return;

    const matchedHoliday = this.holidays.find(holiday =>
      this.messageValidatorRegExp[holiday.name].test(message.text()) &&
      this.isWithinHolidayPeriod(holiday)
    );
    if (!matchedHoliday) return;
    
    const filepath = path.normalize(`${__dirname}/../../../../assets/images/${matchedHoliday.image}`);
    const picture = FileBox.fromFile(filepath);
    respond(message, picture);
  }
}

export default HolidayBot;
export {
  Holiday,
  HolidayConfig,
}
