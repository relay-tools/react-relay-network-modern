/* @flow */

import { extractFiles } from 'extract-files';

import type { Middleware } from '../definition';
import RelayRequestBatch from '../RelayRequestBatch';

export default function uploadMiddleware(): Middleware {
  return (next) => async (req) => {
    if (req instanceof RelayRequestBatch) {
      throw new Error('RelayRequestBatch is not supported');
    }

    const operations = {
      query: req.operation.text,
      variables: req.variables,
    };

    const { clone: extractedOperations, files } = extractFiles(operations);

    if (files.size) {
      const formData = new FormData();

      formData.append('operations', JSON.stringify(extractedOperations));

      const pathMap = {};
      let i = 0;
      files.forEach((paths) => {
        pathMap[++i] = paths;
      });
      formData.append('map', JSON.stringify(pathMap));

      i = 0;
      files.forEach((paths, file) => {
        formData.append(++i, file, file.name);
      });

      req.fetchOpts.method = 'POST';
      req.fetchOpts.body = formData;
      delete req.fetchOpts.headers['Content-Type'];
    }

    const res = await next(req);

    return res;
  };
}
