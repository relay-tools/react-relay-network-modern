/* @flow */

import fetchMock from 'fetch-mock';
import RelayNetworkLayer from '../../RelayNetworkLayer';
import { mockReq } from '../../__mocks__/mockReq';
import perfMiddleware from '../perf';
import batchMiddleware from '../batch';

describe('middlewares/perf', () => {
  beforeEach(() => {
    fetchMock.restore();
  });

  it('measure request time for single request', async () => {
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
      perfMiddleware({
        logger,
      }),
    ]);

    await mockReq('MyRequest').execute(rnl);
    expect(logger).toHaveBeenCalledTimes(1);
    expect(logger.mock.calls[0][0]).toMatch(/\[\d+ms\] MyRequest/);
    expect(logger.mock.calls[0][1]).toMatchSnapshot();
  });

  it('measure request time for batch request', async () => {
    fetchMock.mock({
      matcher: '/graphql/batch',
      response: {
        status: 200,
        body: [{ id: 1, data: 'PAYLOAD' }, { id: 2, data: 'PAYLOAD' }],
      },
      method: 'POST',
    });

    const logger = jest.fn();
    const rnl = new RelayNetworkLayer([
      batchMiddleware(),
      perfMiddleware({
        logger,
      }),
    ]);

    mockReq(1).execute(rnl);
    await mockReq(2).execute(rnl);
    expect(logger).toHaveBeenCalledTimes(1);
    expect(logger.mock.calls[0][0]).toMatch(/\[\d+ms\] BATCH_REQUEST:1:2/);
    expect(logger.mock.calls[0][1]).toMatchSnapshot();
  });
});
