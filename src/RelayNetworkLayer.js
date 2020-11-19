/* @flow */

import { Network } from 'relay-runtime';
import { meros } from 'meros/browser';
import RelayRequest from './RelayRequest';
import fetchWithMiddleware from './fetchWithMiddleware';
import type {
  FetchFunction,
  FetchHookFunction,
  Middleware,
  MiddlewareRaw,
  MiddlewareSync,
  RNLExecuteFunction,
  SubscribeFunction,
} from './definition';
import { createRequestError } from './createRequestError';
import RRNLError from './RRNLError';

export type RelayNetworkLayerOpts = {|
  subscribeFn?: SubscribeFunction,
  beforeFetch?: FetchHookFunction,
  noThrow?: boolean,
|};

export default class RelayNetworkLayer {
  _middlewares: Middleware[];
  _rawMiddlewares: MiddlewareRaw[];
  _middlewaresSync: RNLExecuteFunction[];
  execute: RNLExecuteFunction;
  executeWithEvents: any;
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
    mws.forEach((mw) => {
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

      const shouldHandleError = (req, value) => {
        if (!this.noThrow && (!value || value.errors || !value.data)) {
          throw createRequestError(req, value);
        }
      };

      return {
        subscribe: (sink) => {
          const req = new RelayRequest(operation, variables, cacheConfig, uploadables);
          const res = fetchWithMiddleware(req, this._middlewares, this._rawMiddlewares);

          res
            .then(async (value) => {
              const parts = await meros(value._res);

              if (typeof parts === 'object' && typeof parts[Symbol.asyncIterator] < 'u') {
                // eslint-disable-next-line no-restricted-syntax
                for await (const { body, json } of parts) {
                  if (!json)
                    throw new RRNLError(
                      'failed parsing part:\n- this could either mean the multipart body had an incorrect Content-Type\n- or lack thereof'
                    );
                  const { data, path, hasNext, label, errors } = body;
                  const payload = {
                    data,
                    path,
                    label,
                    errors,
                    extensions: {
                      is_final: !hasNext,
                    },
                  };
                  shouldHandleError(req, payload);
                  sink.next(payload);
                }
              } else {
                shouldHandleError(req, value);
                sink.next(value);
              }
              sink.complete();
            })
            .catch((error) => {
              if (error && error.name && error.name === 'AbortError') {
                sink.complete();
              } else sink.error(error);
            });

          return () => {
            req.cancel();
          };
        },
      };
    };

    const network = Network.create(this.fetchFn, this.subscribeFn);
    this.execute = network.execute;
    this.executeWithEvents = network.executeWithEvents;
  }
}
