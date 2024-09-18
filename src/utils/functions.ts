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

export {
  sleep,
  deletePartofString,
  commandLineParser,
};