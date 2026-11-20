import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Plus, Search, Trash2, Calendar, DollarSign, Copy, Target, Tag, Trash, Lightbulb } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useStageContext } from '../../contexts/StageContext';
import { opportunityService } from '../../services/opportunityService';
import { settingsService } from '../../services/settingsService';
import { clientService } from '../../services/clientService';
import { tagService } from '../../services/tagService';
import { responsiblesService } from '../../services/responsiblesService';
import ClientForm from '../clients/ClientForm';
import CompanyPicker from './CompanyPicker';
import styles from './Opportunities.module.css';

// Storage key for draft persistence
const FORM_STORAGE_KEY = 'opportunityFormDraft';

const OpportunityForm = ({ opportunity = null, onClose, onSave }) => {
    const { user } = useAuth();
    const { stages } = useStageContext();
    const [loading, setLoading] = useState(false);
    const [customFields, setCustomFields] = useState([]);
    const [clients, setClients] = useState([]);
    const [showClientModal, setShowClientModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [filteredClients, setFilteredClients] = useState([]);
    const searchRef = useRef(null);

    // State for responsibles dropdown
    const [responsibles, setResponsibles] = useState([]);

    // Currency formatting functions
    const formatCurrency = (value) => {
        if (!value && value !== 0) return '';
        const numValue = parseFloat(value);
        if (isNaN(numValue)) return '';
        return numValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const parseCurrencyToNumber = (value) => {
        const onlyDigits = value.replace(/\D/g, '');
        if (onlyDigits === '') return '';
        return (parseFloat(onlyDigits) / 100).toFixed(2);
    };

    // Form State
    const [formData, setFormData] = useState({
        title: '',
        client_id: '',
        client_name: '',
        stage: stages.length > 0 ? stages[0].name : 'Pipeline',
        responsible: '',
        notes: '',
        custom_data: {},
        is_goal: false,
        is_potential: false,
        billing_probability: 'baixa'
    });

    // Forecasts state (multiple forecasts per opportunity)
    const [forecasts, setForecasts] = useState([]);

    // Tags state
    const [tagInput, setTagInput] = useState('');
    const [selectedTags, setSelectedTags] = useState([]);
    const [availableTags, setAvailableTags] = useState([]);
    const [showTagDropdown, setShowTagDropdown] = useState(false);
    const tagRef = useRef(null);
    const tagInputRef = useRef(null);

    // Recurrence state
    const [showRecurrence, setShowRecurrence] = useState(false);
    const [recurrenceConfig, setRecurrenceConfig] = useState({
        start_date: '',
        periodicity: 'monthly', // monthly, quarterly, semiannual, annual
        count: '', // number of periods
        base_value: '',
        growth_type: '',
        growth_value: ''
    });

    // Clear storage helper
    const clearFormStorage = useCallback(() => {
        sessionStorage.removeItem(FORM_STORAGE_KEY);
    }, []);

    // Wrapped onClose that clears storage
    const handleClose = useCallback(() => {
        clearFormStorage();
        onClose();
    }, [clearFormStorage, onClose]);

    // Save form state to sessionStorage (only for new opportunities)
    const saveFormToStorage = useCallback(() => {
        if (!opportunity) {
            const dataToSave = {
                formData,
                forecasts,
                selectedTags,
                recurrenceConfig,
                showRecurrence,
                searchTerm
            };
            sessionStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(dataToSave));
        }
    }, [formData, forecasts, selectedTags, recurrenceConfig, showRecurrence, searchTerm, opportunity]);

    // Auto-save form state on changes
    useEffect(() => {
        // Debounce saves to avoid excessive writes
        const timeoutId = setTimeout(() => {
            saveFormToStorage();
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [saveFormToStorage]);

    useEffect(() => {
        loadCustomFields();
        loadClients();
        loadTags();
        loadResponsibles();
        if (opportunity) {
            // Editing existing opportunity - load from prop
            setFormData({
                title: opportunity.title || '',
                client_id: opportunity.client_id || '',
                client_name: opportunity.client_name || '',
                stage: opportunity.stage,
                responsible: opportunity.responsible || '',
                notes: opportunity.notes || '',
                custom_data: opportunity.custom_data || {},
                is_goal: opportunity.is_goal || false,
                is_potential: opportunity.is_potential || false,
                billing_probability: opportunity.billing_probability || 'baixa'
            });
            setSearchTerm(opportunity.client_name || '');
            // Load existing forecasts with period fields
            setForecasts((opportunity.forecasts || []).map(f => ({
                id: f.id,
                period_start: f.period_start || '',
                period_end: f.period_end || '',
                estimated_value: f.estimated_value,
                invoiced: f.invoiced || false,
                notes: f.notes || '',
                inputMode: 'date' // Default to date mode for existing items unless we infer otherwise
            })));
            // Load existing tags
            setSelectedTags((opportunity.tagList || []).map(t => t.name));
        } else {
            // New opportunity - try to restore from sessionStorage
            try {
                const savedDraft = sessionStorage.getItem(FORM_STORAGE_KEY);
                if (savedDraft) {
                    const parsed = JSON.parse(savedDraft);
                    if (parsed.formData) setFormData(parsed.formData);
                    if (parsed.forecasts) setForecasts(parsed.forecasts);
                    if (parsed.selectedTags) setSelectedTags(parsed.selectedTags);
                    if (parsed.recurrenceConfig) setRecurrenceConfig(parsed.recurrenceConfig);
                    if (parsed.showRecurrence !== undefined) setShowRecurrence(parsed.showRecurrence);
                    if (parsed.searchTerm) setSearchTerm(parsed.searchTerm);
                }
            } catch (e) {
                console.warn('Failed to restore form draft:', e);
                clearFormStorage();
            }
        }
    }, [opportunity, clearFormStorage]);

    const loadCustomFields = async () => {
        try {
            const fields = await settingsService.getCustomFields(user.id);
            setCustomFields(fields);
        } catch (error) {
            console.error('Error loading custom fields:', error);
        }
    };

    const loadClients = async () => {
        try {
            const data = await clientService.getClients(user.id);
            setClients(data || []);
        } catch (error) {
            console.error('Error loading clients:', error);
        }
    };

    const loadTags = async () => {
        try {
            const tags = await tagService.getTags();
            setAvailableTags(tags || []);
        } catch (error) {
            console.error('Error loading tags:', error);
        }
    };

    const loadResponsibles = async () => {
        try {
            const data = await responsiblesService.getResponsibles();
            setResponsibles(data || []);
        } catch (error) {
            console.error('Error loading responsibles:', error);
        }
    };

    useEffect(() => {
        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            const filtered = clients.filter(c =>
                c.name.toLowerCase().includes(search) ||
                (c.document && c.document.toLowerCase().includes(search))
            );
            setFilteredClients(filtered);
        } else {
            setFilteredClients(clients);
        }
    }, [searchTerm, clients]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
            if (tagRef.current && !tagRef.current.contains(event.target)) {
                setShowTagDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleClientSelect = (client) => {
        setFormData(prev => ({
            ...prev,
            client_id: client.id,
            client_name: client.name
        }));
        setSearchTerm(client.name);
        setShowDropdown(false);
    };

    const handleClientCreated = (newClient) => {
        loadClients();
        setShowClientModal(false);

        // Auto-select the newly created client
        if (newClient && newClient.id && newClient.name) {
            setFormData(prev => ({
                ...prev,
                client_id: newClient.id,
                client_name: newClient.name
            }));
            setSearchTerm(newClient.name);
            setShowDropdown(false);
        }
    };

    const handleCustomFieldChange = (fieldName, value) => {
        setFormData(prev => ({
            ...prev,
            custom_data: {
                ...prev.custom_data,
                [fieldName]: value
            }
        }));
    };

    // Tag management
    const addTag = (tagName) => {
        const normalizedTag = tagName.trim();
        const existingTagName = availableTags.find(
            tag => tag.name.toLowerCase() === normalizedTag.toLowerCase()
        )?.name || normalizedTag;

        if (
            existingTagName &&
            !selectedTags.some(tag => tag.toLowerCase() === existingTagName.toLowerCase())
        ) {
            setSelectedTags(prev => [...prev, existingTagName]);
        }
        setTagInput('');
        setShowTagDropdown(false);
    };

    const removeTag = (tagName) => {
        setSelectedTags(prev => prev.filter(t => t !== tagName));
    };

    const filteredAvailableTags = availableTags.filter(tag => {
        const matchesInput = !tagInput.trim() || tag.name.toLowerCase().includes(tagInput.trim().toLowerCase());
        const isSelected = selectedTags.some(selectedTag => selectedTag.toLowerCase() === tag.name.toLowerCase());

        return matchesInput && !isSelected;
    });
    const normalizedTagInput = tagInput.trim();
    const canCreateTag = Boolean(normalizedTagInput) && !availableTags.some(
        tag => tag.name.toLowerCase() === normalizedTagInput.toLowerCase()
    ) && !selectedTags.some(
        tag => tag.toLowerCase() === normalizedTagInput.toLowerCase()
    );
    const tagDropdownMessage = normalizedTagInput
        ? (filteredAvailableTags.length === 0 && !canCreateTag ? 'Nenhuma tag encontrada.' : '')
        : (availableTags.length === 0
            ? 'Nenhuma tag cadastrada.'
            : (filteredAvailableTags.length === 0 ? 'Todas as tags disponíveis já foram selecionadas.' : ''));
    const openTagDropdown = () => {
        setShowTagDropdown(true);
        tagInputRef.current?.focus();
    };

    const handleTypeChange = (type) => {
        // type can be 'real', 'meta', or 'potencial'
        const isGoal = type === 'meta';
        const isPotential = type === 'potencial';

        // First real stage available (excluding special stages 'Meta' and 'Potencial')
        const firstRealStage = stages.find(s => s.name !== 'Meta' && s.name !== 'Potencial')?.name || (stages[0]?.name || 'Pipeline');

        setFormData(prev => ({
            ...prev,
            is_goal: isGoal,
            is_potential: isPotential,
            // Reset client/stage when switching to goal or potential mode
            // For 'potencial', keep responsible field editable (not reset)
            ...((isGoal || isPotential) ? {
                client_id: '',
                client_name: '',
                stage: isGoal ? 'Meta' : 'Potencial',
                ...(isGoal ? { responsible: '' } : {})
            } : {
                // When switching back to 'real', reset stage only if it was a special stage
                stage: (prev.stage === 'Meta' || prev.stage === 'Potencial') ? firstRealStage : prev.stage,
                client_id: '',
                client_name: '',
            })
        }));
        if (isGoal || isPotential) {
            setSearchTerm('');
        } else {
            setSearchTerm('');
        }
    };

    // Helper to get current type
    const getCurrentType = () => {
        if (formData.is_goal) return 'meta';
        if (formData.is_potential) return 'potencial';
        return 'real';
    };


    const handleDeleteTag = async (tagId, tagName, e) => {
        e.stopPropagation();
        if (window.confirm(`Tem certeza que deseja excluir a tag "${tagName}"?`)) {
            try {
                await tagService.deleteTag(tagId);
                loadTags(); // Reload list
                // If selected, remove from selection
                if (selectedTags.includes(tagName)) {
                    removeTag(tagName);
                }
            } catch (error) {
                alert(error.message);
            }
        }
    };

    // Forecast management
    const addForecast = () => {
        setForecasts(prev => [...prev, {
            id: null,
            period_start: '',
            period_end: '',
            estimated_value: '',
            invoiced: false,
            notes: ''
        }]);
    };

    const updateForecast = (index, field, value) => {
        setForecasts(prev => prev.map((f, i) => {
            if (i === index) {
                // If setting period via quarter selection
                if (field === 'quarter') {
                    const { year, quarter } = value;
                    const quarterRanges = {
                        'Q1': { start: `${year}-01-01`, end: `${year}-03-31` },
                        'Q2': { start: `${year}-04-01`, end: `${year}-06-30` },
                        'Q3': { start: `${year}-07-01`, end: `${year}-09-30` },
                        'Q4': { start: `${year}-10-01`, end: `${year}-12-31` }
                    };
                    const range = quarterRanges[quarter];
                    return { ...f, period_start: range.start, period_end: range.end };
                }
                return { ...f, [field]: value };
            }
            return f;
        }));
    };

    const removeForecast = (index) => {
        setForecasts(prev => prev.filter((_, i) => i !== index));
    };

    // Helper function to calculate period end based on periodicity
    // Formula: End Date = (Start Date + Period) - 1 day
    const calculatePeriodEnd = (startDate, periodicity) => {
        const date = new Date(startDate + 'T00:00:00');
        let endDate;

        switch (periodicity) {
            case 'monthly':
                // Add 1 month, then subtract 1 day
                endDate = new Date(date.getFullYear(), date.getMonth() + 1, date.getDate());
                break;
            case 'bimonthly':
                // Add 2 months, then subtract 1 day
                endDate = new Date(date.getFullYear(), date.getMonth() + 2, date.getDate());
                break;
            case 'quarterly':
                // Add 3 months, then subtract 1 day
                endDate = new Date(date.getFullYear(), date.getMonth() + 3, date.getDate());
                break;
            case 'semiannual':
                // Add 6 months, then subtract 1 day
                endDate = new Date(date.getFullYear(), date.getMonth() + 6, date.getDate());
                break;
            case 'annual':
                // Add 1 year, then subtract 1 day
                endDate = new Date(date.getFullYear() + 1, date.getMonth(), date.getDate());
                break;
            default:
                return startDate;
        }

        // Subtract 1 day
        endDate.setDate(endDate.getDate() - 1);
        return endDate.toISOString().split('T')[0];
    };

    // Helper function to get next period start (day after the previous period end)
    const getNextPeriodStart = (previousPeriodEnd) => {
        const date = new Date(previousPeriodEnd + 'T00:00:00');
        date.setDate(date.getDate() + 1);
        return date.toISOString().split('T')[0];
    };

    // Generate forecasts via recurrence
    const generateRecurringForecasts = () => {
        const { start_date, periodicity, count, base_value, growth_type, growth_value } = recurrenceConfig;

        if (!start_date || !count || !base_value) {
            alert('Preencha a data inicial, quantidade de períodos e valor base para gerar a recorrência.');
            return;
        }

        const numPeriods = parseInt(count, 10);
        const numBaseValue = parseFloat(base_value);
        const numGrowthValue = parseFloat(growth_value) || 0;

        const newForecasts = [];
        let periodStart = start_date;
        let periodEnd = '';

        for (let i = 0; i < numPeriods; i++) {
            // For first occurrence, use the initial date provided
            // For subsequent occurrences, use the day after the previous period end
            if (i > 0) {
                periodStart = getNextPeriodStart(periodEnd);
            }

            // Calculate period end by adding the periodicity to period start
            periodEnd = calculatePeriodEnd(periodStart, periodicity);

            // Calculate value with growth
            let value = numBaseValue;
            if (i > 0 && growth_type && numGrowthValue > 0) {
                if (growth_type === 'percentage') {
                    value = numBaseValue * Math.pow(1 + (numGrowthValue / 100), i);
                } else if (growth_type === 'value') {
                    value = numBaseValue + (numGrowthValue * i);
                }
            }

            newForecasts.push({
                id: null,
                period_start: periodStart,
                period_end: periodEnd,
                estimated_value: value.toFixed(2),
                invoiced: false,
                notes: ''
            });
        }

        setForecasts(prev => [...prev, ...newForecasts]);
        setShowRecurrence(false);
        setRecurrenceConfig({
            start_date: '',
            periodicity: 'monthly',
            count: '',
            base_value: '',
            growth_type: '',
            growth_value: ''
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.custom_data?.company?.trim()) {
            alert('Por favor, informe a empresa responsável.');
            return;
        }

        // Only require client for real opportunities (not goal or potential)
        if (!formData.is_goal && !formData.is_potential && (!formData.client_id || !formData.client_name)) {
            alert('Por favor, selecione um cliente da lista.');
            return;
        }

        if (forecasts.length === 0) {
            alert('Por favor, adicione pelo menos uma previsão de faturamento.');
            return;
        }

        // Validate forecasts
        for (let i = 0; i < forecasts.length; i++) {
            if (!forecasts[i].period_start || !forecasts[i].period_end || !forecasts[i].estimated_value) {
                alert(`Por favor, preencha o período (início e fim) e o valor da previsão ${i + 1}.`);
                return;
            }
        }

        setLoading(true);
        try {
            const opportunityData = {
                ...formData,
                custom_data: { ...formData.custom_data, company: formData.custom_data.company.trim() },
                // For goals and potentials, set special values
                client_id: (formData.is_goal || formData.is_potential) ? null : formData.client_id,
                client_name: formData.is_goal ? 'META' : (formData.is_potential ? 'POTENCIAL' : formData.client_name),
                stage: formData.is_goal ? 'Meta' : (formData.is_potential ? 'Potencial' : formData.stage),
                // Responsável: permitido para 'real' e 'potencial', mas não para 'meta'
                responsible: formData.is_goal ? null : (formData.responsible || null),
                billing_probability: (formData.is_goal || formData.is_potential) ? null : formData.billing_probability,
                forecasts: forecasts.map(f => ({
                    period_start: f.period_start,
                    period_end: f.period_end,
                    estimated_value: parseFloat(f.estimated_value),
                    invoiced: f.invoiced,
                    notes: f.notes
                })),
                tagNames: selectedTags
            };

            if (opportunity) {
                await opportunityService.updateOpportunity(opportunity.id, opportunityData);
            } else {
                await opportunityService.createOpportunity(user.id, opportunityData);
            }

            // Clear draft on successful save
            clearFormStorage();
            onSave();
            onClose();
        } catch (error) {
            console.error('Erro ao salvar oportunidade:', error);
            alert('Erro ao salvar oportunidade: ' + (error.message || 'Erro desconhecido'));
        } finally {
            setLoading(false);
        }
    };

    // Calculate total value
    const totalValue = forecasts.reduce((sum, f) => sum + (parseFloat(f.estimated_value) || 0), 0);

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modal}>
                <div className={styles.modalHeader}>
                    <h3>{opportunity ? 'Editar Oportunidade' : 'Nova Oportunidade'}</h3>
                    <button className={styles.closeBtn} onClick={handleClose}><X size={24} /></button>
                </div>

                <form onSubmit={handleSubmit} className={styles.modalForm}>
                    <div className={styles.modalBody}>
                        {/* Opportunity Type Selector */}
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label className="label" style={{ marginBottom: '10px' }}>Tipo de Oportunidade *</label>

                            {/* Cards principais: Real e Potencial */}
                            <div className={styles.typeCards} role="radiogroup" aria-label="Tipo de oportunidade">
                                {[
                                    { type: 'real', title: 'Oportunidade Real', subtitle: 'Receita real', Icon: DollarSign, accent: '#2563eb', tint: '#eff6ff' },
                                    { type: 'potencial', title: 'Oportunidade Potencial', subtitle: 'Receita em construção', Icon: Lightbulb, accent: '#7c3aed', tint: '#f5f3ff' }
                                ].map(({ type, title, subtitle, Icon, accent, tint }) => {
                                    const selected = getCurrentType() === type;
                                    return (
                                        <button
                                            key={type}
                                            type="button"
                                            role="radio"
                                            aria-checked={selected}
                                            onClick={() => handleTypeChange(type)}
                                            className={`${styles.typeCard} ${selected ? styles.typeCardActive : ''}`}
                                            style={{ '--type-accent': accent, '--type-tint': tint }}
                                        >
                                            <span className={styles.typeCardIcon}><Icon size={18} /></span>
                                            <span className={styles.typeCardText}>
                                                <span className={styles.typeCardTitle}>{title}</span>
                                                <span className={styles.typeCardSubtitle}>{subtitle}</span>
                                            </span>
                                            <span className={styles.typeCardRadio} aria-hidden="true" />
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Meta: opção discreta para uso anual */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingLeft: '2px' }}>
                                <button
                                    type="button"
                                    onClick={() => handleTypeChange('meta')}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        padding: '3px 0',
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                        color: getCurrentType() === 'meta' ? '#d97706' : 'var(--text-tertiary)',
                                        fontSize: '0.78rem',
                                        fontWeight: getCurrentType() === 'meta' ? 600 : 400,
                                        textDecoration: getCurrentType() === 'meta' ? 'none' : 'none',
                                        borderBottom: getCurrentType() === 'meta' ? '1.5px solid #d97706' : '1.5px solid transparent',
                                        transition: 'all 0.2s ease',
                                        lineHeight: 1
                                    }}
                                    onMouseEnter={e => { if (getCurrentType() !== 'meta') { e.currentTarget.style.color = '#b45309'; e.currentTarget.style.borderBottomColor = '#b45309'; } }}
                                    onMouseLeave={e => { if (getCurrentType() !== 'meta') { e.currentTarget.style.color = 'var(--text-tertiary)'; e.currentTarget.style.borderBottomColor = 'transparent'; } }}
                                >
                                    <Target size={12} />
                                    {getCurrentType() === 'meta' ? '✓ Oportunidade Meta (Receita Planejada) — selecionada' : 'Cadastrar como Oportunidade Meta (Receita Planejada)'}
                                </button>
                            </div>
                        </div>

                        {/* Empresa responsável (compacta) + Título na mesma linha */}
                        <div className={styles.formRow} style={{ display: 'flex', gap: '16px', marginBottom: '1rem' }}>
                        <div className="input-group" style={{ flex: '0 0 280px', minWidth: 0, marginBottom: 0 }}>
                            <label className="label" htmlFor="opportunity-company">Empresa responsável *</label>
                            <CompanyPicker
                                id="opportunity-company"
                                value={formData.custom_data?.company || ''}
                                onChange={(company) => setFormData(prev => ({ ...prev, custom_data: { ...prev.custom_data, company } }))}
                            />
                        </div>

                        {/* Fixed Fields */}
                        <div className="input-group" style={{ flex: 1, minWidth: 0, marginBottom: 0 }}>
                            <label className="label">Título da {formData.is_goal ? 'Meta' : (formData.is_potential ? 'Potencial' : 'Oportunidade')} *</label>
                            <input
                                name="title"
                                type="text"
                                className="input"
                                placeholder={formData.is_goal ? 'Ex: Meta Q1 2026, Meta Anual 2026...' : (formData.is_potential ? 'Ex: Receita Potencial Q2 2026...' : 'Ex: Projeto de Consultoria, Contrato de Manutenção...')}
                                value={formData.title}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        </div>

                        {!formData.is_goal && !formData.is_potential && (
                            <div className={styles.formRow} style={{ display: 'flex', gap: '16px', marginBottom: '1rem' }}>
                                <div className="input-group" style={{ flex: 2, marginBottom: 0 }}>
                                    <label className="label">Cliente / Empresa *</label>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <div ref={searchRef} style={{ flex: 1, position: 'relative' }}>
                                            <div style={{ position: 'relative' }}>
                                                <Search size={18} style={{
                                                    position: 'absolute',
                                                    left: '12px',
                                                    top: '50%',
                                                    transform: 'translateY(-50%)',
                                                    color: 'var(--text-tertiary)',
                                                    pointerEvents: 'none'
                                                }} />
                                                <input
                                                    type="text"
                                                    className="input"
                                                    placeholder="Buscar por nome ou CNPJ..."
                                                    value={searchTerm}
                                                    onChange={(e) => {
                                                        setSearchTerm(e.target.value);
                                                        setShowDropdown(true);
                                                        if (formData.client_id) {
                                                            setFormData(prev => ({
                                                                ...prev,
                                                                client_id: '',
                                                                client_name: ''
                                                            }));
                                                        }
                                                    }}
                                                    onFocus={() => setShowDropdown(true)}
                                                    required
                                                    style={{ paddingLeft: '40px' }}
                                                />
                                            </div>
                                            {showDropdown && (
                                                <div style={{
                                                    position: 'absolute',
                                                    top: '100%',
                                                    left: 0,
                                                    right: 0,
                                                    background: 'var(--bg-secondary)',
                                                    border: '1px solid var(--border-color)',
                                                    borderRadius: '8px',
                                                    marginTop: '4px',
                                                    maxHeight: '300px',
                                                    overflowY: 'auto',
                                                    boxShadow: 'var(--shadow-lg)',
                                                    zIndex: 1000
                                                }}>
                                                    {filteredClients.length === 0 ? (
                                                        <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                                            Nenhum cliente encontrado
                                                        </div>
                                                    ) : (
                                                        filteredClients.map(client => (
                                                            <div
                                                                key={client.id}
                                                                onClick={() => handleClientSelect(client)}
                                                                style={{
                                                                    padding: '0.75rem 1rem',
                                                                    cursor: 'pointer',
                                                                    borderBottom: '1px solid var(--border-color)',
                                                                    transition: 'background 0.2s'
                                                                }}
                                                                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                                                                onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                                                            >
                                                                <div style={{ fontWeight: 500 }}>
                                                                    {client.name}
                                                                </div>
                                                                {client.document && (
                                                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                                                                        {client.document}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            className="btn btn-secondary"
                                            onClick={() => setShowClientModal(true)}
                                            title="Adicionar novo cliente"
                                        >
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                </div>

                                <div className="input-group" style={{ flex: 1, marginBottom: 0, minWidth: '160px' }}>
                                    <label className="label">Estágio *</label>
                                    <select
                                        name="stage"
                                        className="input"
                                        value={formData.stage}
                                        onChange={handleChange}
                                        required
                                    >
                                        {stages.map(stage => (
                                            <option
                                                key={stage.id || stage.name}
                                                value={stage.name}
                                                title={stage.description || ''}
                                            >
                                                {stage.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}
                        <div className={styles.formRow} style={{ display: 'flex', gap: '16px', marginBottom: '1rem' }}>
                            <div className="input-group" style={{ flex: 2, marginBottom: 0 }}>
                                <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Tag size={14} />
                                    Tags
                                </label>
                                <div ref={tagRef} style={{ position: 'relative' }}>
                                    <div
                                        onClick={openTagDropdown}
                                        style={{
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        gap: '6px',
                                        padding: '8px',
                                        border: `1px solid ${showTagDropdown ? 'var(--color-primary)' : 'var(--border-color)'}`,
                                        borderRadius: '8px',
                                        minHeight: '42px',
                                        background: 'var(--bg-input)',
                                        boxShadow: showTagDropdown
                                            ? '0 0 0 3px var(--focus-ring)'
                                            : 'inset 0 1px 2px rgba(15, 23, 42, 0.04)',
                                        transition: 'all var(--transition-base)',
                                        cursor: 'text'
                                    }}>
                                        {selectedTags.map(tag => (
                                            <span
                                                key={tag}
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    padding: '4px 8px',
                                                    background: 'var(--color-primary)',
                                                    color: 'white',
                                                    borderRadius: '4px',
                                                    fontSize: '0.85rem',
                                                    boxShadow: '0 1px 2px rgba(37, 99, 235, 0.28)'
                                                }}
                                            >
                                                {tag}
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        removeTag(tag);
                                                    }}
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        color: 'white',
                                                        cursor: 'pointer',
                                                        padding: '0 2px',
                                                        display: 'flex',
                                                        opacity: 0.9
                                                    }}
                                                >
                                                    <X size={12} />
                                                </button>
                                            </span>
                                        ))}
                                        <input
                                            ref={tagInputRef}
                                            type="text"
                                            value={tagInput}
                                            onChange={(e) => {
                                                setTagInput(e.target.value);
                                                setShowTagDropdown(true);
                                            }}
                                            onFocus={() => setShowTagDropdown(true)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && tagInput.trim()) {
                                                    e.preventDefault();
                                                    addTag(tagInput);
                                                }
                                            }}
                                            placeholder="Digite ou selecione tags..."
                                            style={{
                                                border: 'none',
                                                outline: 'none',
                                                flex: 1,
                                                minWidth: '120px',
                                                padding: '4px',
                                                background: 'transparent',
                                                color: 'var(--text-primary)'
                                            }}
                                        />
                                    </div>
                                    {showTagDropdown && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '100%',
                                            left: 0,
                                            right: 0,
                                            background: 'var(--bg-secondary)',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: '8px',
                                            marginTop: '4px',
                                            maxHeight: '200px',
                                            overflowY: 'auto',
                                            boxShadow: 'var(--shadow-lg)',
                                            zIndex: 1000
                                        }}>
                                            {filteredAvailableTags.map(tag => (
                                                <div
                                                    key={tag.id}
                                                    onClick={() => addTag(tag.name)}
                                                    style={{
                                                        padding: '10px 12px',
                                                        cursor: 'pointer',
                                                        borderBottom: '1px solid var(--border-color)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        gap: '12px',
                                                        color: 'var(--text-primary)'
                                                    }}
                                                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                                                    onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                                                >
                                                    <span>{tag.name}</span>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => handleDeleteTag(tag.id, tag.name, e)}
                                                        style={{
                                                            background: 'none',
                                                            border: 'none',
                                                            cursor: 'pointer',
                                                            padding: '4px',
                                                            color: 'var(--text-tertiary)',
                                                            display: 'flex',
                                                            alignItems: 'center'
                                                        }}
                                                        title="Excluir tag"
                                                        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-danger)'}
                                                        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-tertiary)'}
                                                    >
                                                        <Trash size={12} />
                                                    </button>
                                                </div>
                                            ))}
                                            {tagDropdownMessage && (
                                                <div style={{
                                                    padding: '12px',
                                                    color: 'var(--text-secondary)',
                                                    textAlign: 'center',
                                                    background: 'var(--bg-main)'
                                                }}>
                                                    {tagDropdownMessage}
                                                </div>
                                            )}
                                            {canCreateTag && (
                                                <div
                                                    onClick={() => addTag(normalizedTagInput)}
                                                    style={{
                                                        padding: '10px 12px',
                                                        cursor: 'pointer',
                                                        color: 'var(--color-primary)',
                                                        fontWeight: 600,
                                                        borderTop: filteredAvailableTags.length > 0 ? '1px solid var(--border-color)' : 'none'
                                                    }}
                                                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                                                    onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                                                >
                                                    + Criar tag "{normalizedTagInput}"
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Campo Responsável - à direita das Tags */}
                            {/* Exibir para 'real' e 'potencial', mas não para 'meta' */}
                            {!formData.is_goal && (
                                <div className="input-group" style={{ flex: 1, marginBottom: 0, minWidth: '180px' }}>
                                    <label className="label">Responsável</label>
                                    <select
                                        name="responsible"
                                        className="input"
                                        value={formData.responsible}
                                        onChange={handleChange}
                                    >
                                        <option value="">Selecione...</option>
                                        {responsibles.filter(r => r.is_active).map(r => (
                                            <option key={r.id} value={r.name}>{r.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Campo Possibilidade de Faturamento - à direita do Responsável */}
                            {!formData.is_goal && !formData.is_potential && (
                                <div className="input-group" style={{ flex: 1, marginBottom: 0, minWidth: '180px' }}>
                                    <label className="label">Possibilidade de Faturamento *</label>
                                    <select
                                        name="billing_probability"
                                        className="input"
                                        value={formData.billing_probability}
                                        onChange={handleChange}
                                        required
                                    >
                                        <option value="baixa">Baixa</option>
                                        <option value="media">Média</option>
                                        <option value="alta">Alta</option>
                                    </select>
                                </div>
                            )}
                        </div>

                        <div className="input-group">
                            <label className="label">Descrição da oportunidade</label>
                            <textarea
                                name="notes"
                                className="input"
                                rows="3"
                                style={{ resize: 'vertical', overflowY: 'auto' }}
                                value={formData.notes}
                                onChange={handleChange}
                            />
                        </div>

                        {/* Forecasts Section */}
                        <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Calendar size={18} />
                                    Previsões de Faturamento
                                    <span style={{
                                        fontSize: '0.85rem',
                                        fontWeight: 'normal',
                                        color: 'var(--text-secondary)',
                                        marginLeft: '8px'
                                    }}>
                                        ({forecasts.length} {forecasts.length === 1 ? 'registro' : 'registros'})
                                    </span>
                                </h4>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => setShowRecurrence(!showRecurrence)}
                                        style={{ fontSize: '0.85rem' }}
                                    >
                                        <Copy size={14} />
                                        Recorrência
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-primary"
                                        onClick={addForecast}
                                        style={{ fontSize: '0.85rem' }}
                                    >
                                        <Plus size={14} />
                                        Adicionar
                                    </button>
                                </div>
                            </div>

                            {/* Recurrence Panel */}
                            {showRecurrence && (
                                <div style={{
                                    background: 'var(--bg-secondary)',
                                    padding: '1rem',
                                    borderRadius: '8px',
                                    marginBottom: '1rem',
                                    border: '1px solid var(--border-color)'
                                }}>
                                    <h5 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem' }}>Gerar Previsões Recorrentes</h5>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
                                        <div className="input-group" style={{ marginBottom: 0 }}>
                                            <label className="label" style={{ fontSize: '0.85rem' }}>Periodicidade *</label>
                                            <select
                                                className="input"
                                                value={recurrenceConfig.periodicity}
                                                onChange={(e) => setRecurrenceConfig(prev => ({ ...prev, periodicity: e.target.value }))}
                                            >
                                                <option value="monthly">Mensal</option>
                                                <option value="bimonthly">Bimestral</option>
                                                <option value="quarterly">Trimestral</option>
                                                <option value="semiannual">Semestral</option>
                                                <option value="annual">Anual</option>
                                            </select>
                                        </div>
                                        <div className="input-group" style={{ marginBottom: 0 }}>
                                            <label className="label" style={{ fontSize: '0.85rem' }}>Data Inicial *</label>
                                            <input
                                                type="date"
                                                className="input"
                                                value={recurrenceConfig.start_date}
                                                onChange={(e) => setRecurrenceConfig(prev => ({ ...prev, start_date: e.target.value }))}
                                            />
                                        </div>
                                        <div className="input-group" style={{ marginBottom: 0 }}>
                                            <label className="label" style={{ fontSize: '0.85rem' }}>
                                                Qtd. {recurrenceConfig.periodicity === 'monthly' ? 'Meses' :
                                                    recurrenceConfig.periodicity === 'bimonthly' ? 'Bimestres' :
                                                        recurrenceConfig.periodicity === 'quarterly' ? 'Trimestres' :
                                                            recurrenceConfig.periodicity === 'semiannual' ? 'Semestres' : 'Anos'} *
                                            </label>
                                            <input
                                                type="number"
                                                className="input"
                                                min="1"
                                                max="60"
                                                placeholder="Quantidade"
                                                value={recurrenceConfig.count}
                                                onChange={(e) => setRecurrenceConfig(prev => ({ ...prev, count: e.target.value }))}
                                            />
                                        </div>
                                        <div className="input-group" style={{ marginBottom: 0 }}>
                                            <label className="label" style={{ fontSize: '0.85rem' }}>Valor Base (R$) *</label>
                                            <input
                                                type="text"
                                                className="input"
                                                placeholder="0,00"
                                                value={formatCurrency(recurrenceConfig.base_value)}
                                                onChange={(e) => setRecurrenceConfig(prev => ({
                                                    ...prev,
                                                    base_value: parseCurrencyToNumber(e.target.value)
                                                }))}
                                            />
                                        </div>
                                        <div className="input-group" style={{ marginBottom: 0 }}>
                                            <label className="label" style={{ fontSize: '0.85rem' }}>Crescimento</label>
                                            <select
                                                className="input"
                                                value={recurrenceConfig.growth_type}
                                                onChange={(e) => setRecurrenceConfig(prev => ({ ...prev, growth_type: e.target.value }))}
                                            >
                                                <option value="">Sem crescimento</option>
                                                <option value="percentage">Percentual (%)</option>
                                                <option value="value">Valor fixo (R$)</option>
                                            </select>
                                        </div>
                                        {recurrenceConfig.growth_type && (
                                            <div className="input-group" style={{ marginBottom: 0 }}>
                                                <label className="label" style={{ fontSize: '0.85rem' }}>
                                                    {recurrenceConfig.growth_type === 'percentage' ? 'Percentual (%)' : 'Valor (R$)'}
                                                </label>
                                                <input
                                                    type="number"
                                                    className="input"
                                                    min="0"
                                                    step="0.01"
                                                    value={recurrenceConfig.growth_value}
                                                    onChange={(e) => setRecurrenceConfig(prev => ({ ...prev, growth_value: e.target.value }))}
                                                />
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '1rem', justifyContent: 'flex-end' }}>
                                        <button
                                            type="button"
                                            className="btn btn-secondary"
                                            onClick={() => setShowRecurrence(false)}
                                            style={{ fontSize: '0.85rem' }}
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-primary"
                                            onClick={generateRecurringForecasts}
                                            style={{ fontSize: '0.85rem' }}
                                        >
                                            Gerar Previsões
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Forecasts List */}
                            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                {forecasts.length === 0 ? (
                                    <div style={{
                                        textAlign: 'center',
                                        padding: '2rem',
                                        color: 'var(--text-secondary)',
                                        background: 'var(--bg-secondary)',
                                        borderRadius: '8px',
                                        border: '1px dashed var(--border-color)'
                                    }}>
                                        Nenhuma previsão adicionada. Clique em "Adicionar" ou "Recorrência" para começar.
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        {forecasts.map((forecast, index) => (
                                            <div key={index} style={{
                                                background: '#f8fafc',
                                                border: '1px solid var(--border-color)',
                                                borderRadius: '8px',
                                                padding: '16px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '12px'
                                            }}>
                                                {/* Header Row: Remove Button */}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '-8px' }}>
                                                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Previsão {index + 1}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeForecast(index)}
                                                        style={{
                                                            background: 'none',
                                                            border: 'none',
                                                            cursor: 'pointer',
                                                            padding: '4px',
                                                            color: 'var(--color-danger)',
                                                            opacity: 0.7,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '4px',
                                                            fontSize: '0.8rem'
                                                        }}
                                                        title="Remover previsão"
                                                    >
                                                        <Trash2 size={14} /> Remover
                                                    </button>
                                                </div>

                                                {/* Row 1: Period and Quarter Selector */}
                                                <div style={{ flex: 1, minWidth: '350px' }}>
                                                    <div style={{ display: 'flex', gap: '16px', marginBottom: '8px', alignItems: 'center' }}>
                                                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Definir Período Por:</label>
                                                        <div style={{ display: 'flex', gap: '8px' }}>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const newForecasts = [...forecasts];
                                                                    newForecasts[index].inputMode = 'date';
                                                                    setForecasts(newForecasts);
                                                                }}
                                                                style={{
                                                                    padding: '4px 12px',
                                                                    borderRadius: '16px',
                                                                    border: '1px solid var(--border-color)',
                                                                    background: (!forecast.inputMode || forecast.inputMode === 'date') ? 'var(--color-primary)' : 'white',
                                                                    color: (!forecast.inputMode || forecast.inputMode === 'date') ? 'white' : 'var(--text-secondary)',
                                                                    cursor: 'pointer',
                                                                    fontSize: '0.75rem',
                                                                    transition: 'all 0.2s'
                                                                }}
                                                            >
                                                                Datas
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const newForecasts = [...forecasts];
                                                                    newForecasts[index].inputMode = 'quarter';
                                                                    setForecasts(newForecasts);
                                                                }}
                                                                style={{
                                                                    padding: '4px 12px',
                                                                    borderRadius: '16px',
                                                                    border: '1px solid var(--border-color)',
                                                                    background: forecast.inputMode === 'quarter' ? 'var(--color-primary)' : 'white',
                                                                    color: forecast.inputMode === 'quarter' ? 'white' : 'var(--text-secondary)',
                                                                    cursor: 'pointer',
                                                                    fontSize: '0.75rem',
                                                                    transition: 'all 0.2s'
                                                                }}
                                                            >
                                                                Trimestre
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {(!forecast.inputMode || forecast.inputMode === 'date') ? (
                                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <input
                                                                    type="date"
                                                                    className="input"
                                                                    style={{ padding: '6px 8px', fontSize: '0.9rem' }}
                                                                    value={forecast.period_start}
                                                                    onChange={(e) => updateForecast(index, 'period_start', e.target.value)}
                                                                    required
                                                                />
                                                                <span style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>até</span>
                                                            </div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <input
                                                                    type="date"
                                                                    className="input"
                                                                    style={{ padding: '6px 8px', fontSize: '0.9rem', minWidth: '140px' }}
                                                                    value={forecast.period_end}
                                                                    onChange={(e) => updateForecast(index, 'period_end', e.target.value)}
                                                                    required
                                                                />
                                                                <span style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>ou</span>
                                                                <select
                                                                    className="input"
                                                                    style={{
                                                                        padding: '6px 8px',
                                                                        fontSize: '0.8rem',
                                                                        minWidth: '150px',
                                                                        background: 'linear-gradient(135deg, #f0f7ff 0%, white 100%)',
                                                                        borderColor: '#3b82f640',
                                                                        color: '#3b82f6',
                                                                        fontWeight: 500
                                                                    }}
                                                                    value=""
                                                                    onChange={(e) => {
                                                                        if (!forecast.period_start) {
                                                                            alert('Preencha a data de início primeiro.');
                                                                            return;
                                                                        }
                                                                        const startDate = new Date(forecast.period_start + 'T00:00:00');
                                                                        let endDate;
                                                                        switch (e.target.value) {
                                                                            case 'end_month':
                                                                                endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
                                                                                break;
                                                                            case 'end_bimester':
                                                                                const bimesterEnd = Math.ceil((startDate.getMonth() + 1) / 2) * 2;
                                                                                endDate = new Date(startDate.getFullYear(), bimesterEnd, 0);
                                                                                break;
                                                                            case 'end_quarter':
                                                                                const quarterEnd = Math.ceil((startDate.getMonth() + 1) / 3) * 3;
                                                                                endDate = new Date(startDate.getFullYear(), quarterEnd, 0);
                                                                                break;
                                                                            case 'end_semester':
                                                                                const semesterEnd = startDate.getMonth() < 6 ? 6 : 12;
                                                                                endDate = new Date(startDate.getFullYear(), semesterEnd, 0);
                                                                                break;
                                                                            case 'end_year':
                                                                                endDate = new Date(startDate.getFullYear(), 11, 31);
                                                                                break;
                                                                            default:
                                                                                return;
                                                                        }
                                                                        updateForecast(index, 'period_end', endDate.toISOString().split('T')[0]);
                                                                    }}
                                                                >
                                                                    <option value="">Preencher rápido...</option>
                                                                    <option value="end_month">Final do mês</option>
                                                                    <option value="end_bimester">Final do bimestre</option>
                                                                    <option value="end_quarter">Final do trimestre</option>
                                                                    <option value="end_semester">Final do semestre</option>
                                                                    <option value="end_year">Final do ano</option>
                                                                </select>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div style={{ display: 'flex', gap: '8px' }}>
                                                            <select
                                                                id={`year-${index}`}
                                                                className="input"
                                                                style={{ padding: '6px 8px', fontSize: '0.9rem', width: '90px' }}
                                                                value={forecast.year || new Date().getFullYear()}
                                                                onChange={(e) => {
                                                                    const newYear = parseInt(e.target.value);
                                                                    const newForecasts = [...forecasts];
                                                                    newForecasts[index].year = newYear;

                                                                    // Update dates if quarter is already selected
                                                                    if (forecast.quarter) {
                                                                        const quarterRanges = {
                                                                            'Q1': { start: `${newYear}-01-01`, end: `${newYear}-03-31` },
                                                                            'Q2': { start: `${newYear}-04-01`, end: `${newYear}-06-30` },
                                                                            'Q3': { start: `${newYear}-07-01`, end: `${newYear}-09-30` },
                                                                            'Q4': { start: `${newYear}-10-01`, end: `${newYear}-12-31` }
                                                                        };
                                                                        const range = quarterRanges[forecast.quarter];
                                                                        if (range) {
                                                                            newForecasts[index].period_start = range.start;
                                                                            newForecasts[index].period_end = range.end;
                                                                        }
                                                                    }
                                                                    setForecasts(newForecasts);
                                                                }}
                                                            >
                                                                {[...Array(5)].map((_, i) => {
                                                                    const year = new Date().getFullYear() + i;
                                                                    return <option key={year} value={year}>{year}</option>;
                                                                })}
                                                            </select>
                                                            <select
                                                                className="input"
                                                                style={{ padding: '6px 8px', fontSize: '0.9rem' }}
                                                                value={forecast.quarter || ''}
                                                                onChange={(e) => {
                                                                    const selectedQuarter = e.target.value;
                                                                    if (!selectedQuarter) return;

                                                                    const year = forecast.year || new Date().getFullYear();
                                                                    const quarterRanges = {
                                                                        'Q1': { start: `${year}-01-01`, end: `${year}-03-31` },
                                                                        'Q2': { start: `${year}-04-01`, end: `${year}-06-30` },
                                                                        'Q3': { start: `${year}-07-01`, end: `${year}-09-30` },
                                                                        'Q4': { start: `${year}-10-01`, end: `${year}-12-31` }
                                                                    };
                                                                    const range = quarterRanges[selectedQuarter];

                                                                    const newForecasts = [...forecasts];
                                                                    newForecasts[index].quarter = selectedQuarter;
                                                                    newForecasts[index].year = year;
                                                                    newForecasts[index].period_start = range.start;
                                                                    newForecasts[index].period_end = range.end;
                                                                    setForecasts(newForecasts);
                                                                }}
                                                            >
                                                                <option value="">Selecione...</option>
                                                                <option value="Q1">Q1 (Jan-Mar)</option>
                                                                <option value="Q2">Q2 (Abr-Jun)</option>
                                                                <option value="Q3">Q3 (Jul-Set)</option>
                                                                <option value="Q4">Q4 (Out-Dez)</option>
                                                            </select>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Row 2: Value, Invoiced, Notes */}
                                                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                                                    <div style={{ flex: 1, minWidth: '150px' }}>
                                                        <label className="label" style={{ fontSize: '0.8rem', marginBottom: '4px' }}>Valor (R$)</label>
                                                        <input
                                                            type="text"
                                                            className="input"
                                                            style={{ padding: '6px 8px', fontSize: '0.9rem', fontWeight: 600 }}
                                                            placeholder="0,00"
                                                            value={formatCurrency(forecast.estimated_value)}
                                                            onChange={(e) => updateForecast(index, 'estimated_value', parseCurrencyToNumber(e.target.value))}
                                                            required
                                                        />
                                                    </div>

                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '24px' }}>
                                                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: (formData.is_goal || formData.is_potential) ? 'not-allowed' : 'pointer', fontSize: '0.9rem', opacity: (formData.is_goal || formData.is_potential) ? 0.5 : 1 }}>
                                                            <input
                                                                type="checkbox"
                                                                checked={(formData.is_goal || formData.is_potential) ? false : forecast.invoiced}
                                                                onChange={(e) => !(formData.is_goal || formData.is_potential) && updateForecast(index, 'invoiced', e.target.checked)}
                                                                style={{ width: '16px', height: '16px', cursor: (formData.is_goal || formData.is_potential) ? 'not-allowed' : 'pointer' }}
                                                                disabled={formData.is_goal || formData.is_potential}
                                                            />
                                                            Faturado
                                                        </label>
                                                    </div>

                                                    <div style={{ flex: 2, minWidth: '200px' }}>
                                                        <label className="label" style={{ fontSize: '0.8rem', marginBottom: '4px' }}>Observação</label>
                                                        <input
                                                            type="text"
                                                            className="input"
                                                            style={{ padding: '6px 8px', fontSize: '0.9rem' }}
                                                            placeholder="Obs..."
                                                            value={forecast.notes || ''}
                                                            onChange={(e) => updateForecast(index, 'notes', e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Total Value */}
                            {forecasts.length > 0 && (
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'flex-end',
                                    alignItems: 'center',
                                    gap: '12px',
                                    marginTop: '1rem',
                                    paddingTop: '1rem',
                                    borderTop: '1px solid var(--border-color)'
                                }}>
                                    <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>
                                        <DollarSign size={16} style={{ verticalAlign: 'middle' }} /> Total:
                                    </span>
                                    <span style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--color-primary)' }}>
                                        R$ {formatCurrency(totalValue)}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Custom Fields */}
                        {customFields.length > 0 && (
                            <>
                                <h4 className={styles.sectionSubtitle} style={{ marginTop: '1.5rem' }}>Informações Adicionais</h4>
                                <div className={styles.formGrid}>
                                    {customFields.map(field => (
                                        <div key={field.id} className="input-group">
                                            <label className="label">
                                                {field.field_name} {field.is_required && '*'}
                                            </label>

                                            {field.field_type === 'select' ? (
                                                <select
                                                    className="input"
                                                    value={formData.custom_data[field.field_name] || ''}
                                                    onChange={(e) => handleCustomFieldChange(field.field_name, e.target.value)}
                                                    required={field.is_required}
                                                >
                                                    <option value="">Selecione...</option>
                                                    {field.select_options?.map(opt => (
                                                        <option key={opt} value={opt}>{opt}</option>
                                                    ))}
                                                </select>
                                            ) : field.field_type === 'checkbox' ? (
                                                <input
                                                    type="checkbox"
                                                    checked={!!formData.custom_data[field.field_name]}
                                                    onChange={(e) => handleCustomFieldChange(field.field_name, e.target.checked)}
                                                />
                                            ) : field.field_type === 'percentage' ? (
                                                <div style={{ position: 'relative' }}>
                                                    <input
                                                        type="number"
                                                        className="input"
                                                        style={{ paddingRight: '35px' }}
                                                        value={formData.custom_data[field.field_name] || ''}
                                                        onChange={(e) => handleCustomFieldChange(field.field_name, e.target.value)}
                                                        required={field.is_required}
                                                        min="0"
                                                        max="100"
                                                        step="0.01"
                                                    />
                                                    <span style={{
                                                        position: 'absolute',
                                                        right: '12px',
                                                        top: '50%',
                                                        transform: 'translateY(-50%)',
                                                        color: 'var(--text-secondary)',
                                                        pointerEvents: 'none'
                                                    }}>%</span>
                                                </div>
                                            ) : field.field_type === 'currency' ? (
                                                <div style={{ position: 'relative' }}>
                                                    <span style={{
                                                        position: 'absolute',
                                                        left: '12px',
                                                        top: '50%',
                                                        transform: 'translateY(-50%)',
                                                        color: 'var(--text-secondary)',
                                                        pointerEvents: 'none'
                                                    }}>R$</span>
                                                    <input
                                                        type="number"
                                                        className="input"
                                                        style={{ paddingLeft: '40px' }}
                                                        value={formData.custom_data[field.field_name] || ''}
                                                        onChange={(e) => handleCustomFieldChange(field.field_name, e.target.value)}
                                                        required={field.is_required}
                                                        min="0"
                                                        step="0.01"
                                                    />
                                                </div>
                                            ) : (
                                                <input
                                                    type={field.field_type === 'number' ? 'number' : field.field_type === 'date' ? 'date' : 'text'}
                                                    className="input"
                                                    value={formData.custom_data[field.field_name] || ''}
                                                    onChange={(e) => handleCustomFieldChange(field.field_name, e.target.value)}
                                                    required={field.is_required}
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    <div className={styles.modalFooter}>
                        <button type="button" className="btn btn-secondary" onClick={handleClose}>Cancelar</button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Salvando...' : 'Salvar Oportunidade'}
                        </button>
                    </div>
                </form>
            </div>

            {showClientModal && (
                <ClientForm
                    onClose={() => setShowClientModal(false)}
                    onSave={handleClientCreated}
                />
            )}
        </div>
    );
};

export default OpportunityForm;
