import React, { useState, useEffect } from 'react';
import { Filter, X, Target, Lightbulb, Tag, TrendingUp, Check, Archive, Building2 } from 'lucide-react';
import styles from './Opportunities.module.css';

const BILLING_PROBABILITIES = [
    { value: 'alta', label: 'Alta', color: '#10b981' },
    { value: 'media', label: 'Média', color: '#d97706' },
    { value: 'baixa', label: 'Baixa', color: '#ef4444' }
];

const STAGES = ['Pipeline', 'Strong Upside', 'Committed', 'Deal', 'Lost', 'Meta', 'Potencial'];

const WITHOUT_COMPANY = '__without_company__';

const EMPTY_FILTERS = {
    stages: [], // Empty array = all stages (no filter)
    tags: [], // Empty array = all tags (no filter)
    billingProbabilities: [], // Empty array = all probabilities (no filter)
    minValue: '',
    maxValue: '',
    responsible: '',
    company: '',
    dateFrom: '',
    dateTo: ''
};

const formatMoney = (value) => Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const formatDate = (value) => value ? value.split('-').reverse().join('/') : '';

// Chip de seleção (botão com aria-pressed, acessível por teclado)
const FilterChip = ({ selected, onClick, color, children }) => (
    <button
        type="button"
        className={`${styles.filterChip} ${selected ? styles.filterChipSelected : ''}`}
        style={color ? { '--chip-color': color } : undefined}
        aria-pressed={selected}
        onClick={onClick}
    >
        {selected && <Check size={12} strokeWidth={3} aria-hidden="true" />}
        {children}
    </button>
);

const OpportunityFilters = ({
    opportunities,
    onFilterChange,
    metaState,
    potencialState,
    onMetaStateChange,
    onPotencialStateChange,
    resultCount,
    showArchived = false,
    archivedCount = 0,
    onShowArchivedChange
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState(EMPTY_FILTERS);

    const [availableTags, setAvailableTags] = useState([]);

    useEffect(() => {
        if (opportunities) {
            // Use tagList which is pre-processed by the service (array of {id, name} objects)
            // Fallback to tags if tagList is not available
            const extractTagNames = (opp) => {
                if (opp.tagList && Array.isArray(opp.tagList)) {
                    return opp.tagList.map(t => t?.name || t).filter(Boolean);
                }
                if (opp.tags && Array.isArray(opp.tags)) {
                    return opp.tags.map(t => t?.tag?.name || t?.name || '').filter(Boolean);
                }
                return [];
            };
            const unique = [...new Set(opportunities.flatMap(extractTagNames))].sort();
            setAvailableTags(unique);
        }
    }, [opportunities]);

    useEffect(() => {
        // Sempre reaplicar filtros quando as oportunidades mudarem
        if (opportunities) {
            applyFilters({ ...filters, search: searchTerm });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [opportunities]);

    const availableCompanies = [...new Set((opportunities || [])
        .map(opp => opp.custom_data?.company?.trim())
        .filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));

    const availableResponsibles = [...new Set((opportunities || [])
        .map(opp => opp.responsible?.trim())
        .filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));

    const handleSearchChange = (value) => {
        setSearchTerm(value);
        applyFilters({ ...filters, search: value });
    };

    const handleFilterChange = (key, value) => {
        const newFilters = { ...filters, [key]: value };
        setFilters(newFilters);
        applyFilters({ ...newFilters, search: searchTerm });
    };

    const applyFilters = (filterData) => {
        let filtered = opportunities ? [...opportunities] : [];

        // Busca geral
        if (filterData.search) {
            const search = filterData.search.toLowerCase();
            filtered = filtered.filter(opp =>
                opp.client?.name?.toLowerCase().includes(search) ||
                opp.client_name?.toLowerCase().includes(search) ||
                String(opp.opportunity_number ?? '').toLowerCase().includes(search) ||
                opp.responsible?.toLowerCase().includes(search) ||
                opp.title?.toLowerCase().includes(search) ||
                (typeof opp.notes === 'string' && opp.notes.toLowerCase().includes(search)) ||
                opp.custom_data?.company?.toLowerCase().includes(search) ||
                opp.stage?.toLowerCase().includes(search)
            );
        }

        // Filtro por estágios (multi-select)
        if (filterData.stages && filterData.stages.length > 0) {
            filtered = filtered.filter(opp => filterData.stages.includes(opp.stage));
        }

        // Filtro por tags (multi-select, OR logic)
        if (filterData.tags && filterData.tags.length > 0) {
            filtered = filtered.filter(opp => {
                // Use tagList if available (pre-processed by service), otherwise fallback to tags
                const oppTags = opp.tagList || opp.tags || [];
                return oppTags.some(t => {
                    const tagName = t?.name || t?.tag?.name || (typeof t === 'string' ? t : '');
                    return filterData.tags.includes(tagName);
                });
            });
        }

        // Filtro por possibilidade de faturamento (multi-select)
        if (filterData.billingProbabilities && filterData.billingProbabilities.length > 0) {
            filtered = filtered.filter(opp => {
                // Oportunidades Meta e Potencial não têm billing_probability, não filtrá-las
                if (opp.is_goal || opp.is_potential) return true;
                const prob = opp.billing_probability || 'baixa';
                return filterData.billingProbabilities.includes(prob);
            });
        }

        // Filtro por valor mínimo
        if (filterData.minValue) {
            filtered = filtered.filter(opp => Number(opp.estimated_value) >= Number(filterData.minValue));
        }

        // Filtro por valor máximo
        if (filterData.maxValue) {
            filtered = filtered.filter(opp => Number(opp.estimated_value) <= Number(filterData.maxValue));
        }

        // Filtro por responsável
        if (filterData.responsible) {
            filtered = filtered.filter(opp =>
                opp.responsible?.toLowerCase().includes(filterData.responsible.toLowerCase())
            );
        }

        // Na visão por previsão, cada linha deve corresponder ao período selecionado.
        if (filterData.dateFrom || filterData.dateTo) {
            filtered = filtered.filter(opp => {
                const forecasts = opp.forecast_id ? [opp] : (opp.forecasts || []);
                return forecasts.some(f => {
                    const date = f.period_end || f.period_start;
                    return date && (!filterData.dateFrom || date >= filterData.dateFrom)
                        && (!filterData.dateTo || date <= filterData.dateTo);
                });
            });
        }

        if (filterData.company) {
            filtered = filtered.filter(opp => filterData.company === WITHOUT_COMPANY
                ? !opp.custom_data?.company?.trim()
                : opp.custom_data?.company?.trim() === filterData.company);
        }

        onFilterChange(filtered);
    };

    const clearFilters = () => {
        setSearchTerm('');
        setFilters(EMPTY_FILTERS);
        if (opportunities) {
            onFilterChange([...opportunities]);
        }
    };

    // Conta filtros ativos (excluindo busca global)
    // Badge de "Mais filtros": conta só os filtros do painel (empresa e faturamento ficam visíveis fora)
    const countActiveFilters = () => {
        let count = 0;
        if (filters.stages.length > 0) count++;
        if (filters.tags.length > 0) count++;
        if (filters.minValue) count++;
        if (filters.maxValue) count++;
        if (filters.responsible) count++;
        if (filters.dateFrom) count++;
        if (filters.dateTo) count++;
        return count;
    };

    const activeFilterCount = countActiveFilters();
    const hasActiveFilters = searchTerm || activeFilterCount > 0 || filters.company || filters.billingProbabilities.length > 0;

    const toggleInList = (key, value) => {
        const list = filters[key];
        handleFilterChange(key, list.includes(value) ? list.filter(v => v !== value) : [...list, value]);
    };

    // Resumo dos filtros aplicados — cada item remove só o próprio filtro
    const activeSummary = [];
    if (searchTerm) activeSummary.push({ key: 'search', label: `Busca: “${searchTerm}”`, onRemove: () => handleSearchChange('') });
    if (filters.stages.length) activeSummary.push({ key: 'stages', label: `Estágio: ${filters.stages.join(', ')}`, onRemove: () => handleFilterChange('stages', []) });
    if (filters.tags.length) activeSummary.push({ key: 'tags', label: `Tags: ${filters.tags.join(', ')}`, onRemove: () => handleFilterChange('tags', []) });
    if (filters.responsible) activeSummary.push({ key: 'responsible', label: `Responsável: ${filters.responsible}`, onRemove: () => handleFilterChange('responsible', '') });
    if (filters.minValue || filters.maxValue) activeSummary.push({
        key: 'value',
        label: `Valor: ${filters.minValue ? formatMoney(filters.minValue) : 'R$ 0'} – ${filters.maxValue ? formatMoney(filters.maxValue) : 'sem limite'}`,
        onRemove: () => {
            const next = { ...filters, minValue: '', maxValue: '' };
            setFilters(next);
            applyFilters({ ...next, search: searchTerm });
        }
    });
    if (filters.dateFrom || filters.dateTo) activeSummary.push({
        key: 'date',
        label: `Previsão: ${filters.dateFrom ? formatDate(filters.dateFrom) : 'início'} – ${filters.dateTo ? formatDate(filters.dateTo) : 'sem fim'}`,
        onRemove: () => {
            const next = { ...filters, dateFrom: '', dateTo: '' };
            setFilters(next);
            applyFilters({ ...next, search: searchTerm });
        }
    });

    const typeStateLabel = (state, plural) => state === 0 ? `${plural} ocultas` : state === 1 ? `${plural} incluídas na lista` : `Somente ${plural.toLowerCase()}`;

    return (
        <div className={styles.filtersContainer}>
            <div className={styles.searchBar}>
                <div className={styles.searchInputWrapper}>
                    <input
                        type="text"
                        className={styles.searchInput}
                        aria-label="Buscar oportunidades"
                        placeholder="Buscar por cliente, número, responsável, título..."
                        value={searchTerm}
                        onChange={(e) => handleSearchChange(e.target.value)}
                    />
                    {searchTerm && (
                        <button
                            className={styles.clearSearchBtn}
                            aria-label="Limpar busca"
                            onClick={() => handleSearchChange('')}
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>
                {/* Filter buttons - wrapped for mobile horizontal scroll */}
                <div className={styles.filterButtonsRow}>
                    {/* Botão Meta - 3 estados: 0=oculto, 1=listar, 2=filtrar */}
                    <button
                        className={`${styles.filterToggleBtn}`}
                        onClick={() => onMetaStateChange && onMetaStateChange((metaState + 1) % 3)}
                        title={metaState === 0 ? 'Clique para mostrar Metas' : metaState === 1 ? 'Clique para filtrar apenas Metas' : 'Clique para ocultar Metas'}
                        aria-label={`${typeStateLabel(metaState, 'Metas')}. Clique para alternar.`}
                        disabled={showArchived}
                        style={{
                            background: metaState === 2 ? '#d97706' : metaState === 1 ? '#f59e0b15' : 'var(--bg-main)',
                            borderColor: metaState > 0 ? '#d97706' : 'var(--border-color)',
                            opacity: showArchived ? 0.4 : metaState === 0 ? 0.6 : 1,
                            gap: '6px',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <Target size={16} style={{ color: metaState === 2 ? 'white' : metaState === 1 ? '#d97706' : 'var(--text-tertiary)' }} />
                        <span style={{
                            fontSize: '0.85rem',
                            color: metaState === 2 ? 'white' : metaState === 1 ? '#b45309' : 'var(--text-tertiary)',
                            fontWeight: metaState > 0 ? 600 : 400
                        }}>
                            Meta
                        </span>
                        {metaState === 2 && (
                            <span style={{ fontSize: '0.7rem', color: 'white', opacity: 0.9 }}>somente</span>
                        )}
                    </button>

                    <button
                        className={`${styles.filterToggleBtn}`}
                        onClick={() => onPotencialStateChange && onPotencialStateChange((potencialState + 1) % 3)}
                        title={potencialState === 0 ? 'Clique para mostrar Potenciais' : potencialState === 1 ? 'Clique para filtrar apenas Potenciais' : 'Clique para ocultar Potenciais'}
                        aria-label={`${typeStateLabel(potencialState, 'Potenciais')}. Clique para alternar.`}
                        disabled={showArchived}
                        style={{
                            background: potencialState === 2 ? '#7c6fcd' : potencialState === 1 ? '#7c6fcd15' : 'var(--bg-main)',
                            borderColor: potencialState > 0 ? '#7c6fcd' : 'var(--border-color)',
                            opacity: showArchived ? 0.4 : potencialState === 0 ? 0.6 : 1,
                            gap: '6px',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <Lightbulb size={16} style={{ color: potencialState === 2 ? 'white' : potencialState === 1 ? '#7c6fcd' : 'var(--text-tertiary)' }} />
                        <span style={{
                            fontSize: '0.85rem',
                            color: potencialState === 2 ? 'white' : potencialState === 1 ? '#6354b8' : 'var(--text-tertiary)',
                            fontWeight: potencialState > 0 ? 600 : 400
                        }}>
                            Potencial
                        </span>
                        {potencialState === 2 && (
                            <span style={{ fontSize: '0.7rem', color: 'white', opacity: 0.9 }}>somente</span>
                        )}
                    </button>
                    <button
                        className={`${styles.filterToggleBtn} ${showFilters ? styles.active : ''} ${activeFilterCount > 0 ? styles.hasFilters : ''}`}
                        onClick={() => setShowFilters(!showFilters)}
                        aria-expanded={showFilters}
                        aria-controls="opportunity-filters-panel"
                    >
                        <Filter size={18} />
                        <span>Mais filtros</span>
                        {activeFilterCount > 0 && (
                            <span className={styles.filterBadge}>{activeFilterCount}</span>
                        )}
                    </button>
                    {onShowArchivedChange && (
                        <button
                            className={`${styles.filterToggleBtn} ${showArchived ? styles.archivedActive : ''}`}
                            onClick={() => onShowArchivedChange(!showArchived)}
                            aria-pressed={showArchived}
                            title={showArchived ? 'Voltar para a lista principal' : 'Ver oportunidades arquivadas'}
                        >
                            <Archive size={16} />
                            <span>Arquivadas</span>
                            {archivedCount > 0 && (
                                <span className={styles.archivedCount}>{archivedCount}</span>
                            )}
                        </button>
                    )}
                    {/* Botão limpar filtros - sempre visível quando há filtros ativos */}
                    {hasActiveFilters && (
                        <button
                            className={styles.clearFiltersBtn}
                            onClick={clearFilters}
                            title="Limpar todos os filtros"
                        >
                            <X size={16} />
                            <span className={styles.clearFiltersText}>Limpar</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Filtros rápidos: sempre visíveis, um clique */}
            <div className={styles.quickFilters}>
                <div className={styles.quickFilterGroup} role="group" aria-label="Filtrar por empresa">
                    <span className={styles.quickFilterLabel}><Building2 size={14} /> Empresa</span>
                    <div className={styles.segmented}>
                        <button type="button" aria-pressed={!filters.company} className={!filters.company ? styles.segmentedActive : ''} onClick={() => handleFilterChange('company', '')}>
                            Todas
                        </button>
                        {availableCompanies.map(company => (
                            <button
                                key={company}
                                type="button"
                                aria-pressed={filters.company === company}
                                className={filters.company === company ? styles.segmentedActive : ''}
                                onClick={() => handleFilterChange('company', filters.company === company ? '' : company)}
                            >
                                {company}
                            </button>
                        ))}
                        <button
                            type="button"
                            aria-pressed={filters.company === WITHOUT_COMPANY}
                            className={filters.company === WITHOUT_COMPANY ? styles.segmentedActive : ''}
                            onClick={() => handleFilterChange('company', filters.company === WITHOUT_COMPANY ? '' : WITHOUT_COMPANY)}
                            title="Oportunidades sem empresa responsável"
                        >
                            Sem empresa
                        </button>
                    </div>
                </div>

                <div className={styles.quickFilterGroup} role="group" aria-label="Filtrar por possibilidade de faturamento">
                    <span className={styles.quickFilterLabel}><TrendingUp size={14} /> Faturamento</span>
                    <div className={styles.segmented}>
                        <button
                            type="button"
                            aria-pressed={filters.billingProbabilities.length === 0}
                            className={filters.billingProbabilities.length === 0 ? styles.segmentedActive : ''}
                            onClick={() => handleFilterChange('billingProbabilities', [])}
                        >
                            Todas
                        </button>
                        {BILLING_PROBABILITIES.map(prob => {
                            const selected = filters.billingProbabilities.includes(prob.value);
                            return (
                                <button
                                    key={prob.value}
                                    type="button"
                                    aria-pressed={selected}
                                    className={selected ? styles.segmentedActive : ''}
                                    onClick={() => toggleInList('billingProbabilities', prob.value)}
                                >
                                    <span className={styles.probDot} style={{ background: prob.color }} aria-hidden="true" />
                                    {prob.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Filtros aplicados: visíveis mesmo com o painel fechado */}
            {activeSummary.length > 0 && (
                <div className={styles.activeFilters} aria-live="polite">
                    <span className={styles.activeFiltersCount}>
                        {resultCount ?? 0} {resultCount === 1 ? 'resultado' : 'resultados'}
                    </span>
                    {activeSummary.map(item => (
                        <span key={item.key} className={styles.activeFilterPill}>
                            <span className={styles.activeFilterLabel}>{item.label}</span>
                            <button type="button" onClick={item.onRemove} aria-label={`Remover filtro ${item.label}`}>
                                <X size={12} strokeWidth={2.5} />
                            </button>
                        </span>
                    ))}
                </div>
            )}

            {showFilters && (
                <div id="opportunity-filters-panel" className={styles.filtersPanel}>
                    {/* Estágio */}
                    <div className={styles.filterGroup}>
                        <span className={styles.filterGroupLabel}>Estágio</span>
                        <div className={styles.filterChips}>
                            <FilterChip selected={filters.stages.length === 0} onClick={() => handleFilterChange('stages', [])}>
                                Todos
                            </FilterChip>
                            {STAGES.map(stage => (
                                <FilterChip key={stage} selected={filters.stages.includes(stage)} onClick={() => toggleInList('stages', stage)}>
                                    {stage}
                                </FilterChip>
                            ))}
                        </div>
                    </div>

                    {/* Tags */}
                    {availableTags.length > 0 && (
                        <div className={styles.filterGroup}>
                            <span className={styles.filterGroupLabel}><Tag size={14} /> Tags</span>
                            <div className={styles.filterChips}>
                                <FilterChip selected={filters.tags.length === 0} onClick={() => handleFilterChange('tags', [])}>
                                    Todas
                                </FilterChip>
                                {availableTags.map(tag => {
                                    // Ensure tag is always a string for rendering
                                    const tagName = typeof tag === 'string' ? tag : (tag?.tag || tag?.name || String(tag));
                                    return (
                                        <FilterChip key={tagName} selected={filters.tags.includes(tagName)} onClick={() => toggleInList('tags', tagName)}>
                                            {tagName}
                                        </FilterChip>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Grid responsivo para os outros campos */}
                    <div className={styles.filterFieldsGrid}>
                        {/* Responsável */}
                        <div className="input-group" style={{ marginBottom: 0 }}>
                            <label className="label" htmlFor="filter-responsible">Responsável</label>
                            <input
                                id="filter-responsible"
                                type="text"
                                className="input"
                                list="filter-responsible-options"
                                value={filters.responsible}
                                onChange={(e) => handleFilterChange('responsible', e.target.value)}
                                placeholder="Nome do responsável"
                            />
                            <datalist id="filter-responsible-options">
                                {availableResponsibles.map(name => <option key={name} value={name} />)}
                            </datalist>
                        </div>

                        {/* Grupo de Valores */}
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <div className="input-group" style={{ flex: 1, minWidth: 0, marginBottom: 0 }}>
                                <label className="label" htmlFor="filter-min">Valor Mín. (R$)</label>
                                <input
                                    id="filter-min"
                                    type="number"
                                    className="input"
                                    value={filters.minValue}
                                    onChange={(e) => handleFilterChange('minValue', e.target.value)}
                                    placeholder="0,00"
                                    step="0.01"
                                />
                            </div>
                            <div className="input-group" style={{ flex: 1, minWidth: 0, marginBottom: 0 }}>
                                <label className="label" htmlFor="filter-max">Valor Máx. (R$)</label>
                                <input
                                    id="filter-max"
                                    type="number"
                                    className="input"
                                    value={filters.maxValue}
                                    onChange={(e) => handleFilterChange('maxValue', e.target.value)}
                                    placeholder="0,00"
                                    step="0.01"
                                />
                            </div>
                        </div>

                        {/* Grupo de Datas */}
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <div className="input-group" style={{ flex: 1, minWidth: 0, marginBottom: 0 }}>
                                <label className="label" htmlFor="filter-from">Previsão de</label>
                                <input
                                    id="filter-from"
                                    type="date"
                                    className="input"
                                    value={filters.dateFrom}
                                    onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                                />
                            </div>
                            <div className="input-group" style={{ flex: 1, minWidth: 0, marginBottom: 0 }}>
                                <label className="label" htmlFor="filter-to">Previsão até</label>
                                <input
                                    id="filter-to"
                                    type="date"
                                    className="input"
                                    value={filters.dateTo}
                                    onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OpportunityFilters;
