/* @flow */

import { Network } from 'relay-runtime'; // eslint-disable-line
import RelayRequest from './RelayRequest';
import fetchWithMiddleware from './fetchWithMiddleware';
import type {
  Middleware,
  MiddlewareSync,
  MiddlewareRaw,
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
  _rawMiddlewares: MiddlewareRaw[];
  _middlewaresSync: RNLExecuteFunction[];
  execute: RNLExecuteFunction;
  +fetchFn: FetchFunction;
  +subscribeFn: ?SubscribeFunction;
  +noThrow: boolean;

  constructor(
    middlewares: Array<?Middleware | MiddlewareSync | MiddlewareRaw>,
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
        } else if (mw.isRawMiddleware) {
          this._rawMiddlewares.push(mw);
        } else {
          this._middlewares.push(mw);
        }
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
