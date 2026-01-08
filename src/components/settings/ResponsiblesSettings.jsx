import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Check, X, User } from 'lucide-react';
import { responsiblesService } from '../../services/responsiblesService';
import styles from './Settings.module.css';

const ResponsiblesSettings = () => {
    const [responsibles, setResponsibles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newName, setNewName] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editingName, setEditingName] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadResponsibles();
    }, []);

    const loadResponsibles = async () => {
        try {
            const data = await responsiblesService.getResponsibles(true); // include inactive
            setResponsibles(data || []);
        } catch (error) {
            console.error('Erro ao carregar responsáveis:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!newName.trim()) return;

        try {
            setSaving(true);
            await responsiblesService.createResponsible(newName);
            setNewName('');
            await loadResponsibles();
        } catch (error) {
            console.error('Erro ao adicionar responsável:', error);
            if (error.code === '23505') {
                alert('Já existe um responsável com este nome.');
            } else {
                alert('Erro ao adicionar responsável.');
            }
        } finally {
            setSaving(false);
        }
    };

    const handleStartEdit = (responsible) => {
        setEditingId(responsible.id);
        setEditingName(responsible.name);
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditingName('');
    };

    const handleSaveEdit = async () => {
        if (!editingName.trim()) return;

        try {
            await responsiblesService.updateResponsible(editingId, editingName);
            setEditingId(null);
            setEditingName('');
            await loadResponsibles();
        } catch (error) {
            console.error('Erro ao atualizar responsável:', error);
            if (error.code === '23505') {
                alert('Já existe um responsável com este nome.');
            } else {
                alert('Erro ao atualizar responsável.');
            }
        }
    };

    const handleToggleActive = async (responsible) => {
        try {
            await responsiblesService.toggleActive(responsible.id, !responsible.is_active);
            await loadResponsibles();
        } catch (error) {
            console.error('Erro ao alterar status:', error);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Tem certeza que deseja excluir este responsável?')) return;

        try {
            await responsiblesService.deleteResponsible(id);
            await loadResponsibles();
        } catch (error) {
            console.error('Erro ao excluir responsável:', error);
            alert('Erro ao excluir. O responsável pode estar vinculado a registros existentes.');
        }
    };

    if (loading) return <div>Carregando...</div>;

    return (
        <div className="card">
            <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>
                    <User size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                    Responsáveis
                </h3>
            </div>

            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '14px' }}>
                Cadastre os responsáveis que poderão ser atribuídos às oportunidades e ações do sistema.
            </p>

            {/* Form to add new responsible */}
            <form onSubmit={handleAdd} style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                <input
                    type="text"
                    className="input"
                    placeholder="Nome do responsável"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    style={{ flex: 1 }}
                />
                <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={!newName.trim() || saving}
                >
                    <Plus size={16} />
                    {saving ? 'Adicionando...' : 'Adicionar'}
                </button>
            </form>

            {/* List of responsibles */}
            <div className={styles.fieldsList}>
                {responsibles.length === 0 ? (
                    <p className={styles.emptyState}>Nenhum responsável cadastrado ainda.</p>
                ) : (
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Nome</th>
                                <th style={{ width: '100px' }}>Status</th>
                                <th style={{ width: '120px' }}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {responsibles.map((responsible) => (
                                <tr
                                    key={responsible.id}
                                    style={{
                                        opacity: responsible.is_active ? 1 : 0.6,
                                        background: responsible.is_active ? 'white' : 'var(--bg-main)'
                                    }}
                                >
                                    <td>
                                        {editingId === responsible.id ? (
                                            <input
                                                type="text"
                                                className="input"
                                                value={editingName}
                                                onChange={(e) => setEditingName(e.target.value)}
                                                autoFocus
                                                style={{ margin: 0 }}
                                            />
                                        ) : (
                                            responsible.name
                                        )}
                                    </td>
                                    <td>
                                        <span
                                            className={styles.badge}
                                            style={{
                                                background: responsible.is_active ? 'var(--color-success-light)' : 'var(--bg-secondary)',
                                                color: responsible.is_active ? 'var(--color-success)' : 'var(--text-secondary)'
                                            }}
                                        >
                                            {responsible.is_active ? 'Ativo' : 'Inativo'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className={styles.actions}>
                                            {editingId === responsible.id ? (
                                                <>
                                                    <button
                                                        className={styles.actionBtn}
                                                        onClick={handleSaveEdit}
                                                        title="Salvar"
                                                        style={{ color: 'var(--color-success)' }}
                                                    >
                                                        <Check size={16} />
                                                    </button>
                                                    <button
                                                        className={styles.actionBtn}
                                                        onClick={handleCancelEdit}
                                                        title="Cancelar"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        className={styles.actionBtn}
                                                        onClick={() => handleStartEdit(responsible)}
                                                        title="Editar"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        className={styles.actionBtn}
                                                        onClick={() => handleToggleActive(responsible)}
                                                        title={responsible.is_active ? 'Desativar' : 'Ativar'}
                                                        style={{ color: responsible.is_active ? 'var(--text-secondary)' : 'var(--color-success)' }}
                                                    >
                                                        {responsible.is_active ? <X size={16} /> : <Check size={16} />}
                                                    </button>
                                                    <button
                                                        className={`${styles.actionBtn} ${styles.danger}`}
                                                        onClick={() => handleDelete(responsible.id)}
                                                        title="Excluir"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default ResponsiblesSettings;
