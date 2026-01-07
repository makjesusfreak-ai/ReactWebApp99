import { gql } from '@apollo/client';

// Fragments for reusable field selections
export const SIDE_EFFECT_FIELDS = gql`
  fragment SideEffectFields on SideEffect {
    id
    name
    description
    duration
    intensity
    severity
  }
`;

export const TREATMENT_FIELDS = gql`
  fragment TreatmentFields on Treatment {
    id
    name
    description
    application
    efficacy
    duration
    intensity
    type
    setting
    isPreventative
    isPalliative
    isCurative
    sideEffects {
      ...SideEffectFields
    }
  }
  ${SIDE_EFFECT_FIELDS}
`;

export const DIAGNOSTIC_FIELDS = gql`
  fragment DiagnosticFields on Diagnostic {
    id
    name
    description
    efficacy
    duration
    intensity
    type
    setting
    sideEffects {
      ...SideEffectFields
    }
  }
  ${SIDE_EFFECT_FIELDS}
`;

export const AILMENT_FIELDS = gql`
  fragment AilmentFields on Ailment {
    id
    ailment {
      name
      description
      duration
      intensity
      severity
    }
    treatments {
      ...TreatmentFields
    }
    diagnostics {
      ...DiagnosticFields
    }
  }
  ${TREATMENT_FIELDS}
  ${DIAGNOSTIC_FIELDS}
`;

// Queries
export const GET_AILMENTS = gql`
  query GetAilments {
    getAilments {
      ...AilmentFields
    }
  }
  ${AILMENT_FIELDS}
`;

export const GET_AILMENT = gql`
  query GetAilment($id: ID!) {
    getAilment(id: $id) {
      ...AilmentFields
    }
  }
  ${AILMENT_FIELDS}
`;

// Mutations
export const CREATE_AILMENT = gql`
  mutation CreateAilment($input: CreateAilmentInput!) {
    createAilment(input: $input) {
      ...AilmentFields
    }
  }
  ${AILMENT_FIELDS}
`;

export const UPDATE_AILMENT = gql`
  mutation UpdateAilment($id: ID!, $input: UpdateAilmentInput!) {
    updateAilment(id: $id, input: $input) {
      ...AilmentFields
    }
  }
  ${AILMENT_FIELDS}
`;

export const DELETE_AILMENT = gql`
  mutation DeleteAilment($id: ID!) {
    deleteAilment(id: $id) {
      success
      message
    }
  }
`;

// Subscriptions for real-time updates
export const AILMENT_CREATED = gql`
  subscription OnAilmentCreated {
    ailmentCreated {
      ...AilmentFields
    }
  }
  ${AILMENT_FIELDS}
`;

export const AILMENT_UPDATED = gql`
  subscription OnAilmentUpdated {
    ailmentUpdated {
      ...AilmentFields
    }
  }
  ${AILMENT_FIELDS}
`;

export const AILMENT_DELETED = gql`
  subscription OnAilmentDeleted {
    ailmentDeleted {
      id
    }
  }
`;

// Combined subscription for all changes
export const AILMENT_CHANGES = gql`
  subscription OnAilmentChanges {
    ailmentChanges {
      type
      ailment {
        ...AilmentFields
      }
    }
  }
  ${AILMENT_FIELDS}
`;
