/* @flow */

import fetchMock from 'fetch-mock';
import { generateAndCompile } from 'relay-test-utils-internal';
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
    afterAll(() => {
      fetchMock.restore();
    });

    it('should successful return data across parts', async () => {
      global.fetch = async () => {
        return {
          body: {
            getReader() {
              return {
                async read() {
                  return {
                    value: Buffer.from(
                      [
                        '',
                        '---',
                        'Content-Type: application/json',
                        '',
                        JSON.stringify({
                          data: { viewer: { actor: { name: 'Marais' } } },
                          hasNext: true,
                        }),
                        '---',
                        'Content-Type: application/json',
                        '',
                        JSON.stringify({
                          path: ['viewer'],
                          data: { account_user: { name: 'Zuck' } },
                          label: 'RelayNetworkLayerTestQuery$defer$UserFragment',
                          hasNext: false,
                        }),
                        '-----',
                      ].join('\r\n')
                    ),
                    done: false,
                  };
                },
                releaseLock() {
                  // no op
                },
              };
            },
          },
          status: 200,
          ok: true,
          bodyUsed: false,
          headers: new Map([['content-type', 'multipart/mixed; boundary="-"']]),
        };
      };

      const { RelayNetworkLayerTestQuery } = generateAndCompile(`
      query RelayNetworkLayerTestQuery {
          viewer {
              actor {
                  name
              }
              account_user {
                  ...UserFragment @defer
              }
          }
      }
       fragment UserFragment on User {
          name
        }
      `);

      const network = new RelayNetworkLayer();
      const payloads = await new Promise((resolve, reject) => {
        // eslint-disable-next-line no-shadow
        const payloads = [];
        network.execute(RelayNetworkLayerTestQuery, {}, {}).subscribe({
          next(value) {
            payloads.push(value);
          },
          complete() {
            resolve(payloads);
          },
          error(err) {
            reject(err);
          },
        });
      });
      expect(payloads).toEqual([
        {
          data: { viewer: { actor: { name: 'Marais' } } },
          errors: undefined,
          path: undefined,
          label: undefined,
          extensions: {
            is_final: false,
          },
        },
        {
          path: ['viewer'],
          data: { account_user: { name: 'Zuck' } },
          label: 'RelayNetworkLayerTestQuery$defer$UserFragment',
          errors: undefined,
          extensions: {
            is_final: true,
          },
        },
      ]);
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
