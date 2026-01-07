'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Ailment, 
  Treatment, 
  Diagnostic, 
  SideEffect,
  APPLICATION_OPTIONS,
  TYPE_OPTIONS,
  SETTING_OPTIONS 
} from '@/types';
import {
  formatDuration,
  parseDuration,
  createNewTreatment,
  createNewDiagnostic,
  createNewSideEffect,
  deepClone,
} from '@/utils';
import { ConfirmModal } from './ConfirmModal';

interface MobileAilmentModalProps {
  isOpen: boolean;
  ailment: Ailment | null;
  onClose: () => void;
  onSave: (ailment: Ailment) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  initialTab?: 'details' | 'treatments' | 'diagnostics';
  initialExpandedId?: string;
  scrollToSideEffectId?: string;
}

export const MobileAilmentModal: React.FC<MobileAilmentModalProps> = ({
  isOpen,
  ailment: initialAilment,
  onClose,
  onSave,
  onDelete,
  initialTab,
  initialExpandedId,
  scrollToSideEffectId,
}) => {
  const [ailment, setAilment] = useState<Ailment | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'treatments' | 'diagnostics'>('details');
  const [expandedTreatments, setExpandedTreatments] = useState<Set<string>>(new Set());
  const [expandedDiagnostics, setExpandedDiagnostics] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    type: 'ailment' | 'treatment' | 'diagnostic' | 'sideEffect';
    id: string;
    parentId?: string;
    parentType?: 'treatment' | 'diagnostic';
    name: string;
  }>({ isOpen: false, type: 'ailment', id: '', name: '' });
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialAilment) {
      // Deep clone and ensure all nested properties exist
      const cloned = deepClone(initialAilment);
      // Ensure ailment.ailment exists with defaults
      if (!cloned.ailment) {
        cloned.ailment = {
          name: '',
          description: '',
          duration: 0,
          intensity: 0,
          severity: 0,
        };
      }
      // Ensure treatments array exists
      if (!cloned.treatments) {
        cloned.treatments = [];
      }
      // Ensure diagnostics array exists
      if (!cloned.diagnostics) {
        cloned.diagnostics = [];
      }
      setAilment(cloned);
    } else {
      setAilment(null);
    }
  }, [initialAilment]);

  // Handle initial tab and expanded item when opening
  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
    if (isOpen && initialExpandedId) {
      if (initialTab === 'treatments') {
        setExpandedTreatments(new Set([initialExpandedId]));
      } else if (initialTab === 'diagnostics') {
        setExpandedDiagnostics(new Set([initialExpandedId]));
      }
    }
    
    // Scroll to side effect after a short delay to allow DOM to render
    if (isOpen && scrollToSideEffectId) {
      setTimeout(() => {
        const element = document.getElementById(`side-effect-${scrollToSideEffectId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Add a brief highlight effect
          element.classList.add('ring-2', 'ring-indigo-500');
          setTimeout(() => {
            element.classList.remove('ring-2', 'ring-indigo-500');
          }, 2000);
        }
      }, 300);
    }
  }, [isOpen, initialTab, initialExpandedId, scrollToSideEffectId]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !ailment || !ailment.ailment) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleSave = async () => {
    if (ailment) {
      await onSave(ailment);
      onClose();
    }
  };

  const handleDelete = () => {
    if (ailment && onDelete) {
      setDeleteConfirm({
        isOpen: true,
        type: 'ailment',
        id: ailment.id,
        name: ailment.ailment.name,
      });
    }
  };

  const confirmDelete = async () => {
    const { type, id, parentId, parentType } = deleteConfirm;

    if (type === 'ailment' && onDelete) {
      await onDelete(id);
      setDeleteConfirm({ isOpen: false, type: 'ailment', id: '', name: '' });
      onClose();
    } else if (ailment) {
      const updatedAilment = deepClone(ailment);

      if (type === 'treatment') {
        updatedAilment.treatments = updatedAilment.treatments.filter(t => t.id !== id);
      } else if (type === 'diagnostic') {
        updatedAilment.diagnostics = updatedAilment.diagnostics.filter(d => d.id !== id);
      } else if (type === 'sideEffect' && parentId) {
        if (parentType === 'treatment') {
          const treatment = updatedAilment.treatments.find(t => t.id === parentId);
          if (treatment) {
            treatment.sideEffects = treatment.sideEffects.filter(s => s.id !== id);
          }
        } else if (parentType === 'diagnostic') {
          const diagnostic = updatedAilment.diagnostics.find(d => d.id === parentId);
          if (diagnostic) {
            diagnostic.sideEffects = diagnostic.sideEffects.filter(s => s.id !== id);
          }
        }
      }

      setAilment(updatedAilment);
      setDeleteConfirm({ isOpen: false, type: 'ailment', id: '', name: '' });
    }
  };

  const updateAilmentField = <K extends keyof Ailment['ailment']>(
    field: K,
    value: Ailment['ailment'][K]
  ) => {
    if (ailment) {
      setAilment({
        ...ailment,
        ailment: {
          ...ailment.ailment,
          [field]: value,
        },
      });
    }
  };

  const updateTreatment = (treatmentId: string, updates: Partial<Treatment>) => {
    if (ailment) {
      setAilment({
        ...ailment,
        treatments: ailment.treatments.map(t =>
          t.id === treatmentId ? { ...t, ...updates } : t
        ),
      });
    }
  };

  const updateDiagnostic = (diagnosticId: string, updates: Partial<Diagnostic>) => {
    if (ailment) {
      setAilment({
        ...ailment,
        diagnostics: ailment.diagnostics.map(d =>
          d.id === diagnosticId ? { ...d, ...updates } : d
        ),
      });
    }
  };

  const updateSideEffect = (
    parentId: string,
    sideEffectId: string,
    updates: Partial<SideEffect>,
    parentType: 'treatment' | 'diagnostic'
  ) => {
    if (ailment) {
      if (parentType === 'treatment') {
        setAilment({
          ...ailment,
          treatments: ailment.treatments.map(t =>
            t.id === parentId
              ? {
                  ...t,
                  sideEffects: t.sideEffects.map(s =>
                    s.id === sideEffectId ? { ...s, ...updates } : s
                  ),
                }
              : t
          ),
        });
      } else {
        setAilment({
          ...ailment,
          diagnostics: ailment.diagnostics.map(d =>
            d.id === parentId
              ? {
                  ...d,
                  sideEffects: d.sideEffects.map(s =>
                    s.id === sideEffectId ? { ...s, ...updates } : s
                  ),
                }
              : d
          ),
        });
      }
    }
  };

  const addTreatment = () => {
    if (ailment) {
      const newTreatment = createNewTreatment();
      setAilment({
        ...ailment,
        treatments: [...ailment.treatments, newTreatment],
      });
      setExpandedTreatments(new Set(Array.from(expandedTreatments).concat(newTreatment.id)));
    }
  };

  const addDiagnostic = () => {
    if (ailment) {
      const newDiagnostic = createNewDiagnostic();
      setAilment({
        ...ailment,
        diagnostics: [...ailment.diagnostics, newDiagnostic],
      });
      setExpandedDiagnostics(new Set(Array.from(expandedDiagnostics).concat(newDiagnostic.id)));
    }
  };

  const addSideEffect = (parentId: string, parentType: 'treatment' | 'diagnostic') => {
    if (ailment) {
      const newSideEffect = createNewSideEffect();
      if (parentType === 'treatment') {
        setAilment({
          ...ailment,
          treatments: ailment.treatments.map(t =>
            t.id === parentId
              ? { ...t, sideEffects: [...t.sideEffects, newSideEffect] }
              : t
          ),
        });
      } else {
        setAilment({
          ...ailment,
          diagnostics: ailment.diagnostics.map(d =>
            d.id === parentId
              ? { ...d, sideEffects: [...d.sideEffects, newSideEffect] }
              : d
          ),
        });
      }
    }
  };

  const toggleTreatmentExpanded = (id: string) => {
    setExpandedTreatments(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleDiagnosticExpanded = (id: string) => {
    setExpandedDiagnostics(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 overflow-hidden bg-black bg-opacity-50"
        onClick={handleBackdropClick}
      >
        <div
          ref={modalRef}
          className="fixed inset-0 bg-white flex flex-col w-full max-w-full overflow-x-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white sticky top-0 z-10 w-full">
            <h2 className="text-lg font-semibold text-gray-900 truncate flex-1">
              {ailment.ailment.name || 'New Ailment'}
            </h2>
            <button
              onClick={onClose}
              className="ml-2 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 bg-white sticky top-[65px] z-10 w-full">
            <button
              className={`flex-1 px-2 py-3 text-sm font-medium ${
                activeTab === 'details'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500'
              }`}
              onClick={() => setActiveTab('details')}
            >
              Details
            </button>
            <button
              className={`flex-1 px-2 py-3 text-sm font-medium ${
                activeTab === 'treatments'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500'
              }`}
              onClick={() => setActiveTab('treatments')}
            >
              Treatments ({ailment.treatments.length})
            </button>
            <button
              className={`flex-1 px-2 py-3 text-sm font-medium ${
                activeTab === 'diagnostics'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500'
              }`}
              onClick={() => setActiveTab('diagnostics')}
            >
              Diagnostics ({ailment.diagnostics.length})
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 pb-24 w-full max-w-full">
            {activeTab === 'details' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={ailment.ailment.name || ''}
                    onChange={(e) => updateAilmentField('name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                    placeholder="Ailment name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={ailment.ailment.description || ''}
                    onChange={(e) => updateAilmentField('description', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[100px] bg-white text-gray-900"
                    placeholder="Ailment description"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                  <input
                    type="text"
                    value={formatDuration(ailment.ailment.duration || 0)}
                    onChange={(e) => updateAilmentField('duration', parseDuration(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                    placeholder="e.g., 2h 30m or 3600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Intensity: {ailment.ailment.intensity || 0}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={ailment.ailment.intensity || 0}
                    onChange={(e) => updateAilmentField('intensity', Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Low</span>
                    <span>High</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Severity: {ailment.ailment.severity || 0}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={ailment.ailment.severity || 0}
                    onChange={(e) => updateAilmentField('severity', Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Low</span>
                    <span>High</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'treatments' && (
              <div className="space-y-3">
                <button
                  onClick={addTreatment}
                  className="w-full py-3 bg-emerald-50 text-emerald-700 rounded-lg font-medium hover:bg-emerald-100 border-2 border-dashed border-emerald-300"
                >
                  + Add Treatment
                </button>

                {ailment.treatments.map((treatment) => (
                  <div key={treatment.id} className="border border-gray-200 rounded-lg overflow-hidden">
                    <div
                      className="bg-emerald-50 p-3 flex items-center justify-between cursor-pointer"
                      onClick={() => toggleTreatmentExpanded(treatment.id)}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-lg">💊</span>
                        <span className="font-medium text-emerald-900 truncate">{treatment.name || 'Unnamed Treatment'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirm({
                              isOpen: true,
                              type: 'treatment',
                              id: treatment.id,
                              name: treatment.name,
                            });
                          }}
                          className="p-1 text-red-500 hover:bg-red-100 rounded"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                        <svg
                          className={`w-5 h-5 text-emerald-600 transition-transform ${
                            expandedTreatments.has(treatment.id) ? 'rotate-90' : ''
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>

                    {expandedTreatments.has(treatment.id) && (
                      <div className="p-3 space-y-3 bg-white">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                          <input
                            type="text"
                            value={treatment.name || ''}
                            onChange={(e) => updateTreatment(treatment.id, { name: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900"
                            placeholder="Treatment name"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                          <textarea
                            value={treatment.description || ''}
                            onChange={(e) => updateTreatment(treatment.id, { description: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm min-h-[60px] bg-white text-gray-900"
                            placeholder="Description"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Application</label>
                          <select
                            value={treatment.application || 'oral'}
                            onChange={(e) => updateTreatment(treatment.id, { application: e.target.value as any })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900"
                          >
                            {APPLICATION_OPTIONS.map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                          <select
                            value={treatment.type || 'symptom_based'}
                            onChange={(e) => updateTreatment(treatment.id, { type: e.target.value as any })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900"
                          >
                            {TYPE_OPTIONS.map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Setting</label>
                          <select
                            value={treatment.setting || 'clinic'}
                            onChange={(e) => updateTreatment(treatment.id, { setting: e.target.value as any })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900"
                          >
                            {SETTING_OPTIONS.map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                          <input
                            type="text"
                            value={formatDuration(treatment.duration || 0)}
                            onChange={(e) => updateTreatment(treatment.id, { duration: parseDuration(e.target.value) })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900"
                            placeholder="Duration (e.g., 2h 30m)"
                          />
                        </div>

                        <div>
                          <label className="text-sm text-gray-700">Efficacy: {treatment.efficacy || 0}%</label>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={treatment.efficacy || 0}
                            onChange={(e) => updateTreatment(treatment.id, { efficacy: Number(e.target.value) })}
                            className="w-full"
                          />
                        </div>

                        <div>
                          <label className="text-sm text-gray-700">Intensity: {treatment.intensity || 0}%</label>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={treatment.intensity || 0}
                            onChange={(e) => updateTreatment(treatment.id, { intensity: Number(e.target.value) })}
                            className="w-full"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={treatment.isPreventative || false}
                              onChange={(e) => updateTreatment(treatment.id, { isPreventative: e.target.checked })}
                              className="w-4 h-4 text-blue-600 rounded"
                            />
                            <span className="text-sm text-gray-700">Preventative</span>
                          </label>
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={treatment.isPalliative || false}
                              onChange={(e) => updateTreatment(treatment.id, { isPalliative: e.target.checked })}
                              className="w-4 h-4 text-blue-600 rounded"
                            />
                            <span className="text-sm text-gray-700">Palliative</span>
                          </label>
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={treatment.isCurative || false}
                              onChange={(e) => updateTreatment(treatment.id, { isCurative: e.target.checked })}
                              className="w-4 h-4 text-blue-600 rounded"
                            />
                            <span className="text-sm text-gray-700">Curative</span>
                          </label>
                        </div>

                        {/* Side Effects */}
                        <div className="pt-3 border-t border-gray-200">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">Side Effects ({treatment.sideEffects.length})</span>
                            <button
                              onClick={() => addSideEffect(treatment.id, 'treatment')}
                              className="px-2 py-1 text-xs bg-rose-50 text-rose-600 rounded hover:bg-rose-100"
                            >
                              + Add
                            </button>
                          </div>
                          <div className="space-y-2">
                            {treatment.sideEffects.map((sideEffect) => (
                              <div key={sideEffect.id} id={`side-effect-${sideEffect.id}`} className="bg-rose-50 p-2 rounded border border-rose-200 transition-all duration-300">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-medium text-rose-900">⚠️ {sideEffect.name || 'Unnamed'}</span>
                                  <button
                                    onClick={() =>
                                      setDeleteConfirm({
                                        isOpen: true,
                                        type: 'sideEffect',
                                        id: sideEffect.id,
                                        parentId: treatment.id,
                                        parentType: 'treatment',
                                        name: sideEffect.name,
                                      })
                                    }
                                    className="p-1 text-red-500 hover:bg-red-100 rounded"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                                  <input
                                    type="text"
                                    value={sideEffect.name || ''}
                                    onChange={(e) =>
                                      updateSideEffect(treatment.id, sideEffect.id, { name: e.target.value }, 'treatment')
                                    }
                                    className="w-full px-2 py-1 border border-rose-300 rounded text-xs mb-1 bg-white text-gray-900"
                                    placeholder="Side effect name"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                                  <textarea
                                    value={sideEffect.description || ''}
                                    onChange={(e) =>
                                      updateSideEffect(treatment.id, sideEffect.id, { description: e.target.value }, 'treatment')
                                    }
                                    className="w-full px-2 py-1 border border-rose-300 rounded text-xs mb-1 min-h-[40px] bg-white text-gray-900"
                                    placeholder="Description"
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-xs text-gray-600">Intensity: {sideEffect.intensity || 0}%</label>
                                    <input
                                      type="range"
                                      min="0"
                                      max="100"
                                      value={sideEffect.intensity || 0}
                                      onChange={(e) =>
                                        updateSideEffect(treatment.id, sideEffect.id, { intensity: Number(e.target.value) }, 'treatment')
                                      }
                                      className="w-full"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs text-gray-600">Severity: {sideEffect.severity || 0}%</label>
                                    <input
                                      type="range"
                                      min="0"
                                      max="100"
                                      value={sideEffect.severity || 0}
                                      onChange={(e) =>
                                        updateSideEffect(treatment.id, sideEffect.id, { severity: Number(e.target.value) }, 'treatment')
                                      }
                                      className="w-full"
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'diagnostics' && (
              <div className="space-y-3">
                <button
                  onClick={addDiagnostic}
                  className="w-full py-3 bg-amber-50 text-amber-700 rounded-lg font-medium hover:bg-amber-100 border-2 border-dashed border-amber-300"
                >
                  + Add Diagnostic
                </button>

                {ailment.diagnostics.map((diagnostic) => (
                  <div key={diagnostic.id} className="border border-gray-200 rounded-lg overflow-hidden">
                    <div
                      className="bg-amber-50 p-3 flex items-center justify-between cursor-pointer"
                      onClick={() => toggleDiagnosticExpanded(diagnostic.id)}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-lg">🔬</span>
                        <span className="font-medium text-amber-900 truncate">{diagnostic.name || 'Unnamed Diagnostic'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirm({
                              isOpen: true,
                              type: 'diagnostic',
                              id: diagnostic.id,
                              name: diagnostic.name,
                            });
                          }}
                          className="p-1 text-red-500 hover:bg-red-100 rounded"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                        <svg
                          className={`w-5 h-5 text-amber-600 transition-transform ${
                            expandedDiagnostics.has(diagnostic.id) ? 'rotate-90' : ''
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>

                    {expandedDiagnostics.has(diagnostic.id) && (
                      <div className="p-3 space-y-3 bg-white">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                          <input
                            type="text"
                            value={diagnostic.name || ''}
                            onChange={(e) => updateDiagnostic(diagnostic.id, { name: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900"
                            placeholder="Diagnostic name"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                          <textarea
                            value={diagnostic.description || ''}
                            onChange={(e) => updateDiagnostic(diagnostic.id, { description: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm min-h-[60px] bg-white text-gray-900"
                            placeholder="Description"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                          <select
                            value={diagnostic.type || 'symptom_based'}
                            onChange={(e) => updateDiagnostic(diagnostic.id, { type: e.target.value as any })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900"
                          >
                            {TYPE_OPTIONS.map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Setting</label>
                          <select
                            value={diagnostic.setting || 'clinic'}
                            onChange={(e) => updateDiagnostic(diagnostic.id, { setting: e.target.value as any })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900"
                          >
                            {SETTING_OPTIONS.map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                          <input
                            type="text"
                            value={formatDuration(diagnostic.duration || 0)}
                            onChange={(e) => updateDiagnostic(diagnostic.id, { duration: parseDuration(e.target.value) })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900"
                            placeholder="Duration (e.g., 2h 30m)"
                          />
                        </div>

                        <div>
                          <label className="text-sm text-gray-700">Efficacy: {diagnostic.efficacy || 0}%</label>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={diagnostic.efficacy || 0}
                            onChange={(e) => updateDiagnostic(diagnostic.id, { efficacy: Number(e.target.value) })}
                            className="w-full"
                          />
                        </div>

                        <div>
                          <label className="text-sm text-gray-700">Intensity: {diagnostic.intensity || 0}%</label>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={diagnostic.intensity || 0}
                            onChange={(e) => updateDiagnostic(diagnostic.id, { intensity: Number(e.target.value) })}
                            className="w-full"
                          />
                        </div>

                        {/* Side Effects */}
                        <div className="pt-3 border-t border-gray-200">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">Side Effects ({diagnostic.sideEffects.length})</span>
                            <button
                              onClick={() => addSideEffect(diagnostic.id, 'diagnostic')}
                              className="px-2 py-1 text-xs bg-rose-50 text-rose-600 rounded hover:bg-rose-100"
                            >
                              + Add
                            </button>
                          </div>
                          <div className="space-y-2">
                            {diagnostic.sideEffects.map((sideEffect) => (
                              <div key={sideEffect.id} id={`side-effect-${sideEffect.id}`} className="bg-rose-50 p-2 rounded border border-rose-200 transition-all duration-300">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-medium text-rose-900">⚠️ {sideEffect.name || 'Unnamed'}</span>
                                  <button
                                    onClick={() =>
                                      setDeleteConfirm({
                                        isOpen: true,
                                        type: 'sideEffect',
                                        id: sideEffect.id,
                                        parentId: diagnostic.id,
                                        parentType: 'diagnostic',
                                        name: sideEffect.name,
                                      })
                                    }
                                    className="p-1 text-red-500 hover:bg-red-100 rounded"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                                  <input
                                    type="text"
                                    value={sideEffect.name || ''}
                                    onChange={(e) =>
                                      updateSideEffect(diagnostic.id, sideEffect.id, { name: e.target.value }, 'diagnostic')
                                    }
                                    className="w-full px-2 py-1 border border-rose-300 rounded text-xs mb-1 bg-white text-gray-900"
                                    placeholder="Side effect name"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                                  <textarea
                                    value={sideEffect.description || ''}
                                    onChange={(e) =>
                                      updateSideEffect(diagnostic.id, sideEffect.id, { description: e.target.value }, 'diagnostic')
                                    }
                                    className="w-full px-2 py-1 border border-rose-300 rounded text-xs mb-1 min-h-[40px] bg-white text-gray-900"
                                    placeholder="Description"
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-xs text-gray-600">Intensity: {sideEffect.intensity || 0}%</label>
                                    <input
                                      type="range"
                                      min="0"
                                      max="100"
                                      value={sideEffect.intensity || 0}
                                      onChange={(e) =>
                                        updateSideEffect(diagnostic.id, sideEffect.id, { intensity: Number(e.target.value) }, 'diagnostic')
                                      }
                                      className="w-full"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs text-gray-600">Severity: {sideEffect.severity || 0}%</label>
                                    <input
                                      type="range"
                                      min="0"
                                      max="100"
                                      value={sideEffect.severity || 0}
                                      onChange={(e) =>
                                        updateSideEffect(diagnostic.id, sideEffect.id, { severity: Number(e.target.value) }, 'diagnostic')
                                      }
                                      className="w-full"
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="fixed bottom-0 left-0 right-0 border-t border-gray-200 p-4 bg-white flex gap-2 z-20 w-full">
            {onDelete && (
              <button
                onClick={handleDelete}
                className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium border border-red-300 text-sm"
              >
                Delete
              </button>
            )}
            <button
              onClick={onClose}
              className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 text-sm"
            >
              Save
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        title={`Delete ${deleteConfirm.type}?`}
        message={`Are you sure you want to delete "${deleteConfirm.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() =>
          setDeleteConfirm({ isOpen: false, type: 'ailment', id: '', name: '' })
        }
      />
    </>
  );
};
