/* @flow */

import type { ConcreteBatch, Variables, CacheConfig, UploadableMap, FetchOpts } from './definition';

export default class RelayRequest {
  operation: ConcreteBatch;
  variables: Variables;
  cacheConfig: CacheConfig;
  uploadables: ?UploadableMap;
  fetchOpts: $Shape<FetchOpts>;

  constructor(
    operation: ConcreteBatch,
    variables: Variables,
    cacheConfig: CacheConfig,
    uploadables?: ?UploadableMap
  ) {
    this.operation = operation;
    this.variables = variables;
    this.cacheConfig = cacheConfig;
    this.uploadables = uploadables;
    this.fetchOpts = {};
  }

  getDebugName(): string {
    // TODO
    return 'req.relayReqId';
  }

  getQueryString(): string {
    return this.operation.text;
  }
}
