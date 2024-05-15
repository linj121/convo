// Mock chat bot
const chatBot = {
  async say(message, talker) {
    // Simulate processing time with a random delay
    const delay = Math.random() * 2000;
    await new Promise((resolve) => setTimeout(resolve, delay));
    console.log(`${talker} said: "${message}"`);
  },
};

// Mock message event
async function onMessage(talker, message) {
  console.log(`Received message from ${talker}: "${message}"`);
  const chunks = [];
  while (message.length > 0) {
    chunks.push(message.slice(0, 5));
    message = message.slice(5);
  }
  for (const chunk of chunks) {
    await chatBot.say(chunk, talker);
  }
}

// Simulate multiple people sending messages at the same time
Promise.all([
  onMessage("Alice", "Hello from Alice. How are you?"),
  onMessage("Bob", "Hello from Bob. What's up?"),
  onMessage("Charlie", "Hello from Charlie. Nice to meet you."),
]);
