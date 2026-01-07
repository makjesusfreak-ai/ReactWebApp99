import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
} from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

const graphqlEndpoint = process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT || 'http://localhost:3001/graphql';
const apiKey = process.env.NEXT_PUBLIC_APPSYNC_API_KEY;

// HTTP connection to the API
const httpLink = createHttpLink({
  uri: graphqlEndpoint,
});

// Auth link to add API key header for AppSync
const authLink = setContext((_, { headers }) => {
  return {
    headers: {
      ...headers,
      ...(apiKey && { 'x-api-key': apiKey }),
    },
  };
});

// Combined link for queries and mutations
// Note: AppSync subscriptions require AWS Amplify or a custom WebSocket implementation
// For now, subscriptions are disabled - use polling or Amplify for real-time updates
const link = authLink.concat(httpLink);

// Apollo Client instance
export const apolloClient = new ApolloClient({
  link: link,
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          getAilments: {
            merge(existing, incoming) {
              return incoming;
            },
          },
        },
      },
      Ailment: {
        keyFields: ['id'],
      },
      Treatment: {
        keyFields: ['id'],
      },
      Diagnostic: {
        keyFields: ['id'],
      },
      SideEffect: {
        keyFields: ['id'],
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-first',
      nextFetchPolicy: 'cache-first',
      errorPolicy: 'ignore',
    },
    query: {
      fetchPolicy: 'cache-first',
      errorPolicy: 'all',
    },
    mutate: {
      errorPolicy: 'all',
    },
  },
});

export default apolloClient;
