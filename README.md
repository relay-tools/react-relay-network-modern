# ReactRelayNetworkModern (for Relay Modern)

[![npm](https://img.shields.io/npm/v/react-relay-network-modern.svg)](https://www.npmjs.com/package/react-relay-network-modern)
[![trends](https://img.shields.io/npm/dt/react-relay-network-modern.svg)](http://www.npmtrends.com/react-relay-network-modern)
[![Travis](https://img.shields.io/travis/relay-tools/react-relay-network-modern.svg?maxAge=2592000)](https://travis-ci.org/relay-tools/react-relay-network-modern)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)
![FlowType compatible](https://img.shields.io/badge/flowtype-compatible-brightgreen.svg)

The `ReactRelayNetworkModern` is a [Network Layer for Relay Modern](https://facebook.github.io/relay/docs/network-layer.html)
with various middlewares which can manipulate requests/responses on the fly (change auth headers, request url or perform some fallback if request fails), batch several relay request by timeout into one http request, cache queries and server-side rendering.

Network Layer for Relay Classic can be found [here](https://github.com/relay-tools/react-relay-network-layer).

Migration guide from v1 to v2 can be found [here](https://github.com/relay-tools/react-relay-network-modern/releases/tag/v2.0.0).

`ReactRelayNetworkModern` can be used in browser, react-native or node server for rendering. Under the hood this module uses global `fetch` method. So if your client is too old, please import explicitly proper polyfill to your code (eg. `whatwg-fetch`, `node-fetch` or `fetch-everywhere`).

## Install

```bash
yarn add react-relay-network-modern
OR
npm install react-relay-network-modern --save
```

### What if `regeneratorRuntime is not defined`?

<img width="493" alt="screen shot 2018-02-20 at 20 07 45" src="https://user-images.githubusercontent.com/1946920/36428334-da402a6e-1679-11e8-9897-7e730ab3123e.png">

I don't want to bundle regenerator-runtime with the library - it's a largish dependency and there's a good chance that the user is already including code which depends on it (eg. via `babel-polyfill`). If we bundle it they'll get a duplicate copy and that's bad.

So if you got `regeneratorRuntime is not defined` you should do the following:

```js
import 'regenerator-runtime/runtime';
import { RelayNetworkLayer } from 'react-relay-network-modern';
```

### What if Webpack errors with `Error: Cannot find module 'core-js/modules/es6.*'`?

`core-js` is not an explicit dependency as it adds [30kb for client bundles](https://bundlephobia.com/result?p=core-js@2.6.9).

If this error occurs you can do one of the following:

- Explicitly install core-js v2. E.g.
  - `yarn add core-js@2.6.11
- Try referencing one of the non default imports:
  - `import { RelayNetworkLayer } from 'react-relay-network-modern/node8';`
  - `import { RelayNetworkLayer } from 'react-relay-network-modern/es';`

### Different builds

This library contains different builds for any purposes:

```js
// Default import for using in any browser
// last 5 versions, ie 9, defaults
import { RelayNetworkLayer } from 'react-relay-network-modern';

// For SSR on node 8 and above (native async/await)
import { RelayNetworkLayer } from 'react-relay-network-modern/node8';

// Source code without Flowtype declarations
import { RelayNetworkLayer } from 'react-relay-network-modern/es';
```

## Middlewares

### Built-in middlewares

- **your custom inline middleware** - [see example](https://github.com/relay-tools/react-relay-network-modern#example-of-injecting-networklayer-with-middlewares-on-the-client-side) below where added `credentials` and `headers` to the `fetch` method.
  - `next => req => { /* your modification of 'req' object */ return next(req); }`
- **urlMiddleware** - for manipulating fetch `url` on fly via thunk.
  - `url` - string for single request. Can be Promise or function(req). (default: `/graphql`).
  - `method` - string, for request method type (default: `POST`)
  - headers - Object with headers for fetch. Can be Promise or function(req).
  - credentials - string, setting for fetch method, eg. 'same-origin' (default: empty).
  - also you may provide `mode`, `cache`, `redirect` options for fetch method, for details see [fetch spec](https://fetch.spec.whatwg.org/#requests).
- **cacheMiddleware** - for caching same queries you may use this middleware. It will skip (do not cache) mutations and FormData requests.
  - `size` - max number of request in cache, least-recently _updated_ entries purged first (default: `100`).
  - `ttl` - number in milliseconds, how long records stay valid in cache (default: `900000`, 15 minutes).
  - `onInit` - function(cache) which will be called once when cache is created. As first argument you receive `QueryResponseCache` instance from `relay-runtime`.
  - `allowMutations` - allow to cache Mutation requests (default: `false`)
  - `allowFormData` - allow to cache FormData requests (default: `false`)
  - `clearOnMutation` - clear the cache on any Mutation (default: `false`)
  - `cacheErrors` - cache responses with errors (default: `false`)
- **authMiddleware** - for adding auth token, and refreshing it if gets 401 response from server.
  - `token` - string which returns token. Can be function(req) or Promise. If function is provided, then it will be called for every request (so you may change tokens on fly).
  - `tokenRefreshPromise`: - function(req, res) which must return promise or regular value with a new token. This function is called when server returns 401 status code. After receiving a new token, middleware re-run query to the server seamlessly for Relay.
  - `allowEmptyToken` - allow made a request without Authorization header if token is empty (default: `false`).
  - `prefix` - prefix before token (default: `'Bearer '`).
  - `header` - name of the HTTP header to pass the token in (default: `'Authorization'`).
  - If you use `auth` middleware with `retry`, `retry` must be used before `auth`. Eg. if token expired when retries apply, then `retry` can call `auth` middleware again.
- **retryMiddleware** - for request retry if the initial request fails.
  - `fetchTimeout` - number in milliseconds that defines in how much time will request timeout after it has been sent to the server again (default: `15000`). Or it may be a function `(attempt: number) => number` which returns a timeout in milliseconds (`attempt` starts from 0).
  - `retryDelays` - array of millisecond that defines the values on which retries are based on (default: `[1000, 3000]`). Or it may be a function `(attempt: number) => number | false` which returns a timeout in milliseconds for retry or false for disabling retry (`attempt` starts from 0).
  - `statusCodes` - array of response status codes which will fire up retryMiddleware. Or it may be a function `(statusCode: number, req, res) => boolean` which makes retry if returned true. (default: `status < 200 or status > 300`).
  - `beforeRetry` - function(meta: { forceRetry: Function, abort: Function, delay: number, attempt: number, lastError: ?Error, req: RelayRequest }) called before every retry attempt. You get one argument with following properties:
    - `forceRetry()` - for proceeding request immediately
    - `abort(abortMsg: string)` - for aborting retry request. (Default abort message is: `"Aborted in beforeRetry() callback"`)
    - `attempt` - number of the attemp (starts from 1)
    - `delay` - number of milliseconds when next retry will be called
    - `lastError` - will keep Error from previous request
    - `req` - retriable Request object
  - `allowMutations` - by default retries disabled for mutations, you may allow process retries for them passing `true`. (default: `false`)
  - `allowFormData` - by default retries disabled for file Uploads, you may enable it passing `true` (default: `false`)
  - `forceRetry` - deprecated, use `beforeRetry` instead (default: `false`).
- **batchMiddleware** - gather some period of time relay-requests and sends it as one http-request. You server must support batch request and return results in the same order they were requested. [See how to setup your server.](https://github.com/relay-tools/react-relay-network-modern#example-how-to-enable-batching)
  - `batchUrl` - string. Url of the server endpoint for batch request execution. Can be function(requestList) or Promise. (default: `/graphql/batch`)
  - `batchTimeout` - integer in milliseconds, period of time for gathering multiple requests before sending them to the server. Will delay sending of the requests on specified in this option period of time, so be careful and keep this value small. (default: `0`)
  - `maxBatchSize` - integer representing maximum size of request to be sent in a single batch. Once a request hits the provided size in length a new batch request is ran. Actual for hardcoded limit in 100kb per request in [express-graphql](https://github.com/graphql/express-graphql/blob/master/src/parseBody.js#L112) module. (default: `102400` characters, roughly 100kb for 1-byte characters or 200kb for 2-byte characters)
  - `allowMutations` - by default batching disabled for mutations, you may enable it passing `true` (default: `false`)
  - `method` - string, for request method type (default: `POST`)
  - `headers` - Object with headers for fetch. Can be Promise or function(req).
  - `credentials` - string, setting for fetch method, eg. 'same-origin' (default: empty).
  - also you may provide `mode`, `cache`, `redirect` options for fetch method, for details see [fetch spec](https://fetch.spec.whatwg.org/#requests).
  - alternatively, you can use _legacyBatchMiddleware_, which sends a request ID with each query and expects the GraphQL server to include the request ID with each result.
- **loggerMiddleware** - for logging requests and responses.
  - `logger` - log function (default: `console.log.bind(console, '[RELAY-NETWORK]')`)
  - An example of req/res output in console: <img width="968" alt="screen shot 2017-11-19 at 23 05 19" src="https://user-images.githubusercontent.com/1946920/33159466-557517e0-d03d-11e7-9711-ebdfe6e789c8.png">
- **perfMiddleware** - simple time measure for network request.
  - `logger` - log function (default: `console.log.bind(console, '[RELAY-NETWORK]')`)
- **errorMiddleware** - display `errors` data to console from graphql response. If you want see stackTrace for errors, you should provide `formatError` to `express-graphql` (see example below where `graphqlServer` accept `formatError` function).
  - `logger` - log function (default: `console.error.bind(console)`)
  - `prefix` - prefix message (default: `[RELAY-NETWORK] GRAPHQL SERVER ERROR:`)
- **progressMiddleware** - enable onProgress callback for modern browsers with support for Stream API.
  - `onProgress` - on progress callback function (`function(bytesCurrent: number, bytesTotal: number | null) => void`, total size will be null if size header is not set)
  - `sizeHeader` - response header with total size of response (default: `Content-Length`, useful when `Transfer-Encoding: chunked` is set)
- **uploadMiddleware** - extracts [`File`](https://developer.mozilla.org/docs/web/api/file), [`Blob`](https://developer.mozilla.org/docs/web/api/blob) and [`ReactNativeFile`](#class-reactnativefile) instances from query variables to be consumed with [graphql-upload](https://github.com/jaydenseric/graphql-upload)

### Standalone package middlewares

- [**react-relay-network-modern-ssr**](https://github.com/relay-tools/react-relay-network-modern-ssr) - client/server middleware for server-side rendering (SSR). On server side it makes requests directly via `graphql-js` and your `schema`, cache payloads and serialize them for putting to HTML. On client side it loads provided payloads and renders them in sync mode without visible flashes and loaders.

### Example of injecting NetworkLayer with middlewares on the **client side**

```js
import { Environment, RecordSource, Store } from 'relay-runtime';
import {
  RelayNetworkLayer,
  urlMiddleware,
  batchMiddleware,
  // legacyBatchMiddleware,
  loggerMiddleware,
  errorMiddleware,
  perfMiddleware,
  retryMiddleware,
  authMiddleware,
  cacheMiddleware,
  progressMiddleware,
  uploadMiddleware,
} from 'react-relay-network-modern';

const network = new RelayNetworkLayer(
  [
    cacheMiddleware({
      size: 100, // max 100 requests
      ttl: 900000, // 15 minutes
    }),
    urlMiddleware({
      url: (req) => Promise.resolve('/graphql'),
    }),
    // Deprecated batch middleware
    // legacyBatchMiddleware({
    //   batchUrl: (requestMap) => Promise.resolve('/graphql/batch'),
    //   batchTimeout: 10,
    // }),
    batchMiddleware({
      batchUrl: (requestList) => Promise.resolve('/graphql/batch'),
      batchTimeout: 10,
    }),
    __DEV__ ? loggerMiddleware() : null,
    __DEV__ ? errorMiddleware() : null,
    __DEV__ ? perfMiddleware() : null,
    retryMiddleware({
      fetchTimeout: 15000,
      retryDelays: (attempt) => Math.pow(2, attempt + 4) * 100, // or simple array [3200, 6400, 12800, 25600, 51200, 102400, 204800, 409600],
      beforeRetry: ({ forceRetry, abort, delay, attempt, lastError, req }) => {
        if (attempt > 10) abort();
        window.forceRelayRetry = forceRetry;
        console.log('call `forceRelayRetry()` for immediately retry! Or wait ' + delay + ' ms.');
      },
      statusCodes: [500, 503, 504],
    }),
    authMiddleware({
      token: () => store.get('jwt'),
      tokenRefreshPromise: (req) => {
        console.log('[client.js] resolve token refresh', req);
        return fetch('/jwt/refresh')
          .then((res) => res.json())
          .then((json) => {
            const token = json.token;
            store.set('jwt', token);
            return token;
          })
          .catch((err) => console.log('[client.js] ERROR can not refresh token', err));
      },
    }),
    progressMiddleware({
      onProgress: (current, total) => {
        console.log('Downloaded: ' + current + ' B, total: ' + total + ' B');
      },
    }),
    uploadMiddleware(),

    // example of the custom inline middleware
    (next) => async (req) => {
      req.fetchOpts.method = 'GET'; // change default POST request method to GET
      req.fetchOpts.headers['X-Request-ID'] = uuid.v4(); // add `X-Request-ID` to request headers
      req.fetchOpts.credentials = 'same-origin'; // allow to send cookies (sending credentials to same domains)
      // req.fetchOpts.credentials = 'include'; // allow to send cookies for CORS (sending credentials to other domains)

      console.log('RelayRequest', req);

      const res = await next(req);
      console.log('RelayResponse', res);

      return res;
    },
  ],
  opts
); // as second arg you may pass advanced options for RRNL

const source = new RecordSource();
const store = new Store(source);
const environment = new Environment({ network, store });
```

## Advanced options (2nd argument after middlewares)

RelayNetworkLayer may accept additional options:

```js
const middlewares = []; // array of middlewares
const options = {}; // optional advanced options
const network = new RelayNetworkLayer(middlewares, options);
```

Available options:

- **subscribeFn** - if you use subscriptions in your app, you may provide this function which will be passed to [RelayNetwork](https://github.com/facebook/relay/blob/master/packages/relay-runtime/network/RelayNetwork.js).
- **noThrow** - **EXPERIMENTAL (May be deprecated in the future)** set true to not throw when an error response is given by the server, and to instead handle errors in your app code.

## Server-side rendering (SSR)

See [`react-relay-network-modern-ssr](https://github.com/relay-tools/react-relay-network-modern-ssr) for SSR middleware.

## How middlewares work internally

Middlewares on bottom layer use [fetch](https://github.com/github/fetch) method. So `req` is compliant with a `fetch()` options. And `res` can be obtained via `resPromise.then(res => ...)`, which returned by `fetch()`.

Middleware that needs access to the raw response body from fetch (before it has been consumed) can set `isRawMiddleware = true`, see `progressMiddleware` for example. It is important to note that `response.body` can only be consumed once, so make sure to `clone()` the response first.

Middlewares have 3 phases:

- `setup phase`, which runs only once, when middleware added to the NetworkLayer
- `capturing phase`, when you may change request object, and pass it down via `next(req)`
- `bubbling phase`, when you may change response promise, made re-request or pass it up unchanged

Basic skeleton of middleware:

```js
export default function skeletonMiddleware(opts = {}) {
  // [SETUP PHASE]: here you can process `opts`, when you create Middleware

  return (next) => async (req) => {
    // [CAPTURING PHASE]: here you can change `req` object, before it will pass to following middlewares.
    // ...some code which modify `req`

    const res = await next(req); // pass request to following middleware and get response promise from it

    // [BUBBLING PHASE]: here you may change response of underlying middlewares, via promise syntax
    // ...some code, which process `req`

    return res; // return response to upper middleware
  };
}
```

Middlewares use LIFO (last in, first out) stack. Or simply put - use `compose` function. So if you pass such middlewares [M1(opts), M2(opts)] to NetworkLayer it will be work such way:

- call setup phase of `M1` with its opts
- call setup phase of `M2` with its opts
- for each request
- call capture phase of `M1`
- call capture phase of `M2`
- call `fetch` method
- call bubbling phase of `M2`
- call bubbling phase of `M1`
- chain to `resPromise.then(res => res.json())` and pass this promise for resolving/rejecting Relay requests.

## Batching several requests into one

Joseph Savona [wrote](https://github.com/facebook/relay/issues/1058#issuecomment-213592051): For legacy reasons, Relay splits "plural" root queries into individual queries. In general we want to diff each root value separately, since different fields may be missing for different root values.

Also if you use [react-relay-router](https://github.com/relay-tools/react-router-relay) and have multiple root queries in one route pass, you may notice that default network layer will produce several http requests.

So for avoiding multiple http-requests, the `ReactRelayNetworkModern` is the right way to combine it in single http-request.

### Example how to enable batching

#### ...on server

Firstly, you should prepare **server** to process the batch request:

```js
import express from 'express';
import graphqlHTTP from 'express-graphql';
import { graphqlBatchHTTPWrapper } from 'react-relay-network-modern';
import bodyParser from 'body-parser';
import myGraphqlSchema from './graphqlSchema';

const port = 3000;
const server = express();

// setup standart `graphqlHTTP` express-middleware
const graphqlServer = graphqlHTTP({
  schema: myGraphqlSchema,
  formatError: (error) => ({
    // better errors for development. `stack` used in `gqErrors` middleware
    message: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack.split('\n') : null,
  }),
});

// declare route for batch query
server.use('/graphql/batch', bodyParser.json(), graphqlBatchHTTPWrapper(graphqlServer));

// declare standard graphql route
server.use('/graphql', graphqlServer);

server.listen(port, () => {
  console.log(`The server is running at http://localhost:${port}/`);
});
```

[More complex example](https://github.com/relay-tools/react-relay-network-modern/blob/master/examples/dataLoaderPerBatchRequest.js) of how you can use a single [DataLoader](https://github.com/facebook/dataloader) for all (batched) queries within a one HTTP-request.

If you are on Koa@2, [koa-graphql-batch](https://github.com/mattecapu/koa-graphql-batch) provides the same functionality as `graphqlBatchHTTPWrapper` (see its docs for usage example).

#### ...on client

And right after server side ready to accept batch queries, you may enable batching on the **client**:

```js
const network = new RelayNetworkLayer([
  // deprecated "legacy" batch middleware
  // legacyBatchMiddleware({
  //   batchUrl: '/graphql/batch', // <--- route for batch queries
  // }),
  batchMiddleware({
    batchUrl: '/graphql/batch', // <--- route for batch queries
  }),
]);
```

### How batching works internally

Internally batching in `NetworkLayer` prepare list of queries `[ {query, variables}, ...]` sends it to server. And server returns list of results `[ {data}, ...]`. The server is expected to return the results in the same order as the requests.

As of v4.0.0, the batch middleware utilizing request IDs in queries and corresponding results has been renamed `legacyBatchMiddleware`. The legacy middleware included a request ID with each query included in the batch and expected the server to return each result with the corresponding request ID. The new `batchMiddleware` simply expects results be returned in the same order as the batched queries.

**NOTE:** `legacyBatchMiddleware` does not correctly deduplicate queries when batched because query variables may be ignored in a comparison. This means that two identical queries with _different_ variables will show the same results due to a bug ([#31](https://github.com/relay-tools/react-relay-network-modern/issues/31)). It is highly encouraged to use the new order-based `batchMiddleware`, which still deduplicates queries, but includes the variables in the comparison.

## Contribute

I actively welcome pull requests with code and doc fixes.
Also if you made great middleware and want share it within this module, please feel free to open PR.

## License

[MIT](https://github.com/relay-tools/react-relay-network-modern/blob/master/LICENSE.md)
