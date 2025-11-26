import React from 'react';
import { Edit2, Trash2, Calendar, User, DollarSign } from 'lucide-react';
import { useStageContext } from '../../contexts/StageContext';
import styles from './Opportunities.module.css';

const OpportunityCards = ({ opportunities, onView, onEdit, onDelete }) => {
    const { stages } = useStageContext();

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('pt-BR');
    };

    const getStageColor = (stage) => {
        const colors = {
            'Pipeline': '#64748B',
            'Strong Upside': '#2563EB',
            'Committed': '#F59E0B',
            'Deal': '#10B981',
            'Lost': '#EF4444'
        };
        return colors[stage] || '#64748B';
    };

    // Get stage description for tooltip
    const getStageDescription = (stageName) => {
        const stage = stages.find(s => s.name === stageName);
        return stage?.description || '';
    };

    return (
        <div className={styles.cardsContainer}>
            {opportunities.map(opp => (
                <div
                    key={opp.id}
                    className={styles.opportunityCard}
                    onClick={() => onView(opp)}
                >
                    <div className={styles.cardHeaderSection}>
                        <div className={styles.cardNumber}>{opp.opportunity_number}</div>
                        <span
                            className={styles.cardStageBadge}
                            style={{ backgroundColor: getStageColor(opp.stage) + '20', color: getStageColor(opp.stage) }}
                            title={getStageDescription(opp.stage)}
                        >
                            {opp.stage}
                        </span>
                    </div>

                    <div className={styles.cardTitle}>{opp.client?.name || opp.client_name}</div>

                    <div className={styles.cardValue}>
                        <DollarSign size={16} />
                        {formatCurrency(opp.estimated_value)}
                    </div>

                    <div className={styles.cardDetails}>
                        <div className={styles.cardDetailItem}>
                            <Calendar size={14} />
                            <span>{formatDate(opp.forecast_date)}</span>
                        </div>
                        {opp.responsible && (
                            <div className={styles.cardDetailItem}>
                                <User size={14} />
                                <span>{opp.responsible}</span>
                            </div>
                        )}
                    </div>

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

