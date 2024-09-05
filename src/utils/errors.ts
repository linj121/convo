class NotTriggeredError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "NotTriggeredError";
  }
}

class DataRepositoryError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "DataRepositoryError";
  }
}

class DataRepositoryNotFoundError extends DataRepositoryError {}

export {
  NotTriggeredError,
  DataRepositoryError,
  DataRepositoryNotFoundError
}