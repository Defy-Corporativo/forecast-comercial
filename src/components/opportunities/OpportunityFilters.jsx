import React, { useState, useEffect } from 'react';
import { Search, Filter, X, Target, Lightbulb } from 'lucide-react';
import styles from './Opportunities.module.css';

const STAGES = ['Pipeline', 'Strong Upside', 'Committed', 'Deal', 'Lost', 'Meta', 'Potencial'];

const OpportunityFilters = ({ opportunities, onFilterChange, includeGoals, onIncludeGoalsChange }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        stages: [], // Empty array = all stages (no filter)
        minValue: '',
        maxValue: '',
        responsible: '',
        dateFrom: '',
        dateTo: ''
    });

    useEffect(() => {
        // Aplicar filtros quando as oportunidades mudarem (apenas se não houver filtros ativos)
        if (!searchTerm && filters.stages.length === 0 && !filters.minValue && !filters.maxValue &&
            !filters.responsible && !filters.dateFrom && !filters.dateTo) {
            if (opportunities) {
                onFilterChange([...opportunities]);
            }
        } else {
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
                opp.notes?.toLowerCase().includes(search) ||
                opp.stage?.toLowerCase().includes(search)
            );
        }

        // Filtro por estágios (multi-select)
        if (filterData.stages && filterData.stages.length > 0) {
            filtered = filtered.filter(opp => filterData.stages.includes(opp.stage));
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

        // Filtro por período (de)
        if (filterData.dateFrom) {
            filtered = filtered.filter(opp => {
                if (!opp.period_start) return false;
                return new Date(opp.period_start) >= new Date(filterData.dateFrom);
            });
        }

        // Filtro por período (até)
        if (filterData.dateTo) {
            filtered = filtered.filter(opp => {
                if (!opp.period_start) return false;
                return new Date(opp.period_start) <= new Date(filterData.dateTo);
            });
        }

        onFilterChange(filtered);
    };

    const clearFilters = () => {
        setSearchTerm('');
        setFilters({
            stages: [],
            minValue: '',
            maxValue: '',
            responsible: '',
            dateFrom: '',
            dateTo: ''
        });
        if (opportunities) {
            onFilterChange([...opportunities]);
        }
    };

    const hasActiveFilters = searchTerm || filters.stages.length > 0 || filters.minValue || filters.maxValue ||
        filters.responsible || filters.dateFrom || filters.dateTo;

    const toggleStage = (stage) => {
        const newStages = filters.stages.includes(stage)
            ? filters.stages.filter(s => s !== stage)
            : [...filters.stages, stage];
        handleFilterChange('stages', newStages);
    };

    const selectAllStages = () => {
        handleFilterChange('stages', []);
    };

    const selectNoStages = () => {
        handleFilterChange('stages', ['_none_']);
    };

    return (
        <div className={styles.filtersContainer}>
            <div className={styles.searchBar}>
                <div className={styles.searchInputWrapper}>
                    <Search size={18} className={styles.searchIcon} />
                    <input
                        type="text"
                        className={styles.searchInput}
                        placeholder="Buscar por cliente, número, responsável..."
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
                <button
                    className={`${styles.filterToggleBtn} ${includeGoals ? styles.active : ''}`}
                    onClick={() => onIncludeGoalsChange && onIncludeGoalsChange(!includeGoals)}
                    title={includeGoals ? 'Ocultar Metas e Potenciais' : 'Mostrar Metas e Potenciais'}
                    style={{
                        background: includeGoals ? 'linear-gradient(135deg, #f59e0b15, #8b5cf615)' : undefined,
                        borderColor: includeGoals ? '#a855f760' : undefined,
                        opacity: includeGoals ? 1 : 0.7,
                        gap: '6px'
                    }}
                >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Target size={14} style={{ color: includeGoals ? '#f59e0b' : 'var(--text-secondary)' }} />
                        <span style={{ fontSize: '0.85rem', color: includeGoals ? '#f59e0b' : 'var(--text-secondary)' }}>Meta</span>
                    </span>
                    <span style={{ color: 'var(--text-tertiary)' }}>/</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Lightbulb size={14} style={{ color: includeGoals ? '#8b5cf6' : 'var(--text-secondary)' }} />
                        <span style={{ fontSize: '0.85rem', color: includeGoals ? '#8b5cf6' : 'var(--text-secondary)' }}>Potencial</span>
                    </span>
                </button>
                <button
                    className={`${styles.filterToggleBtn} ${showFilters ? styles.active : ''}`}
                    onClick={() => setShowFilters(!showFilters)}
                >
                    <Filter size={18} />
                    Filtros
                    {hasActiveFilters && <span className={styles.filterBadge}></span>}
                </button>
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
                                <button
                                    type="button"
                                    onClick={selectNoStages}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: 'var(--text-secondary)',
                                        cursor: 'pointer',
                                        fontSize: '0.75rem',
                                        padding: 0
                                    }}
                                >
                                    Nenhum
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
                            background: 'var(--bg-secondary)'
                        }}>
                            {STAGES.map(stage => {
                                const isSelected = filters.stages.length === 0 || filters.stages.includes(stage);
                                const isNoneMode = filters.stages.includes('_none_');
                                return (
                                    <label
                                        key={stage}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            padding: '4px 8px',
                                            borderRadius: '4px',
                                            background: isNoneMode ? 'transparent' : (isSelected ? 'var(--color-primary)' : 'white'),
                                            color: isNoneMode ? 'var(--text-tertiary)' : (isSelected ? 'white' : 'var(--text-primary)'),
                                            cursor: 'pointer',
                                            fontSize: '0.8rem',
                                            border: `1px solid ${isSelected && !isNoneMode ? 'var(--color-primary)' : 'var(--border-color)'}`,
                                            opacity: isNoneMode ? 0.5 : 1,
                                            transition: 'all 0.15s'
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isSelected && !isNoneMode}
                                            onChange={() => toggleStage(stage)}
                                            style={{ display: 'none' }}
                                        />
                                        {stage}
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

                    {hasActiveFilters && (
                        <div className={styles.filtersActions}>
                            <button className="btn btn-secondary" onClick={clearFilters}>
                                Limpar Filtros
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default OpportunityFilters;

