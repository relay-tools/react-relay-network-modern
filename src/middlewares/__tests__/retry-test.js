/* @flow */

import fetchMock from 'fetch-mock';
import RelayNetworkLayer from '../../RelayNetworkLayer';
import { mockReq } from '../../__mocks__/mockReq';
import retryMiddleware, { delayExecution, promiseWithTimeout } from '../retry';

async function sleep(timeout: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, timeout);
  });
}

describe('middlewares/retry', () => {
  describe('promiseWithTimeout()', () => {
    it('should return Promise result if not reach timeout ', async () => {
      const p = Promise.resolve(5);
      const r = await promiseWithTimeout(p, 1000, () => Promise.resolve(0));
      expect(r).toBe(5);
    });

    it('should run `onTimeout` when timout is reached', async () => {
      const p = new Promise(resolve => {
        setTimeout(() => {
          resolve(333);
        }, 20);
      });
      const onTimeout = jest.fn(() => {
        return Promise.resolve(555);
      });
      const r = await promiseWithTimeout(p, 10, onTimeout);
      expect(onTimeout).toHaveBeenCalledTimes(1);
      expect(r).toBe(555);
    });
  });

  describe('delayExecution()', () => {
    it('should run function after delay', async () => {
      const execFn = jest.fn(() => Promise.resolve(777));
      const forceRetryWhenDelay = jest.fn();

      const promise = delayExecution(execFn, 10, forceRetryWhenDelay);
      await sleep(5);
      expect(execFn).toHaveBeenCalledTimes(0);
      await sleep(10);
      expect(execFn).toHaveBeenCalledTimes(1);

      const r = await promise;
      expect(r).toBe(777);
    });

    it('should run function after call `runNow`', async () => {
      const execFn = jest.fn(() => Promise.resolve(888));
      const forceRetryWhenDelay = jest.fn(cb => {
        setTimeout(() => cb(), 10);
      });

      const promise = delayExecution(execFn, 1000, forceRetryWhenDelay);
      await sleep(5);
      expect(forceRetryWhenDelay).toHaveBeenCalledTimes(1);
      expect(execFn).toHaveBeenCalledTimes(0);
      await sleep(10);
      expect(execFn).toHaveBeenCalledTimes(1);

      const r = await promise;
      expect(r).toBe(888);
    });
  });

  describe('middleware', () => {
    beforeEach(() => {
      fetchMock.restore();
    });

    it('should make retries', async () => {
      // First 2 requests return code 500,
      // 3rd request returns code 200
      let attempt = 0;
      fetchMock.mock({
        matcher: '/graphql',
        response: () => {
          attempt++;
          if (attempt < 3) {
            return { status: 500, body: '' };
          }
          return {
            status: 200,
            body: { data: 'PAYLOAD' },
          };
        },
        method: 'POST',
      });
      const rnl = new RelayNetworkLayer([
        retryMiddleware({
          retryDelays: () => 1,
          logger: false,
        }),
      ]);

      const res = await mockReq(1).execute(rnl);
      expect(res.data).toEqual('PAYLOAD');

      const reqs = fetchMock.calls('/graphql');
      expect(reqs).toHaveLength(3);
      expect(reqs).toMatchSnapshot();
    });

    it('should retry request on timeout', async () => {
      let attempt = 0;

      // First 2 requests answered after 50ms
      // 3rd request returns without delay
      fetchMock.mock({
        matcher: '/graphql',
        response: () => {
          attempt++;
          return new Promise(resolve => {
            setTimeout(
              () =>
                resolve({
                  status: 200,
                  body: { data: 'PAYLOAD' },
                }),
              attempt <= 2 ? 50 : 0
            );
          });
        },
        method: 'POST',
      });
      const rnl = new RelayNetworkLayer([
        retryMiddleware({
          fetchTimeout: 20,
          retryDelays: () => 1,
          logger: false,
        }),
      ]);
      await mockReq(1).execute(rnl);
      const reqs = fetchMock.calls('/graphql');
      expect(reqs).toHaveLength(3);
      expect(reqs).toMatchSnapshot();
    });

    it('should throw error on timeout', async () => {
      // returns request after 100ms
      fetchMock.mock({
        matcher: '/graphql',
        response: () => {
          return new Promise(resolve => {
            setTimeout(
              () =>
                resolve({
                  status: 200,
                  body: { data: 'PAYLOAD' },
                }),
              100
            );
          });
        },
        method: 'POST',
      });
      const rnl = new RelayNetworkLayer([
        retryMiddleware({
          fetchTimeout: 20,
          retryDelays: [1],
          logger: false,
        }),
      ]);

      expect.assertions(2);
      try {
        await mockReq(1).execute(rnl);
      } catch (e) {
        expect(e.toString()).toMatch('RelayNetworkLayer: reached request timeout in 20 ms');
      }
      const reqs = fetchMock.calls('/graphql');
      expect(reqs).toHaveLength(2);
    });

    it('should work forceRetry callback when request delayed', async () => {
      // First request will be fulfilled after 100ms delay
      // 2nd request and next without delays
      let attempt = 0;
      fetchMock.mock({
        matcher: '/graphql',
        response: () => {
          attempt++;
          return new Promise(resolve => {
            setTimeout(
              () =>
                resolve({
                  status: 200,
                  body: { data: 'PAYLOAD' },
                }),
              attempt === 1 ? 100 : 0
            );
          });
        },
        method: 'POST',
      });

      // will call force retry after 30 ms
      const forceRetry = jest.fn(runNow => {
        setTimeout(() => {
          runNow();
        }, 30);
      });

      const rnl = new RelayNetworkLayer([
        retryMiddleware({
          fetchTimeout: 10,
          retryDelays: () => 999,
          logger: false,
          forceRetry,
        }),
      ]);

      // make request
      const resPromise = mockReq(1).execute(rnl);
      await sleep(1);
      // should be sended first request (server will respond after 100 ms)
      expect(fetchMock.calls('/graphql')).toHaveLength(1);
      await sleep(10);
      // after 10 ms should be reached `fetchTimeout`
      // so middleware hang request
      // and starts 1000ms delayed period before making a new request
      // when delay period was started, should be called forceRetry method
      expect(forceRetry).toHaveBeenCalledTimes(1);
      // second arg of forceRetry call should be delay period in ms
      expect(forceRetry.mock.calls[0][1]).toBe(999);
      // on 30 ms will be called `runNow` function
      await sleep(50);
      // so we make second request before delay period will end
      expect(fetchMock.calls('/graphql')).toHaveLength(2);
      expect((await resPromise).data).toBe('PAYLOAD');
    });
  });
});
