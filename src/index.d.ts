export type FetchResponse = Response;
export type Variables = { [name: string]: any };

export class RelayResponse {
  static createFromFetch(res: FetchResponse): Promise<RelayResponse>;

  static createFromGraphQL(res: { errors?: any; data?: any }): Promise<RelayResponse>;

  processJsonData(json: any): void;
  clone(): RelayResponse;
}

export interface FetchOpts {
  url?: string;
  method: 'POST' | 'GET';
  headers: { [name: string]: string };
  body: string | FormData;
  credentials?: 'same-origin' | 'include' | 'omit';
  mode?: 'cors' | 'websocket' | 'navigate' | 'no-cors' | 'same-origin';
  cache?: 'default' | 'no-store' | 'reload' | 'no-cache' | 'force-cache' | 'only-if-cached';
  redirect?: 'follow' | 'error' | 'manual';
  [name: string]: any;
}

export class RelayRequest {
  static lastGenId: number;
  id: string;
  fetchOpts: FetchOpts;

  operation: ConcreteBatch;
  variables: Variables;
  cacheConfig: CacheConfig;
  uploadables: UploadableMap | null;

  getBody(): string | FormData;
  prepareBody(): string | FormData;
  getID(): string;
  getQueryString(): string;
  getVariables(): Variables;
  isMutation(): boolean;
  isFormData(): boolean;
  clone(): RelayRequest;
}

export class RelayRequestBatch {
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

export type RelayRequestAny = RelayRequest | RelayRequestBatch;

export type QueryResponseCache = {
  size: number;
  ttl: number;
};

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

export interface CacheMiddlewareOpts {
  size?: number;
  ttl?: number;
  onInit?: (cache: QueryResponseCache) => any;
  allowMutations?: boolean;
  allowFormData?: boolean;
  clearOnMutation?: boolean;
  cacheErrors?: boolean;
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

type RelayNetworkLayerOpts = {
  subscribeFn?: SubscribeFunction;
  beforeFetch?: FetchHookFunction;
  noThrow?: boolean;
};

export class RelayNetworkLayer {
  constructor(
    middlewares: Array<Middleware | MiddlewareSync | MiddlewareRaw | null>,
    opts?: RelayNetworkLayerOpts
  );
}
