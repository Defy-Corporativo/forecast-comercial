import React, { useState, useEffect } from 'react';
import { CheckSquare, Search, Filter, User, Briefcase, Clock, CheckCircle, AlertCircle, ExternalLink, ChevronDown, ChevronRight, X } from 'lucide-react';
import { opportunityActionsService } from '../../services/opportunityActionsService';
import { responsiblesService } from '../../services/responsiblesService';
import styles from './Actions.module.css';

const Actions = () => {
    const [actions, setActions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [responsibles, setResponsibles] = useState([]);

    // View mode: 'responsible' or 'opportunity'
    const [viewMode, setViewMode] = useState('responsible');

    // Filters
    const [statusFilter, setStatusFilter] = useState(''); // '', 'pendente', 'concluida'
    const [responsibleFilter, setResponsibleFilter] = useState('');
    const [searchText, setSearchText] = useState('');

    // Expanded groups
    const [expandedGroups, setExpandedGroups] = useState({});

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
        </div>
    );
};

export default Actions;
