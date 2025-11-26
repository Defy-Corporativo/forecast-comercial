import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import styles from './Settings.module.css';

const AccountSettings = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState({ type: '', text: '' });

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });

        // Validation
        if (newPassword.length < 6) {
            setMessage({ type: 'error', text: 'A nova senha deve ter pelo menos 6 caracteres.' });
            return;
        }

        if (newPassword !== confirmPassword) {
            setMessage({ type: 'error', text: 'As senhas não coincidem.' });
            return;
        }

        setLoading(true);

        try {
            // Update password
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            setMessage({ type: 'success', text: 'Senha alterada com sucesso!' });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error) {
            console.error('Erro ao alterar senha:', error);
            setMessage({ type: 'error', text: error.message || 'Erro ao alterar senha. Tente novamente.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card">
            <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>
                    <Lock size={20} />
                    Alterar Senha
                </h3>
            </div>

            {message.text && (
                <div className={`${styles.alert} ${message.type === 'error' ? styles.error : styles.success}`}>
                    {message.text}
                </div>
            )}

            <form onSubmit={handleChangePassword} style={{ maxWidth: '500px' }}>
                <div className="input-group">
                    <label className="label">Nova Senha</label>
                    <input
                        type="password"
                        className="input"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        required
                        minLength={6}
                    />
                </div>

                <div className="input-group">
                    <label className="label">Confirmar Nova Senha</label>
                    <input
                        type="password"
                        className="input"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Digite a senha novamente"
                        required
                        minLength={6}
                    />
                </div>

                <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                    style={{ marginTop: '1rem' }}
                >
                    {loading ? 'Alterando...' : 'Alterar Senha'}
                </button>
            </form>

            <div style={{ marginTop: '2rem', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    Informações da Conta
                </h4>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    <p style={{ margin: '0.5rem 0' }}>
                        <strong>Email:</strong> {user?.email}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AccountSettings;
