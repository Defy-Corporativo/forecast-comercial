import React from 'react';
import { Edit2, Trash2, Calendar, User, DollarSign, Layers } from 'lucide-react';
import { useStageContext } from '../../contexts/StageContext';
import styles from './Opportunities.module.css';

const OpportunityCards = ({ opportunities, groupMode = 'grouped', onView, onEdit, onDelete }) => {
    const { stages } = useStageContext();

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const [year, month, day] = dateString.split('-');
            return `${day}/${month}/${year}`;
        }
        return new Date(dateString).toLocaleDateString('pt-BR');
    };

    const formatMonthYear = (dateString) => {
        if (!dateString) return '-';
        const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

        if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const [year, month] = dateString.split('-');
            return `${months[Number(month) - 1]}/${year.slice(-2)}`;
        }

        const date = new Date(dateString);
        return `${months[date.getMonth()]}/${String(date.getFullYear()).slice(-2)}`;
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

    const getStageColor = (stageName) => {
        const stage = stages.find(s => s.name === stageName);
        return stage?.color || '#64748B';
    };

    const getStageDescription = (stageName) => {
        const stage = stages.find(s => s.name === stageName);
        return stage?.description || '';
    };

    // Get next forecast period for grouped mode
    const getNextForecastPeriod = (opp) => {
        const forecasts = opp.forecasts || [];
        const nextForecast = forecasts
            .filter(f => !f.invoiced)
            .sort((a, b) => new Date(a.period_start) - new Date(b.period_start))[0];
        return nextForecast ? { start: nextForecast.period_start, end: nextForecast.period_end } : null;
    };

    return (
        <div className={styles.cardsContainer}>
            {opportunities.map(opp => (
                <div
                    key={groupMode === 'flat' ? `${opp.id}-${opp.forecast_id}` : opp.id}
                    className={styles.opportunityCard}
                    onClick={() => onView(opp)}
                >
                    <div className={styles.cardHeaderSection}>
                        <div className={styles.cardNumber}>{opp.opportunity_number}</div>
                        <span
                            className={styles.cardStageBadge}
                            style={
                                opp.is_potential
                                    ? { backgroundColor: '#94a3b8', color: '#fff' }
                                    : opp.is_goal
                                        ? { backgroundColor: '#f59e0b', color: '#fff' }
                                        : { backgroundColor: getStageColor(opp.stage) + '20', color: getStageColor(opp.stage) }
                            }
                            title={getStageDescription(opp.stage)}
                        >
                            {opp.is_potential ? 'Potencial' : opp.is_goal ? 'Meta' : opp.stage}
                        </span>
                    </div>

                    <div className={styles.cardTitle}>{opp.title || opp.client?.name || opp.client_name}</div>
                    <div className={styles.cardClient}>{opp.client?.nickname || opp.client?.name || opp.client_name}</div>

                    <div className={styles.cardValue}>
                        <DollarSign size={16} />
                        {groupMode === 'grouped'
                            ? formatCurrency(opp.total_value || opp.estimated_value)
                            : formatCurrency(opp.estimated_value)
                        }
                        {groupMode === 'grouped' && (opp.forecast_count || 0) > 1 && (
                            <span style={{
                                fontSize: '0.75rem',
                                color: 'var(--text-secondary)',
                                background: 'var(--bg-secondary)',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                marginLeft: '8px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}>
                                <Layers size={12} />
                                {opp.forecast_count} prev.
                            </span>
                        )}
                    </div>

                    <div className={styles.cardDetails}>
                        <div className={styles.cardDetailItem}>
                            <Calendar size={14} />
                            <div>
                                {groupMode === 'grouped'
                                    ? (getNextForecastPeriod(opp)
                                        ? renderPeriodWithEndLabel(getNextForecastPeriod(opp).start, getNextForecastPeriod(opp).end)
                                        : '-')
                                    : (opp.period_start ? renderPeriodWithEndLabel(opp.period_start, opp.period_end) : '-')
                                }
                            </div>
                        </div>
                        {opp.responsible && (
                            <div className={styles.cardDetailItem}>
                                <User size={14} />
                                <span>{opp.responsible}</span>
                            </div>
                        )}
                    </div>

                    {/* Show forecast list for grouped mode */}
                    {groupMode === 'grouped' && opp.forecasts && opp.forecasts.length > 1 && (
                        <div style={{
                            marginTop: '12px',
                            paddingTop: '12px',
                            borderTop: '1px solid var(--border-color)',
                            fontSize: '0.85rem'
                        }}>
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px',
                                maxHeight: '120px',
                                overflowY: 'auto'
                            }}>
                                {opp.forecasts.slice(0, 4).map((forecast, idx) => (
                                    <div
                                        key={forecast.id || idx}
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            padding: '4px 0',
                                            color: forecast.invoiced ? 'var(--text-secondary)' : 'var(--text-primary)',
                                            textDecoration: forecast.invoiced ? 'line-through' : 'none'
                                        }}
                                    >
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <span>{formatDate(forecast.period_start)} - {formatDate(forecast.period_end)}</span>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                Fim: {formatMonthYear(forecast.period_end)}
                                            </span>
                                        </div>
                                        <span style={{ fontWeight: 500 }}>{formatCurrency(forecast.estimated_value)}</span>
                                    </div>
                                ))}
                                {opp.forecasts.length > 4 && (
                                    <div style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>
                                        +{opp.forecasts.length - 4} mais...
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className={styles.cardActions} onClick={(e) => e.stopPropagation()}>
                        <button
                            className={styles.cardActionBtn}
                            onClick={() => onEdit(opp)}
                            title="Editar"
                        >
                            <Edit2 size={16} />
                        </button>
                        <button
                            className={`${styles.cardActionBtn} ${styles.danger}`}
                            onClick={() => onDelete(opp.id)}
                            title="Excluir"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                </div>
            ))}
            {opportunities.length === 0 && (
                <div className={styles.emptyCards}>
                    <p>Nenhuma oportunidade encontrada.</p>
                </div>
            )}
        </div>
    );
};

export default OpportunityCards;
