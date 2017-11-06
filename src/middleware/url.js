/* @flow */
/* eslint-disable no-param-reassign */

import { isFunction } from '../utils';
import type { Middleware, RRNLRequestObject } from '../definition';

export type UrlMiddlewareOpts = {|
  url: string | ((req: RRNLRequestObject) => string),
  opts?: {
    headers?: { [name: string]: string },
  },
|};

export default function urlMiddleware(opts?: UrlMiddlewareOpts): Middleware {
  const urlOrThunk = (opts && opts.url) || '/graphql';
  const fetchOpts = (opts && opts.opts) || null;

  return next => req => {
    if (fetchOpts) {
      const { headers, ...otherOpts } = fetchOpts;
      Object.assign(req, otherOpts);
      if (headers) {
        Object.assign(req.headers, headers);
      }
    }

    if (req.relayReqType !== 'batch-query') {
      // $FlowFixMe
      req.url = isFunction(urlOrThunk) ? urlOrThunk(req) : urlOrThunk;
    }

    return next(req);
  };
}
