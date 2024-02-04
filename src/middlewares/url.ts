import { $PropertyType } from "utility-types";

/* eslint-disable no-param-reassign */
import { isFunction } from "../utils";
import type RelayRequest from "../RelayRequest";
import type { Middleware, FetchOpts } from "../definition";
type Headers = Record<string, string>;
export type UrlMiddlewareOpts = {
  url: string | Promise<string> | ((req: RelayRequest) => string | Promise<string>);
  method?: "POST" | "GET";
  headers?: Headers | Promise<Headers> | ((req: RelayRequest) => Headers | Promise<Headers>);
  // Avaliable request modes in fetch options. For details see https://fetch.spec.whatwg.org/#requests
  credentials?: $PropertyType<FetchOpts, "credentials">;
  mode?: $PropertyType<FetchOpts, "mode">;
  cache?: $PropertyType<FetchOpts, "cache">;
  redirect?: $PropertyType<FetchOpts, "redirect">;
};
export default function urlMiddleware(opts?: UrlMiddlewareOpts): Middleware {
  const {
    url,
    headers,
    method = 'POST',
    credentials,
    mode,
    cache,
    redirect
  } = opts || {};
  const urlOrThunk: any = url || '/graphql';
  const headersOrThunk: any = headers;
  return next => async req => {
    req.fetchOpts.url = await (isFunction(urlOrThunk) ? urlOrThunk(req) : urlOrThunk);

    if (headersOrThunk) {
      req.fetchOpts.headers = await (isFunction(headersOrThunk) ? headersOrThunk(req) : headersOrThunk);
    }

    if (method) req.fetchOpts.method = method;
    if (credentials) req.fetchOpts.credentials = credentials;
    if (mode) req.fetchOpts.mode = mode;
    if (cache) req.fetchOpts.cache = cache;
    if (redirect) req.fetchOpts.redirect = redirect;
    return next(req);
  };
}