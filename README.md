ReactRelayNetworkModern (for Relay Modern)
==========================================
[![](https://img.shields.io/npm/v/react-relay-network-modern.svg)](https://www.npmjs.com/package/react-relay-network-modern)
[![npm](https://img.shields.io/npm/dt/react-relay-network-modern.svg)](http://www.npmtrends.com/react-relay-network-modern)
[![Travis](https://img.shields.io/travis/nodkz/react-relay-network-modern.svg?maxAge=2592000)](https://travis-ci.org/nodkz/react-relay-network-modern)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)
![FlowType compatible](https://img.shields.io/badge/flowtype-compatible-brightgreen.svg)

The `ReactRelayNetworkModern` is a [Network Layer for Relay Modern](https://facebook.github.io/relay/docs/network-layer.html)
with various middlewares which can manipulate requests/responses on the fly (change auth headers, request url or perform some fallback if request fails), batch several relay request by timeout into one http request.

`ReactRelayNetworkModern` can be used in browser, react-native or node server for rendering. Under the hood this module uses global `fetch` method. So if your client is too old, please import explicitly proper polyfill to your code (eg. `whatwg-fetch`, `node-fetch` or `fetch-everywhere`).

```
yarn add react-relay-network-modern
OR
npm install react-relay-network-modern --save
```

Network Layer for Relay Classic can be found [here](https://github.com/nodkz/react-relay-network-layer).

Middlewares
===========

### Available middlewares:
- **your custom inline middleware** - [see example](https://github.com/nodkz/react-relay-network-modern#example-of-injecting-networklayer-with-middlewares-on-the-client-side) below where added `credentials` and `headers` to the `fetch` method.
  - `next => req => { /* your modification of 'req' object */ return next(req); }`
- **urlMiddleware** - for manipulating fetch `url` on fly via thunk.
  - `url` - string or function(req) for single request (default: `/graphql`)  
- **batchMiddleware** - gather some period of time relay-requests and sends it as one http-request. You server must support batch request, [how to setup your server](https://github.com/nodkz/react-relay-network-modern#example-how-to-enable-batching)
  - `batchUrl` - string or function(requestMap). Url of the server endpoint for batch request execution (default: `/graphql/batch`)
  - `batchTimeout` - integer in milliseconds, period of time for gathering multiple requests before sending them to the server. Will delay sending of the requests on specified in this option period of time, so be careful and keep this value small. (default: `0`)
  - `maxBatchSize` - integer representing maximum size of request to be sent in a single batch. Once a request hits the provided size in length a new batch request is ran. Actual for hardcoded limit in 100kb per request in [express-graphql](https://github.com/graphql/express-graphql/blob/master/src/parseBody.js#L112) module. (default: `102400` characters, roughly 100kb for 1-byte characters or 200kb for 2-byte characters)
  - `allowMutations` - by default batching disabled for mutations, you may enable it passing `true` (default: `false`)
- **retryMiddleware** - for request retry if the initial request fails.
  - `fetchTimeout` - number in milliseconds that defines in how much time will request timeout after it has been sent to the server (default: `15000`).
  - `retryDelays` - array of millisecond that defines the values on which retries are based on (default: `[1000, 3000]`).
  - `statusCodes` - array of response status codes which will fire up retryMiddleware (default: `status < 200 or status > 300`).
  - `allowMutations` - by default retries disabled for mutations, you may allow process retries for them passing `true` (default: `false`)
  - `forceRetry` - function(cb, delay), when request is delayed for next retry, middleware will call this function and pass to it a callback and delay time. When you call this callback, middleware will proceed request immediately (default: `false`).
- **authMiddleware** - for adding auth token, and refreshing it if gets 401 response from server.
  - `token` - string or function(req) which returns token. If function is provided, then it will be called for every request (so you may change tokens on fly).
  - `tokenRefreshPromise`: - function(req, err) which must return promise or regular value with a new token. This function is called when server returns 401 status code. After receiving a new token, middleware re-run query to the server with it seamlessly for Relay.
  - `allowEmptyToken` - allow made a request without Authorization header if token is empty (default: `false`).
  - `prefix` - prefix before token (default: `'Bearer '`).
  - `header` - name of the HTTP header to pass the token in (default: `'Authorization'`).
  - If you use `auth` middleware with `retry`, `retry` must be used before `auth`. Eg. if token expired when retries apply, then `retry` can call `auth` middleware again.
- **loggerMiddleware** - for logging requests and responses.
  - `logger` - log function (default: `console.log.bind(console, '[RELAY-NETWORK]')`)
  - If you use `Relay@^0.9.0` you may turn on relay's internal [extended mutation debugger](https://twitter.com/steveluscher/status/738101549591732225). For this you should open browser console and type `__DEV__=true`. With webpack you may use `webpack.BannerPlugin('__DEV__=true;', {raw: true})` or `webpack.DefinePlugin({__DEV__: true})`.
  - If you use `Relay@^0.8.0` you may turn on [internal Relay requests debugger](https://cloud.githubusercontent.com/assets/1946920/15735688/688ccabe-28bc-11e6-82e2-db644eb698b0.png): `import RelayNetworkDebug from 'react-relay/lib/RelayNetworkDebug';  RelayNetworkDebug.init();`
- **perfMiddleware** - simple time measure for network request.
  - `logger` - log function (default: `console.log.bind(console, '[RELAY-NETWORK]')`)
- **gqErrorsMiddleware** - display `errors` data to console from graphql response. If you want see stackTrace for errors, you should provide `formatError` to `express-graphql` (see example below where `graphqlServer` accept `formatError` function).
  - `logger` - log function (default: `console.error.bind(console)`)
  - `prefix` - prefix message (default: `[RELAY-NETWORK] GRAPHQL SERVER ERROR:`)
- **deferMiddleware** - _experimental_ Right now `deferMiddleware()` just set `defer` as supported option for Relay. So this middleware allow to community play with `defer()` in cases, which was [described by @wincent](https://github.com/facebook/relay/issues/288#issuecomment-199510058).

### Example of injecting NetworkLayer with middlewares on the **client side**.
```js
import Relay from 'react-relay';
import {
  RelayNetworkLayer,
  urlMiddleware,
  batchMiddleware,
  loggerMiddleware,
  gqErrorsMiddleware,
  perfMiddleware,
  retryMiddleware,
  authMiddleware,
} from 'react-relay-network-modern';

Relay.injectNetworkLayer(new RelayNetworkLayer([
  urlMiddleware({
    url: (req) => '/graphql',
  }),
  batchMiddleware({
    batchUrl: (reqestMap) => '/graphql/batch',
    batchTimeout: 10,
  }),
  loggerMiddleware(),
  gqErrorsMiddleware(),
  perfMiddleware(),
  retryMiddleware({
    fetchTimeout: 15000,
    retryDelays: (attempt) => Math.pow(2, attempt + 4) * 100, // or simple array [3200, 6400, 12800, 25600, 51200, 102400, 204800, 409600],
    forceRetry: (cb, delay) => { window.forceRelayRetry = cb; console.log('call `forceRelayRetry()` for immediately retry! Or wait ' + delay + ' ms.'); },
    statusCodes: [500, 503, 504]
  }),
  authMiddleware({
    token: () => store.get('jwt'),
    tokenRefreshPromise: (req) => {
      console.log('[client.js] resolve token refresh', req);
      return fetch('/jwt/refresh')
        .then(res => res.json())
        .then(json => {
          const token = json.token;
          store.set('jwt', token);
          return token;
        })
        .catch(err => console.log('[client.js] ERROR can not refresh token', err));
    },
  }),

  // example of the custom inline middleware
  next => req => {
    // `req` is an object with settings for `fetch` function. It's not an express request object.
    // Internally works following code:
    //    let { url, ...opts } = req;
    //    fetch(url, opts)
    // So `req` is a fetch options. And into this options, I added `url` prop, which will be extracted as shown above.
    // You have fully control under `fetch` via `req` object.

    req.method = 'GET'; // change default POST request method to GET
    req.headers['X-Request-ID'] = uuid.v4(); // add `X-Request-ID` to request headers
    req.credentials = 'same-origin'; // provide CORS policy to XHR request in fetch method
    return next(req);
  }
]));
```

### How middlewares work internally

Middlewares on bottom layer use [fetch](https://github.com/github/fetch) method. So `req` is compliant with a `fetch()` options. And `res` can be obtained via `resPromise.then(res => ...)`, which returned by `fetch()`.

Middlewares have 3 phases:
- `setup phase`, which runs only once, when middleware added to the NetworkLayer
- `capturing phase`, when you may change request object, and pass it down via `next(req)`
- `bubbling phase`, when you may change response promise, made re-request or pass it up unchanged

Basic skeleton of middleware:
```js
export default function skeletonMiddleware(opts = {}) {
  // [SETUP PHASE]: here you can process `opts`, when you create Middleware

  return next => req => {
    // [CAPTURING PHASE]: here you can change `req` object, before it will pass to following middlewares.
    // ...some code which modify `req`

    const resPromise = next(req); // pass request to following middleware and get response promise from it

    // [BUBBLING PHASE]: here you may change response of underlying middlewares, via promise syntax
    // ...some code, which may add `then()` or `catch()` to response promise
    //    resPromise.then(res => { console.log(res); return res; })

    return resPromise; // return response promise to upper middleware
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


Batching several requests into one
==================================

Joseph Savona [wrote](https://github.com/facebook/relay/issues/1058#issuecomment-213592051): For legacy reasons, Relay splits "plural" root queries into individual queries. In general we want to diff each root value separately, since different fields may be missing for different root values.

Also if you use [react-relay-router](https://github.com/relay-tools/react-router-relay) and have multiple root queries in one route pass, you may notice that default network layer will produce several http requests.

So for avoiding multiple http-requests, the `ReactRelayNetworkModern` is the right way to combine it in single http-request.

### Example how to enable batching
#### ...on server
Firstly, you should prepare **server** to proceed the batch request:

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
  formatError: (error) => ({ // better errors for development. `stack` used in `gqErrors` middleware
    message: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack.split('\n') : null,
  }),
});

// declare route for batch query
server.use('/graphql/batch',
  bodyParser.json(),
  graphqlBatchHTTPWrapper(graphqlServer)
);

// declare standard graphql route
server.use('/graphql',
  graphqlServer
);

server.listen(port, () => {
  console.log(`The server is running at http://localhost:${port}/`);
});
```
[More complex example](https://github.com/nodkz/react-relay-network-modern/blob/master/examples/dataLoaderPerBatchRequest.js) of how you can use a single [DataLoader](https://github.com/facebook/dataloader) for all (batched) queries within a one HTTP-request.

If you are on Koa@2, [koa-graphql-batch](https://github.com/mattecapu/koa-graphql-batch) provides the same functionality as `graphqlBatchHTTPWrapper` (see its docs for usage example).

#### ...on client
And right after server side ready to accept batch queries, you may enable batching on the **client**:

```js
Relay.injectNetworkLayer(new RelayNetworkLayer([
  batchMiddleware({
    batchUrl: '/graphql/batch', // <--- route for batch queries
  }),
]));
```

### How batching works internally
Internally batching in NetworkLayer prepare list of queries `[ {id, query, variables}, ...]` sends it to server. And server returns list of responces `[ {id, payload}, ...]`, (where `id` is the same value as client requested for identifying which data goes with which query, and `payload` is standard response of GraphQL server: `{ data, error }`).


Contribute
==========
I actively welcome pull requests with code and doc fixes.
Also if you made great middleware and want share it within this module, please feel free to open PR.

[CHANGELOG](https://github.com/nodkz/react-relay-network-modern/blob/master/CHANGELOG.md)


License
=======
[MIT](https://github.com/nodkz/react-relay-network-modern/blob/master/LICENSE.md)
