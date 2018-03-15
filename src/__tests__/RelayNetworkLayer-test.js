/* @flow */

import fetchMock from 'fetch-mock';
import RelayNetworkLayer from '../RelayNetworkLayer';

fetchMock.mock({
  matcher: '*',
  response: {
    status: 200,
    body: {
      data: {},
    },
    sendAsJson: true,
  },
});

const mockOperation: any = {
  kind: 'Batch',
  fragment: {},
};

describe('RelayNetworkLayer', () => {
  it('should call middlewares', async () => {
    const mw1: any = jest.fn(next => next);
    const mw2: any = jest.fn(next => next);

    const network = new RelayNetworkLayer([null, mw1, undefined, mw2]);
    await network.execute(mockOperation, {}, {});
    expect(mw1).toHaveBeenCalled();
    expect(mw2).toHaveBeenCalled();
  });

  describe('sync middleware', () => {
    it('should return payload from sync middleware, without calling async middlewares', async () => {
      const asyncMW: any = jest.fn(next => next);

      const syncMW = {
        execute: () => ({ data: {} }),
      };
      const network = new RelayNetworkLayer([syncMW, asyncMW]);
      await network.execute(mockOperation, {}, {});
      expect(asyncMW).not.toHaveBeenCalled();
    });

    it('should call async middlewares, if sync middleware returns undefined', async () => {
      const asyncMW: any = jest.fn(next => next);

      const syncMW = {
        execute: () => undefined,
      };

      const network = new RelayNetworkLayer([syncMW, asyncMW]);
      await network.execute(mockOperation, {}, {});
      expect(asyncMW).toHaveBeenCalled();
    });
  });

  describe('beforeFetch option', () => {
    it('should return payload from beforeFetch, without calling async middlewares', async () => {
      const asyncMW: any = jest.fn(next => next);

      const network = new RelayNetworkLayer([asyncMW], {
        beforeFetch: () => ({ data: {} }),
      });
      await network.execute(mockOperation, {}, {});
      expect(asyncMW).not.toHaveBeenCalled();
    });

    it('should call async middlewares, if beforeFetch returns undefined', async () => {
      const asyncMW: any = jest.fn(next => next);

      const network = new RelayNetworkLayer([asyncMW], {
        beforeFetch: () => undefined,
      });
      await network.execute(mockOperation, {}, {});
      expect(asyncMW).toHaveBeenCalled();
    });
  });
});
