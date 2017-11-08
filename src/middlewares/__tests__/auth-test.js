/* @flow */

import fetchMock from 'fetch-mock';
import { RelayNetworkLayer } from '../../';
import { mockReq } from '../../__mocks__/mockReq';
import authMiddleware from '../auth';

describe('Middleware / auth', () => {
  beforeEach(() => {
    fetchMock.restore();
  });

  it('`token` option as string (with default `prefix` and `header`)', async () => {
    fetchMock.mock({
      matcher: '/graphql',
      response: {
        status: 200,
        body: { data: 'PAYLOAD' },
      },
      method: 'POST',
    });

    const rnl = new RelayNetworkLayer([
      authMiddleware({
        token: '123',
        tokenRefreshPromise: () => '345',
      }),
    ]);

    const req = mockReq(1);
    const res = await req.execute(rnl);

    expect(res.data).toEqual('PAYLOAD');
    const reqs = fetchMock.calls('/graphql');
    expect(reqs).toHaveLength(1);
    expect(reqs[0][1].headers.Authorization).toBe('Bearer 123');
    expect(fetchMock.lastOptions()).toMatchSnapshot();
  });

  it('`token` option as thunk (with custom `prefix` and `header`)', async () => {
    fetchMock.mock({
      matcher: '/graphql',
      response: {
        status: 200,
        body: { data: 'PAYLOAD' },
      },
      method: 'POST',
    });

    const rnl = new RelayNetworkLayer([
      authMiddleware({
        token: () => Promise.resolve('333'),
        tokenRefreshPromise: () => '345',
        prefix: 'MyBearer ',
        header: 'MyAuthorization',
      }),
    ]);

    const req = mockReq(1);
    const res = await req.execute(rnl);

    expect(res.data).toEqual('PAYLOAD');
    const reqs = fetchMock.calls('/graphql');
    expect(reqs).toHaveLength(1);
    expect(reqs[0][1].headers.MyAuthorization).toBe('MyBearer 333');
    expect(fetchMock.lastOptions()).toMatchSnapshot();
  });

  it('`tokenRefreshPromise` should be called on 401 response', async () => {
    fetchMock.mock({
      matcher: '/graphql',
      response: (_, opts) => {
        if (opts.headers.Authorization === 'Bearer ValidToken') {
          return {
            status: 200,
            body: { data: 'PAYLOAD' },
          };
        }
        return { status: 401 };
      },
      method: 'POST',
    });

    const rnl = new RelayNetworkLayer([
      authMiddleware({
        token: '123',
        tokenRefreshPromise: () => Promise.resolve('ValidToken'),
      }),
    ]);

    const req = mockReq(1);
    await req.execute(rnl);
    const reqs = fetchMock.calls('/graphql');
    expect(reqs).toHaveLength(2);
    expect(reqs[0][1].headers.Authorization).toBe('Bearer 123');
    expect(reqs[1][1].headers.Authorization).toBe('Bearer ValidToken');
    expect(fetchMock.calls('/graphql')).toMatchSnapshot();
  });
});
