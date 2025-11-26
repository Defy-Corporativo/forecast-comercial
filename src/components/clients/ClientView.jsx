import React from 'react';
import { X, Edit2, Trash2, Mail, Phone, MapPin, FileText, User, Star } from 'lucide-react';
import styles from './Clients.module.css';

const ClientView = ({ client, onClose, onEdit, onDelete }) => {
    const primaryContact = client.contacts?.find(c => c.is_primary) || client.contacts?.[0];
    const otherContacts = client.contacts?.filter(c => !c.is_primary) || [];

    const handleEdit = () => {
        onEdit(client);
        onClose();
    };

    const handleDelete = () => {
        if (window.confirm(`Tem certeza que deseja excluir a empresa "${client.name}"?`)) {
            onDelete(client.id);
            onClose();
        }
    };

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
                <div className={styles.modalHeader}>
                    <h3>Detalhes da Empresa</h3>
                    <button className={styles.closeBtn} onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <div className={styles.modalBody}>
                    {/* Company Info */}
                    <div style={{ marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
                        <h4 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem', color: 'var(--text-primary)' }}>
                            {client.name}
                        </h4>

                        {client.document && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                                <FileText size={16} />
                                <span>CNPJ/CPF: {client.document}</span>
                            </div>
                        )}

                        {client.address && (
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                                <MapPin size={16} style={{ marginTop: '2px' }} />
                                <span>{client.address}</span>
                            </div>
                        )}

                        {client.notes && (
                            <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                <strong style={{ color: 'var(--text-primary)' }}>Observações:</strong> {client.notes}
                            </div>
                        )}
                    </div>

                    {/* Primary Contact */}
                    {primaryContact && (
                        <div style={{ marginBottom: '1.5rem' }}>
                            <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Star size={16} fill="var(--color-primary)" color="var(--color-primary)" />
                                Contato Principal
                            </h4>
                            <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem' }}>
                                    <User size={16} color="var(--text-secondary)" />
                                    <strong style={{ color: 'var(--text-primary)' }}>{primaryContact.name}</strong>
                                    {primaryContact.position && (
                                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                            • {primaryContact.position}
                                        </span>
                                    )}
                                </div>
                                {primaryContact.email && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                        <Mail size={14} />
                                        <span>{primaryContact.email}</span>
                                    </div>
                                )}
                                {primaryContact.phone && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                        <Phone size={14} />
                                        <span>{primaryContact.phone}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Other Contacts */}
                    {otherContacts.length > 0 && (
                        <div>
                            <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', color: 'var(--text-primary)' }}>
                                Outros Representantes ({otherContacts.length})
                            </h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {otherContacts.map((contact, index) => (
                                    <div key={index} style={{ background: 'white', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem' }}>
                                            <User size={14} color="var(--text-secondary)" />
                                            <strong style={{ color: 'var(--text-primary)', fontSize: '0.95rem' }}>{contact.name}</strong>
                                            {contact.position && (
                                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                                    • {contact.position}
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.85rem' }}>
                                            {contact.email && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                                                    <Mail size={12} />
                                                    <span>{contact.email}</span>
                                                </div>
                                            )}
                                            {contact.phone && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                                                    <Phone size={12} />
                                                    <span>{contact.phone}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className={styles.modalFooter}>
                    <button className="btn btn-secondary" onClick={onClose}>
                        Fechar
                    </button>
                    <button className="btn btn-secondary" onClick={handleEdit}>
                        <Edit2 size={16} />
                        Editar
                    </button>
                    <button className="btn btn-danger" onClick={handleDelete}>
                        <Trash2 size={16} />
                        Excluir
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ClientView;
