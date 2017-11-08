/* @flow */

import type { PayloadData } from './definition';

export default class RelayResponse {
  _res: any; // response from low-level method, eg. fetch

  data: ?PayloadData;
  errors: ?Array<any>;

  ok: any;
  status: number;
  statusText: ?string;
  headers: ?{ [name: string]: string };
  url: ?string;
  text: ?string;
  json: mixed;

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
      r.processJsonData(await res.json());
    }

    return r;
  }

  processJsonData(json: mixed) {
    this.json = json;
    if (json) {
      if (json.data) this.data = (json.data: any);
      if (json.errors) this.errors = (json.errors: any);
    }
  }

  clone(): RelayResponse {
    // $FlowFixMe
    return Object.assign(Object.create(Object.getPrototypeOf(this)), this);
  }

  toString(): string {
    return [
      `Response:`,
      `   Url: ${this.url || ''}`,
      `   Status code: ${this.status || ''}`,
      `   Status text: ${this.statusText || ''}`,
      `   Response headers: ${JSON.stringify(this.headers)}`,
      `   Response body: ${JSON.stringify(this.json)}`,
    ].join('\n');
  }
}
