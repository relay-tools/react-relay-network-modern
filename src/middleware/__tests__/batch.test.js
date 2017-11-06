/* @flow */

import fetchMock from 'fetch-mock';
import FormData from 'form-data';
import { RelayNetworkLayer, batchMiddleware } from '../../';
import { mockReq, mockReqWithSize, mockReqWithFiles } from '../../__mocks__/mockReq';

global.FormData = FormData;

describe('batchMiddleware', () => {
  const rnl = new RelayNetworkLayer([batchMiddleware()]);

  beforeEach(() => {
    fetchMock.restore();
  });

  it('should make a successfull single request', async () => {
    fetchMock.post('/graphql', { data: { ok: 1 } });
    const req = mockReq();
    await rnl.sendQueries([req]);
    expect(req.payload).toEqual({ response: { ok: 1 } });
  });

  it('should make a successfully batch request', async () => {
    fetchMock.mock({
      matcher: '/graphql/batch',
      response: {
        status: 200,
        body: [{ id: 1, data: { ok: 1 } }, { id: 2, data: { ok: 2 } }],
      },
      method: 'POST',
    });

    const req1 = mockReq(1);
    const req2 = mockReq(2);
    await rnl.sendQueries([req1, req2]);
    expect(req1.payload).toEqual({ response: { ok: 1 } });
    expect(req2.payload).toEqual({ response: { ok: 2 } });
  });

  it('should make a successfully batch request with duplicate request ids', async () => {
    fetchMock.mock({
      matcher: '/graphql/batch',
      response: {
        status: 200,
        body: [{ id: 1, data: { ok: 1 } }, { id: 2, data: { ok: 2 } }],
      },
      method: 'POST',
    });

    const req1 = mockReq(1);
    const req2 = mockReq(2);
    const req3 = mockReq(2);

    await rnl.sendQueries([req1, req2, req3]);
    expect(req1.payload).toEqual({ response: { ok: 1 } });
    expect(req2.payload).toEqual({ response: { ok: 2 } });
    expect(req3.payload).toEqual({ response: { ok: 2 } });
  });

  it('should reject if server does not return response for request', async () => {
    fetchMock.mock({
      matcher: '/graphql/batch',
      response: {
        status: 200,
        body: [{ data: {} }, { id: 2, data: { ok: 2 } }],
      },
      method: 'POST',
    });

    const req1 = mockReq(1);
    const req2 = mockReq(2);
    await rnl.sendQueries([req1, req2]).catch(() => {});

    expect(req1.error).toBeInstanceOf(Error);
    expect(req1.error.toString()).toMatch('Server does not return response for request');
    expect(req2.payload).toEqual({ response: { ok: 2 } });
  });

  it('should reject if server does not return response for duplicate request ids', async () => {
    fetchMock.mock({
      matcher: '/graphql/batch',
      response: {
        status: 200,
        body: [{ data: {} }, { id: 2, data: { ok: 2 } }],
      },
      method: 'POST',
    });

    const req1 = mockReq(1);
    const req2 = mockReq(2);
    const req3 = mockReq(3);
    await rnl.sendQueries([req1, req2, req3]).catch(() => {});

    expect(req1.error).toBeInstanceOf(Error);
    expect(req1.error.toString()).toMatch('Server does not return response for request');
    expect(req2.payload).toEqual({ response: { ok: 2 } });
    expect(req3.error).toBeInstanceOf(Error);
    expect(req3.error.toString()).toMatch('Server does not return response for request');
  });

  it('should handle network failure', async () => {
    fetchMock.mock({
      matcher: '/graphql/batch',
      response: {
        throws: new Error('Network connection error'),
      },
      method: 'POST',
    });
    const req1 = mockReq(1);
    const req2 = mockReq(2);
    await rnl.sendQueries([req1, req2]).catch(() => {});

    expect(req1.error).toBeInstanceOf(Error);
    expect(req1.error.toString()).toMatch('Network connection error');
    expect(req2.error).toBeInstanceOf(Error);
    expect(req2.error.toString()).toMatch('Network connection error');
  });

  it('should handle server errors for one request', async () => {
    fetchMock.mock({
      matcher: '/graphql/batch',
      response: {
        status: 200,
        body: [
          {
            id: 1,
            payload: {
              errors: [{ location: 1, message: 'major error' }],
            },
          },
          { id: 2, payload: { data: { ok: 2 } } },
        ],
      },
      method: 'POST',
    });

    const req1 = mockReq(1);
    const req2 = mockReq(2);
    await rnl.sendQueries([req1, req2]).catch(() => {});

    expect(req1.error).toBeInstanceOf(Error);
    expect(req1.error.toString()).toMatch('major error');
    expect(req2.payload).toEqual({ response: { ok: 2 } });
    expect(req2.error).toBeUndefined();
  });

  it('should handle server errors for all requests', async () => {
    fetchMock.mock({
      matcher: '/graphql/batch',
      response: {
        status: 200,
        body: {
          errors: [{ location: 1, message: 'major error' }],
        },
      },
      method: 'POST',
    });

    const req1 = mockReq(1);
    const req2 = mockReq(2);
    const req3 = mockReq(3);

    await rnl.sendQueries([req1, req2, req3]).catch(() => {});

    expect(req1.error.toString()).toMatch('Wrong response');
    expect(req2.error.toString()).toMatch('Wrong response');
    expect(req3.error.toString()).toMatch('Wrong response');
  });

  it('should handle responses without payload wrapper', async () => {
    fetchMock.mock({
      matcher: '/graphql/batch',
      response: {
        status: 200,
        body: [
          {
            id: 1,
            errors: [{ location: 1, message: 'major error' }],
          },
          { id: 2, data: { ok: 2 } },
        ],
      },
      method: 'POST',
    });

    const req1 = mockReq(1);
    const req2 = mockReq(2);

    await rnl.sendQueries([req1, req2]).catch(() => {});

    expect(req1.error).toBeInstanceOf(Error);
    expect(req1.error.toString()).toMatch('major error');
    expect(req2.payload).toEqual({ response: { ok: 2 } });
    expect(req2.error).toBeUndefined();
  });

  describe('option `batchTimeout`', () => {
    beforeEach(() => {
      fetchMock.restore();
    });

    it('should gather different requests into one batch request', async () => {
      fetchMock.mock({
        matcher: '/graphql/batch',
        response: {
          status: 200,
          body: [{ id: 1, data: {} }, { id: 2, data: {} }, { id: 3, data: {} }],
        },
        method: 'POST',
      });

      const rnl2 = new RelayNetworkLayer([batchMiddleware({ batchTimeout: 50 })]);
      rnl2.sendQueries([mockReq(1)]);
      setTimeout(() => rnl2.sendQueries([mockReq(2)]), 30);

      await rnl2.sendQueries([mockReq(3)]);

      const reqs = fetchMock.calls('/graphql/batch');
      expect(reqs).toHaveLength(1);
      expect(reqs[0][1].body).toEqual(
        '[{"id":"1","query":"{}","variables":{}},{"id":"2","query":"{}","variables":{}},{"id":"3","query":"{}","variables":{}}]'
      );
    });

    it('should gather different requests into two batch request', async () => {
      fetchMock.mock({
        matcher: '/graphql/batch',
        response: {
          status: 200,
          body: [
            { id: 1, data: {} },
            { id: 2, data: {} },
            { id: 3, data: {} },
            { id: 4, data: {} },
          ],
        },
        method: 'POST',
      });

      const rnl2 = new RelayNetworkLayer([batchMiddleware({ batchTimeout: 50 })]);
      rnl2.sendQueries([mockReq(1)]);
      setTimeout(() => rnl2.sendQueries([mockReq(2)]), 60);
      setTimeout(() => rnl2.sendQueries([mockReq(3)]), 70);
      rnl2.sendQueries([mockReq(4)]);

      await new Promise((resolve, reject) => {
        setTimeout(() => {
          try {
            const reqs = fetchMock.calls('/graphql/batch');
            expect(reqs).toHaveLength(2);
            expect(reqs[0][1].body).toBe(
              '[{"id":"1","query":"{}","variables":{}},{"id":"4","query":"{}","variables":{}}]'
            );
            expect(reqs[1][1].body).toBe(
              '[{"id":"2","query":"{}","variables":{}},{"id":"3","query":"{}","variables":{}}]'
            );
            resolve();
          } catch (e) {
            reject(e);
          }
        }, 200);
      });
    });
  });

  describe('option `maxBatchSize`', () => {
    const rnl3 = new RelayNetworkLayer([batchMiddleware({ maxBatchSize: 1024 * 10 })]);

    beforeEach(() => {
      fetchMock.restore();
    });

    it('should split large batched requests into multiple requests', async () => {
      fetchMock.mock({
        matcher: '/graphql',
        response: {
          status: 200,
          body: { id: 5, data: {} },
        },
        method: 'POST',
      });

      fetchMock.mock({
        matcher: '/graphql/batch',
        response: {
          status: 200,
          body: [
            { id: 1, data: {} },
            { id: 2, data: {} },
            { id: 3, data: {} },
            { id: 4, data: {} },
          ],
        },
        method: 'POST',
      });

      const req1 = mockReqWithSize(1, 1024 * 7);
      const req2 = mockReqWithSize(2, 1024 * 2);
      const req3 = mockReqWithSize(3, 1024 * 5);
      const req4 = mockReqWithSize(4, 1024 * 4);
      const req5 = mockReqWithSize(5, 1024 * 11);

      await rnl3.sendQueries([req1, req2, req3, req4, req5]);

      const batchReqs = fetchMock.calls('/graphql/batch');
      const singleReqs = fetchMock.calls('/graphql');
      expect(batchReqs).toHaveLength(2);
      expect(singleReqs).toHaveLength(1);
    });
  });

  describe('option `allowMutations`', () => {
    beforeEach(() => {
      fetchMock.restore();
    });

    it('should not batch mutations by default', async () => {
      const rnlTimeout20 = new RelayNetworkLayer([batchMiddleware({ batchTimeout: 20 })]);

      fetchMock.mock({
        matcher: '/graphql',
        response: {
          status: 200,
          body: { id: 1, data: {} },
        },
        method: 'POST',
      });

      const req1 = mockReqWithFiles(1);
      rnlTimeout20.sendMutation(req1);
      const req2 = mockReqWithFiles(1);

      await rnlTimeout20.sendMutation(req2);

      const singleReqs = fetchMock.calls('/graphql');
      expect(singleReqs).toHaveLength(2);
    });

    it('should batch mutations if `allowMutations=true`', async () => {
      const rnlAllowMutations = new RelayNetworkLayer([
        batchMiddleware({ batchTimeout: 20, allowMutations: true }),
      ]);

      fetchMock.mock({
        matcher: '/graphql/batch',
        response: {
          status: 200,
          body: [{ id: 1, data: {} }, { id: 2, data: {} }],
        },
        method: 'POST',
      });

      const req1 = mockReq(1);
      rnlAllowMutations.sendMutation(req1);
      const req2 = mockReq(2);

      await rnlAllowMutations.sendMutation(req2);

      const batchReqs = fetchMock.calls('/graphql/batch');
      expect(batchReqs).toHaveLength(1);
    });

    it('should not batch mutations with files if `allowMutations=true`', async () => {
      const rnlAllowMutations = new RelayNetworkLayer([
        batchMiddleware({ batchTimeout: 20, allowMutations: true }),
      ]);

      fetchMock.mock({
        matcher: '/graphql',
        response: {
          status: 200,
          body: { id: 1, data: {} },
        },
        method: 'POST',
      });

      const req1 = mockReqWithFiles(1);
      rnlAllowMutations.sendMutation(req1);
      const req2 = mockReqWithFiles(1);

      await rnlAllowMutations.sendMutation(req2);

      const singleReqs = fetchMock.calls('/graphql');
      expect(singleReqs).toHaveLength(2);
    });
  });
});
