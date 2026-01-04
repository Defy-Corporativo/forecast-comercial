import React, { useState, useEffect } from 'react';
import { Edit2, Trash2, ChevronDown, ChevronRight, Calendar, DollarSign, CheckCircle, Target, Tag } from 'lucide-react';
import { useStageContext } from '../../contexts/StageContext';
import { settingsService } from '../../services/settingsService';
import styles from './Opportunities.module.css';

const OpportunityList = ({ opportunities, groupMode = 'grouped', onView, onEdit, onDelete }) => {
    const { stages } = useStageContext();
    const [visibleColumns, setVisibleColumns] = useState([]);
    const [customFields, setCustomFields] = useState([]);
    const [loadingPrefs, setLoadingPrefs] = useState(true);
    const [expandedRows, setExpandedRows] = useState(new Set());

    useEffect(() => {
        loadPreferences();
    }, []);

    const loadPreferences = async () => {
        try {
            setLoadingPrefs(true);

            const fields = await settingsService.getCustomFields();
            setCustomFields(fields);

            const prefs = await settingsService.getUserPreferences();
            if (prefs?.visible_columns && prefs.visible_columns.length > 0) {
                setVisibleColumns(prefs.visible_columns);
            } else {
                setVisibleColumns([
                    'opportunity_number', 'title', 'client_name', 'estimated_value',
                    'stage', 'period', 'responsible'
                ]);
            }
        } catch (error) {
            console.error('Error loading preferences:', error);
            setVisibleColumns([
                'opportunity_number', 'title', 'client_name', 'estimated_value',
                'stage', 'period', 'responsible'
            ]);
        } finally {
            setLoadingPrefs(false);
        }
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('pt-BR');
    };

    const getStageDescription = (stageName) => {
        const stage = stages.find(s => s.name === stageName);
        return stage?.description || '';
    };

    const getStageColor = (stageName) => {
        const stage = stages.find(s => s.name === stageName);
        return stage?.color || '#e9ecef';
    };

    const toggleExpanded = (id) => {
        setExpandedRows(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    // Field definitions for grouped mode
    const groupedFieldDefinitions = {
        opportunity_number: { label: 'Número', render: (opp) => opp.opportunity_number },
        title: {
            label: 'Título',
            render: (opp) => (
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {opp.is_goal && (
                        <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '2px 6px',
                            background: 'linear-gradient(135deg, #f59e0b20, #f59e0b10)',
                            color: '#b45309',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 500
                        }}>
                            <Target size={12} />
                            Meta
                        </span>
                    )}
                    {opp.title || '-'}
                    {(opp.tagList || []).length > 0 && (
                        <span style={{ display: 'flex', gap: '4px', marginLeft: '4px' }}>
                            {opp.tagList.slice(0, 2).map(tag => (
                                <span
                                    key={tag.id || tag.name}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '2px',
                                        padding: '2px 6px',
                                        background: 'var(--bg-secondary)',
                                        color: 'var(--text-secondary)',
                                        borderRadius: '4px',
                                        fontSize: '0.7rem'
                                    }}
                                >
                                    <Tag size={10} />
                                    {tag.name}
                                </span>
                            ))}
                            {opp.tagList.length > 2 && (
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                                    +{opp.tagList.length - 2}
                                </span>
                            )}
                        </span>
                    )}
                </span>
            )
        },
        client_name: {
            label: 'Cliente',
            render: (opp) => opp.is_goal ? '-' : (opp.client?.name || opp.client_name || '-')
        },
        estimated_value: {
            label: 'Valor Total',
            render: (opp) => (
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {formatCurrency(opp.total_value || opp.estimated_value)}
                    {(opp.forecast_count || 0) > 1 && (
                        <span style={{
                            fontSize: '0.75rem',
                            color: 'var(--text-secondary)',
                            background: 'var(--bg-secondary)',
                            padding: '2px 6px',
                            borderRadius: '4px'
                        }}>
                            {opp.forecast_count} prev.
                        </span>
                    )}
                </span>
            )
        },
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
        period: {
            label: 'Próximo Período',
            render: (opp) => {
                const forecasts = opp.forecasts || [];
                const nextForecast = forecasts
                    .filter(f => !f.invoiced)
                    .sort((a, b) => new Date(a.period_start) - new Date(b.period_start))[0];
                if (!nextForecast) return '-';
                return `${formatDate(nextForecast.period_start)} - ${formatDate(nextForecast.period_end)}`;
            }
        },
        responsible: { label: 'Responsável', render: (opp) => opp.responsible || '-' },
        creation_date: { label: 'Data Criação', render: (opp) => formatDate(opp.creation_date) },
        notes: { label: 'Observações', render: (opp) => opp.notes || '-' },
    };

    // Field definitions for flat mode
    const flatFieldDefinitions = {
        opportunity_number: { label: 'Número', render: (opp) => opp.opportunity_number },
        title: { label: 'Título', render: (opp) => opp.title || '-' },
        client_name: {
            label: 'Cliente',
            render: (opp) => opp.client?.name || opp.client_name || '-'
        },
        estimated_value: {
            label: 'Valor',
            render: (opp) => formatCurrency(opp.estimated_value)
        },
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
        period: {
            label: 'Período',
            render: (opp) => opp.period_start ? `${formatDate(opp.period_start)} - ${formatDate(opp.period_end)}` : '-'
        },
        responsible: { label: 'Responsável', render: (opp) => opp.responsible || '-' },
        creation_date: { label: 'Data Criação', render: (opp) => formatDate(opp.creation_date) },
        notes: { label: 'Observações', render: (opp) => opp.notes || '-' },
    };

    const fieldDefinitions = groupMode === 'grouped' ? groupedFieldDefinitions : flatFieldDefinitions;

    // Add custom fields
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

    const activeColumns = visibleColumns.filter(col => fieldDefinitions[col]);

    if (loadingPrefs) {
        return (
            <div className={styles.tableContainer} style={{ padding: '40px', textAlign: 'center' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Carregando...</span>
            </div>
        );
    }

    // Render expanded forecasts for grouped mode
    const renderForecastsRow = (opportunity) => {
        const forecasts = opportunity.forecasts || [];
        if (forecasts.length === 0) return null;

        return (
            <tr key={`${opportunity.id}-forecasts`} style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <td colSpan={activeColumns.length + 2} style={{ padding: 0 }}>
                    <div style={{ padding: '12px 16px 12px 48px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                    <th style={{ textAlign: 'left', padding: '4px 8px', fontWeight: 500 }}>Data</th>
                                    <th style={{ textAlign: 'right', padding: '4px 8px', fontWeight: 500 }}>Valor</th>
                                    <th style={{ textAlign: 'center', padding: '4px 8px', fontWeight: 500 }}>Status</th>
                                    <th style={{ textAlign: 'left', padding: '4px 8px', fontWeight: 500 }}>Observação</th>
                                </tr>
                            </thead>
                            <tbody>
                                {forecasts.sort((a, b) => new Date(a.period_start) - new Date(b.period_start)).map((forecast, idx) => (
                                    <tr key={forecast.id || idx} style={{ borderTop: idx > 0 ? '1px solid var(--border-color)' : 'none' }}>
                                        <td style={{ padding: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Calendar size={14} style={{ color: 'var(--text-secondary)' }} />
                                            {formatDate(forecast.period_start)} - {formatDate(forecast.period_end)}
                                        </td>
                                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: 500 }}>
                                            {formatCurrency(forecast.estimated_value)}
                                        </td>
                                        <td style={{ padding: '8px', textAlign: 'center' }}>
                                            {forecast.invoiced ? (
                                                <span style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    color: 'var(--color-success)',
                                                    fontSize: '0.85rem'
                                                }}>
                                                    <CheckCircle size={14} /> Faturado
                                                </span>
                                            ) : (
                                                <span style={{
                                                    color: 'var(--text-secondary)',
                                                    fontSize: '0.85rem'
                                                }}>
                                                    Pendente
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ padding: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                            {forecast.notes || '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </td>
            </tr>
        );
    };

    return (
        <div className={styles.tableContainer}>
            <table className={styles.table}>
                <thead>
                    <tr>
                        {groupMode === 'grouped' && <th style={{ width: '40px' }}></th>}
                        {activeColumns.map(colId => (
                            <th key={colId}>{fieldDefinitions[colId]?.label}</th>
                        ))}
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {opportunities.map(opp => (
                        <React.Fragment key={groupMode === 'flat' ? `${opp.id}-${opp.forecast_id}` : opp.id}>
                            <tr
                                onClick={() => onView(opp)}
                                style={{
                                    cursor: 'pointer',
                                    backgroundColor: expandedRows.has(opp.id) ? 'var(--bg-tertiary)' : undefined
                                }}
                            >
                                {groupMode === 'grouped' && (
                                    <td onClick={(e) => { e.stopPropagation(); toggleExpanded(opp.id); }}>
                                        {(opp.forecasts?.length || 0) > 0 && (
                                            <button
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    padding: '4px',
                                                    color: 'var(--text-secondary)'
                                                }}
                                            >
                                                {expandedRows.has(opp.id) ? (
                                                    <ChevronDown size={16} />
                                                ) : (
                                                    <ChevronRight size={16} />
                                                )}
                                            </button>
                                        )}
                                    </td>
                                )}
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
                            {groupMode === 'grouped' && expandedRows.has(opp.id) && renderForecastsRow(opp)}
                        </React.Fragment>
                    ))}
                    {opportunities.length === 0 && (
                        <tr>
                            <td colSpan={activeColumns.length + (groupMode === 'grouped' ? 2 : 1)} style={{ textAlign: 'center', padding: '20px' }}>
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
