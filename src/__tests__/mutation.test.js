/* @flow */

import fetchMock from 'fetch-mock';
import { RelayNetworkLayer } from '../';
import { mockReq } from '../__mocks__/mockReq';

describe('Mutation tests', () => {
  const middlewares = [];
  const rnl = new RelayNetworkLayer(middlewares);

  beforeEach(() => {
    fetchMock.restore();
  });

  it('should make a successfull mutation', async () => {
    fetchMock.post('/graphql', { data: { ok: 1 } });
    const req = mockReq();
    await rnl.sendMutation(req);
    expect(req.payload).toEqual({ response: { ok: 1 } });
  });

  it('should fail correctly on network failure', async () => {
    fetchMock.mock({
      matcher: '/graphql',
      response: {
        throws: new Error('Network connection error'),
      },
      method: 'POST',
    });
    const req1 = mockReq();
    await rnl.sendMutation(req1).catch(() => {});

    expect(req1.error instanceof Error).toBeTruthy();
    expect(req1.error.toString()).toMatch('Network connection error');
  });

  it('should handle error response', async () => {
    fetchMock.mock({
      matcher: '/graphql',
      response: {
        status: 200,
        body: {
          errors: [{ location: 1, message: 'major error' }],
        },
      },
      method: 'POST',
    });

    const req1 = mockReq(1);
    await rnl.sendMutation(req1).catch(() => {});
    expect(req1.error instanceof Error).toBeTruthy();
  });

  it('should handle server non-2xx errors', async () => {
    fetchMock.mock({
      matcher: '/graphql',

      response: {
        status: 500,
        body: 'Something went completely wrong.',
      },
      method: 'POST',
    });

    const req1 = mockReq(1);
    await rnl.sendMutation(req1).catch(() => {});

    const error: any = req1.error;
    expect(error instanceof Error).toBeTruthy();
    expect(error.message).toEqual('Something went completely wrong.');
    expect(error.fetchResponse.status).toEqual(500);
  });
});
