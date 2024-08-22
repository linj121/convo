class NotTriggeredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotTriggeredError";
  }
}

export {
  NotTriggeredError,
}