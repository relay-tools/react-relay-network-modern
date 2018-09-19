/* @flow */

import RelayRequest from './RelayRequest';
import type { GraphQLResponseErrors, RelayRequestAny } from './definition';
import type RelayResponse from './RelayResponse';

class RRNLRequestError extends Error {
  req: RelayRequestAny;
  res: ?RelayResponse;

  constructor(msg: string) {
    super(msg);
    this.name = 'RRNLRequestError';
  }
}

/**
 * Formats an error response from GraphQL server request.
 */
export function formatGraphQLErrors(request: RelayRequest, errors: GraphQLResponseErrors): string {
  const CONTEXT_BEFORE = 20;
  const CONTEXT_LENGTH = 60;

  if (!request.getQueryString) {
    return errors.join('\n');
  }

  const queryLines = request.getQueryString().split('\n');
  return errors
    .map(({ locations, message }, ii) => {
      const prefix = `${ii + 1}. `;
      const indent = ' '.repeat(prefix.length);

      // custom errors thrown in graphql-server may not have locations
      const locationMessage = locations
        ? '\n' +
          locations
            .map(({ column, line }) => {
              const queryLine = queryLines[line - 1];
              const offset = Math.min(column - 1, CONTEXT_BEFORE);
              return [
                queryLine.substr(column - 1 - offset, CONTEXT_LENGTH),
                `${' '.repeat(Math.max(offset, 0))}^^^`,
              ]
                .map(messageLine => indent + messageLine)
                .join('\n');
            })
            .join('\n')
        : '';
      return prefix + message + locationMessage;
    })
    .join('\n');
}

export function createRequestError(req: RelayRequestAny, res?: RelayResponse) {
  let errorReason = '';

  if (!res) {
    errorReason = 'Server return empty response.';
  } else if (!res.json) {
    errorReason =
      (res.text ? res.text : `Server return empty response with Status Code: ${res.status}.`) +
      (res ? `\n\n${res.toString()}` : '');
  } else if (res.errors) {
    if (req instanceof RelayRequest) {
      errorReason = formatGraphQLErrors(req, res.errors);
    } else {
      errorReason = JSON.stringify(res.errors);
    }
  } else if (!res.data) {
    errorReason = 'Server return empty response.data.\n\n' + res.toString();
  }

  const error = new RRNLRequestError(
    `Relay request for \`${req.getID()}\` failed by the following reasons:\n\n${errorReason}`
  );

  error.req = req;
  error.res = res;
  return error;
}
