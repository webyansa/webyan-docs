export class TimeoutError extends Error {
  public readonly ms: number;
  public readonly label: string;

  constructor(label: string, ms: number) {
    super(`Timeout after ${ms}ms: ${label}`);
    this.name = 'TimeoutError';
    this.ms = ms;
    this.label = label;
  }
}

// Accepts PromiseLike to support PostgREST builders (they are thenable but not full Promises).
export function withTimeout<T>(promiseLike: PromiseLike<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const promise = Promise.resolve(promiseLike);

  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new TimeoutError(label, ms)), ms);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer) clearTimeout(timer);
  }) as Promise<T>;
}
