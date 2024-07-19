/**
 *
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

export { 
  sleep,
  deletePartofString
};