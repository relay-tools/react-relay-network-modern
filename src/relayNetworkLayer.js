/* @flow */

import queries from './relayQueries';
import mutation from './relayMutation';
import fetchWithMiddleware from './fetchWithMiddleware';
import type { Middleware, RelayClassicRequest } from './definition';

export type RRNLOptions = {};

export default class RelayNetworkLayer {
  _options: RRNLOptions;
  _middlewares: Middleware[];
  _supportedOptions: string[];
  supports: Function;
  sendQueries: Function;
  sendMutation: Function;

  constructor(middlewares: Middleware[] | Middleware, options?: RRNLOptions) {
    this._options = options || {};
    this._middlewares = Array.isArray(middlewares) ? middlewares : [middlewares];
    this._supportedOptions = [];

    this._middlewares.forEach(mw => {
      if (mw && mw.supports) {
        if (Array.isArray(mw.supports)) {
          this._supportedOptions.push(...mw.supports);
        } else {
          this._supportedOptions.push(mw.supports);
        }
      }
    });

    this.supports = this.supports.bind(this);
    this.sendQueries = this.sendQueries.bind(this);
    this.sendMutation = this.sendMutation.bind(this);
  }

  supports(...options: string[]) {
    return options.every(option => this._supportedOptions.indexOf(option) !== -1);
  }

  sendQueries(requests: RelayClassicRequest[]): Promise<any> {
    return queries(requests, req => fetchWithMiddleware(req, this._middlewares));
  }

  sendMutation(request: RelayClassicRequest): Promise<any> {
    return mutation(request, req => fetchWithMiddleware(req, this._middlewares));
  }
}
