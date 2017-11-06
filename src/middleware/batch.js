/* @flow */
/* eslint-disable no-param-reassign */

import { isFunction } from '../utils';
import type {
  Middleware,
  RRNLRequestObject,
  RRNLRequestObjectBatchQuery,
  RRNLResponseObject,
} from '../definition';

// Max out at roughly 100kb (express-graphql imposed max)
const DEFAULT_BATCH_SIZE = 102400;

export type BatchMiddlewareOpts = {|
  batchTimeout?: number,
  allowMutations?: boolean,
  batchUrl?: string,
  maxBatchSize?: number,
|};

export type BatchRequestMap = {
  [reqId: string]: RequestWrapper,
};

export type RequestWrapper = {|
  req: RRNLRequestObject,
  completeOk: (res: Object) => void,
  completeErr: (e: Error) => void,
  done: boolean,
  duplicates: Array<RequestWrapper>,
|};

type Batcher = {
  bodySize: number,
  requestMap: BatchRequestMap,
  acceptRequests: boolean,
};

export default function batchMiddleware(options?: BatchMiddlewareOpts): Middleware {
  const opts = options || {};
  const batchTimeout = opts.batchTimeout || 0; // 0 is the same as nextTick in nodeJS
  const allowMutations = opts.allowMutations || false;
  const batchUrl = opts.batchUrl || '/graphql/batch';
  const maxBatchSize = opts.maxBatchSize || DEFAULT_BATCH_SIZE;
  const singleton = {};

  return next => req => {
    // do not batch mutations unless allowMutations = true
    if (req.relayReqType === 'mutation' && !allowMutations) {
      return next(req);
    }

    return passThroughBatch(req, next, {
      batchTimeout,
      batchUrl,
      singleton,
      maxBatchSize,
    });
  };
}

function passThroughBatch(req, next, opts) {
  const { singleton } = opts;

  // req.body as FormData can not be batched!
  if (global.FormData && req.body instanceof FormData) {
    return next(req);
  }

  const bodyLength = (req.body: any).length;
  if (!bodyLength) {
    return next(req);
  }

  if (!singleton.batcher || !singleton.batcher.acceptRequests) {
    singleton.batcher = prepareNewBatcher(next, opts);
  }

  if (singleton.batcher.bodySize + bodyLength + 1 > opts.maxBatchSize) {
    singleton.batcher = prepareNewBatcher(next, opts);
  }

  // +1 accounts for tailing comma after joining
  singleton.batcher.bodySize += bodyLength + 1;

  // queue request
  return new Promise((resolve, reject) => {
    const { relayReqId } = req;
    const { requestMap } = singleton.batcher;

    const requestWrapper: RequestWrapper = {
      req,
      completeOk: res => {
        requestWrapper.done = true;
        resolve(res);
        requestWrapper.duplicates.forEach(r => r.completeOk(res));
      },
      completeErr: err => {
        requestWrapper.done = true;
        reject(err);
        requestWrapper.duplicates.forEach(r => r.completeErr(err));
      },
      done: false,
      duplicates: [],
    };

    if (requestMap[relayReqId]) {
      /*
        I've run into a scenario with Relay Classic where if you have 2 components
        that make the exact same query, Relay will dedup the queries and reuse
        the request ids but still make 2 requests. The batch code then loses track
        of all the duplicate requests being made and never resolves or rejects
        the duplicate requests
        https://github.com/nodkz/react-relay-network-layer/pull/52
      */
      requestMap[relayReqId].duplicates.push(requestWrapper);
    } else {
      requestMap[relayReqId] = requestWrapper;
    }
  });
}

function prepareNewBatcher(next, opts): Batcher {
  const batcher: Batcher = {
    bodySize: 2, // account for '[]'
    requestMap: {},
    acceptRequests: true,
  };

  setTimeout(() => {
    batcher.acceptRequests = false;
    sendRequests(batcher.requestMap, next, opts)
      .then(() => finalizeUncompleted(batcher.requestMap))
      .catch(() => finalizeUncompleted(batcher.requestMap));
  }, opts.batchTimeout);

  return batcher;
}

function sendRequests(requestMap: BatchRequestMap, next, opts) {
  const ids = Object.keys(requestMap);

  if (ids.length === 1) {
    // SEND AS SINGLE QUERY
    const request = requestMap[ids[0]];

    return next(request.req).then(res => {
      request.completeOk(res);
      request.duplicates.forEach(r => r.completeOk(res));
    });
  } else if (ids.length > 1) {
    // SEND AS BATCHED QUERY

    // $FlowFixMe
    const url = isFunction(opts.batchUrl) ? opts.batchUrl(requestMap) : opts.batchUrl;

    const req: RRNLRequestObjectBatchQuery = {
      url,
      relayReqId: `BATCH_QUERY:${ids.join(':')}`,
      relayReqMap: requestMap,
      relayReqType: 'batch-query',
      method: 'POST',
      headers: {
        Accept: '*/*',
        'Content-Type': 'application/json',
      },
      body: `[${ids.map(id => requestMap[id].req.body).join(',')}]`,
    };

    return next(req)
      .then(batchResponse => {
        if (!batchResponse || !Array.isArray(batchResponse.payload)) {
          throw new Error('Wrong response from server');
        }

        batchResponse.payload.forEach(res => {
          if (!res) return;
          const request = requestMap[res.id];
          if (request) {
            const responsePayload = copyBatchResponse(batchResponse, res);
            request.completeOk(responsePayload);
          }
        });
      })
      .catch(e => {
        ids.forEach(id => {
          requestMap[id].completeErr(e);
        });
      });
  }

  return Promise.resolve();
}

// check that server returns responses for all requests
function finalizeUncompleted(requestMap: BatchRequestMap) {
  Object.keys(requestMap).forEach(id => {
    const request = requestMap[id];
    if (!request.done) {
      request.completeErr(
        new Error(
          `Server does not return response for request with id ${id} \n` +
            `Response should have following shape { "id": "${id}", "data": {} }`
        )
      );
    }
  });
}

function copyBatchResponse(batchResponse, res): RRNLResponseObject {
  // Fallback for graphql-graphene and apollo-server batch responses
  const payload = res.payload || res;
  return {
    ok: batchResponse.ok,
    status: batchResponse.status,
    statusText: batchResponse.statusText,
    url: batchResponse.url,
    headers: batchResponse.headers,
    payload,
  };
}
