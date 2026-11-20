import React, { useEffect, useState } from 'react';
import { MessageSquare, CheckSquare, DollarSign, CheckCircle, Clock, ArrowUpRight } from 'lucide-react';
import { opportunityNotesService } from '../../services/opportunityNotesService';
import { opportunityActionsService } from '../../services/opportunityActionsService';
import styles from './Opportunities.module.css';

// Ordem fixa das abas: Notas (aberta por padrão), Ações, Previsões
const TABS = [
    { id: 'notes', label: 'Notas de atualização', icon: MessageSquare },
    { id: 'actions', label: 'Ações para evolução', icon: CheckSquare },
    { id: 'forecasts', label: 'Previsões financeiras', icon: DollarSign }
];

const formatDateTime = (value) => {
    if (!value) return '';
    const date = new Date(value);
    return date.toLocaleDateString('pt-BR') + ' às ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

const formatDay = (value) => value ? new Date(value + 'T00:00:00').toLocaleDateString('pt-BR') : '';

const OpportunityExpandedTabs = ({ opportunity, renderForecasts, onOpen }) => {
    const [activeTab, setActiveTab] = useState('notes');
    const [notes, setNotes] = useState(null);
    const [actions, setActions] = useState(null);
    const [error, setError] = useState(false);

    const showActions = !opportunity.is_goal;
    const tabs = TABS.filter(tab => tab.id !== 'actions' || showActions);

    useEffect(() => {
        let cancelled = false;
        Promise.all([
            opportunityNotesService.getNotes(opportunity.id),
            showActions ? opportunityActionsService.getActions(opportunity.id) : Promise.resolve([])
        ])
            .then(([notesData, actionsData]) => {
                if (cancelled) return;
                setNotes(notesData);
                setActions(actionsData);
            })
            .catch(err => {
                console.error('Erro ao carregar notas/ações:', err);
                if (!cancelled) setError(true);
            });
        return () => { cancelled = true; };
    }, [opportunity.id, showActions]);

    const forecastCount = opportunity.forecasts?.length || 0;
    const pendingCount = (actions || []).filter(a => a.status === 'pendente').length;
    const counts = {
        notes: notes ? notes.length : '…',
        actions: actions ? `${pendingCount}/${actions.length}` : '…',
        forecasts: forecastCount
    };

    const sortedActions = [...(actions || [])].sort((a, b) => {
        if (a.status !== b.status) return a.status === 'pendente' ? -1 : 1;
        if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
        if (a.due_date) return -1;
        if (b.due_date) return 1;
        return new Date(b.created_at) - new Date(a.created_at);
    });

    const renderEmpty = (text) => (
        <div className={styles.expandedEmpty}>
            <span>{text}</span>
            <button type="button" onClick={onOpen}>
                Abrir oportunidade <ArrowUpRight size={14} />
            </button>
        </div>
    );

    const renderBody = () => {
        if (error && activeTab !== 'forecasts') {
            return <div className={styles.expandedEmpty}>Não foi possível carregar. Feche e expanda novamente.</div>;
        }

        if (activeTab === 'notes') {
            if (!notes) return <div className={styles.expandedLoading}>Carregando notas…</div>;
            if (notes.length === 0) return renderEmpty('Nenhuma nota de atualização ainda.');
            return (
                <ul className={styles.expandedList}>
                    {notes.map(note => (
                        <li key={note.id} className={styles.expandedNote}>
                            <div className={styles.expandedMeta}>
                                <strong>{note.created_by || 'Sem autor'}</strong>
                                <span>{formatDateTime(note.created_at)}</span>
                            </div>
                            <p>{note.content}</p>
                        </li>
                    ))}
                </ul>
            );
        }

        if (activeTab === 'actions') {
            if (!actions) return <div className={styles.expandedLoading}>Carregando ações…</div>;
            if (actions.length === 0) return renderEmpty('Nenhuma ação para evolução cadastrada.');
            return (
                <ul className={styles.expandedList}>
                    {sortedActions.map(action => {
                        const done = action.status === 'concluida';
                        const overdue = !done && action.due_date && new Date(action.due_date + 'T23:59:59') < new Date();
                        return (
                            <li key={action.id} className={`${styles.expandedAction} ${done ? styles.expandedActionDone : ''}`}>
                                <span className={`${styles.actionStatus} ${done ? styles.actionStatusDone : ''}`}>
                                    {done ? <CheckCircle size={13} /> : <Clock size={13} />}
                                    {done ? 'Concluída' : 'Pendente'}
                                </span>
                                <span className={styles.expandedActionText}>{action.description}</span>
                                <span className={styles.expandedActionMeta}>
                                    {action.responsible}
                                    {action.due_date && (
                                        <span className={overdue ? styles.overdue : undefined}>
                                            {overdue ? 'Venceu em ' : 'Prazo '}{formatDay(action.due_date)}
                                        </span>
                                    )}
                                </span>
                            </li>
                        );
                    })}
                </ul>
            );
        }

        if (forecastCount === 0) return renderEmpty('Nenhuma previsão financeira cadastrada.');
        return renderForecasts(opportunity);
    };

    return (
        <div className={styles.expandedTabs} onClick={(e) => e.stopPropagation()}>
            <div className={styles.expandedTabList} role="tablist" aria-label="Detalhes da oportunidade">
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    const selected = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            role="tab"
                            aria-selected={selected}
                            className={`${styles.expandedTab} ${selected ? styles.expandedTabActive : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            <Icon size={14} />
                            {tab.label}
                            <span className={styles.expandedTabCount}>{counts[tab.id]}</span>
                        </button>
                    );
                })}
            </div>
            <div className={styles.expandedPanel} role="tabpanel">
                {renderBody()}
            </div>
        </div>
    );
};

export default OpportunityExpandedTabs;
