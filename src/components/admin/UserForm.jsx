import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { userService } from '../../services/userService';
import styles from '../settings/Settings.module.css'; // Reusing settings styles for consistency

const UserForm = ({ onClose, onSuccess, editUser = null }) => {
    const isEditMode = !!editUser;

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (editUser) {
            setFormData({
                name: editUser.name || '',
                email: editUser.email || '',
                password: '',
                confirmPassword: ''
            });
        }
    }, [editUser]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.name.trim()) return setError('Nome é obrigatório');

        if (isEditMode) {
            // Edit mode - only name can be updated
            try {
                setError('');
                setLoading(true);
                await userService.updateUser(editUser.id, {
                    name: formData.name
                });
                onSuccess();
            } catch (err) {
                console.error(err);
                setError('Erro ao atualizar usuário: ' + (err.message || 'Erro desconhecido'));
            } finally {
                setLoading(false);
            }
        } else {
            // Create mode - validate all fields
            if (!formData.email.trim()) return setError('Email é obrigatório');
            if (!formData.password) return setError('Senha é obrigatória');
            if (formData.password.length < 6) return setError('A senha deve ter pelo menos 6 caracteres');
            if (formData.password !== formData.confirmPassword) return setError('As senhas não coincidem');

            try {
                setError('');
                setLoading(true);
                await userService.createUser({
                    name: formData.name,
                    email: formData.email,
                    password: formData.password
                });
                onSuccess();
            } catch (err) {
                console.error(err);
                setError('Erro ao criar usuário: ' + (err.message || 'Erro desconhecido'));
            } finally {
                setLoading(false);
            }
        }
    };

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modal}>
                <div className={styles.modalHeader}>
                    <h3>{isEditMode ? 'Editar Usuário' : 'Novo Usuário'}</h3>
                    <button className={styles.closeBtn} onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className={styles.modalBody}>
                        {error && <div className={`${styles.alert} ${styles.error}`}>{error}</div>}

                        <div className="input-group">
                            <label className="label" htmlFor="user-name">Nome Completo *</label>
                            <input
                                id="user-name"
                                type="text"
                                name="name"
                                className="input"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="Ex: João Silva"
                                autoComplete="name"
                                required
                            />
                        </div>

                        {!isEditMode && (
                            <>
                                <div className="input-group">
                                    <label className="label" htmlFor="user-email">Email *</label>
                                    <input
                                        id="user-email"
                                        type="email"
                                        name="email"
                                        className="input"
                                        value={formData.email}
                                        onChange={handleChange}
                                        placeholder="Ex: joao@empresa.com"
                                        autoComplete="email"
                                        required
                                    />
                                </div>

                                <div className="input-group">
                                    <label className="label" htmlFor="user-password">Senha *</label>
                                    <input
                                        id="user-password"
                                        type="password"
                                        name="password"
                                        className="input"
                                        value={formData.password}
                                        onChange={handleChange}
                                        placeholder="Mínimo 6 caracteres"
                                        autoComplete="new-password"
                                        required
                                    />
                                </div>

                                <div className="input-group">
                                    <label className="label" htmlFor="user-confirm-password">Confirmar Senha *</label>
                                    <input
                                        id="user-confirm-password"
                                        type="password"
                                        name="confirmPassword"
                                        className="input"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        placeholder="Repita a senha"
                                        autoComplete="new-password"
                                        required
                                    />
                                </div>
                            </>
                        )}

                    </div>

                    <div className={styles.modalFooter}>
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={onClose}
                            disabled={loading}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading}
                        >
                            <Save size={16} />
                            {loading ? (isEditMode ? 'Salvando...' : 'Criando...') : (isEditMode ? 'Salvar' : 'Criar Usuário')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UserForm;
