/* eslint-disable no-console */
import type { Middleware } from "../definition";
export type PerfMiddlewareOpts = {
  logger?: (...args: Array<any>) => any;
};
export default function performanceMiddleware(opts?: PerfMiddlewareOpts): Middleware {
  const logger = opts && opts.logger || console.log.bind(console, '[RELAY-NETWORK]');
  return next => req => {
    const start = new Date().getTime();
    return next(req).then(res => {
      const end = new Date().getTime();
      logger(`[${end - start}ms] ${req.getID()}`, req, res);
      return res;
    });
  };
}