import type RelayRequest from "./RelayRequest";
import type RelayRequestBatch from "./RelayRequestBatch";
import type RelayResponse from "./RelayResponse";
export type RelayRequestAny = RelayRequest | RelayRequestBatch;
export type MiddlewareNextFn = (req: RelayRequestAny) => Promise<RelayResponse>;
export type Middleware = (next: MiddlewareNextFn) => MiddlewareNextFn;
export type MiddlewareRawNextFn = (req: RelayRequestAny) => Promise<FetchResponse>;
export type MiddlewareRaw = {
  isRawMiddleware: true;
};
export type MiddlewareSync = {
  execute: (operation: ConcreteBatch, variables: Variables, cacheConfig: CacheConfig, uploadables: UploadableMap | null | undefined) => ObservableFromValue<QueryPayload> | null | undefined;
};
export type FetchOpts = {
  url?: string;
  method: "POST" | "GET";
  headers: Record<string, string>;
  body: string | FormData;
  // Avaliable request modes in fetch options. For details see https://fetch.spec.whatwg.org/#requests
  credentials?: "same-origin" | "include" | "omit";
  mode?: "cors" | "websocket" | "navigate" | "no-cors" | "same-origin";
  cache?: "default" | "no-store" | "reload" | "no-cache" | "force-cache" | "only-if-cached";
  redirect?: "follow" | "error" | "manual";
  signal?: window.AbortSignal;
  [name: string]: unknown;
};
export type FetchResponse = Response;
export type GraphQLResponseErrors = Array<{
  message: string;
  locations?: Array<{
    column: number;
    line: number;
  }>;
  stack?: Array<string>;
}>;
export type GraphQLResponse = {
  data?: any;
  errors?: GraphQLResponseErrors;
};
export type RRNLResponseObject = {
  ok: any;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  url: string;
  payload: GraphQLResponse | null | undefined;
};
export type RNLExecuteFunction = (operation: ConcreteBatch, variables: Variables, cacheConfig: CacheConfig, uploadables?: UploadableMap | null | undefined) => RelayObservable<QueryPayload>;
// ///////////////////////////
// Relay Modern re-exports
// ///////////////////////////
export type Variables = Record<string, any>;
export type ConcreteBatch = {
  kind: "Batch";
  fragment: any;
  id: string | null | undefined;
  metadata: Record<string, unknown>;
  name: string;
  query: any;
  text: string | null | undefined;
  operationKind: string;
};
export type CacheConfig = {
  force?: boolean | null | undefined;
  poll?: number | null | undefined;
  rerunParamExperimental?: any | null | undefined;
  skipBatch?: boolean | null | undefined;
};
export type Disposable = {
  dispose(): void;
};
export type Uploadable = File | Blob;
export type UploadableMap = Record<string, Uploadable>;
export type PayloadData = Record<string, unknown>;
export type QueryPayload = {
  data?: PayloadData | null | undefined;
  errors?: Array<any>;
  rerunVariables?: Variables;
} | RelayResponse;
export type UnsubscribeFunction = () => void;
export type Sink<T> = {
  next: (value: T) => void;
  complete: () => void;
  error: (value: T) => void;
};
// this is workaround should be class from relay-runtime/network/RelayObservable.js
export type RelayObservable<T> = {
  subscribe: (sink: Sink<T>) => UnsubscribeFunction;
};
// Note: This should accept Subscribable<T> instead of RelayObservable<T>,
// however Flow cannot yet distinguish it from T.
export type ObservableFromValue<T> = RelayObservable<T> | Promise<T> | T;
export type FetchFunction = (operation: ConcreteBatch, variables: Variables, cacheConfig: CacheConfig, uploadables: UploadableMap | null | undefined) => ObservableFromValue<QueryPayload>;
export type FetchHookFunction = (operation: ConcreteBatch, variables: Variables, cacheConfig: CacheConfig, uploadables: UploadableMap | null | undefined) => void | ObservableFromValue<QueryPayload>;
// See SubscribeFunction type declaration in relay-runtime/network/RelayNetworkTypes.js
export type SubscribeFunction = (operation: ConcreteBatch, variables: Variables, cacheConfig: CacheConfig, observer: any) => RelayObservable<QueryPayload> | Disposable;