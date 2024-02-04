import { Class } from "utility-types";
import type { ConcreteBatch, Variables, CacheConfig, UploadableMap, FetchOpts } from "./definition";
import RRNLError from "./RRNLError";

function getFormDataInterface(): Class<FormData> | null | undefined {
  return typeof window !== 'undefined' && window.FormData || global && global.FormData;
}

export default class RelayRequest {
  static lastGenId: number;
  id: string;
  fetchOpts: FetchOpts;
  operation: ConcreteBatch;
  variables: Variables;
  cacheConfig: CacheConfig;
  uploadables: UploadableMap | null | undefined;
  controller: window.AbortController | null | undefined;

  constructor(operation: ConcreteBatch, variables: Variables, cacheConfig: CacheConfig, uploadables?: UploadableMap | null | undefined) {
    this.operation = operation;
    this.variables = variables;
    this.cacheConfig = cacheConfig;
    this.uploadables = uploadables;
    this.id = this.operation.id || this.operation.name || this._generateID();
    const fetchOpts: FetchOpts = {
      method: 'POST',
      headers: {},
      body: this.prepareBody()
    };
    this.controller = typeof window !== 'undefined' && window.AbortController ? new window.AbortController() : null;
    if (this.controller) fetchOpts.signal = this.controller.signal;
    this.fetchOpts = fetchOpts;
  }

  getBody(): string | FormData {
    return this.fetchOpts.body;
  }

  prepareBody(): string | FormData {
    const {
      uploadables
    } = this;

    if (uploadables) {
      const _FormData_ = getFormDataInterface();

      if (!_FormData_) {
        throw new RRNLError('Uploading files without `FormData` interface does not supported.');
      }

      const formData = new _FormData_();
      formData.append('id', this.getID());
      formData.append('query', this.getQueryString());
      formData.append('variables', JSON.stringify(this.getVariables()));
      Object.keys(uploadables).forEach(key => {
        if (Object.prototype.hasOwnProperty.call(uploadables, key)) {
          formData.append(key, uploadables[key]);
        }
      });
      return formData;
    }

    return JSON.stringify({
      id: this.getID(),
      query: this.getQueryString(),
      variables: this.getVariables()
    });
  }

  getID(): string {
    return this.id;
  }

  _generateID(): string {
    if (!this.constructor.lastGenId) {
      this.constructor.lastGenId = 0;
    }

    this.constructor.lastGenId += 1;
    return this.constructor.lastGenId.toString();
  }

  getQueryString(): string {
    return this.operation.text || '';
  }

  getVariables(): Variables {
    return this.variables;
  }

  isMutation(): boolean {
    return this.operation.operationKind === 'mutation';
  }

  isFormData(): boolean {
    const _FormData_ = getFormDataInterface();

    return !!_FormData_ && this.fetchOpts.body instanceof _FormData_;
  }

  cancel(): boolean {
    if (this.controller) {
      this.controller.abort();
      return true;
    }

    return false;
  }

  clone(): RelayRequest {
    const newRequest = Object.assign(Object.create(Object.getPrototypeOf(this)), this);
    newRequest.fetchOpts = { ...this.fetchOpts
    };
    newRequest.fetchOpts.headers = { ...this.fetchOpts.headers
    };
    return (newRequest as any);
  }

}
