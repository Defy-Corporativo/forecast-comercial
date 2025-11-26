import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { settingsService } from '../../services/settingsService';
import styles from './Settings.module.css';

const CustomFields = () => {
    const { user } = useAuth();
    const [fields, setFields] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingField, setEditingField] = useState(null);

    // Form state
    const [fieldName, setFieldName] = useState('');
    const [fieldType, setFieldType] = useState('text');
    const [isRequired, setIsRequired] = useState(false);
    const [selectOptions, setSelectOptions] = useState('');

    useEffect(() => {
        if (user) {
            loadFields();
        }
    }, [user]);

    const loadFields = async () => {
        try {
            const data = await settingsService.getCustomFields(user.id);
            setFields(data || []);
        } catch (error) {
            console.error('Error loading fields:', error);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFieldName('');
        setFieldType('text');
        setIsRequired(false);
        setSelectOptions('');
        setEditingField(null);
    };

    const handleOpenModal = (field = null) => {
        if (field) {
            setEditingField(field);
            setFieldName(field.field_name);
            setFieldType(field.field_type);
            setIsRequired(field.is_required);
            setSelectOptions(field.select_options ? field.select_options.join(', ') : '');
        } else {
            resetForm();
        }
        setShowModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const fieldData = {
                field_name: fieldName,
                field_type: fieldType,
                is_required: isRequired,
                select_options: fieldType === 'select' ? selectOptions.split(',').map(s => s.trim()).filter(s => s) : null,
            };

            if (editingField) {
                await settingsService.updateCustomField(editingField.id, fieldData);
            } else {
                await settingsService.createCustomField(user.id, { ...fieldData, order_index: fields.length });
            }

            setShowModal(false);
            loadFields();
        } catch (error) {
            console.error('Erro ao salvar campo:', error);
            alert('Erro ao salvar campo');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Tem certeza que deseja excluir este campo?')) {
            try {
                await settingsService.deleteCustomField(id);
                loadFields();
            } catch (error) {
                console.error('Erro ao excluir campo:', error);
            }
        }
    };

    if (loading) return <div>Carregando...</div>;

    return (
        <div className="card">
            <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>Campos Personalizados</h3>
                <button className="btn btn-primary" onClick={() => handleOpenModal()}>
                    <Plus size={16} />
                    Adicionar Campo
                </button>
            </div>

            <div className={styles.fieldsList}>
                {fields.length === 0 ? (
                    <p className={styles.emptyState}>Nenhum campo personalizado definido ainda.</p>
                ) : (
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Nome</th>
                                <th>Tipo</th>
                                <th>Obrigatório</th>
                                <th>Opções</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {fields.map(field => (
                                <tr key={field.id}>
                                    <td>{field.field_name}</td>
                                    <td><span className={styles.badge}>{field.field_type}</span></td>
                                    <td>{field.is_required ? 'Sim' : 'Não'}</td>
                                    <td>{field.field_type === 'select' ? field.select_options?.join(', ') : '-'}</td>
                                    <td>
                                        <div className={styles.actions}>
                                            <button className={styles.actionBtn} onClick={() => handleOpenModal(field)}>
                                                <Edit2 size={16} />
                                            </button>
                                            <button className={`${styles.actionBtn} ${styles.danger}`} onClick={() => handleDelete(field.id)}>
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {showModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                        <div className={styles.modalHeader}>
                            <h3>{editingField ? 'Editar Campo' : 'Novo Campo Personalizado'}</h3>
                            <button className={styles.closeBtn} onClick={() => setShowModal(false)}>&times;</button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className={styles.modalBody}>
                                <div className="input-group">
                                    <label className="label">Nome do Campo</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={fieldName}
                                        onChange={(e) => setFieldName(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="input-group">
                                    <label className="label">Tipo</label>
                                    <select
                                        className="input"
                                        value={fieldType}
                                        onChange={(e) => setFieldType(e.target.value)}
                                    >
                                        <option value="text">Texto</option>
                                        <option value="number">Número</option>
                                        <option value="percentage">Percentual (%)</option>
                                        <option value="currency">Moeda (R$)</option>
                                        <option value="date">Data</option>
                                        <option value="select">Seleção (Dropdown)</option>
                                        <option value="checkbox">Checkbox</option>
                                    </select>
                                </div>

                                {fieldType === 'select' && (
                                    <div className="input-group">
                                        <label className="label">Opções (separadas por vírgula)</label>
                                        <input
                                            type="text"
                                            className="input"
                                            value={selectOptions}
                                            onChange={(e) => setSelectOptions(e.target.value)}
                                            placeholder="Opção 1, Opção 2, Opção 3"
                                            required
                                        />
                                    </div>
                                )}

                                <div className="input-group">
                                    <label className={styles.checkboxLabel}>
                                        <input
                                            type="checkbox"
                                            checked={isRequired}
                                            onChange={(e) => setIsRequired(e.target.checked)}
                                        />
                                        Campo Obrigatório
                                    </label>
                                </div>
                            </div>
                            <div className={styles.modalFooter}>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                                <button type="submit" className="btn btn-primary">Salvar Campo</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomFields;
