import React, { useState, useEffect } from 'react';
import { Plus, User, Mail, Calendar, Shield, Edit2, Trash2, X } from 'lucide-react';
import { userService } from '../../services/userService';
import UserForm from './UserForm';
import styles from '../settings/Settings.module.css'; // Reusing settings styles

const UserList = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editUser, setEditUser] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            setLoading(true);
            const data = await userService.getUsers();
            setUsers(data);
        } catch (err) {
            setError('Erro ao carregar usuários: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSuccess = () => {
        setShowForm(false);
        setEditUser(null);
        loadUsers();
    };

    const handleEdit = (user) => {
        setEditUser(user);
        setShowForm(true);
    };

    const handleDeleteClick = (user) => {
        setDeleteConfirm(user);
    };

    const handleDeleteConfirm = async () => {
        if (!deleteConfirm) return;

        try {
            await userService.deleteUser(deleteConfirm.id);
            setDeleteConfirm(null);
            loadUsers();
        } catch (err) {
            setError('Erro ao excluir usuário: ' + err.message);
            setDeleteConfirm(null);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="container">
            <div className="page-header">
                <h1 className="page-title">Usuários</h1>
                <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                    <Plus size={20} />
                    Novo Usuário
                </button>
            </div>

            {error && <div className={`${styles.alert} ${styles.error}`}>{error}</div>}

            {loading ? (
                <div>Carregando...</div>
            ) : (
                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Nome</th>
                                <th>Email</th>
                                <th>Função</th>
                                <th>Data de Criação</th>
                                <th style={{ width: '120px', textAlign: 'center' }}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => (
                                <tr
                                    key={user.id}
                                    onClick={() => handleEdit(user)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <User size={16} className="text-secondary" />
                                            {user.name || 'Sem nome'}
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Mail size={16} className="text-secondary" />
                                            {user.email}
                                        </div>
                                    </td>
                                    <td>
                                        <span className={styles.badge} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                            <Shield size={12} />
                                            {user.role === 'admin' ? 'Administrador' : 'Usuário'}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Calendar size={16} className="text-secondary" />
                                            {formatDate(user.created_at)}
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                            <button
                                                className="btn btn-icon"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleEdit(user);
                                                }}
                                                title="Editar usuário"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                className="btn btn-icon btn-danger"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteClick(user);
                                                }}
                                                title="Excluir usuário"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {users.length === 0 && (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>
                                        Nenhum usuário encontrado.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {showForm && (
                <UserForm
                    onClose={() => {
                        setShowForm(false);
                        setEditUser(null);
                    }}
                    onSuccess={handleSuccess}
                    editUser={editUser}
                />
            )}

            {deleteConfirm && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal} style={{ maxWidth: '400px' }}>
                        <div className={styles.modalHeader}>
                            <h3>Confirmar Exclusão</h3>
                            <button className={styles.closeBtn} onClick={() => setDeleteConfirm(null)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className={styles.modalBody}>
                            <p>Tem certeza que deseja excluir o usuário <strong>{deleteConfirm.name}</strong>?</p>
                            <p style={{ marginTop: '1rem', color: 'var(--color-danger)' }}>
                                <strong>Atenção:</strong> Esta ação não pode ser desfeita.
                            </p>
                        </div>
                        <div className={styles.modalFooter}>
                            <button
                                className="btn btn-secondary"
                                onClick={() => setDeleteConfirm(null)}
                            >
                                Cancelar
                            </button>
                            <button
                                className="btn btn-danger"
                                onClick={handleDeleteConfirm}
                            >
                                <Trash2 size={16} />
                                Excluir
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserList;
