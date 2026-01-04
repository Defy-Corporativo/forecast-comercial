import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Search, Trash2, Calendar, DollarSign, Copy, Target, Tag, Trash } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useStageContext } from '../../contexts/StageContext';
import { opportunityService } from '../../services/opportunityService';
import { settingsService } from '../../services/settingsService';
import { clientService } from '../../services/clientService';
import { tagService } from '../../services/tagService';
import ClientForm from '../clients/ClientForm';
import styles from './Opportunities.module.css';

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
        is_goal: false
    });

    // Forecasts state (multiple forecasts per opportunity)
    const [forecasts, setForecasts] = useState([]);

    // Tags state
    const [tagInput, setTagInput] = useState('');
    const [selectedTags, setSelectedTags] = useState([]);
    const [availableTags, setAvailableTags] = useState([]);
    const [showTagDropdown, setShowTagDropdown] = useState(false);
    const tagRef = useRef(null);

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

    useEffect(() => {
        loadCustomFields();
        loadClients();
        loadTags();
        if (opportunity) {
            setFormData({
                title: opportunity.title || '',
                client_id: opportunity.client_id || '',
                client_name: opportunity.client_name || '',
                stage: opportunity.stage,
                responsible: opportunity.responsible || '',
                notes: opportunity.notes || '',
                custom_data: opportunity.custom_data || {},
                is_goal: opportunity.is_goal || false
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
        }
    }, [opportunity]);

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

    useEffect(() => {
        if (searchTerm) {
            const filtered = clients.filter(c =>
                c.name.toLowerCase().includes(searchTerm.toLowerCase())
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

    const handleClientCreated = () => {
        loadClients();
        setShowClientModal(false);
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
        if (normalizedTag && !selectedTags.includes(normalizedTag)) {
            setSelectedTags(prev => [...prev, normalizedTag]);
        }
        setTagInput('');
        setShowTagDropdown(false);
    };

    const removeTag = (tagName) => {
        setSelectedTags(prev => prev.filter(t => t !== tagName));
    };

    const filteredAvailableTags = availableTags.filter(tag =>
        tag.name.toLowerCase().includes(tagInput.toLowerCase()) &&
        !selectedTags.includes(tag.name)
    );

    const handleGoalToggle = (isGoal) => {
        setFormData(prev => ({
            ...prev,
            is_goal: isGoal,
            // Reset client/stage/responsible when switching to goal mode
            ...(isGoal ? { client_id: '', client_name: '', stage: 'Meta', responsible: '' } : {})
        }));
        if (isGoal) {
            setSearchTerm('');
        }
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

        // Only require client for non-goal opportunities
        if (!formData.is_goal && (!formData.client_id || !formData.client_name)) {
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
                // For goals, set special values
                client_id: formData.is_goal ? null : formData.client_id,
                client_name: formData.is_goal ? 'META' : formData.client_name,
                stage: formData.is_goal ? 'Meta' : formData.stage,
                responsible: formData.is_goal ? null : formData.responsible,
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
                    <button className={styles.closeBtn} onClick={onClose}><X size={24} /></button>
                </div>

                <form onSubmit={handleSubmit} className={styles.modalForm}>
                    <div className={styles.modalBody}>
                        {/* Opportunity Type Selector */}
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label className="label" style={{ marginBottom: '8px' }}>Tipo de Oportunidade *</label>
                            <div style={{ display: 'flex', gap: '0' }}>
                                <button
                                    type="button"
                                    onClick={() => handleGoalToggle(false)}
                                    style={{
                                        flex: 1,
                                        padding: '12px 16px',
                                        border: '1px solid var(--border-color)',
                                        borderRight: 'none',
                                        borderRadius: '8px 0 0 8px',
                                        background: !formData.is_goal ? 'linear-gradient(135deg, #3b82f615, #3b82f608)' : 'white',
                                        borderColor: !formData.is_goal ? '#3b82f640' : 'var(--border-color)',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        fontWeight: !formData.is_goal ? 600 : 400,
                                        color: !formData.is_goal ? '#3b82f6' : 'var(--text-secondary)',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <DollarSign size={18} />
                                    Oportunidade Real
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleGoalToggle(true)}
                                    style={{
                                        flex: 1,
                                        padding: '12px 16px',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '0 8px 8px 0',
                                        background: formData.is_goal ? 'linear-gradient(135deg, #f59e0b15, #f59e0b08)' : 'white',
                                        borderColor: formData.is_goal ? '#f59e0b40' : 'var(--border-color)',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        fontWeight: formData.is_goal ? 600 : 400,
                                        color: formData.is_goal ? '#f59e0b' : 'var(--text-secondary)',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <Target size={18} />
                                    Oportunidade Meta
                                </button>
                            </div>
                        </div>

                        {/* Fixed Fields */}
                        <div className="input-group" style={{ marginBottom: '1rem' }}>
                            <label className="label">Título da {formData.is_goal ? 'Meta' : 'Oportunidade'} *</label>
                            <input
                                name="title"
                                type="text"
                                className="input"
                                placeholder={formData.is_goal ? 'Ex: Meta Q1 2026, Meta Anual 2026...' : 'Ex: Projeto de Consultoria, Contrato de Manutenção...'}
                                value={formData.title}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        {/* Tags Field */}
                        <div className="input-group" style={{ marginBottom: '1rem' }}>
                            <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Tag size={14} />
                                Tags
                            </label>
                            <div ref={tagRef} style={{ position: 'relative' }}>
                                <div style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: '6px',
                                    padding: '8px',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '8px',
                                    minHeight: '42px',
                                    background: 'white'
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
                                                fontSize: '0.85rem'
                                            }}
                                        >
                                            {tag}
                                            <button
                                                type="button"
                                                onClick={() => removeTag(tag)}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    color: 'white',
                                                    cursor: 'pointer',
                                                    padding: '0 2px',
                                                    display: 'flex'
                                                }}
                                            >
                                                <X size={12} />
                                            </button>
                                        </span>
                                    ))}
                                    <input
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
                                        placeholder={selectedTags.length === 0 ? 'Digite para adicionar tags...' : ''}
                                        style={{
                                            border: 'none',
                                            outline: 'none',
                                            flex: 1,
                                            minWidth: '120px',
                                            padding: '4px'
                                        }}
                                    />
                                </div>
                                {showTagDropdown && tagInput && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '100%',
                                        left: 0,
                                        right: 0,
                                        background: 'white',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '8px',
                                        marginTop: '4px',
                                        maxHeight: '200px',
                                        overflowY: 'auto',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                        zIndex: 1000
                                    }}>
                                        {filteredAvailableTags.length > 0 && (
                                            <>
                                                {filteredAvailableTags.map(tag => (
                                                    <div
                                                        key={tag.id}
                                                        onClick={() => addTag(tag.name)}
                                                        style={{
                                                            padding: '8px 12px',
                                                            cursor: 'pointer',
                                                            borderBottom: '1px solid var(--border-color)'
                                                        }}
                                                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                                                        onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                                                    >
                                                        {tag.name}
                                                        <button
                                                            onClick={(e) => handleDeleteTag(tag.id, tag.name, e)}
                                                            style={{
                                                                background: 'none',
                                                                border: 'none',
                                                                cursor: 'pointer',
                                                                padding: '4px',
                                                                color: 'var(--text-tertiary)',
                                                                marginLeft: 'auto',
                                                                display: 'flex',
                                                                alignItems: 'center'
                                                            }}
                                                            title="Excluir tag"
                                                            onMouseEnter={(e) => e.target.style.color = 'var(--color-danger)'}
                                                            onMouseLeave={(e) => e.target.style.color = 'var(--text-tertiary)'}
                                                        >
                                                            <Trash size={12} />
                                                        </button>
                                                    </div>
                                                ))}
                                                <div style={{ borderTop: '1px solid var(--border-color)', margin: '4px 0' }}></div>
                                            </>
                                        )}
                                        <div
                                            onClick={() => addTag(tagInput)}
                                            style={{
                                                padding: '8px 12px',
                                                cursor: 'pointer',
                                                color: 'var(--color-primary)',
                                                fontWeight: 600
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                                        >
                                            + Criar tag "{tagInput}"
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Client, Stage, Responsible (only for non-goals) */}
                        {!formData.is_goal && (
                            <>
                                <div className={styles.formGrid}>
                                    <div className="input-group">
                                        <label className="label">Cliente / Empresa *</label>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <div ref={searchRef} style={{ flex: 1, position: 'relative', minWidth: '350px' }}>
                                                <div style={{ position: 'relative' }}>
                                                    <Search size={18} style={{
                                                        position: 'absolute',
                                                        left: '12px',
                                                        top: '50%',
                                                        transform: 'translateY(-50%)',
                                                        color: '#666',
                                                        pointerEvents: 'none'
                                                    }} />
                                                    <input
                                                        type="text"
                                                        className="input"
                                                        placeholder="Buscar cliente..."
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
                                                        background: 'white',
                                                        border: '1px solid var(--border-color)',
                                                        borderRadius: '8px',
                                                        marginTop: '4px',
                                                        maxHeight: '300px',
                                                        overflowY: 'auto',
                                                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                                        zIndex: 1000
                                                    }}>
                                                        {filteredClients.length === 0 ? (
                                                            <div style={{ padding: '1rem', textAlign: 'center', color: '#666' }}>
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
                                                                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                                                                    onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                                                                >
                                                                    <div style={{ fontWeight: 500 }}>
                                                                        {client.name}
                                                                    </div>
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

                                    <div className="input-group">
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

                                    <div className="input-group">
                                        <label className="label">Responsável</label>
                                        <input
                                            name="responsible"
                                            className="input"
                                            value={formData.responsible}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        <div className="input-group">
                            <label className="label">Observações</label>
                            <textarea
                                name="notes"
                                className="input"
                                rows="2"
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
                            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
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
                                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                            <input
                                                                type="date"
                                                                className="input"
                                                                style={{ padding: '6px 8px', fontSize: '0.9rem' }}
                                                                value={forecast.period_start}
                                                                onChange={(e) => updateForecast(index, 'period_start', e.target.value)}
                                                                required
                                                            />
                                                            <span style={{ color: 'var(--text-secondary)' }}>até</span>
                                                            <input
                                                                type="date"
                                                                className="input"
                                                                style={{ padding: '6px 8px', fontSize: '0.9rem' }}
                                                                value={forecast.period_end}
                                                                onChange={(e) => updateForecast(index, 'period_end', e.target.value)}
                                                                required
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div style={{ display: 'flex', gap: '8px' }}>
                                                            <select
                                                                className="input"
                                                                style={{ padding: '6px 8px', fontSize: '0.9rem' }}
                                                                value={
                                                                    // Try to infer current Q from dates if not explicit
                                                                    forecast.quarter || ''
                                                                }
                                                                onChange={(e) => {
                                                                    const yearSelect = document.getElementById(`year-${index}`);
                                                                    const year = yearSelect?.value || new Date().getFullYear();
                                                                    updateForecast(index, 'quarter', { year: parseInt(year), quarter: e.target.value });
                                                                    // Store the explicit Q selection in state so it persists in UI
                                                                    const newForecasts = [...forecasts];
                                                                    newForecasts[index].quarter = e.target.value;
                                                                    newForecasts[index].year = parseInt(year);
                                                                    setForecasts(newForecasts);
                                                                }}
                                                            >
                                                                <option value="">Selecione...</option>
                                                                <option value="Q1">Q1 (Jan-Mar)</option>
                                                                <option value="Q2">Q2 (Abr-Jun)</option>
                                                                <option value="Q3">Q3 (Jul-Set)</option>
                                                                <option value="Q4">Q4 (Out-Dez)</option>
                                                            </select>
                                                            <select
                                                                id={`year-${index}`}
                                                                className="input"
                                                                style={{ padding: '6px 8px', fontSize: '0.9rem', width: '80px' }}
                                                                value={forecast.year || new Date().getFullYear()}
                                                                onChange={(e) => {
                                                                    const newForecasts = [...forecasts];
                                                                    newForecasts[index].year = parseInt(e.target.value);
                                                                    setForecasts(newForecasts);

                                                                    // Update dates if quarter is already selected
                                                                    if (forecast.quarter) {
                                                                        updateForecast(index, 'quarter', { year: parseInt(e.target.value), quarter: forecast.quarter });
                                                                    }
                                                                }}
                                                            >
                                                                {[...Array(5)].map((_, i) => {
                                                                    const year = new Date().getFullYear() + i;
                                                                    return <option key={year} value={year}>{year}</option>;
                                                                })}
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
                                                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: formData.is_goal ? 'not-allowed' : 'pointer', fontSize: '0.9rem', opacity: formData.is_goal ? 0.5 : 1 }}>
                                                            <input
                                                                type="checkbox"
                                                                checked={formData.is_goal ? false : forecast.invoiced}
                                                                onChange={(e) => !formData.is_goal && updateForecast(index, 'invoiced', e.target.checked)}
                                                                style={{ width: '16px', height: '16px', cursor: formData.is_goal ? 'not-allowed' : 'pointer' }}
                                                                disabled={formData.is_goal}
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
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
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
