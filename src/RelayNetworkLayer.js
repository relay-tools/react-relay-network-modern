/* @flow */

import { Network } from 'relay-runtime';
import RelayRequest from './RelayRequest';
import fetchWithMiddleware from './fetchWithMiddleware';
import type {
  Middleware,
  RawMiddleware,
  MiddlewareSync,
  FetchFunction,
  FetchHookFunction,
  SubscribeFunction,
  RNLExecuteFunction,
} from './definition';

type RelayNetworkLayerOpts = {|
  subscribeFn?: SubscribeFunction,
  beforeFetch?: FetchHookFunction,
  noThrow?: boolean,
|};

export default class RelayNetworkLayer {
  _middlewares: Middleware[];
  _rawMiddlewares: RawMiddleware[];
  _middlewaresSync: RNLExecuteFunction[];
  execute: RNLExecuteFunction;
  +fetchFn: FetchFunction;
  +subscribeFn: ?SubscribeFunction;
  +noThrow: boolean;

  constructor(
    middlewares: Array<?Middleware | MiddlewareSync>,
    rawMiddlewares?: Array<?RawMiddleware>,
    opts?: RelayNetworkLayerOpts
  ) {
    this._middlewares = [];
    this._rawMiddlewares = [];
    this._middlewaresSync = [];
    this.noThrow = false;

    const mws = Array.isArray(middlewares) ? (middlewares: any) : [middlewares];
    mws.forEach(mw => {
      if (mw) {
        if (mw.execute) {
          this._middlewaresSync.push(mw.execute);
        } else {
          this._middlewares.push(mw);
        }
      }
    });

    const rmws = Array.isArray(rawMiddlewares) ? (rawMiddlewares: any) : [rawMiddlewares];
    rmws.forEach(rmw => {
      if (rmw) {
        this._rawMiddlewares.push(rmw);
      }
    });

    if (opts) {
      this.subscribeFn = opts.subscribeFn;
      this.noThrow = opts.noThrow === true;

      // TODO deprecate
      if (opts.beforeFetch) {
        this._middlewaresSync.push((opts.beforeFetch: any));
      }
    }

    this.fetchFn = (operation, variables, cacheConfig, uploadables) => {
      for (let i = 0; i < this._middlewaresSync.length; i++) {
        const res = this._middlewaresSync[i](operation, variables, cacheConfig, uploadables);
        if (res) return res;
      }

      const req = new RelayRequest(operation, variables, cacheConfig, uploadables);
      return fetchWithMiddleware(req, this._middlewares, this._rawMiddlewares, this.noThrow);
    };

    const network = Network.create(this.fetchFn, this.subscribeFn);
    this.execute = network.execute;
  }
}
