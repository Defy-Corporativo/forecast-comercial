import React, { useState, useEffect } from 'react';
import { Search, Filter, X, Target, Lightbulb, Tag, TrendingUp } from 'lucide-react';
import { Button } from '@iadefysolutions/design-system';
import styles from './Opportunities.module.css';

const BILLING_PROBABILITIES = [
    { value: 'alta', label: 'Alta', color: '#10b981' },
    { value: 'media', label: 'Média', color: '#f59e0b' },
    { value: 'baixa', label: 'Baixa', color: '#ef4444' }
];

const STAGES = ['Pipeline', 'Strong Upside', 'Committed', 'Deal', 'Lost', 'Meta', 'Potencial'];

const OpportunityFilters = ({ opportunities, onFilterChange, metaState, potencialState, onMetaStateChange, onPotencialStateChange }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        stages: [], // Empty array = all stages (no filter)
        tags: [], // Empty array = all tags (no filter)
        billingProbabilities: [], // Empty array = all probabilities (no filter)
        minValue: '',
        maxValue: '',
        responsible: '',
        company: '',
        dateFrom: '',
        dateTo: ''
    });

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
                opp.opportunity_number?.toLowerCase().includes(search) ||
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
            filtered = filtered.filter(opp => filterData.company === '__without_company__'
                ? !opp.custom_data?.company?.trim()
                : opp.custom_data?.company === filterData.company);
        }

        onFilterChange(filtered);
    };

    const clearFilters = () => {
        setSearchTerm('');
        setFilters({
            stages: [],
            tags: [],
            billingProbabilities: [],
            minValue: '',
            maxValue: '',
            responsible: '',
            company: '',
            dateFrom: '',
            dateTo: ''
        });
        if (opportunities) {
            onFilterChange([...opportunities]);
        }
    };

    // Conta filtros ativos (excluindo busca global)
    const countActiveFilters = () => {
        let count = 0;
        if (filters.stages.length > 0) count++;
        if (filters.tags.length > 0) count++;
        if (filters.billingProbabilities.length > 0) count++;
        if (filters.minValue) count++;
        if (filters.maxValue) count++;
        if (filters.responsible) count++;
        if (filters.company) count++;
        if (filters.dateFrom) count++;
        if (filters.dateTo) count++;
        return count;
    };

    const activeFilterCount = countActiveFilters();
    const hasActiveFilters = searchTerm || activeFilterCount > 0;

    const toggleStage = (stage) => {
        const newStages = filters.stages.includes(stage)
            ? filters.stages.filter(s => s !== stage)
            : [...filters.stages, stage];
        handleFilterChange('stages', newStages);
    };

    const selectAllStages = () => {
        handleFilterChange('stages', []);
    };

    const toggleTag = (tag) => {
        const newTags = filters.tags.includes(tag)
            ? filters.tags.filter(t => t !== tag)
            : [...filters.tags, tag];
        handleFilterChange('tags', newTags);
    };

    const toggleBillingProbability = (prob) => {
        const newProbs = filters.billingProbabilities.includes(prob)
            ? filters.billingProbabilities.filter(p => p !== prob)
            : [...filters.billingProbabilities, prob];
        handleFilterChange('billingProbabilities', newProbs);
    };

    const selectAllBillingProbabilities = () => {
        handleFilterChange('billingProbabilities', []);
    };

    return (
        <div className={styles.filtersContainer}>
            <div className={styles.searchBar}>
                <div className={styles.searchInputWrapper}>
                    <input
                        type="text"
                        className={styles.searchInput}
                        placeholder="Buscar por cliente, número, responsável, título..."
                        value={searchTerm}
                        onChange={(e) => handleSearchChange(e.target.value)}
                    />
                    {searchTerm && (
                        <button
                            className={styles.clearSearchBtn}
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
                        style={{
                            background: metaState === 2 ? '#f59e0b' : metaState === 1 ? '#f59e0b15' : 'var(--bg-main)',
                            borderColor: metaState > 0 ? '#f59e0b' : 'var(--border-color)',
                            opacity: metaState === 0 ? 0.6 : 1,
                            gap: '6px',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <Target size={16} style={{ color: metaState === 2 ? 'white' : metaState === 1 ? '#f59e0b' : 'var(--text-tertiary)' }} />
                        <span style={{
                            fontSize: '0.85rem',
                            color: metaState === 2 ? 'white' : metaState === 1 ? '#f59e0b' : 'var(--text-tertiary)',
                            fontWeight: metaState > 0 ? 600 : 400
                        }}>
                            Meta
                        </span>
                        {metaState === 2 && (
                            <span style={{ fontSize: '0.7rem', color: 'white', opacity: 0.8 }}>somente</span>
                        )}
                    </button>

                    <button
                        className={`${styles.filterToggleBtn}`}
                        onClick={() => onPotencialStateChange && onPotencialStateChange((potencialState + 1) % 3)}
                        title={potencialState === 0 ? 'Clique para mostrar Potenciais' : potencialState === 1 ? 'Clique para filtrar apenas Potenciais' : 'Clique para ocultar Potenciais'}
                        style={{
                            background: potencialState === 2 ? '#7c6fcd' : potencialState === 1 ? '#7c6fcd15' : 'var(--bg-main)',
                            borderColor: potencialState > 0 ? '#7c6fcd' : 'var(--border-color)',
                            opacity: potencialState === 0 ? 0.6 : 1,
                            gap: '6px',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <Lightbulb size={16} style={{ color: potencialState === 2 ? 'white' : potencialState === 1 ? '#7c6fcd' : 'var(--text-tertiary)' }} />
                        <span style={{
                            fontSize: '0.85rem',
                            color: potencialState === 2 ? 'white' : potencialState === 1 ? '#7c6fcd' : 'var(--text-tertiary)',
                            fontWeight: potencialState > 0 ? 600 : 400
                        }}>
                            Potencial
                        </span>
                        {potencialState === 2 && (
                            <span style={{ fontSize: '0.7rem', color: 'white', opacity: 0.8 }}>somente</span>
                        )}
                    </button>
                    <button
                        className={`${styles.filterToggleBtn} ${showFilters ? styles.active : ''} ${activeFilterCount > 0 ? styles.hasFilters : ''}`}
                        onClick={() => setShowFilters(!showFilters)}
                    >
                        <Filter size={18} />
                        <span>Filtros</span>
                        {activeFilterCount > 0 && (
                            <span className={styles.filterBadge}>{activeFilterCount}</span>
                        )}
                    </button>
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

            {showFilters && (
                <div className={styles.filtersPanel}>
                    {/* Estágio - Full width */}
                    <div style={{ marginBottom: '16px' }}>
                        <label className="label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span>Estágio</span>
                            <span style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    type="button"
                                    onClick={selectAllStages}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: 'var(--color-primary)',
                                        cursor: 'pointer',
                                        fontSize: '0.75rem',
                                        padding: 0
                                    }}
                                >
                                    Todos
                                </button>
                            </span>
                        </label>
                        <div style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '6px',
                            padding: '8px',
                            border: '1px solid var(--border-color)',
                            borderRadius: 'var(--border-radius-sm)',
                            background: 'var(--bg-main)'
                        }}>
                            {STAGES.map(stage => {
                                const isSelected = filters.stages.length === 0 || filters.stages.includes(stage);
                                return (
                                    <label
                                        key={stage}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            padding: '4px 10px',
                                            borderRadius: '12px',
                                            background: isSelected ? 'var(--color-primary)' : 'white',
                                            color: isSelected ? 'white' : 'var(--text-secondary)',
                                            cursor: 'pointer',
                                            fontSize: '0.8rem',
                                            fontWeight: 500,
                                            border: `1px solid ${isSelected ? 'var(--color-primary)' : 'var(--border-color)'}`,
                                            transition: 'all 0.15s'
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => toggleStage(stage)}
                                            style={{ display: 'none' }}
                                        />
                                        {stage}
                                    </label>
                                );
                            })}
                        </div>
                    </div>

                    {/* Tags - Full width if available */}
                    {availableTags.length > 0 && (
                        <div style={{ marginBottom: '16px' }}>
                            <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                                <Tag size={14} />
                                <span>Tags</span>
                            </label>
                            <div style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: '6px',
                                padding: '8px',
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--border-radius-sm)',
                                background: 'var(--bg-main)'
                            }}>
                                {availableTags.map(tag => {
                                    // Ensure tag is always a string for rendering
                                    const tagName = typeof tag === 'string' ? tag : (tag?.tag || tag?.name || String(tag));
                                    const isSelected = filters.tags.includes(tagName);
                                    return (
                                        <label
                                            key={tagName}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                padding: '4px 10px',
                                                borderRadius: '12px',
                                                background: isSelected ? 'var(--color-primary)' : 'white',
                                                color: isSelected ? 'white' : 'var(--text-secondary)',
                                                cursor: 'pointer',
                                                fontSize: '0.8rem',
                                                fontWeight: 500,
                                                border: `1px solid ${isSelected ? 'var(--color-primary)' : 'var(--border-color)'}`,
                                                transition: 'all 0.15s'
                                            }}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => toggleTag(tagName)}
                                                style={{ display: 'none' }}
                                            />
                                            {tagName}
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Possibilidade de Faturamento */}
                    <div style={{ marginBottom: '16px' }}>
                        <label className="label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <TrendingUp size={14} />
                                Possibilidade de Faturamento
                            </span>
                            <button
                                type="button"
                                onClick={selectAllBillingProbabilities}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--color-primary)',
                                    cursor: 'pointer',
                                    fontSize: '0.75rem',
                                    padding: 0
                                }}
                            >
                                Todas
                            </button>
                        </label>
                        <div style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '6px',
                            padding: '8px',
                            border: '1px solid var(--border-color)',
                            borderRadius: 'var(--border-radius-sm)',
                            background: 'var(--bg-main)'
                        }}>
                            {BILLING_PROBABILITIES.map(prob => {
                                const isSelected = filters.billingProbabilities.length === 0 || filters.billingProbabilities.includes(prob.value);
                                return (
                                    <label
                                        key={prob.value}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            padding: '4px 10px',
                                            borderRadius: '12px',
                                            background: isSelected ? prob.color : 'white',
                                            color: isSelected ? 'white' : 'var(--text-secondary)',
                                            cursor: 'pointer',
                                            fontSize: '0.8rem',
                                            fontWeight: 500,
                                            border: `1px solid ${isSelected ? prob.color : 'var(--border-color)'}`,
                                            transition: 'all 0.15s'
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => toggleBillingProbability(prob.value)}
                                            style={{ display: 'none' }}
                                        />
                                        {prob.label}
                                    </label>
                                );
                            })}
                        </div>
                    </div>

                    {/* Grid responsivo para os outros campos */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '16px'
                    }}>
                        <div className="input-group" style={{ marginBottom: 0 }}>
                            <label className="label" htmlFor="company-filter">Empresa</label>
                            <select id="company-filter" className="input" value={filters.company} onChange={(e) => handleFilterChange('company', e.target.value)}>
                                <option value="">Todas as empresas</option>
                                <option value="__without_company__">Sem empresa</option>
                                {[...new Set(opportunities.map(opp => opp.custom_data?.company).filter(Boolean))].sort().map(company => <option key={company} value={company}>{company}</option>)}
                            </select>
                        </div>
                        {/* Responsável */}
                        <div className="input-group" style={{ marginBottom: 0 }}>
                            <label className="label">Responsável</label>
                            <input
                                type="text"
                                className="input"
                                value={filters.responsible}
                                onChange={(e) => handleFilterChange('responsible', e.target.value)}
                                placeholder="Nome do responsável"
                            />
                        </div>

                        {/* Grupo de Valores */}
                        <div style={{
                            display: 'flex',
                            gap: '12px',
                            gridColumn: 'span 1'
                        }}>
                            <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
                                <label className="label">Valor Mín. (R$)</label>
                                <input
                                    type="number"
                                    className="input"
                                    value={filters.minValue}
                                    onChange={(e) => handleFilterChange('minValue', e.target.value)}
                                    placeholder="0,00"
                                    step="0.01"
                                />
                            </div>
                            <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
                                <label className="label">Valor Máx. (R$)</label>
                                <input
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
                        <div style={{
                            display: 'flex',
                            gap: '12px',
                            gridColumn: 'span 1'
                        }}>
                            <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
                                <label className="label">Data De</label>
                                <input
                                    type="date"
                                    className="input"
                                    value={filters.dateFrom}
                                    onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                                />
                            </div>
                            <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
                                <label className="label">Data Até</label>
                                <input
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

