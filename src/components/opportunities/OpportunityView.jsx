import React, { useState, useEffect } from 'react';
import { X, Edit2, Trash2, Plus, Search, Calendar, MessageSquare, CheckCircle, Circle, Trash, Save, XCircle, DollarSign, Layers, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useStageContext } from '../../contexts/StageContext';
import { settingsService } from '../../services/settingsService';
import { opportunityNotesService } from '../../services/opportunityNotesService';
import { opportunityService } from '../../services/opportunityService';
import ConfirmModal from '../common/ConfirmModal';
import styles from './Opportunities.module.css';

const OpportunityView = ({ opportunity, onClose, onEdit, onDelete, onUpdate }) => {
    const { user } = useAuth();
    const { stages } = useStageContext();
    const [customFields, setCustomFields] = useState([]);

    // Estado local para a oportunidade (permite atualização em tempo real)
    const [currentOpportunity, setCurrentOpportunity] = useState(opportunity);

    // Estado para notas
    const [notes, setNotes] = useState([]);
    const [newNote, setNewNote] = useState('');
    const [loadingNotes, setLoadingNotes] = useState(true);
    const [savingNote, setSavingNote] = useState(false);

    // Filtros de notas
    const [searchText, setSearchText] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    // Estado para edição de nota
    const [editingNoteId, setEditingNoteId] = useState(null);
    const [editingNoteContent, setEditingNoteContent] = useState('');

    // Estado para modal de confirmação
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: null,
        type: 'warning'
    });

    // Sincronizar estado local quando a prop mudar (apenas na primeira renderização)
    useEffect(() => {
        setCurrentOpportunity(opportunity);
    }, [opportunity.id]);

    useEffect(() => {
        loadCustomFields();
        loadNotes();
    }, [currentOpportunity.id]);

    const loadCustomFields = async () => {
        try {
            const fields = await settingsService.getCustomFields(user.id);
            setCustomFields(fields || []);
        } catch (error) {
            console.error('Erro ao carregar campos personalizados:', error);
        }
    };

    const loadNotes = async () => {
        try {
            setLoadingNotes(true);
            const filters = {};
            if (searchText) filters.searchText = searchText;
            if (startDate) filters.startDate = startDate;
            if (endDate) filters.endDate = endDate;

            const data = await opportunityNotesService.getNotes(currentOpportunity.id, filters);
            setNotes(data);
        } catch (error) {
            console.error('Erro ao carregar notas:', error);
        } finally {
            setLoadingNotes(false);
        }
    };

    // Recarregar notas quando filtros mudam
    useEffect(() => {
        const timer = setTimeout(() => {
            loadNotes();
        }, 300);
        return () => clearTimeout(timer);
    }, [searchText, startDate, endDate]);

    const handleAddNote = async () => {
        if (!newNote.trim()) return;

        try {
            setSavingNote(true);
            console.log('Adicionando nota:', {
                opportunityId: currentOpportunity.id,
                content: newNote.trim(),
                createdBy: user?.name || user?.email || 'Usuário'
            });

            const result = await opportunityNotesService.createNote(
                currentOpportunity.id,
                newNote.trim(),
                user?.name || user?.email || 'Usuário'
            );

            console.log('Nota criada com sucesso:', result);
            setNewNote('');
            await loadNotes();
        } catch (error) {
            console.error('Erro ao adicionar nota:', error);
            console.error('Detalhes:', {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code
            });
            alert(`Erro ao adicionar nota: ${error.message || 'Tente novamente.'}`);
        } finally {
            setSavingNote(false);
        }
    };

    const handleDeleteNote = async (noteId) => {
        setConfirmModal({
            isOpen: true,
            title: 'Excluir Nota',
            message: 'Tem certeza que deseja excluir esta nota? Esta ação não pode ser desfeita.',
            type: 'danger',
            onConfirm: async () => {
                try {
                    await opportunityNotesService.deleteNote(noteId);
                    loadNotes();
                } catch (error) {
                    console.error('Erro ao excluir nota:', error);
                    alert('Erro ao excluir nota. Tente novamente.');
                }
            }
        });
    };

    const handleStartEditNote = (note) => {
        setEditingNoteId(note.id);
        setEditingNoteContent(note.content);
    };

    const handleCancelEditNote = () => {
        setEditingNoteId(null);
        setEditingNoteContent('');
    };

    const handleSaveEditNote = async () => {
        if (!editingNoteContent.trim()) return;

        try {
            await opportunityNotesService.updateNote(editingNoteId, editingNoteContent.trim());
            setEditingNoteId(null);
            setEditingNoteContent('');
            await loadNotes();
        } catch (error) {
            console.error('Erro ao atualizar nota:', error);
            alert('Erro ao atualizar nota. Tente novamente.');
        }
    };

    const clearFilters = () => {
        setSearchText('');
        setStartDate('');
        setEndDate('');
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        // Parse the date string directly to avoid timezone issues
        // Expected format: YYYY-MM-DD
        const parts = dateString.split('-');
        if (parts.length === 3) {
            const [year, month, day] = parts;
            return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
        }
        // Fallback for other formats
        return new Date(dateString + 'T00:00:00').toLocaleDateString('pt-BR');
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleEdit = () => {
        onEdit(currentOpportunity);
        onClose();
    };

    const handleDelete = () => {
        setConfirmModal({
            isOpen: true,
            title: 'Excluir Oportunidade',
            message: 'Tem certeza que deseja excluir esta oportunidade? Todas as previsões de faturamento serão excluídas também. Esta ação não pode ser desfeita.',
            type: 'danger',
            onConfirm: () => {
                onDelete(currentOpportunity.id);
                onClose();
            }
        });
    };

    // Ordenar estágios e determinar posição atual
    const sortedStages = [...stages].sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
    const currentStageIndex = sortedStages.findIndex(s => s.name === currentOpportunity.stage);
    const currentStage = sortedStages[currentStageIndex];

    // Get allowed previous and next stages based on configuration
    const getAllowedPreviousStages = () => {
        // Find stages that can transition TO the current stage
        return sortedStages.filter(stage =>
            stage.allowed_next_stages?.includes(currentOpportunity.stage)
        );
    };

    const getAllowedNextStages = () => {
        // Get stages that current stage can transition to
        if (!currentStage?.allowed_next_stages) return [];
        return sortedStages.filter(stage =>
            currentStage.allowed_next_stages.includes(stage.name)
        );
    };

    const allowedPrevious = getAllowedPreviousStages();
    const allowedNext = getAllowedNextStages();

    // Handle stage change
    const handleStageChange = async (newStageName) => {
        try {
            await opportunityService.updateOpportunity(currentOpportunity.id, { stage: newStageName });
            // Update local state immediately - no need to reload parent
            setCurrentOpportunity(prev => ({ ...prev, stage: newStageName }));
        } catch (error) {
            console.error('Erro ao alterar estágio:', error);
            alert('Erro ao alterar estágio. Tente novamente.');
        }
    };

    // Handle toggle invoiced status
    const handleToggleInvoiced = async (forecast) => {
        if (currentOpportunity.is_goal) return; // Don't allow for goals

        try {
            const newInvoicedStatus = !forecast.invoiced;
            await opportunityService.updateForecastInvoiced(forecast.id, newInvoicedStatus);

            // Update local state immediately - no need to reload parent
            setCurrentOpportunity(prev => ({
                ...prev,
                forecasts: prev.forecasts.map(f =>
                    f.id === forecast.id ? { ...f, invoiced: newInvoicedStatus } : f
                )
            }));
        } catch (error) {
            console.error('Erro ao atualizar status:', error);
            alert('Erro ao atualizar status. Tente novamente.');
        }
    };

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div
                className={styles.modal}
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: '1150px' }}
            >
                {/* Header com número e data */}
                <div className={styles.modalHeader} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <div>
                            <h3 style={{ margin: 0 }}>Oportunidade {currentOpportunity.opportunity_number}</h3>
                            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                Criado em {formatDate(currentOpportunity.creation_date)}
                            </span>
                        </div>
                        <button className={styles.closeBtn} onClick={onClose}><X size={24} /></button>
                    </div>
                </div>

                <div className={styles.modalBody}>
                    {/* Roadmap de Estágios - Clean design */}
                    {!currentOpportunity.is_goal && currentStage && (
                        <div style={{ marginBottom: '20px' }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                padding: '12px 16px',
                                background: 'white',
                                borderRadius: '8px',
                                border: '1px solid var(--border-color-light)',
                                flexWrap: 'wrap'
                            }}>
                                {/* Previous stages */}
                                {allowedPrevious.map(stage => (
                                    <button
                                        key={stage.id || stage.name}
                                        onClick={() => handleStageChange(stage.name)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            padding: '8px 14px',
                                            background: 'transparent',
                                            border: '1px solid var(--border-color-light)',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontSize: '0.85rem',
                                            color: 'var(--text-secondary)',
                                            fontWeight: 500,
                                            transition: 'all 0.15s'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = 'var(--bg-main)';
                                            e.currentTarget.style.borderColor = 'var(--border-color)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'transparent';
                                            e.currentTarget.style.borderColor = 'var(--border-color-light)';
                                        }}
                                        title={`Voltar para ${stage.name}`}
                                    >
                                        <ChevronLeft size={14} />
                                        {stage.name}
                                    </button>
                                ))}

                                {/* Current stage - clean with blue border */}
                                <div style={{
                                    padding: '8px 18px',
                                    background: '#f0f7ff',
                                    border: '2px solid #3b82f6',
                                    borderRadius: '6px',
                                    fontSize: '0.9rem',
                                    fontWeight: 600,
                                    color: '#1e40af'
                                }}>
                                    {currentStage.name}
                                </div>

                                {/* Next stages */}
                                {allowedNext.map(stage => (
                                    <button
                                        key={stage.id || stage.name}
                                        onClick={() => handleStageChange(stage.name)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            padding: '8px 14px',
                                            background: 'transparent',
                                            border: '1px solid var(--border-color-light)',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontSize: '0.85rem',
                                            color: 'var(--text-secondary)',
                                            fontWeight: 500,
                                            transition: 'all 0.15s'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = 'var(--bg-main)';
                                            e.currentTarget.style.borderColor = 'var(--border-color)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'transparent';
                                            e.currentTarget.style.borderColor = 'var(--border-color-light)';
                                        }}
                                        title={`Avançar para ${stage.name}`}
                                    >
                                        {stage.name}
                                        <ChevronRight size={14} />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Título da Oportunidade */}
                    <div style={{ marginBottom: '24px' }}>
                        <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--text-primary)' }}>
                            {currentOpportunity.title || '-'}
                        </h2>
                    </div>

                    {/* Campos principais */}
                    <div className={styles.formGrid}>
                        <div className="input-group">
                            <label className="label">Cliente / Empresa</label>
                            <div className={styles.viewField}>
                                {currentOpportunity.client?.name || currentOpportunity.client_name}
                            </div>
                        </div>

                        <div className="input-group">
                            <label className="label">Valor Total</label>
                            <div className={styles.viewField} style={{ fontWeight: 600, color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {formatCurrency(currentOpportunity.total_value || currentOpportunity.estimated_value)}
                                {(currentOpportunity.forecast_count || currentOpportunity.forecasts?.length || 0) > 1 && (
                                    <span style={{
                                        fontSize: '0.75rem',
                                        color: 'var(--text-secondary)',
                                        background: 'var(--bg-secondary)',
                                        padding: '2px 8px',
                                        borderRadius: '4px',
                                        fontWeight: 'normal'
                                    }}>
                                        <Layers size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                                        {currentOpportunity.forecast_count || currentOpportunity.forecasts?.length} previsões
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="input-group">
                            <label className="label">Responsável</label>
                            <div className={styles.viewField}>{currentOpportunity.responsible || '-'}</div>
                        </div>
                    </div>

                    {/* Seção de Previsões de Faturamento */}
                    {currentOpportunity.forecasts && currentOpportunity.forecasts.length > 0 && (
                        <div style={{ marginTop: '24px', borderTop: '1px solid var(--border-color-light)', paddingTop: '20px' }}>
                            <h4 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Calendar size={18} />
                                Previsões de Faturamento
                            </h4>
                            <div style={{
                                border: '1px solid var(--border-color-light)',
                                borderRadius: '8px',
                                overflow: 'hidden'
                            }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ background: 'var(--bg-secondary)', fontSize: '0.85rem' }}>
                                            <th style={{ textAlign: 'left', padding: '12px', fontWeight: 500 }}>Período</th>
                                            <th style={{ textAlign: 'right', padding: '12px', fontWeight: 500 }}>Valor</th>
                                            <th style={{ textAlign: 'center', padding: '12px', fontWeight: 500 }}>Status</th>
                                            <th style={{ textAlign: 'left', padding: '12px', fontWeight: 500 }}>Observação</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {currentOpportunity.forecasts
                                            .sort((a, b) => new Date(a.period_start) - new Date(b.period_start))
                                            .map((forecast, idx) => (
                                                <tr
                                                    key={forecast.id || idx}
                                                    style={{
                                                        borderTop: '1px solid var(--border-color-light)',
                                                        background: forecast.invoiced ? 'rgba(16, 185, 129, 0.05)' : 'white'
                                                    }}
                                                >
                                                    <td style={{ padding: '12px' }}>
                                                        {formatDate(forecast.period_start)} - {formatDate(forecast.period_end)}
                                                    </td>
                                                    <td style={{
                                                        padding: '12px',
                                                        textAlign: 'right',
                                                        fontWeight: 500,
                                                        textDecoration: forecast.invoiced ? 'line-through' : 'none',
                                                        color: forecast.invoiced ? 'var(--text-secondary)' : 'var(--text-primary)'
                                                    }}>
                                                        {formatCurrency(forecast.estimated_value)}
                                                    </td>
                                                    <td style={{ padding: '12px', textAlign: 'center' }}>
                                                        <span
                                                            onClick={() => !currentOpportunity.is_goal && handleToggleInvoiced(forecast)}
                                                            style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '4px',
                                                                padding: '4px 10px',
                                                                borderRadius: '12px',
                                                                border: 'none',
                                                                fontSize: '0.8rem',
                                                                fontWeight: 500,
                                                                background: currentOpportunity.is_goal ? 'var(--bg-secondary)' : (forecast.invoiced ? 'var(--color-success)' : 'var(--bg-secondary)'),
                                                                color: currentOpportunity.is_goal ? 'var(--text-tertiary)' : (forecast.invoiced ? 'white' : 'var(--text-secondary)'),
                                                                opacity: currentOpportunity.is_goal ? 0.7 : 1,
                                                                cursor: currentOpportunity.is_goal ? 'default' : 'pointer',
                                                                transition: 'all 0.2s ease'
                                                            }}
                                                            title={currentOpportunity.is_goal ? '' : (forecast.invoiced ? 'Clique para marcar como pendente' : 'Clique para marcar como faturado')}
                                                        >
                                                            {currentOpportunity.is_goal ? (
                                                                <span style={{ color: 'var(--text-tertiary)' }}>-</span>
                                                            ) : forecast.invoiced ? (
                                                                <><CheckCircle size={14} /> Faturado</>
                                                            ) : (
                                                                <><Circle size={14} /> Pendente</>
                                                            )}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                                        {forecast.notes || '-'}
                                                    </td>
                                                </tr>
                                            ))}
                                    </tbody>
                                    <tfoot>
                                        <tr style={{ borderTop: '2px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
                                            <td style={{ padding: '12px', fontWeight: 600 }}>Total</td>
                                            <td style={{ padding: '12px', textAlign: 'right', fontWeight: 600, color: 'var(--color-success)' }}>
                                                {formatCurrency(currentOpportunity.forecasts.reduce((sum, f) => sum + parseFloat(f.estimated_value || 0), 0))}
                                            </td>
                                            <td style={{ padding: '12px', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                {currentOpportunity.forecasts.filter(f => f.invoiced).length}/{currentOpportunity.forecasts.length} faturados
                                            </td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    )}

                    {currentOpportunity.notes && (
                        <div className="input-group" style={{ marginTop: '16px' }}>
                            <label className="label">Observações</label>
                            <div className={styles.viewField}>{currentOpportunity.notes}</div>
                        </div>
                    )}

                    {/* Campos customizados */}
                    {customFields.length > 0 && currentOpportunity.custom_data && (
                        <>
                            <h4 className={styles.sectionSubtitle}>Informações Adicionais</h4>
                            <div className={styles.formGrid}>
                                {customFields.map(field => {
                                    const value = currentOpportunity.custom_data[field.field_name];
                                    if (!value && value !== false) return null;

                                    let displayValue;
                                    if (field.field_type === 'checkbox') {
                                        displayValue = value ? 'Sim' : 'Não';
                                    } else if (field.field_type === 'percentage') {
                                        displayValue = `${value}%`;
                                    } else if (field.field_type === 'currency') {
                                        displayValue = formatCurrency(value);
                                    } else if (field.field_type === 'date') {
                                        displayValue = formatDate(value);
                                    } else {
                                        displayValue = String(value);
                                    }

                                    return (
                                        <div key={field.id} className="input-group">
                                            <label className="label">{field.field_name}</label>
                                            <div className={styles.viewField}>{displayValue}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}

                    {/* Seção de Notas */}
                    <div style={{ marginTop: '32px', borderTop: '1px solid var(--border-color-light)', paddingTop: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <MessageSquare size={20} />
                                Notas ({notes.length})
                            </h4>
                            <button
                                className="btn btn-secondary"
                                onClick={() => setShowFilters(!showFilters)}
                                style={{ fontSize: '13px', padding: '6px 12px' }}
                            >
                                <Search size={14} />
                                Filtros
                            </button>
                        </div>

                        {/* Filtros */}
                        {showFilters && (
                            <div style={{
                                background: 'var(--bg-main)',
                                padding: '16px',
                                borderRadius: '8px',
                                marginBottom: '16px',
                                border: '1px solid var(--border-color-light)'
                            }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                                    <div className="input-group" style={{ margin: 0 }}>
                                        <label className="label" style={{ fontSize: '12px' }}>Buscar texto</label>
                                        <div style={{ position: 'relative' }}>
                                            <Search size={16} style={{
                                                position: 'absolute',
                                                left: '10px',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                color: 'var(--text-tertiary)'
                                            }} />
                                            <input
                                                type="text"
                                                className="input"
                                                placeholder="Pesquisar nas notas..."
                                                value={searchText}
                                                onChange={(e) => setSearchText(e.target.value)}
                                                style={{ paddingLeft: '36px', fontSize: '13px' }}
                                            />
                                        </div>
                                    </div>
                                    <div className="input-group" style={{ margin: 0 }}>
                                        <label className="label" style={{ fontSize: '12px' }}>Data inicial</label>
                                        <input
                                            type="date"
                                            className="input"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            style={{ fontSize: '13px' }}
                                        />
                                    </div>
                                    <div className="input-group" style={{ margin: 0 }}>
                                        <label className="label" style={{ fontSize: '12px' }}>Data final</label>
                                        <input
                                            type="date"
                                            className="input"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            style={{ fontSize: '13px' }}
                                        />
                                    </div>
                                </div>
                                {(searchText || startDate || endDate) && (
                                    <button
                                        onClick={clearFilters}
                                        style={{
                                            marginTop: '12px',
                                            background: 'none',
                                            border: 'none',
                                            color: 'var(--color-primary)',
                                            cursor: 'pointer',
                                            fontSize: '13px'
                                        }}
                                    >
                                        Limpar filtros
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Adicionar nova nota */}
                        <div style={{ marginBottom: '20px' }}>
                            <textarea
                                className="input"
                                placeholder="Adicionar uma nova nota..."
                                value={newNote}
                                onChange={(e) => setNewNote(e.target.value)}
                                rows={3}
                                style={{ resize: 'vertical', minHeight: '80px' }}
                            />
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                                <button
                                    className="btn btn-primary"
                                    onClick={handleAddNote}
                                    disabled={!newNote.trim() || savingNote}
                                    style={{ fontSize: '13px', padding: '8px 16px' }}
                                >
                                    <Plus size={16} />
                                    {savingNote ? 'Salvando...' : 'Adicionar Nota'}
                                </button>
                            </div>
                        </div>

                        {/* Lista de notas */}
                        <div style={{
                            maxHeight: '300px',
                            overflowY: 'auto',
                            border: notes.length > 0 ? '1px solid var(--border-color-light)' : 'none',
                            borderRadius: '8px'
                        }}>
                            {loadingNotes ? (
                                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                    Carregando notas...
                                </div>
                            ) : notes.length === 0 ? (
                                <div style={{
                                    padding: '32px',
                                    textAlign: 'center',
                                    color: 'var(--text-secondary)',
                                    background: 'var(--bg-main)',
                                    borderRadius: '8px'
                                }}>
                                    <MessageSquare size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
                                    <p style={{ margin: 0 }}>
                                        {searchText || startDate || endDate
                                            ? 'Nenhuma nota encontrada com os filtros aplicados.'
                                            : 'Nenhuma nota registrada ainda.'}
                                    </p>
                                </div>
                            ) : (
                                notes.map((note, index) => (
                                    <div
                                        key={note.id}
                                        style={{
                                            padding: '16px',
                                            borderBottom: index < notes.length - 1 ? '1px solid var(--border-color-light)' : 'none',
                                            background: editingNoteId === note.id ? 'var(--bg-main)' : 'white'
                                        }}
                                    >
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'flex-start',
                                            marginBottom: '8px'
                                        }}>
                                            <div style={{
                                                fontSize: '12px',
                                                color: 'var(--text-secondary)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                flexWrap: 'wrap'
                                            }}>
                                                <Calendar size={14} />
                                                {formatDateTime(note.created_at)}
                                                {note.created_by && (
                                                    <span style={{
                                                        background: 'var(--bg-hover)',
                                                        padding: '2px 8px',
                                                        borderRadius: '4px'
                                                    }}>
                                                        {note.created_by}
                                                    </span>
                                                )}
                                                {note.updated_at && note.updated_at !== note.created_at && (
                                                    <span style={{ fontStyle: 'italic', color: 'var(--text-tertiary)' }}>
                                                        (editado)
                                                    </span>
                                                )}
                                            </div>

                                            {editingNoteId !== note.id && (
                                                <div style={{ display: 'flex', gap: '4px' }}>
                                                    <button
                                                        onClick={() => handleStartEditNote(note)}
                                                        style={{
                                                            background: 'none',
                                                            border: 'none',
                                                            color: 'var(--text-tertiary)',
                                                            cursor: 'pointer',
                                                            padding: '4px',
                                                            borderRadius: '4px',
                                                            display: 'flex',
                                                            alignItems: 'center'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.background = 'var(--color-primary-light)';
                                                            e.currentTarget.style.color = 'var(--color-primary)';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.background = 'none';
                                                            e.currentTarget.style.color = 'var(--text-tertiary)';
                                                        }}
                                                        title="Editar nota"
                                                    >
                                                        <Edit2 size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteNote(note.id)}
                                                        style={{
                                                            background: 'none',
                                                            border: 'none',
                                                            color: 'var(--text-tertiary)',
                                                            cursor: 'pointer',
                                                            padding: '4px',
                                                            borderRadius: '4px',
                                                            display: 'flex',
                                                            alignItems: 'center'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.background = 'var(--color-danger-light)';
                                                            e.currentTarget.style.color = 'var(--color-danger)';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.background = 'none';
                                                            e.currentTarget.style.color = 'var(--text-tertiary)';
                                                        }}
                                                        title="Excluir nota"
                                                    >
                                                        <Trash size={14} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {editingNoteId === note.id ? (
                                            <div>
                                                <textarea
                                                    className="input"
                                                    value={editingNoteContent}
                                                    onChange={(e) => setEditingNoteContent(e.target.value)}
                                                    rows={3}
                                                    style={{ resize: 'vertical', minHeight: '80px', marginBottom: '8px' }}
                                                    autoFocus
                                                />
                                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                    <button
                                                        onClick={handleCancelEditNote}
                                                        className="btn btn-secondary"
                                                        style={{ fontSize: '12px', padding: '6px 12px' }}
                                                    >
                                                        <XCircle size={14} />
                                                        Cancelar
                                                    </button>
                                                    <button
                                                        onClick={handleSaveEditNote}
                                                        className="btn btn-primary"
                                                        disabled={!editingNoteContent.trim()}
                                                        style={{ fontSize: '12px', padding: '6px 12px' }}
                                                    >
                                                        <Save size={14} />
                                                        Salvar
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <p style={{
                                                margin: 0,
                                                whiteSpace: 'pre-wrap',
                                                lineHeight: 1.5,
                                                color: 'var(--text-primary)'
                                            }}>
                                                {note.content}
                                            </p>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                <div className={styles.modalFooter} style={{ justifyContent: 'space-between' }}>
                    <button type="button" className="btn btn-secondary" onClick={handleDelete}>
                        <Trash2 size={16} />
                        Excluir
                    </button>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button type="button" className="btn btn-secondary" onClick={handleEdit}>
                            <Edit2 size={16} />
                            Editar
                        </button>
                        <button type="button" className="btn btn-primary" onClick={onClose}>
                            Fechar
                        </button>
                    </div>
                </div>

                {/* Modal de Confirmação */}
                <ConfirmModal
                    isOpen={confirmModal.isOpen}
                    onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                    onConfirm={confirmModal.onConfirm}
                    title={confirmModal.title}
                    message={confirmModal.message}
                    type={confirmModal.type}
                    confirmText="Confirmar"
                    cancelText="Cancelar"
                />
            </div>
        </div>
    );
};

export default OpportunityView;
