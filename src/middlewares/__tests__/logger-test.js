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
    // fix changing text `in 12ms` for snapshot
    logger.mock.calls[1][0] = logger.mock.calls[1][0].replace(/in \d+ms/, 'in XXXms');
    logger.mock.calls[1][1].req = 'RelayRequest object';
    logger.mock.calls[1][1].res = 'RelayResponse object';
    expect(logger.mock.calls).toMatchSnapshot();
  });
});
