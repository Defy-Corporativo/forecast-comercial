import React, { useState, useEffect } from 'react';
import { Search, Filter, X } from 'lucide-react';
import styles from './Opportunities.module.css';

const STAGES = ['Pipeline', 'Strong Upside', 'Committed', 'Deal', 'Lost'];

const OpportunityFilters = ({ opportunities, onFilterChange }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        stage: '',
        minValue: '',
        maxValue: '',
        responsible: '',
        dateFrom: '',
        dateTo: ''
    });

    useEffect(() => {
        // Aplicar filtros quando as oportunidades mudarem (apenas se não houver filtros ativos)
        if (!searchTerm && !filters.stage && !filters.minValue && !filters.maxValue && 
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

        // Filtro por estágio
        if (filterData.stage) {
            filtered = filtered.filter(opp => opp.stage === filterData.stage);
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

        // Filtro por data de previsão (de)
        if (filterData.dateFrom) {
            filtered = filtered.filter(opp => {
                if (!opp.forecast_date) return false;
                return new Date(opp.forecast_date) >= new Date(filterData.dateFrom);
            });
        }

        // Filtro por data de previsão (até)
        if (filterData.dateTo) {
            filtered = filtered.filter(opp => {
                if (!opp.forecast_date) return false;
                return new Date(opp.forecast_date) <= new Date(filterData.dateTo);
            });
        }

        onFilterChange(filtered);
    };

    const clearFilters = () => {
        setSearchTerm('');
        setFilters({
            stage: '',
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

    const hasActiveFilters = searchTerm || filters.stage || filters.minValue || filters.maxValue || 
                            filters.responsible || filters.dateFrom || filters.dateTo;

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
                    <div className={styles.filtersGrid}>
                        <div className="input-group">
                            <label className="label">Estágio</label>
                            <select
                                className="input"
                                value={filters.stage}
                                onChange={(e) => handleFilterChange('stage', e.target.value)}
                            >
                                <option value="">Todos os estágios</option>
                                {STAGES.map(stage => (
                                    <option key={stage} value={stage}>{stage}</option>
                                ))}
                            </select>
                        </div>

                        <div className="input-group">
                            <label className="label">Valor Mínimo (R$)</label>
                            <input
                                type="number"
                                className="input"
                                value={filters.minValue}
                                onChange={(e) => handleFilterChange('minValue', e.target.value)}
                                placeholder="0.00"
                                step="0.01"
                            />
                        </div>

                        <div className="input-group">
                            <label className="label">Valor Máximo (R$)</label>
                            <input
                                type="number"
                                className="input"
                                value={filters.maxValue}
                                onChange={(e) => handleFilterChange('maxValue', e.target.value)}
                                placeholder="0.00"
                                step="0.01"
                            />
                        </div>

                        <div className="input-group">
                            <label className="label">Responsável</label>
                            <input
                                type="text"
                                className="input"
                                value={filters.responsible}
                                onChange={(e) => handleFilterChange('responsible', e.target.value)}
                                placeholder="Nome do responsável"
                            />
                        </div>

                        <div className="input-group">
                            <label className="label">Data Previsão (De)</label>
                            <input
                                type="date"
                                className="input"
                                value={filters.dateFrom}
                                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                            />
                        </div>

                        <div className="input-group">
                            <label className="label">Data Previsão (Até)</label>
                            <input
                                type="date"
                                className="input"
                                value={filters.dateTo}
                                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                            />
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

