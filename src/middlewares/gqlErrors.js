/* @flow */
/* eslint-disable no-console */

import RelayRequest from '../RelayRequest';
import RelayRequestBatch from '../RelayRequestBatch';
import type RelayResponse from '../RelayResponse';
import type { Middleware, GraphQLResponseErrors, RelayRequestAny } from '../definition';

export type GqlErrorMiddlewareOpts = {|
  logger?: Function,
  prefix?: string,
  disableServerMiddlewareTip?: boolean,
|};

export default function gqlErrorsMiddleware(options?: GqlErrorMiddlewareOpts): Middleware {
  const opts = options || {};
  const logger = opts.logger || console.error.bind(console);
  const prefix = opts.prefix || '[RELAY-NETWORK] GRAPHQL SERVER ERROR:\n\n';
  const disableServerMiddlewareTip = opts.disableServerMiddlewareTip || false;

  function displayErrors(
    errors: GraphQLResponseErrors,
    reqRes: { req: RelayRequestAny, res: RelayResponse }
  ) {
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
      fmt.push('font-weight: bold;', 'font-weight: normal;', reqRes);

      if (!stack && !disableServerMiddlewareTip) {
        msg = `${msg}\n\n%cNotice:%c${noticeAbsentStack()}`;
        fmt.push('font-weight: bold;', 'font-weight: normal;');
      }

      logger(`${msg}\n\n`, ...fmt);
    });
  }

  return next => req => {
    return next(req).then(res => {
      if (req instanceof RelayRequest) {
        if (Array.isArray(res.errors)) {
          displayErrors(res.errors, { req, res });
        }
      } else if (req instanceof RelayRequestBatch) {
        if (Array.isArray(res.json)) {
          res.json.forEach((payload: any) => {
            if (Array.isArray(payload.errors)) {
              displayErrors(payload.errors, { req, res });
            }
          });
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
