import { validateTasksInput, taskInputExamples } from "./taskExamples";

describe("Task examples", () => {
  test("should be validated successfully", () => {
    expect(() => {
      validateTasksInput(taskInputExamples);
    }).not.toThrow();
  });
});