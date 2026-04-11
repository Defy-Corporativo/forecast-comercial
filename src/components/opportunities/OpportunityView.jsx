import React, { useState, useEffect } from 'react';
import { X, Edit2, Trash2, Plus, Search, Calendar, MessageSquare, CheckCircle, Circle, Trash, Save, XCircle, DollarSign, Layers, ChevronLeft, ChevronRight, CheckSquare, Clock, AlertCircle, User } from 'lucide-react';
import { Checkbox } from '@iadefysolutions/design-system';
import { useAuth } from '../../contexts/AuthContext';
import { useStageContext } from '../../contexts/StageContext';
import { settingsService } from '../../services/settingsService';
import { opportunityNotesService } from '../../services/opportunityNotesService';
import { opportunityActionsService } from '../../services/opportunityActionsService';
import { responsiblesService } from '../../services/responsiblesService';
import { opportunityService } from '../../services/opportunityService';
import ConfirmModal from '../common/ConfirmModal';
import styles from './Opportunities.module.css';

const OpportunityView = ({ opportunity, onClose, onEdit, onDelete, onUpdate, fullscreen = false }) => {
    const { user } = useAuth();
    const { stages } = useStageContext();
    const [customFields, setCustomFields] = useState([]);

    // Estado local para a oportunidade (permite atualização em tempo real)
    const [currentOpportunity, setCurrentOpportunity] = useState(opportunity);

    // Estado para notas
    const [notes, setNotes] = useState([]);
    // Inicializar newNote do sessionStorage para persistir drafts entre trocas de aba
    const [newNote, setNewNote] = useState(() => {
        const key = `opportunity_note_draft_${opportunity.id}`;
        const saved = sessionStorage.getItem(key);
        console.log(`[OpportunityView] Initializing newNote from sessionStorage: key=${key}, value=${saved}`);
        return saved || '';
    });
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

    // Estado para tabs (notas vs ações vs previsões)
    const [activeTab, setActiveTab] = useState('forecasts');

    // Estado para ações
    const [actions, setActions] = useState([]);
    const [loadingActions, setLoadingActions] = useState(true);
    // Inicializar do sessionStorage para persistir drafts entre trocas de aba
    const [newActionDescription, setNewActionDescription] = useState(() => {
        const key = `opportunity_action_desc_draft_${opportunity.id}`;
        const saved = sessionStorage.getItem(key);
        console.log(`[OpportunityView] Initializing newActionDescription from sessionStorage: key=${key}, value=${saved}`);
        return saved || '';
    });
    const [newActionResponsible, setNewActionResponsible] = useState(() => {
        const key = `opportunity_action_resp_draft_${opportunity.id}`;
        const saved = sessionStorage.getItem(key);
        console.log(`[OpportunityView] Initializing newActionResponsible from sessionStorage: key=${key}, value=${saved}`);
        return saved || '';
    });
    const [newActionDueDate, setNewActionDueDate] = useState('');
    const [savingAction, setSavingAction] = useState(false);
    const [responsibles, setResponsibles] = useState([]);
    const [actionCounts, setActionCounts] = useState({ pending: 0, completed: 0 });

    // Filtros de ações
    const [showActionFilters, setShowActionFilters] = useState(false);
    const [actionSearchText, setActionSearchText] = useState('');
    const [actionResponsibleFilter, setActionResponsibleFilter] = useState('');
    const [actionStatusFilter, setActionStatusFilter] = useState('');

    // Modal para conclusão de ação
    const [completeModal, setCompleteModal] = useState({
        isOpen: false,
        actionId: null,
        noteText: ''
    });

    // Modal para exclusão de ação
    const [deleteActionModal, setDeleteActionModal] = useState({
        isOpen: false,
        actionId: null,
        noteText: ''
    });

    // Modal para edição de ação
    const [editActionModal, setEditActionModal] = useState({
        isOpen: false,
        action: null,
        description: '',
        responsible: '',
        dueDate: '',
        saving: false
    });

    // Sincronizar estado local quando a prop mudar (apenas na primeira renderização)
    useEffect(() => {
        setCurrentOpportunity(opportunity);
    }, [opportunity.id]);

    useEffect(() => {
        loadCustomFields();
        loadNotes();
        // Only load actions for non-goal opportunities (real or potential)
        if (!currentOpportunity.is_goal) {
            loadActions();
            loadResponsibles();
        }
    }, [currentOpportunity.id]);

    // Sincronizar drafts com sessionStorage
    useEffect(() => {
        const key = `opportunity_note_draft_${opportunity.id}`;
        if (newNote) {
            console.log(`[OpportunityView] Saving newNote to sessionStorage: key=${key}, value=${newNote}`);
            sessionStorage.setItem(key, newNote);
        } else {
            sessionStorage.removeItem(key);
        }
    }, [newNote, opportunity.id]);

    useEffect(() => {
        const key = `opportunity_action_desc_draft_${opportunity.id}`;
        if (newActionDescription) {
            console.log(`[OpportunityView] Saving newActionDescription to sessionStorage: key=${key}, value=${newActionDescription}`);
            sessionStorage.setItem(key, newActionDescription);
        } else {
            sessionStorage.removeItem(key);
        }
    }, [newActionDescription, opportunity.id]);

    useEffect(() => {
        const key = `opportunity_action_resp_draft_${opportunity.id}`;
        if (newActionResponsible) {
            console.log(`[OpportunityView] Saving newActionResponsible to sessionStorage: key=${key}`);
            sessionStorage.setItem(key, newActionResponsible);
        } else {
            sessionStorage.removeItem(key);
        }
    }, [newActionResponsible, opportunity.id]);

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

    const loadActions = async () => {
        try {
            setLoadingActions(true);
            const data = await opportunityActionsService.getActions(currentOpportunity.id);
            setActions(data);
            const counts = await opportunityActionsService.getActionCounts(currentOpportunity.id);
            setActionCounts(counts);
        } catch (error) {
            console.error('Erro ao carregar ações:', error);
        } finally {
            setLoadingActions(false);
        }
    };

    const loadResponsibles = async () => {
        try {
            const data = await responsiblesService.getResponsibles();
            setResponsibles(data);
        } catch (error) {
            console.error('Erro ao carregar responsáveis:', error);
        }
    };

    const handleAddAction = async () => {
        if (!newActionDescription.trim() || !newActionResponsible) return;

        try {
            setSavingAction(true);
            await opportunityActionsService.createAction(
                currentOpportunity.id,
                newActionDescription.trim(),
                newActionResponsible,
                newActionDueDate || null
            );
            // Limpar drafts do sessionStorage
            sessionStorage.removeItem(`opportunity_action_desc_draft_${opportunity.id}`);
            sessionStorage.removeItem(`opportunity_action_resp_draft_${opportunity.id}`);
            setNewActionDescription('');
            setNewActionResponsible('');
            setNewActionDueDate('');
            await loadActions();
        } catch (error) {
            console.error('Erro ao adicionar ação:', error);
            alert('Erro ao adicionar ação. Tente novamente.');
        } finally {
            setSavingAction(false);
        }
    };

    const handleDeleteAction = (action) => {
        setDeleteActionModal({
            isOpen: true,
            actionId: action.id,
            noteText: ''
        });
    };

    const handleDeleteActionConfirm = async () => {
        try {
            await opportunityActionsService.deleteAction(
                deleteActionModal.actionId,
                currentOpportunity.id,
                deleteActionModal.noteText,
                user?.name || user?.email || 'Usuário'
            );
            setDeleteActionModal({ isOpen: false, actionId: null, noteText: '' });
            await loadActions();
            await loadNotes(); // Reload notes since a new note was created
        } catch (error) {
            console.error('Erro ao excluir ação:', error);
            alert('Erro ao excluir ação. Tente novamente.');
        }
    };

    const handleOpenCompleteModal = (action) => {
        setCompleteModal({
            isOpen: true,
            actionId: action.id,
            noteText: ''
        });
    };

    const handleOpenEditActionModal = (action) => {
        setEditActionModal({
            isOpen: true,
            action,
            description: action.description,
            responsible: action.responsible,
            dueDate: action.due_date || '',
            saving: false
        });
    };

    const handleSaveEditAction = async () => {
        if (!editActionModal.description.trim() || !editActionModal.responsible) return;
        setEditActionModal(prev => ({ ...prev, saving: true }));
        try {
            await opportunityActionsService.updateAction(editActionModal.action.id, {
                description: editActionModal.description.trim(),
                responsible: editActionModal.responsible,
                due_date: editActionModal.dueDate || null
            });
            setEditActionModal({ isOpen: false, action: null, description: '', responsible: '', dueDate: '', saving: false });
            await loadActions();
        } catch (error) {
            console.error('Erro ao editar ação:', error);
            alert('Erro ao salvar alterações. Tente novamente.');
        } finally {
            setEditActionModal(prev => ({ ...prev, saving: false }));
        }
    };

    const handleCompleteAction = async () => {
        try {
            await opportunityActionsService.completeAction(
                completeModal.actionId,
                currentOpportunity.id,
                completeModal.noteText,
                user?.name || user?.email || 'Usuário'
            );
            setCompleteModal({ isOpen: false, actionId: null, noteText: '' });
            await loadActions();
            await loadNotes(); // Reload notes since a new note was created
        } catch (error) {
            console.error('Erro ao concluir ação:', error);
            alert('Erro ao concluir ação. Tente novamente.');
        }
    };

    const calculateActionAge = (createdAt) => {
        return opportunityActionsService.calculateAge(createdAt);
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
            // Limpar draft do sessionStorage
            sessionStorage.removeItem(`opportunity_note_draft_${opportunity.id}`);
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

    const formatMonthYear = (dateString) => {
        if (!dateString) return '-';
        const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const parts = dateString.split('-');

        if (parts.length === 3) {
            const [year, month] = parts;
            return `${months[Number(month) - 1]}/${year.slice(-2)}`;
        }

        const date = new Date(dateString);
        return `${months[date.getMonth()]}/${String(date.getFullYear()).slice(-2)}`;
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

    const allowedNext = getAllowedNextStages();
    // Filter previous stages to exclude any that already appear in allowedNext
    const allowedPrevious = getAllowedPreviousStages().filter(stage =>
        !allowedNext.some(next => next.name === stage.name)
    );

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

            // Create automatic note
            const valueFormatted = formatCurrency(forecast.estimated_value);
            const dateFormatted = formatDate(forecast.period_start);
            const statusText = newInvoicedStatus ? 'Faturado' : 'Pendente';
            const noteContent = `Previsão de faturamento de ${valueFormatted} para ${dateFormatted} marcada como ${statusText}.`;

            await opportunityNotesService.createNote(
                currentOpportunity.id,
                noteContent,
                user?.name || user?.email || 'Sistema'
            );

            // Reload notes to show the new note
            loadNotes();

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

    // Função para renderizar o conteúdo principal (reutilizada entre modos)
    const renderMainContent = () => (
        <>
            {/* Código da Oportunidade */}
            <div style={{ marginBottom: '24px' }}>
                <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    Oportunidade {currentOpportunity.opportunity_number}
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

                <div className="input-group">
                    <label className="label">Possibilidade de Faturamento</label>
                    <div className={styles.viewField}>
                        <span style={{
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '0.85rem',
                            fontWeight: 500,
                            background: currentOpportunity.billing_probability === 'alta' ? 'var(--color-success-light)' :
                                currentOpportunity.billing_probability === 'media' ? 'var(--color-warning-light)' : 'var(--bg-secondary)',
                            color: currentOpportunity.billing_probability === 'alta' ? 'var(--color-success)' :
                                currentOpportunity.billing_probability === 'media' ? 'var(--color-warning)' : 'var(--text-secondary)'
                        }}>
                            {currentOpportunity.billing_probability === 'alta' ? 'Alta' :
                                currentOpportunity.billing_probability === 'media' ? 'Média' : 'Baixa'}
                        </span>
                    </div>
                </div>
            </div>

            {currentOpportunity.notes && (
                <div className="input-group" style={{ marginTop: '16px' }}>
                    <label className="label">Observações</label>
                    <div className={styles.viewField}>{currentOpportunity.notes}</div>
                </div>
            )}
        </>
    );

    // Wrapper component based on fullscreen mode
    const WrapperComponent = fullscreen ? 'div' : 'div';
    const wrapperStyle = fullscreen ? {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'var(--bg-main)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
    } : {};

    const contentStyle = fullscreen ? {
        flex: 1,
        overflow: 'auto',
        padding: '0'
    } : {};

    if (fullscreen) {
        return (
            <div style={wrapperStyle}>
                {/* Header fixo */}
                <div style={{
                    backgroundColor: 'white',
                    borderBottom: '1px solid var(--border-color-light)',
                    padding: '16px 20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexShrink: 0,
                    boxShadow: 'var(--shadow-sm)'
                }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '600' }}>{currentOpportunity.title || 'Sem título'}</h3>
                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                            {currentOpportunity.opportunity_number} - Criado em {formatDate(currentOpportunity.creation_date)}
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'var(--bg-hover)',
                            border: 'none',
                            borderRadius: 'var(--border-radius-sm)',
                            width: '40px',
                            height: '40px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: 'var(--text-secondary)',
                            transition: 'all 0.15s'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--color-danger-light)';
                            e.currentTarget.style.color = 'var(--color-danger)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'var(--bg-hover)';
                            e.currentTarget.style.color = 'var(--text-secondary)';
                        }}
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Conteúdo com scroll */}
                <div style={contentStyle}>
                    <div className="container" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
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
                                            title={`Avançar para ${stage.name}`}
                                        >
                                            {stage.name}
                                            <ChevronRight size={14} />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Restante do conteúdo encapsulado em um card branco */}
                        <div style={{
                            backgroundColor: 'white',
                            borderRadius: 'var(--border-radius-md)',
                            padding: '24px',
                            boxShadow: 'var(--shadow-sm)',
                            border: '1px solid var(--border-color-light)'
                        }}>
                            {renderMainContent()}
                        </div>
                    </div>
                </div>

                {/* Footer de Ações */}
                <div style={{
                    backgroundColor: 'white',
                    borderTop: '1px solid var(--border-color-light)',
                    padding: '16px 20px',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '12px',
                    flexShrink: 0
                }}>
                    <button className="btn btn-secondary" onClick={handleEdit}>
                        <Edit2 size={16} /> Editar
                    </button>
                    <button className="btn btn-danger" onClick={handleDelete}>
                        <Trash2 size={16} /> Excluir
                    </button>
                </div>

                {/* Modals */}
                {confirmModal.isOpen && (
                    <ConfirmModal
                        isOpen={confirmModal.isOpen}
                        title={confirmModal.title}
                        message={confirmModal.message}
                        type={confirmModal.type}
                        onConfirm={() => {
                            confirmModal.onConfirm?.();
                            setConfirmModal({ ...confirmModal, isOpen: false });
                        }}
                        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                    />
                )}

                {completeModal.isOpen && (
                    <div className={styles.modalOverlay} onClick={() => setCompleteModal({ isOpen: false, actionId: null, noteText: '' })}>
                        <div className={styles.modal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                            <div className={styles.modalHeader}>
                                <h3>Concluir Ação</h3>
                                <button className={styles.closeBtn} onClick={() => setCompleteModal({ isOpen: false, actionId: null, noteText: '' })}>
                                    <X size={20} />
                                </button>
                            </div>
                            <div className={styles.modalBody}>
                                <div className="input-group">
                                    <label className="label">Observação (opcional)</label>
                                    <textarea
                                        className="input"
                                        value={completeModal.noteText}
                                        onChange={(e) => setCompleteModal({ ...completeModal, noteText: e.target.value })}
                                        placeholder="Adicione uma observação sobre a conclusão..."
                                        rows={3}
                                    />
                                </div>
                            </div>
                            <div className={styles.modalFooter}>
                                <button className="btn btn-secondary" onClick={() => setCompleteModal({ isOpen: false, actionId: null, noteText: '' })}>
                                    Cancelar
                                </button>
                                <button className="btn btn-primary" onClick={handleCompleteAction}>
                                    <CheckCircle size={16} /> Concluir
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {deleteActionModal.isOpen && (
                    <div className={styles.modalOverlay} onClick={() => setDeleteActionModal({ isOpen: false, actionId: null, noteText: '' })}>
                        <div className={styles.modal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                            <div className={styles.modalHeader}>
                                <h3>Excluir Ação</h3>
                                <button className={styles.closeBtn} onClick={() => setDeleteActionModal({ isOpen: false, actionId: null, noteText: '' })}>
                                    <X size={20} />
                                </button>
                            </div>
                            <div className={styles.modalBody}>
                                <div className="input-group">
                                    <label className="label">Motivo da exclusão (opcional)</label>
                                    <textarea
                                        className="input"
                                        value={deleteActionModal.noteText}
                                        onChange={(e) => setDeleteActionModal({ ...deleteActionModal, noteText: e.target.value })}
                                        placeholder="Adicione uma observação sobre a exclusão..."
                                        rows={3}
                                    />
                                </div>
                            </div>
                            <div className={styles.modalFooter}>
                                <button className="btn btn-secondary" onClick={() => setDeleteActionModal({ isOpen: false, actionId: null, noteText: '' })}>
                                    Cancelar
                                </button>
                                <button className="btn btn-danger" onClick={handleDeleteActionConfirm}>
                                    <Trash size={16} /> Excluir
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div
                className={styles.modal}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header com número e data */}
                <div className={styles.modalHeader} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.75rem', fontWeight: '600' }}>{currentOpportunity.title || 'Sem título'}</h3>
                            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                {currentOpportunity.opportunity_number} - Criado em {formatDate(currentOpportunity.creation_date)}
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

                    {/* Código da Oportunidade (antigo título) */}
                    <div style={{ marginBottom: '24px' }}>
                        <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                            Oportunidade {currentOpportunity.opportunity_number}
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

                        <div className="input-group">
                            <label className="label">Possibilidade de Faturamento</label>
                            <div className={styles.viewField}>
                                <span style={{
                                    padding: '4px 12px',
                                    borderRadius: '12px',
                                    fontSize: '0.85rem',
                                    fontWeight: 500,
                                    background: currentOpportunity.billing_probability === 'alta' ? 'var(--color-success-light)' :
                                        currentOpportunity.billing_probability === 'media' ? 'var(--color-warning-light)' : 'var(--bg-secondary)',
                                    color: currentOpportunity.billing_probability === 'alta' ? 'var(--color-success)' :
                                        currentOpportunity.billing_probability === 'media' ? 'var(--color-warning)' : 'var(--text-secondary)'
                                }}>
                                    {currentOpportunity.billing_probability === 'alta' ? 'Alta' :
                                        currentOpportunity.billing_probability === 'media' ? 'Média' : 'Baixa'}
                                </span>
                            </div>
                        </div>
                    </div>



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

                    {/* Seção de Notas e Ações - com tabs */}
                    <div style={{ marginTop: '32px', borderTop: '1px solid var(--border-color-light)', paddingTop: '24px' }}>
                        {/* Tabs Header - novo design proeminente */}
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', marginBottom: '0' }}>
                            {/* Container fundo das abas */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'flex-end',
                                gap: '4px',
                                flex: 1,
                                background: 'var(--bg-secondary)',
                                borderRadius: '12px 12px 0 0',
                                padding: '8px 8px 0 8px',
                                borderBottom: '2px solid var(--border-color)'
                            }}>
                                {/* Tab de Previsões */}
                                <button
                                    onClick={() => setActiveTab('forecasts')}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '14px 48px',
                                        background: activeTab === 'forecasts' ? 'white' : '#e8eaed',
                                        color: activeTab === 'forecasts' ? 'var(--color-primary)' : '#8a93a2',
                                        border: activeTab === 'forecasts'
                                            ? '2px solid var(--border-color)'
                                            : '2px solid transparent',
                                        borderBottom: activeTab === 'forecasts' ? '2px solid white' : '2px solid var(--border-color)',
                                        borderRadius: '8px 8px 0 0',
                                        marginTop: activeTab === 'forecasts' ? '0' : '6px',
                                        marginBottom: activeTab === 'forecasts' ? '-2px' : '0',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        fontWeight: 600,
                                        transition: 'all 0.2s',
                                        boxShadow: activeTab === 'forecasts' ? '0 -2px 8px rgba(0,0,0,0.06)' : 'none',
                                        whiteSpace: 'nowrap',
                                        position: 'relative',
                                        outline: 'none'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (activeTab !== 'forecasts') {
                                            e.currentTarget.style.background = 'rgba(255,255,255,0.8)';
                                            e.currentTarget.style.color = 'var(--text-primary)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (activeTab !== 'forecasts') {
                                            e.currentTarget.style.background = '#f0f2f5';
                                            e.currentTarget.style.color = '#8a93a2';
                                        }
                                    }}
                                >
                                    <Calendar size={16} />
                                    Previsões
                                    <span style={{
                                        background: activeTab === 'forecasts' ? 'var(--color-primary)' : 'var(--border-color)',
                                        color: activeTab === 'forecasts' ? 'white' : 'var(--text-secondary)',
                                        padding: '2px 8px',
                                        borderRadius: '10px',
                                        fontSize: '12px',
                                        fontWeight: 700,
                                        minWidth: '22px',
                                        textAlign: 'center'
                                    }}>
                                        {currentOpportunity.forecasts?.length || 0}
                                    </span>
                                </button>

                                {/* Tab de Ações - apenas para oportunidades não-meta */}
                                {!currentOpportunity.is_goal && (
                                    <button
                                        onClick={() => setActiveTab('actions')}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '14px 48px',
                                            background: activeTab === 'actions' ? 'white' : '#e8eaed',
                                            color: activeTab === 'actions' ? 'var(--color-primary)' : '#8a93a2',
                                            border: activeTab === 'actions'
                                                ? '2px solid var(--border-color)'
                                                : '2px solid transparent',
                                            borderBottom: activeTab === 'actions' ? '2px solid white' : '2px solid var(--border-color)',
                                            borderRadius: '8px 8px 0 0',
                                            marginTop: activeTab === 'actions' ? '0' : '6px',
                                            marginBottom: activeTab === 'actions' ? '-2px' : '0',
                                            cursor: 'pointer',
                                            fontSize: '14px',
                                            fontWeight: 600,
                                            transition: 'all 0.2s',
                                            boxShadow: activeTab === 'actions' ? '0 -2px 8px rgba(0,0,0,0.06)' : 'none',
                                            whiteSpace: 'nowrap',
                                            position: 'relative',
                                            outline: 'none'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (activeTab !== 'actions') {
                                                e.currentTarget.style.background = 'rgba(255,255,255,0.8)';
                                                e.currentTarget.style.color = 'var(--text-primary)';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (activeTab !== 'actions') {
                                                e.currentTarget.style.background = '#f0f2f5';
                                                e.currentTarget.style.color = '#8a93a2';
                                            }
                                        }}
                                    >
                                        <CheckSquare size={16} />
                                        Ações
                                        <span style={{
                                            background: actionCounts.pending > 0 ? 'var(--color-warning)' : (activeTab === 'actions' ? 'var(--color-primary)' : 'var(--border-color)'),
                                            color: actionCounts.pending > 0 || activeTab === 'actions' ? 'white' : 'var(--text-secondary)',
                                            padding: '2px 8px',
                                            borderRadius: '10px',
                                            fontSize: '12px',
                                            fontWeight: 700,
                                            minWidth: '22px',
                                            textAlign: 'center'
                                        }}>
                                            {actionCounts.pending} / {actionCounts.pending + actionCounts.completed}
                                        </span>
                                    </button>
                                )}

                                {/* Tab de Notas */}
                                <button
                                    onClick={() => setActiveTab('notes')}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '14px 48px',
                                        background: activeTab === 'notes' ? 'white' : '#e8eaed',
                                        color: activeTab === 'notes' ? 'var(--color-primary)' : '#8a93a2',
                                        border: activeTab === 'notes'
                                            ? '2px solid var(--border-color)'
                                            : '2px solid transparent',
                                        borderBottom: activeTab === 'notes' ? '2px solid white' : '2px solid var(--border-color)',
                                        borderRadius: '8px 8px 0 0',
                                        marginTop: activeTab === 'notes' ? '0' : '6px',
                                        marginBottom: activeTab === 'notes' ? '-2px' : '0',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        fontWeight: 600,
                                        transition: 'all 0.2s',
                                        boxShadow: activeTab === 'notes' ? '0 -2px 8px rgba(0,0,0,0.06)' : 'none',
                                        whiteSpace: 'nowrap',
                                        position: 'relative',
                                        outline: 'none'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (activeTab !== 'notes') {
                                            e.currentTarget.style.background = 'rgba(255,255,255,0.8)';
                                            e.currentTarget.style.color = 'var(--text-primary)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (activeTab !== 'notes') {
                                            e.currentTarget.style.background = '#f0f2f5';
                                            e.currentTarget.style.color = '#8a93a2';
                                        }
                                    }}
                                >
                                    <MessageSquare size={16} />
                                    Notas
                                    <span style={{
                                        background: activeTab === 'notes' ? 'var(--color-primary)' : 'var(--border-color)',
                                        color: activeTab === 'notes' ? 'white' : 'var(--text-secondary)',
                                        padding: '2px 8px',
                                        borderRadius: '10px',
                                        fontSize: '12px',
                                        fontWeight: 700,
                                        minWidth: '22px',
                                        textAlign: 'center'
                                    }}>
                                        {notes.length}
                                    </span>
                                </button>
                            </div>

                            {/* Botão de filtros - fora das abas, alinhado à direita */}
                            {(activeTab === 'notes' || activeTab === 'actions') && (
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => activeTab === 'notes' ? setShowFilters(!showFilters) : setShowActionFilters(!showActionFilters)}
                                    style={{
                                        fontSize: '13px',
                                        padding: '8px 14px',
                                        marginBottom: '2px',
                                        flexShrink: 0
                                    }}
                                >
                                    <Search size={14} />
                                    Filtros
                                </button>
                            )}
                        </div>
                        {/* Linha separadora entre tabs e conteúdo */}
                        <div style={{ marginBottom: '16px' }} />

                        {/* Conteúdo da Tab de Previsões */}
                        {activeTab === 'forecasts' && (
                            <div style={{
                                border: '1px solid var(--border-color-light)',
                                borderRadius: '8px',
                                overflow: 'hidden'
                            }}>
                                {currentOpportunity.forecasts && currentOpportunity.forecasts.length > 0 ? (
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
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                                <span>{formatDate(forecast.period_start)} - {formatDate(forecast.period_end)}</span>
                                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                                    Fim: {formatMonthYear(forecast.period_end)}
                                                                </span>
                                                            </div>
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
                                                            {currentOpportunity.is_goal ? (
                                                                <span style={{ color: 'var(--text-tertiary)' }}>-</span>
                                                            ) : (
                                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                                                    <span style={{
                                                                        fontSize: '0.8rem',
                                                                        color: forecast.invoiced ? 'var(--color-success)' : 'var(--text-secondary)',
                                                                        fontWeight: 500,
                                                                        minWidth: '60px',
                                                                        textAlign: 'right'
                                                                    }}>
                                                                        {forecast.invoiced ? 'Faturado' : 'Pendente'}
                                                                    </span>
                                                                    <div title={forecast.invoiced ? 'Clique para marcar como pendente' : 'Clique para marcar como faturado'}>
                                                                        <Checkbox
                                                                            checked={forecast.invoiced}
                                                                            onChange={() => handleToggleInvoiced(forecast)}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            )}
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
                                ) : (
                                    <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                        <Calendar size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
                                        <p style={{ margin: 0 }}>Nenhuma previsão de faturamento registrada.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Conteúdo da Tab de Notas */}
                        {activeTab === 'notes' && (
                            <>
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
                                                        <div style={{ display: 'flex', gap: '6px' }}>
                                                            <button
                                                                onClick={() => handleStartEditNote(note)}
                                                                className="btn btn-secondary"
                                                                style={{
                                                                    fontSize: '12px',
                                                                    padding: '6px 12px',
                                                                    gap: '4px'
                                                                }}
                                                                title="Editar nota"
                                                            >
                                                                <Edit2 size={14} />
                                                                Editar
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteNote(note.id)}
                                                                className="btn btn-secondary"
                                                                style={{
                                                                    fontSize: '12px',
                                                                    padding: '6px 12px',
                                                                    gap: '4px'
                                                                }}
                                                                title="Excluir nota"
                                                            >
                                                                <Trash size={14} />
                                                                Excluir
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
                            </>
                        )}

                        {/* Conteúdo da Tab de Ações */}
                        {activeTab === 'actions' && !currentOpportunity.is_goal && (
                            <div>
                                {/* Filtros de Ações */}
                                {showActionFilters && (
                                    <div style={{
                                        background: 'var(--bg-main)',
                                        padding: '16px',
                                        borderRadius: '8px',
                                        marginBottom: '16px',
                                        border: '1px solid var(--border-color-light)'
                                    }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                                            <div className="input-group" style={{ margin: 0 }}>
                                                <label className="label" style={{ fontSize: '12px' }}>Buscar na descrição</label>
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
                                                        placeholder="Pesquisar nas ações..."
                                                        value={actionSearchText}
                                                        onChange={(e) => setActionSearchText(e.target.value)}
                                                        style={{ paddingLeft: '36px', fontSize: '13px' }}
                                                    />
                                                </div>
                                            </div>
                                            <div className="input-group" style={{ margin: 0 }}>
                                                <label className="label" style={{ fontSize: '12px' }}>Status</label>
                                                <select
                                                    className="input"
                                                    value={actionStatusFilter}
                                                    onChange={(e) => setActionStatusFilter(e.target.value)}
                                                    style={{ fontSize: '13px' }}
                                                >
                                                    <option value="">Todos</option>
                                                    <option value="pendente">Pendente</option>
                                                    <option value="concluida">Concluída</option>
                                                </select>
                                            </div>
                                            <div className="input-group" style={{ margin: 0 }}>
                                                <label className="label" style={{ fontSize: '12px' }}>Responsável</label>
                                                <select
                                                    className="input"
                                                    value={actionResponsibleFilter}
                                                    onChange={(e) => setActionResponsibleFilter(e.target.value)}
                                                    style={{ fontSize: '13px' }}
                                                >
                                                    <option value="">Todos</option>
                                                    {responsibles.map(r => (
                                                        <option key={r.id} value={r.name}>{r.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                        {(actionSearchText || actionResponsibleFilter || actionStatusFilter) && (
                                            <button
                                                className="btn btn-secondary"
                                                onClick={() => { setActionSearchText(''); setActionResponsibleFilter(''); setActionStatusFilter(''); }}
                                                style={{ marginTop: '12px', fontSize: '12px', padding: '6px 12px' }}
                                            >
                                                <X size={12} />
                                                Limpar filtros
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* Form para adicionar nova ação */}
                                <div style={{ marginBottom: '20px', padding: '16px', background: 'var(--bg-main)', borderRadius: '8px', border: '1px solid var(--border-color-light)' }}>
                                    <div style={{ marginBottom: '12px' }}>
                                        <div className="input-group" style={{ margin: '0 0 12px 0' }}>
                                            <label className="label" style={{ fontSize: '12px' }}>Descrição da Ação</label>
                                            <textarea
                                                className="input"
                                                rows={3}
                                                placeholder="Descreva a ação a ser realizada..."
                                                value={newActionDescription}
                                                onChange={(e) => setNewActionDescription(e.target.value)}
                                                style={{ resize: 'none', overflowY: 'auto' }}
                                            />
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px' }}>
                                        <div className="input-group" style={{ margin: 0, minWidth: '200px' }}>
                                            <label className="label" style={{ fontSize: '12px' }}>Responsável</label>
                                            <select
                                                className="input"
                                                value={newActionResponsible}
                                                onChange={(e) => setNewActionResponsible(e.target.value)}
                                            >
                                                <option value="">Selecione...</option>
                                                {responsibles.map(r => (
                                                    <option key={r.id} value={r.name}>{r.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="input-group" style={{ margin: 0, minWidth: '160px' }}>
                                            <label className="label" style={{ fontSize: '12px' }}>Previsão de Conclusão</label>
                                            <input
                                                type="date"
                                                className="input"
                                                value={newActionDueDate}
                                                onChange={(e) => setNewActionDueDate(e.target.value)}
                                            />
                                        </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                        <button
                                            className="btn btn-primary"
                                            onClick={handleAddAction}
                                            disabled={!newActionDescription.trim() || !newActionResponsible || savingAction}
                                            style={{ fontSize: '13px', padding: '8px 16px' }}
                                        >
                                            <Plus size={16} />
                                            {savingAction ? 'Adicionando...' : 'Adicionar Ação'}
                                        </button>
                                    </div>
                                </div>

                                {/* Lista de ações */}
                                <div style={{
                                    border: actions.length > 0 ? '1px solid var(--border-color-light)' : 'none',
                                    borderRadius: '8px'
                                }}>
                                    {loadingActions ? (
                                        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                            Carregando ações...
                                        </div>
                                    ) : actions.length === 0 ? (
                                        <div style={{
                                            padding: '32px',
                                            textAlign: 'center',
                                            color: 'var(--text-secondary)',
                                            background: 'var(--bg-main)',
                                            borderRadius: '8px'
                                        }}>
                                            <CheckSquare size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
                                            <p style={{ margin: 0 }}>Nenhuma ação registrada ainda.</p>
                                        </div>
                                    ) : (
                                        actions
                                            .filter(action => {
                                                if (actionSearchText && !action.description.toLowerCase().includes(actionSearchText.toLowerCase())) return false;
                                                if (actionResponsibleFilter && action.responsible !== actionResponsibleFilter) return false;
                                                if (actionStatusFilter && action.status !== actionStatusFilter) return false;
                                                return true;
                                            })
                                            .map((action, index, filteredActions) => {
                                                const age = calculateActionAge(action.created_at);
                                                const isDueDateOverdue = action.status === 'pendente' && action.due_date && new Date(action.due_date + 'T23:59:59') < new Date();
                                                const isOverdue = action.status === 'pendente' && (isDueDateOverdue || age > 7);

                                                return (
                                                    <div
                                                        key={action.id}
                                                        style={{
                                                            padding: '16px',
                                                            borderBottom: index < filteredActions.length - 1 ? '1px solid var(--border-color-light)' : 'none',
                                                            background: action.status === 'concluida' ? 'rgba(16, 185, 129, 0.05)' : 'white'
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                                {/* Status badge */}
                                                                <span style={{
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: '4px',
                                                                    padding: '4px 10px',
                                                                    borderRadius: '12px',
                                                                    fontSize: '0.8rem',
                                                                    fontWeight: 500,
                                                                    background: action.status === 'concluida' ? 'var(--color-success)' : 'var(--color-warning)',
                                                                    color: 'white'
                                                                }}>
                                                                    {action.status === 'concluida' ? <CheckCircle size={14} /> : <Clock size={14} />}
                                                                    {action.status === 'concluida' ? 'Concluída' : 'Pendente'}
                                                                </span>

                                                                {/* Idade da ação */}
                                                                <span style={{
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: '4px',
                                                                    padding: '4px 10px',
                                                                    borderRadius: '12px',
                                                                    fontSize: '0.8rem',
                                                                    background: isOverdue ? 'var(--color-danger-light)' : 'var(--bg-secondary)',
                                                                    color: isOverdue ? 'var(--color-danger)' : 'var(--text-secondary)',
                                                                    fontWeight: isOverdue ? 600 : 400
                                                                }}>
                                                                    {isOverdue && <AlertCircle size={14} />}
                                                                    {age} {age === 1 ? 'dia' : 'dias'}
                                                                </span>

                                                                {/* Responsável */}
                                                                <span style={{
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: '4px',
                                                                    padding: '4px 10px',
                                                                    borderRadius: '12px',
                                                                    fontSize: '0.8rem',
                                                                    background: 'var(--bg-hover)',
                                                                    color: 'var(--text-secondary)'
                                                                }}>
                                                                    <User size={14} />
                                                                    {action.responsible}
                                                                </span>

                                                                {/* Data de previsão de conclusão */}
                                                                {action.due_date && (
                                                                    <span style={{
                                                                        display: 'inline-flex',
                                                                        alignItems: 'center',
                                                                        gap: '4px',
                                                                        padding: '4px 10px',
                                                                        borderRadius: '12px',
                                                                        fontSize: '0.8rem',
                                                                        background: isDueDateOverdue ? 'var(--color-danger-light)' : 'var(--bg-hover)',
                                                                        color: isDueDateOverdue ? 'var(--color-danger)' : 'var(--text-secondary)',
                                                                        fontWeight: isDueDateOverdue ? 600 : 400
                                                                    }}>
                                                                        <Calendar size={14} />
                                                                        {(() => {
                                                                            const [y, m, d] = action.due_date.split('-');
                                                                            return `${d}/${m}/${y}`;
                                                                        })()}
                                                                    </span>
                                                                )}
                                                            </div>

                                                            {/* Action buttons */}
                                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                                {action.status === 'pendente' && (
                                                                    <button
                                                                        onClick={() => handleOpenCompleteModal(action)}
                                                                        className="btn btn-secondary"
                                                                        style={{
                                                                            fontSize: '12px',
                                                                            padding: '6px 12px',
                                                                            gap: '4px'
                                                                        }}
                                                                        title="Concluir ação"
                                                                    >
                                                                        <CheckCircle size={14} />
                                                                        Concluir
                                                                    </button>
                                                                )}
                                                                <button
                                                                    onClick={() => handleOpenEditActionModal(action)}
                                                                    className="btn btn-secondary"
                                                                    style={{
                                                                        fontSize: '12px',
                                                                        padding: '6px 12px',
                                                                        gap: '4px'
                                                                    }}
                                                                    title="Editar ação"
                                                                >
                                                                    <Edit2 size={14} />
                                                                    Editar
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteAction(action)}
                                                                    className="btn btn-secondary"
                                                                    style={{
                                                                        fontSize: '12px',
                                                                        padding: '6px 12px',
                                                                        gap: '4px'
                                                                    }}
                                                                    title="Excluir ação"
                                                                >
                                                                    <Trash size={14} />
                                                                    Excluir
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* Descrição */}
                                                        <p style={{
                                                            margin: 0,
                                                            lineHeight: 1.5,
                                                            color: action.status === 'concluida' ? 'var(--text-secondary)' : 'var(--text-primary)',
                                                            textDecoration: action.status === 'concluida' ? 'line-through' : 'none'
                                                        }}>
                                                            {action.description}
                                                        </p>
                                                    </div>
                                                );
                                            })
                                    )}
                                </div>
                            </div>
                        )}
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

                {/* Modal de Conclusão de Ação */}
                {completeModal.isOpen && (
                    <div
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'rgba(0, 0, 0, 0.5)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 1100
                        }}
                        onClick={() => setCompleteModal({ isOpen: false, actionId: null, noteText: '' })}
                    >
                        <div
                            style={{
                                background: 'white',
                                borderRadius: '12px',
                                padding: '24px',
                                maxWidth: '500px',
                                width: '90%',
                                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <CheckCircle size={24} style={{ color: 'var(--color-success)' }} />
                                Concluir Ação
                            </h3>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '14px' }}>
                                Uma nota será gerada automaticamente ao concluir esta ação.
                                Você pode adicionar informações adicionais abaixo (opcional):
                            </p>
                            <textarea
                                className="input"
                                placeholder="Adicione observações sobre a conclusão da ação (opcional)..."
                                value={completeModal.noteText}
                                onChange={(e) => setCompleteModal({ ...completeModal, noteText: e.target.value })}
                                rows={4}
                                style={{ resize: 'vertical', minHeight: '100px', marginBottom: '16px' }}
                            />
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => setCompleteModal({ isOpen: false, actionId: null, noteText: '' })}
                                >
                                    Cancelar
                                </button>
                                <button
                                    className="btn btn-primary"
                                    onClick={handleCompleteAction}
                                    style={{ background: 'var(--color-success)', borderColor: 'var(--color-success)' }}
                                >
                                    <CheckCircle size={16} />
                                    Concluir Ação
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal de Exclusão de Ação */}
                {deleteActionModal.isOpen && (
                    <div
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'rgba(0, 0, 0, 0.5)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 1100
                        }}
                        onClick={() => setDeleteActionModal({ isOpen: false, actionId: null, noteText: '' })}
                    >
                        <div
                            style={{
                                background: 'white',
                                borderRadius: '12px',
                                padding: '24px',
                                maxWidth: '500px',
                                width: '90%',
                                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Trash size={24} style={{ color: 'var(--color-danger)' }} />
                                Excluir Ação
                            </h3>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '14px' }}>
                                Uma nota será gerada automaticamente ao excluir esta ação.
                                Você pode adicionar informações adicionais abaixo (opcional):
                            </p>
                            <textarea
                                className="input"
                                placeholder="Adicione o motivo da exclusão (opcional)..."
                                value={deleteActionModal.noteText}
                                onChange={(e) => setDeleteActionModal({ ...deleteActionModal, noteText: e.target.value })}
                                rows={4}
                                style={{ resize: 'vertical', minHeight: '100px', marginBottom: '16px' }}
                            />
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => setDeleteActionModal({ isOpen: false, actionId: null, noteText: '' })}
                                >
                                    Cancelar
                                </button>
                                <button
                                    className="btn btn-primary"
                                    onClick={handleDeleteActionConfirm}
                                    style={{ background: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
                                >
                                    <Trash size={16} />
                                    Excluir Ação
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal de Edição de Ação */}
                {editActionModal.isOpen && (
                    <div
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'rgba(0, 0, 0, 0.5)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 1100
                        }}
                        onClick={() => setEditActionModal({ isOpen: false, action: null, description: '', responsible: '', dueDate: '', saving: false })}
                    >
                        <div
                            style={{
                                background: 'white',
                                borderRadius: '12px',
                                padding: '28px',
                                maxWidth: '560px',
                                width: '90%',
                                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3 style={{ margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.1rem' }}>
                                <Edit2 size={20} style={{ color: 'var(--color-primary)' }} />
                                Editar Ação
                            </h3>

                            <div className="input-group" style={{ marginBottom: '16px' }}>
                                <label className="label" style={{ fontSize: '12px' }}>Descrição da Ação</label>
                                <textarea
                                    className="input"
                                    rows={4}
                                    placeholder="Descreva a ação a ser realizada..."
                                    value={editActionModal.description}
                                    onChange={(e) => setEditActionModal(prev => ({ ...prev, description: e.target.value }))}
                                    style={{ resize: 'vertical', minHeight: '100px' }}
                                    autoFocus
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                                <div className="input-group" style={{ margin: 0 }}>
                                    <label className="label" style={{ fontSize: '12px' }}>Responsável</label>
                                    <select
                                        className="input"
                                        value={editActionModal.responsible}
                                        onChange={(e) => setEditActionModal(prev => ({ ...prev, responsible: e.target.value }))}
                                    >
                                        <option value="">Selecione...</option>
                                        {responsibles.map(r => (
                                            <option key={r.id} value={r.name}>{r.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="input-group" style={{ margin: 0 }}>
                                    <label className="label" style={{ fontSize: '12px' }}>Previsão de Conclusão</label>
                                    <input
                                        type="date"
                                        className="input"
                                        value={editActionModal.dueDate}
                                        onChange={(e) => setEditActionModal(prev => ({ ...prev, dueDate: e.target.value }))}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => setEditActionModal({ isOpen: false, action: null, description: '', responsible: '', dueDate: '', saving: false })}
                                    disabled={editActionModal.saving}
                                >
                                    Cancelar
                                </button>
                                <button
                                    className="btn btn-primary"
                                    onClick={handleSaveEditAction}
                                    disabled={!editActionModal.description.trim() || !editActionModal.responsible || editActionModal.saving}
                                >
                                    <Save size={16} />
                                    {editActionModal.saving ? 'Salvando...' : 'Salvar Alterações'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OpportunityView;
