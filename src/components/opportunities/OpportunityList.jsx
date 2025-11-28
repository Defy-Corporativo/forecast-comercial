import React, { useState, useEffect } from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import { useStageContext } from '../../contexts/StageContext';
import { settingsService } from '../../services/settingsService';
import styles from './Opportunities.module.css';

const OpportunityList = ({ opportunities, onView, onEdit, onDelete }) => {
    const { stages } = useStageContext();
    const [visibleColumns, setVisibleColumns] = useState([]);
    const [customFields, setCustomFields] = useState([]);
    const [loadingPrefs, setLoadingPrefs] = useState(true);

    useEffect(() => {
        loadPreferences();
    }, []);

    const loadPreferences = async () => {
        try {
            setLoadingPrefs(true);
            
            // Load custom fields first
            const fields = await settingsService.getCustomFields();
            setCustomFields(fields);

            // Load visible columns preference
            const prefs = await settingsService.getUserPreferences();
            if (prefs?.visible_columns && prefs.visible_columns.length > 0) {
                setVisibleColumns(prefs.visible_columns);
            } else {
                // Default columns if no preferences saved
                setVisibleColumns([
                    'opportunity_number', 'title', 'client_name', 'estimated_value',
                    'stage', 'forecast_date', 'responsible'
                ]);
            }
        } catch (error) {
            console.error('Error loading preferences:', error);
            // Fallback to default columns on error
            setVisibleColumns([
                'opportunity_number', 'title', 'client_name', 'estimated_value',
                'stage', 'forecast_date', 'responsible'
            ]);
        } finally {
            setLoadingPrefs(false);
        }
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('pt-BR');
    };

    // Get stage description for tooltip
    const getStageDescription = (stageName) => {
        const stage = stages.find(s => s.name === stageName);
        return stage?.description || '';
    };

    const getStageColor = (stageName) => {
        const stage = stages.find(s => s.name === stageName);
        return stage?.color || '#e9ecef';
    };

    // Field definitions
    const fieldDefinitions = {
        opportunity_number: { label: 'Número', render: (opp) => opp.opportunity_number },
        title: { label: 'Título', render: (opp) => opp.title || '-' },
        client_name: {
            label: 'Cliente',
            render: (opp) => opp.client?.name || opp.client_name || '-'
        },
        estimated_value: { label: 'Valor', render: (opp) => formatCurrency(opp.estimated_value) },
        stage: {
            label: 'Estágio',
            render: (opp) => (
                <span
                    className={styles.stageBadge}
                    style={{ backgroundColor: getStageColor(opp.stage), color: '#fff' }}
                    title={getStageDescription(opp.stage)}
                >
                    {opp.stage}
                </span>
            )
        },
        forecast_date: { label: 'Data Previsão', render: (opp) => formatDate(opp.forecast_date) },
        responsible: { label: 'Responsável', render: (opp) => opp.responsible || '-' },
        creation_date: { label: 'Data Criação', render: (opp) => formatDate(opp.creation_date) },
        notes: { label: 'Observações', render: (opp) => opp.notes || '-' },
    };

    // Add custom fields to definitions
    customFields.forEach(field => {
        fieldDefinitions[`custom_${field.field_name}`] = {
            label: field.field_name,
            render: (opp) => {
                const value = opp.custom_data?.[field.field_name];
                if (field.field_type === 'checkbox') return value ? 'Sim' : 'Não';
                if (field.field_type === 'date') return formatDate(value);
                return value || '-';
            }
        };
    });

    // Filter visible columns to only include those that exist in definitions
    const activeColumns = visibleColumns.filter(col => fieldDefinitions[col]);

    // Show loading state while preferences are being loaded
    if (loadingPrefs) {
        return (
            <div className={styles.tableContainer} style={{ padding: '40px', textAlign: 'center' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Carregando...</span>
            </div>
        );
    }

    return (
        <div className={styles.tableContainer}>
            <table className={styles.table}>
                <thead>
                    <tr>
                        {activeColumns.map(colId => (
                            <th key={colId}>{fieldDefinitions[colId]?.label}</th>
                        ))}
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {opportunities.map(opp => (
                        <tr key={opp.id} onClick={() => onView(opp)} style={{ cursor: 'pointer' }}>
                            {activeColumns.map(colId => (
                                <td key={colId}>
                                    {fieldDefinitions[colId]?.render(opp)}
                                </td>
                            ))}
                            <td onClick={(e) => e.stopPropagation()}>
                                <div className={styles.actions}>
                                    <button className={styles.actionBtn} onClick={() => onEdit(opp)} title="Editar">
                                        <Edit2 size={16} />
                                    </button>
                                    <button className={`${styles.actionBtn} ${styles.danger}`} onClick={() => onDelete(opp.id)} title="Excluir">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                    {opportunities.length === 0 && (
                        <tr>
                            <td colSpan={activeColumns.length + 1} style={{ textAlign: 'center', padding: '20px' }}>
                                Nenhuma oportunidade encontrada.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default OpportunityList;
