import React, { useState, useEffect } from 'react';
import { Save, GripVertical } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
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
            setCustomFields(fields);

            // Load user preferences
            const prefs = await settingsService.getUserPreferences(user.id);
            if (prefs?.visible_columns && prefs.visible_columns.length > 0) {
                setVisibleColumns(prefs.visible_columns);
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

    const handleSave = async () => {
        if (visibleColumns.length === 0) {
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
                visible_columns: visibleColumns
            });
            setMessage({ type: 'success', text: 'Preferências salvas com sucesso!' });
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

    const selectedFieldsInOrder = visibleColumns
        .map(id => allFields.find(f => f.id === id))
        .filter(Boolean);

    const onDragEnd = (result) => {
        if (!result.destination) return;
        const reordered = Array.from(visibleColumns);
        const [removed] = reordered.splice(result.source.index, 1);
        reordered.splice(result.destination.index, 0, removed);
        setVisibleColumns(reordered);
    };

    if (loading) return <div>Carregando...</div>;

    return (
        <div className="card">
            <div className={styles.sectionHeader}>
                <div>
                    <h3 className={styles.sectionTitle}>Campos Visíveis na Visualização</h3>
                    <p className={styles.sectionDescription}>
                        Selecione quais campos devem aparecer na visualização em lista das oportunidades.
                        É obrigatório ter pelo menos 1 campo selecionado.
                    </p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={handleSave}
                    disabled={saving || visibleColumns.length === 0}
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

            <div className={styles.fieldsList}>
                <div className={styles.fieldsGrid}>
                    {allFields.map(field => (
                        <label key={field.id} className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                checked={visibleColumns.includes(field.id)}
                                onChange={() => handleToggleField(field.id)}
                            />
                            <span>
                                {field.label}
                                {!field.isFixed && <span className={styles.customTag}> (Customizado)</span>}
                            </span>
                        </label>
                    ))}
                </div>

                <div className={styles.selectedCount}>
                    <strong>{visibleColumns.length}</strong> campo(s) selecionado(s)
                </div>
            </div>

            {visibleColumns.length > 0 && (
                <div className="card" style={{ marginTop: '16px' }}>
                    <h4 style={{ marginTop: 0, marginBottom: '12px' }}>Ordem de exibição</h4>
                    <p style={{ color: 'var(--text-secondary)', marginTop: 0, marginBottom: '12px' }}>
                        Arraste para reordenar os campos selecionados.
                    </p>
                    <DragDropContext onDragEnd={onDragEnd}>
                        <Droppable droppableId="visible-fields">
                            {(provided) => (
                                <div
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '8px'
                                    }}
                                >
                                    {selectedFieldsInOrder.map((field, index) => (
                                        <Draggable key={field.id} draggableId={field.id} index={index}>
                                            {(draggableProvided, snapshot) => (
                                                <div
                                                    ref={draggableProvided.innerRef}
                                                    {...draggableProvided.draggableProps}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        padding: '10px 12px',
                                                        border: '1px solid var(--border-color)',
                                                        borderRadius: '8px',
                                                        background: snapshot.isDragging ? 'var(--bg-hover)' : 'white',
                                                        boxShadow: snapshot.isDragging ? 'var(--shadow-sm)' : 'none',
                                                        ...draggableProvided.draggableProps.style
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span
                                                            {...draggableProvided.dragHandleProps}
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                color: 'var(--text-secondary)',
                                                                cursor: 'grab'
                                                            }}
                                                        >
                                                            <GripVertical size={16} />
                                                        </span>
                                                        <span>{field.label}{field.isFixed ? '' : ' (Customizado)'}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </DragDropContext>
                </div>
            )}
        </div>
    );
};

export default ViewSettings;
