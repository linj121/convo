import { TaskSchema } from "./taskSchema";

jest.mock("node:fs", () => ({
  existsSync: jest.fn(),
}));

const { existsSync } = jest.requireMock("node:fs");

describe("TaskSchema Validation", () => {
  beforeEach(() => {
    existsSync.mockReset();
  });

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

    expect(() => TaskSchema.parse(task)).not.toThrow();
  });

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

    expect(() => TaskSchema.parse(task)).not.toThrow();
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

    expect(() => TaskSchema.parse(task)).toThrowErrorMatchingSnapshot();
    expect(existsSync).toHaveBeenCalledWith("/invalid/file/path");
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

    expect(() => TaskSchema.parse(task)).toThrowErrorMatchingSnapshot();
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

    expect(() => TaskSchema.parse(task)).not.toThrow();
  });

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

    expect(() => TaskSchema.parse(task)).toThrowErrorMatchingSnapshot();
  });

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

    expect(() => TaskSchema.parse(task)).toThrowErrorMatchingSnapshot();
  });

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

    expect(() => TaskSchema.parse(task)).not.toThrow();
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

    expect(() => TaskSchema.parse(task)).toThrowErrorMatchingSnapshot();
  });

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

    const parsedTask = TaskSchema.parse(task);
    expect(parsedTask.action.input).toStrictEqual({
      type: "default",
      content: "default"
    });
  });

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

    expect(() => TaskSchema.parse(task)).toThrowErrorMatchingSnapshot();
  });
});
