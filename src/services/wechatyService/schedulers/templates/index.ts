import { TemplateMappings } from "@services/wechatyService/types";
import customMessageProducer from "./customMessage";
import newsProducer from "./news";
import weatherProducer from "./weather";

type TemplateContextMap = {
  CustomMessage: null;
  Weather: null;
  News: null;
}

const templateMappings: TemplateMappings = {
  CustomMessage: {
    messageProducer: customMessageProducer,
    otherArgs: null,
    context: null
  },
  News: {
    messageProducer: newsProducer,
    otherArgs: null,
    context: null
  },
  Weather: { 
    messageProducer: weatherProducer,
    otherArgs: null,
    context: null
  },
};

export default templateMappings;
export {
  TemplateContextMap,
};