/* @flow */
/* eslint-disable no-console */

import type { Middleware, RelayRequestAny, MiddlewareNextFn } from '../definition';
import type RelayResponse from '../RelayResponse';
import { isFunction } from '../utils';
import RRNLError from '../RRNLError';

export type RetryAfterFn = (attempt: number) => number | false;
export type TimeoutAfterFn = (attempt: number) => number;
export type ForceRetryFn = (runNow: Function, delay: number) => any;

export type BeforeRetryCb = (meta: {|
  forceRetry: Function,
  abort: Function,
  delay: number,
  attempt: number,
  lastError: ?Error,
  req: RelayRequestAny,
|}) => any;

export type StatusCheckFn = (
  statusCode: number,
  req: RelayRequestAny,
  res: RelayResponse
) => boolean;

export type RetryMiddlewareOpts = {|
  fetchTimeout?: number | TimeoutAfterFn,
  retryDelays?: number[] | RetryAfterFn,
  statusCodes?: number[] | false | StatusCheckFn,
  logger?: Function | false,
  allowMutations?: boolean,
  allowFormData?: boolean,
  forceRetry?: ForceRetryFn | false, // DEPRECATED in favor `beforeRetry`
  beforeRetry?: BeforeRetryCb | false,
|};

function noopFn() {}

export class RRNLRetryMiddlewareError extends RRNLError {
  constructor(msg: string) {
    super(msg);
    this.name = 'RRNLRetryMiddlewareError';
  }
}

export default function retryMiddleware(options?: RetryMiddlewareOpts): Middleware {
  const opts = options || {};
  const timeout = opts.fetchTimeout || 15000;
  const retryDelays = opts.retryDelays || [1000, 3000];
  const statusCodes = opts.statusCodes || false;
  const logger =
    opts.logger === false ? () => {} : opts.logger || console.log.bind(console, '[RELAY-NETWORK]');
  const allowMutations = opts.allowMutations || false;
  const allowFormData = opts.allowFormData || false;
  const forceRetryFn = opts.forceRetry || false; // DEPRECATED in favor `beforeRetry`
  const beforeRetry = opts.beforeRetry || false;

  let retryAfterMs: RetryAfterFn = () => false;
  if (retryDelays) {
    if (Array.isArray(retryDelays)) {
      retryAfterMs = attempt => {
        if (retryDelays.length >= attempt) {
          return retryDelays[attempt];
        }
        return false;
      };
    } else if (isFunction(retryDelays)) {
      retryAfterMs = retryDelays;
    }
  }

  let timeoutAfterMs: TimeoutAfterFn;
  if (typeof timeout === 'number') {
    timeoutAfterMs = () => timeout;
  } else {
    timeoutAfterMs = timeout;
  }

  let retryOnStatusCode: StatusCheckFn = (status, req, res) => {
    return res.status < 200 || res.status > 300;
  };
  if (statusCodes) {
    if (Array.isArray(statusCodes)) {
      retryOnStatusCode = (status, req, res) => statusCodes.indexOf(res.status) !== -1;
    } else if (isFunction(statusCodes)) {
      retryOnStatusCode = statusCodes;
    }
  }

  return next => req => {
    if (req.isMutation() && !allowMutations) {
      return next(req);
    }

    if (req.isFormData() && !allowFormData) {
      return next(req);
    }

    return makeRetriableRequest({
      req,
      next,
      timeoutAfterMs,
      retryAfterMs,
      retryOnStatusCode,
      forceRetryFn,
      beforeRetry,
      logger,
    });
  };
}

async function makeRetriableRequest(
  o: {
    req: RelayRequestAny,
    next: MiddlewareNextFn,
    timeoutAfterMs: TimeoutAfterFn,
    retryAfterMs: RetryAfterFn,
    retryOnStatusCode: StatusCheckFn,
    forceRetryFn: ForceRetryFn | false,
    beforeRetry: BeforeRetryCb | false,
    logger: Function,
  },
  delay: number = 0,
  attempt: number = 0,
  lastError: ?Error = null
): Promise<RelayResponse> {
  const makeRetry = async (prevError: Error) => {
    const retryDelay = o.retryAfterMs(attempt);
    if (retryDelay) {
      o.logger(prevError.message);
      o.logger(`will retry in ${retryDelay} milliseconds`);
      return makeRetriableRequest(o, retryDelay, attempt + 1, prevError);
    }
    throw prevError;
  };

  const makeRequest = async () => {
    try {
      const timeout = o.timeoutAfterMs(attempt);
      return await promiseWithTimeout(o.next(o.req), timeout, () => {
        const err = new RRNLRetryMiddlewareError(`Reached request timeout in ${timeout} ms`);
        return makeRetry(err);
      });
    } catch (e) {
      // no response from server (no internet connection), make new attempt
      if (e && !e.res && !(e instanceof RRNLRetryMiddlewareError)) {
        return makeRetry(e);
      }

      // response with invalid statusCode
      if (e && e.res && o.retryOnStatusCode(e.res.status, o.req, e.res)) {
        const err = new RRNLRetryMiddlewareError(
          `Wrong response status ${e.res.status}, retrying...`
        );
        return makeRetry(err);
      }

      throw e;
    }
  };

  if (attempt === 0) {
    // first request should be without delay
    return makeRequest();
  } else {
    // second and all further calls should be delayed
    const { promise, forceExec, abort } = delayedExecution(makeRequest, delay);

    if (o.forceRetryFn) {
      // DEPRECATED in favor `beforeRetry`
      o.forceRetryFn(forceExec, delay);
    }

    if (o.beforeRetry) {
      o.beforeRetry({
        abort,
        forceRetry: forceExec,
        attempt,
        delay,
        lastError,
        req: o.req,
      });
    }

    return promise;
  }
}

/**
 * This function delays execution of some function for some period of time.
 * Returns a promise, with ability to run execution immidiately, or abort it.
 */
export function delayedExecution<T>(
  execFn: () => Promise<T>,
  delay: number = 0
): {
  forceExec: () => any,
  abort: () => any,
  promise: Promise<T>,
} {
  let abort = noopFn;
  let forceExec = noopFn;

  if (delay <= 0) {
    return {
      abort,
      forceExec,
      promise: execFn(),
    };
  }

  const promise = new Promise((resolve, reject) => {
    let delayId;

    abort = () => {
      if (delayId) {
        clearTimeout(delayId);
        delayId = null;
      }
      reject(new RRNLRetryMiddlewareError('Aborted in beforeRetry() callback'));
    };

    forceExec = () => {
      if (delayId) {
        clearTimeout(delayId);
        delayId = null;
        resolve(execFn());
      }
    };

    delayId = setTimeout(() => {
      resolve(execFn());
    }, delay);
  });

  return { forceExec, abort, promise };
}

/*
* This function accepts a Promise and watch for it some period of time (timeoutMS)
* if Promise completed in this period, then returns its result
* if not - returns other Promise from onTimeout() callback
*/
export function promiseWithTimeout<T>(
  promise: Promise<T>,
  timeoutMS: number,
  onTimeout: () => Promise<T>
): Promise<T> {
  if (!timeoutMS) {
    return promise;
  }

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      onTimeout()
        .then(resolve)
        .catch(reject);
    }, timeoutMS);

    promise
      .then(res => {
        clearTimeout(timeoutId);
        resolve(res);
      })
      .catch(err => {
        clearTimeout(timeoutId);
        reject(err);
      });
  });
}
