/* eslint-disable no-param-reassign, arrow-body-style, dot-notation */

import RelayResponse from '../RelayResponse';
import { createRequestError } from '../createRequestError';
import type { FormatMiddleware } from '../definition';

export default function formatMiddleware(): FormatMiddleware {
  return next => async req => {
    const resFromFetch = await next(req);

    const res = await RelayResponse.createFromFetch(resFromFetch);
    if (res.status && res.status >= 400) {
      throw createRequestError(req, res);
    }
    return res;
  };
}
