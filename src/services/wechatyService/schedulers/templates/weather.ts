import { OnTickMessageProducer } from "@services/wechatyService/types";

const weatherProducer: OnTickMessageProducer<null, "Weather"> = async function (args) {
  // TODO: call an API
  const cities = args.action.input.cities.join(",");
  const query = cities.replace(",", " ").replace(/ +/gm, "+");
  const isSingular: boolean = args.action.input.cities.length === 1; 
  return `Here ${isSingular ? "is the weather" : "are the weathers" } for ${cities}: ` + 
         `https://www.google.com/search?q=weather+for+${query}`;
};

export default weatherProducer;