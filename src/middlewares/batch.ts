import { $PropertyType } from "utility-types";

/* eslint-disable no-param-reassign */
import { isFunction } from "../utils";
import RelayRequestBatch from "../RelayRequestBatch";
import RelayRequest from "../RelayRequest";
import type RelayResponse from "../RelayResponse";
import type { Middleware, FetchOpts } from "../definition";
import RRNLError from "../RRNLError";
// Max out at roughly 100kb (express-graphql imposed max)
const DEFAULT_BATCH_SIZE = 102400;
type Headers = Record<string, string>;
export type BatchMiddlewareOpts = {
  batchUrl?: string | Promise<string> | ((requestList: RequestWrapper[]) => string | Promise<string>);
  batchTimeout?: number;
  maxBatchSize?: number;
  allowMutations?: boolean;
  method?: "POST" | "GET";
  headers?: Headers | Promise<Headers> | ((req: RelayRequestBatch) => Headers | Promise<Headers>);
  // Avaliable request modes in fetch options. For details see https://fetch.spec.whatwg.org/#requests
  credentials?: $PropertyType<FetchOpts, "credentials">;
  mode?: $PropertyType<FetchOpts, "mode">;
  cache?: $PropertyType<FetchOpts, "cache">;
  redirect?: $PropertyType<FetchOpts, "redirect">;
};
export type RequestWrapper = {
  req: RelayRequest;
  completeOk: (res: Record<string, any>) => void;
  completeErr: (e: Error) => void;
  done: boolean;
  duplicates: Array<RequestWrapper>;
};
type Batcher = {
  bodySize: number;
  requestList: RequestWrapper[];
  acceptRequests: boolean;
};
export class RRNLBatchMiddlewareError extends RRNLError {
  constructor(msg: string) {
    super(msg);
    this.name = 'RRNLBatchMiddlewareError';
  }

}
export default function batchMiddleware(options?: BatchMiddlewareOpts): Middleware {
  const opts = options || {};
  const batchTimeout = opts.batchTimeout || 0; // 0 is the same as nextTick in nodeJS

  const allowMutations = opts.allowMutations || false;
  const batchUrl = opts.batchUrl || '/graphql/batch';
  const maxBatchSize = opts.maxBatchSize || DEFAULT_BATCH_SIZE;
  const singleton = {};
  const fetchOpts = {};
  if (opts.method) fetchOpts.method = opts.method;
  if (opts.credentials) fetchOpts.credentials = opts.credentials;
  if (opts.mode) fetchOpts.mode = opts.mode;
  if (opts.cache) fetchOpts.cache = opts.cache;
  if (opts.redirect) fetchOpts.redirect = opts.redirect;
  if (opts.headers) fetchOpts.headersOrThunk = opts.headers;
  return next => req => {
    // do not batch mutations unless allowMutations = true
    if (req.isMutation() && !allowMutations) {
      return next(req);
    }

    if (!(req instanceof RelayRequest)) {
      throw new RRNLBatchMiddlewareError('Relay batch middleware accepts only simple RelayRequest. Did you add batchMiddleware twice?');
    }

    // req with FormData can not be batched
    if (req.isFormData()) {
      return next(req);
    }

    // skip batching if request explicitly opts out
    if (req.cacheConfig.skipBatch) {
      return next(req);
    }

    return passThroughBatch(req, next, {
      batchTimeout,
      batchUrl,
      singleton,
      maxBatchSize,
      fetchOpts
    });
  };
}

function passThroughBatch(req: RelayRequest, next, opts) {
  const {
    singleton
  } = opts;
  const bodyLength = (req.getBody() as any).length;

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
    const {
      requestList
    } = singleton.batcher;
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
      duplicates: []
    };
    const duplicateIndex = requestList.findIndex(wrapper => req.getBody() === wrapper.req.getBody());

    if (duplicateIndex !== -1) {
      /*
        I've run into a scenario with Relay Classic where if you have 2 components
        that make the exact same query, Relay will dedup the queries and reuse
        the request ids but still make 2 requests. The batch code then loses track
        of all the duplicate requests being made and never resolves or rejects
        the duplicate requests
        https://github.com/nodkz/react-relay-network-layer/pull/52
      */
      requestList[duplicateIndex].duplicates.push(requestWrapper);
    } else {
      requestList.push(requestWrapper);
    }
  });
}

function prepareNewBatcher(next, opts): Batcher {
  const batcher: Batcher = {
    bodySize: 2,
    // account for '[]'
    requestList: [],
    acceptRequests: true
  };
  setTimeout(() => {
    batcher.acceptRequests = false;
    sendRequests(batcher.requestList, next, opts).then(() => finalizeUncompleted(batcher.requestList)).catch(e => {
      if (e && e.name === 'AbortError') {
        finalizeCanceled(batcher.requestList, e);
      } else {
        finalizeUncompleted(batcher.requestList);
      }
    });
  }, opts.batchTimeout);
  return batcher;
}

async function sendRequests(requestList: RequestWrapper[], next, opts) {
  if (requestList.length === 1) {
    // SEND AS SINGLE QUERY
    const wrapper = requestList[0];
    const res = await next(wrapper.req);
    wrapper.completeOk(res);
    wrapper.duplicates.forEach(r => r.completeOk(res));
    return res;
  } else if (requestList.length > 1) {
    // SEND AS BATCHED QUERY
    const batchRequest = new RelayRequestBatch(requestList.map(wrapper => wrapper.req));
    // $FlowFixMe
    const url = await (isFunction(opts.batchUrl) ? opts.batchUrl(requestList) : opts.batchUrl);
    batchRequest.setFetchOption('url', url);
    const {
      headersOrThunk,
      ...fetchOpts
    } = opts.fetchOpts;
    batchRequest.setFetchOptions(fetchOpts);

    if (headersOrThunk) {
      const headers = await (isFunction(headersOrThunk) ? (headersOrThunk as any)(batchRequest) : headersOrThunk);
      batchRequest.setFetchOption('headers', headers);
    }

    try {
      const batchResponse = await next(batchRequest);

      if (!batchResponse || !Array.isArray(batchResponse.json)) {
        throw new RRNLBatchMiddlewareError('Wrong response from server. Did your server support batch request?');
      }

      batchResponse.json.forEach((payload: any, index) => {
        if (!payload) return;
        const request = requestList[index];

        if (request) {
          const res = createSingleResponse(batchResponse, payload);
          request.completeOk(res);
        }
      });
      return batchResponse;
    } catch (e) {
      requestList.forEach(request => request.completeErr(e));
    }
  }

  return Promise.resolve();
}

// check that server returns responses for all requests
function finalizeCanceled(requestList: RequestWrapper[], error: Error) {
  requestList.forEach(request => request.completeErr(error));
}

// check that server returns responses for all requests
function finalizeUncompleted(requestList: RequestWrapper[]) {
  requestList.forEach((request, index) => {
    if (!request.done) {
      request.completeErr(new RRNLBatchMiddlewareError(`Server does not return response for request at index ${index}.\n` + `Response should have an array with ${requestList.length} item(s).`));
    }
  });
}

function createSingleResponse(batchResponse: RelayResponse, json: any): RelayResponse {
  // Fallback for graphql-graphene and apollo-server batch responses
  const data = json.payload || json;
  const res = batchResponse.clone();
  res.processJsonData(data);
  return res;
}