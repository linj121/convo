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

class NotImplementedError extends Error {
  constructor(message?: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "NotImplementedError";
  }
}

class InvalidPluginInput extends Error {
  constructor(message?: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "InvalidPluginInput";
  }
}

class InvalidCommandLineArgument extends Error {
  constructor(message?: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "InvalidCommandLineArgument";
  }
}

class UnauthorizedError extends Error {
  constructor(message?: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "UnauthorizedError";
  }
}

export {
  NotTriggeredError,
  DataRepositoryError,
  DataRepositoryNotFoundError,
  NotImplementedError,
  InvalidPluginInput,
  InvalidCommandLineArgument,
  UnauthorizedError,
}