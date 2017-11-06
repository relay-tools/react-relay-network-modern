/* @flow */
/* eslint-disable no-console */

import type { Middleware } from '../definition';

export type PerfMiddlewareOpts = {|
  logger?: Function,
|};

export default function performanceMiddleware(opts?: PerfMiddlewareOpts): Middleware {
  const logger = (opts && opts.logger) || console.log.bind(console, '[RELAY-NETWORK]');

  return next => req => {
    // get query name here, because `req` can be changed after `next()` call
    const query = `${req.relayReqType} ${req.relayReqId}`;

    const start = new Date().getTime();

    return next(req).then(res => {
      const end = new Date().getTime();
      logger(`${query}: ${end - start}ms`);
      return res;
    });
  };
}
