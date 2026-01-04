import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Search } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useStageContext } from '../../contexts/StageContext';
import { opportunityService } from '../../services/opportunityService';
import { settingsService } from '../../services/settingsService';
import { clientService } from '../../services/clientService';
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
        if (!value) return '';
        const numValue = parseFloat(value);
        if (isNaN(numValue)) return '';
        return numValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const handleCurrencyChange = (e) => {
        const { name, value } = e.target;
        // Remove everything that is not a digit
        const onlyDigits = value.replace(/\D/g, '');

        if (onlyDigits === '') {
            setFormData(prev => ({ ...prev, [name]: '' }));
            return;
        }

        // Convert to float (divide by 100) to treat as cents
        const numericValue = parseFloat(onlyDigits) / 100;
        setFormData(prev => ({ ...prev, [name]: numericValue.toFixed(2) }));
    };

    // Form State
    const [formData, setFormData] = useState({
        title: '',
        client_id: '',
        client_name: '',
        estimated_value: '',
        stage: stages.length > 0 ? stages[0].name : 'Pipeline',
        forecast_date: '',
        responsible: '',
        notes: '',
        invoiced: false,
        custom_data: {},
        is_recurring: false,
        recurrence_months: '',
        growth_type: '', // 'percentage' ou 'value'
        growth_value: ''
    });

    useEffect(() => {
        loadCustomFields();
        loadClients();
        if (opportunity) {
            setFormData({
                title: opportunity.title || '',
                client_id: opportunity.client_id || '',
                client_name: opportunity.client_name || '',
                estimated_value: opportunity.estimated_value,
                stage: opportunity.stage,
                forecast_date: opportunity.forecast_date,
                responsible: opportunity.responsible || '',
                notes: opportunity.notes || '',
                invoiced: opportunity.invoiced || false,
                custom_data: opportunity.custom_data || {}
            });
            setSearchTerm(opportunity.client_name || '');
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

    // Função auxiliar para adicionar meses a uma data
    const addMonthsToDate = (dateString, months) => {
        const date = new Date(dateString);
        date.setMonth(date.getMonth() + months);
        return date.toISOString().split('T')[0];
    };

    // Função para calcular o valor com crescimento
    // monthIndex: 0 = primeiro mês (sem crescimento), 1 = segundo mês (primeiro crescimento), etc.
    const calculateGrowthValue = (baseValue, monthIndex, growthType, growthValue) => {
        if (!growthType || !growthValue || growthValue <= 0 || monthIndex === 0) {
            return baseValue;
        }

        const base = parseFloat(baseValue);
        const growth = parseFloat(growthValue);

        if (growthType === 'percentage') {
            // Crescimento percentual composto: aumenta X% a cada mês a partir do segundo mês
            // Ex: 10% ao mês, base R$ 1000
            // Mês 1 (i=0): R$ 1000 (sem crescimento)
            // Mês 2 (i=1): R$ 1000 * 1.10 = R$ 1100
            // Mês 3 (i=2): R$ 1000 * 1.10^2 = R$ 1210
            return (base * Math.pow(1 + (growth / 100), monthIndex)).toFixed(2);
        } else if (growthType === 'value') {
            // Crescimento em valor fixo: aumenta X reais a cada mês a partir do segundo mês
            // Ex: R$ 100 ao mês, base R$ 1000
            // Mês 1 (i=0): R$ 1000 (sem crescimento)
            // Mês 2 (i=1): R$ 1000 + R$ 100 = R$ 1100
            // Mês 3 (i=2): R$ 1000 + (R$ 100 * 2) = R$ 1200
            return (base + (growth * monthIndex)).toFixed(2);
        }

        return baseValue;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validação adicional
        if (!formData.client_id || !formData.client_name) {
            alert('Por favor, selecione um cliente da lista.');
            return;
        }

        // Validação de recorrência
        if (formData.is_recurring) {
            if (!formData.forecast_date) {
                alert('Por favor, informe a data de previsão antes de marcar a recorrência.');
                return;
            }
            if (!formData.recurrence_months || formData.recurrence_months <= 0) {
                alert('Por favor, informe a quantidade de meses para a recorrência.');
                return;
            }
            // Validação de crescimento (se informado)
            if (formData.growth_type && (!formData.growth_value || formData.growth_value <= 0)) {
                alert('Por favor, informe o valor do crescimento mensal.');
                return;
            }
        }

        setLoading(true);
        try {
            console.log('Salvando oportunidade com dados:', formData);

            const { is_recurring, recurrence_months, ...opportunityData } = formData;

            if (opportunity) {
                // Edição: atualizar oportunidade original
                const result = await opportunityService.updateOpportunity(opportunity.id, opportunityData);
                console.log('Oportunidade atualizada:', result);
            } else {
                // Criação: criar oportunidade original
                const result = await opportunityService.createOpportunity(user.id, opportunityData);
                console.log('Oportunidade criada:', result);
            }

            // Se for recorrente, criar oportunidades futuras (tanto na criação quanto na edição)
            if (is_recurring && recurrence_months && recurrence_months > 0) {
                const months = parseInt(recurrence_months, 10);
                const baseDate = formData.forecast_date;
                const baseValue = parseFloat(formData.estimated_value);
                const growthType = formData.growth_type;
                const growthValue = formData.growth_value;

                // Criar oportunidades para cada mês, começando a partir da data de previsão
                // i=0 = primeiro mês (mesma data), i=1 = segundo mês, etc.
                for (let i = 1; i < months; i++) {
                    const futureDate = addMonthsToDate(baseDate, i);
                    // O crescimento começa a partir do segundo mês (i=1), então passamos i como monthIndex
                    const calculatedValue = calculateGrowthValue(baseValue, i, growthType, growthValue);

                    const recurringOpportunity = {
                        ...opportunityData,
                        forecast_date: futureDate,
                        estimated_value: calculatedValue
                    };

                    try {
                        await opportunityService.createOpportunity(user.id, recurringOpportunity);
                        console.log(`Oportunidade recorrente criada para o mês ${i + 1}:`, futureDate, `Valor: R$ ${calculatedValue}`);
                    } catch (recurringError) {
                        console.error(`Erro ao criar oportunidade recorrente para o mês ${i + 1}:`, recurringError);
                        // Continua criando as outras mesmo se uma falhar
                    }
                }
            }
            onSave();
            onClose();
        } catch (error) {
            console.error('Erro completo ao salvar oportunidade:', error);
            console.error('Detalhes do erro:', error.message, error.details, error.hint);

            let errorMessage = 'Erro ao salvar oportunidade.';
            if (error.message) {
                errorMessage += '\n' + error.message;
            }
            if (error.details) {
                errorMessage += '\nDetalhes: ' + error.details;
            }
            if (error.hint) {
                errorMessage += '\nDica: ' + error.hint;
            }

            alert(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modal}>
                <div className={styles.modalHeader}>
                    <h3>{opportunity ? 'Editar Oportunidade' : 'Nova Oportunidade'}</h3>
                    <button className={styles.closeBtn} onClick={onClose}><X size={24} /></button>
                </div>

                <form onSubmit={handleSubmit} className={styles.modalForm}>
                    <div className={styles.modalBody}>
                        {/* Fixed Fields */}
                        <div className="input-group" style={{ marginBottom: '1rem' }}>
                            <label className="label">Título da Oportunidade *</label>
                            <input
                                name="title"
                                type="text"
                                className="input"
                                placeholder="Ex: Projeto de Consultoria, Contrato de Manutenção..."
                                value={formData.title}
                                onChange={handleChange}
                                required
                            />
                        </div>

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
                                                    // Limpa client_id se o usuário começar a digitar
                                                    if (formData.client_id) {
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            client_id: '',
                                                            client_name: ''
                                                        }));
                                                    }
                                                }}
                                                onFocus={() => setShowDropdown(true)}
                                                readOnly={false}
                                                required
                                                style={{
                                                    paddingLeft: '40px'
                                                }}
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
                                <label className="label">Valor Estimado (R$) *</label>
                                <div style={{ position: 'relative' }}>
                                    <span style={{
                                        position: 'absolute',
                                        left: '12px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        color: 'var(--text-secondary)',
                                        pointerEvents: 'none',
                                        fontWeight: 500
                                    }}>R$</span>
                                    <input
                                        name="estimated_value"
                                        type="text"
                                        className="input"
                                        style={{ paddingLeft: '40px' }}
                                        value={formatCurrency(formData.estimated_value)}
                                        onChange={handleCurrencyChange}
                                        placeholder="0,00"
                                        required
                                    />
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
                                <label className="label">Data de Previsão *</label>
                                <input
                                    name="forecast_date"
                                    type="date"
                                    className="input"
                                    value={formData.forecast_date}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        {/* Recorrência - Exatamente abaixo da data de previsão */}
                        <div className="input-group" style={{ marginTop: '1rem' }}>
                            <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={formData.is_recurring}
                                    disabled={!formData.forecast_date}
                                    onChange={(e) => {
                                        if (!formData.forecast_date) {
                                            alert('Por favor, informe a data de previsão antes de marcar a recorrência.');
                                            return;
                                        }
                                        setFormData(prev => ({
                                            ...prev,
                                            is_recurring: e.target.checked,
                                            recurrence_months: e.target.checked ? prev.recurrence_months : '',
                                            growth_type: e.target.checked ? prev.growth_type : '',
                                            growth_value: e.target.checked ? prev.growth_value : ''
                                        }));
                                    }}
                                    style={{ cursor: formData.forecast_date ? 'pointer' : 'not-allowed', width: '18px', height: '18px' }}
                                />
                                <span>Recorrência (em meses)</span>
                            </label>
                            {!formData.forecast_date && (
                                <small style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
                                    Informe a data de previsão para habilitar a recorrência.
                                </small>
                            )}
                            {formData.is_recurring && (
                                <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <div>
                                        <input
                                            name="recurrence_months"
                                            type="number"
                                            className="input"
                                            placeholder="Quantidade de meses"
                                            value={formData.recurrence_months}
                                            onChange={handleChange}
                                            min="1"
                                            max="60"
                                            required={formData.is_recurring}
                                            style={{ maxWidth: '200px' }}
                                        />
                                    </div>

                                    {/* Crescimento Mensal */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <label className="label" style={{ fontSize: '0.9rem', fontWeight: 500 }}>
                                            Crescimento Mensal (opcional)
                                        </label>
                                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                                            <select
                                                name="growth_type"
                                                className="input"
                                                value={formData.growth_type}
                                                onChange={handleChange}
                                                style={{ maxWidth: '150px' }}
                                            >
                                                <option value="">Sem crescimento</option>
                                                <option value="percentage">Percentual (%)</option>
                                                <option value="value">Valor fixo (R$)</option>
                                            </select>

                                            {formData.growth_type && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    {formData.growth_type === 'percentage' ? (
                                                        <>
                                                            <input
                                                                name="growth_value"
                                                                type="number"
                                                                className="input"
                                                                placeholder="Ex: 10"
                                                                value={formData.growth_value}
                                                                onChange={handleChange}
                                                                min="0"
                                                                step="0.01"
                                                                style={{ maxWidth: '120px' }}
                                                            />
                                                            <span style={{ color: 'var(--text-secondary)' }}>%</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <span style={{ color: 'var(--text-secondary)' }}>R$</span>
                                                            <input
                                                                name="growth_value"
                                                                type="number"
                                                                className="input"
                                                                placeholder="Ex: 1000"
                                                                value={formData.growth_value}
                                                                onChange={handleChange}
                                                                min="0"
                                                                step="0.01"
                                                                style={{ maxWidth: '120px' }}
                                                            />
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        {formData.growth_type && (
                                            <small style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                                {formData.growth_type === 'percentage'
                                                    ? `O valor aumentará ${formData.growth_value || 0}% a cada mês a partir do segundo mês.`
                                                    : `O valor aumentará R$ ${formData.growth_value || 0} a cada mês a partir do segundo mês.`
                                                }
                                            </small>
                                        )}
                                    </div>

                                    <small style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
                                        A oportunidade será duplicada automaticamente para cada mês informado, iniciando a partir da data de previsão.
                                    </small>
                                </div>
                            )}
                        </div>

                        <div className={styles.formGrid}>
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

                        <div className="input-group">
                            <label className="label">Observações</label>
                            <textarea
                                name="notes"
                                className="input"
                                rows="3"
                                value={formData.notes}
                                onChange={handleChange}
                            />
                        </div>



                        {/* Invoiced Field - Only show if stage is Deal */}
                        {formData.stage === 'Deal' && (
                            <div className="input-group">
                                <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={formData.invoiced}
                                        onChange={(e) => setFormData(prev => ({ ...prev, invoiced: e.target.checked }))}
                                        style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                                    />
                                    <span>Faturado</span>
                                </label>
                                <small style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
                                    Marque se o contrato já foi faturado
                                </small>
                            </div>
                        )}

                        {/* Custom Fields */}
                        {customFields.length > 0 && (
                            <>
                                <h4 className={styles.sectionSubtitle}>Informações Adicionais</h4>
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
