import React, { useState } from 'react';
import { Lock, AlertCircle } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import styles from '../settings/Settings.module.css';

const FirstLoginModal = () => {
    const { clearFirstLogin } = useAuth();
    const [loading, setLoading] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setError('');

        // Validation
        if (newPassword.length < 6) {
            setError('A senha deve ter pelo menos 6 caracteres.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('As senhas não coincidem.');
            return;
        }

        setLoading(true);

        try {
            // Update password
            const { error: updateError } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (updateError) throw updateError;

            alert('Senha alterada com sucesso! Você pode continuar usando o sistema.');
            clearFirstLogin();
        } catch (err) {
            console.error('Erro ao alterar senha:', err);
            setError(err.message || 'Erro ao alterar senha. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.modalOverlay} style={{ zIndex: 9999 }}>
            <div className={styles.modal} style={{ maxWidth: '500px' }}>
                <div className={styles.modalHeader}>
                    <h3>
                        <Lock size={20} style={{ marginRight: '8px' }} />
                        Primeiro Acesso - Alterar Senha
                    </h3>
                </div>

                <form onSubmit={handleChangePassword}>
                    <div className={styles.modalBody}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '12px',
                            padding: '12px',
                            background: '#FEF3C7',
                            border: '1px solid #FDE047',
                            borderRadius: '8px',
                            marginBottom: '1.5rem'
                        }}>
                            <AlertCircle size={20} color="#F59E0B" style={{ flexShrink: 0, marginTop: '2px' }} />
                            <div style={{ fontSize: '0.9rem', color: '#92400E' }}>
                                <strong>Atenção:</strong> Este é o seu primeiro acesso ao sistema.
                                Por segurança, você deve criar uma nova senha antes de continuar.
                            </div>
                        </div>

                        {error && (
                            <div className={`${styles.alert} ${styles.error}`} style={{ marginBottom: '1rem' }}>
                                {error}
                            </div>
                        )}

                        <div className="input-group">
                            <label className="label">Nova Senha *</label>
                            <input
                                type="password"
                                className="input"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Mínimo 6 caracteres"
                                required
                                minLength={6}
                                autoFocus
                            />
                        </div>

                        <div className="input-group">
                            <label className="label">Confirmar Nova Senha *</label>
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
                    </div>

                    <div className={styles.modalFooter}>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading}
                            style={{ width: '100%' }}
                        >
                            {loading ? 'Alterando Senha...' : 'Alterar Senha e Continuar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default FirstLoginModal;
