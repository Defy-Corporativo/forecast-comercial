import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Edit2, RefreshCcw, ArrowRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useStageContext } from '../../contexts/StageContext';
import { settingsService } from '../../services/settingsService';
import styles from './Settings.module.css';



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
                allowed_next_stages: stage.allowed_next_stages || [],
            });
        } else {
            setEditingStage(null);
            setFormData({
                name: '',
                description: '',
                order_index: stages.length,
                color: '#64748B',
                allowed_next_stages: [],
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
                                            </div>
                                        </td>
                                        <td style={{ maxWidth: '400px' }}>{stage.description || '-'}</td>
                                        <td>
                                            <div className={styles.actions}>
                                                <button
                                                    className={styles.actionBtn}
                                                    onClick={() => handleOpenModal(stage)}
                                                    title="Editar estágio"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    className={`${styles.actionBtn} ${styles.danger}`}
                                                    onClick={() => handleDelete(stage.id)}
                                                    disabled={isDefaultStage(stage)}
                                                    title={isDefaultStage(stage) ? 'Salve o estágio primeiro para poder excluí-lo' : 'Excluir estágio'}
                                                    style={isDefaultStage(stage) ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
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

            {/* Diagrama Visual do Fluxo de Estágios */}
            <div style={{ marginTop: '24px' }}>
                <h4 style={{ marginBottom: '12px', color: 'var(--text-primary)', fontSize: '14px', fontWeight: 600 }}>
                    Fluxo de Transições
                </h4>
                <div style={{
                    padding: '20px',
                    background: 'var(--bg-main)',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    overflowX: 'auto'
                }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-start' }}>
                        {sortedStages.map((stage, index) => {
                            const nextStages = stage.allowed_next_stages || [];
                            const hasTransitions = nextStages.length > 0;

                            return (
                                <div key={stage.id || index} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '8px 12px',
                                    background: 'white',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border-color-light)',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                                }}>
                                    {/* Estágio de origem */}
                                    <div style={{
                                        padding: '6px 12px',
                                        borderRadius: '6px',
                                        background: stage.color || '#64748B',
                                        color: 'white',
                                        fontWeight: 500,
                                        fontSize: '12px',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        {stage.name}
                                    </div>

                                    {hasTransitions && (
                                        <>
                                            <ArrowRight size={16} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />

                                            {/* Estágios de destino */}
                                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                                {nextStages.map((nextStageName, nIdx) => {
                                                    const nextStageData = localStages.find(s => s.name === nextStageName);
                                                    return (
                                                        <span
                                                            key={nIdx}
                                                            style={{
                                                                padding: '4px 8px',
                                                                borderRadius: '4px',
                                                                background: nextStageData?.color ? `${nextStageData.color}20` : '#f1f5f9',
                                                                color: nextStageData?.color || 'var(--text-secondary)',
                                                                fontSize: '11px',
                                                                fontWeight: 500,
                                                                border: `1px solid ${nextStageData?.color || 'var(--border-color)'}`,
                                                                whiteSpace: 'nowrap'
                                                            }}
                                                        >
                                                            {nextStageName}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        </>
                                    )}

                                    {!hasTransitions && (
                                        <span style={{
                                            fontSize: '11px',
                                            color: 'var(--text-tertiary)',
                                            fontStyle: 'italic',
                                            marginLeft: '4px'
                                        }}>
                                            (fim)
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    <p style={{
                        marginTop: '12px',
                        fontSize: '11px',
                        color: 'var(--text-tertiary)',
                        margin: '12px 0 0 0'
                    }}>
                        Clique em &quot;Editar&quot; em um estágio para configurar suas transições permitidas.
                    </p>
                </div>
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
                                    <label className="label">Nome do Estágio</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={formData.name}
                                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                        required
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
                                <div className="input-group">
                                    <label className="label">Próximos Estágios Permitidos</label>
                                    <div style={{
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        gap: '8px',
                                        padding: '12px',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '6px',
                                        background: 'var(--bg-main)'
                                    }}>
                                        {localStages
                                            .filter(s => s.id !== editingStage?.id && s.name !== formData.name) // Não incluir a si mesmo
                                            .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
                                            .map(stage => {
                                                const isSelected = formData.allowed_next_stages?.includes(stage.name);
                                                return (
                                                    <button
                                                        key={stage.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setFormData(prev => {
                                                                const current = prev.allowed_next_stages || [];
                                                                if (current.includes(stage.name)) {
                                                                    return { ...prev, allowed_next_stages: current.filter(n => n !== stage.name) };
                                                                } else {
                                                                    return { ...prev, allowed_next_stages: [...current, stage.name] };
                                                                }
                                                            });
                                                        }}
                                                        style={{
                                                            padding: '6px 12px',
                                                            borderRadius: '16px',
                                                            border: `1px solid ${isSelected ? (stage.color || 'var(--color-primary)') : 'var(--border-color)'}`,
                                                            background: isSelected ? (stage.color || 'var(--color-primary)') : 'white',
                                                            color: isSelected ? 'white' : 'var(--text-primary)',
                                                            fontSize: '12px',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s'
                                                        }}
                                                    >
                                                        {stage.name}
                                                    </button>
                                                );
                                            })}
                                        {localStages.length <= 1 && (
                                            <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                                                Nenhum outro estágio disponível.
                                            </span>
                                        )}
                                    </div>
                                    <p style={{ marginTop: '4px', fontSize: '12px', color: 'var(--text-tertiary)' }}>
                                        Selecione para quais estágios uma oportunidade pode evoluir a partir deste. Se nenhum for selecionado, todos estarão disponíveis.
                                    </p>
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
