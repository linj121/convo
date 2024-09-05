import init from "init";
import { getLlmClients } from "@services/assistant/init";
// import LlmRepository from "@data/llm.repository";

async function before() {
  await init();
}

async function clean(assistant_name: string, owner: string) {
  // LlmRepository.database.exec(`DELETE FROM assistant WHERE name = '${assistant_name}'`);
  // LlmRepository.database.exec(`DELETE FROM thread WHERE owner = '${owner}'`);
}

async function test() {
  await before();

  const llmClients = getLlmClients(); 

  const owner = "_test_owner_01";

  for (const [name, client] of Object.entries(llmClients)) {
    if (!llmClients.hasOwnProperty(name)) continue;
    console.log(`Got client: ${client.assistant_name}`);

    const thread_owner = name + owner;

    {
      const message = "Hi, my name is Josh";
      const thread_id = await client.createMessage(message, thread_owner);
      console.log("you >> " + message);
  
      const response = await client.getResponse(thread_owner, thread_id);
      console.log("llm >> " + response);
    }

    {
      const message = "Do you still remember my name?";
      const thread_id = await client.createMessage(message, thread_owner);
      console.log("you >> " + message);
      
      const response = await client.getResponse(thread_owner, thread_id);
      console.log("llm >> " + response);
    }

    await clean(name, thread_owner);
  }


}

test();