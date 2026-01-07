'use client';

import React, {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
} from 'react';
import { createPortal } from 'react-dom';
import { AgGridReact } from '@ag-grid-community/react';
import { ClientSideRowModelModule } from '@ag-grid-community/client-side-row-model';
import { ModuleRegistry } from '@ag-grid-community/core';
import '@ag-grid-community/styles/ag-grid.css';
import '@ag-grid-community/styles/ag-theme-alpine.css';
import {
  ColDef,
  CellEditingStoppedEvent,
  GetRowIdParams,
  RowClassParams,
  CellKeyDownEvent,
  GridReadyEvent,
  GridApi,
  ICellRendererParams,
} from '@ag-grid-community/core';
import {
  Ailment,
  Treatment,
  Diagnostic,
  SideEffect,
  APPLICATION_OPTIONS,
  TYPE_OPTIONS,
  SETTING_OPTIONS,
} from '@/types';
import {
  formatDuration,
  parseDuration,
  createNewAilment,
  createNewTreatment,
  createNewDiagnostic,
  createNewSideEffect,
  deepClone,
} from '@/utils';
import { ConfirmModal } from './ConfirmModal';

// Register AG-Grid modules
ModuleRegistry.registerModules([ClientSideRowModelModule]);

// Row data structure for hierarchical display
interface GridRowData {
  id: string;
  rowType: 'ailment' | 'treatment' | 'diagnostic' | 'sideEffect';
  parentId?: string;
  grandParentId?: string;
  parentType?: 'treatment' | 'diagnostic';
  level: number;
  isExpanded?: boolean;
  hasChildren?: boolean;
  
  // Common fields
  name?: string;
  description?: string;
  duration?: number;
  intensity?: number;
  severity?: number;
  
  // Treatment specific
  application?: string;
  efficacy?: number;
  type?: string;
  setting?: string;
  isPreventative?: boolean;
  isPalliative?: boolean;
  isCurative?: boolean;
  
  // Original reference for updates
  _originalAilment?: Ailment;
}

interface AilmentDataGridProps {
  ailments: Ailment[];
  onSaveAilment: (ailment: Ailment) => Promise<void>;
  onDeleteAilment: (id: string) => Promise<void>;
  onRefresh?: () => void;
  loading?: boolean;
}

// Duration cell editor component
const DurationEditor = React.forwardRef((props: any, ref) => {
  const [value, setValue] = useState(formatDuration(props.value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  React.useImperativeHandle(ref, () => ({
    getValue: () => parseDuration(value),
    isCancelBeforeStart: () => false,
    isCancelAfterEnd: () => false,
  }));

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      className="w-full h-full px-2 border-none outline-none"
      placeholder="e.g., 2h 30m or 3600"
    />
  );
});

DurationEditor.displayName = 'DurationEditor';

// Action buttons cell renderer
const ActionCellRenderer: React.FC<ICellRendererParams & {
  onAdd: (rowData: GridRowData, childType: string) => void;
  onDelete: (rowData: GridRowData) => void;
  onToggleExpand: (rowData: GridRowData) => void;
  expandedRows: Set<string>;
}> = (props) => {
  const { data, onAdd, onDelete, onToggleExpand, expandedRows } = props;
  
  if (!data) return null;

  // Use expandedRows Set directly for accurate state
  const isExpanded = expandedRows.has(data.id);

  const getAddOptions = () => {
    switch (data.rowType) {
      case 'ailment':
        return ['treatment', 'diagnostic'];
      case 'treatment':
      case 'diagnostic':
        return ['sideEffect'];
      default:
        return [];
    }
  };

  const addOptions = getAddOptions();

  // Get row type badge styling
  const getRowTypeBadge = () => {
    const styles: Record<string, { bg: string; text: string; icon: string }> = {
      ailment: { bg: 'bg-blue-100', text: 'text-blue-700', icon: '🏥' },
      treatment: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: '💊' },
      diagnostic: { bg: 'bg-amber-100', text: 'text-amber-700', icon: '🔬' },
      sideEffect: { bg: 'bg-rose-100', text: 'text-rose-700', icon: '⚠️' },
    };
    return styles[data.rowType] || { bg: 'bg-gray-100', text: 'text-gray-700', icon: '📄' };
  };

  const badge = getRowTypeBadge();

  return (
    <div className="flex items-center gap-1.5 h-full py-1">
      {/* Expand/Collapse button */}
      {data.hasChildren ? (
        <button
          onClick={() => onToggleExpand(data)}
          className={`w-6 h-6 flex items-center justify-center rounded-md transition-all duration-200 ${
            isExpanded 
              ? 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200' 
              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
          }`}
          title={isExpanded ? 'Collapse' : 'Expand'}
        >
          <svg 
            className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      ) : (
        <div className="w-6" /> 
      )}
      
      {/* Add buttons */}
      {addOptions.map((type) => (
        <button
          key={type}
          onClick={() => onAdd(data, type)}
          className="h-6 px-2 text-xs font-medium bg-emerald-50 text-emerald-600 hover:bg-emerald-100 
                     border border-emerald-200 rounded-md transition-colors duration-150 
                     flex items-center gap-0.5"
          title={`Add ${type}`}
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {type === 'treatment' ? 'T' : type === 'diagnostic' ? 'D' : 'S'}
        </button>
      ))}
      
      {/* Delete button */}
      <button
        onClick={() => onDelete(data)}
        className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-red-500 
                   hover:bg-red-50 rounded-md transition-colors duration-150 ml-1"
        title="Delete"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
};

// Clickable Boolean cell renderer - toggles value on single click and saves
const ClickableBooleanCellRenderer: React.FC<ICellRendererParams & {
  onToggle: (rowData: GridRowData, field: string, newValue: boolean) => void;
}> = (props) => {
  const { data, colDef, onToggle } = props;
  const isChecked = props.value || false;
  const field = colDef?.field || '';
  
  // Check if this cell should be editable (only for treatments)
  const isEditable = data?.rowType === 'treatment';
  
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isEditable && onToggle && data) {
      onToggle(data, field, !isChecked);
    }
  };
  
  return (
    <div className="flex items-center justify-center h-full">
      <button
        onClick={handleClick}
        disabled={!isEditable}
        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
          isChecked 
            ? 'bg-emerald-500 border-emerald-500' 
            : 'bg-white border-slate-300'
        } ${isEditable ? 'cursor-pointer hover:border-emerald-400' : 'cursor-not-allowed opacity-50'}`}
      >
        {isChecked && (
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>
    </div>
  );
};

// Legacy Boolean cell renderer (for display only)
const BooleanCellRenderer: React.FC<ICellRendererParams> = (props) => {
  const isChecked = props.value || false;
  return (
    <div className="flex items-center justify-center h-full">
      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
        isChecked 
          ? 'bg-emerald-500 border-emerald-500' 
          : 'bg-white border-slate-300'
      }`}>
        {isChecked && (
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
    </div>
  );
};

const BooleanCellEditor = React.forwardRef((props: any, ref) => {
  const [checked, setChecked] = useState(props.value || false);

  React.useImperativeHandle(ref, () => ({
    getValue: () => checked,
  }));

  return (
    <div className="flex items-center justify-center h-full">
      <button
        onClick={() => setChecked(!checked)}
        className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${
          checked 
            ? 'bg-emerald-500 border-emerald-500' 
            : 'bg-white border-slate-300 hover:border-slate-400'
        }`}
        autoFocus
      >
        {checked && (
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>
    </div>
  );
});

BooleanCellEditor.displayName = 'BooleanCellEditor';

// Select cell editor
const SelectCellEditor = React.forwardRef((props: any, ref) => {
  const [value, setValue] = useState(props.value || '');
  const selectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    selectRef.current?.focus();
  }, []);

  React.useImperativeHandle(ref, () => ({
    getValue: () => value,
  }));

  const options = props.options || [];

  return (
    <select
      ref={selectRef}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      className="w-full h-full px-2 border-none outline-none"
    >
      {options.map((opt: string) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
});

SelectCellEditor.displayName = 'SelectCellEditor';

// Clickable Select cell renderer - opens dropdown on single click and saves on selection
const ClickableSelectCellRenderer: React.FC<ICellRendererParams & {
  onSelect: (rowData: GridRowData, field: string, newValue: string) => void;
  options: string[];
  getDisplayValue?: (value: string) => React.ReactNode;
  isEditableForRow?: (rowData: GridRowData) => boolean;
}> = (props) => {
  const { data, colDef, value, onSelect, options, getDisplayValue, isEditableForRow } = props;
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const field = colDef?.field || '';
  
  // Check if this cell should be editable
  const isEditable = isEditableForRow ? isEditableForRow(data) : true;
  
  // Track if component is mounted (for portal)
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);
  
  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    const handleScroll = () => {
      setIsOpen(false);
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', handleScroll, true);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen]);
  
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (isEditable && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
      });
      setIsOpen(!isOpen);
    }
  };
  
  const handleSelect = (newValue: string) => {
    setIsOpen(false);
    if (onSelect && data && newValue !== value) {
      onSelect(data, field, newValue);
    }
  };
  
  if (!value && !isEditable) return <span className="text-slate-400">—</span>;
  
  const dropdownContent = isOpen && mounted ? createPortal(
    <div 
      ref={dropdownRef}
      style={{ 
        position: 'absolute',
        top: dropdownPosition.top, 
        left: dropdownPosition.left,
        zIndex: 99999,
        minWidth: '140px',
      }}
      className="bg-white rounded-lg shadow-xl border border-slate-200 py-1 max-h-48 overflow-auto"
    >
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => handleSelect(opt)}
          className={`w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 transition-colors ${
            opt === value ? 'bg-indigo-50 font-medium text-indigo-600' : 'text-slate-700'
          }`}
        >
          <span className="capitalize">{opt.replace('_', ' ')}</span>
        </button>
      ))}
    </div>,
    document.body
  ) : null;
  
  return (
    <>
      <div className="h-full flex items-center">
        <button
          ref={buttonRef}
          onClick={handleClick}
          disabled={!isEditable}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium transition-colors ${
            isEditable 
              ? 'cursor-pointer hover:bg-slate-200' 
              : 'cursor-not-allowed opacity-50'
          } ${!value ? 'text-slate-400' : ''}`}
        >
          {getDisplayValue ? getDisplayValue(value) : (
            <span className="capitalize">{value || '—'}</span>
          )}
          {isEditable && (
            <svg className={`w-3 h-3 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </button>
      </div>
      {dropdownContent}
    </>
  );
};

export const AilmentDataGrid: React.FC<AilmentDataGridProps> = ({
  ailments,
  onSaveAilment,
  onDeleteAilment,
  onRefresh,
  loading = false,
}) => {
  const gridRef = useRef<AgGridReact>(null);
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [pendingChanges, setPendingChanges] = useState<Map<string, Ailment>>(new Map());
  
  // Delete confirmation modal state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    rowData: GridRowData | null;
    itemName: string;
    itemType: string;
  }>({ isOpen: false, rowData: null, itemName: '', itemType: '' });

  // Convert hierarchical ailment data to flat grid rows
  const flattenAilments = useCallback(
    (ailmentList: Ailment[]): GridRowData[] => {
      const rows: GridRowData[] = [];

      ailmentList.forEach((ailment) => {
        const ailmentRow: GridRowData = {
          id: ailment.id,
          rowType: 'ailment',
          level: 0,
          isExpanded: expandedRows.has(ailment.id),
          hasChildren:
            ailment.treatments.length > 0 || ailment.diagnostics.length > 0,
          name: ailment.ailment.name,
          description: ailment.ailment.description,
          duration: ailment.ailment.duration,
          intensity: ailment.ailment.intensity,
          severity: ailment.ailment.severity,
          _originalAilment: ailment,
        };
        rows.push(ailmentRow);

        if (expandedRows.has(ailment.id)) {
          // Add treatments
          ailment.treatments.forEach((treatment) => {
            const treatmentRow: GridRowData = {
              id: treatment.id,
              rowType: 'treatment',
              parentId: ailment.id,
              level: 1,
              isExpanded: expandedRows.has(treatment.id),
              hasChildren: treatment.sideEffects.length > 0,
              name: treatment.name,
              description: treatment.description,
              duration: treatment.duration,
              intensity: treatment.intensity,
              application: treatment.application,
              efficacy: treatment.efficacy,
              type: treatment.type,
              setting: treatment.setting,
              isPreventative: treatment.isPreventative,
              isPalliative: treatment.isPalliative,
              isCurative: treatment.isCurative,
              _originalAilment: ailment,
            };
            rows.push(treatmentRow);

            // Add side effects for treatment
            if (expandedRows.has(treatment.id)) {
              treatment.sideEffects.forEach((sideEffect) => {
                rows.push({
                  id: sideEffect.id,
                  rowType: 'sideEffect',
                  parentId: treatment.id,
                  grandParentId: ailment.id,
                  parentType: 'treatment',
                  level: 2,
                  hasChildren: false,
                  name: sideEffect.name,
                  description: sideEffect.description,
                  duration: sideEffect.duration,
                  intensity: sideEffect.intensity,
                  severity: sideEffect.severity,
                  _originalAilment: ailment,
                });
              });
            }
          });

          // Add diagnostics
          ailment.diagnostics.forEach((diagnostic) => {
            const diagnosticRow: GridRowData = {
              id: diagnostic.id,
              rowType: 'diagnostic',
              parentId: ailment.id,
              level: 1,
              isExpanded: expandedRows.has(diagnostic.id),
              hasChildren: diagnostic.sideEffects.length > 0,
              name: diagnostic.name,
              description: diagnostic.description,
              duration: diagnostic.duration,
              intensity: diagnostic.intensity,
              efficacy: diagnostic.efficacy,
              type: diagnostic.type,
              setting: diagnostic.setting,
              _originalAilment: ailment,
            };
            rows.push(diagnosticRow);

            // Add side effects for diagnostic
            if (expandedRows.has(diagnostic.id)) {
              diagnostic.sideEffects.forEach((sideEffect) => {
                rows.push({
                  id: sideEffect.id,
                  rowType: 'sideEffect',
                  parentId: diagnostic.id,
                  grandParentId: ailment.id,
                  parentType: 'diagnostic',
                  level: 2,
                  hasChildren: false,
                  name: sideEffect.name,
                  description: sideEffect.description,
                  duration: sideEffect.duration,
                  intensity: sideEffect.intensity,
                  severity: sideEffect.severity,
                  _originalAilment: ailment,
                });
              });
            }
          });
        }
      });

      return rows;
    },
    [expandedRows]
  );

  const rowData = useMemo(() => flattenAilments(ailments), [ailments, flattenAilments]);

  // Toggle row expansion
  const handleToggleExpand = useCallback((rowData: GridRowData) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowData.id)) {
        next.delete(rowData.id);
      } else {
        next.add(rowData.id);
      }
      return next;
    });
  }, []);

  // Handle boolean field toggle (single-click checkbox)
  const handleBooleanToggle = useCallback(
    (rowData: GridRowData, field: string, newValue: boolean) => {
      if (!rowData._originalAilment) return;

      const ailment = deepClone(rowData._originalAilment);

      if (rowData.rowType === 'treatment') {
        const treatmentIdx = ailment.treatments.findIndex((t) => t.id === rowData.id);
        if (treatmentIdx >= 0) {
          const treatment = ailment.treatments[treatmentIdx];
          switch (field) {
            case 'isPreventative':
              treatment.isPreventative = newValue;
              break;
            case 'isPalliative':
              treatment.isPalliative = newValue;
              break;
            case 'isCurative':
              treatment.isCurative = newValue;
              break;
          }
          // Save immediately
          onSaveAilment(ailment);
        }
      }
    },
    [onSaveAilment]
  );

  // Handle select field change (single-click dropdown)
  const handleSelectChange = useCallback(
    (rowData: GridRowData, field: string, newValue: string) => {
      if (!rowData._originalAilment) return;

      const ailment = deepClone(rowData._originalAilment);

      if (rowData.rowType === 'treatment') {
        const treatmentIdx = ailment.treatments.findIndex((t) => t.id === rowData.id);
        if (treatmentIdx >= 0) {
          const treatment = ailment.treatments[treatmentIdx];
          switch (field) {
            case 'application':
              treatment.application = newValue as 'oral' | 'IV' | 'topical' | 'surgical';
              break;
            case 'type':
              treatment.type = newValue as 'symptom_based' | 'holistic';
              break;
            case 'setting':
              treatment.setting = newValue as 'home' | 'hospital' | 'clinic';
              break;
          }
          onSaveAilment(ailment);
        }
      } else if (rowData.rowType === 'diagnostic') {
        const diagnosticIdx = ailment.diagnostics.findIndex((d) => d.id === rowData.id);
        if (diagnosticIdx >= 0) {
          const diagnostic = ailment.diagnostics[diagnosticIdx];
          switch (field) {
            case 'type':
              diagnostic.type = newValue as 'symptom_based' | 'holistic';
              break;
            case 'setting':
              diagnostic.setting = newValue as 'home' | 'hospital' | 'clinic';
              break;
          }
          onSaveAilment(ailment);
        }
      }
    },
    [onSaveAilment]
  );

  // Add new child row
  const handleAddChild = useCallback(
    (parentRow: GridRowData, childType: string) => {
      if (!parentRow._originalAilment) return;

      const ailment = deepClone(parentRow._originalAilment);

      if (childType === 'treatment') {
        ailment.treatments.push(createNewTreatment());
        setExpandedRows((prev) => new Set(prev).add(ailment.id));
      } else if (childType === 'diagnostic') {
        ailment.diagnostics.push(createNewDiagnostic());
        setExpandedRows((prev) => new Set(prev).add(ailment.id));
      } else if (childType === 'sideEffect') {
        if (parentRow.rowType === 'treatment') {
          const treatmentIdx = ailment.treatments.findIndex(
            (t) => t.id === parentRow.id
          );
          if (treatmentIdx >= 0) {
            ailment.treatments[treatmentIdx].sideEffects.push(
              createNewSideEffect()
            );
            setExpandedRows((prev) => new Set(prev).add(parentRow.id));
          }
        } else if (parentRow.rowType === 'diagnostic') {
          const diagnosticIdx = ailment.diagnostics.findIndex(
            (d) => d.id === parentRow.id
          );
          if (diagnosticIdx >= 0) {
            ailment.diagnostics[diagnosticIdx].sideEffects.push(
              createNewSideEffect()
            );
            setExpandedRows((prev) => new Set(prev).add(parentRow.id));
          }
        }
      }

      onSaveAilment(ailment);
    },
    [onSaveAilment]
  );

  // Delete row
  const handleDeleteRow = useCallback(
    (rowData: GridRowData) => {
      // Show confirmation modal for all row types
      setDeleteConfirm({
        isOpen: true,
        rowData: rowData,
        itemName: rowData.name || `this ${rowData.rowType}`,
        itemType: rowData.rowType,
      });
    },
    []
  );

  // Confirm delete action
  const confirmDelete = useCallback(() => {
    const rowData = deleteConfirm.rowData;
    if (!rowData) return;

    if (rowData.rowType === 'ailment') {
      onDeleteAilment(rowData.id);
    } else if (rowData._originalAilment) {
      const ailment = deepClone(rowData._originalAilment);

      if (rowData.rowType === 'treatment') {
        ailment.treatments = ailment.treatments.filter(
          (t) => t.id !== rowData.id
        );
      } else if (rowData.rowType === 'diagnostic') {
        ailment.diagnostics = ailment.diagnostics.filter(
          (d) => d.id !== rowData.id
        );
      } else if (rowData.rowType === 'sideEffect') {
        if (rowData.parentType === 'treatment') {
          const treatmentIdx = ailment.treatments.findIndex(
            (t) => t.id === rowData.parentId
          );
          if (treatmentIdx >= 0) {
            ailment.treatments[treatmentIdx].sideEffects = ailment.treatments[
              treatmentIdx
            ].sideEffects.filter((s) => s.id !== rowData.id);
          }
        } else if (rowData.parentType === 'diagnostic') {
          const diagnosticIdx = ailment.diagnostics.findIndex(
            (d) => d.id === rowData.parentId
          );
          if (diagnosticIdx >= 0) {
            ailment.diagnostics[diagnosticIdx].sideEffects = ailment.diagnostics[
              diagnosticIdx
            ].sideEffects.filter((s) => s.id !== rowData.id);
          }
        }
      }

      onSaveAilment(ailment);
    }
    
    setDeleteConfirm({ isOpen: false, rowData: null, itemName: '', itemType: '' });
  }, [deleteConfirm.rowData, onDeleteAilment, onSaveAilment]);

  // Handle cell editing
  const handleCellEditingStopped = useCallback(
    (event: CellEditingStoppedEvent) => {
      const { data, colDef, newValue, oldValue } = event;
      
      if (newValue === oldValue || !data._originalAilment) return;

      const field = colDef.field as string;
      const ailment = deepClone(data._originalAilment) as Ailment;

      // Update the appropriate field based on row type
      if (data.rowType === 'ailment') {
        switch (field) {
          case 'name':
            ailment.ailment.name = newValue;
            break;
          case 'description':
            ailment.ailment.description = newValue;
            break;
          case 'duration':
            ailment.ailment.duration = newValue;
            break;
          case 'intensity':
            ailment.ailment.intensity = Math.max(0, Math.min(100, Number(newValue)));
            break;
          case 'severity':
            ailment.ailment.severity = Math.max(0, Math.min(100, Number(newValue)));
            break;
        }
      } else if (data.rowType === 'treatment') {
        const treatmentIdx = ailment.treatments.findIndex((t) => t.id === data.id);
        if (treatmentIdx >= 0) {
          const treatment = ailment.treatments[treatmentIdx];
          switch (field) {
            case 'name':
              treatment.name = newValue;
              break;
            case 'description':
              treatment.description = newValue;
              break;
            case 'duration':
              treatment.duration = newValue;
              break;
            case 'intensity':
              treatment.intensity = Math.max(0, Math.min(100, Number(newValue)));
              break;
            case 'application':
              treatment.application = newValue;
              break;
            case 'efficacy':
              treatment.efficacy = Math.max(0, Math.min(100, Number(newValue)));
              break;
            case 'type':
              treatment.type = newValue;
              break;
            case 'setting':
              treatment.setting = newValue;
              break;
            case 'isPreventative':
              treatment.isPreventative = newValue;
              break;
            case 'isPalliative':
              treatment.isPalliative = newValue;
              break;
            case 'isCurative':
              treatment.isCurative = newValue;
              break;
          }
        }
      } else if (data.rowType === 'diagnostic') {
        const diagnosticIdx = ailment.diagnostics.findIndex((d) => d.id === data.id);
        if (diagnosticIdx >= 0) {
          const diagnostic = ailment.diagnostics[diagnosticIdx];
          switch (field) {
            case 'name':
              diagnostic.name = newValue;
              break;
            case 'description':
              diagnostic.description = newValue;
              break;
            case 'duration':
              diagnostic.duration = newValue;
              break;
            case 'intensity':
              diagnostic.intensity = Math.max(0, Math.min(100, Number(newValue)));
              break;
            case 'efficacy':
              diagnostic.efficacy = Math.max(0, Math.min(100, Number(newValue)));
              break;
            case 'type':
              diagnostic.type = newValue;
              break;
            case 'setting':
              diagnostic.setting = newValue;
              break;
          }
        }
      } else if (data.rowType === 'sideEffect') {
        let sideEffect: SideEffect | undefined;

        if (data.parentType === 'treatment') {
          const treatmentIdx = ailment.treatments.findIndex(
            (t) => t.id === data.parentId
          );
          if (treatmentIdx >= 0) {
            const seIdx = ailment.treatments[treatmentIdx].sideEffects.findIndex(
              (s) => s.id === data.id
            );
            if (seIdx >= 0) {
              sideEffect = ailment.treatments[treatmentIdx].sideEffects[seIdx];
            }
          }
        } else if (data.parentType === 'diagnostic') {
          const diagnosticIdx = ailment.diagnostics.findIndex(
            (d) => d.id === data.parentId
          );
          if (diagnosticIdx >= 0) {
            const seIdx = ailment.diagnostics[diagnosticIdx].sideEffects.findIndex(
              (s) => s.id === data.id
            );
            if (seIdx >= 0) {
              sideEffect = ailment.diagnostics[diagnosticIdx].sideEffects[seIdx];
            }
          }
        }

        if (sideEffect) {
          switch (field) {
            case 'name':
              sideEffect.name = newValue;
              break;
            case 'description':
              sideEffect.description = newValue;
              break;
            case 'duration':
              sideEffect.duration = newValue;
              break;
            case 'intensity':
              sideEffect.intensity = Math.max(0, Math.min(100, Number(newValue)));
              break;
            case 'severity':
              sideEffect.severity = Math.max(0, Math.min(100, Number(newValue)));
              break;
          }
        }
      }

      // Store pending changes
      setPendingChanges((prev) => new Map(prev).set(ailment.id, ailment));
      
      // Auto-save when editing stops
      onSaveAilment(ailment).then(() => {
        setPendingChanges((prev) => {
          const next = new Map(prev);
          next.delete(ailment.id);
          return next;
        });
      });
    },
    [onSaveAilment]
  );

  // Handle Enter key to save
  const handleCellKeyDown = useCallback(
    (event: CellKeyDownEvent) => {
      const keyEvent = event.event as KeyboardEvent;
      
      if (keyEvent.key === 'Enter' && !keyEvent.shiftKey) {
        const ailmentId = event.data._originalAilment?.id;
        if (ailmentId && pendingChanges.has(ailmentId)) {
          const ailmentToSave = pendingChanges.get(ailmentId)!;
          onSaveAilment(ailmentToSave).then(() => {
            setPendingChanges((prev) => {
              const next = new Map(prev);
              next.delete(ailmentId);
              return next;
            });
          });
        }
      }
    },
    [pendingChanges, onSaveAilment]
  );

  // Column definitions
  const columnDefs: ColDef[] = useMemo(
    () => [
      {
        headerName: '',
        field: 'actions',
        width: 200,
        pinned: 'left',
        cellRenderer: ActionCellRenderer,
        cellRendererParams: {
          onAdd: handleAddChild,
          onDelete: handleDeleteRow,
          onToggleExpand: handleToggleExpand,
          expandedRows: expandedRows,
        },
        editable: false,
        sortable: false,
        filter: false,
        headerClass: 'ag-header-cell-label',
      },
      {
        headerName: 'Type',
        field: 'rowType',
        width: 120,
        editable: false,
        cellRenderer: (params: ICellRendererParams) => {
          const typeStyles: Record<string, { bg: string; text: string; border: string; icon: string }> = {
            ailment: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: '🏥' },
            treatment: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: '💊' },
            diagnostic: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: '🔬' },
            sideEffect: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', icon: '⚠️' },
          };
          const style = typeStyles[params.value] || { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', icon: '📄' };
          const indent = (params.data?.level || 0) * 16;
          
          return (
            <div className="flex items-center h-full" style={{ paddingLeft: `${indent}px` }}>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${style.bg} ${style.text} ${style.border}`}>
                <span>{style.icon}</span>
                <span className="capitalize">{params.value}</span>
              </span>
            </div>
          );
        },
      },
      {
        headerName: 'Name',
        field: 'name',
        width: 220,
        editable: true,
        cellRenderer: (params: ICellRendererParams) => {
          return (
            <div className="flex items-center h-full">
              <span className="font-medium text-slate-800">{params.value || '—'}</span>
            </div>
          );
        },
      },
      {
        headerName: 'Description',
        field: 'description',
        width: 280,
        editable: true,
        cellRenderer: (params: ICellRendererParams) => {
          return (
            <div className="flex items-center h-full">
              <span className="text-slate-600 truncate">{params.value || '—'}</span>
            </div>
          );
        },
      },
      {
        headerName: 'Duration',
        field: 'duration',
        width: 120,
        editable: true,
        cellEditor: DurationEditor,
        cellRenderer: (params: ICellRendererParams) => {
          const formatted = formatDuration(params.value);
          return (
            <div className="flex items-center h-full">
              <span className="inline-flex items-center gap-1 text-slate-600">
                <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {formatted || '—'}
              </span>
            </div>
          );
        },
      },
      {
        headerName: 'Intensity',
        field: 'intensity',
        width: 130,
        editable: true,
        cellEditor: 'agNumberCellEditor',
        cellEditorParams: { min: 0, max: 100 },
        cellRenderer: (params: ICellRendererParams) => {
          if (params.value == null) return <span className="text-slate-400">—</span>;
          const value = params.value;
          const color = value >= 70 ? 'bg-red-500' : value >= 40 ? 'bg-amber-500' : 'bg-emerald-500';
          return (
            <div className="flex items-center gap-2 h-full">
              <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${value}%` }} />
              </div>
              <span className="text-xs font-medium text-slate-600 w-8">{value}%</span>
            </div>
          );
        },
      },
      {
        headerName: 'Severity',
        field: 'severity',
        width: 130,
        editable: (params) =>
          params.data?.rowType === 'ailment' || params.data?.rowType === 'sideEffect',
        cellEditor: 'agNumberCellEditor',
        cellEditorParams: { min: 0, max: 100 },
        cellRenderer: (params: ICellRendererParams) => {
          if (params.value == null) return <span className="text-slate-400">—</span>;
          const value = params.value;
          const color = value >= 70 ? 'bg-red-500' : value >= 40 ? 'bg-amber-500' : 'bg-emerald-500';
          return (
            <div className="flex items-center gap-2 h-full">
              <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${value}%` }} />
              </div>
              <span className="text-xs font-medium text-slate-600 w-8">{value}%</span>
            </div>
          );
        },
      },
      {
        headerName: 'Efficacy',
        field: 'efficacy',
        width: 130,
        editable: (params) =>
          params.data?.rowType === 'treatment' || params.data?.rowType === 'diagnostic',
        cellEditor: 'agNumberCellEditor',
        cellEditorParams: { min: 0, max: 100 },
        cellRenderer: (params: ICellRendererParams) => {
          if (params.value == null) return <span className="text-slate-400">—</span>;
          const value = params.value;
          const color = value >= 70 ? 'bg-emerald-500' : value >= 40 ? 'bg-amber-500' : 'bg-red-500';
          return (
            <div className="flex items-center gap-2 h-full">
              <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${value}%` }} />
              </div>
              <span className="text-xs font-medium text-slate-600 w-8">{value}%</span>
            </div>
          );
        },
      },
      {
        headerName: 'Application',
        field: 'application',
        width: 130,
        editable: false,
        cellRenderer: ClickableSelectCellRenderer,
        cellRendererParams: {
          onSelect: handleSelectChange,
          options: APPLICATION_OPTIONS,
          isEditableForRow: (row: GridRowData) => row?.rowType === 'treatment',
          getDisplayValue: (value: string) => (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 capitalize">
              {value}
            </span>
          ),
        },
      },
      {
        headerName: 'Type',
        field: 'type',
        width: 140,
        editable: false,
        cellRenderer: ClickableSelectCellRenderer,
        cellRendererParams: {
          onSelect: handleSelectChange,
          options: TYPE_OPTIONS,
          isEditableForRow: (row: GridRowData) => row?.rowType === 'treatment' || row?.rowType === 'diagnostic',
          getDisplayValue: (value: string) => {
            const isSymptomBased = value === 'symptom_based';
            return (
              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${
                isSymptomBased ? 'bg-purple-100 text-purple-700' : 'bg-teal-100 text-teal-700'
              }`}>
                {value?.replace('_', ' ')}
              </span>
            );
          },
        },
      },
      {
        headerName: 'Setting',
        field: 'setting',
        width: 120,
        editable: false,
        cellRenderer: ClickableSelectCellRenderer,
        cellRendererParams: {
          onSelect: handleSelectChange,
          options: SETTING_OPTIONS,
          isEditableForRow: (row: GridRowData) => row?.rowType === 'treatment' || row?.rowType === 'diagnostic',
          getDisplayValue: (value: string) => {
            const icons: Record<string, string> = { hospital: '🏥', clinic: '🏪', home: '🏠' };
            return (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 capitalize">
                {icons[value] || ''} {value}
              </span>
            );
          },
        },
      },
      {
        headerName: 'Preventative',
        field: 'isPreventative',
        width: 110,
        editable: false,
        cellRenderer: ClickableBooleanCellRenderer,
        cellRendererParams: {
          onToggle: handleBooleanToggle,
        },
      },
      {
        headerName: 'Palliative',
        field: 'isPalliative',
        width: 95,
        editable: false,
        cellRenderer: ClickableBooleanCellRenderer,
        cellRendererParams: {
          onToggle: handleBooleanToggle,
        },
      },
      {
        headerName: 'Curative',
        field: 'isCurative',
        width: 90,
        editable: false,
        cellRenderer: ClickableBooleanCellRenderer,
        cellRendererParams: {
          onToggle: handleBooleanToggle,
        },
      },
    ],
    [handleAddChild, handleDeleteRow, handleToggleExpand, handleBooleanToggle, handleSelectChange, expandedRows]
  );

  const defaultColDef: ColDef = useMemo(
    () => ({
      resizable: true,
      sortable: true,
      filter: true,
    }),
    []
  );

  const getRowId = useCallback((params: GetRowIdParams) => params.data.id, []);

  const getRowClass = useCallback((params: RowClassParams) => {
    const level = params.data?.level || 0;
    if (level === 1) return 'nested-row-level-1';
    if (level === 2) return 'nested-row-level-2';
    return '';
  }, []);

  const onGridReady = useCallback((params: GridReadyEvent) => {
    setGridApi(params.api);
  }, []);

  // Add new ailment
  const handleAddAilment = useCallback(() => {
    const newAilment = createNewAilment();
    onSaveAilment(newAilment);
  }, [onSaveAilment]);

  return (
    <div className="flex flex-col h-full">
      {/* Header Section */}
      <div className="flex items-center mb-6 px-1">
        {/* Left side - Buttons */}
        <div className="flex items-center gap-3">
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white text-slate-600 border border-slate-300 
                         rounded-lg hover:bg-slate-50 hover:border-slate-400 transition-colors duration-150 
                         font-medium text-sm shadow-sm"
              title="Refresh data from server"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          )}
          <button
            onClick={handleAddAilment}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg 
                       hover:bg-indigo-700 transition-colors duration-150 font-medium text-sm shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Ailment
          </button>
        </div>
        
        {/* Center - Title */}
        <div className="flex-1 text-center">
          <h2 className="text-2xl font-bold text-slate-800">Ailment Management</h2>
          <p className="text-sm text-slate-500 mt-1">Manage ailments, treatments, diagnostics, and side effects</p>
        </div>
        
        {/* Right side - Status indicator */}
        <div className="flex items-center gap-3">
          {pendingChanges.size > 0 && (
            <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-sm font-medium">
              <svg className="w-4 h-4 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              {pendingChanges.size} saving...
            </span>
          )}
          {/* Spacer to balance the left buttons */}
          {pendingChanges.size === 0 && <div className="w-[200px]"></div>}
        </div>
      </div>

      {/* Grid Container */}
      <div className="flex-1 ag-theme-alpine rounded-lg border border-slate-200 overflow-hidden shadow-sm">
        <AgGridReact
          ref={gridRef}
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          getRowId={getRowId}
          getRowClass={getRowClass}
          onGridReady={onGridReady}
          onCellEditingStopped={handleCellEditingStopped}
          onCellKeyDown={handleCellKeyDown}
          singleClickEdit={true}
          stopEditingWhenCellsLoseFocus={true}
          enableCellTextSelection={true}
          suppressRowClickSelection={true}
          animateRows={true}
          domLayout="autoHeight"
        />
      </div>

      {loading && (
        <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 flex items-center gap-4">
            <svg className="w-8 h-8 animate-spin text-indigo-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
            </svg>
            <span className="text-slate-700 font-medium">Loading...</span>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        title={`Delete ${deleteConfirm.itemType.charAt(0).toUpperCase() + deleteConfirm.itemType.slice(1)}`}
        message={deleteConfirm.itemType === 'ailment' 
          ? `Are you sure you want to delete "${deleteConfirm.itemName}" and all its treatments and diagnostics? This action cannot be undone.`
          : `Are you sure you want to delete "${deleteConfirm.itemName}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeleteConfirm({ isOpen: false, rowData: null, itemName: '', itemType: '' });
        }}
      />

      {/* Tips Section */}
      <div className="mt-6 p-4 bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg border border-slate-200">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h4 className="font-semibold text-slate-800 text-sm">Quick Tips</h4>
            <ul className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1 text-sm text-slate-600">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                Click any cell to edit directly
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                <kbd className="px-1.5 py-0.5 bg-white rounded border border-slate-300 text-xs font-mono">Tab</kbd> to move between cells
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                Use <span className="font-medium text-emerald-600">+T</span>, <span className="font-medium text-emerald-600">+D</span>, <span className="font-medium text-emerald-600">+S</span> to add items
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                Click <span className="font-medium text-indigo-600">▶</span> to expand nested rows
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AilmentDataGrid;
