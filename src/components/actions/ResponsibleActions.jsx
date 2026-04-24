import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Clock, CheckCircle, AlertCircle, Briefcase, Calendar, Save, CheckSquare, AlertTriangle, ShieldAlert } from 'lucide-react';
import { responsiblesService } from '../../services/responsiblesService';
import { opportunityActionsService } from '../../services/opportunityActionsService';
import { supabase } from '../../services/supabaseClient';
import styles from './ResponsibleActions.module.css';

const ResponsibleActions = () => {
    const { responsibleId } = useParams();
    const [responsible, setResponsible] = useState(null);
    const [actions, setActions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [notes, setNotes] = useState({}); // { actionId: noteText }
    const [savingAction, setSavingAction] = useState(null);
    const [completingAction, setCompletingAction] = useState(null);
    const [toast, setToast] = useState(null);
    const [completeFlags, setCompleteFlags] = useState({}); // { actionId: boolean }

    // Controle de acesso
    const [loggedResponsible, setLoggedResponsible] = useState(null); // registro completo do responsável logado
    const [isOwner, setIsOwner] = useState(false);
    const [authChecked, setAuthChecked] = useState(false);

    const showToast = useCallback((message) => {
        setToast(message);
        setTimeout(() => setToast(null), 3000);
    }, []);

    // Verificar sessão do usuário logado e buscar seu registro de responsável
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user?.email) {
                    const resp = await responsiblesService.getResponsibleByEmail(session.user.email);
                    if (resp) {
                        setLoggedResponsible(resp);
                    }
                }
            } catch (err) {
                // Sem sessão ou sem cadastro = visitante
            } finally {
                setAuthChecked(true);
            }
        };
        checkAuth();
    }, []);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const resp = await responsiblesService.getResponsibleById(responsibleId);
            setResponsible(resp);

            const actionsData = await opportunityActionsService.getActionsByResponsibleName(resp.name);
            setActions(actionsData);
        } catch (err) {
            console.error('Erro ao carregar dados:', err);
            setError('Responsável não encontrado ou link inválido.');
        } finally {
            setLoading(false);
        }
    }, [responsibleId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Determinar se o usuário logado é o dono do link
    useEffect(() => {
        if (authChecked && responsible) {
            // Só permite edição se o usuário estiver logado E for o mesmo responsável
            if (loggedResponsible) {
                setIsOwner(loggedResponsible.id === responsible.id);
            } else {
                setIsOwner(false);
            }
        }
    }, [authChecked, responsible, loggedResponsible]);

    const readOnly = authChecked && !isOwner;

    const handleNoteChange = (actionId, text) => {
        if (readOnly) return;
        setNotes(prev => ({ ...prev, [actionId]: text }));
    };

    const handleToggleComplete = (actionId) => {
        if (readOnly) return;
        setCompleteFlags(prev => ({ ...prev, [actionId]: !prev[actionId] }));
    };

    const handleSave = async (action) => {
        if (readOnly) return;
        const noteText = (notes[action.id] || '').trim();
        const shouldComplete = !!completeFlags[action.id];

        if (!noteText) {
            alert(shouldComplete
                ? 'É obrigatório escrever uma nota ao concluir a ação.'
                : 'Escreva uma nota antes de salvar.'
            );
            return;
        }

        try {
            if (shouldComplete) {
                setCompletingAction(action.id);
                await opportunityActionsService.completeActionPublic(
                    action.id,
                    action.opportunity_id,
                    noteText,
                    responsible.name
                );
                setNotes(prev => ({ ...prev, [action.id]: '' }));
                setCompleteFlags(prev => ({ ...prev, [action.id]: false }));
                showToast('Ação concluída com sucesso!');
                await loadData();
            } else {
                setSavingAction(action.id);
                await opportunityActionsService.addNoteToAction(
                    action.id,
                    action.opportunity_id,
                    noteText,
                    responsible.name
                );
                setNotes(prev => ({ ...prev, [action.id]: '' }));
                showToast('Nota salva com sucesso!');
            }
        } catch (err) {
            console.error('Erro ao salvar:', err);
            alert('Erro ao salvar. Tente novamente.');
        } finally {
            setSavingAction(null);
            setCompletingAction(null);
        }
    };

    const calculateAge = (createdAt) => {
        return opportunityActionsService.calculateAge(createdAt);
    };

    // --- Render States ---

    if (!authChecked) {
        return (
            <div className={styles.loadingState}>
                <div className={styles.spinner} />
                <span>Verificando seu acesso...</span>
            </div>
        );
    }

    // Se não está logado, exigir login antes de mostrar qualquer coisa
    if (authChecked && !loggedResponsible) {
        return (
            <div className={styles.loadingState} style={{ gap: '16px', textAlign: 'center' }}>
                <ShieldAlert size={48} style={{ color: '#3b82f6' }} />
                <h2 style={{ margin: 0, color: '#1e293b', fontSize: '1.4rem' }}>Login necessário</h2>
                <p style={{ margin: 0, color: '#64748b', maxWidth: '380px', lineHeight: '1.6', fontSize: '0.95rem' }}>
                    Para visualizar e atualizar suas ações, faça login com sua conta corporativa.
                </p>
                <a
                    href="/login?returnTo=/acoes"
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '12px 24px',
                        background: '#3b82f6',
                        color: 'white',
                        borderRadius: '10px',
                        textDecoration: 'none',
                        fontWeight: '700',
                        fontSize: '0.95rem',
                        marginTop: '8px',
                    }}
                >
                    Fazer login
                </a>
            </div>
        );
    }

    if (loading) {
        return (
            <div className={styles.loadingState}>
                <div className={styles.spinner} />
                <span>Carregando suas ações...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.errorState}>
                <AlertTriangle size={48} style={{ color: '#f59e0b' }} />
                <h2>Link inválido</h2>
                <p>{error}</p>
            </div>
        );
    }

    // --- Stats ---
    const pendingActions = actions.filter(a => a.status === 'pendente');
    const completedActions = actions.filter(a => a.status === 'concluida');
    const overdueActions = pendingActions.filter(a => {
        const isDueDateOverdue = a.due_date && new Date(a.due_date + 'T23:59:59') < new Date();
        return isDueDateOverdue || calculateAge(a.created_at) > 7;
    });

    return (
        <div className={styles.pageWrapper}>
            {/* Banner de somente leitura — só aparece quando logado mas vendo ações de outro */}
            {readOnly && (
                <div className={styles.readOnlyBanner}>
                    <div className={styles.readOnlyContent}>
                        <ShieldAlert size={20} />
                        <span>
                            Estas atividades não pertencem a você, {loggedResponsible.name}. Acesso apenas de leitura.
                        </span>
                    </div>
                    <a
                        href={`${window.location.origin}/acoes/${loggedResponsible.id}`}
                        className={styles.readOnlyBtn}
                    >
                        Abra suas tarefas
                    </a>
                </div>
            )}

            {/* Header */}
            <div className={`${styles.header} ${readOnly ? styles.headerWithBanner : ''}`}>
                <div className={styles.headerContent}>
                    <p className={styles.greeting}>
                        {readOnly ? 'Ações de' : 'Suas ações no Forecast Comercial'}
                    </p>
                    <h1 className={styles.responsibleName}>{responsible.name}</h1>
                    <p className={styles.headerSubtitle}>
                        {pendingActions.length === 0
                            ? 'Todas as ações estão concluídas! 🎉'
                            : `${pendingActions.length} ${pendingActions.length === 1 ? 'ação pendente' : 'ações pendentes'}`
                        }
                    </p>
                </div>
            </div>

            {/* Stats */}
            <div className={styles.statsRow}>
                <div className={styles.statCard}>
                    <div className={styles.statIcon} style={{ background: '#fff8e1', color: '#f59e0b' }}>
                        <Clock size={22} />
                    </div>
                    <div>
                        <div className={styles.statValue}>{pendingActions.length}</div>
                        <div className={styles.statLabel}>Pendentes</div>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statIcon} style={{ background: '#ecfdf5', color: '#10b981' }}>
                        <CheckCircle size={22} />
                    </div>
                    <div>
                        <div className={styles.statValue}>{completedActions.length}</div>
                        <div className={styles.statLabel}>Concluídas</div>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statIcon} style={{ background: '#fef2f2', color: '#ef4444' }}>
                        <AlertCircle size={22} />
                    </div>
                    <div>
                        <div className={styles.statValue}>{overdueActions.length}</div>
                        <div className={styles.statLabel}>Atrasadas</div>
                    </div>
                </div>
            </div>

            {/* Actions List */}
            <div className={styles.contentArea}>
                <h2 className={styles.sectionTitle}>
                    <CheckSquare size={20} />
                    {readOnly ? `Ações de ${responsible.name}` : 'Suas Ações'}
                </h2>

                {actions.length === 0 ? (
                    <div className={styles.emptyState}>
                        <CheckCircle size={48} style={{ opacity: 0.4 }} />
                        <p>Nenhuma ação encontrada.</p>
                    </div>
                ) : (
                    <>
                        {/* Pendentes primeiro */}
                        {pendingActions.map(action => {
                            const age = calculateAge(action.created_at);
                            const isDueDateOverdue = action.due_date && new Date(action.due_date + 'T23:59:59') < new Date();
                            const isOverdue = isDueDateOverdue || age > 7;
                            const noteText = notes[action.id] || '';
                            const isSaving = savingAction === action.id;
                            const isCompleting = completingAction === action.id;

                            return (
                                <div key={action.id} className={styles.actionCard}>
                                    <div className={styles.actionCardHeader}>
                                        <p className={styles.actionDescription}>{action.description}</p>
                                    </div>

                                    <div className={styles.actionMeta}>
                                        <span className={`${styles.metaBadge} ${styles.metaBadgeWarning}`}>
                                            <Clock size={13} />
                                            Pendente
                                        </span>
                                        <span className={`${styles.metaBadge} ${isOverdue ? styles.metaBadgeOverdue : ''}`}>
                                            {isOverdue && <AlertCircle size={13} />}
                                            {age} {age === 1 ? 'dia' : 'dias'}
                                        </span>
                                        {action.due_date && (
                                            <span className={`${styles.metaBadge} ${isDueDateOverdue ? styles.metaBadgeOverdue : ''}`}>
                                                <Calendar size={13} />
                                                {(() => {
                                                    const [y, m, d] = action.due_date.split('-');
                                                    return `${d}/${m}/${y}`;
                                                })()}
                                            </span>
                                        )}
                                        {action.opportunity && (
                                            <span className={styles.opportunityLabel}>
                                                <Briefcase size={13} />
                                                {action.opportunity.title || action.opportunity.client_name}
                                            </span>
                                        )}
                                    </div>

                                    {/* Área de nota — só aparece para o dono */}
                                    {!readOnly && (
                                        <div className={styles.noteArea}>
                                            <textarea
                                                className={styles.noteTextarea}
                                                placeholder="Escreva uma nota sobre o andamento ou conclusão desta ação..."
                                                value={noteText}
                                                onChange={(e) => handleNoteChange(action.id, e.target.value)}
                                                rows={3}
                                            />
                                            <div className={styles.noteActions}>
                                                <label className={styles.completeCheckbox}>
                                                    <input
                                                        type="checkbox"
                                                        checked={!!completeFlags[action.id]}
                                                        onChange={() => handleToggleComplete(action.id)}
                                                        disabled={isSaving || isCompleting}
                                                    />
                                                    <span>Registrar tarefa como concluída</span>
                                                </label>
                                                <button
                                                    className={completeFlags[action.id] ? styles.btnComplete : styles.btnSaveNote}
                                                    onClick={() => handleSave(action)}
                                                    disabled={!noteText.trim() || isSaving || isCompleting}
                                                >
                                                    <Save size={15} />
                                                    {isSaving || isCompleting ? 'Salvando...' : 'Salvar'}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {/* Concluídas por último */}
                        {completedActions.length > 0 && (
                            <>
                                <h2 className={styles.sectionTitle} style={{ marginTop: '32px', color: '#64748b' }}>
                                    <CheckCircle size={20} />
                                    Concluídas ({completedActions.length})
                                </h2>
                                {completedActions.map(action => (
                                    <div key={action.id} className={`${styles.actionCard} ${styles.actionCardCompleted}`}>
                                        <div className={styles.actionCardHeader}>
                                            <p className={styles.actionDescription}>{action.description}</p>
                                            <span className={styles.completedBadge}>
                                                <CheckCircle size={13} />
                                                Concluída
                                            </span>
                                        </div>
                                        <div className={styles.actionMeta}>
                                            {action.opportunity && (
                                                <span className={styles.opportunityLabel}>
                                                    <Briefcase size={13} />
                                                    {action.opportunity.title || action.opportunity.client_name}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </>
                        )}
                    </>
                )}
            </div>

            <div className={styles.footer}>
                {isOwner && (
                    <a href="/" className={styles.dashboardBtn}>
                        ← Voltar ao Forecast
                    </a>
                )}
                <span>Forecast Comercial — Defy Solutions</span>
            </div>

            {/* Toast */}
            {toast && (
                <div className={styles.successToast}>
                    <CheckCircle size={18} />
                    {toast}
                </div>
            )}
        </div>
    );
};

export default ResponsibleActions;
