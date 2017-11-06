/* @flow */

import fetchMock from 'fetch-mock';
import { RelayNetworkLayer } from '../../';
import { mockReq } from '../../__mocks__/mockReq';
import urlMiddleware from '../url';

describe('Middleware / url', () => {
  describe('`url` option as string', () => {
    const rnl = new RelayNetworkLayer([
      urlMiddleware({
        url: '/other/url',
      }),
    ]);

    beforeEach(() => {
      fetchMock.restore();

      fetchMock.mock({
        matcher: '/other/url',
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
      expect(req1.payload.response).toBe('PAYLOAD');
    });

    it('should work with mutation', async () => {
      const req1 = mockReq();
      await rnl.sendMutation(req1);
      expect(req1.payload.response).toBe('PAYLOAD');
    });
  });

  describe('`url` option as thunk', () => {
    const rnl = new RelayNetworkLayer([
      urlMiddleware({
        url: () => '/thunk_url',
      }),
    ]);

    beforeEach(() => {
      fetchMock.restore();

      fetchMock.mock({
        matcher: '/thunk_url',
        response: {
          status: 200,
          body: { data: 'PAYLOAD2' },
          sendAsJson: true,
        },
        method: 'POST',
      });
    });

    it('should work with query', async () => {
      const req1 = mockReq();
      await rnl.sendQueries([req1]);
      expect(req1.payload.response).toBe('PAYLOAD2');
    });

    it('should work with mutation', async () => {
      const req1 = mockReq();
      await rnl.sendQueries([req1]);
      expect(req1.payload.response).toBe('PAYLOAD2');
    });
  });
});
