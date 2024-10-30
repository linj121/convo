import { TaskSchema } from "./taskSchema";

jest.mock("node:fs", () => ({
  existsSync: jest.fn(),
}));

const { existsSync } = jest.requireMock("node:fs");

describe("TaskSchema Validation", () => {
  beforeEach(() => {
    existsSync.mockReset();
  });

  describe("Timezone Validation", () => {
    test("should validate a correct timezone successfully", () => {
      const task = {
        name: "task one",
        target: {
          type: "contact",
          name: "satayking",
        },
        cronTime: "* * * * * *",
        timeZone: "Pacific/Fiji",
        action: {
          template: "CustomMessage",
          input: {
            type: "text",
            content: {
              text: "This is a text"
            },
          },
        },
      };
      const result = TaskSchema.safeParse(task);
      expect(result.success).toBe(true);
    });

    test("should accept an undefined timezone value", () => {
      const task = {
        name: "task one",
        target: {
          type: "contact",
          name: "satayking",
        },
        cronTime: "* * * * * *",
        action: {
          template: "CustomMessage",
          input: {
            type: "text",
            content: {
              text: "This is a text"
            },
          },
        },
      };
      const result = TaskSchema.safeParse(task);
      expect(result.success).toBe(true);
    });

    test("should throw an error with invalid timezone (empty string)", () => {
      const task = {
        name: "task one",
        target: {
          type: "contact",
          name: "satayking",
        },
        cronTime: "* * * * * *",
        timeZone: "",
        action: {
          template: "CustomMessage",
          input: {
            type: "text",
            content: {
              text: "This is a text"
            },
          },
        },
      };
      const result = TaskSchema.safeParse(task);
      expect(result.success).toBe(false);
      expect(result.error?.format().timeZone?._errors[0]).toBe("Invalid timezone. Use timezone from the tz database.");
    });

    test("should throw an error with invalid timezone (not in tz database)", () => {
      const task = {
        name: "task one",
        target: {
          type: "contact",
          name: "satayking",
        },
        cronTime: "* * * * * *",
        timeZone: "Invalid/Timezone",
        action: {
          template: "CustomMessage",
          input: {
            type: "text",
            content: {
              text: "This is a text"
            },
          },
        },
      };
      const result = TaskSchema.safeParse(task);
      expect(result.success).toBe(false);
      expect(result.error?.format().timeZone?._errors[0]).toBe("Invalid timezone. Use timezone from the tz database.");
    });
  });

  describe("Text Content Validation", () => {
    test("should validate a task with text content successfully", () => {
      const task = {
        name: "task one",
        target: {
          type: "contact",
          name: "satayking",
        },
        cronTime: "* * * * * *",
        action: {
          template: "CustomMessage",
          input: {
            type: "text",
            content: {
              text: "This is a text"
            },
          },
        },
      };

      const result = TaskSchema.safeParse(task);
      expect(result.success).toBe(true);
    });
  });

  describe("File Path and URL Validation", () => {
    test("should validate a task with valid file path content", () => {
      const task = {
        name: "task two",
        target: {
          type: "room",
          name: "BS Matters",
        },
        cronTime: new Date(),
        action: {
          template: "CustomMessage",
          input: {
            type: "image",
            content: {
              location: "/valid/file/path"
            },
          },
        },
      };

      existsSync.mockReturnValue(true);

      const result = TaskSchema.safeParse(task);
      expect(result.success).toBe(true);
      expect(existsSync).toHaveBeenCalledWith("/valid/file/path");
    });

    test("should fail validation for a task with invalid file path", () => {
      const task = {
        name: "task three",
        target: {
          type: "room",
          name: "BS Matters",
        },
        cronTime: "*/2 * * * * *",
        action: {
          template: "CustomMessage",
          input: {
            type: "image",
            content: {
              location: "/invalid/file/path"
            },
          },
        },
      };

      existsSync.mockReturnValue(false);

      const result = TaskSchema.safeParse(task);
      expect(result.success).toBe(false);
      expect(existsSync).toHaveBeenCalledWith("/invalid/file/path");

      // NOTE: This is a work around, for deeply nested union types, zod does not provide the correct type
      const errorMessage = result.error?.issues.find(
        (issue) => issue.path.join('.') === "action.input.content.location"
      )?.message;
    
      expect(errorMessage).toBe("Must be a valid URL or an accessible file path");
    });

    test("should fail validation for a task with invalid URL", () => {
      const task = {
        name: "task four",
        target: {
          type: "room",
          name: "BS Matters",
        },
        cronTime: "*/2 * * * * *",
        action: {
          template: "CustomMessage",
          input: {
            type: "image",
            content: {
              location: "invalid-url"
            },
          },
        },
      };

      existsSync.mockReturnValue(false);

      const result = TaskSchema.safeParse(task);
      expect(result.success).toBe(false);

      // NOTE: This is a work around, for deeply nested union types, zod does not provide the correct type
      const errorMessage = result.error?.issues.find(
        (issue) => issue.path.join('.') === "action.input.content.location"
      )?.message;
          
      expect(errorMessage).toBe("Must be a valid URL or an accessible file path");
    });

    test("should validate a task with valid URL content", () => {
      const task = {
        name: "task five",
        target: {
          type: "room",
          name: "BS Matters",
        },
        cronTime: "*/2 * * * * *",
        action: {
          template: "CustomMessage",
          input: {
            type: "image",
            content: { 
              location: "https://example.com/image.jpg"
            },
          },
        },
      };

      const result = TaskSchema.safeParse(task);
      expect(result.success).toBe(true);
    });
  });

  describe("Task Name Validation", () => {
    test("should fail validation for a task with empty name", () => {
      const task = {
        name: "",
        target: {
          type: "contact",
          name: "satayking",
        },
        cronTime: "* * * * * *",
        action: {
          template: "CustomMessage",
          input: {
            type: "text",
            content: {
              text: "Hello"
            },
          },
        },
      };

      const result = TaskSchema.safeParse(task);
      expect(result.success).toBe(false);
      expect(result.error?.format().name?._errors[0]).toBe("Name of the task cannot be empty.");
    });
  });

  describe("Target Type Validation", () => {
    test("should fail validation for a task with invalid target type", () => {
      const task = {
        name: "task six",
        target: {
          type: "invalidType",
          name: "satayking",
        },
        cronTime: "* * * * * *",
        action: {
          template: "CustomMessage",
          input: {
            type: "text",
            content: {
              text: "Hello"
            },
          },
        },
      };

      const result = TaskSchema.safeParse(task);
      expect(result.success).toBe(false);
      expect(result.error?.format().target?.type?._errors[0]).toBe("Invalid enum value. Expected 'contact' | 'room', received 'invalidType'");
    });
  });

  describe("Weather Action Validation", () => {
    test("should validate a Weather action task successfully", () => {
      const task = {
        name: "weather task",
        target: {
          type: "contact",
          name: "weatherUser",
        },
        cronTime: "0 9 * * *",
        action: {
          template: "Weather",
          input: {
            content: ["New York", "London"]
          }
        },
      };

      const result = TaskSchema.safeParse(task);
      expect(result.success).toBe(true);
    });

    test("should fail validation for Weather action with empty location array", () => {
      const task = {
        name: "invalid weather task",
        target: {
          type: "contact",
          name: "weatherUser",
        },
        cronTime: "0 9 * * *",
        action: {
          template: "Weather",
          input: { content: [] },
        },
      };

      const result = TaskSchema.safeParse(task);
      expect(result.success).toBe(false);
      expect(result.error?.format().action?.input?.content?._errors[0]).toBe("Location array cannot be empty");
    });
  });

  describe("News Action Validation", () => {
    test("should validate a News action task with default input", () => {
      const task = {
        name: "news task",
        target: {
          type: "contact",
          name: "newsUser",
        },
        cronTime: "0 8 * * *",
        action: {
          template: "News",
          // input is optional and should default to 'default'
        },
      };

      const result = TaskSchema.safeParse(task);
      expect(result.success).toBe(true);
      expect(result.data?.action.input).toStrictEqual({
        type: "default",
        content: "default"
      });
    });
  });

  describe("Action Template Validation", () => {
    test("should fail validation for an unknown action template", () => {
      const task = {
        name: "invalid action task",
        target: {
          type: "contact",
          name: "user",
        },
        cronTime: "* * * * *",
        action: {
          template: "UnknownTemplate",
          input: {},
        },
      };

      const result = TaskSchema.safeParse(task);
      expect(result.success).toBe(false);
      expect(result.error?.format().action?.template?._errors[0]).toBe("Invalid discriminator value. Expected 'CustomMessage' | 'Weather' | 'News'");
    });
  });
});
