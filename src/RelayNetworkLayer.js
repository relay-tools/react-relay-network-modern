/* @flow */

import { Network } from 'relay-runtime';
import RelayRequest from './RelayRequest';
import fetchWithMiddleware from './fetchWithMiddleware';
import type {
  Middleware,
  FetchFunction,
  FetchHookFunction,
  SubscribeFunction,
  RNLExecuteFunction,
} from './definition';

type RelayNetworkLayerOpts = {|
  subscribeFn?: SubscribeFunction,
  beforeFetch?: FetchHookFunction,
|};

export default class RelayNetworkLayer {
  _middlewares: Middleware[];
  execute: RNLExecuteFunction;
  +fetchFn: FetchFunction;
  +subscribeFn: ?SubscribeFunction;
  beforeFetch: ?FetchHookFunction;

  constructor(middlewares: Array<?Middleware>, opts?: RelayNetworkLayerOpts) {
    this._middlewares = Array.isArray(middlewares) ? (middlewares: any) : [middlewares];

    if (opts) {
      this.subscribeFn = opts.subscribeFn;
      this.beforeFetch = opts.beforeFetch;
    }

    this.fetchFn = (operation, variables, cacheConfig, uploadables) => {
      if (this.beforeFetch) {
        const res = this.beforeFetch(operation, variables, cacheConfig, uploadables);
        if (res) return res;
      }

      const req = new RelayRequest(operation, variables, cacheConfig, uploadables);
      return fetchWithMiddleware(req, this._middlewares.filter(o => !!o));
    };

    const network = Network.create(this.fetchFn, this.subscribeFn);
    this.execute = network.execute;
  }
}
