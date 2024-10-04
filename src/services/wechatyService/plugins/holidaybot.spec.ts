import { Message } from 'wechaty';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { MessageType } from "../types";

// Mock the wechatyUtil.respond function
jest.mock('@utils/wechatyUtils', () => ({
  respond: jest.fn(),
}));

jest.mock('node:path', () => {
  const originalPath = jest.requireActual('node:path');
  const tempFilePath = originalPath.join(__dirname, 'happy_mid_autumn_festival.jpg');
  fs.writeFileSync(tempFilePath, '');
  return {
    ...originalPath,
    normalize: jest.fn().mockReturnValue(tempFilePath),
  };
});

import HolidayBot, { HolidayConfig, Holiday } from "./holidaybot";

describe('HolidayBot', () => {
  let bot: HolidayBot;

  beforeEach(() => {
    jest.clearAllMocks();
    bot = new HolidayBot();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  afterAll(() => {
    const tempFilePath = path.join(__dirname, 'happy_mid_autumn_festival.jpg');
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  });

  describe('isWithinHolidayPeriod', () => {
    const testHoliday: HolidayConfig = {
      name: Holiday.MID_AUTUMN,
      keywords: ['中秋', '快乐'],
      image: 'happy_mid_autumn_festival.jpg',
      period: {
        start: new Date('2024-09-15'),
        span: 1,
      },
    };

    it('should return true if today is exactly the start date', () => {
      jest.setSystemTime(new Date('2024-09-15')); // Mock today's date
      expect(bot['isWithinHolidayPeriod'](testHoliday)).toBe(true);
    });

    it('should return true if today is within the holiday tolerance before start date (-2 days)', () => {
      jest.setSystemTime(new Date('2024-09-13')); // 2 days before the start date
      expect(bot['isWithinHolidayPeriod'](testHoliday)).toBe(true);
    });

    it('should return true if today is within the holiday tolerance after the start date (+2 days)', () => {
      jest.setSystemTime(new Date('2024-09-17')); // 2 days after the holiday
      expect(bot['isWithinHolidayPeriod'](testHoliday)).toBe(true);
    });

    it('should return false if today is before the holiday tolerance period', () => {
      jest.setSystemTime(new Date('2024-09-10')); // Well before the holiday tolerance
      expect(bot['isWithinHolidayPeriod'](testHoliday)).toBe(false);
    });

    it('should return false if today is after the holiday tolerance period', () => {
      jest.setSystemTime(new Date('2024-09-20')); // Well after the holiday tolerance
      expect(bot['isWithinHolidayPeriod'](testHoliday)).toBe(false);
    });

    it('should handle holidays with a span of multiple days', () => {
      const multiDayHoliday: HolidayConfig = {
        name: Holiday.CHRISTMAS,
        keywords: ['Test', 'Holiday'],
        image: 'test_holiday.jpg',
        period: {
          start: new Date('2024-10-01'),
          span: 3, // 3-day holiday
        },
      };

      jest.setSystemTime(new Date('2024-10-02')); // Inside the multi-day holiday
      expect(bot['isWithinHolidayPeriod'](multiDayHoliday)).toBe(true);

      jest.setSystemTime(new Date('2024-10-04')); // Last day of the holiday
      expect(bot['isWithinHolidayPeriod'](multiDayHoliday)).toBe(true);

      jest.setSystemTime(new Date('2024-10-06')); // 2 days after the end date
      expect(bot['isWithinHolidayPeriod'](multiDayHoliday)).toBe(true);

      jest.setSystemTime(new Date('2024-10-07')); // 3 days after the holiday ends
      expect(bot['isWithinHolidayPeriod'](multiDayHoliday)).toBe(false);
    });
  });

  describe('textMessageValidator', () => {
    it('should validate a message containing valid holiday keywords', () => {
      const messageStub = { text: jest.fn().mockReturnValue('中秋快乐！') } as any as Message;
      const isValid = bot.validators.get(MessageType.Text)?.(messageStub);
      expect(isValid).toBe(true);
    });

    it('should invalidate a message that does not contain holiday keywords', () => {
      const messageStub = { text: jest.fn().mockReturnValue('Hello!') } as any as Message;
      const isValid = bot.validators.get(MessageType.Text)?.(messageStub);
      expect(isValid).toBe(false);
    });
  });

  describe('pluginHandler', () => {
    it('should respond with a picture if the message is valid and within the holiday period', async () => {
      const messageStub = { type: jest.fn().mockReturnValue(MessageType.Text), text: jest.fn().mockReturnValue('中秋快乐！') } as any as Message;

      jest.setSystemTime(new Date('2024-09-15')); // On the Mid-Autumn holiday
      const respondMock = require('@utils/wechatyUtils').respond;

      await bot.pluginHandler(messageStub);

      expect(path.normalize).toHaveBeenCalledWith(expect.stringContaining('happy_mid_autumn_festival.png'));
      expect(respondMock).toHaveBeenCalled();
    });

    it('should not respond if the message is valid but outside the holiday period', async () => {
      const messageStub = { type: jest.fn().mockReturnValue(MessageType.Text), text: jest.fn().mockReturnValue('中秋快乐！') } as any as Message;

      jest.setSystemTime(new Date('2024-10-01')); // Well after the Mid-Autumn holiday

      const respondMock = require('@utils/wechatyUtils').respond;

      await bot.pluginHandler(messageStub);

      expect(respondMock).not.toHaveBeenCalled();
    });

    it('should not respond if the message does not contain valid holiday keywords', async () => {
      const messageStub = { type: jest.fn().mockReturnValue(MessageType.Text), text: jest.fn().mockReturnValue('Hello!') } as any as Message;

      jest.setSystemTime(new Date('2024-09-15')); // On the Mid-Autumn holiday

      const respondMock = require('@utils/wechatyUtils').respond;

      await bot.pluginHandler(messageStub);

      expect(respondMock).not.toHaveBeenCalled();
    });
  });
});
