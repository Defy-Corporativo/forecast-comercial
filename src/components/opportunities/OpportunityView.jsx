import React, { useState, useEffect } from 'react';
import { X, Edit2, Trash2, Plus, Search, Calendar, MessageSquare, CheckCircle, Circle, Trash, Save, XCircle, DollarSign, Layers } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useStageContext } from '../../contexts/StageContext';
import { settingsService } from '../../services/settingsService';
import { opportunityNotesService } from '../../services/opportunityNotesService';
import { opportunityService } from '../../services/opportunityService';
import styles from './Opportunities.module.css';

const OpportunityView = ({ opportunity, onClose, onEdit, onDelete, onUpdate }) => {
    const { user } = useAuth();
    const { stages } = useStageContext();
    const [customFields, setCustomFields] = useState([]);

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

    useEffect(() => {
        loadCustomFields();
        loadNotes();
    }, [opportunity.id]);

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

            const data = await opportunityNotesService.getNotes(opportunity.id, filters);
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
                opportunityId: opportunity.id,
                content: newNote.trim(),
                createdBy: user?.name || user?.email || 'Usuário'
            });

            const result = await opportunityNotesService.createNote(
                opportunity.id,
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
        if (!window.confirm('Tem certeza que deseja excluir esta nota?')) return;

        try {
            await opportunityNotesService.deleteNote(noteId);
            loadNotes();
        } catch (error) {
            console.error('Erro ao excluir nota:', error);
            alert('Erro ao excluir nota. Tente novamente.');
        }
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
        return new Date(dateString).toLocaleDateString('pt-BR');
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
        onEdit(opportunity);
        onClose();
    };

    const handleDelete = () => {
        if (window.confirm('Tem certeza que deseja excluir esta oportunidade?')) {
            onDelete(opportunity.id);
            onClose();
        }
    };

    // Ordenar estágios e determinar posição atual
    const sortedStages = [...stages].sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
    const currentStageIndex = sortedStages.findIndex(s => s.name === opportunity.stage);

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
                            <h3 style={{ margin: 0 }}>Oportunidade {opportunity.opportunity_number}</h3>
                            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                Criado em {formatDate(opportunity.creation_date)}
                            </span>
                        </div>
                        <button className={styles.closeBtn} onClick={onClose}><X size={24} /></button>
                    </div>
                </div>

                <div className={styles.modalBody}>
                    {/* Roadmap de Estágios - Dinâmico */}
                    <div style={{ marginBottom: '20px' }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 20px',
                            background: 'var(--bg-main)',
                            borderRadius: '8px',
                            border: '1px solid var(--border-color-light)',
                            overflowX: 'auto'
                        }}>
                            {sortedStages.map((stage, index) => {
                                const isPassed = index <= currentStageIndex;
                                const isCurrent = index === currentStageIndex;
                                const isLast = index === sortedStages.length - 1;

                                // Lógica de Transição
                                const currentStageDef = sortedStages[currentStageIndex];
                                // Se não tiver allowed_next_stages definido (null ou vazio), assume comportamento linear padrão (próximo índice)
                                // Mas se tiver definido, respeita estritamente
                                const allowedNext = currentStageDef?.allowed_next_stages;

                                let isAllowed = false;
                                if (isCurrent) {
                                    isAllowed = false; // Já está nele
                                } else if (allowedNext && allowedNext.length > 0) {
                                    // Se tem regras explícitas, verifica se o nome está na lista
                                    isAllowed = allowedNext.includes(stage.name);
                                } else {
                                    // Comportamento padrão (fallback): permite ir para o próximo imediato ou voltar para qualquer anterior
                                    isAllowed = index === currentStageIndex + 1 || index < currentStageIndex;
                                }

                                return (
                                    <React.Fragment key={stage.id || stage.name}>
                                        <div
                                            onClick={async () => {
                                                if (isAllowed) {
                                                    if (window.confirm(`Mover oportunidade para "${stage.name}"?`)) {
                                                        try {
                                                            await opportunityService.updateOpportunity(opportunity.id, { stage: stage.name });
                                                            if (onUpdate) onUpdate(); // Recarrega dados
                                                            onClose(); // Fecha modal (opcional, ou apenas recarrega)
                                                        } catch (error) {
                                                            console.error('Erro ao mudar estágio:', error);
                                                            alert('Erro ao mudar estágio.');
                                                        }
                                                    }
                                                }
                                            }}
                                            style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                minWidth: '70px',
                                                cursor: isAllowed ? 'pointer' : 'default',
                                                opacity: (isPassed || isAllowed) ? 1 : 0.5,
                                                position: 'relative'
                                            }}
                                            title={isAllowed ? `Mover para ${stage.name}` : (isCurrent ? 'Estágio Atual' : 'Transição não permitida')}
                                        >
                                            {/* Indicador de "Clicável" */}
                                            {isAllowed && (
                                                <div style={{
                                                    position: 'absolute',
                                                    top: '-8px',
                                                    fontSize: '10px',
                                                    fontWeight: 'bold',
                                                    color: 'var(--color-primary)',
                                                    animation: 'bounce 1s infinite'
                                                }}>
                                                    ↓
                                                </div>
                                            )}

                                            {/* Círculo do estágio */}
                                            <div style={{
                                                width: isCurrent ? '28px' : '22px',
                                                height: isCurrent ? '28px' : '22px',
                                                borderRadius: '50%',
                                                background: isPassed
                                                    ? (stage.color || 'var(--color-primary)')
                                                    : 'var(--bg-secondary)',
                                                border: `2px solid ${isPassed
                                                    ? (stage.color || 'var(--color-primary)')
                                                    : (isAllowed ? 'var(--color-primary)' : 'var(--border-color)')}`,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                transition: 'all 0.3s ease',
                                                boxShadow: isCurrent
                                                    ? `0 0 0 4px ${stage.color || 'var(--color-primary)'}30`
                                                    : (isAllowed ? `0 0 6px ${stage.color || 'var(--color-primary)'}40` : 'none')
                                            }}>
                                                {isPassed && (
                                                    <div style={{
                                                        width: '8px',
                                                        height: '8px',
                                                        borderRadius: '50%',
                                                        background: 'white'
                                                    }} />
                                                )}
                                            </div>
                                            {/* Nome do estágio */}
                                            <span style={{
                                                marginTop: '4px',
                                                fontSize: '10px',
                                                fontWeight: isCurrent ? 600 : 400,
                                                color: isCurrent
                                                    ? 'var(--text-primary)'
                                                    : (isAllowed ? 'var(--color-primary)' : 'var(--text-tertiary)'),
                                                textAlign: 'center',
                                                maxWidth: '70px',
                                                lineHeight: 1.2
                                            }}>
                                                {stage.name}
                                            </span>
                                        </div>

                                        {/* Linha de conexão */}
                                        {!isLast && (
                                            <div style={{
                                                flex: 1,
                                                height: '2px',
                                                background: index < currentStageIndex
                                                    ? `linear-gradient(90deg, ${sortedStages[index].color || 'var(--color-primary)'}, ${sortedStages[index + 1].color || 'var(--color-primary)'})`
                                                    : 'var(--border-color)',
                                                margin: '0 4px',
                                                marginBottom: '20px',
                                                borderRadius: '1px',
                                                minWidth: '16px'
                                            }} />
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </div>
                        <style>{`
                            @keyframes bounce {
                                0%, 100% { transform: translateY(0); }
                                50% { transform: translateY(-3px); }
                            }
                        `}</style>
                    </div>

                    {/* Título da Oportunidade */}
                    <div style={{ marginBottom: '24px' }}>
                        <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--text-primary)' }}>
                            {opportunity.title || '-'}
                        </h2>
                    </div>

                    {/* Campos principais */}
                    <div className={styles.formGrid}>
                        <div className="input-group">
                            <label className="label">Cliente / Empresa</label>
                            <div className={styles.viewField}>
                                {opportunity.client?.name || opportunity.client_name}
                            </div>
                        </div>

                        <div className="input-group">
                            <label className="label">Valor Total</label>
                            <div className={styles.viewField} style={{ fontWeight: 600, color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {formatCurrency(opportunity.total_value || opportunity.estimated_value)}
                                {(opportunity.forecast_count || opportunity.forecasts?.length || 0) > 1 && (
                                    <span style={{
                                        fontSize: '0.75rem',
                                        color: 'var(--text-secondary)',
                                        background: 'var(--bg-secondary)',
                                        padding: '2px 8px',
                                        borderRadius: '4px',
                                        fontWeight: 'normal'
                                    }}>
                                        <Layers size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                                        {opportunity.forecast_count || opportunity.forecasts?.length} previsões
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="input-group">
                            <label className="label">Responsável</label>
                            <div className={styles.viewField}>{opportunity.responsible || '-'}</div>
                        </div>
                    </div>

                    {/* Seção de Previsões de Faturamento */}
                    {opportunity.forecasts && opportunity.forecasts.length > 0 && (
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
                                        {opportunity.forecasts
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
                                                        <button
                                                            onClick={async () => {
                                                                try {
                                                                    await opportunityService.updateForecastInvoiced(forecast.id, !forecast.invoiced);
                                                                    if (onUpdate) onUpdate();
                                                                } catch (error) {
                                                                    console.error('Erro ao atualizar status:', error);
                                                                }
                                                            }}
                                                            style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '4px',
                                                                padding: '4px 10px',
                                                                borderRadius: '12px',
                                                                border: 'none',
                                                                cursor: 'pointer',
                                                                fontSize: '0.8rem',
                                                                fontWeight: 500,
                                                                background: forecast.invoiced ? 'var(--color-success)' : 'var(--bg-secondary)',
                                                                color: forecast.invoiced ? 'white' : 'var(--text-secondary)',
                                                                transition: 'all 0.2s'
                                                            }}
                                                            title={forecast.invoiced ? 'Clique para marcar como pendente' : 'Clique para marcar como faturado'}
                                                        >
                                                            {forecast.invoiced ? (
                                                                <><CheckCircle size={14} /> Faturado</>
                                                            ) : (
                                                                <><Circle size={14} /> Pendente</>
                                                            )}
                                                        </button>
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
                                                {formatCurrency(opportunity.forecasts.reduce((sum, f) => sum + parseFloat(f.estimated_value || 0), 0))}
                                            </td>
                                            <td style={{ padding: '12px', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                {opportunity.forecasts.filter(f => f.invoiced).length}/{opportunity.forecasts.length} faturados
                                            </td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    )}

                    {opportunity.notes && (
                        <div className="input-group" style={{ marginTop: '16px' }}>
                            <label className="label">Observações</label>
                            <div className={styles.viewField}>{opportunity.notes}</div>
                        </div>
                    )}

                    {/* Campos customizados */}
                    {customFields.length > 0 && opportunity.custom_data && (
                        <>
                            <h4 className={styles.sectionSubtitle}>Informações Adicionais</h4>
                            <div className={styles.formGrid}>
                                {customFields.map(field => {
                                    const value = opportunity.custom_data[field.field_name];
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

                <div className={styles.modalFooter}>
                    <button type="button" className="btn btn-secondary" onClick={onClose}>
                        Fechar
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={handleEdit}>
                        <Edit2 size={16} />
                        Editar
                    </button>
                    <button type="button" className="btn btn-danger" onClick={handleDelete}>
                        <Trash2 size={16} />
                        Excluir
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OpportunityView;
