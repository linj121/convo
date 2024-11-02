import { errorMessageBuilder } from "./functions";

describe("errorMessageBuilder", () => {
  
  it("should return custom message and error message with stack and cause included", () => {
    const error = new Error("Test error message");
    error.stack = "Error: Test stack trace";
    error.cause = "Root cause of error";

    const result = errorMessageBuilder({
      error,
      customMessage: "Custom error message"
    });

    expect(result).toBe("Custom error message\nTest error message\nError: Test stack trace\nRoot cause of error");
  });

  it("should return custom message and error message without stack trace", () => {
    const error = new Error("Test error message");
    error.stack = "Error: Test stack trace";
    error.cause = "Root cause of error";

    const result = errorMessageBuilder({
      error,
      customMessage: "Custom error message",
      printStackTrace: false
    });
    expect(result).toBe("Custom error message\nTest error message\nRoot cause of error");
  });

  it("should return custom message and error message without cause", () => {
    const error = new Error("Test error message");
    error.stack = "Error: Test stack trace";
    error.cause = "Root cause of error";

    const result = errorMessageBuilder({
      error,
      customMessage: "Custom error message",
      printCause: false
    });

    expect(result).toBe("Custom error message\nTest error message\nError: Test stack trace");
  });

  it("should return custom message and error message with neither stack trace nor cause", () => {
    const error = new Error("Test error message");
    error.stack = "Error: Test stack trace";
    error.cause = "Root cause of error";

    const result = errorMessageBuilder({
      error,
      customMessage: "Custom error message",
      printStackTrace: false,
      printCause: false
    });
    expect(result).toBe("Custom error message\nTest error message");
  });

  it("should return 'unknown error' when error is not an instance of Error", () => {
    const result = errorMessageBuilder({
      error: "some string",
      customMessage: "Custom error message"
    });

    expect(result).toBe("Custom error message\nunknown error");
  });

  it("should handle an Error without stack or cause", () => {
    const error = new Error("Test error message");
    error.stack = "";
    error.cause = "";

    const result = errorMessageBuilder({
      error,
      customMessage: "Custom error message"
    });
    expect(result).toBe("Custom error message\nTest error message");
  });
});
