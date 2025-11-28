import React, { useState, useEffect } from 'react';
import { Save, ChevronUp, ChevronDown, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { settingsService } from '../../services/settingsService';
import styles from './Settings.module.css';

const ViewSettings = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [customFields, setCustomFields] = useState([]);
    const [message, setMessage] = useState({ type: '', text: '' });

    // Default fixed fields
    const fixedFields = [
        { id: 'opportunity_number', label: 'Número', isFixed: true },
        { id: 'title', label: 'Título da Oportunidade', isFixed: true },
        { id: 'client_name', label: 'Cliente', isFixed: true },
        { id: 'estimated_value', label: 'Valor Estimado', isFixed: true },
        { id: 'stage', label: 'Estágio', isFixed: true },
        { id: 'forecast_date', label: 'Data de Previsão', isFixed: true },
        { id: 'responsible', label: 'Responsável', isFixed: true },
        { id: 'creation_date', label: 'Data de Criação', isFixed: true },
        { id: 'notes', label: 'Observações', isFixed: true },
    ];

    const [visibleColumns, setVisibleColumns] = useState(
        fixedFields.slice(0, 6).map(f => f.id) // Default: first 6 fields
    );

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            setLoading(true);

            // Load custom fields
            const fields = await settingsService.getCustomFields(user.id);
            setCustomFields(fields || []);

            // Build list of valid field IDs
            const validFieldIds = [
                ...fixedFields.map(f => f.id),
                ...(fields || []).map(cf => `custom_${cf.field_name}`)
            ];

            // Load user preferences
            const prefs = await settingsService.getUserPreferences(user.id);
            if (prefs?.visible_columns && prefs.visible_columns.length > 0) {
                // Filter to keep only valid fields that still exist
                const validColumns = prefs.visible_columns.filter(colId => 
                    validFieldIds.includes(colId)
                );
                
                if (validColumns.length > 0) {
                    setVisibleColumns(validColumns);
                }
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleField = (fieldId) => {
        setVisibleColumns(prev => {
            if (prev.includes(fieldId)) {
                // Don't allow removing if it's the last field
                if (prev.length === 1) {
                    setMessage({
                        type: 'error',
                        text: 'É necessário ter pelo menos 1 campo visível.'
                    });
                    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
                    return prev;
                }
                return prev.filter(id => id !== fieldId);
            } else {
                return [...prev, fieldId];
            }
        });
    };

    const moveUp = (index) => {
        if (index === 0) return;
        // Work with validVisibleColumns to ensure correct ordering
        const validCols = visibleColumns.filter(colId => 
            allFields.some(f => f.id === colId)
        );
        const newColumns = [...validCols];
        [newColumns[index - 1], newColumns[index]] = [newColumns[index], newColumns[index - 1]];
        setVisibleColumns(newColumns);
    };

    const moveDown = (index) => {
        // Work with validVisibleColumns to ensure correct ordering
        const validCols = visibleColumns.filter(colId => 
            allFields.some(f => f.id === colId)
        );
        if (index === validCols.length - 1) return;
        const newColumns = [...validCols];
        [newColumns[index], newColumns[index + 1]] = [newColumns[index + 1], newColumns[index]];
        setVisibleColumns(newColumns);
    };

    const handleSave = async () => {
        // Get only valid columns to save
        const columnsToSave = visibleColumns.filter(colId => 
            allFields.some(f => f.id === colId)
        );
        
        if (columnsToSave.length === 0) {
            setMessage({
                type: 'error',
                text: 'Selecione pelo menos 1 campo para visualização.'
            });
            return;
        }

        setSaving(true);
        setMessage({ type: '', text: '' });

        try {
            await settingsService.updateUserPreferences(user.id, {
                visible_columns: columnsToSave
            });
            // Update local state with cleaned columns
            setVisibleColumns(columnsToSave);
            setMessage({ type: 'success', text: 'Preferências salvas! A lista de oportunidades será atualizada ao acessá-la novamente.' });
            setTimeout(() => setMessage({ type: '', text: '' }), 5000);
        } catch (error) {
            console.error('Error saving preferences:', error);
            setMessage({ type: 'error', text: 'Erro ao salvar preferências.' });
        } finally {
            setSaving(false);
        }
    };

    const allFields = [
        ...fixedFields,
        ...customFields.map(cf => ({
            id: `custom_${cf.field_name}`,
            label: cf.field_name,
            isFixed: false
        }))
    ];

    // Filter visibleColumns to only include valid fields
    const validVisibleColumns = visibleColumns.filter(colId => 
        allFields.some(f => f.id === colId)
    );

    const getFieldLabel = (fieldId) => {
        const field = allFields.find(f => f.id === fieldId);
        return field ? field.label : fieldId;
    };

    const getFieldInfo = (fieldId) => {
        return allFields.find(f => f.id === fieldId);
    };

    if (loading) return <div>Carregando...</div>;

    return (
        <div className="card">
            <div className={styles.sectionHeader}>
                <div>
                    <h3 className={styles.sectionTitle}>Campos Visíveis na Visualização</h3>
                    <p className={styles.sectionDescription}>
                        Configure quais campos aparecem na lista de oportunidades e sua ordem de exibição.
                    </p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={handleSave}
                    disabled={saving || validVisibleColumns.length === 0}
                >
                    <Save size={16} />
                    {saving ? 'Salvando...' : 'Salvar Preferências'}
                </button>
            </div>

            {message.text && (
                <div className={`${styles.alert} ${styles[message.type]}`}>
                    {message.text}
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '16px' }}>
                {/* Campos Disponíveis */}
                <div>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Campos Disponíveis
                    </h4>
                    <div style={{ 
                        border: '1px solid var(--border-color)', 
                        borderRadius: '8px', 
                        background: 'var(--bg-main)',
                        maxHeight: '400px',
                        overflowY: 'auto'
                    }}>
                        {allFields.map(field => {
                            const isVisible = validVisibleColumns.includes(field.id);
                            return (
                                <div
                                    key={field.id}
                                    onClick={() => handleToggleField(field.id)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '12px 16px',
                                        borderBottom: '1px solid var(--border-color-light)',
                                        cursor: 'pointer',
                                        background: isVisible ? 'var(--color-primary-light)' : 'white',
                                        transition: 'all 0.15s ease'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isVisible) e.currentTarget.style.background = 'var(--bg-hover)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = isVisible ? 'var(--color-primary-light)' : 'white';
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontWeight: isVisible ? 500 : 400 }}>
                                            {field.label}
                                        </span>
                                        {!field.isFixed && (
                                            <span style={{ 
                                                fontSize: '11px', 
                                                background: 'var(--bg-hover)', 
                                                padding: '2px 6px', 
                                                borderRadius: '4px',
                                                color: 'var(--text-secondary)'
                                            }}>
                                                Customizado
                                            </span>
                                        )}
                                    </div>
                                    {isVisible ? (
                                        <Eye size={18} style={{ color: 'var(--color-primary)' }} />
                                    ) : (
                                        <EyeOff size={18} style={{ color: 'var(--text-tertiary)' }} />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Ordem de Exibição */}
                <div>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Ordem de Exibição ({validVisibleColumns.length} campos)
                    </h4>
                    <div style={{ 
                        border: '1px solid var(--border-color)', 
                        borderRadius: '8px',
                        background: 'var(--bg-main)',
                        minHeight: '200px'
                    }}>
                        {validVisibleColumns.length === 0 ? (
                            <div style={{ 
                                padding: '40px', 
                                textAlign: 'center', 
                                color: 'var(--text-secondary)' 
                            }}>
                                Selecione campos à esquerda para exibir na lista
                            </div>
                        ) : (
                            validVisibleColumns.map((fieldId, index) => {
                                const fieldInfo = getFieldInfo(fieldId);
                                return (
                                    <div
                                        key={fieldId}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        padding: '10px 12px',
                                            borderBottom: index < validVisibleColumns.length - 1 ? '1px solid var(--border-color-light)' : 'none',
                                            background: 'white'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <span style={{ 
                                                width: '24px', 
                                                height: '24px', 
                                                borderRadius: '50%', 
                                                background: 'var(--color-primary)',
                                                color: 'white',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '12px',
                                                fontWeight: 600
                                            }}>
                                                {index + 1}
                                            </span>
                                            <span style={{ fontWeight: 500 }}>
                                                {getFieldLabel(fieldId)}
                                                {fieldInfo && !fieldInfo.isFixed && (
                                                    <span style={{ 
                                                        fontSize: '11px', 
                                                        background: 'var(--bg-hover)', 
                                                        padding: '2px 6px', 
                                                        borderRadius: '4px',
                                                        color: 'var(--text-secondary)',
                                                        marginLeft: '8px'
                                                    }}>
                                                        Customizado
                                                    </span>
                                                )}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '4px' }}>
                                            <button
                                                onClick={() => moveUp(index)}
                                                disabled={index === 0}
                                                style={{
                                                    width: '32px',
                                                    height: '32px',
                                                    border: '1px solid var(--border-color)',
                                                    borderRadius: '6px',
                                                    background: index === 0 ? 'var(--bg-main)' : 'white',
                                                    cursor: index === 0 ? 'not-allowed' : 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: index === 0 ? 'var(--text-tertiary)' : 'var(--text-secondary)',
                                                    transition: 'all 0.15s ease'
                                                }}
                                                onMouseEnter={(e) => {
                                                    if (index !== 0) {
                                                        e.currentTarget.style.background = 'var(--color-primary-light)';
                                                        e.currentTarget.style.borderColor = 'var(--color-primary)';
                                                        e.currentTarget.style.color = 'var(--color-primary)';
                                                    }
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.background = index === 0 ? 'var(--bg-main)' : 'white';
                                                    e.currentTarget.style.borderColor = 'var(--border-color)';
                                                    e.currentTarget.style.color = index === 0 ? 'var(--text-tertiary)' : 'var(--text-secondary)';
                                                }}
                                                title="Mover para cima"
                                            >
                                                <ChevronUp size={18} />
                                            </button>
                                            <button
                                                onClick={() => moveDown(index)}
                                                disabled={index === validVisibleColumns.length - 1}
                                                            style={{
                                                    width: '32px',
                                                    height: '32px',
                                                    border: '1px solid var(--border-color)',
                                                    borderRadius: '6px',
                                                    background: index === validVisibleColumns.length - 1 ? 'var(--bg-main)' : 'white',
                                                    cursor: index === validVisibleColumns.length - 1 ? 'not-allowed' : 'pointer',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: index === validVisibleColumns.length - 1 ? 'var(--text-tertiary)' : 'var(--text-secondary)',
                                                    transition: 'all 0.15s ease'
                                                }}
                                                onMouseEnter={(e) => {
                                                    if (index !== validVisibleColumns.length - 1) {
                                                        e.currentTarget.style.background = 'var(--color-primary-light)';
                                                        e.currentTarget.style.borderColor = 'var(--color-primary)';
                                                        e.currentTarget.style.color = 'var(--color-primary)';
                                                    }
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.background = index === validVisibleColumns.length - 1 ? 'var(--bg-main)' : 'white';
                                                    e.currentTarget.style.borderColor = 'var(--border-color)';
                                                    e.currentTarget.style.color = index === validVisibleColumns.length - 1 ? 'var(--text-tertiary)' : 'var(--text-secondary)';
                                                }}
                                                title="Mover para baixo"
                                            >
                                                <ChevronDown size={18} />
                                            </button>
                                                    </div>
                                                </div>
                                );
                            })
                        )}
                    </div>
                    
                    {validVisibleColumns.length > 0 && (
                        <p style={{ 
                            marginTop: '12px', 
                            fontSize: '13px', 
                            color: 'var(--text-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}>
                            <ChevronUp size={14} />
                            <ChevronDown size={14} />
                            Use as setas para reordenar os campos
                        </p>
                    )}
                </div>
            </div>

            {/* Preview */}
            {validVisibleColumns.length > 0 && (
                <div style={{ marginTop: '24px' }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Pré-visualização da Tabela
                    </h4>
                    <div style={{ 
                        border: '1px solid var(--border-color)', 
                        borderRadius: '8px',
                        overflow: 'hidden'
                    }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: 'var(--bg-main)' }}>
                                    {validVisibleColumns.map((fieldId, index) => (
                                        <th 
                                            key={fieldId} 
                                            style={{ 
                                                padding: '12px 16px', 
                                                textAlign: 'left',
                                                fontWeight: 600,
                                                fontSize: '13px',
                                                color: 'var(--text-secondary)',
                                                borderBottom: '1px solid var(--border-color-light)',
                                                borderRight: index < validVisibleColumns.length - 1 ? '1px solid var(--border-color-light)' : 'none'
                                            }}
                                        >
                                            {getFieldLabel(fieldId)}
                                        </th>
                                    ))}
                                    <th style={{ 
                                        padding: '12px 16px', 
                                        textAlign: 'left',
                                        fontWeight: 600,
                                        fontSize: '13px',
                                        color: 'var(--text-secondary)',
                                        borderBottom: '1px solid var(--border-color-light)',
                                        width: '100px'
                                    }}>
                                        Ações
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    {validVisibleColumns.map((fieldId, index) => (
                                        <td 
                                            key={fieldId}
                                            style={{ 
                                                padding: '12px 16px',
                                                color: 'var(--text-tertiary)',
                                                fontStyle: 'italic',
                                                fontSize: '13px',
                                                borderRight: index < validVisibleColumns.length - 1 ? '1px solid var(--border-color-light)' : 'none'
                                            }}
                                        >
                                            (exemplo)
                                        </td>
                                    ))}
                                    <td style={{ padding: '12px 16px', color: 'var(--text-tertiary)', fontStyle: 'italic', fontSize: '13px' }}>
                                        ...
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                                </div>
                </div>
            )}
        </div>
    );
};

export default ViewSettings;
