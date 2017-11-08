/* @flow */

import fetchMock from 'fetch-mock';
import RelayNetworkLayer from '../../RelayNetworkLayer';
import { mockReq } from '../../__mocks__/mockReq';
import loggerMiddleware from '../logger';

describe('middlewares/logger', () => {
  beforeEach(() => {
    fetchMock.restore();
  });

  it('measure request time for request', async () => {
    fetchMock.mock({
      matcher: '/graphql',
      response: {
        status: 200,
        body: { data: 'PAYLOAD' },
      },
      method: 'POST',
    });

    const logger = jest.fn();
    const rnl = new RelayNetworkLayer([
      loggerMiddleware({
        logger,
      }),
    ]);

    await mockReq('MyRequest').execute(rnl);
    expect(logger).toHaveBeenCalledTimes(2);
    expect(logger.mock.calls).toMatchSnapshot();
  });
});
