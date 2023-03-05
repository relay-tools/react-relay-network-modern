/* @flow */

type ExpressMiddleware = (req: any, res: any) => any;

export default function (graphqlHTTPMiddleware: ExpressMiddleware): ExpressMiddleware {
  return (req, res) => {
    const subResponses = [];
    return Promise.all(
      req.body.map(
        (data) =>
          new Promise((resolve) => {
            const subRequest = {
              __proto__: req.__proto__, // eslint-disable-line
              ...req,
              body: data,
            };
            const subResponse = {
              ...res,
              status(st) {
                this.statusCode = st;
                return this;
              },
              set() {
                return this;
              },
              send(payload) {
                resolve({ status: this.statusCode, id: data.id, payload });
              },

              // support express-graphql@0.5.2
              setHeader() {
                return this;
              },
              header() {},
              write(payload) {
                this.payload = payload;
              },
              end(payload) {
                // support express-graphql@0.5.4
                if (payload) {
                  this.payload = payload;
                }
                resolve({
                  status: this.statusCode,
                  id: data.id,
                  payload: this.payload,
                });
              },
            };
            subResponses.push(subResponse);
            graphqlHTTPMiddleware(subRequest, subResponse);
          })
      )
    )
      .then((responses) => {
        let response = '';
        responses.forEach(({ status, id, payload }, idx) => {
          if (status) {
            res.status(status);
          }
          const comma = responses.length - 1 > idx ? ',' : '';
          response += `{ "id":"${id}", "payload":${payload} }${comma}`;
        });
        res.set('Content-Type', 'application/json');
        res.send(`[${response}]`);
      })
      .catch((err) => {
        res.status(500).send({ error: err.message });
      });
  };
}
