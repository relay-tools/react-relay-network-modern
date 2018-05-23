## 0.0.0-semantically-released (March 04, 2017)

This package publishing automated by [semantic-release](https://github.com/semantic-release/semantic-release).
[Changelog](https://github.com/relay-tools/react-relay-network-layer/releases) is generated automatically and can be found here: https://github.com/relay-tools/react-relay-network-layer/releases

## 1.4.0 (February 06, 2017)

* feat(Mutation): Add support to multiple files upload [relay#586](https://github.com/facebook/relay/issues/586). #38 (thanks to @giautm)
* fix(Auth middleware): Only first request that failed during tokenRefresh was retries. #37 (thanks to @alexxv)
* chore(Packages): Update dev packages. Add yarn.

## 1.3.9 (December 30, 2016)

* Auth middleware: when client makes multiples relay requests with expired token, we only need to refresh token once for those requests. #32 (thanks to @alexxv)

## 1.3.8 (December 22, 2016)

* Configurable header name for auth middleware #28 (thanks to @tehwalris)
  For `auth` middleware added `header` option: name of the HTTP header to pass the token in (default: `'Authorization'`).

## 1.3.7 (December 18, 2016)

* Fix `formatRequestErrors` for Absinthe (GraphQL for Elixir) #27 (thanks to @redjohn)

## 1.3.6 (October 11, 2016)

#### Thanks to @kosmikko for his PR #21

* Catch unhandled promises, (closes #7 Red screen for react-native when network problem occurs).
* Add tests.
* Remove unnecessary wrapping Promise.

## 1.3.5 (October 4, 2016)

* Handle malformed or non existent JSON in response (#20). Thanks to @JonathanUsername
* Return main promise. Thanks to @helfer https://github.com/graphql/express-graphql/pull/99
  Returning the main promise will let you do things like time execution and perform some cleanups after the request is processed.

## 1.3.4 (August 29, 2016)

* fix: support `express-graphql@0.5.4`. Thanks @genbit [issue #19](https://github.com/relay-tools/react-relay-network-layer/issues/19)

## 1.3.3 (August 5, 2016)

* fix: batch express middleware. It should not call next middleware. Thanks @genbit [issue #13](https://github.com/relay-tools/react-relay-network-layer/issues/13)

## 1.3.2 (July 28, 2016)

* fix: gqErrors middleware, it does not display errors for single request (thanks to @jibingeo)

## 1.3.1 (July 12, 2016)

* fix: catch react-native error, when network request fails, eg. offline ([issue #7](https://github.com/relay-tools/react-relay-network-layer/issues/7)).

## 1.2.0 (June 21, 2016)

* fix: remove `whatwg-fetch` polyfill, due problem in React Native ([issue #8](https://github.com/relay-tools/react-relay-network-layer/issues/8)).

If your client does not have `fetch` global method, you should include polyfill explicitly in you code:

```js
import 'whatwg-fetch'; // for old browsers
or;
import 'node-fetch'; // for old node versions
or;
import 'fetch-everywhere'; // fresh isomorphic fetch polyfill, that supports all clients (not tested ;)
```

Thanks to @roman01la and @edvinerikson.

## 1.1.4 (June 15, 2016)

* feat: add `allowEmptyToken` option for `authMiddleware` to allow made a request without Authorization header if token is empty

## 1.1.3 (June 13, 2016)

* fix: files upload with auth middleware (thanks to @alexanderlamb)

## 1.1.2 (May 27, 2016)

* feat: improve performance of `graphqlBatchHTTPWrapper`, by removing JSON.parse

## 1.1.1 (May 27, 2016)

* fix: add support for express-graphql@0.5.2

## 1.1.0 (May 17, 2016)

* feat: Add `json` param to `response`. Now it's available for middleware in bubbling phase (res.json).
* feat: new middleware `gqErrors` - display `errors` data to console from graphql response
  ![gqErrorsMiddleware](https://cloud.githubusercontent.com/assets/1946920/15324650/28582d12-1c69-11e6-9ef3-6834dee031e6.png)
* experimental: `deferMiddleware`, right now it's only inform Relay that NetworkLayer support this feature. See discussion about `defer` here [relay/issues/288](https://github.com/facebook/relay/issues/288)

## 1.0.3 (May 4, 2016)

* feat: improved `retryMiddleware` with thunk retries delays and force fetch

## 1.0.2 (May 4, 2016)

* feat: New `retryMiddleware` for request retry if the initial request fails (thanks to @mario-jerkovic)
* fix: `authMiddleware` which pass lowercased header `Authorization`

## 1.0.1 (April 25, 2016)

* docs: Prepare `README.md` for npmjs.com

## 1.0.0 (April 23, 2016)

* Initial public release
