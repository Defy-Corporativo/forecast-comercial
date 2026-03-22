import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Edit2, Trash2, ChevronDown, ChevronRight, Calendar, DollarSign, CheckCircle, Target, Tag, Lightbulb, GripVertical } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useStageContext } from '../../contexts/StageContext';
import { settingsService } from '../../services/settingsService';
import styles from './Opportunities.module.css';

const OpportunityList = ({ opportunities, groupMode = 'grouped', onView, onEdit, onDelete, onReorder }) => {
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
                    'stage', 'forecast_date', 'responsible'
                ]);
            }
        } catch (error) {
            console.error('Error loading preferences:', error);
            setVisibleColumns([
                'opportunity_number', 'title', 'client_name', 'estimated_value',
                'stage', 'forecast_date', 'responsible'
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
        // Handle YYYY-MM-DD strings directly to avoid timezone issues
        if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const [year, month, day] = dateString.split('-');
            return `${day}/${month}/${year}`;
        }
        return new Date(dateString).toLocaleDateString('pt-BR');
    };

    const formatMonthYear = (dateString) => {
        if (!dateString) return '-';
        const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        let monthIndex;
        let year;

        if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const [rawYear, rawMonth] = dateString.split('-');
            year = rawYear;
            monthIndex = Number(rawMonth) - 1;
        } else {
            const date = new Date(dateString);
            monthIndex = date.getMonth();
            year = String(date.getFullYear());
        }

        const month = months[monthIndex] || '-';
        return `${month}/${String(year).slice(-2)}`;
    };

    const renderPeriodWithEndLabel = (startDate, endDate) => {
        if (!startDate && !endDate) return '-';

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span>{formatDate(startDate)} - {formatDate(endDate)}</span>
                {endDate && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        Fim: {formatMonthYear(endDate)}
                    </span>
                )}
            </div>
        );
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

    // Sort opportunities: Real first, then Potencial, then Meta; within each group by display_priority DESC, then total_value DESC
    const sortedOpportunities = useMemo(() => {
        const getTypeOrder = (opp) => {
            if (opp.is_goal) return 2;  // Meta last
            if (opp.is_potential) return 1;  // Potencial second
            return 0;  // Real first
        };

        return [...opportunities].sort((a, b) => {
            const typeOrderA = getTypeOrder(a);
            const typeOrderB = getTypeOrder(b);

            // First sort by type
            if (typeOrderA !== typeOrderB) {
                return typeOrderA - typeOrderB;
            }

            // In grouped mode, sort by display_priority DESC (higher = first)
            if (groupMode === 'grouped') {
                const prioA = Number(a.display_priority || 0);
                const prioB = Number(b.display_priority || 0);
                if (prioA !== prioB) {
                    return prioB - prioA;
                }
            }

            // Then sort by total_value (or estimated_value) descending
            const valueA = Number(a.total_value || a.estimated_value || 0);
            const valueB = Number(b.total_value || b.estimated_value || 0);
            return valueB - valueA;
        });
    }, [opportunities, groupMode]);

    // Handle drag end for reordering
    const handleDragEnd = useCallback((result) => {
        if (!result.destination || result.source.index === result.destination.index) return;
        if (!onReorder) return;

        const reordered = [...sortedOpportunities];
        const [moved] = reordered.splice(result.source.index, 1);
        reordered.splice(result.destination.index, 0, moved);

        // Recalculate priorities: N for first, N-1 for second, ..., 1 for last
        const total = reordered.length;
        const updates = [];
        reordered.forEach((opp, idx) => {
            const newPriority = total - idx;
            if (newPriority !== (opp.display_priority || 0)) {
                updates.push({ id: opp.id, display_priority: newPriority });
            }
        });

        if (updates.length > 0) {
            onReorder(updates);
        }
    }, [sortedOpportunities, onReorder]);

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
                    {opp.is_potential && (
                        <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '2px 6px',
                            background: 'linear-gradient(135deg, #8b5cf620, #8b5cf610)',
                            color: '#7c3aed',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 500
                        }}>
                            <Lightbulb size={12} />
                            Potencial
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
            render: (opp) => (opp.is_goal || opp.is_potential) ? '-' : (opp.client?.name || opp.client_name || '-')
        },
        client_nickname: {
            label: 'Apelido',
            render: (opp) => (opp.is_goal || opp.is_potential) ? '-' : (opp.client?.nickname || opp.client?.name || opp.client_name || '-')
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
                return renderPeriodWithEndLabel(nextForecast.period_start, nextForecast.period_end);
            }
        },
        responsible: { label: 'Responsável', render: (opp) => opp.responsible || '-' },
        billing_probability: {
            label: 'Prob. Faturamento',
            render: (opp) => {
                if (opp.is_goal || opp.is_potential) return '-';
                const probMap = { alta: 'Alta', media: 'Média', baixa: 'Baixa' };
                const colorMap = { alta: '#10b981', media: '#f59e0b', baixa: '#ef4444' };
                const prob = opp.billing_probability || 'baixa';
                return (
                    <span style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '0.8rem',
                        fontWeight: 500,
                        background: `${colorMap[prob]}15`,
                        color: colorMap[prob]
                    }}>
                        {probMap[prob]}
                    </span>
                );
            }
        },
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
        client_nickname: {
            label: 'Apelido',
            render: (opp) => opp.client?.nickname || opp.client?.name || opp.client_name || '-'
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
        forecast_date: {
            label: 'Data de Previsão',
            render: (opp) => formatDate(opp.period_end || opp.period_start)
        },
        period: {
            label: 'Período',
            render: (opp) => opp.period_start ? renderPeriodWithEndLabel(opp.period_start, opp.period_end) : '-'
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
            <tr key={`${opportunity.id}-forecasts`} style={{ backgroundColor: '#f1f5f9' }}> {/* Darker shade (slate-100) */}
                <td colSpan={activeColumns.length + 2} style={{ padding: 0 }}>
                    <div style={{ padding: '12px 16px 12px 48px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                    <th style={{ textAlign: 'left', padding: '4px 8px', fontWeight: 500 }}>Período</th>
                                    <th style={{ textAlign: 'right', padding: '4px 8px', fontWeight: 500 }}>Valor</th>
                                    <th style={{ textAlign: 'center', padding: '4px 8px', fontWeight: 500 }}>Status</th>
                                    <th style={{ textAlign: 'left', padding: '4px 8px', fontWeight: 500 }}>Observação</th>
                                </tr>
                            </thead>
                            <tbody>
                                {forecasts.sort((a, b) => new Date(a.period_end || a.period_start) - new Date(b.period_end || b.period_start)).map((forecast, idx) => (
                                    <tr key={forecast.id || idx} style={{ borderTop: idx > 0 ? '1px solid var(--border-color)' : 'none' }}>
                                        <td style={{ padding: '8px' }}>
                                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                                                <Calendar size={14} style={{ color: 'var(--text-secondary)' }} />
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                    <span>{formatDate(forecast.period_start)} - {formatDate(forecast.period_end)}</span>
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                        Fim: {formatMonthYear(forecast.period_end)}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: 500 }}>
                                            {formatCurrency(forecast.estimated_value)}
                                        </td>
                                        <td style={{ padding: '8px', textAlign: 'center' }}>
                                            {(opportunity.is_goal || opportunity.is_potential) ? (
                                                <span style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>-</span>
                                            ) : forecast.invoiced ? (
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

    const isGroupedMode = groupMode === 'grouped';

    const renderTableBody = (provided) => (
        <tbody ref={provided?.innerRef} {...(provided?.droppableProps || {})}>
            {sortedOpportunities.map((opp, index) => {
                const rowKey = groupMode === 'flat' ? `${opp.id}-${opp.forecast_id}` : opp.id;

                const rowContent = (dragHandleProps, isDragging) => (
                    <React.Fragment key={rowKey}>
                        <tr
                            onClick={() => onView(opp)}
                            className={isDragging ? styles.draggingRow : ''}
                            style={{
                                cursor: 'pointer',
                                backgroundColor: isDragging ? 'var(--color-primary-light, #eff6ff)' : expandedRows.has(opp.id) ? 'var(--bg-tertiary)' : undefined
                            }}
                        >
                            {isGroupedMode && (
                                <td style={{ width: '28px', padding: '4px' }}
                                    {...(dragHandleProps || {})}
                                    onClick={(e) => {
                                        if (!dragHandleProps) {
                                            e.stopPropagation();
                                            toggleExpanded(opp.id);
                                        }
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                        {onReorder && (
                                            <span className={styles.dragHandle} title="Arraste para reordenar">
                                                <GripVertical size={14} />
                                            </span>
                                        )}
                                        {(opp.forecasts?.length || 0) > 0 && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); toggleExpanded(opp.id); }}
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
                                    </div>
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
                        {isGroupedMode && expandedRows.has(opp.id) && renderForecastsRow(opp)}
                    </React.Fragment>
                );

                if (isGroupedMode && onReorder) {
                    return (
                        <Draggable key={opp.id} draggableId={opp.id} index={index}>
                            {(dragProvided, snapshot) => (
                                <React.Fragment>
                                    <tr
                                        ref={dragProvided.innerRef}
                                        {...dragProvided.draggableProps}
                                        onClick={() => onView(opp)}
                                        className={snapshot.isDragging ? styles.draggingRow : ''}
                                        style={{
                                            ...dragProvided.draggableProps.style,
                                            cursor: 'pointer',
                                            backgroundColor: snapshot.isDragging ? 'var(--color-primary-light, #eff6ff)' : expandedRows.has(opp.id) ? 'var(--bg-tertiary)' : undefined
                                        }}
                                    >
                                        <td style={{ width: '28px', padding: '4px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                                <span
                                                    {...dragProvided.dragHandleProps}
                                                    className={styles.dragHandle}
                                                    title="Arraste para reordenar"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <GripVertical size={14} />
                                                </span>
                                                {(opp.forecasts?.length || 0) > 0 && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); toggleExpanded(opp.id); }}
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
                                            </div>
                                        </td>
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
                                    {expandedRows.has(opp.id) && renderForecastsRow(opp)}
                                </React.Fragment>
                            )}
                        </Draggable>
                    );
                }

                return rowContent(null, false);
            })}
            {provided?.placeholder}
            {sortedOpportunities.length === 0 && (
                <tr>
                    <td colSpan={activeColumns.length + (isGroupedMode ? 2 : 1)} style={{ textAlign: 'center', padding: '20px' }}>
                        Nenhuma oportunidade encontrada.
                    </td>
                </tr>
            )}
        </tbody>
    );

    return (
        <div className={styles.tableContainer}>
            {isGroupedMode && onReorder ? (
                <DragDropContext onDragEnd={handleDragEnd}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th style={{ width: '60px' }}></th>
                                {activeColumns.map(colId => (
                                    <th key={colId}>{fieldDefinitions[colId]?.label}</th>
                                ))}
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <Droppable droppableId="opportunities-list">
                            {(provided) => renderTableBody(provided)}
                        </Droppable>
                    </table>
                </DragDropContext>
            ) : (
                <table className={styles.table}>
                    <thead>
                        <tr>
                            {isGroupedMode && <th style={{ width: '40px' }}></th>}
                            {activeColumns.map(colId => (
                                <th key={colId}>{fieldDefinitions[colId]?.label}</th>
                            ))}
                            <th>Ações</th>
                        </tr>
                    </thead>
                    {renderTableBody(null)}
                </table>
            )}
        </div>
    );
};

export default OpportunityList;
