import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { settingsService } from '../../services/settingsService';
import styles from './Settings.module.css';

const ClientForm = ({ client = null, onClose, onSave }) => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        address: '',
        document: '',
        notes: ''
    });

    useEffect(() => {
        if (client) {
            setFormData({
                name: client.name || '',
                email: client.email || '',
                phone: client.phone || '',
                address: client.address || '',
                document: client.document || '',
                notes: client.notes || ''
            });
        }
    }, [client]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (client) {
                await settingsService.updateClient(client.id, formData);
            } else {
                await settingsService.createClient(user.id, formData);
            }
            onSave();
        } catch (error) {
            console.error('Erro ao salvar cliente:', error);
            if (error.message?.includes('duplicate') || error.code === '23505') {
                alert('Já existe um cliente com este nome cadastrado.');
            } else {
                alert('Erro ao salvar cliente. Tente novamente.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modal}>
                <div className={styles.modalHeader}>
                    <h3>{client ? 'Editar Cliente' : 'Novo Cliente'}</h3>
                    <button className={styles.closeBtn} onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className={styles.modalBody}>
                        <div className={styles.formGrid}>
                            <div className="input-group">
                                <label className="label">Nome *</label>
                                <input
                                    name="name"
                                    className="input"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="Nome do cliente"
                                    required
                                />
                            </div>

                            <div className="input-group">
                                <label className="label">Email</label>
                                <input
                                    name="email"
                                    type="email"
                                    className="input"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="email@exemplo.com"
                                />
                            </div>

                            <div className="input-group">
                                <label className="label">Telefone</label>
                                <input
                                    name="phone"
                                    className="input"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    placeholder="(11) 98765-4321"
                                />
                            </div>

                            <div className="input-group">
                                <label className="label">CNPJ/CPF</label>
                                <input
                                    name="document"
                                    className="input"
                                    value={formData.document}
                                    onChange={handleChange}
                                    placeholder="00.000.000/0000-00"
                                />
                            </div>
                        </div>

                        <div className="input-group">
                            <label className="label">Endereço</label>
                            <input
                                name="address"
                                className="input"
                                value={formData.address}
                                onChange={handleChange}
                                placeholder="Rua, número, cidade, estado"
                            />
                        </div>

                        <div className="input-group">
                            <label className="label">Observações</label>
                            <textarea
                                name="notes"
                                className="input"
                                rows="3"
                                value={formData.notes}
                                onChange={handleChange}
                                placeholder="Informações adicionais sobre o cliente..."
                            />
                        </div>
                    </div>

                    <div className={styles.modalFooter}>
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Cancelar
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Salvando...' : 'Salvar Cliente'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ClientForm;
