import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Users, Mail, Phone, Building2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { clientService } from '../../services/clientService';
import ClientForm from './ClientForm';
import ClientView from './ClientView';
import styles from './Clients.module.css';

const Clients = () => {
    const { user } = useAuth();
    const [clients, setClients] = useState([]);
    const [filteredClients, setFilteredClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [editingClient, setEditingClient] = useState(null);
    const [viewingClient, setViewingClient] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedClient, setExpandedClient] = useState(null);

    useEffect(() => {
        if (user) {
            loadClients();
        }
    }, [user]);

    useEffect(() => {
        if (searchTerm) {
            const filtered = clients.filter(client =>
                client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                client.document?.includes(searchTerm) ||
                client.contacts?.some(contact =>
                    contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    contact.phone?.includes(searchTerm)
                )
            );
            setFilteredClients(filtered);
        } else {
            setFilteredClients(clients);
        }
    }, [searchTerm, clients]);

    const loadClients = async () => {
        try {
            const data = await clientService.getClients(user.id);
            setClients(data || []);
            setFilteredClients(data || []);
        } catch (error) {
            console.error('Error loading clients:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (client = null) => {
        setEditingClient(client);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingClient(null);
    };

    const handleSave = () => {
        loadClients();
        handleCloseModal();
    };

    const handleDelete = async (client) => {
        const message = client.contacts?.length > 0
            ? `Tem certeza que deseja excluir a empresa "${client.name}" e todos os seus ${client.contacts.length} representante(s)?`
            : `Tem certeza que deseja excluir a empresa "${client.name}"?`;

        if (window.confirm(message)) {
            try {
                const result = await clientService.deleteClient(client.id);

                if (result.deleted === 'logical') {
                    alert('A empresa possui oportunidades vinculadas e foi marcada como inativa.');
                } else {
                    alert('Empresa excluída com sucesso.');
                }

                loadClients();
            } catch (error) {
                console.error('Erro ao excluir empresa:', error);
                alert('Erro ao excluir empresa. Tente novamente.');
            }
        }
    };

    const toggleExpanded = (clientId) => {
        setExpandedClient(expandedClient === clientId ? null : clientId);
    };

    const getPrimaryContact = (contacts) => {
        return contacts?.find(c => c.is_primary) || contacts?.[0];
    };

    if (loading) return <div className={styles.loading}>Carregando...</div>;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>
                        <Building2 size={28} />
                        Cadastro de Clientes
                    </h1>
                    <p className={styles.subtitle}>
                        Gerencie suas empresas e representantes
                    </p>
                </div>
                <button className="btn btn-primary" onClick={() => handleOpenModal()}>
                    <Plus size={16} />
                    Nova Empresa
                </button>
            </div>

            <div className={styles.searchBar}>
                <div className={styles.searchInputWrapper}>
                    <Search size={18} className={styles.searchIcon} />
                    <input
                        type="text"
                        className={styles.searchInput}
                        placeholder="Buscar por empresa, representante, email ou telefone..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className={styles.clientsGrid}>
                {filteredClients.length === 0 ? (
                    <div className={styles.emptyState}>
                        <Building2 size={48} />
                        <p>{searchTerm ? 'Nenhuma empresa encontrada com os critérios de busca.' : 'Nenhuma empresa cadastrada ainda.'}</p>
                        {!searchTerm && (
                            <button className="btn btn-primary" onClick={() => handleOpenModal()}>
                                <Plus size={16} />
                                Cadastrar Primeira Empresa
                            </button>
                        )}
                    </div>
                ) : (
                    filteredClients.map(client => {
                        const primaryContact = getPrimaryContact(client.contacts);
                        const isExpanded = expandedClient === client.id;

                        return (
                            <div
                                key={client.id}
                                className={styles.clientCard}
                                onClick={() => {
                                    setViewingClient(client);
                                    setShowViewModal(true);
                                }}
                                style={{ cursor: 'pointer' }}
                            >
                                <div className={styles.cardHeader}>
                                    <div className={styles.cardHeaderLeft}>
                                        <Building2 size={20} className={styles.companyIcon} />
                                        <div>
                                            <h3 className={styles.companyName}>{client.name}</h3>
                                            {client.document && (
                                                <span className={styles.document}>{client.document}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className={styles.cardActions}>
                                        <button
                                            className={styles.actionBtn}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleOpenModal(client);
                                            }}
                                            title="Editar empresa"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            className={`${styles.actionBtn} ${styles.danger}`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(client);
                                            }}
                                            title="Excluir empresa"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                {primaryContact && (
                                    <div className={styles.primaryContact}>
                                        <div className={styles.contactBadge}>Contato Principal</div>
                                        <div className={styles.contactInfo}>
                                            <strong>{primaryContact.name}</strong>
                                            {primaryContact.position && (
                                                <span className={styles.position}> - {primaryContact.position}</span>
                                            )}
                                        </div>
                                        <div className={styles.contactDetails}>
                                            {primaryContact.email && (
                                                <div className={styles.contactDetail}>
                                                    <Mail size={14} />
                                                    <span>{primaryContact.email}</span>
                                                </div>
                                            )}
                                            {primaryContact.phone && (
                                                <div className={styles.contactDetail}>
                                                    <Phone size={14} />
                                                    <span>{primaryContact.phone}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {client.contacts && client.contacts.length > 1 && (
                                    <div className={styles.moreContacts}>
                                        <button
                                            className={styles.toggleContacts}
                                            onClick={() => toggleExpanded(client.id)}
                                        >
                                            <Users size={14} />
                                            {isExpanded ? 'Ocultar' : 'Mostrar'} outros {client.contacts.length - 1} representante(s)
                                        </button>

                                        {isExpanded && (
                                            <div className={styles.otherContacts}>
                                                {client.contacts
                                                    .filter(c => !c.is_primary)
                                                    .map(contact => (
                                                        <div key={contact.id} className={styles.otherContact}>
                                                            <div className={styles.contactInfo}>
                                                                <strong>{contact.name}</strong>
                                                                {contact.position && (
                                                                    <span className={styles.position}> - {contact.position}</span>
                                                                )}
                                                            </div>
                                                            <div className={styles.contactDetails}>
                                                                {contact.email && (
                                                                    <div className={styles.contactDetail}>
                                                                        <Mail size={14} />
                                                                        <span>{contact.email}</span>
                                                                    </div>
                                                                )}
                                                                {contact.phone && (
                                                                    <div className={styles.contactDetail}>
                                                                        <Phone size={14} />
                                                                        <span>{contact.phone}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {client.address && (
                                    <div className={styles.address}>
                                        <strong>Endereço:</strong> {client.address}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {showModal && (
                <ClientForm
                    client={editingClient}
                    onClose={handleCloseModal}
                    onSave={handleSave}
                />
            )}

            {showViewModal && viewingClient && (
                <ClientView
                    client={viewingClient}
                    onClose={() => {
                        setShowViewModal(false);
                        setViewingClient(null);
                    }}
                    onEdit={(client) => {
                        setEditingClient(client);
                        setShowModal(true);
                        setShowViewModal(false);
                    }}
                    onDelete={handleDelete}
                />
            )}
        </div>
    );
};

export default Clients;
