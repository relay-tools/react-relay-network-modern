import { Environment, RecordSource, Store } from 'relay-runtime';
import {
  RelayNetworkLayer,
  urlMiddleware,
  batchMiddleware,
  loggerMiddleware,
  errorMiddleware,
  perfMiddleware,
  retryMiddleware,
  authMiddleware,
  cacheMiddleware,
  progressMiddleware,
  uploadMiddleware,
} from 'react-relay-network-modern';

const __DEV__ = false;

const authStore = {
  get(key: string) {
    return 'token';
  },
  set(key: string, val: string) {},
};

const network = new RelayNetworkLayer([
  cacheMiddleware({
    size: 100,
    ttl: 900000,
  }),
  urlMiddleware({
    url: (req) => Promise.resolve('/graphql'),
  }),
  batchMiddleware({
    batchUrl: (requestList) => Promise.resolve('/graphql/batch'),
    batchTimeout: 10,
  }),
  __DEV__ ? loggerMiddleware() : null,
  __DEV__ ? errorMiddleware() : null,
  __DEV__ ? perfMiddleware() : null,
  retryMiddleware({
    fetchTimeout: 15000,
    retryDelays: (attempt) => Math.pow(2, attempt + 4) * 100,
    beforeRetry: ({ forceRetry, abort, delay, attempt, lastError, req }) => {
      if (attempt > 10) abort();
      // @ts-expect-error
      window.forceRelayRetry = forceRetry;
      console.log(`call \`forceRelayRetry()\` for immediately retry! Or wait ${delay} ms.`);
    },
    statusCodes: [500, 503, 504],
  }),
  authMiddleware({
    token: () => authStore.get('jwt'),
    tokenRefreshPromise: (req) => {
      console.log('[client.js] resolve token refresh', req);
      return fetch('/jwt/refresh')
        .then((res) => res.json())
        .then((json) => {
          const token = json.token;
          authStore.set('jwt', token);
          return token;
        })
        .catch((err) => console.log('[client.js] ERROR can not refresh token', err));
    },
  }),
  progressMiddleware({
    onProgress: (current, total) => {
      console.log(`Downloaded: ${current} B, total: ${total} B`);
    },
  }),
  uploadMiddleware(),

  // example of the custom inline middleware
  (next) => async (req) => {
    req.fetchOpts.method = 'GET';
    req.fetchOpts.credentials = 'same-origin';

    console.log('RelayRequest', req);

    const res = await next(req);
    console.log('RelayResponse', res);

    return res;
  },
]);

const source = new RecordSource();
const store = new Store(source);
const environment = new Environment({ network, store });
