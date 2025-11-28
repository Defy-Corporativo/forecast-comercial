import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Edit2, RefreshCcw, Lock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useStageContext } from '../../contexts/StageContext';
import { settingsService } from '../../services/settingsService';
import styles from './Settings.module.css';

// Estágios padrão que não podem ser editados/excluídos
const DEFAULT_STAGE_NAMES = ['Pipeline', 'Strong Upside', 'Committed', 'Deal', 'Lost'];

const StageSettings = () => {
    const { user } = useAuth();
    const { stages, refreshStages, defaultStageDefinitions } = useStageContext();
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingStage, setEditingStage] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        order_index: stages.length,
        color: '#64748B',
    });
    const [localStages, setLocalStages] = useState([]);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    // Helper to check if a stage is a default (non-database) stage
    const isDefaultStage = (stage) => {
        return typeof stage.id === 'string' && stage.id.startsWith('default-');
    };

    // Helper to check if a stage name is a protected default
    const isProtectedStage = (stageName) => {
        return DEFAULT_STAGE_NAMES.includes(stageName);
    };

    useEffect(() => {
        setLocalStages(stages);
        setLoading(false);
    }, [stages]);

    const handleOpenModal = (stage = null) => {
        if (stage) {
            setEditingStage(stage);
            setFormData({
                name: stage.name,
                description: stage.description || '',
                order_index: stage.order_index ?? 0,
                color: stage.color || '#64748B',
            });
        } else {
            setEditingStage(null);
            setFormData({
                name: '',
                description: '',
                order_index: stages.length,
                color: '#64748B',
            });
        }
        setShowModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!user) return;
        setSaving(true);
        setMessage({ type: '', text: '' });

        try {
            // Check if editing a default stage (has string ID starting with "default-")
            if (editingStage && isDefaultStage(editingStage)) {
                // Create a new database record instead of trying to update the default one
                await settingsService.createStageDefinition(user.id, formData);
            } else if (editingStage) {
                // Normal update for database stages
                await settingsService.updateStageDefinition(editingStage.id, formData);
            } else {
                // Creating a new stage
                await settingsService.createStageDefinition(user.id, formData);
            }
            await refreshStages();
            setShowModal(false);
            setMessage({ type: 'success', text: 'Estágio salvo com sucesso!' });
        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: 'Erro ao salvar estágio: ' + error.message });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (stageId) => {
        if (!window.confirm('Tem certeza que deseja excluir este estágio?')) return;
        try {
            await settingsService.deleteStageDefinition(stageId);
            await refreshStages();
            setMessage({ type: 'success', text: 'Estágio excluído com sucesso!' });
        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: 'Erro ao excluir estágio: ' + error.message });
        }
    };

    const handleResetDefaults = async () => {
        if (!window.confirm('Isso irá substituir seus estágios atuais pelos padrões. Continuar?')) return;
        try {
            await settingsService.resetStageDefinitions(user.id, defaultStageDefinitions);
            await refreshStages();
            setMessage({ type: 'success', text: 'Estágios restaurados para o padrão.' });
        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: 'Erro ao restaurar estágios: ' + error.message });
        }
    };

    const sortedStages = [...localStages].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

    if (loading) return <div>Carregando estágios...</div>;

    return (
        <div className="card">
            <div className={styles.sectionHeader}>
                <div>
                    <h3 className={styles.sectionTitle}>Estágios do Pipeline</h3>
                    <p className={styles.sectionDescription}>
                        Configure os estágios disponíveis e defina uma breve descrição para orientar o time.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button className="btn btn-secondary" onClick={handleResetDefaults}>
                        <RefreshCcw size={16} />
                        Restaurar Padrão
                    </button>
                    <button className="btn btn-primary" onClick={() => handleOpenModal()}>
                        <Plus size={16} />
                        Novo Estágio
                    </button>
                </div>
            </div>

            {message.text && (
                <div className={`${styles.alert} ${styles[message.type]}`}>
                    {message.text}
                </div>
            )}

            <div className={styles.fieldsList}>
                {sortedStages.length === 0 ? (
                    <p className={styles.emptyState}>Nenhum estágio configurado.</p>
                ) : (
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Ordem</th>
                                <th>Cor</th>
                                <th>Nome</th>
                                <th>Descrição</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedStages.map(stage => {
                                const isProtected = isProtectedStage(stage.name);
                                return (
                                    <tr key={stage.id}>
                                        <td style={{ width: '80px' }}>{stage.order_index ?? 0}</td>
                                        <td style={{ width: '80px' }}>
                                            <div style={{
                                                width: '40px',
                                                height: '24px',
                                                backgroundColor: stage.color || '#64748B',
                                                borderRadius: '4px',
                                                border: '1px solid var(--border-color)'
                                            }} />
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {stage.name}
                                                {isProtected && (
                                                    <span title="Estágio padrão do sistema" style={{ color: 'var(--text-tertiary)' }}>
                                                        <Lock size={14} />
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td style={{ maxWidth: '400px' }}>{stage.description || '-'}</td>
                                        <td>
                                            <div className={styles.actions}>
                                                <button 
                                                    className={styles.actionBtn} 
                                                    onClick={() => handleOpenModal(stage)}
                                                    title={isProtected ? 'Editar descrição, ordem e cor' : 'Editar estágio'}
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button 
                                                    className={`${styles.actionBtn} ${styles.danger}`} 
                                                    onClick={() => handleDelete(stage.id)} 
                                                    disabled={isDefaultStage(stage) || isProtected}
                                                    title={isProtected ? 'Estágio padrão não pode ser excluído' : 'Excluir estágio'}
                                                    style={(isDefaultStage(stage) || isProtected) ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {showModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                        <div className={styles.modalHeader}>
                            <h3>{editingStage ? 'Editar Estágio' : 'Novo Estágio'}</h3>
                            <button className={styles.closeBtn} onClick={() => setShowModal(false)}>&times;</button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className={styles.modalBody}>
                                <div className="input-group">
                                    <label className="label">
                                        Nome do Estágio
                                        {editingStage && isProtectedStage(editingStage.name) && (
                                            <span style={{ marginLeft: '8px', color: 'var(--text-tertiary)', fontSize: '12px', fontWeight: 'normal' }}>
                                                (não editável)
                                            </span>
                                        )}
                                    </label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={formData.name}
                                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                        required
                                        disabled={editingStage && isProtectedStage(editingStage.name)}
                                        style={editingStage && isProtectedStage(editingStage.name) ? { 
                                            background: 'var(--bg-main)', 
                                            cursor: 'not-allowed',
                                            color: 'var(--text-secondary)'
                                        } : {}}
                                    />
                                </div>
                                <div className="input-group">
                                    <label className="label">Descrição</label>
                                    <textarea
                                        className="input"
                                        value={formData.description}
                                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                        rows="3"
                                        placeholder="Explique brevemente quando usar este estágio"
                                    />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div className="input-group">
                                        <label className="label">Ordem</label>
                                        <input
                                            type="number"
                                            className="input"
                                            value={formData.order_index}
                                            onChange={(e) => setFormData(prev => ({ ...prev, order_index: Number(e.target.value) }))}
                                            min="0"
                                            required
                                        />
                                    </div>
                                    <div className="input-group">
                                        <label className="label">Cor</label>
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            <input
                                                type="color"
                                                value={formData.color}
                                                onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                                                style={{
                                                    width: '60px',
                                                    height: '40px',
                                                    border: '1px solid var(--border-color)',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer'
                                                }}
                                            />
                                            <input
                                                type="text"
                                                className="input"
                                                value={formData.color}
                                                onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                                                placeholder="#64748B"
                                                pattern="^#[0-9A-Fa-f]{6}$"
                                                style={{ flex: 1 }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className={styles.modalFooter}>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    {saving ? 'Salvando...' : 'Salvar Estágio'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StageSettings;
