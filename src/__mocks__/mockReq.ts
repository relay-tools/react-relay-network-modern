/* eslint-disable import/prefer-default-export, no-param-reassign */
import type RelayNetworkLayer from "../RelayNetworkLayer";
import type RelayResponse from "../RelayResponse";
import type { CacheConfig } from "../definition";
type ReqData = {
  query?: string;
  variables?: Record<string, any>;
  cacheConfig?: CacheConfig;
  files?: any;
};
type ReqId = string;

class MockReq {
  reqid: ReqId;
  reqData: ReqData;
  error: Error;
  payload: Record<string, any>;
  cacheConfig: Record<string, any>;

  constructor(reqid?: ReqId, reqData?: ReqData = {}) {
    this.reqid = reqid || Math.random().toString();
    this.reqData = reqData;
  }

  getID(): ReqId {
    return this.reqid;
  }

  getQueryString(): string {
    return this.reqData.query || '';
  }

  getDebugName(): string {
    return `debugname${this.reqid}`;
  }

  getVariables(): Record<string, any> {
    return this.reqData.variables || {};
  }

  getFiles(): any {
    return this.reqData.files;
  }

  reject(err: Error) {
    this.error = err;
  }

  resolve(resp: Record<string, any>) {
    this.payload = resp;
  }

  execute(rnl: RelayNetworkLayer): Promise<RelayResponse> {
    const text = this.getQueryString() || '';
    const operationKind = text.startsWith('mutation') ? 'mutation' : 'query';
    const operation = ({
      id: this.getID(),
      text,
      operationKind
    } as any);
    const variables = this.getVariables() || {};
    const cacheConfig = this.reqData.cacheConfig || {};
    const uploadables = this.getFiles();
    const res = (rnl.fetchFn(operation, variables, cacheConfig, uploadables) as any);
    const promise = new Promise((resolve, reject) => {
      res.subscribe({
        complete: () => {},
        error: error => reject(error),
        next: value => resolve(value)
      });
    });
    // avoid unhandled rejection in tests
    promise.catch(() => {});
    // but allow to read rejected response
    return promise;
  }

}

export function mockReq(reqid?: ReqId | number, data?: ReqData): MockReq {
  return new MockReq(reqid ? reqid.toString() : undefined, data);
}
export function mockMutationReq(reqid?: ReqId | number, data?: ReqData): MockReq {
  return new MockReq(reqid ? reqid.toString() : undefined, {
    query: 'mutation {}',
    ...data
  });
}
export function mockFormDataReq(reqid?: ReqId | number, data?: ReqData): MockReq {
  return new MockReq(reqid ? reqid.toString() : undefined, {
    files: {
      file1: 'data'
    },
    ...data
  });
}
export function mockReqWithSize(reqid: ReqId | number, size: number): MockReq {
  return mockReq(reqid, {
    query: `{${'x'.repeat(size)}}`
  });
}
export function mockReqWithFiles(reqid: ReqId | number): MockReq {
  return mockReq(reqid, {
    files: {
      file1: 'data',
      file2: 'data'
    }
  });
}