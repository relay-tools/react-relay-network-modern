/*
Example of how you can use a single DataLoader for all (batched) queries
within a single HTTP-request.

Tuned for performance, to avoid creating unnecessary functions per request.
*/

import express from 'express';
import graphqlHTTP from 'express-graphql';
import { graphqlBatchHTTPWrapper } from 'react-relay-network-modern';
import bodyParser from 'body-parser';
import myGraphqlSchema from './graphqlSchema';
import DataLoader from 'dataloader';

const port = 3000;
const server = express();

// Define DataLoaders implementation
const initDataLoaders = () => {
  const authors = new DataLoader(
    keys =>
      new Promise((resolve, reject) => {
        // somehow found authors by keys, call resolve or reject
      })
  );
  const articles = new DataLoader(
    keys =>
      new Promise((resolve, reject) => {
        // somehow found articles by keys, call resolve or reject
      })
  );
  return {
    authors,
    articles,
  };
};

// for performance reasons, create a single error function converter (rather than every request)
const formatError = error => ({
  // better errors for development. `stack` used in `gqErrors` middleware
  message: error.message,
  stack: process.env.NODE_ENV === 'development' ? error.stack.split('\n') : null,
});

// prepare `graphqlHTTP` express-middleware per request settings
const graphqlSettingsPerRequest = req => ({
  schema: myGraphqlSchema,
  graphiql: true,
  formatError,
  pretty: true,
  context: {
    request: req, // just for example, pass request to context
    dataLoaders: initDataLoaders(),
  },
});

// Declare route for batch query

// `graphqlBatchHTTPWrapper` and `graphqlHTTP` return arrow functions.
// For performance reasons, declare it once outside (req, res, next) => {} block,
// rather than for every request. Otherwise, it will result in the garbage collector
// being invoked way more than necessary.
const graphqlBatchMiddleware = graphqlBatchHTTPWrapper(
  graphqlHTTP(req => req.graphqlServerSettings)
);
server.use(
  '/graphql/batch', // NB: should be before `server.use('/graphql', ...)`
  bodyParser.json(),
  (req, res, next) => {
    req.graphqlServerSettings = graphqlSettingsPerRequest(req); // eslint-disable-line
    graphqlBatchMiddleware(req, res, next);
  }
);

// Declare standard graphql route
server.use(
  '/graphql', // NB: should be after `server.use('/graphql/batch', ...)`)
  graphqlHTTP(graphqlSettingsPerRequest)
);

server.listen(port, () => {
  console.log(`The server is running at http://localhost:${port}/`);
});
