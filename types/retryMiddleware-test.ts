import { retryMiddleware } from 'react-relay-network-modern';

retryMiddleware({});

retryMiddleware({
  fetchTimeout: 1,
});

retryMiddleware({
  fetchTimeout: (attempt) => attempt * 10,
});
