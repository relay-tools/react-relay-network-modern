/* eslint-disable no-param-reassign */
import fetchMock from "fetch-mock";
import fetchWithMiddleware from "../fetchWithMiddleware";
import RelayRequest from "../RelayRequest";
import RelayResponse from "../RelayResponse";
describe('fetchWithMiddleware', () => {
  beforeEach(() => {
    fetchMock.restore();
  });
  it('should make a successfull request without middlewares', async () => {
    fetchMock.post('/graphql', {
      id: 1,
      data: {
        user: 123
      }
    });
    const req = new RelayRequest(({} as any), {}, {}, null);
    const res = await fetchWithMiddleware(req, [], []);
    expect(res.data).toEqual({
      user: 123
    });
  });
  it('should make a successfull request with middlewares', async () => {
    const numPlus5 = next => async req => {
      (req as any).fetchOpts.headers.reqId += ':mw1';
      const res: any = await next(req);
      res.data.text += ':mw1';
      return res;
    };

    const numMultiply10 = next => async req => {
      (req as any).fetchOpts.headers.reqId += ':mw2';
      const res: any = await next(req);
      res.data.text += ':mw2';
      return res;
    };

    fetchMock.post('/graphql', {
      id: 1,
      data: {
        text: 'response'
      }
    });
    const req = new RelayRequest(({} as any), {}, {}, null);
    req.fetchOpts.headers = {
      reqId: 'request'
    };
    const res: any = await fetchWithMiddleware(req, [numPlus5, numMultiply10 // should be last, when changing request
    //                should be first, when changing response
    ], []);
    expect(res.data.text).toEqual('response:mw2:mw1');
    expect(fetchMock.lastOptions().headers.reqId).toEqual('request:mw1:mw2');
  });
  it('should fail correctly on network failure', async () => {
    fetchMock.mock({
      matcher: '/graphql',
      response: {
        throws: new Error('Network connection error')
      },
      method: 'POST'
    });
    const req = new RelayRequest(({} as any), {}, {}, null);
    expect.assertions(2);

    try {
      await fetchWithMiddleware(req, [], []);
    } catch (e) {
      expect(e instanceof Error).toBeTruthy();
      expect(e.toString()).toMatch('Network connection error');
    }
  });
  it('should handle error response', async () => {
    fetchMock.mock({
      matcher: '/graphql',
      response: {
        status: 200,
        body: {
          errors: [{
            location: 1,
            message: 'major error'
          }]
        }
      },
      method: 'POST'
    });
    const req = new RelayRequest(({} as any), {}, {}, null);
    expect.assertions(2);

    try {
      await fetchWithMiddleware(req, [], []);
    } catch (e) {
      expect(e instanceof Error).toBeTruthy();
      expect(e.toString()).toMatch('major error');
    }
  });
  it('should not throw if noThrow set', async () => {
    fetchMock.mock({
      matcher: '/graphql',
      response: {
        status: 200,
        body: {
          errors: [{
            location: 1,
            message: 'major error'
          }]
        }
      },
      method: 'POST'
    });
    const req = new RelayRequest(({} as any), {}, {}, null);
    expect.assertions(1);
    const res = await fetchWithMiddleware(req, [], [], true);
    expect(res.errors).toEqual([{
      location: 1,
      message: 'major error'
    }]);
  });
  it('should handle server non-2xx errors', async () => {
    fetchMock.mock({
      matcher: '/graphql',
      response: {
        status: 500,
        body: 'Something went completely wrong.'
      },
      method: 'POST'
    });
    const req = new RelayRequest(({} as any), {}, {}, null);
    expect.assertions(2);

    try {
      await fetchWithMiddleware(req, [], []);
    } catch (e) {
      expect(e instanceof Error).toBeTruthy();
      expect(e.toString()).toMatch('Something went completely wrong');
    }
  });
  it('should fail on missing `data` property', async () => {
    fetchMock.mock({
      matcher: '/graphql',
      response: {
        status: 200,
        body: {},
        sendAsJson: true
      },
      method: 'POST'
    });
    const req = new RelayRequest(({} as any), {}, {}, null);
    expect.assertions(2);

    try {
      await fetchWithMiddleware(req, [], []);
    } catch (e) {
      expect(e instanceof Error).toBeTruthy();
      expect(e.toString()).toMatch('Server return empty response.data');
    }
  });
  it('should fail correctly with a response from a middleware cache', async () => {
    const middleware = () => async () => RelayResponse.createFromGraphQL({
      errors: [{
        message: 'A GraphQL error occurred'
      }]
    });

    const req = new RelayRequest(({} as any), {}, {}, null);
    expect.hasAssertions();

    try {
      await fetchWithMiddleware(req, [middleware], []);
    } catch (e) {
      expect(e instanceof Error).toBeTruthy();
      expect(e.toString()).toMatch('A GraphQL error occurred');
    }
  });
});