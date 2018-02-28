/* @flow */

import { QueryResponseCache } from 'relay-runtime';
import type { Middleware } from '../definition';
import { isFunction } from '../utils';

type CacheMiddlewareOpts = {|
  size?: number,
  ttl?: number,
  onInit?: (cache: QueryResponseCache) => any,
  allowMutations?: boolean,
  allowFormData?: boolean,
|};

export default function queryMiddleware(opts?: CacheMiddlewareOpts): Middleware {
  const { size, ttl, onInit, allowMutations, allowFormData } = opts || {};
  const cache = new QueryResponseCache({
    size: size || 100, // 100 requests
    ttl: ttl || 15 * 60 * 1000, // 15 minutes
  });

  if (isFunction(onInit)) {
    onInit(cache);
  }

  return next => async req => {
    if (req.isMutation() && !allowMutations) {
      return next(req);
    }

    if (req.isFormData() && !allowFormData) {
      return next(req);
    }

    if (req.cacheConfig && req.cacheConfig.force) {
      return next(req);
    }

    try {
      const queryId = req.getID();
      const variables = req.getVariables();

      const cachedRes = cache.get(queryId, variables);
      if (cachedRes) {
        return cachedRes;
      }

      const res = await next(req);
      cache.set(queryId, variables, res);

      return res;
    } catch (e) {
      // if error, just log it to console
      console.log(e); // eslint-disable-line
    }

    return next(req);
  };
}
