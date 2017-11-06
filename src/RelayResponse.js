/* @flow */

import type { GraphQLResponse, PayloadData } from './definition';

export default class RelayResponse {
  _res: any; // response from low-level method, eg. fetch

  data: ?PayloadData;
  errors: ?Array<any>;

  ok: any;
  status: ?number;
  statusText: ?string;
  headers: ?{ [name: string]: string };
  url: ?string;
  text: ?string;
  json: ?GraphQLResponse;

  static async createFromFetch(res: Object): Promise<RelayResponse> {
    const r = new RelayResponse();
    r._res = res;
    r.ok = res.ok;
    r.status = res.status;
    r.url = res.url;
    r.headers = res.headers;

    if (res.status < 200 || res.status >= 300) {
      r.text = await res.text();
    } else {
      const json = await res.json();
      if (json.data) r.data = json.data;
      if (json.errors) r.errors = json.errors;
    }

    return r;
  }

  toString(): string {
    return [
      `Response:`,
      `   Url: ${this.url || ''}`,
      `   Status code: ${this.status || ''}`,
      `   Status text: ${this.statusText || ''}`,
      `   Response headers: ${JSON.stringify(this.headers)}`,
      `   Payload: ${JSON.stringify(this.payload)}`,
    ].join('\n');
  }
}
