/* @flow */
/* eslint-disable no-param-reassign, no-use-before-define, prefer-template */

import type {
  RRNLRequestObjectMutation,
  RelayClassicRequest,
  MiddlewareNextFn,
} from './definition';

export default function mutation(
  relayRequest: RelayClassicRequest,
  fetchWithMiddleware: MiddlewareNextFn
): Promise<any> {
  const commonReq: $Shape<RRNLRequestObjectMutation> = {
    method: 'POST',
    relayReqId: relayRequest.getID ? relayRequest.getID() : `mutation${Math.random()}`,
    relayReqObj: relayRequest,
    relayReqType: 'mutation',
  };

  let req: RRNLRequestObjectMutation;
  if (hasFiles(relayRequest)) {
    req = mutationWithFiles(commonReq, relayRequest);
  } else {
    req = mutationWithoutFiles(commonReq, relayRequest);
  }

  return fetchWithMiddleware(req)
    .then(data => relayRequest.resolve({ response: data }))
    .catch(err => {
      relayRequest.reject(err);
      throw err;
    });
}

function hasFiles(relayRequest: RelayClassicRequest): boolean {
  return !!(relayRequest.getFiles && relayRequest.getFiles());
}

function mutationWithFiles(
  req: $Shape<RRNLRequestObjectMutation>,
  relayRequest: RelayClassicRequest
): RRNLRequestObjectMutation {
  req.headers = {};

  if (hasFiles(relayRequest)) {
    const files = relayRequest.getFiles();

    if (!global.FormData) {
      throw new Error('Uploading files without `FormData` not supported.');
    }
    const formData = new FormData();
    formData.append('id', req.relayReqId);
    formData.append('query', relayRequest.getQueryString());
    formData.append('variables', JSON.stringify(relayRequest.getVariables()));

    if (files) {
      Object.keys(files).forEach(filename => {
        if (Array.isArray(files[filename])) {
          files[filename].forEach(file => {
            formData.append(filename, file);
          });
        } else {
          formData.append(filename, files[filename]);
        }
      });
    }
    req.body = formData;
  }

  return req;
}

function mutationWithoutFiles(
  req: $Shape<RRNLRequestObjectMutation>,
  relayRequest: RelayClassicRequest
): RRNLRequestObjectMutation {
  req.headers = {
    Accept: '*/*',
    'Content-Type': 'application/json',
  };

  req.body = JSON.stringify({
    id: req.relayReqId,
    query: relayRequest.getQueryString(),
    variables: relayRequest.getVariables(),
  });
  return req;
}
