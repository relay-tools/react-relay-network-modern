/* @flow */

import { Network } from 'relay-runtime';
import RelayRequest from './RelayRequest';
import fetchWithMiddleware from './fetchWithMiddleware';
import type {
  Middleware,
  FetchFunction,
  SubscribeFunction,
  RNLExecuteFunction,
} from './definition';

export default class RelayNetworkLayer {
  _middlewares: Middleware[];
  execute: RNLExecuteFunction;
  fetchFn: FetchFunction;
  subscribeFn: ?SubscribeFunction;

  constructor(middlewares: Array<?Middleware>, subscribeFn?: SubscribeFunction) {
    this._middlewares = Array.isArray(middlewares) ? (middlewares: any) : [middlewares];
    this.subscribeFn = subscribeFn;

    this.fetchFn = (operation, variables, cacheConfig, uploadables) => {
      const req = new RelayRequest(operation, variables, cacheConfig, uploadables);
      return fetchWithMiddleware(req, this._middlewares.filter(o => !!o));
    };

    const network = Network.create(this.fetchFn, this.subscribeFn);
    this.execute = network.execute;
  }
}
