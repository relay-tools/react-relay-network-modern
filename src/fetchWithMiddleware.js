/* @flow */
/* eslint-disable no-param-reassign, prefer-const */

import { createRequestError } from './createRequestError';
import type {
  Middleware,
  RRNLRequestObject,
  RRNLResponseObject,
  MiddlewareNextFn,
} from './definition';

async function runFetch(req: RRNLRequestObject): Promise<RRNLResponseObject> {
  let { url, ...opts } = req;

  if (!url) {
    if (req.relayReqType === 'batch-query') {
      url = '/graphql/batch';
    } else {
      url = '/graphql';
    }
  }

  const res = await fetch(url, opts);

  if (res.status < 200 || res.status >= 300) {
    const text = await res.text();
    const err: any = new Error(text);
    err.fetchResponse = res;
    throw err;
  }

  const payload = await res.json();
  return { ...res, payload };
}

export default function fetchWithMiddleware(
  req: RRNLRequestObject,
  middlewares: Middleware[]
): Promise<any> {
  const wrappedFetch: MiddlewareNextFn = compose(...middlewares)(runFetch);

  return wrappedFetch(req).then(res => {
    const { payload } = res;
    if (!payload || payload.hasOwnProperty('errors') || !payload.hasOwnProperty('data')) {
      throw createRequestError(req, res);
    }
    return payload.data;
  });
}

/**
 * Composes single-argument functions from right to left. The rightmost
 * function can take multiple arguments as it provides the signature for
 * the resulting composite function.
 *
 * @param {...Function} funcs The functions to compose.
 * @returns {Function} A function obtained by composing the argument functions
 * from right to left. For example, compose(f, g, h) is identical to doing
 * (...args) => f(g(h(...args))).
 */
function compose(...funcs) {
  if (funcs.length === 0) {
    return arg => arg;
  } else {
    const last = funcs[funcs.length - 1];
    const rest = funcs.slice(0, -1);
    return (...args) => rest.reduceRight((composed, f) => f(composed), last(...args));
  }
}
