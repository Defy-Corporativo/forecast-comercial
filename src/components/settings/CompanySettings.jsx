import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { settingsService } from '../../services/settingsService';
import styles from './Settings.module.css';

const CompanySettings = () => {
    const { user } = useAuth();
    const [name, setName] = useState('');
    const [logoUrl, setLogoUrl] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        if (user) {
            loadCompany();
        }
    }, [user]);

    const loadCompany = async () => {
        try {
            const data = await settingsService.getCompany(user.id);
            if (data) {
                setName(data.name || '');
                setLogoUrl(data.logo_url || '');
            }
        } catch (error) {
            console.error('Error loading company:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage({ type: '', text: '' });

        try {
            await settingsService.updateCompany(user.id, { name, logo_url: logoUrl });
            setMessage({ type: 'success', text: 'Configurações da empresa salvas com sucesso!' });
        } catch (error) {
            setMessage({ type: 'error', text: 'Erro ao salvar configurações: ' + error.message });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div>Carregando...</div>;

    return (
        <div className="card">
            <h3 className={styles.sectionTitle}>Detalhes da Empresa</h3>

            {message.text && (
                <div className={`${styles.alert} ${styles[message.type]}`}>
                    {message.text}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div className="input-group">
                    <label className="label" htmlFor="companyName">Nome da Empresa</label>
                    <input
                        id="companyName"
                        type="text"
                        className="input"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Digite o nome da empresa"
                        required
                    />
                </div>

                <div className="input-group">
                    <label className="label" htmlFor="logoUrl">URL do Logo</label>
                    <input
                        id="logoUrl"
                        type="url"
                        className="input"
                        value={logoUrl}
                        onChange={(e) => setLogoUrl(e.target.value)}
                        placeholder="https://exemplo.com/logo.png"
                    />
                    {logoUrl && (
                        <div className={styles.logoPreview}>
                            <img src={logoUrl} alt="Preview do Logo" />
                        </div>
                    )}
                </div>

                <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
            </form>
        </div>
    );
};

export default CompanySettings;
