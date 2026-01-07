'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@apollo/client';
import dynamic from 'next/dynamic';
import { Navigation, useToast } from '@/components';
import { GET_AILMENTS } from '@/graphql';
import { Ailment } from '@/types';
import {
  subscribeToAilmentCreated,
  subscribeToAilmentUpdated,
  subscribeToAilmentDeleted,
  Subscription,
} from '@/lib/subscriptions';

// Dynamically import amCharts component to avoid SSR issues
const BubbleChart = dynamic(() => import('@/components/BubbleChart'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[600px]">
      <div className="spinner"></div>
    </div>
  ),
});

export default function VisualizationPage() {
  const { showToast } = useToast();
  const [ailments, setAilments] = useState<Ailment[]>([]);
  const subscriptionsRef = useRef<Subscription[]>([]);

  const { data, loading, error, refetch } = useQuery(GET_AILMENTS);

  // Handle query data updates
  useEffect(() => {
    if (data?.getAilments) {
      setAilments(data.getAilments);
    }
  }, [data]);

  // Handle query errors
  useEffect(() => {
    if (error) {
      showToast(`Error loading data: ${error.message}`, 'error');
      // Use mock data for demo
      setAilments(getMockData());
    }
  }, [error, showToast]);

  // Set up real-time subscriptions
  useEffect(() => {
    console.log('📊 Setting up real-time subscriptions for Visualization page...');

    // Subscribe to new ailments
    const createdSub = subscribeToAilmentCreated(
      (newAilment) => {
        console.log('📊 Real-time: New ailment received for chart', newAilment);
        setAilments((prev) => {
          // Check if already exists
          if (prev.some((a) => a.id === newAilment.id)) {
            return prev;
          }
          return [...prev, newAilment];
        });
        showToast(`Chart updated: "${newAilment.ailment.name}" added`, 'success');
      },
      (error) => {
        console.error('Subscription error (created):', error);
      }
    );

    // Subscribe to updated ailments
    const updatedSub = subscribeToAilmentUpdated(
      (updatedAilment) => {
        console.log('📊 Real-time: Ailment updated for chart', updatedAilment);
        setAilments((prev) =>
          prev.map((a) => (a.id === updatedAilment.id ? updatedAilment : a))
        );
        showToast(`Chart updated: "${updatedAilment.ailment.name}" modified`, 'info');
      },
      (error) => {
        console.error('Subscription error (updated):', error);
      }
    );

    // Subscribe to deleted ailments
    const deletedSub = subscribeToAilmentDeleted(
      (deleteResponse) => {
        console.log('📊 Real-time: Ailment deleted', deleteResponse);
        if (deleteResponse.success && deleteResponse.id) {
          setAilments((prev) => prev.filter((a) => a.id !== deleteResponse.id));
          showToast('Chart updated: Ailment removed', 'info');
        }
      },
      (error) => {
        console.error('Subscription error (deleted):', error);
      }
    );

    subscriptionsRef.current = [createdSub, updatedSub, deletedSub];

    // Cleanup subscriptions on unmount
    return () => {
      console.log('📊 Cleaning up Visualization page subscriptions...');
      subscriptionsRef.current.forEach((sub) => sub.unsubscribe());
      subscriptionsRef.current = [];
    };
  }, [refetch, showToast]);

  return (
    <div className="min-h-screen bg-gray-100">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-800">
              Ailment Data Visualization
            </h1>
            <p className="text-gray-600 mt-2">
              Bubble chart showing ailment duration vs intensity with treatment
              efficacy pie bullets
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-[600px]">
              <div className="spinner"></div>
            </div>
          ) : ailments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[400px] text-gray-500">
              <svg
                className="w-16 h-16 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              <p className="text-lg">No ailment data available</p>
              <p className="text-sm mt-2">
                Add some ailments in the Data Management page first
              </p>
            </div>
          ) : (
            <BubbleChart ailments={ailments} />
          )}

          {/* Summary Statistics */}
          {ailments.length > 0 && (
            <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatCard
                title="Total Ailments"
                value={ailments.length}
                icon="🏥"
              />
              <StatCard
                title="Total Treatments"
                value={ailments.reduce((sum, a) => sum + a.treatments.length, 0)}
                icon="💊"
              />
              <StatCard
                title="Total Diagnostics"
                value={ailments.reduce((sum, a) => sum + a.diagnostics.length, 0)}
                icon="🔬"
              />
              <StatCard
                title="Avg Severity"
                value={`${Math.round(
                  ailments.reduce((sum, a) => sum + a.ailment.severity, 0) /
                    ailments.length
                )}%`}
                icon="📊"
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon }) => (
  <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg p-4 shadow">
    <div className="flex items-center gap-3">
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="text-sm text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
      </div>
    </div>
  </div>
);

// Mock data for demo purposes
function getMockData(): Ailment[] {
  return [
    {
      id: '1',
      ailment: {
        name: 'Migraine',
        description: 'Severe recurring headache',
        duration: 14400,
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
          duration: 3600,
          intensity: 20,
          type: 'symptom_based',
          sideEffects: [],
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
          sideEffects: [],
          setting: 'home',
          isPreventative: false,
          isPalliative: true,
          isCurative: true,
        },
      ],
      diagnostics: [],
    },
    {
      id: '2',
      ailment: {
        name: 'Type 2 Diabetes',
        description: 'Chronic metabolic disorder',
        duration: 31536000,
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
          duration: 86400,
          intensity: 15,
          type: 'symptom_based',
          sideEffects: [],
          setting: 'home',
          isPreventative: true,
          isPalliative: true,
          isCurative: false,
        },
      ],
      diagnostics: [],
    },
    {
      id: '3',
      ailment: {
        name: 'Hypertension',
        description: 'High blood pressure',
        duration: 86400,
        intensity: 30,
        severity: 55,
      },
      treatments: [
        {
          id: 't4',
          name: 'Lisinopril',
          description: 'ACE inhibitor',
          application: 'oral',
          efficacy: 75,
          duration: 86400,
          intensity: 10,
          type: 'symptom_based',
          sideEffects: [],
          setting: 'home',
          isPreventative: true,
          isPalliative: true,
          isCurative: false,
        },
      ],
      diagnostics: [],
    },
  ];
}
