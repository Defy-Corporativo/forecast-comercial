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

    // Sort opportunities based on mode
    const sortedOpportunities = useMemo(() => {
        if (groupMode === 'flat') {
            // Flat mode: always sort by period_end ascending
            return [...opportunities].sort((a, b) => {
                const dateA = a.period_end || a.period_start;
                const dateB = b.period_end || b.period_start;
                if (!dateA) return 1;
                if (!dateB) return -1;
                return new Date(dateA) - new Date(dateB);
            });
        }

        // Grouped mode: Real first, then Potencial, then Meta; by display_priority DESC, then total_value DESC
        const getTypeOrder = (opp) => {
            if (opp.is_goal) return 2;
            if (opp.is_potential) return 1;
            return 0;
        };

        return [...opportunities].sort((a, b) => {
            const typeOrderA = getTypeOrder(a);
            const typeOrderB = getTypeOrder(b);
            if (typeOrderA !== typeOrderB) return typeOrderA - typeOrderB;

            const prioA = Number(a.display_priority || 0);
            const prioB = Number(b.display_priority || 0);
            if (prioA !== prioB) return prioB - prioA;

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
            label: 'Cliente',
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
            label: 'Cliente',
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

    // Render expanded forecasts content (reusable for both card and table modes)
    const renderForecastsContent = (opportunity) => {
        const forecasts = opportunity.forecasts || [];
        if (forecasts.length === 0) return null;

        return (
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
        );
    };

    const isGroupedMode = groupMode === 'grouped';

    // Render a single opportunity card for grouped mode
    const renderGroupedCard = (opp, dragHandleProps, isDragging) => {
        const firstCol = activeColumns[0];
        const restCols = activeColumns.slice(1);

        return (
            <div
                className={`${styles.opportunityGroupCard} ${isDragging ? styles.draggingCard : ''}`}
                onClick={() => onView(opp)}
                style={{ cursor: 'pointer' }}
            >
                <div className={styles.groupCardContent}>
                    <div className={styles.groupCardDragArea}>
                        {onReorder && dragHandleProps && (
                            <span
                                {...dragHandleProps}
                                className={styles.dragHandle}
                                title="Arraste para reordenar"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <GripVertical size={14} />
                            </span>
                        )}
                        {onReorder && !dragHandleProps && (
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
                    <div className={styles.groupCardBody}>
                        {firstCol && (
                            <div className={styles.groupCardPrimary}>
                                {fieldDefinitions[firstCol]?.render(opp)}
                            </div>
                        )}
                        {restCols.length > 0 && (
                            <div className={styles.groupCardRow2}>
                                {restCols.map(colId => (
                                    <span key={colId} className={styles.groupCardFieldValue}>
                                        {fieldDefinitions[colId]?.render(opp)}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className={styles.groupCardActions} onClick={(e) => e.stopPropagation()}>
                        <button className={styles.actionBtn} onClick={() => onEdit(opp)} title="Editar">
                            <Edit2 size={16} />
                        </button>
                        <button className={`${styles.actionBtn} ${styles.danger}`} onClick={() => onDelete(opp.id)} title="Excluir">
                            <Trash2 size={16} />
                        </button>
                    </div>
                </div>
                {expandedRows.has(opp.id) && (
                    <div className={styles.groupCardForecasts}>
                        {renderForecastsContent(opp)}
                    </div>
                )}
            </div>
        );
    };

    // Render grouped card list with drag-and-drop
    const renderGroupedCardList = () => {
        if (onReorder) {
            return (
                <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="opportunities-list">
                        {(provided) => (
                            <div
                                className={styles.groupedList}
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                            >
                                {sortedOpportunities.map((opp, index) => (
                                    <Draggable key={opp.id} draggableId={opp.id} index={index}>
                                        {(dragProvided, snapshot) => (
                                            <div
                                                ref={dragProvided.innerRef}
                                                {...dragProvided.draggableProps}
                                                style={dragProvided.draggableProps.style}
                                            >
                                                {renderGroupedCard(opp, dragProvided.dragHandleProps, snapshot.isDragging)}
                                            </div>
                                        )}
                                    </Draggable>
                                ))}
                                {provided.placeholder}
                                {sortedOpportunities.length === 0 && (
                                    <div className={styles.groupedEmptyState}>
                                        Nenhuma oportunidade encontrada.
                                    </div>
                                )}
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>
            );
        }

        return (
            <div className={styles.groupedList}>
                {sortedOpportunities.map(opp => (
                    <React.Fragment key={opp.id}>
                        {renderGroupedCard(opp, null, false)}
                    </React.Fragment>
                ))}
                {sortedOpportunities.length === 0 && (
                    <div className={styles.groupedEmptyState}>
                        Nenhuma oportunidade encontrada.
                    </div>
                )}
            </div>
        );
    };

    // Get month/year key from a date string
    const getMonthYearKey = (dateString) => {
        if (!dateString) return null;
        const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const [year, month] = dateString.split('-');
            return { key: `${year}-${month}`, label: `${months[Number(month) - 1]} ${year}` };
        }
        const date = new Date(dateString);
        const m = date.getMonth();
        const y = date.getFullYear();
        return { key: `${y}-${String(m + 1).padStart(2, '0')}`, label: `${months[m]} ${y}` };
    };

    // Render flat mode table body with month/year separators
    const renderFlatTableBody = () => {
        let lastMonthKey = null;
        const rows = [];

        sortedOpportunities.forEach((opp) => {
            const rowKey = `${opp.id}-${opp.forecast_id}`;
            const dateRef = opp.period_end || opp.period_start;
            const monthYear = getMonthYearKey(dateRef);
            const currentKey = monthYear?.key || 'sem-data';

            if (currentKey !== lastMonthKey) {
                lastMonthKey = currentKey;
                rows.push(
                    <tr key={`separator-${currentKey}`} className={styles.monthSeparator}>
                        <td colSpan={activeColumns.length + 1}>
                            <div className={styles.monthSeparatorLabel}>
                                <Calendar size={14} />
                                {monthYear?.label || 'Sem data'}
                            </div>
                        </td>
                    </tr>
                );
            }

            rows.push(
                <tr
                    key={rowKey}
                    onClick={() => onView(opp)}
                    style={{ cursor: 'pointer' }}
                >
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
            );
        });

        if (sortedOpportunities.length === 0) {
            rows.push(
                <tr key="empty">
                    <td colSpan={activeColumns.length + 1} style={{ textAlign: 'center', padding: '20px' }}>
                        Nenhuma oportunidade encontrada.
                    </td>
                </tr>
            );
        }

        return <tbody>{rows}</tbody>;
    };

    if (isGroupedMode) {
        return renderGroupedCardList();
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
                {renderFlatTableBody()}
            </table>
        </div>
    );
};

export default OpportunityList;
