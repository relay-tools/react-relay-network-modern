/* eslint-disable no-param-reassign, arrow-body-style, dot-notation */
import { isFunction } from "../utils";
import type RelayResponse from "../RelayResponse";
import type { Middleware, RelayRequestAny } from "../definition";
import RRNLError from "../RRNLError";
export class RRNLAuthMiddlewareError extends RRNLError {
  constructor(msg: string) {
    super(msg);
    this.name = 'RRNLAuthMiddlewareError';
  }

}
export type AuthMiddlewareOpts = {
  token?: string | Promise<string> | ((req: RelayRequestAny) => string | Promise<string>);
  tokenRefreshPromise?: (req: RelayRequestAny, res: RelayResponse) => string | Promise<string>;
  allowEmptyToken?: boolean;
  prefix?: string;
  header?: string;
};
export default function authMiddleware(opts?: AuthMiddlewareOpts): Middleware {
  const {
    token: tokenOrThunk,
    tokenRefreshPromise,
    allowEmptyToken = false,
    prefix = 'Bearer ',
    header = 'Authorization'
  } = opts || {};
  let tokenRefreshInProgress = null;
  return next => async req => {
    try {
      const token = await (isFunction(tokenOrThunk) ? tokenOrThunk(req) : tokenOrThunk);

      if (!token && tokenRefreshPromise && !allowEmptyToken) {
        throw new RRNLAuthMiddlewareError('Empty token');
      }

      if (token) {
        req.fetchOpts.headers[header] = `${prefix}${token}`;
      }

      const res = await next(req);
      return res;
    } catch (e) {
      if (e && tokenRefreshPromise) {
        if (e.message === 'Empty token' || e.res && e.res.status === 401) {
          if (tokenRefreshPromise) {
            if (!tokenRefreshInProgress) {
              tokenRefreshInProgress = Promise.resolve(tokenRefreshPromise(req, e.res)).then(newToken => {
                tokenRefreshInProgress = null;
                return newToken;
              }).catch(err => {
                tokenRefreshInProgress = null;
                throw err;
              });
            }

            return tokenRefreshInProgress.then(newToken => {
              if (!newToken && !allowEmptyToken) {
                throw new RRNLAuthMiddlewareError('Empty token');
              }

              const newReq = req.clone();

              if (newToken) {
                newReq.fetchOpts.headers[header] = `${prefix}${newToken}`;
              } else {
                delete newReq.fetchOpts.headers[header];
              }

              return next(newReq); // re-run query with new token
            });
          }
        }
      }

      throw e;
    }
  };
}
