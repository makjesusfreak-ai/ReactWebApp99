'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { AilmentDataGrid, Navigation, useToast } from '@/components';
import {
  GET_AILMENTS,
  CREATE_AILMENT,
  UPDATE_AILMENT,
  DELETE_AILMENT,
} from '@/graphql';
import { Ailment } from '@/types';
import {
  subscribeToAilmentCreated,
  subscribeToAilmentUpdated,
  subscribeToAilmentDeleted,
  Subscription,
} from '@/lib/subscriptions';

export default function DataManagementPage() {
  const { showToast } = useToast();
  const [localAilments, setLocalAilments] = useState<Ailment[]>([]);
  const subscriptionsRef = useRef<Subscription[]>([]);

  // GraphQL Query (no polling needed with real-time subscriptions)
  const { data, loading, error, refetch } = useQuery(GET_AILMENTS);

  // Handle query data updates
  useEffect(() => {
    if (data?.getAilments) {
      setLocalAilments(data.getAilments);
    }
  }, [data]);

  // Handle query errors
  useEffect(() => {
    if (error) {
      showToast(`Error loading data: ${error.message}`, 'error');
      // Use mock data for demo if API is unavailable
      setLocalAilments(getMockData());
    }
  }, [error, showToast]);

  // Set up real-time subscriptions with AWS Amplify
  useEffect(() => {
    // Subscribe to new ailments
    const createSub = subscribeToAilmentCreated(
      (newAilment) => {
        setLocalAilments((prev) => {
          // Check if already exists (from our own mutation)
          if (prev.some((a) => a.id === newAilment.id)) {
            return prev;
          }
          showToast(`New ailment added: ${newAilment.ailment?.name || 'Unknown'}`, 'info');
          return [...prev, newAilment];
        });
      },
      (error) => {
        console.warn('Subscription error (created):', error.message);
      }
    );

    // Subscribe to updated ailments
    const updateSub = subscribeToAilmentUpdated(
      (updatedAilment) => {
        setLocalAilments((prev) =>
          prev.map((a) => (a.id === updatedAilment.id ? updatedAilment : a))
        );
      },
      (error) => {
        console.warn('Subscription error (updated):', error.message);
      }
    );

    // Subscribe to deleted ailments
    const deleteSub = subscribeToAilmentDeleted(
      (result) => {
        if (result.success && result.id) {
          setLocalAilments((prev) => {
            // Only remove if not already removed by our own optimistic update
            const filtered = prev.filter((a) => a.id !== result.id);
            if (filtered.length < prev.length) {
              showToast('Ailment deleted by another user', 'info');
            }
            return filtered;
          });
        }
      },
      (error) => {
        console.warn('Subscription error (deleted):', error.message);
      }
    );

    subscriptionsRef.current = [createSub, updateSub, deleteSub];
    console.log('✅ Real-time subscriptions active');

    // Cleanup subscriptions on unmount
    return () => {
      subscriptionsRef.current.forEach((sub) => sub.unsubscribe());
      subscriptionsRef.current = [];
      console.log('🔌 Real-time subscriptions disconnected');
    };
  }, [showToast, refetch]);

  // GraphQL Mutations
  const [createAilment] = useMutation(CREATE_AILMENT, {
    onCompleted: () => {
      showToast('Ailment created successfully', 'success');
    },
    onError: (err) => {
      showToast(`Error creating ailment: ${err.message}`, 'error');
    },
  });

  const [updateAilment] = useMutation(UPDATE_AILMENT, {
    onCompleted: () => {
      showToast('Ailment updated successfully', 'success');
    },
    onError: (err) => {
      showToast(`Error updating ailment: ${err.message}`, 'error');
    },
  });

  const [deleteAilmentMutation] = useMutation(DELETE_AILMENT, {
    onCompleted: () => {
      showToast('Ailment deleted successfully', 'success');
    },
    onError: (err) => {
      showToast(`Error deleting ailment: ${err.message}`, 'error');
    },
  });

  // Save handler
  const handleSaveAilment = useCallback(
    async (ailment: Ailment) => {
      const exists = localAilments.some((a) => a.id === ailment.id);

      // Optimistic update
      if (exists) {
        setLocalAilments((prev) =>
          prev.map((a) => (a.id === ailment.id ? ailment : a))
        );
      } else {
        setLocalAilments((prev) => [...prev, ailment]);
      }

      try {
        const input = {
          ailment: {
            name: ailment.ailment.name,
            description: ailment.ailment.description,
            duration: ailment.ailment.duration,
            intensity: ailment.ailment.intensity,
            severity: ailment.ailment.severity,
          },
          treatments: ailment.treatments.map((t) => ({
            id: t.id,
            name: t.name,
            description: t.description,
            application: t.application,
            efficacy: t.efficacy,
            duration: t.duration,
            intensity: t.intensity,
            type: t.type,
            sideEffects: t.sideEffects.map((s) => ({
              id: s.id,
              name: s.name,
              description: s.description,
              duration: s.duration,
              intensity: s.intensity,
              severity: s.severity,
            })),
            setting: t.setting,
            isPreventative: t.isPreventative,
            isPalliative: t.isPalliative,
            isCurative: t.isCurative,
          })),
          diagnostics: ailment.diagnostics.map((d) => ({
            id: d.id,
            name: d.name,
            description: d.description,
            efficacy: d.efficacy,
            duration: d.duration,
            intensity: d.intensity,
            type: d.type,
            sideEffects: d.sideEffects.map((s) => ({
              id: s.id,
              name: s.name,
              description: s.description,
              duration: s.duration,
              intensity: s.intensity,
              severity: s.severity,
            })),
            setting: d.setting,
          })),
        };

        if (exists) {
          await updateAilment({
            variables: { id: ailment.id, input },
          });
        } else {
          await createAilment({
            variables: { input: { ...input, id: ailment.id } },
          });
        }
      } catch (err) {
        // Revert optimistic update on error
        if (exists) {
          refetch();
        } else {
          setLocalAilments((prev) => prev.filter((a) => a.id !== ailment.id));
        }
      }
    },
    [localAilments, createAilment, updateAilment, refetch]
  );

  // Delete handler
  const handleDeleteAilment = useCallback(
    async (id: string) => {
      // Optimistic delete
      const deletedAilment = localAilments.find((a) => a.id === id);
      setLocalAilments((prev) => prev.filter((a) => a.id !== id));

      try {
        await deleteAilmentMutation({ variables: { id } });
      } catch (err) {
        // Revert on error
        if (deletedAilment) {
          setLocalAilments((prev) => [...prev, deletedAilment]);
        }
      }
    },
    [localAilments, deleteAilmentMutation]
  );

  return (
    <div className="min-h-screen bg-gray-100">
      <Navigation />
      <main className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <AilmentDataGrid
            ailments={localAilments}
            onSaveAilment={handleSaveAilment}
            onDeleteAilment={handleDeleteAilment}
            onRefresh={() => refetch()}
          />
        </div>
      </main>
    </div>
  );
}

// Mock data for demo purposes when API is unavailable
function getMockData(): Ailment[] {
  return [
    {
      id: '1',
      ailment: {
        name: 'Migraine',
        description: 'Severe recurring headache',
        duration: 14400, // 4 hours
        intensity: 75,
        severity: 60,
      },
      treatments: [
        {
          id: 't1',
          name: 'Ibuprofen',
          description: 'NSAID pain reliever',
          application: 'oral',
          efficacy: 70,
          duration: 3600, // 1 hour
          intensity: 20,
          type: 'symptom_based',
          sideEffects: [
            {
              id: 'se1',
              name: 'Stomach Upset',
              description: 'Mild nausea',
              duration: 1800,
              intensity: 30,
              severity: 20,
            },
          ],
          setting: 'home',
          isPreventative: false,
          isPalliative: true,
          isCurative: false,
        },
        {
          id: 't2',
          name: 'Sumatriptan',
          description: 'Triptan medication',
          application: 'oral',
          efficacy: 85,
          duration: 1800,
          intensity: 30,
          type: 'symptom_based',
          sideEffects: [
            {
              id: 'se2',
              name: 'Dizziness',
              description: 'Brief lightheadedness',
              duration: 900,
              intensity: 25,
              severity: 15,
            },
          ],
          setting: 'home',
          isPreventative: false,
          isPalliative: true,
          isCurative: true,
        },
      ],
      diagnostics: [
        {
          id: 'd1',
          name: 'Neurological Exam',
          description: 'Physical examination',
          efficacy: 60,
          duration: 1800,
          intensity: 10,
          type: 'holistic',
          sideEffects: [],
          setting: 'clinic',
        },
      ],
    },
    {
      id: '2',
      ailment: {
        name: 'Type 2 Diabetes',
        description: 'Chronic metabolic disorder',
        duration: 31536000, // 1 year (chronic)
        intensity: 40,
        severity: 70,
      },
      treatments: [
        {
          id: 't3',
          name: 'Metformin',
          description: 'Oral diabetes medication',
          application: 'oral',
          efficacy: 80,
          duration: 86400, // Daily
          intensity: 15,
          type: 'symptom_based',
          sideEffects: [
            {
              id: 'se3',
              name: 'GI Disturbance',
              description: 'Digestive issues',
              duration: 7200,
              intensity: 35,
              severity: 25,
            },
          ],
          setting: 'home',
          isPreventative: true,
          isPalliative: true,
          isCurative: false,
        },
      ],
      diagnostics: [
        {
          id: 'd2',
          name: 'HbA1c Test',
          description: 'Blood sugar level test',
          efficacy: 95,
          duration: 300,
          intensity: 5,
          type: 'symptom_based',
          sideEffects: [],
          setting: 'clinic',
        },
      ],
    },
  ];
}
