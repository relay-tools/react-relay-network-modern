/* @flow */
/* eslint-disable no-param-reassign */

import { isFunction } from '../utils';
import type RelayRequest from '../RelayRequest';
import type { Middleware } from '../definition';

type Headers = { [name: string]: string };

export type UrlMiddlewareOpts = {
  url: string | Promise<string> | ((req: RelayRequest) => string | Promise<string>),
  method?: 'POST' | 'GET',
  headers?: Headers | Promise<Headers> | ((req: RelayRequest) => Headers | Promise<Headers>),
  credentials?: 'same-origin' | string,
};

export default function urlMiddleware(opts?: UrlMiddlewareOpts): Middleware {
  const { url, headers, method = 'POST', credentials } = opts || {};
  const urlOrThunk: any = url || '/graphql';
  const headersOrThunk: any = headers;

  return next => async req => {
    req.fetchOpts.url = await (isFunction(urlOrThunk) ? urlOrThunk(req) : urlOrThunk);

    if (headersOrThunk) {
      req.fetchOpts.headers = await (isFunction(headersOrThunk)
        ? headersOrThunk(req)
        : headersOrThunk);
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
