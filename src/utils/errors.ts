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

export {
  NotTriggeredError,
  DataRepositoryError,
  DataRepositoryNotFoundError,
  NotImplementedError,
  InvalidPluginInput
}