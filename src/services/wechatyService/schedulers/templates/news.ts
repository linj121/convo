import { OnTickMessageProducer } from "@services/wechatyService/types";

const newsProducer: OnTickMessageProducer<null, "News"> = async function (args) {
  // TODO: call an API
  const topic = args.action.input.content;
  const query = topic.replace(/ +/gm, "+");
  return `Here are some news for "${topic}": https://www.google.com/search?q=${query}`;
};

export default newsProducer;