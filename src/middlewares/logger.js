/* @flow */
/* eslint-disable no-console */

import type { Middleware } from '../definition';

export type LoggerMiddlewareOpts = {|
  logger?: Function,
|};

export default function loggerMiddleware(opts?: LoggerMiddlewareOpts): Middleware {
  const logger = (opts && opts.logger) || console.log.bind(console, '[RELAY-NETWORK]');

  return next => req => {
    const query = `${req.relayReqType} ${req.relayReqId}`;
    const start = new Date().getTime();

    logger(`Run ${query}`, req);
    return next(req).then(res => {
      const end = new Date().getTime();
      logger(`Done ${query} in ${end - start}ms`);
      if (res.status !== 200) {
        logger(`Status ${res.status}: ${res.statusText} for ${query}`, req, res);

        if (res.status === 400 && req.relayReqType === 'batch-query') {
          logger(
            `WARNING: You got 400 error for 'batch-query', probably problem on server side.
          You should connect wrapper:

          import graphqlHTTP from 'express-graphql';
          import { graphqlBatchHTTPWrapper } from 'react-relay-network-layer';

          const graphQLMiddleware = graphqlHTTP({ schema: GraphQLSchema });

          app.use('/graphql/batch', bodyParser.json(), graphqlBatchHTTPWrapper(graphQLMiddleware));
          app.use('/graphql', graphQLMiddleware);
          `
          );
        }
      }
      return res;
    });
  };
}
