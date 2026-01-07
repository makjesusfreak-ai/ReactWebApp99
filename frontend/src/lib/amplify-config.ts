'use client';

import { Amplify } from 'aws-amplify';

const amplifyConfig = {
  API: {
    GraphQL: {
      endpoint: process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT!,
      region: process.env.NEXT_PUBLIC_APPSYNC_REGION || 'us-east-1',
      defaultAuthMode: 'apiKey' as const,
      apiKey: process.env.NEXT_PUBLIC_APPSYNC_API_KEY!,
    },
  },
};

let isConfigured = false;

export function configureAmplify() {
  if (!isConfigured && typeof window !== 'undefined') {
    try {
      Amplify.configure(amplifyConfig);
      isConfigured = true;
      console.log('✅ Amplify configured for AppSync real-time subscriptions');
    } catch (error) {
      console.error('Failed to configure Amplify:', error);
    }
  }
  return isConfigured;
}

export default amplifyConfig;
