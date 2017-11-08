/* @flow */
/* eslint-disable no-console */

import RelayRequest from '../RelayRequest';
import RelayRequestBatch from '../RelayRequestBatch';
import type { Middleware } from '../definition';

export type PerfMiddlewareOpts = {|
  logger?: Function,
|};

export default function performanceMiddleware(opts?: PerfMiddlewareOpts): Middleware {
  const logger = (opts && opts.logger) || console.log.bind(console, '[RELAY-NETWORK]');

  return next => req => {
    const start = new Date().getTime();

    return next(req).then(res => {
      const end = new Date().getTime();

      let queryId;
      let queryData;
      if (req instanceof RelayRequest) {
        queryId = req.getID();
        queryData = {
          query: req.getQueryString(),
          variables: req.getVariables(),
          response: res.json,
        };
      } else if (req instanceof RelayRequestBatch) {
        queryId = `BATCH_REQUEST:${req.getID()}`;
        queryData = {
          requests: req.requests,
          response: res.json,
        };
      } else {
        queryId = 'CustomRequest';
        queryData = {
          request: req,
          response: res,
        };
      }
      logger(`[${end - start}ms] ${queryId}`, queryData);
      return res;
    });
  };
}
