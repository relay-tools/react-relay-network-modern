/* @flow */

import fetchMock from 'fetch-mock';
import RelayNetworkLayer from '../../RelayNetworkLayer';
import { mockReq } from '../../__mocks__/mockReq';
import urlMiddleware from '../url';

describe('middlewares/url', () => {
  beforeEach(() => {
    fetchMock.restore();
  });

  it('`url` option as string', async () => {
    fetchMock.mock({
      matcher: '/some_url',
      response: {
        status: 200,
        body: { data: 'PAYLOAD' },
      },
      method: 'POST',
    });

    const rnl = new RelayNetworkLayer([
      urlMiddleware({
        url: '/some_url',
      }),
    ]);
    const req = mockReq();
    const res = await req.execute(rnl);
    expect(res.data).toBe('PAYLOAD');
    expect(fetchMock.lastOptions()).toMatchSnapshot();
  });

  it('`url` option as thunk', async () => {
    fetchMock.mock({
      matcher: '/thunk_url',
      response: {
        status: 200,
        body: { data: 'PAYLOAD2' },
      },
      method: 'POST',
    });

    const rnl = new RelayNetworkLayer([
      urlMiddleware({
        url: () => '/thunk_url',
      }),
    ]);
    const req = mockReq();
    const res = await req.execute(rnl);
    expect(res.data).toBe('PAYLOAD2');
    expect(fetchMock.lastOptions()).toMatchSnapshot();
  });

  it('`method` option', async () => {
    fetchMock.mock({
      matcher: '/get_url',
      response: {
        status: 200,
        body: { data: 'PAYLOAD3' },
      },
      method: 'GET',
    });

    const rnl = new RelayNetworkLayer([
      urlMiddleware({
        url: '/get_url',
        method: 'GET',
      }),
    ]);
    const req = mockReq();
    const res = await req.execute(rnl);
    expect(res.data).toBe('PAYLOAD3');
    expect(fetchMock.lastOptions()).toMatchSnapshot();
  });

  it('`headers` option as Object', async () => {
    fetchMock.mock({
      matcher: '/headers_url',
      response: {
        status: 200,
        body: { data: 'PAYLOAD4' },
      },
      method: 'POST',
    });

    const rnl = new RelayNetworkLayer([
      urlMiddleware({
        url: '/headers_url',
        headers: {
          'custom-header': '123',
        },
      }),
    ]);
    const req = mockReq();
    const res = await req.execute(rnl);
    expect(res.data).toBe('PAYLOAD4');
    expect(fetchMock.lastOptions()).toMatchSnapshot();
  });

  it('`headers` option as thunk', async () => {
    fetchMock.mock({
      matcher: '/headers_thunk',
      response: {
        status: 200,
        body: { data: 'PAYLOAD5' },
      },
      method: 'POST',
    });

    const rnl = new RelayNetworkLayer([
      urlMiddleware({
        url: '/headers_thunk',
        headers: () => ({
          'thunk-header': '333',
        }),
      }),
    ]);
    const req = mockReq();
    const res = await req.execute(rnl);
    expect(res.data).toBe('PAYLOAD5');
    expect(fetchMock.lastOptions()).toMatchSnapshot();
  });

  it('`credentials` option', async () => {
    fetchMock.mock({
      matcher: '/credentials_url',
      response: {
        status: 200,
        body: { data: 'PAYLOAD6' },
      },
      method: 'POST',
    });

    const rnl = new RelayNetworkLayer([
      urlMiddleware({
        url: '/credentials_url',
        credentials: 'same-origin',
      }),
    ]);
    const req = mockReq();
    const res = await req.execute(rnl);
    expect(res.data).toBe('PAYLOAD6');
    expect(fetchMock.lastOptions()).toMatchSnapshot();
  });
});
