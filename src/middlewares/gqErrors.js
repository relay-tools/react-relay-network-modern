/* @flow */
/* eslint-disable no-console */

import type { Middleware } from '../definition';

export type GqErrorMiddlewareOpts = {|
  logger?: Function,
  prefix?: string,
  disableServerMiddlewareTip?: boolean,
|};

export default function gqErrorsMiddleware(options?: GqErrorMiddlewareOpts): Middleware {
  const opts = options || {};
  const logger = opts.logger || console.error.bind(console);
  const prefix = opts.prefix || '[RELAY-NETWORK] GRAPHQL SERVER ERROR:\n\n';
  const disableServerMiddlewareTip = opts.disableServerMiddlewareTip || false;

  function displayErrors(errors, nlData) {
    return errors.forEach(error => {
      const { message, stack, ...rest } = error;

      let msg = `${prefix}`;
      const fmt = [];

      if (stack && Array.isArray(stack)) {
        msg = `${msg}%c${stack.shift()}\n%c${stack.join('\n')}`;
        fmt.push('font-weight: bold;', 'font-weight: normal;');
      } else {
        msg = `${msg}%c${message} %c`;
        fmt.push('font-weight: bold;', 'font-weight: normal;');
      }

      if (rest && Object.keys(rest).length) {
        msg = `${msg}\n  %O`;
        fmt.push(rest);
      }

      msg = `${msg}\n\n%cRequest Response data:\n  %c%O`;
      fmt.push('font-weight: bold;', 'font-weight: normal;', nlData);

      if (!stack && !disableServerMiddlewareTip) {
        msg = `${msg}\n\n%cNotice:%c${noticeAbsentStack()}`;
        fmt.push('font-weight: bold;', 'font-weight: normal;');
      }

      logger(`${msg}\n\n`, ...fmt);
    });
  }

  return next => req => {
    const query = `${req.relayReqType} ${req.relayReqId}`;

    return next(req).then(res => {
      if (res.payload) {
        if (Array.isArray(res.payload)) {
          res.payload.forEach(batchItem => {
            if (batchItem.payload.errors) {
              displayErrors(batchItem.payload.errors, { query, req, res });
            }
          });
        } else if (res.payload.errors) {
          displayErrors(res.payload.errors, { query, req, res });
        }
      }
      return res;
    });
  };
}

function noticeAbsentStack() {
  return `
    If you using 'express-graphql', you may get server stack-trace for error.
    Just tune 'formatError' to return 'stack' with stack-trace:

    import graphqlHTTP from 'express-graphql';

    const graphQLMiddleware = graphqlHTTP({
      schema: myGraphQLSchema,
      formatError: (error) => ({
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack.split('\\n') : null,
      })
    });

    app.use('/graphql', graphQLMiddleware);`;
}
