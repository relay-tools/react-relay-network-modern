/* @flow */

import fetchMock from 'fetch-mock';
import RelayNetworkLayer from '../../RelayNetworkLayer';
import { mockReq, mockMutationReq, mockFormDataReq } from '../../__mocks__/mockReq';
import cacheMiddleware from '../cache';

async function sleep(timeout: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, timeout);
  });
}

describe('middlewares/cache', () => {
  beforeEach(() => {
    fetchMock.restore();
  });

  it('check `size` option', async () => {
    fetchMock.mock({
      matcher: '/graphql',
      response: {
        status: 200,
        body: { data: 'PAYLOAD' },
      },
      method: 'POST',
    });

    const rnl = new RelayNetworkLayer([
      cacheMiddleware({
        size: 2,
      }),
    ]);

    // data from fetch
    const res1 = await mockReq('FirstQuery').execute(rnl);
    expect(res1.data).toBe('PAYLOAD');
    expect(fetchMock.calls('/graphql')).toHaveLength(1);

    // data from cache
    const res2 = await mockReq('FirstQuery').execute(rnl);
    expect(res2.data).toBe('PAYLOAD');
    expect(fetchMock.calls('/graphql')).toHaveLength(1);

    // data from fetch
    const res3 = await mockReq('SecondQuery').execute(rnl);
    expect(res3.data).toBe('PAYLOAD');
    expect(fetchMock.calls('/graphql')).toHaveLength(2);

    // data from cache
    const res4 = await mockReq('SecondQuery').execute(rnl);
    expect(res4.data).toBe('PAYLOAD');
    expect(fetchMock.calls('/graphql')).toHaveLength(2);

    // data from fetch
    const res5 = await mockReq('ThirdQuery').execute(rnl);
    expect(res5.data).toBe('PAYLOAD');
    expect(fetchMock.calls('/graphql')).toHaveLength(3);

    // first request should be removed from cache, cause size = 2
    const res6 = await mockReq('FirstQuery').execute(rnl);
    expect(res6.data).toBe('PAYLOAD');
    expect(fetchMock.calls('/graphql')).toHaveLength(4);
  });

  it('check `ttl` option', async () => {
    fetchMock.mock({
      matcher: '/graphql',
      response: {
        status: 200,
        body: { data: 'PAYLOAD' },
      },
      method: 'POST',
    });

    const rnl = new RelayNetworkLayer([
      cacheMiddleware({
        ttl: 20,
      }),
    ]);

    // data from fetch
    const res1 = await mockReq('FirstQuery').execute(rnl);
    expect(res1.data).toBe('PAYLOAD');
    expect(fetchMock.calls('/graphql')).toHaveLength(1);

    // data from cache
    const res2 = await mockReq('FirstQuery').execute(rnl);
    expect(res2.data).toBe('PAYLOAD');
    expect(fetchMock.calls('/graphql')).toHaveLength(1);

    await sleep(50);

    // first request should be removed from cache, cause ttl = 20
    const res3 = await mockReq('FirstQuery').execute(rnl);
    expect(res3.data).toBe('PAYLOAD');
    expect(fetchMock.calls('/graphql')).toHaveLength(2);
  });

  it('do not use cache for mutations', async () => {
    fetchMock.mock({
      matcher: '/graphql',
      response: {
        status: 200,
        body: { data: 'PAYLOAD' },
      },
      method: 'POST',
    });

    const rnl = new RelayNetworkLayer([cacheMiddleware()]);

    // data from fetch
    const res1 = await mockMutationReq('FirstQuery').execute(rnl);
    expect(res1.data).toBe('PAYLOAD');
    expect(fetchMock.calls('/graphql')).toHaveLength(1);

    // data from cache
    const res2 = await mockMutationReq('FirstQuery').execute(rnl);
    expect(res2.data).toBe('PAYLOAD');
    expect(fetchMock.calls('/graphql')).toHaveLength(2);
  });

  it('do not use cache for FormData', async () => {
    fetchMock.mock({
      matcher: '/graphql',
      response: {
        status: 200,
        body: { data: 'PAYLOAD' },
      },
      method: 'POST',
    });

    const rnl = new RelayNetworkLayer([cacheMiddleware()]);

    // data from fetch
    const res1 = await mockFormDataReq('FirstQuery').execute(rnl);
    expect(res1.data).toBe('PAYLOAD');
    expect(fetchMock.calls('/graphql')).toHaveLength(1);

    // data from cache
    const res2 = await mockFormDataReq('FirstQuery').execute(rnl);
    expect(res2.data).toBe('PAYLOAD');
    expect(fetchMock.calls('/graphql')).toHaveLength(2);
  });

  it('do not use cache for responses with errors', async () => {
    fetchMock.mock({
      matcher: '/graphql',
      response: {
        status: 200,
        body: { data: 'PAYLOAD', errors: [{ type: 'timeout' }] },
      },
      method: 'POST',
    });

    const rnl = new RelayNetworkLayer([cacheMiddleware()]);

    // try fetch
    await expect(mockReq('FirstQuery').execute(rnl)).rejects.toThrow();
    expect(fetchMock.calls('/graphql')).toHaveLength(1);

    // try fetch again
    await expect(mockReq('FirstQuery').execute(rnl)).rejects.toThrow();
    expect(fetchMock.calls('/graphql')).toHaveLength(2);
  });
});
