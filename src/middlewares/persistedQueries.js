// @flow
/* eslint-disable no-console */

import type { Middleware, RelayRequestAny, MiddlewareNextFn } from '../definition';
import type RelayResponse from '../RelayResponse';

type PersistedQueriesMiddlewareOptions = {| hash: string |};

async function makePersistedQueryRequestWithFallback(
  o: {
    req: RelayRequestAny,
    next: MiddlewareNextFn,
    options?: PersistedQueriesMiddlewareOptions,
  },
  original = false,
  hasRunFallback: boolean = false
): Promise<RelayResponse> {
  const makeFallback = async (prevError: Error) => {
    if (hasRunFallback) {
      throw prevError;
    }

    return makePersistedQueryRequestWithFallback(o, true, true);
  };

  const makeRequest = async () => {
    try {
      // We make a new duplicate request and see if the backend is able to
      // process it
      // If the backend rejects it we fallback to the original request (which has the text query)
      const persistedQueriesReq = JSON.parse(JSON.stringify(o.req));

      const { cacheID, id, text: queryText } = persistedQueriesReq.operation;

      const queryId = id || cacheID;

      if (!queryId && (!o.options?.hash || !queryText)) {
        throw new Error('Either query id or hashing function & query must be defined!');
      }

      // Add doc_id to the request and remove the query text
      const body = JSON.parse(persistedQueriesReq.fetchOpts.body);
      delete body.query;
      body.doc_id = queryId;
      persistedQueriesReq.fetchOpts.body = JSON.stringify(body);

      delete persistedQueriesReq.operation.text;

      return await o.next(original ? o.req : persistedQueriesReq);
    } catch (e) {
      return makeFallback(e);
    }
  };

  return makeRequest();
}

export default (options?: PersistedQueriesMiddlewareOptions): Middleware => (next) => (req) =>
  makePersistedQueryRequestWithFallback({
    req,
    next,
    options,
  });
