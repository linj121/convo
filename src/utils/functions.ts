/**
 * NOTE: this function only guarantees the control will yield 
 * back to the caller at least after ms milliseconds
 * @param ms number of milliseconds to sleep
 * @returns A promise that resolves after ms milliseconds
 */
function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Delete part of a string given a range of index
 * @param str the original string
 * @param start start position (inclusive) of the range to be deleted
 * @param end end position (exclusive) of the range to be deleted
 * @returns 
 */
function deletePartofString(str: string, start: number, end: number): string {
  if (!(0 <= start && start < end && end <= str.length)) {
    throw new Error("Invalid start or end positions");
  }
  if (str === "") {
    return "";
  }
  return str.slice(0, start) + str.slice(end);
}

type ArgPair = {
  flag: string, 
  value: string
};
type ArgV = Array<Partial<ArgPair>>;

const _commandLineParserRegExp =
  new RegExp(' *(?:-+([^= \\\'\\"]+)(?:=| +)?)?(?:([\\\'\\"])([^\\2]+?)\\2|([^- \\"\\\']+))?', 'gm');
/**
 * Parse command line arguments from a raw string
 * https://regexlib.com/REDetails.aspx?regexp_id=13053
 * @param command command in raw string
 * @returns An array of {flag, value} pair 
 */
function commandLineParser(command: string): ArgV {
  const matches = command.matchAll(_commandLineParserRegExp);
  const argV: ArgV = [];
  for (const match of matches) {
    const wholeMatch = match[0];
    if (!wholeMatch || wholeMatch === "") continue;
    const flag = match[1] as string | undefined;
    const quote = match[2] as string | undefined;
    const quotedContent = match[3] as string | undefined;
    const unquotedContent = match[4] as string | undefined;
    argV.push({
      flag: flag,
      value: quote ? quotedContent : unquotedContent
    });
  }
  return argV;
}

const _validTimeZones = new Set(Intl.supportedValuesOf("timeZone"));
/**
 * Check if a string is a valid/supported time zone according to the Intl object in JavaScript
 * @param tz time zone, eg. "America/NewYork"
 * @returns True if valid, false otherwise
 */
function isValidTimeZone(tz: string): boolean {
  return _validTimeZones.has(tz);
}

/**
 * Structure:
 * ```text
 * customMessage\n
 * error.message\n
 * error.stack\n (if enabled)
 * error.cause (if enabled)
 * ```
 * @param args `args.printStackTrace` and `args.printCause` default to `true`
 */
function errorMessageBuilder(
  args: {
    error: unknown, 
    customMessage: string,
    printStackTrace?: boolean,
    printCause?: boolean,
  }
): string {
  args.printStackTrace ??= true;
  args.printCause ??= true;

  let errorInfo: string[];
  if (args.error instanceof Error) {
    const stackTraceInfo: string = 
      (args.printStackTrace && args.error.stack) 
      ? args.error.stack
      : ""
    ;

    const errorCauseInfo: string =
      (args.printCause && args.error.cause)
      ? String(args.error.cause)
      : ""
    ;

    errorInfo = [args.error.message, stackTraceInfo, errorCauseInfo];
  } else {
    errorInfo = ["unknown error"];
  }

  // Do not join empty string or non-string values
  return [args.customMessage, ...errorInfo]
          .filter(msg => typeof(msg) === "string" && msg !== "")
          .join("\n");
} 

export {
  sleep,
  deletePartofString,
  commandLineParser,
  isValidTimeZone,
  errorMessageBuilder,
};