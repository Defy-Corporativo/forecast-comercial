import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Star } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { clientService } from '../../services/clientService';
import styles from './Clients.module.css';

const ClientForm = ({ client = null, onClose, onSave }) => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        document: '',
        notes: ''
    });

    // Contacts State
    const [contacts, setContacts] = useState([{
        id: null,
        name: '',
        email: '',
        phone: '',
        position: '',
        is_primary: true
    }]);

    useEffect(() => {
        if (client) {
            setFormData({
                name: client.name || '',
                address: client.address || '',
                document: client.document || '',
                notes: client.notes || ''
            });

            if (client.contacts && client.contacts.length > 0) {
                setContacts(client.contacts.map(c => ({
                    id: c.id,
                    name: c.name || '',
                    email: c.email || '',
                    phone: c.phone || '',
                    position: c.position || '',
                    is_primary: c.is_primary || false
                })));
            }
        }
    }, [client]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleContactChange = (index, field, value) => {
        const newContacts = [...contacts];
        newContacts[index][field] = value;
        setContacts(newContacts);
    };

    const handleSetPrimary = (index) => {
        const newContacts = contacts.map((contact, i) => ({
            ...contact,
            is_primary: i === index
        }));
        setContacts(newContacts);
    };

    const addContact = () => {
        setContacts([...contacts, {
            id: null,
            name: '',
            email: '',
            phone: '',
            position: '',
            is_primary: false
        }]);
    };

    const removeContact = (index) => {
        if (contacts.length === 1) {
            alert('Deve haver pelo menos um representante.');
            return;
        }
        const newContacts = contacts.filter((_, i) => i !== index);
        // If removed contact was primary, set first contact as primary
        if (contacts[index].is_primary && newContacts.length > 0) {
            newContacts[0].is_primary = true;
        }
        setContacts(newContacts);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Validate at least one contact has name
            const hasValidContact = contacts.some(c => c.name.trim() !== '');
            if (!hasValidContact) {
                alert('Adicione pelo menos um representante com nome.');
                setLoading(false);
                return;
            }

            // Ensure there's a primary contact
            const hasPrimary = contacts.some(c => c.is_primary);
            if (!hasPrimary && contacts.length > 0) {
                contacts[0].is_primary = true;
            }

            let clientId;

            if (client) {
                // Update existing client
                await clientService.updateClient(client.id, formData);
                clientId = client.id;
            } else {
                // Create new client
                const newClient = await clientService.createClient(user.id, formData);
                clientId = newClient.id;
            }

            // Handle contacts
            // For simplicity, we'll delete all existing contacts and recreate them
            // In production, you might want to do a more sophisticated diff/merge
            if (client && client.contacts) {
                // Delete old contacts
                for (const contact of client.contacts) {
                    await clientService.deleteContact(contact.id);
                }
            }

            // Create new contacts
            const validContacts = contacts.filter(c => c.name.trim() !== '');
            for (const contact of validContacts) {
                await clientService.createContact(clientId, {
                    name: contact.name,
                    email: contact.email || null,
                    phone: contact.phone || null,
                    position: contact.position || null,
                    is_primary: contact.is_primary
                });
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
                    <h3>{client ? 'Editar Empresa' : 'Nova Empresa'}</h3>
                    <button className={styles.closeBtn} onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className={styles.modalBody}>
                        {/* Company Information */}
                        <div style={{ marginBottom: '1.5rem' }}>
                            <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: 'var(--text-primary)' }}>
                                Informações da Empresa
                            </h4>

                            <div className="input-group">
                                <label className="label">Nome da Empresa *</label>
                                <input
                                    name="name"
                                    className="input"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="Nome da empresa"
                                    required
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
                                    placeholder="Informações adicionais sobre a empresa..."
                                />
                            </div>
                        </div>

                        {/* Contacts Section */}
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)' }}>
                                    Representantes
                                </h4>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={addContact}
                                    style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}
                                >
                                    <Plus size={14} />
                                    Adicionar Representante
                                </button>
                            </div>

                            {/* Container com scroll para representantes */}
                            <div style={{
                                maxHeight: '400px',
                                overflowY: 'auto',
                                paddingRight: '4px'
                            }}>
                                {contacts.map((contact, index) => (
                                <div
                                    key={index}
                                    style={{
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '8px',
                                        padding: '1rem',
                                        marginBottom: '1rem',
                                        background: contact.is_primary ? 'rgba(37, 99, 235, 0.05)' : 'white'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <span style={{ fontWeight: 500, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                                                Representante {index + 1}
                                            </span>
                                            {contact.is_primary && (
                                                <span style={{
                                                    background: 'var(--primary-color)',
                                                    color: 'white',
                                                    fontSize: '0.75rem',
                                                    padding: '0.2rem 0.6rem',
                                                    borderRadius: '10px',
                                                    fontWeight: 500
                                                }}>
                                                    Principal
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            {!contact.is_primary && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleSetPrimary(index)}
                                                    style={{
                                                        background: 'transparent',
                                                        border: '1px solid var(--border-color)',
                                                        padding: '0.4rem',
                                                        borderRadius: '6px',
                                                        cursor: 'pointer',
                                                        color: 'var(--text-secondary)',
                                                        display: 'flex',
                                                        alignItems: 'center'
                                                    }}
                                                    title="Definir como principal"
                                                >
                                                    <Star size={14} />
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => removeContact(index)}
                                                style={{
                                                    background: 'transparent',
                                                    border: '1px solid var(--border-color)',
                                                    padding: '0.4rem',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    color: '#dc2626',
                                                    display: 'flex',
                                                    alignItems: 'center'
                                                }}
                                                title="Remover representante"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                        <div className="input-group">
                                            <label className="label">Nome *</label>
                                            <input
                                                className="input"
                                                value={contact.name}
                                                onChange={(e) => handleContactChange(index, 'name', e.target.value)}
                                                placeholder="Nome do representante"
                                                required
                                            />
                                        </div>

                                        <div className="input-group">
                                            <label className="label">Cargo</label>
                                            <input
                                                className="input"
                                                value={contact.position}
                                                onChange={(e) => handleContactChange(index, 'position', e.target.value)}
                                                placeholder="Ex: Gerente, Diretor"
                                            />
                                        </div>

                                        <div className="input-group">
                                            <label className="label">Email</label>
                                            <input
                                                type="email"
                                                className="input"
                                                value={contact.email}
                                                onChange={(e) => handleContactChange(index, 'email', e.target.value)}
                                                placeholder="email@exemplo.com"
                                            />
                                        </div>

                                        <div className="input-group">
                                            <label className="label">Telefone</label>
                                            <input
                                                className="input"
                                                value={contact.phone}
                                                onChange={(e) => handleContactChange(index, 'phone', e.target.value)}
                                                placeholder="(11) 98765-4321"
                                            />
                                        </div>
                                    </div>
                                </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className={styles.modalFooter}>
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Cancelar
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Salvando...' : 'Salvar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ClientForm;
