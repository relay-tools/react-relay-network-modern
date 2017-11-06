/* @flow */
/* eslint-disable no-param-reassign */

import { isFunction } from '../utils';
import type RelayRequest from '../RelayRequest';
import type { Middleware } from '../definition';

type Headers = { [name: string]: string };

export type UrlMiddlewareOpts = {
  url: string | ((req: RelayRequest) => string),
  method?: 'POST' | 'GET',
  headers?: Headers | ((req: RelayRequest) => Headers),
  credentials?: 'same-origin' | string,
};

export default function urlMiddleware(opts?: UrlMiddlewareOpts): Middleware {
  const { url, headers, method = 'POST', credentials } = opts || {};
  const urlOrThunk: any = url || '/graphql';
  const headersOrThunk: any = headers;

  return next => req => {
    req.fetchOpts.url = isFunction(urlOrThunk) ? urlOrThunk(req) : urlOrThunk;

    if (headersOrThunk) {
      req.fetchOpts.headers = isFunction(headersOrThunk) ? headersOrThunk(req) : headersOrThunk;
    }

    if (method) {
      req.fetchOpts.method = method;
    }

    if (credentials) {
      req.fetchOpts.credentials = credentials;
    }

    return next(req);
  };
}
