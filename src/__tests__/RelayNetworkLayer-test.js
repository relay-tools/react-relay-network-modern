/* @flow */

import fetchMock from 'fetch-mock';
import RelayNetworkLayer from '../RelayNetworkLayer';

fetchMock.mock({
  matcher: '*',
  response: {
    data: {},
  },
});

const mockOperation: any = {
  kind: 'Batch',
  fragment: {},
};

describe('RelayNetworkLayer', () => {
  it('should call middlewares', async () => {
    const mw1: any = jest.fn((next) => next);
    const mw2: any = jest.fn((next) => next);

    const network = new RelayNetworkLayer([null, mw1, undefined, mw2]);
    await network.execute(mockOperation, {}, {}).toPromise();
    expect(mw1).toHaveBeenCalled();
    expect(mw2).toHaveBeenCalled();
  });

  describe('sync middleware', () => {
    it('should return payload from sync middleware, without calling async middlewares', async () => {
      const asyncMW: any = jest.fn((next) => next);

      const syncMW = {
        execute: () => ({ data: {} }),
      };
      const network = new RelayNetworkLayer([syncMW, asyncMW]);
      await network.execute(mockOperation, {}, {}).toPromise();
      expect(asyncMW).not.toHaveBeenCalled();
    });

    it('should call async middlewares, if sync middleware returns undefined', async () => {
      const asyncMW: any = jest.fn((next) => next);

      const syncMW = {
        execute: () => undefined,
      };

      const network = new RelayNetworkLayer([syncMW, asyncMW]);
      await network.execute(mockOperation, {}, {}).toPromise();
      expect(asyncMW).toHaveBeenCalled();
    });
  });

  describe('beforeFetch option', () => {
    it('should return payload from beforeFetch, without calling async middlewares', async () => {
      const asyncMW: any = jest.fn((next) => next);

      const network = new RelayNetworkLayer([asyncMW], {
        beforeFetch: () => ({ data: {} }),
      });
      await network.execute(mockOperation, {}, {}).toPromise();
      expect(asyncMW).not.toHaveBeenCalled();
    });

    it('should call async middlewares, if beforeFetch returns undefined', async () => {
      const asyncMW: any = jest.fn((next) => next);

      const network = new RelayNetworkLayer([asyncMW], {
        beforeFetch: () => undefined,
      });
      await network.execute(mockOperation, {}, {}).toPromise();
      expect(asyncMW).toHaveBeenCalled();
    });
  });

  describe('multipart responses', () => {
    it('should successful return data across parts', async () => {
      fetchMock.mock({
        matcher: '/graphql',
        response: {
          body: [
            '',
            '---',
            'Content-Type: application/json',
            '',
            JSON.stringify({ data: { id: 1 } }),
            '---',
            'Content-Type: application/json',
            '',
            JSON.stringify({ path: ['viewer'], data: { managed_groups: [{ id: 1 }] } }),
            '-----',
          ].join('\r\n'),
          status: 200,
        },
        headers: {
          'content-type': 'multipart/mixed; boundary="-"',
        },
        sendAsJson: false,
        method: 'POST',
      });

      const network = new RelayNetworkLayer();
      const observable: any = network.execute(mockOperation, {}, {});
      const result = await observable.toPromise();
      expect(result.data).toEqual({ viewer: { id: 1, managed_groups: [{ id: 1 }] } });
    });
  });

  it('should correctly call raw middlewares', async () => {
    fetchMock.mock({
      matcher: '/graphql',
      response: {
        status: 200,
        body: {
          data: { text: 'response' },
        },
        sendAsJson: true,
      },
      method: 'POST',
    });

    const regularMiddleware: any = (next) => async (req) => {
      (req: any).fetchOpts.headers.reqId += ':regular';
      const res: any = await next(req);
      res.data.text += ':regular';
      return res;
    };

    const createRawMiddleware = (id: number): any => {
      const rawMiddleware = (next) => async (req) => {
        (req: any).fetchOpts.headers.reqId += `:raw${id}`;
        const res: any = await next(req);
        const parentJsonFN = res.json;
        res.json = async () => {
          const json = await parentJsonFN.bind(res)();
          json.data.text += `:raw${id}`;
          return json;
        };
        return res;
      };
      rawMiddleware.isRawMiddleware = true;
      return rawMiddleware;
    };

    // rawMiddlewares should be called the last
    const network = new RelayNetworkLayer([
      createRawMiddleware(1),
      createRawMiddleware(2),
      regularMiddleware,
    ]);
    const observable: any = network.execute(mockOperation, {}, {});
    const result = await observable.toPromise();
    expect(fetchMock.lastOptions().headers.reqId).toEqual('undefined:regular:raw1:raw2');
    expect(result.data).toEqual({ text: 'undefined:raw2:raw1:regular' });
  });
});
