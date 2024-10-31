import { existsSync } from "node:fs";
import { z } from "zod";
import { isValidTimeZone } from "@utils/functions";
 

const timezoneSchema = z.string().refine((val) => isValidTimeZone(val), {
  message: "Invalid timezone. Use timezone from the tz database.",
}).optional();

const CustomMessageActionSchema = z.object({
  template: z.literal("CustomMessage"),
  input: z.discriminatedUnion("type", [
    z.object({
      type: z.literal("text"),
      text: z.string().min(1, "Text message cannot be empty."),
    }),
    z.object({
      type: z.enum(["image", "audio", "video"]),
      location: z.string().refine((val) => {
            return z.string().url().safeParse(val).success || existsSync(val);
          },
          { message: "Must be a valid URL or an accessible file path" }
        ),
      filename: z.string().optional(),
    })
  ]),
});

const WeatherActionSchema = z.object({
  template: z.literal("Weather"),
  input: z.object({
    type: z.literal("default").optional().default("default"),
    cities: z.array(
      z.string().min(1, "City name cannot be empty")
    ).min(1, "Cities array cannot be empty"),
  })
});

const NewsActionSchema = z.object({
  template: z.literal("News"),
  input: z.object({
    type: z.literal("default").optional().default("default"),
    topic: z.string().optional().default("default"),
  }).optional().default({
    type: "default",
    topic: "default"
  })
});

const ActionSchema = z.discriminatedUnion('template', [
  CustomMessageActionSchema,
  WeatherActionSchema,
  NewsActionSchema,
]);

const TaskSchema = z.object({
  name: 
    z.string().min(1, "Name of the task cannot be empty."),
  target: 
    z.object({
      type: z.enum(["contact", "room"]),
      name: z.string().min(1, "Target name cannot be empty. Specify a contact or room."),
    }),
  cronTime: 
    z.union([
      z.string().min(1, "cronTime cannot not be empty."),
      z.date()
    ]),
  timeZone: timezoneSchema,
  action: 
    ActionSchema,
  enabled: 
    z.boolean().optional().default(true),
});

// https://github.com/colinhacks/zod/issues/2491
type TaskInput = z.input<typeof TaskSchema>;
type Task = z.output<typeof TaskSchema>;


export {
  TaskSchema,
  TaskInput,
  Task
};