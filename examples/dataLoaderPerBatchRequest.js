/* eslint-disable */
/*
Example of how you can use a single DataLoader for all (batched) queries
within a single HTTP-request.

Tuned for performance, to avoid creating unnecessary functions per request.
*/

import express, { Router } from 'express';
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

// Prepare `graphqlHTTP` express-middleware (by default provides the request as the context)
const graphqlMiddleware = graphqlHTTP({
  schema: myGraphqlSchema,
  graphiql: true,
  formatError: error => ({
    // better errors for development. `stack` used in `gqErrors` middleware
    message: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack.split('\n') : null,
  }),
  pretty: true,
});

// Create middleware to inject dataLoaders into request (and thereby into the graphql context, see above)
const injectDataLoaders = (req, res, next) => {
  req.dataLoaders = initDataLoaders();
  next();
};

// Create router for graphql endpoints, ensuring they share the same basic middleware
// Might as well add session checks or similiar things here
const graphqlRouter = Router();
graphqlRouter.use(injectDataLoaders);

// Declare route for batch query
graphqlRouter.use(
  '/batch', // NB: should be before `graphqlRouter.use('/', ...)`
  bodyParser.json(),
  graphqlBatchHTTPWrapper(graphqlMiddleware)
);

// Declare standard graphql route
graphqlRouter.use(
  '/', // NB: should be after `graphqlRouter.use('/batch', ...)`)
  graphqlMiddleware
);

server.use(
  '/graphql',
  graphqlRouter
);

server.listen(port, () => {
  console.log(`The server is running at http://localhost:${port}/`);
});
