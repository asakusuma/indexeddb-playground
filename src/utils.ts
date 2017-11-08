class PromiseTimeoutError extends Error {
  constructor(m: string) {
      super(m);
      // Set the prototype explicitly. This is required to be able to instanceof check
      // tslint:disable-next-line:max-line-length
      // See https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
      Object.setPrototypeOf(this, PromiseTimeoutError.prototype);
  }
}

type ErrorFunction =  (e: Error) => void;

/*
  * Given a promise, return a new promise that adds a timeout to the original
  * promise. Ensures that the resulting promise eventually resolve.
  */
export function guardPromise<T>(
  promise: PromiseLike<T>,
  timeoutMessage: string,
  msTimeout: number = 1000
): Promise<T> {
  const timeout = new Promise((_resolve: (e: T) => void, reject: ErrorFunction) => {
    setTimeout(() => {
      reject(new PromiseTimeoutError(timeoutMessage));
    }, msTimeout);
  });
  return Promise.race([timeout, promise]);
}