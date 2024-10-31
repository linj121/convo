import { 
  TaskSchema, 
  type TaskInput, 
  type Task, 
} from "./taskSchema";

const taskInputExamples: TaskInput[] = [
  {
    name: "text msg test",
    target: {
      type: "room",
      name: "罗伯特",
    },
    cronTime: "*/10 * * * * *",
    action: {
      template: "CustomMessage",
      input: {
        type: "text",
        text: "This is a test :)"
      },
    },
    enabled: false,
  },
  {
    name: "image test",
    target: {
      type: "room",
      name: "罗伯特",
    },
    cronTime: "*/5 * * * * *",
    action: {
      template: "CustomMessage",
      input: {
        type: "image",
        location: "https://dummyimage.com/100x100/ff00ee/000000.png&text=testing",
        filename: "test.png"
      },
    },
    enabled: false,
  },
  {
    name: "audio test",
    target: {
      type: "room",
      name: "罗伯特",
    },
    cronTime: "*/15 * * * * *",
    action: {
      template: "CustomMessage",
      input: {
        type: "audio",
        location: "https://download.samplelib.com/mp3/sample-3s.mp3",
      },
    },
    enabled: false,
  },
  {
    name: "video test",
    target: {
      type: "room",
      name: "罗伯特",
    },
    cronTime: "*/10 * * * * *",
    action: {
      template: "CustomMessage",
      input: {
        type: "video",
        location: "https://www.w3schools.com/tags/mov_bbb.mp4",
      },
    },
    enabled: true,
  },
  {
    name: "news test",
    target: {
      type: "room",
      name: "罗伯特",
    },
    cronTime: "*/30 * * * * *",
    action: {
      template: "News",
      input: {
        topic: "Donald Trump"
      }
    },
    enabled: true,
  },
  {
    name: "weather test",
    target: {
      type: "room",
      name: "罗伯特",
    },
    cronTime: "*/35 * * * * *",
    action: {
      template: "Weather",
      input: { 
        cities: ["Toronto", "New York"]
      }
    },
    enabled: true,
  }
];

/**
 * 
 * @param taskInputs An array of tasks to be parsed and validated
 * @returns An array of validated tasks
 * @throws An error that shows all invalid inputs
 */
function validateTasksInput(taskInputs: TaskInput[]): Task[] {
  const validatedTasks: Task[] = [];
  const invalidTasks: Array<[TaskInput, string]> = [];

  for (const taskInput of taskInputs) {
    const result = TaskSchema.safeParse(taskInput);
    if (!result.error) {
      validatedTasks.push(result.data);
    } else {
      invalidTasks.push([taskInput, result.error.toString()]);
    }
  }

  if (invalidTasks.length > 0) {
    const errorMsg: string = 
      "The following task input(s) are invalid: \n" +
      invalidTasks.map(entry => {
        const [task, zodError] = entry;
        return JSON.stringify(task) + "\nZod Error: \n" + zodError;
      }).join("\n===================\n");
    throw new Error(errorMsg);
  }

  return validatedTasks;
}

const taskExamples: Task[] = validateTasksInput(taskInputExamples);

export default taskExamples;
export {
  taskInputExamples,
  validateTasksInput,
};