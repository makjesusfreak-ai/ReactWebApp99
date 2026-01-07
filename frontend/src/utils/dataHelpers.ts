import { v4 as uuidv4 } from 'uuid';
import {
  Ailment,
  Treatment,
  Diagnostic,
  SideEffect,
  DEFAULT_AILMENT,
  DEFAULT_TREATMENT,
  DEFAULT_DIAGNOSTIC,
  DEFAULT_SIDE_EFFECT,
} from '@/types';

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return uuidv4();
}

/**
 * Create a new ailment with default values
 */
export function createNewAilment(): Ailment {
  return {
    id: generateId(),
    ...DEFAULT_AILMENT,
    ailment: { ...DEFAULT_AILMENT.ailment },
    treatments: [],
    diagnostics: [],
  };
}

/**
 * Create a new treatment with default values
 */
export function createNewTreatment(): Treatment {
  return {
    id: generateId(),
    ...DEFAULT_TREATMENT,
    sideEffects: [],
  };
}

/**
 * Create a new diagnostic with default values
 */
export function createNewDiagnostic(): Diagnostic {
  return {
    id: generateId(),
    ...DEFAULT_DIAGNOSTIC,
    sideEffects: [],
  };
}

/**
 * Create a new side effect with default values
 */
export function createNewSideEffect(): SideEffect {
  return {
    id: generateId(),
    ...DEFAULT_SIDE_EFFECT,
  };
}

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Find an ailment by ID in an array
 */
export function findAilmentById(ailments: Ailment[], id: string): Ailment | undefined {
  return ailments.find((a) => a.id === id);
}

/**
 * Find a treatment by ID within an ailment
 */
export function findTreatmentById(
  ailment: Ailment,
  treatmentId: string
): Treatment | undefined {
  return ailment.treatments.find((t) => t.id === treatmentId);
}

/**
 * Find a diagnostic by ID within an ailment
 */
export function findDiagnosticById(
  ailment: Ailment,
  diagnosticId: string
): Diagnostic | undefined {
  return ailment.diagnostics.find((d) => d.id === diagnosticId);
}

/**
 * Find a side effect by ID within a treatment or diagnostic
 */
export function findSideEffectById(
  parent: Treatment | Diagnostic,
  sideEffectId: string
): SideEffect | undefined {
  return parent.sideEffects.find((s) => s.id === sideEffectId);
}

/**
 * Update an ailment in an array immutably
 */
export function updateAilmentInArray(
  ailments: Ailment[],
  updatedAilment: Ailment
): Ailment[] {
  return ailments.map((a) => (a.id === updatedAilment.id ? updatedAilment : a));
}

/**
 * Delete an ailment from an array immutably
 */
export function deleteAilmentFromArray(ailments: Ailment[], id: string): Ailment[] {
  return ailments.filter((a) => a.id !== id);
}

/**
 * Add a treatment to an ailment immutably
 */
export function addTreatmentToAilment(
  ailment: Ailment,
  treatment: Treatment
): Ailment {
  return {
    ...ailment,
    treatments: [...ailment.treatments, treatment],
  };
}

/**
 * Update a treatment within an ailment immutably
 */
export function updateTreatmentInAilment(
  ailment: Ailment,
  updatedTreatment: Treatment
): Ailment {
  return {
    ...ailment,
    treatments: ailment.treatments.map((t) =>
      t.id === updatedTreatment.id ? updatedTreatment : t
    ),
  };
}

/**
 * Delete a treatment from an ailment immutably
 */
export function deleteTreatmentFromAilment(
  ailment: Ailment,
  treatmentId: string
): Ailment {
  return {
    ...ailment,
    treatments: ailment.treatments.filter((t) => t.id !== treatmentId),
  };
}

/**
 * Add a diagnostic to an ailment immutably
 */
export function addDiagnosticToAilment(
  ailment: Ailment,
  diagnostic: Diagnostic
): Ailment {
  return {
    ...ailment,
    diagnostics: [...ailment.diagnostics, diagnostic],
  };
}

/**
 * Update a diagnostic within an ailment immutably
 */
export function updateDiagnosticInAilment(
  ailment: Ailment,
  updatedDiagnostic: Diagnostic
): Ailment {
  return {
    ...ailment,
    diagnostics: ailment.diagnostics.map((d) =>
      d.id === updatedDiagnostic.id ? updatedDiagnostic : d
    ),
  };
}

/**
 * Delete a diagnostic from an ailment immutably
 */
export function deleteDiagnosticFromAilment(
  ailment: Ailment,
  diagnosticId: string
): Ailment {
  return {
    ...ailment,
    diagnostics: ailment.diagnostics.filter((d) => d.id !== diagnosticId),
  };
}

/**
 * Add a side effect to a treatment immutably
 */
export function addSideEffectToTreatment(
  treatment: Treatment,
  sideEffect: SideEffect
): Treatment {
  return {
    ...treatment,
    sideEffects: [...treatment.sideEffects, sideEffect],
  };
}

/**
 * Update a side effect within a treatment immutably
 */
export function updateSideEffectInTreatment(
  treatment: Treatment,
  updatedSideEffect: SideEffect
): Treatment {
  return {
    ...treatment,
    sideEffects: treatment.sideEffects.map((s) =>
      s.id === updatedSideEffect.id ? updatedSideEffect : s
    ),
  };
}

/**
 * Delete a side effect from a treatment immutably
 */
export function deleteSideEffectFromTreatment(
  treatment: Treatment,
  sideEffectId: string
): Treatment {
  return {
    ...treatment,
    sideEffects: treatment.sideEffects.filter((s) => s.id !== sideEffectId),
  };
}

/**
 * Add a side effect to a diagnostic immutably
 */
export function addSideEffectToDiagnostic(
  diagnostic: Diagnostic,
  sideEffect: SideEffect
): Diagnostic {
  return {
    ...diagnostic,
    sideEffects: [...diagnostic.sideEffects, sideEffect],
  };
}

/**
 * Update a side effect within a diagnostic immutably
 */
export function updateSideEffectInDiagnostic(
  diagnostic: Diagnostic,
  updatedSideEffect: SideEffect
): Diagnostic {
  return {
    ...diagnostic,
    sideEffects: diagnostic.sideEffects.map((s) =>
      s.id === updatedSideEffect.id ? updatedSideEffect : s
    ),
  };
}

/**
 * Delete a side effect from a diagnostic immutably
 */
export function deleteSideEffectFromDiagnostic(
  diagnostic: Diagnostic,
  sideEffectId: string
): Diagnostic {
  return {
    ...diagnostic,
    sideEffects: diagnostic.sideEffects.filter((s) => s.id !== sideEffectId),
  };
}

/**
 * Get the treatment with the highest efficacy from an ailment
 */
export function getTopTreatment(ailment: Ailment): Treatment | null {
  if (!ailment.treatments || ailment.treatments.length === 0) {
    return null;
  }

  return ailment.treatments.reduce((top, current) => {
    if (!top || current.efficacy > top.efficacy) {
      return current;
    }
    return top;
  }, null as Treatment | null);
}

/**
 * Validate an ailment object
 */
export function validateAilment(ailment: Ailment): string[] {
  const errors: string[] = [];

  if (!ailment.ailment.name || ailment.ailment.name.trim() === '') {
    errors.push('Ailment name is required');
  }

  if (ailment.ailment.intensity < 0 || ailment.ailment.intensity > 100) {
    errors.push('Ailment intensity must be between 0 and 100');
  }

  if (ailment.ailment.severity < 0 || ailment.ailment.severity > 100) {
    errors.push('Ailment severity must be between 0 and 100');
  }

  if (ailment.ailment.duration < 0) {
    errors.push('Ailment duration must be non-negative');
  }

  // Validate treatments
  ailment.treatments.forEach((treatment, index) => {
    if (!treatment.name || treatment.name.trim() === '') {
      errors.push(`Treatment ${index + 1}: name is required`);
    }
    if (treatment.efficacy < 0 || treatment.efficacy > 100) {
      errors.push(`Treatment ${index + 1}: efficacy must be between 0 and 100`);
    }
  });

  // Validate diagnostics
  ailment.diagnostics.forEach((diagnostic, index) => {
    if (!diagnostic.name || diagnostic.name.trim() === '') {
      errors.push(`Diagnostic ${index + 1}: name is required`);
    }
    if (diagnostic.efficacy < 0 || diagnostic.efficacy > 100) {
      errors.push(`Diagnostic ${index + 1}: efficacy must be between 0 and 100`);
    }
  });

  return errors;
}
