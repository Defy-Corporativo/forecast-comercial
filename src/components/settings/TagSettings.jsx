import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Check, X, Tag } from 'lucide-react';
import { tagService } from '../../services/tagService';
import styles from './Settings.module.css';

const TagSettings = () => {
    const [tags, setTags] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newName, setNewName] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editingName, setEditingName] = useState('');
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        loadTags();
    }, []);

    const loadTags = async () => {
        try {
            const data = await tagService.getTags();
            setTags(data || []);
        } catch (error) {
            console.error('Erro ao carregar tags:', error);
            setMessage({ type: 'error', text: 'Erro ao carregar tags.' });
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!newName.trim()) return;

        try {
            setSaving(true);
            setMessage({ type: '', text: '' });
            await tagService.createTag(newName);
            setNewName('');
            await loadTags();
            setMessage({ type: 'success', text: 'Tag criada com sucesso!' });
        } catch (error) {
            console.error('Erro ao adicionar tag:', error);
            if (error.code === '23505' || error.message?.includes('existe')) {
                setMessage({ type: 'error', text: 'Já existe uma tag com este nome.' });
            } else {
                setMessage({ type: 'error', text: 'Erro ao adicionar tag.' });
            }
        } finally {
            setSaving(false);
        }
    };

    const handleStartEdit = (tag) => {
        setEditingId(tag.id);
        setEditingName(tag.name);
        setMessage({ type: '', text: '' });
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditingName('');
    };

    const handleSaveEdit = async () => {
        if (!editingName.trim()) return;

        try {
            await tagService.updateTag(editingId, editingName);
            setEditingId(null);
            setEditingName('');
            await loadTags();
            setMessage({ type: 'success', text: 'Tag atualizada com sucesso!' });
        } catch (error) {
            console.error('Erro ao atualizar tag:', error);
            if (error.message?.includes('existe')) {
                setMessage({ type: 'error', text: 'Já existe uma tag com este nome.' });
            } else {
                setMessage({ type: 'error', text: 'Erro ao atualizar tag.' });
            }
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Tem certeza que deseja excluir esta tag?')) return;

        try {
            setMessage({ type: '', text: '' });
            await tagService.deleteTag(id);
            await loadTags();
            setMessage({ type: 'success', text: 'Tag excluída com sucesso!' });
        } catch (error) {
            console.error('Erro ao excluir tag:', error);
            setMessage({ type: 'error', text: error.message || 'Erro ao excluir tag. A tag pode estar vinculada a oportunidades.' });
        }
    };

    if (loading) return <div>Carregando...</div>;

    return (
        <div className="card">
            <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>
                    <Tag size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                    Tags
                </h3>
            </div>

            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '14px' }}>
                Cadastre as tags que poderão ser usadas para categorizar e filtrar oportunidades.
            </p>

            {message.text && (
                <div className={`${styles.alert} ${styles[message.type]}`} style={{ marginBottom: '16px' }}>
                    {message.text}
                </div>
            )}

            {/* Form to add new tag */}
            <form onSubmit={handleAdd} style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                <input
                    type="text"
                    className="input"
                    placeholder="Nome da tag"
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

            {/* List of tags */}
            <div className={styles.fieldsList}>
                {tags.length === 0 ? (
                    <p className={styles.emptyState}>Nenhuma tag cadastrada ainda.</p>
                ) : (
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Nome</th>
                                <th style={{ width: '120px' }}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tags.map((tag) => (
                                <tr key={tag.id}>
                                    <td>
                                        {editingId === tag.id ? (
                                            <input
                                                type="text"
                                                className="input"
                                                value={editingName}
                                                onChange={(e) => setEditingName(e.target.value)}
                                                autoFocus
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleSaveEdit();
                                                    if (e.key === 'Escape') handleCancelEdit();
                                                }}
                                                style={{ margin: 0 }}
                                            />
                                        ) : (
                                            <span style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                padding: '4px 10px',
                                                borderRadius: '12px',
                                                background: 'var(--color-primary-light)',
                                                color: 'var(--color-primary)',
                                                fontSize: '0.85rem',
                                                fontWeight: 500
                                            }}>
                                                <Tag size={14} />
                                                {tag.name}
                                            </span>
                                        )}
                                    </td>
                                    <td>
                                        <div className={styles.actions}>
                                            {editingId === tag.id ? (
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
                                                        onClick={() => handleStartEdit(tag)}
                                                        title="Editar"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        className={`${styles.actionBtn} ${styles.danger}`}
                                                        onClick={() => handleDelete(tag.id)}
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

export default TagSettings;
