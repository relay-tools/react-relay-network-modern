/* @flow */

import fetchMock from 'fetch-mock';
import { RelayNetworkLayer } from '../../';
import { mockReq } from '../../__mocks__/mockReq';
import authMiddleware from '../../middleware/auth';

describe('Middleware / auth', () => {
  describe('`token` option as string (with default `prefix` and `header`)', () => {
    const rnl = new RelayNetworkLayer([
      authMiddleware({
        token: '123',
        tokenRefreshPromise: () => '345',
      }),
    ]);

    beforeEach(() => {
      fetchMock.restore();

      fetchMock.mock({
        matcher: '/graphql',
        response: {
          status: 200,
          body: { data: 'PAYLOAD' },
          sendAsJson: true,
        },
        method: 'POST',
      });
    });

    it('should work with query', async () => {
      const req1 = mockReq();
      await rnl.sendQueries([req1]);

      expect(req1.payload).toEqual({ response: 'PAYLOAD' });
      const reqs = fetchMock.calls('/graphql');
      expect(reqs).toHaveLength(1);
      expect(reqs[0][1].headers.Authorization).toBe('Bearer 123');
    });

    it('should work with mutation', async () => {
      const req1 = mockReq();
      await rnl.sendMutation(req1);

      expect(req1.payload).toEqual({ response: 'PAYLOAD' });
      const reqs = fetchMock.calls('/graphql');
      expect(reqs).toHaveLength(1);
      expect(reqs[0][1].headers.Authorization).toBe('Bearer 123');
    });
  });

  describe('`token` option as thunk (with custom `prefix` and `header`)', () => {
    const rnl = new RelayNetworkLayer([
      authMiddleware({
        token: () => '333',
        tokenRefreshPromise: () => '345',
        prefix: 'MyBearer ',
        header: 'MyAuthorization',
      }),
    ]);

    beforeEach(() => {
      fetchMock.restore();

      fetchMock.mock({
        matcher: '/graphql',
        response: {
          status: 200,
          body: { data: 'PAYLOAD' },
          sendAsJson: true,
        },
        method: 'POST',
      });
    });

    it('should work with query', async () => {
      const req1 = mockReq();
      await rnl.sendQueries([req1]);

      expect(req1.payload).toEqual({ response: 'PAYLOAD' });
      const reqs = fetchMock.calls('/graphql');
      expect(reqs).toHaveLength(1);
      expect(reqs[0][1].headers.MyAuthorization).toBe('MyBearer 333');
    });

    it('should work with mutation', async () => {
      const req1 = mockReq();
      await rnl.sendMutation(req1);

      expect(req1.payload).toEqual({ response: 'PAYLOAD' });
      const reqs = fetchMock.calls('/graphql');
      expect(reqs).toHaveLength(1);
      expect(reqs[0][1].headers.MyAuthorization).toBe('MyBearer 333');
    });
  });

  describe('`tokenRefreshPromise` should be called on 401 response', () => {
    beforeEach(() => {
      fetchMock.restore();

      fetchMock.mock({
        matcher: '/graphql',
        response: (_, opts) => ({
          status: opts.headers.Authorization === 'Bearer ValidToken' ? 200 : 401,
          body: { data: 'PAYLOAD' },
          sendAsJson: true,
        }),
        method: 'POST',
      });
    });

    it('should work with query (provided promise)', async () => {
      const rnl = new RelayNetworkLayer([
        authMiddleware({
          token: '123',
          tokenRefreshPromise: () => Promise.resolve('ValidToken'),
        }),
      ]);

      const req1 = mockReq();
      await rnl.sendQueries([req1]);

      const reqs = fetchMock.calls('/graphql');
      expect(reqs).toHaveLength(2);
      expect(reqs[1][1].headers.Authorization).toBe('Bearer ValidToken');
    });

    it('should work with mutation (provided regular value)', async () => {
      const rnl = new RelayNetworkLayer([
        authMiddleware({
          token: '123',
          tokenRefreshPromise: () => 'ValidToken',
        }),
      ]);

      const req1 = mockReq();
      await rnl.sendMutation(req1);

      const reqs = fetchMock.calls('/graphql');
      expect(reqs).toHaveLength(2);
      expect(reqs[1][1].headers.Authorization).toBe('Bearer ValidToken');
    });
  });
});
