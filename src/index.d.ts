import { ExecuteFunction, QueryResponseCache } from "relay-runtime";

export { QueryResponseCache };

export type FetchResponse = Response;
export type Variables = { [name: string]: any };

declare class RelayResponse {
  _res: any;

  data?: PayloadData;
  errors?: GraphQLResponseErrors;

  ok: any;
  status: number;
  statusText?: string;
  headers?: Headers;
  url?: string;
  text?: string;
  json: unknown;

  static createFromFetch(res: FetchResponse): Promise<RelayResponse>;

  static createFromGraphQL(res: { errors?: any; data?: any }): Promise<RelayResponse>;

  processJsonData(json: unknown): void;
  clone(): RelayResponse;
  toString(): string;
}
export { RelayResponse as RelayNetworkLayerResponse };

export type Headers = { [name: string]: string };
export interface FetchOpts {
  url?: string;
  method: 'POST' | 'GET';
  headers: Headers;
  body: string | FormData;
  credentials?: 'same-origin' | 'include' | 'omit';
  mode?: 'cors' | 'websocket' | 'navigate' | 'no-cors' | 'same-origin';
  cache?: 'default' | 'no-store' | 'reload' | 'no-cache' | 'force-cache' | 'only-if-cached';
  redirect?: 'follow' | 'error' | 'manual';
  signal?: AbortSignal;
  [name: string]: any;
}

declare class RelayRequest {
  static lastGenId: number;
  id: string;
  fetchOpts: FetchOpts;

  operation: ConcreteBatch;
  variables: Variables;
  cacheConfig: CacheConfig;
  uploadables: UploadableMap | null;
  controller: AbortController | null;

  getBody(): string | FormData;
  prepareBody(): string | FormData;
  getID(): string;
  getQueryString(): string;
  getVariables(): Variables;
  isMutation(): boolean;
  isFormData(): boolean;
  cancel(): boolean;
  clone(): RelayRequest;
}
export { RelayRequest as RelayNetworkLayerRequest };

declare class RelayRequestBatch {
  fetchOpts: FetchOpts;
  requests: RelayRequest[];

  setFetchOption(name: string, value: any): void;
  setFetchOptions(opts: {}): void;
  getBody(): string;
  prepareBody(): string;
  getIds(): string[];
  getID(): string;
  isMutation(): boolean;
  isFormData(): boolean;
  clone(): RelayRequestBatch;
  getVariables(): Variables;
  getQueryString(): string;
}
export { RelayRequestBatch as RelayNetworkLayerRequestBatch };

export type RelayRequestAny = RelayRequest | RelayRequestBatch;

export type MiddlewareNextFn = (req: RelayRequestAny) => Promise<RelayResponse>;
export type Middleware = (next: MiddlewareNextFn) => MiddlewareNextFn;

export type UrlMiddlewareOpts = {
  url: string | Promise<string> | ((req: RelayRequest) => string | Promise<string>);
  method?: 'POST' | 'GET';
  headers?: Headers | Promise<Headers> | ((req: RelayRequest) => Headers | Promise<Headers>);
  // Avaliable request modes in fetch options. For details see https://fetch.spec.whatwg.org/#requests
  credentials?: FetchOpts['credentials'];
  mode?: FetchOpts['mode'];
  cache?: FetchOpts['cache'];
  redirect?: FetchOpts['redirect'];
};

export function urlMiddleware(opts?: UrlMiddlewareOpts): Middleware;

export interface LoggerMiddlewareOpts {
  logger?: Function;
}

export function loggerMiddleware(opts?: LoggerMiddlewareOpts): Middleware;

export interface PerfMiddlewareOpts {
  logger?: Function;
}

export function perfMiddleware(opts?: PerfMiddlewareOpts): Middleware;

export interface AuthMiddlewareOpts {
  token?: string | Promise<string> | ((req: RelayRequestAny) => string | Promise<string>);
  tokenRefreshPromise?: (req: RelayRequestAny, res: RelayResponse) => string | Promise<string>;
  allowEmptyToken?: boolean;
  prefix?: string;
  header?: string;
}

export function authMiddleware(opts?: AuthMiddlewareOpts): Middleware;

interface RequestWrapper {
  req: RelayRequest;
  completeOk: (res: object) => void;
  completeErr: (e: Error) => void;
  done: boolean;
  duplicates: RequestWrapper[];
}

interface BatchRequestMap {
  [reqId: string]: RequestWrapper;
}

export type BatchMiddlewareOpts = {
  batchUrl?: string | Promise<string> | ((requestMap: BatchRequestMap) => string | Promise<string>);
  batchTimeout?: number;
  maxBatchSize?: number;
  allowMutations?: boolean;
  method?: 'POST' | 'GET';
  headers?: Headers | Promise<Headers> | ((req: RelayRequestBatch) => Headers | Promise<Headers>);
  // Available request modes in fetch options. For details see https://fetch.spec.whatwg.org/#requests
  credentials?: FetchOpts['credentials'];
  mode?: FetchOpts['mode'];
  cache?: FetchOpts['cache'];
  redirect?: FetchOpts['redirect'];
};

export function batchMiddleware(opts?: BatchMiddlewareOpts): Middleware;

export interface CacheMiddlewareOpts {
  size?: number;
  ttl?: number;
  onInit?: (cache: QueryResponseCache) => void;
  allowMutations?: boolean;
  allowFormData?: boolean;
  clearOnMutation?: boolean;
  cacheErrors?: boolean;
  updateTTLOnGet?: boolean;
}

export function cacheMiddleware(opts?: CacheMiddlewareOpts): Middleware;

export interface GqlErrorMiddlewareOpts {
  logger?: Function;
  prefix?: string;
  disableServerMiddlewareTip?: boolean;
}

export function errorMiddleware(opts?: GqlErrorMiddlewareOpts): Middleware;

export type RetryAfterFn = (attempt: number) => number | false;
export type ForceRetryFn = (runNow: Function, delay: number) => any;
export type AbortFn = (msg?: string) => any;

export type BeforeRetryCb = (meta: {
  forceRetry: Function;
  abort: AbortFn;
  delay: number;
  attempt: number;
  lastError: Error | null;
  req: RelayRequestAny;
}) => any;

export type StatusCheckFn = (
  statusCode: number,
  req: RelayRequestAny,
  res: RelayResponse
) => boolean;

export interface RetryMiddlewareOpts {
  fetchTimeout?: number;
  retryDelays?: number[] | RetryAfterFn;
  statusCodes?: number[] | false | StatusCheckFn;
  logger?: Function | false;
  allowMutations?: boolean;
  allowFormData?: boolean;
  forceRetry?: ForceRetryFn | false; // DEPRECATED in favor `beforeRetry`
  beforeRetry?: BeforeRetryCb | false;
}

export function retryMiddleware(opts?: RetryMiddlewareOpts): Middleware;

export interface ProgressOpts {
  sizeHeader?: string;
  onProgress: (runningTotal: number, totalSize: number | null) => any;
}

export function progressMiddleware(opts?: ProgressOpts): Middleware;

export function uploadMiddleware(): Middleware;

export type MiddlewareRawNextFn = (req: RelayRequestAny) => Promise<FetchResponse>;

export type MiddlewareRaw = {
  isRawMiddleware: true;
  (): (next: MiddlewareRawNextFn) => MiddlewareRawNextFn;
};

export type ConcreteBatch = {
  kind: 'Batch';
  fragment: any;
  id: string | null;
  metadata: { [key: string]: any };
  name: string;
  query: any;
  text: string | null;
  operationKind: string;
};
export type CacheConfig = {
  force?: boolean;
  poll?: number;
  // rerunParamExperimental?: any;
};

export type Uploadable = File | Blob;
export type UploadableMap = { [key: string]: Uploadable };

export type RelayObservable<T> = Promise<T>;

export type ObservableFromValue<T> = RelayObservable<T> | Promise<T> | T;

export type PayloadData = { [key: string]: any };

export type QueryPayload =
  | {
    data?: PayloadData | null;
    errors?: any[];
    rerunVariables?: Variables;
  }
  | RelayResponse;

export type MiddlewareSync = {
  execute: (
    operation: ConcreteBatch,
    variables: Variables,
    cacheConfig: CacheConfig,
    uploadables: UploadableMap | null
  ) => ObservableFromValue<QueryPayload> | null;
};

export type FetchHookFunction = (
  operation: ConcreteBatch,
  variables: Variables,
  cacheConfig: CacheConfig,
  uploadables: UploadableMap | null
) => void | ObservableFromValue<QueryPayload>;

export interface Disposable {
  dispose(): void;
}

export type SubscribeFunction = (
  operation: ConcreteBatch,
  variables: Variables,
  cacheConfig: CacheConfig,
  observer: any
) => RelayObservable<QueryPayload> | Disposable;

export type RelayNetworkLayerOpts = {
  subscribeFn?: SubscribeFunction;
  beforeFetch?: FetchHookFunction;
  noThrow?: boolean;
};

export class RelayNetworkLayer {
  constructor(
    middlewares: Array<Middleware | MiddlewareSync | MiddlewareRaw | null>,
    opts?: RelayNetworkLayerOpts
  );

  execute: ExecuteFunction;
}

export type GraphQLResponseErrors = Array<{
  message: string;
  locations?: [{ column: number; line: number }];
  stack?: string[];
}>;

export class RRNLError extends Error {
  constructor(msg: string);
}

export class RRNLRequestError extends RRNLError {
  req: RelayRequestAny;
  res?: RelayResponse;

  constructor(msg: string);
}

export function createRequestError(request: RelayRequestAny, response?: RelayResponse): RRNLRequestError;
export function formatGraphQLErrors(request: RelayRequest, errors: GraphQLResponseErrors): string;

type ExpressMiddleware = (req: any, res: any) => any;
export function graphqlBatchHTTPWrapper(middleware: ExpressMiddleware): ExpressMiddleware;
