import { config } from "@config";
import OpenAIClient from "./index";

const test1 = async () => {
  const llmClient = await OpenAIClient.init({
    assistantCreateOption: {
      name: "Math Tutor",
      instructions: "You are a personal math tutor. Write and run code to answer math questions.",
      tools: [{ type: "code_interpreter" }],
      model: config.OPENAI_MODEL,
    },
  });

  const owner = "allen";
  await llmClient.createMessage("What is (sin(10))^2 + (cos(10))^2 ?", owner);
  await llmClient.getResponseStream(owner);
};

const test2 = async () => {
  const llmClient = await OpenAIClient.init({
    assistantCreateOption: {
      name: "Personal assistant",
      instructions: "You are a personal assistant. Answer any general questions.",
      tools: [{ type: "code_interpreter" }],
      model: config.OPENAI_MODEL,
    },
  });

  const owner = "josh";
  await llmClient.createMessage("Hi, my name is josh", owner);
  console.log(await llmClient.getResponse(owner));

  await llmClient.createMessage("Do you still remember my name?", "allen");
  console.log(await llmClient.getResponse("allen"));

  await llmClient.createMessage("What is 1 + 1?", owner);
  console.log(await llmClient.getResponse(owner));

  await llmClient.createMessage("Do you still remember my name?", owner);
  console.log(await llmClient.getResponse(owner));
};

test1();
test2();

