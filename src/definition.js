/* @flow */

import type { BatchRequestMap } from './middleware/batch';

export type MiddlewareNextFn = (req: RRNLRequestObject) => Promise<RRNLResponseObject>;
export type Middleware = (next: MiddlewareNextFn) => MiddlewareNextFn;
// {
//   supports?: string | string[],
// };

export type FetchOpts = {
  url?: string,
  method: 'POST' | 'GET',
  headers: { [name: string]: string },
  body: string | FormData,
};

export type RRNLRequestObject =
  | RRNLRequestObjectQuery
  | RRNLRequestObjectMutation
  | RRNLRequestObjectBatchQuery;

export type RRNLRequestObjectQuery = FetchOpts & {
  relayReqType: 'query',
  relayReqId: string,
  relayReqObj: RelayClassicRequest,
};

export type RRNLRequestObjectMutation = FetchOpts & {
  relayReqType: 'mutation',
  relayReqId: string,
  relayReqObj: RelayClassicRequest,
};

export type RRNLRequestObjectBatchQuery = FetchOpts & {
  relayReqType: 'batch-query',
  relayReqId: string,
  relayReqMap: BatchRequestMap,
  relayReqObj?: void,
};

export type GraphQLResponseErrors = Array<{
  message: string,
  locations?: Array<{
    column: number,
    line: number,
  }>,
  stack?: Array<string>,
}>;

export type GraphQLResponse = {
  data?: any,
  errors?: GraphQLResponseErrors,
};

export type RRNLResponseObject = {
  ok: any,
  status: number,
  statusText: string,
  headers: { [name: string]: string },
  url: string,
  payload: ?GraphQLResponse,
};

export type RelayClassicRequest = {
  resolve: (payload: mixed) => Promise<mixed>,
  reject: (error: Error) => Promise<mixed>,
  getID: () => string,
  getFiles: () => ?{ [key: string]: File },
  getQueryString: () => string,
  getVariables: () => Object,
  getDebugName: () => string,
};
