/* @flow */

// import fetchMock from 'fetch-mock';
import RelayNetworkLayer from '../../RelayNetworkLayer';
// import { mockReq } from '../../__mocks__/mockReq';
import retryMiddleware, { makeRetriableRequest, awaitRetryTimeout } from '../retry';

describe('middlewares/retry', () => {
  describe('promiseWithTimeout()', () => {
    it('should', () => {

    });
  });

  describe('delayExecution()', () => {
    it('should', () => {

    });
  });

  describe('makeRetriableRequest()', () => {
    it('should', () => {

    });
  });

  describe('middleware', () => {
    it('should', () => {
      // eslint-disable-next-line
      const rnl = new RelayNetworkLayer([retryMiddleware()]);
    });
  });
});
