import React from 'react';
import { X, Edit2, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { settingsService } from '../../services/settingsService';
import styles from './Opportunities.module.css';

const STAGES = ['Pipeline', 'Strong Upside', 'Committed', 'Deal', 'Lost'];

const OpportunityView = ({ opportunity, onClose, onEdit, onDelete }) => {
    const { user } = useAuth();
    const [customFields, setCustomFields] = React.useState([]);

    React.useEffect(() => {
        loadCustomFields();
    }, []);

    const loadCustomFields = async () => {
        try {
            const fields = await settingsService.getCustomFields(user.id);
            setCustomFields(fields);
        } catch (error) {
            console.error('Erro ao carregar campos personalizados:', error);
        }
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('pt-BR');
    };

    const handleEdit = () => {
        onEdit(opportunity);
        onClose();
    };

    const handleDelete = () => {
        if (window.confirm('Tem certeza que deseja excluir esta oportunidade?')) {
            onDelete(opportunity.id);
            onClose();
        }
    };

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h3>Detalhes da Oportunidade</h3>
                    <button className={styles.closeBtn} onClick={onClose}><X size={24} /></button>
                </div>

                <div className={styles.modalBody}>
                    <div className="input-group" style={{ marginBottom: '1rem' }}>
                        <label className="label">Título da Oportunidade</label>
                        <div className={styles.viewField} style={{ fontSize: '1.1rem', fontWeight: 500 }}>
                            {opportunity.title || '-'}
                        </div>
                    </div>

                    <div className={styles.formGrid}>
                        <div className="input-group">
                            <label className="label">Número da Oportunidade</label>
                            <div className={styles.viewField}>{opportunity.opportunity_number}</div>
                        </div>

                        <div className="input-group">
                            <label className="label">Cliente / Empresa</label>
                            <div className={styles.viewField}>
                                {opportunity.client?.name || opportunity.client_name}
                            </div>
                        </div>

                        <div className="input-group">
                            <label className="label">Valor Estimado (R$)</label>
                            <div className={styles.viewField}>{formatCurrency(opportunity.estimated_value)}</div>
                        </div>

                        <div className="input-group">
                            <label className="label">Estágio</label>
                            <div className={styles.viewField}>
                                <span className={styles.stageBadge}>{opportunity.stage}</span>
                            </div>
                        </div>

                        <div className="input-group">
                            <label className="label">Data de Previsão</label>
                            <div className={styles.viewField}>{formatDate(opportunity.forecast_date)}</div>
                        </div>

                        <div className="input-group">
                            <label className="label">Responsável</label>
                            <div className={styles.viewField}>{opportunity.responsible || '-'}</div>
                        </div>

                        <div className="input-group">
                            <label className="label">Data de Criação</label>
                            <div className={styles.viewField}>{formatDate(opportunity.creation_date)}</div>
                        </div>
                    </div>

                    {opportunity.notes && (
                        <div className="input-group">
                            <label className="label">Observações</label>
                            <div className={styles.viewField}>{opportunity.notes}</div>
                        </div>
                    )}

                    {customFields.length > 0 && opportunity.custom_data && (
                        <>
                            <h4 className={styles.sectionSubtitle}>Informações Adicionais</h4>
                            <div className={styles.formGrid}>
                                {customFields.map(field => {
                                    const value = opportunity.custom_data[field.field_name];
                                    if (!value && value !== false) return null;

                                    let displayValue;
                                    if (field.field_type === 'checkbox') {
                                        displayValue = value ? 'Sim' : 'Não';
                                    } else if (field.field_type === 'percentage') {
                                        displayValue = `${value}%`;
                                    } else if (field.field_type === 'currency') {
                                        displayValue = new Intl.NumberFormat('pt-BR', {
                                            style: 'currency',
                                            currency: 'BRL'
                                        }).format(value);
                                    } else {
                                        displayValue = String(value);
                                    }

                                    return (
                                        <div key={field.id} className="input-group">
                                            <label className="label">{field.field_name}</label>
                                            <div className={styles.viewField}>
                                                {displayValue}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>

                <div className={styles.modalFooter}>
                    <button type="button" className="btn btn-secondary" onClick={onClose}>
                        Fechar
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={handleEdit}>
                        <Edit2 size={16} />
                        Editar
                    </button>
                    <button type="button" className="btn btn-danger" onClick={handleDelete}>
                        <Trash2 size={16} />
                        Excluir
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OpportunityView;

