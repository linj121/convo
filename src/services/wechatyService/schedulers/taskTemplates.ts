import { FileBox } from "file-box";
import type { 
  OnTickMessageProducer, 
  TemplateMappings
} from "../types";

import { readFile } from "node:fs/promises";
import { basename } from "node:path";

function isValidUrl(str: string): boolean {
  let isUrl = false;
  try {
    const parsedUrl = new URL(str);
    isUrl = parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
  } catch (err) {
    isUrl = false;
  }
  return isUrl;
}

async function fetchResource(urlOrPath: string): Promise<Buffer> {
  const isUrl = isValidUrl(urlOrPath);

  // Process filepath
  if (!isUrl) {
    try {
      return await readFile(urlOrPath);
    } catch (error) {
      throw new Error(`Failed to read file at ${urlOrPath}`, { cause: error });      
    }
  }

  // Process url
  const response = await fetch(urlOrPath);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${urlOrPath}: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

function getFilenameFromUrlOrPath(urlOrPath: string): string {
  const isUrl = isValidUrl(urlOrPath);

  if (isUrl) {
    const parsedUrl = new URL(urlOrPath);
    return basename(parsedUrl.pathname);
  }

  return basename(urlOrPath);
}

const customMessageProducer: OnTickMessageProducer<null, "CustomMessage"> = async function (args) {
  if (args.action.template !== "CustomMessage") 
    throw new Error(`Expected template CustomMessage, got ${args.action.template}`);

  const input = args.action.input;

  if (input.type === "text") {

    return input.content.text;

  } else if (["audio", "image", "video"].includes(input.type)) {

    const resourceBuffer = await fetchResource(input.content.location); // TODO: Cache large files and frequent requests

    const filename = input.content.filename ?? getFilenameFromUrlOrPath(input.content.location); // TODO: get filename during pre-processing

    return FileBox.fromBuffer(resourceBuffer, filename);

  } else {
    throw new Error(`Invalid input type ${input.type}`);
  }
};

const newsProducer: OnTickMessageProducer<null, "News"> = async function (args) {
  // TODO:
  
  return "";
};

const weatherProducer: OnTickMessageProducer<null, "Weather"> = async function (args) {
  // TODO:

  return "";
};

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