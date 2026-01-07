'use client';

import { useEffect } from 'react';
import { ApolloProvider } from '@apollo/client';
import { apolloClient } from '@/graphql';
import { ToastProvider } from '@/components';
import { configureAmplify } from '@/lib/amplify-config';
import '@/styles/globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Configure Amplify on app initialization
  useEffect(() => {
    configureAmplify();
  }, []);

  return (
    <html lang="en">
      <head>
        <title>Ailment Tracker</title>
        <meta name="description" content="Healthcare ailment management system" />
      </head>
      <body>
        <ApolloProvider client={apolloClient}>
          <ToastProvider>{children}</ToastProvider>
        </ApolloProvider>
      </body>
    </html>
  );
}
