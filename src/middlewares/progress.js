/* @flow */
/* eslint-disable no-await-in-loop */

import type { RawMiddleware } from '../definition';

export type ProgressOpts = {
  sizeHeader?: string,
  onProgress: Function,
};

function createProgressHandler(opts: ProgressOpts) {
  const { onProgress, sizeHeader = 'Content-Length' } = opts || {};

  return async res => {
    if (!(res.body instanceof ReadableStream)) {
      return;
    }

    const totalResponseSize = res.headers.get(sizeHeader);

    let totalSize = null;
    if (totalResponseSize !== null) {
      totalSize = parseInt(totalResponseSize, 10);
    }

    const reader = res.body.getReader();

    let completed = false;
    let runningTotal = 0;
    do {
      const { done, value: { length } = { length: 0 } } = await reader.read();

      completed = done;

      if (!completed) {
        runningTotal += length;
        onProgress(runningTotal, totalSize);
      }
    } while (!completed);
  };
}

export default function progressMiddleware(opts: ProgressOpts): RawMiddleware {
  const progressHandler = createProgressHandler(opts);

  return next => async req => {
    const res = await next(req);
    progressHandler(res.clone());
    return res;
  };
}
