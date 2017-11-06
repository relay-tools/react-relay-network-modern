/* @flow */
/* eslint-disable no-param-reassign */

import fetchMock from 'fetch-mock';
import fetchWithMiddleware from '../fetchWithMiddleware';
import { mockReq } from '../__mocks__/mockReq';
import type { RRNLRequestObject } from '../definition';

function createMockReq(reqId): RRNLRequestObject {
  const relayRequest: any = mockReq(reqId);
  const req = {
    relayReqId: relayRequest.getID(),
    relayReqObj: relayRequest,
    relayReqType: 'query',
    method: 'POST',
    headers: {
      Accept: '*/*',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      id: relayRequest.getID(),
      query: relayRequest.getQueryString(),
      variables: relayRequest.getVariables(),
    }),
  };

  return req;
}

describe('fetchWithMiddleware', () => {
  beforeEach(() => {
    fetchMock.restore();
  });

  it('should make a successfull request without middlewares', async () => {
    fetchMock.post('/graphql', { id: 1, data: { user: 123 } });

    const data = await fetchWithMiddleware(createMockReq(1), []);
    expect(data).toEqual({ user: 123 });
  });

  it('should make a successfull request with middlewares', async () => {
    const numPlus5 = next => req =>
      next(req).then((res: any) => {
        res.payload.data.num += 5;
        return res;
      });
    const numMultiply10 = next => req =>
      next(req).then((res: any) => {
        res.payload.data.num *= 10;
        return res;
      });

    fetchMock.post('/graphql', { id: 1, data: { num: 1 } });

    const data = await fetchWithMiddleware(createMockReq(1), [
      numPlus5,
      numMultiply10, // should be first, when changing response
    ]);
    expect(data).toEqual({ num: 15 });
  });
});
