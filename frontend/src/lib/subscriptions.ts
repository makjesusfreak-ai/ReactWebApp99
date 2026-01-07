'use client';

import { generateClient } from 'aws-amplify/api';
import { configureAmplify } from './amplify-config';
import { Ailment } from '@/types';

// Ensure Amplify is configured
configureAmplify();

// GraphQL subscription documents - must match AppSync schema exactly
const AILMENT_CREATED_SUBSCRIPTION = /* GraphQL */ `
  subscription AilmentCreated {
    ailmentCreated {
      id
      ailment {
        name
        description
        duration
        intensity
        severity
      }
      treatments {
        id
        name
        description
        application
        efficacy
        duration
        intensity
        type
        sideEffects {
          id
          name
          description
          duration
          intensity
          severity
        }
        setting
        isPreventative
        isPalliative
        isCurative
      }
      diagnostics {
        id
        name
        description
        efficacy
        duration
        intensity
        type
        sideEffects {
          id
          name
          description
          duration
          intensity
          severity
        }
        setting
      }
    }
  }
`;

const AILMENT_UPDATED_SUBSCRIPTION = /* GraphQL */ `
  subscription AilmentUpdated {
    ailmentUpdated {
      id
      ailment {
        name
        description
        duration
        intensity
        severity
      }
      treatments {
        id
        name
        description
        application
        efficacy
        duration
        intensity
        type
        sideEffects {
          id
          name
          description
          duration
          intensity
          severity
        }
        setting
        isPreventative
        isPalliative
        isCurative
      }
      diagnostics {
        id
        name
        description
        efficacy
        duration
        intensity
        type
        sideEffects {
          id
          name
          description
          duration
          intensity
          severity
        }
        setting
      }
    }
  }
`;

const AILMENT_DELETED_SUBSCRIPTION = /* GraphQL */ `
  subscription AilmentDeleted {
    ailmentDeleted {
      id
      success
      message
    }
  }
`;

export type SubscriptionCallback<T> = (data: T) => void;
export type SubscriptionErrorCallback = (error: any) => void;

export interface Subscription {
  unsubscribe: () => void;
}

// Create a client getter to ensure it's created after Amplify is configured
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let client: any = null;

function getClient() {
  if (!client) {
    configureAmplify();
    client = generateClient();
  }
  return client;
}

export function subscribeToAilmentCreated(
  onData: SubscriptionCallback<Ailment>,
  onError?: SubscriptionErrorCallback
): Subscription {
  const amplifyClient = getClient();
  
  const sub = amplifyClient.graphql({
    query: AILMENT_CREATED_SUBSCRIPTION,
  }).subscribe({
    next: ({ data }: any) => {
      if (data?.ailmentCreated) {
        console.log('🔔 Real-time: Ailment created', data.ailmentCreated);
        onData(data.ailmentCreated);
      }
    },
    error: (error: any) => {
      console.error('Subscription error (created):', error);
      onError?.(error);
    },
  });

  return {
    unsubscribe: () => sub.unsubscribe(),
  };
}

export function subscribeToAilmentUpdated(
  onData: SubscriptionCallback<Ailment>,
  onError?: SubscriptionErrorCallback
): Subscription {
  const amplifyClient = getClient();
  
  const sub = amplifyClient.graphql({
    query: AILMENT_UPDATED_SUBSCRIPTION,
  }).subscribe({
    next: ({ data }: any) => {
      if (data?.ailmentUpdated) {
        console.log('🔄 Real-time: Ailment updated', data.ailmentUpdated);
        onData(data.ailmentUpdated);
      }
    },
    error: (error: any) => {
      console.error('Subscription error (updated):', error);
      onError?.(error);
    },
  });

  return {
    unsubscribe: () => sub.unsubscribe(),
  };
}

export function subscribeToAilmentDeleted(
  onData: SubscriptionCallback<{ id: string; success: boolean; message?: string }>,
  onError?: SubscriptionErrorCallback
): Subscription {
  const amplifyClient = getClient();
  
  const sub = amplifyClient.graphql({
    query: AILMENT_DELETED_SUBSCRIPTION,
  }).subscribe({
    next: ({ data }: any) => {
      if (data?.ailmentDeleted) {
        console.log('🗑️ Real-time: Ailment deleted', data.ailmentDeleted);
        onData(data.ailmentDeleted);
      }
    },
    error: (error: any) => {
      console.error('Subscription error (deleted):', error);
      onError?.(error);
    },
  });

  return {
    unsubscribe: () => sub.unsubscribe(),
  };
}
