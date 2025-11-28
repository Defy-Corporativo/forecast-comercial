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

    // Form State
    const [formData, setFormData] = useState({
        client_id: '',
        client_name: '',
        estimated_value: '',
        stage: stages.length > 0 ? stages[0].name : 'Pipeline',
        forecast_date: '',
        responsible: '',
        notes: '',
        invoiced: false,
        custom_data: {}
    });

    useEffect(() => {
        loadCustomFields();
        loadClients();
        if (opportunity) {
            setFormData({
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

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validação adicional
        if (!formData.client_id || !formData.client_name) {
            alert('Por favor, selecione um cliente da lista.');
            return;
        }

        setLoading(true);
        try {
            console.log('Salvando oportunidade com dados:', formData);

            if (opportunity) {
                const result = await opportunityService.updateOpportunity(opportunity.id, formData);
                console.log('Oportunidade atualizada:', result);
            } else {
                const result = await opportunityService.createOpportunity(user.id, formData);
                console.log('Oportunidade criada:', result);
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
                                <input
                                    name="estimated_value"
                                    type="number"
                                    step="0.01"
                                    className="input"
                                    value={formData.estimated_value}
                                    onChange={handleChange}
                                    required
                                />
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
