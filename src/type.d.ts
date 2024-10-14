type Constructor<T> = {
  new (...args: any[]): T;
}

type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;