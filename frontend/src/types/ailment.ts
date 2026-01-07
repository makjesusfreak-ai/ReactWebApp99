// Side Effect type - nested within treatments and diagnostics
export interface SideEffect {
  id: string;
  name: string;
  description: string;
  duration: number; // seconds
  intensity: number; // 0-100
  severity: number; // 0-100
}

// Treatment type
export interface Treatment {
  id: string;
  name: string;
  description: string;
  application: 'oral' | 'IV' | 'topical' | 'surgical';
  efficacy: number; // 0-100
  duration: number; // seconds
  intensity: number; // 0-100
  type: 'holistic' | 'symptom_based';
  sideEffects: SideEffect[];
  setting: 'hospital' | 'clinic' | 'home';
  isPreventative: boolean;
  isPalliative: boolean;
  isCurative: boolean;
}

// Diagnostic type
export interface Diagnostic {
  id: string;
  name: string;
  description: string;
  efficacy: number; // 0-100
  duration: number; // seconds
  intensity: number; // 0-100
  type: 'holistic' | 'symptom_based';
  sideEffects: SideEffect[];
  setting: 'hospital' | 'clinic' | 'home';
}

// Ailment details (nested object)
export interface AilmentDetails {
  name: string;
  description: string;
  duration: number; // seconds
  intensity: number; // 0-100
  severity: number; // 0-100
}

// Main Ailment record
export interface Ailment {
  id: string;
  ailment: AilmentDetails;
  treatments: Treatment[];
  diagnostics: Diagnostic[];
}

// Flattened row data for AG-Grid display
export interface FlattenedAilmentRow {
  id: string;
  rowType: 'ailment' | 'treatment' | 'diagnostic' | 'sideEffect';
  parentId?: string;
  grandParentId?: string;
  parentType?: 'treatment' | 'diagnostic';
  
  // Ailment fields
  ailmentName?: string;
  ailmentDescription?: string;
  ailmentDuration?: number;
  ailmentIntensity?: number;
  ailmentSeverity?: number;
  
  // Treatment fields
  treatmentName?: string;
  treatmentDescription?: string;
  treatmentApplication?: string;
  treatmentEfficacy?: number;
  treatmentDuration?: number;
  treatmentIntensity?: number;
  treatmentType?: string;
  treatmentSetting?: string;
  treatmentIsPreventative?: boolean;
  treatmentIsPalliative?: boolean;
  treatmentIsCurative?: boolean;
  
  // Diagnostic fields
  diagnosticName?: string;
  diagnosticDescription?: string;
  diagnosticEfficacy?: number;
  diagnosticDuration?: number;
  diagnosticIntensity?: number;
  diagnosticType?: string;
  diagnosticSetting?: string;
  
  // Side Effect fields
  sideEffectName?: string;
  sideEffectDescription?: string;
  sideEffectDuration?: number;
  sideEffectIntensity?: number;
  sideEffectSeverity?: number;
  
  // Hierarchy path for tree display
  path: string[];
  
  // Original data reference
  originalData?: Ailment | Treatment | Diagnostic | SideEffect;
}

// GraphQL subscription payload
export interface AilmentSubscriptionPayload {
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  ailment: Ailment;
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Chart data types
export interface BubbleChartDataPoint {
  id: string;
  ailmentName: string;
  duration: number;
  intensity: number;
  topTreatment: {
    name: string;
    efficacy: number;
    intensity: number;
  } | null;
  ailmentSeverity: number;
}

// Form validation
export interface ValidationError {
  field: string;
  message: string;
}

// Application constants
export const APPLICATION_OPTIONS = ['oral', 'IV', 'topical', 'surgical'] as const;
export const TYPE_OPTIONS = ['holistic', 'symptom_based'] as const;
export const SETTING_OPTIONS = ['hospital', 'clinic', 'home'] as const;

// Default values for new records
export const DEFAULT_SIDE_EFFECT: Omit<SideEffect, 'id'> = {
  name: '',
  description: '',
  duration: 0,
  intensity: 0,
  severity: 0,
};

export const DEFAULT_TREATMENT: Omit<Treatment, 'id'> = {
  name: '',
  description: '',
  application: 'oral',
  efficacy: 0,
  duration: 0,
  intensity: 0,
  type: 'symptom_based',
  sideEffects: [],
  setting: 'clinic',
  isPreventative: false,
  isPalliative: false,
  isCurative: false,
};

export const DEFAULT_DIAGNOSTIC: Omit<Diagnostic, 'id'> = {
  name: '',
  description: '',
  efficacy: 0,
  duration: 0,
  intensity: 0,
  type: 'symptom_based',
  sideEffects: [],
  setting: 'clinic',
};

export const DEFAULT_AILMENT: Omit<Ailment, 'id'> = {
  ailment: {
    name: '',
    description: '',
    duration: 0,
    intensity: 0,
    severity: 0,
  },
  treatments: [],
  diagnostics: [],
};
