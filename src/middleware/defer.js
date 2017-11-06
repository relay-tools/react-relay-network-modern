/* @flow */
/* eslint-disable no-unused-vars */

import type { Middleware } from '../definition';

export default function deferMiddleware(opts?: void): Middleware {
  const middleware = next => req => next(req);

  middleware.supports = ['defer'];

  return middleware;
}
