/* @flow */

import fetchMock from 'fetch-mock';
import RelayNetworkLayer from '../../RelayNetworkLayer';
import { mockReq } from '../../__mocks__/mockReq';
import gqlErrorsMiddleware from '../gqlErrors';

describe('middlewares/gqlErrors', () => {
  beforeEach(() => {
    fetchMock.restore();
  });

  it('should display graphql errors', async () => {
    fetchMock.mock({
      matcher: '/graphql',
      response: {
        status: 200,
        body: {
          errors: [
            {
              message: 'Wow!',
              stack: [
                'Error: Wow!',
                '    at resolve (/Volumes/npm_ram_disk/build/development/webpack:/src/schema/cabinet/cabinet.js:492:1)',
                '    at resolveFieldValueOrError (/Volumes/npm_ram_disk/node_modules/graphql/execution/execute.js:498:12)',
                '    at resolveField (/Volumes/npm_ram_disk/node_modules/graphql/execution/execute.js:462:16)',
                '    at /Volumes/npm_ram_disk/node_modules/graphql/execution/execute.js:311:18',
                '    at Array.reduce (<anonymous>)',
                '    at executeFields (/Volumes/npm_ram_disk/node_modules/graphql/execution/execute.js:308:42)',
                '    at collectAndExecuteSubfields (/Volumes/npm_ram_disk/node_modules/graphql/execution/execute.js:746:10)',
                '    at completeObjectValue (/Volumes/npm_ram_disk/node_modules/graphql/execution/execute.js:728:10)',
                '    at completeValue (/Volumes/npm_ram_disk/node_modules/graphql/execution/execute.js:625:12)',
                '    at /Volumes/npm_ram_disk/node_modules/graphql/execution/execute.js:582:14',
                '    at <anonymous>',
                '    at process._tickDomainCallback (internal/process/next_tick.js:228:7)',
              ],
            },
          ],
        },
      },
      method: 'POST',
    });

    const logger = jest.fn();
    const rnl = new RelayNetworkLayer([
      gqlErrorsMiddleware({
        logger,
      }),
    ]);

    await mockReq('MyRequest')
      .execute(rnl)
      .catch(() => {});
    expect(logger).toHaveBeenCalledTimes(1);
    expect(logger.mock.calls[0][0]).toMatchSnapshot();
  });
});
