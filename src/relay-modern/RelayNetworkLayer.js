/* @flow */

import { Network } from 'relay-runtime';
import type { Middleware } from '../definition';

export type Variables = { [name: string]: $FlowFixMe };
export type ConcreteBatch = any;
export type CacheConfig = {
  force?: ?boolean,
  poll?: ?number,
  rerunParamExperimental?: ?any,
};
export type Disposable = { dispose(): void };
export type Uploadable = File | Blob;
export type UploadableMap = { [key: string]: Uploadable };
export type PayloadData = { [key: string]: mixed };
export type QueryPayload = {|
  data?: ?PayloadData,
  errors?: Array<any>,
  rerunVariables?: Variables,
|};
// this is workaround should be class from relay-runtime/network/RelayObservable.js
export type RelayObservable<T> = Promise<T>;
// Note: This should accept Subscribable<T> instead of RelayObservable<T>,
// however Flow cannot yet distinguish it from T.
export type ObservableFromValue<T> = RelayObservable<T> | Promise<T> | T;
export type FetchFunction = (
  operation: ConcreteBatch,
  variables: Variables,
  cacheConfig: CacheConfig,
  uploadables: ?UploadableMap
) => ObservableFromValue<QueryPayload>;
// See SubscribeFunction type declaration in relay-runtime/network/RelayNetworkTypes.js
export type SubscribeFunction = (
  operation: ConcreteBatch,
  variables: Variables,
  cacheConfig: CacheConfig,
  observer: any
) => RelayObservable<QueryPayload> | Disposable;

export default class RelayModernNetworkLayer {
  _middlewares: Middleware[];
  execute: (
    operation: ConcreteBatch,
    variables: Variables,
    cacheConfig: CacheConfig,
    uploadables?: ?UploadableMap
  ) => RelayObservable<QueryPayload>;

  constructor(middlewares: Middleware[] | Middleware, subscribeFn?: SubscribeFunction) {
    this._middlewares = Array.isArray(middlewares) ? middlewares : [middlewares];

    const fetchFn: FetchFunction = (operation, variables, cacheConfig, uploadables) => {
      return Promise.resolve({});
    };

    this.execute = Network.create(fetchFn, subscribeFn);
  }
}
