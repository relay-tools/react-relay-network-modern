/* @flow */

import fetchMock from 'fetch-mock';
import FormData from 'form-data';
import { RelayNetworkLayer, batchMiddleware } from '../..';
import {
  mockReq,
  mockReqWithSize,
  mockMutationReq,
  mockReqWithFiles,
} from '../../__mocks__/mockReq';

global.FormData = FormData;

describe('middlewares/batch', () => {
  beforeEach(() => {
    fetchMock.restore();
  });

  it('should make a successfull single request', async () => {
    fetchMock.post('/graphql', { data: { ok: 1 } });
    const rnl = new RelayNetworkLayer([batchMiddleware()]);
    const req = mockReq(1);
    const res = await req.execute(rnl);
    expect(res.data).toEqual({ ok: 1 });
    expect(fetchMock.lastOptions()).toMatchSnapshot();
  });

  it('should make a successfully batch request', async () => {
    fetchMock.mock({
      matcher: '/graphql/batch',
      response: {
        status: 200,
        body: [{ data: { ok: 1 } }, { data: { ok: 2 } }],
      },
      method: 'POST',
    });
    const rnl = new RelayNetworkLayer([batchMiddleware()]);
    const req1 = mockReq(1);
    const req2 = mockReq(2);
    const [res1, res2] = await Promise.all([req1.execute(rnl), req2.execute(rnl)]);
    expect(res1.data).toEqual({ ok: 1 });
    expect(res2.data).toEqual({ ok: 2 });
    expect(fetchMock.lastOptions()).toMatchSnapshot();
  });

  it('should make a successfully batch request with duplicate request payloads', async () => {
    fetchMock.mock({
      matcher: '/graphql/batch',
      response: {
        status: 200,
        body: [{ data: { ok: 1 } }, { data: { ok: 2 } }],
      },
      method: 'POST',
    });
    const rnl = new RelayNetworkLayer([batchMiddleware()]);
    const req1 = mockReq(2);
    const req2 = mockReq(2, { query: 'duplicate', variables: { duplicate: true } });
    const req3 = mockReq(2, { query: 'duplicate', variables: { duplicate: true } });

    const [res1, res2, res3] = await Promise.all([
      req1.execute(rnl),
      req2.execute(rnl),
      req3.execute(rnl),
    ]);

    expect(res1.data).toEqual({ ok: 1 });
    expect(res2.data).toEqual({ ok: 2 });
    expect(res3.data).toEqual({ ok: 2 });
    expect(fetchMock.lastOptions()).toMatchSnapshot();
  });

  it('should reject if server does not return response for request', async () => {
    fetchMock.mock({
      matcher: '/graphql/batch',
      response: {
        status: 200,
        body: [{ data: { ok: 1 } }],
      },
      method: 'POST',
    });

    const rnl = new RelayNetworkLayer([batchMiddleware()]);
    const req1 = mockReq(1);
    const req2 = mockReq(2);

    // prettier-ignore
    const [res1, res2] = await Promise.all([
      req1.execute(rnl),
      req2.execute(rnl).catch(e => e),
    ])

    expect(res1.data).toEqual({ ok: 1 });
    expect(res2).toBeInstanceOf(Error);
    expect(res2.toString()).toMatch('Server does not return response for request');
    expect(fetchMock.lastOptions()).toMatchSnapshot();
  });

  it('should reject if server does not return response for duplicate request payloads', async () => {
    fetchMock.mock({
      matcher: '/graphql/batch',
      response: {
        status: 200,
        body: [{ data: { ok: 1 } }],
      },
      method: 'POST',
    });

    const rnl = new RelayNetworkLayer([batchMiddleware()]);
    const req1 = mockReq(1);
    const req2 = mockReq(2);
    const req3 = mockReq(3);
    const [res1, res2, res3] = await Promise.all([
      req1.execute(rnl),
      req2.execute(rnl).catch((e) => e),
      req3.execute(rnl).catch((e) => e),
    ]);

    expect(res1.data).toEqual({ ok: 1 });
    expect(res2).toBeInstanceOf(Error);
    expect(res2.toString()).toMatch('Server does not return response for request');
    expect(res3).toBeInstanceOf(Error);
    expect(res3.toString()).toMatch('Server does not return response for request');
    expect(fetchMock.lastOptions()).toMatchSnapshot();
  });

  it('should handle network failure', async () => {
    fetchMock.mock({
      matcher: '/graphql/batch',
      response: {
        throws: new Error('Network connection error'),
      },
      method: 'POST',
    });

    const rnl = new RelayNetworkLayer([batchMiddleware()]);
    const req1 = mockReq(1);
    const req2 = mockReq(2);
    const [res1, res2] = await Promise.all([
      req1.execute(rnl).catch((e) => e),
      req2.execute(rnl).catch((e) => e),
    ]);

    expect(res1).toBeInstanceOf(Error);
    expect(res1.toString()).toMatch('Network connection error');
    expect(res2).toBeInstanceOf(Error);
    expect(res2.toString()).toMatch('Network connection error');
    expect(fetchMock.lastOptions()).toMatchSnapshot();
  });

  it('should handle server errors for one request', async () => {
    fetchMock.mock({
      matcher: '/graphql/batch',
      response: {
        status: 200,
        body: [
          {
            payload: {
              errors: [{ location: 1, message: 'major error' }],
            },
          },
          { payload: { data: { ok: 2 } } },
        ],
      },
      method: 'POST',
    });

    const rnl = new RelayNetworkLayer([batchMiddleware()]);
    const req1 = mockReq(1);
    const req2 = mockReq(2);
    // prettier-ignore
    const [res1, res2] = await Promise.all([
      req1.execute(rnl).catch(e => e),
      req2.execute(rnl),
    ])

    expect(res1).toBeInstanceOf(Error);
    expect(res1.toString()).toMatch('major error');
    expect(res2.data).toEqual({ ok: 2 });
    expect(res2.errors).toBeUndefined();
    expect(fetchMock.lastOptions()).toMatchSnapshot();
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

    const rnl = new RelayNetworkLayer([batchMiddleware()]);
    const req1 = mockReq(1);
    const req2 = mockReq(2);
    const req3 = mockReq(3);

    const [res1, res2, res3] = await Promise.all([
      req1.execute(rnl).catch((e) => e),
      req2.execute(rnl).catch((e) => e),
      req3.execute(rnl).catch((e) => e),
    ]);

    expect(res1.toString()).toMatch('Wrong response');
    expect(res2.toString()).toMatch('Wrong response');
    expect(res3.toString()).toMatch('Wrong response');
    expect(fetchMock.lastOptions()).toMatchSnapshot();
  });

  it('should handle responses without payload wrapper', async () => {
    fetchMock.mock({
      matcher: '/graphql/batch',
      response: {
        status: 200,
        body: [
          {
            errors: [{ location: 1, message: 'major error' }],
          },
          { data: { ok: 2 } },
        ],
      },
      method: 'POST',
    });

    const rnl = new RelayNetworkLayer([batchMiddleware()]);
    const req1 = mockReq(1);
    const req2 = mockReq(2);
    // prettier-ignore
    const [res1, res2] = await Promise.all([
      req1.execute(rnl).catch(e => e),
      req2.execute(rnl),
    ])

    expect(res1).toBeInstanceOf(Error);
    expect(res1.toString()).toMatch('major error');
    expect(res2.data).toEqual({ ok: 2 });
    expect(res2.errors).toBeUndefined();
    expect(fetchMock.lastOptions()).toMatchSnapshot();
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
          body: [{ data: {} }, { data: {} }, { data: {} }],
        },
        method: 'POST',
      });

      const rnl = new RelayNetworkLayer([batchMiddleware({ batchTimeout: 50 })]);
      mockReq(1).execute(rnl);
      setTimeout(() => mockReq(2).execute(rnl), 30);

      await mockReq(3).execute(rnl);

      const reqs = fetchMock.calls('/graphql/batch');
      expect(reqs).toHaveLength(1);
      expect(fetchMock.lastOptions()).toMatchSnapshot();
    });

    it('should gather different requests into two batch request', async () => {
      fetchMock.mock({
        matcher: '/graphql/batch',
        response: {
          status: 200,
          body: [{ data: {} }, { data: {} }, { data: {} }, { data: {} }],
        },
        method: 'POST',
      });

      const rnl = new RelayNetworkLayer([batchMiddleware({ batchTimeout: 100 })]);
      mockReq(1).execute(rnl);
      setTimeout(() => mockReq(2).execute(rnl), 160);
      setTimeout(() => mockReq(3).execute(rnl), 170);
      mockReq(4).execute(rnl);

      await new Promise((resolve, reject) => {
        setTimeout(() => {
          try {
            const reqs = fetchMock.calls('/graphql/batch');
            expect(reqs).toHaveLength(2);
            expect(fetchMock.calls('/graphql/batch')).toMatchSnapshot();
            resolve();
          } catch (e) {
            reject(e);
          }
        }, 300);
      });
    });
  });

  describe('option `maxBatchSize`', () => {
    beforeEach(() => {
      fetchMock.restore();
    });

    it('should split large batched requests into multiple requests', async () => {
      fetchMock.mock({
        matcher: '/graphql',
        response: {
          status: 200,
          body: { data: {} },
        },
        method: 'POST',
      });

      fetchMock.mock({
        matcher: '/graphql/batch',
        response: {
          status: 200,
          body: [{ data: {} }, { data: {} }, { data: {} }, { data: {} }],
        },
        method: 'POST',
      });

      const rnl = new RelayNetworkLayer([batchMiddleware({ maxBatchSize: 1024 * 10 })]);
      const req1 = mockReqWithSize(1, 1024 * 7);
      const req2 = mockReqWithSize(2, 1024 * 2);
      const req3 = mockReqWithSize(3, 1024 * 5);
      const req4 = mockReqWithSize(4, 1024 * 4);
      const req5 = mockReqWithSize(5, 1024 * 11);

      await Promise.all([
        req1.execute(rnl),
        req2.execute(rnl),
        req3.execute(rnl),
        req4.execute(rnl),
        req5.execute(rnl),
      ]);

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
      fetchMock.mock({
        matcher: '/graphql',
        response: {
          status: 200,
          body: { data: {} },
        },
        method: 'POST',
      });

      const rnl = new RelayNetworkLayer([batchMiddleware({ batchTimeout: 20 })]);
      mockMutationReq(1).execute(rnl);
      await mockMutationReq(1).execute(rnl);
      const singleReqs = fetchMock.calls('/graphql');
      expect(singleReqs).toHaveLength(2);
      expect(fetchMock.calls('/graphql')).toMatchSnapshot();
    });

    it('should not batch requests with FormData', async () => {
      fetchMock.mock({
        matcher: '/graphql',
        response: {
          status: 200,
          body: { data: {} },
        },
        method: 'POST',
      });

      const rnl = new RelayNetworkLayer([batchMiddleware({ batchTimeout: 20 })]);
      mockReqWithFiles(1).execute(rnl);
      await mockReqWithFiles(1).execute(rnl);
      const singleReqs = fetchMock.calls('/graphql');
      expect(singleReqs).toHaveLength(2);
    });

    it('should batch mutations if `allowMutations=true`', async () => {
      fetchMock.mock({
        matcher: '/graphql/batch',
        response: {
          status: 200,
          body: [{ data: {} }, { data: {} }],
        },
        method: 'POST',
      });

      const rnl = new RelayNetworkLayer([
        batchMiddleware({ batchTimeout: 20, allowMutations: true }),
      ]);
      const req1 = mockMutationReq(1);
      req1.execute(rnl);
      const req2 = mockMutationReq(2);
      await req2.execute(rnl);

      const batchReqs = fetchMock.calls('/graphql/batch');
      expect(batchReqs).toHaveLength(1);
      expect(fetchMock.lastOptions()).toMatchSnapshot();
    });

    it('should not batch mutations with files if `allowMutations=true`', async () => {
      fetchMock.mock({
        matcher: '/graphql',
        response: {
          status: 200,
          body: { data: {} },
        },
        method: 'POST',
      });

      const rnl = new RelayNetworkLayer([
        batchMiddleware({ batchTimeout: 20, allowMutations: true }),
      ]);

      const req1 = mockMutationReq(1, { files: { file1: 'data' } });
      req1.execute(rnl);
      const req2 = mockMutationReq(2, { files: { file1: 'data' } });
      await req2.execute(rnl);

      const singleReqs = fetchMock.calls('/graphql');
      expect(singleReqs).toHaveLength(2);
    });
  });

  it('should pass fetch options', async () => {
    fetchMock.mock({
      matcher: '/graphql/batch',
      response: {
        status: 200,
        body: [{ data: {} }, { data: {} }],
      },
      method: 'POST',
    });

    const rnl = new RelayNetworkLayer([
      batchMiddleware({
        batchTimeout: 20,
        credentials: 'include',
        mode: 'cors',
        cache: 'no-store',
        redirect: 'follow',
      }),
    ]);
    const req1 = mockReq(1);
    req1.execute(rnl);
    const req2 = mockReq(2);
    await req2.execute(rnl);

    const batchReqs = fetchMock.calls('/graphql/batch');
    expect(batchReqs).toHaveLength(1);
    expect(fetchMock.lastOptions()).toEqual(
      expect.objectContaining({
        credentials: 'include',
        mode: 'cors',
        cache: 'no-store',
        redirect: 'follow',
      })
    );
  });

  describe('headers option', () => {
    it('`headers` option as Object', async () => {
      fetchMock.mock({
        matcher: '/graphql/batch',
        response: {
          status: 200,
          body: [{ data: {} }, { data: {} }],
        },
        method: 'POST',
      });
      const rnl = new RelayNetworkLayer([
        batchMiddleware({
          headers: {
            'custom-header': '123',
          },
        }),
      ]);
      const req1 = mockReq(1);
      const req2 = mockReq(2);
      await Promise.all([req1.execute(rnl), req2.execute(rnl)]);
      expect(fetchMock.lastOptions().headers).toEqual(
        expect.objectContaining({
          'custom-header': '123',
        })
      );
    });

    it('`headers` option as thunk', async () => {
      fetchMock.mock({
        matcher: '/graphql/batch',
        response: {
          status: 200,
          body: [{ data: {} }, { data: {} }],
        },
        method: 'POST',
      });
      const rnl = new RelayNetworkLayer([
        batchMiddleware({
          headers: () => ({
            'thunk-header': '333',
          }),
        }),
      ]);
      const req1 = mockReq(1);
      const req2 = mockReq(2);
      await Promise.all([req1.execute(rnl), req2.execute(rnl)]);
      expect(fetchMock.lastOptions().headers).toEqual(
        expect.objectContaining({
          'thunk-header': '333',
        })
      );
    });

    it('`headers` option as thunk with Promise', async () => {
      fetchMock.mock({
        matcher: '/graphql/batch',
        response: {
          status: 200,
          body: [{ data: {} }, { data: {} }],
        },
        method: 'POST',
      });
      const rnl = new RelayNetworkLayer([
        batchMiddleware({
          headers: () =>
            Promise.resolve({
              'thunk-header': 'as promise',
            }),
        }),
      ]);
      const req1 = mockReq(1);
      const req2 = mockReq(2);
      await Promise.all([req1.execute(rnl), req2.execute(rnl)]);
      expect(fetchMock.lastOptions().headers).toEqual(
        expect.objectContaining({
          'thunk-header': 'as promise',
        })
      );
    });
  });
});
