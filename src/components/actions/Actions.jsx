import React, { useState, useEffect } from 'react';
import { CheckSquare, Search, Filter, User, Briefcase, Clock, CheckCircle, AlertCircle, ExternalLink, ChevronDown, ChevronRight, X, Trash } from 'lucide-react';
import { opportunityActionsService } from '../../services/opportunityActionsService';
import { responsiblesService } from '../../services/responsiblesService';
import { useAuth } from '../../contexts/AuthContext';
import styles from './Actions.module.css';

const Actions = () => {
    const { user } = useAuth();
    const [actions, setActions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [responsibles, setResponsibles] = useState([]);

    // View mode: 'responsible' or 'opportunity'
    const [viewMode, setViewMode] = useState('opportunity');

    // Filters
    const [statusFilter, setStatusFilter] = useState(''); // '', 'pendente', 'concluida'
    const [responsibleFilter, setResponsibleFilter] = useState('');
    const [searchText, setSearchText] = useState('');

    // Expanded groups
    const [expandedGroups, setExpandedGroups] = useState({});

    // Modals
    const [completeModal, setCompleteModal] = useState({
        isOpen: false,
        actionId: null,
        opportunityId: null,
        noteText: ''
    });

    const [deleteActionModal, setDeleteActionModal] = useState({
        isOpen: false,
        actionId: null,
        opportunityId: null,
        noteText: ''
    });

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        loadActions();
    }, [statusFilter, responsibleFilter, searchText]);

    const loadData = async () => {
        try {
            const resp = await responsiblesService.getResponsibles();
            setResponsibles(resp);
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
        }
        await loadActions();
    };

    const loadActions = async () => {
        try {
            setLoading(true);
            const filters = {};
            if (statusFilter) filters.status = statusFilter;
            if (responsibleFilter) filters.responsible = responsibleFilter;
            if (searchText) filters.searchText = searchText;

            const data = await opportunityActionsService.getAllActions(filters);
            setActions(data);

            // Auto-expand first group
            if (data.length > 0 && Object.keys(expandedGroups).length === 0) {
                const groups = groupActions(data);
                const firstGroupKey = Object.keys(groups)[0];
                if (firstGroupKey) {
                    setExpandedGroups({ [firstGroupKey]: true });
                }
            }
        } catch (error) {
            console.error('Erro ao carregar ações:', error);
        } finally {
            setLoading(false);
        }
    };

    const groupActions = (actionsData) => {
        const groups = {};

        actionsData.forEach(action => {
            let key;
            if (viewMode === 'responsible') {
                key = action.responsible;
            } else {
                key = action.opportunity?.opportunity_number || 'Sem Oportunidade';
            }

            if (!groups[key]) {
                groups[key] = {
                    items: [],
                    label: key,
                    opportunity: viewMode === 'opportunity' ? action.opportunity : null
                };
            }
            groups[key].items.push(action);
        });

        return groups;
    };

    const calculateAge = (createdAt) => {
        return opportunityActionsService.calculateAge(createdAt);
    };

    const toggleGroup = (key) => {
        setExpandedGroups(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const clearFilters = () => {
        setStatusFilter('');
        setResponsibleFilter('');
        setSearchText('');
    };

    const handleOpenCompleteModal = (action) => {
        setCompleteModal({
            isOpen: true,
            actionId: action.id,
            opportunityId: action.opportunity_id,
            noteText: ''
        });
    };

    const handleCompleteAction = async () => {
        try {
            await opportunityActionsService.completeAction(
                completeModal.actionId,
                completeModal.opportunityId,
                completeModal.noteText,
                user?.name || user?.email || 'Usuário'
            );
            setCompleteModal({ isOpen: false, actionId: null, opportunityId: null, noteText: '' });
            await loadActions();
        } catch (error) {
            console.error('Erro ao concluir ação:', error);
            alert('Erro ao concluir ação. Tente novamente.');
        }
    };

    const handleOpenDeleteModal = (action) => {
        setDeleteActionModal({
            isOpen: true,
            actionId: action.id,
            opportunityId: action.opportunity_id,
            noteText: ''
        });
    };

    const handleDeleteAction = async () => {
        try {
            await opportunityActionsService.deleteAction(
                deleteActionModal.actionId,
                deleteActionModal.opportunityId,
                deleteActionModal.noteText,
                user?.name || user?.email || 'Usuário'
            );
            setDeleteActionModal({ isOpen: false, actionId: null, opportunityId: null, noteText: '' });
            await loadActions();
        } catch (error) {
            console.error('Erro ao excluir ação:', error);
            alert('Erro ao excluir ação. Tente novamente.');
        }
    };

    const hasFilters = statusFilter || responsibleFilter || searchText;
    const groups = groupActions(actions);
    const groupKeys = Object.keys(groups).sort();

    // Count stats
    const pendingCount = actions.filter(a => a.status === 'pendente').length;
    const completedCount = actions.filter(a => a.status === 'concluida').length;
    const overdueCount = actions.filter(a => a.status === 'pendente' && calculateAge(a.created_at) > 7).length;

    return (
        <div className="container">
            <div className="page-header">
                <h1 className="page-title">
                    <CheckSquare size={28} style={{ marginRight: '12px', verticalAlign: 'middle' }} />
                    Ações
                </h1>
            </div>

            {/* Stats Cards */}
            <div className={styles.statsRow}>
                <div className={styles.statCard}>
                    <div className={styles.statIcon} style={{ background: 'var(--color-warning-light)', color: 'var(--color-warning)' }}>
                        <Clock size={24} />
                    </div>
                    <div className={styles.statInfo}>
                        <span className={styles.statValue}>{pendingCount}</span>
                        <span className={styles.statLabel}>Pendentes</span>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statIcon} style={{ background: 'var(--color-success-light)', color: 'var(--color-success)' }}>
                        <CheckCircle size={24} />
                    </div>
                    <div className={styles.statInfo}>
                        <span className={styles.statValue}>{completedCount}</span>
                        <span className={styles.statLabel}>Concluídas</span>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statIcon} style={{ background: 'var(--color-danger-light)', color: 'var(--color-danger)' }}>
                        <AlertCircle size={24} />
                    </div>
                    <div className={styles.statInfo}>
                        <span className={styles.statValue}>{overdueCount}</span>
                        <span className={styles.statLabel}>Atrasadas (+7 dias)</span>
                    </div>
                </div>
            </div>

            {/* Filters Bar */}
            <div className={styles.filtersBar}>
                <div className={styles.filterGroup}>
                    <label className={styles.filterLabel}>Agrupar por:</label>
                    <div className={styles.viewToggle}>
                        <button
                            className={`${styles.toggleBtn} ${viewMode === 'responsible' ? styles.active : ''}`}
                            onClick={() => setViewMode('responsible')}
                        >
                            <User size={16} />
                            Responsável
                        </button>
                        <button
                            className={`${styles.toggleBtn} ${viewMode === 'opportunity' ? styles.active : ''}`}
                            onClick={() => setViewMode('opportunity')}
                        >
                            <Briefcase size={16} />
                            Oportunidade
                        </button>
                    </div>
                </div>

                <div className={styles.filterGroup}>
                    <label className={styles.filterLabel}>Status:</label>
                    <select
                        className="input"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        style={{ width: '150px' }}
                    >
                        <option value="">Todos</option>
                        <option value="pendente">Pendentes</option>
                        <option value="concluida">Concluídas</option>
                    </select>
                </div>

                <div className={styles.filterGroup}>
                    <label className={styles.filterLabel}>Responsável:</label>
                    <select
                        className="input"
                        value={responsibleFilter}
                        onChange={(e) => setResponsibleFilter(e.target.value)}
                        style={{ width: '180px' }}
                    >
                        <option value="">Todos</option>
                        {responsibles.map(r => (
                            <option key={r.id} value={r.name}>{r.name}</option>
                        ))}
                    </select>
                </div>

                <div className={styles.filterGroup} style={{ flex: 1 }}>
                    <label className={styles.filterLabel}>Buscar:</label>
                    <div style={{ position: 'relative' }}>
                        <Search size={16} style={{
                            position: 'absolute',
                            left: '10px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: 'var(--text-tertiary)'
                        }} />
                        <input
                            type="text"
                            className="input"
                            placeholder="Buscar nas descrições..."
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            style={{ paddingLeft: '36px', width: '100%' }}
                        />
                    </div>
                </div>

                {hasFilters && (
                    <button
                        className="btn btn-secondary"
                        onClick={clearFilters}
                        style={{ alignSelf: 'flex-end' }}
                    >
                        <X size={16} />
                        Limpar
                    </button>
                )}
            </div>

            {/* Content */}
            <div className={styles.content}>
                {loading ? (
                    <div className={styles.loading}>Carregando ações...</div>
                ) : actions.length === 0 ? (
                    <div className={styles.emptyState}>
                        <CheckSquare size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
                        <p>Nenhuma ação encontrada</p>
                        {hasFilters && (
                            <button className="btn btn-secondary" onClick={clearFilters}>
                                Limpar filtros
                            </button>
                        )}
                    </div>
                ) : (
                    <div className={styles.groupsList}>
                        {groupKeys.map(key => {
                            const group = groups[key];
                            const isExpanded = expandedGroups[key];
                            const pendingInGroup = group.items.filter(a => a.status === 'pendente').length;
                            const completedInGroup = group.items.filter(a => a.status === 'concluida').length;

                            return (
                                <div key={key} className={styles.group}>
                                    <div
                                        className={styles.groupHeader}
                                        onClick={() => toggleGroup(key)}
                                    >
                                        <div className={styles.groupHeaderLeft}>
                                            {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                                            <span className={styles.groupIcon}>
                                                {viewMode === 'responsible' ? <User size={18} /> : <Briefcase size={18} />}
                                            </span>
                                            <span className={styles.groupTitle}>{group.label}</span>
                                            {viewMode === 'opportunity' && group.opportunity && (
                                                <span className={styles.groupSubtitle}>
                                                    {group.opportunity.title || group.opportunity.client_name}
                                                </span>
                                            )}
                                        </div>
                                        <div className={styles.groupHeaderRight}>
                                            <span className={styles.badgeWarning}>{pendingInGroup} pendentes</span>
                                            <span className={styles.badgeSuccess}>{completedInGroup} concluídas</span>
                                        </div>
                                    </div>

                                    {isExpanded && (
                                        <div className={styles.groupContent}>
                                            {group.items.map(action => {
                                                const age = calculateAge(action.created_at);
                                                const isOverdue = action.status === 'pendente' && age > 7;

                                                return (
                                                    <div
                                                        key={action.id}
                                                        className={`${styles.actionItem} ${action.status === 'concluida' ? styles.completed : ''}`}
                                                    >
                                                        <div className={styles.actionRow}>
                                                            <div className={styles.actionBadges}>
                                                                <span className={action.status === 'concluida' ? styles.statusCompleted : styles.statusPending}>
                                                                    {action.status === 'concluida' ? <CheckCircle size={14} /> : <Clock size={14} />}
                                                                    {action.status === 'concluida' ? 'Concluída' : 'Pendente'}
                                                                </span>
                                                                <span className={isOverdue ? styles.ageOverdue : styles.age}>
                                                                    {isOverdue && <AlertCircle size={14} />}
                                                                    {age} {age === 1 ? 'dia' : 'dias'}
                                                                </span>
                                                                {viewMode === 'responsible' && action.opportunity && (
                                                                    <span className={styles.opportunityBadge}>
                                                                        <Briefcase size={14} />
                                                                        {action.opportunity.opportunity_number}
                                                                    </span>
                                                                )}
                                                                {viewMode === 'opportunity' && (
                                                                    <span className={styles.responsibleBadge}>
                                                                        <User size={14} />
                                                                        {action.responsible}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                                {action.status === 'pendente' && (
                                                                    <button
                                                                        onClick={() => handleOpenCompleteModal(action)}
                                                                        className="btn btn-secondary"
                                                                        style={{
                                                                            fontSize: '11px',
                                                                            padding: '4px 10px',
                                                                            gap: '4px'
                                                                        }}
                                                                        title="Concluir ação"
                                                                    >
                                                                        <CheckCircle size={12} />
                                                                        Concluir
                                                                    </button>
                                                                )}
                                                                <button
                                                                    onClick={() => handleOpenDeleteModal(action)}
                                                                    className="btn btn-secondary"
                                                                    style={{
                                                                        fontSize: '11px',
                                                                        padding: '4px 10px',
                                                                        gap: '4px'
                                                                    }}
                                                                    title="Excluir ação"
                                                                >
                                                                    <Trash size={12} />
                                                                    Excluir
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <p className={styles.actionDescription}>
                                                            {action.description}
                                                        </p>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modal de Conclusão de Ação */}
            {completeModal.isOpen && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0, 0, 0, 0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1100
                    }}
                    onClick={() => setCompleteModal({ isOpen: false, actionId: null, opportunityId: null, noteText: '' })}
                >
                    <div
                        style={{
                            background: 'white',
                            borderRadius: '12px',
                            padding: '24px',
                            maxWidth: '500px',
                            width: '90%',
                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <CheckCircle size={24} style={{ color: 'var(--color-success)' }} />
                            Concluir Ação
                        </h3>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '14px' }}>
                            Uma nota será gerada automaticamente ao concluir esta ação.
                            Você pode adicionar informações adicionais abaixo (opcional):
                        </p>
                        <textarea
                            className="input"
                            placeholder="Adicione observações sobre a conclusão da ação (opcional)..."
                            value={completeModal.noteText}
                            onChange={(e) => setCompleteModal({ ...completeModal, noteText: e.target.value })}
                            rows={4}
                            style={{ resize: 'vertical', minHeight: '100px', marginBottom: '16px' }}
                        />
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button
                                className="btn btn-secondary"
                                onClick={() => setCompleteModal({ isOpen: false, actionId: null, opportunityId: null, noteText: '' })}
                            >
                                Cancelar
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleCompleteAction}
                                style={{ background: 'var(--color-success)', borderColor: 'var(--color-success)' }}
                            >
                                <CheckCircle size={16} />
                                Concluir Ação
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Exclusão de Ação */}
            {deleteActionModal.isOpen && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0, 0, 0, 0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1100
                    }}
                    onClick={() => setDeleteActionModal({ isOpen: false, actionId: null, opportunityId: null, noteText: '' })}
                >
                    <div
                        style={{
                            background: 'white',
                            borderRadius: '12px',
                            padding: '24px',
                            maxWidth: '500px',
                            width: '90%',
                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Trash size={24} style={{ color: 'var(--color-danger)' }} />
                            Excluir Ação
                        </h3>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '14px' }}>
                            Uma nota será gerada automaticamente ao excluir esta ação.
                            Você pode adicionar informações adicionais abaixo (opcional):
                        </p>
                        <textarea
                            className="input"
                            placeholder="Adicione o motivo da exclusão (opcional)..."
                            value={deleteActionModal.noteText}
                            onChange={(e) => setDeleteActionModal({ ...deleteActionModal, noteText: e.target.value })}
                            rows={4}
                            style={{ resize: 'vertical', minHeight: '100px', marginBottom: '16px' }}
                        />
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button
                                className="btn btn-secondary"
                                onClick={() => setDeleteActionModal({ isOpen: false, actionId: null, opportunityId: null, noteText: '' })}
                            >
                                Cancelar
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleDeleteAction}
                                style={{ background: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
                            >
                                <Trash size={16} />
                                Excluir Ação
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Actions;
