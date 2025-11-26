import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { settingsService } from '../services/settingsService';
import { logDebug } from '../utils/logger';

const defaultStageDefinitions = [
  {
    id: 'default-pipeline',
    name: 'Pipeline',
    description: 'Oportunidades em prospecção inicial ou pipeline geral.',
    order_index: 0,
    color: '#9CA3AF',
  },
  {
    id: 'default-strong-upside',
    name: 'Strong Upside',
    description: 'Oportunidades com forte probabilidade de avanço.',
    order_index: 1,
    color: '#3B82F6',
  },
  {
    id: 'default-committed',
    name: 'Committed',
    description: 'Oportunidades com previsão assumida para o período.',
    order_index: 2,
    color: '#2563EB',
  },
  {
    id: 'default-deal',
    name: 'Deal',
    description: 'Contrato fechado.',
    order_index: 3,
    color: '#10B981',
  },
  {
    id: 'default-lost',
    name: 'Lost',
    description: 'Oportunidades perdidas.',
    order_index: 4,
    color: '#6B7280',
  },
];

const StageContext = createContext({
  stages: defaultStageDefinitions,
  loading: true,
  refreshStages: () => {},
});

export const StageProvider = ({ children }) => {
  const { user } = useAuth();
  const [stages, setStages] = useState(defaultStageDefinitions);
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const loadStageDefinitions = async () => {
    setLoading(true);
    try {
      const data = await settingsService.getStageDefinitions();
      if (data && data.length > 0) {
        logDebug('Stage definitions loaded', { count: data.length });
        setStages(
          data
            .map((stage) => ({
              ...stage,
              description: stage.description || '',
            }))
            .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
        );
      } else if (!seeding) {
        setSeeding(true);
        await settingsService.resetStageDefinitions(null, defaultStageDefinitions);
        const seeded = await settingsService.getStageDefinitions();
        setStages(
          (seeded || defaultStageDefinitions).sort(
            (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)
          )
        );
      } else {
        logDebug('Stage definitions empty after seeding, using defaults');
        setStages(defaultStageDefinitions);
      }
    } catch (error) {
      logDebug('Erro ao carregar estágios', { error: error.message });
      setStages(defaultStageDefinitions);
    } finally {
      setLoading(false);
      setSeeding(false);
    }
  };

  useEffect(() => {
    loadStageDefinitions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const value = useMemo(
    () => ({
      stages,
      loading,
      refreshStages: loadStageDefinitions,
      defaultStageDefinitions,
    }),
    [stages, loading]
  );

  return <StageContext.Provider value={value}>{children}</StageContext.Provider>;
};

export const useStageContext = () => useContext(StageContext);
