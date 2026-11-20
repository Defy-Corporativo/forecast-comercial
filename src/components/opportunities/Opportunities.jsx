import React, { useState, useEffect, useRef } from 'react';
import { Plus, List, Grid3x3, Layers, LayoutList, Download, Archive, ArrowLeft, ChevronDown, FileText, Sheet, Printer } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { opportunityService } from '../../services/opportunityService';
import OpportunityList from './OpportunityList';
import OpportunityCards from './OpportunityCards';
import OpportunityForm from './OpportunityForm';
import OpportunityView from './OpportunityView';
import OpportunityFilters from './OpportunityFilters';
import styles from './Opportunities.module.css';

const Opportunities = () => {
    const { user } = useAuth();
    const [opportunities, setOpportunities] = useState([]);
    const [filteredOpportunities, setFilteredOpportunities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const exportMenuRef = useRef(null);
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'cards'
    const [groupMode, setGroupMode] = useState('grouped'); // 'grouped' or 'flat'
    const [showModal, setShowModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [editingOpportunity, setEditingOpportunity] = useState(null);
    const [viewingOpportunity, setViewingOpportunity] = useState(null);
    // Meta e Potencial states: 0=oculto, 1=listar junto, 2=filtrar somente
    const [metaState, setMetaState] = useState(0);
    const [potencialState, setPotencialState] = useState(1); // Padrão: listar junto (1 clique)
    // Arquivadas: ficam fora da lista principal e aparecem só nesta visão
    const [showArchived, setShowArchived] = useState(false);
    const [archiveToast, setArchiveToast] = useState(null);
    const archiveToastTimer = useRef(null);

    // Mobile detection
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Restaurar oportunidade em visualização do sessionStorage (para sobreviver a recarregamentos)
    useEffect(() => {
        const savedOpportunityId = sessionStorage.getItem('viewing_opportunity_id');
        console.log(`[Opportunities] Checking for saved opportunity: savedId=${savedOpportunityId}, opportunities.length=${opportunities.length}, viewingOpportunity=${viewingOpportunity?.id}`);
        if (savedOpportunityId && opportunities.length > 0 && !viewingOpportunity) {
            const opp = opportunities.find(o => o.id === savedOpportunityId);
            console.log(`[Opportunities] Found matching opportunity: ${opp ? 'yes' : 'no'}`);
            if (opp) {
                // Carregar oportunidade completa
                console.log(`[Opportunities] Restoring opportunity: ${savedOpportunityId}`);
                opportunityService.getOpportunity(savedOpportunityId)
                    .then(fullOpp => {
                        console.log(`[Opportunities] Successfully loaded full opportunity`);
                        setViewingOpportunity(fullOpp);
                        setShowViewModal(true);
                    })
                    .catch(err => {
                        console.error('Error restoring viewing opportunity:', err);
                        sessionStorage.removeItem('viewing_opportunity_id');
                    });
            }
        }
    }, [opportunities]);

    // Ref para evitar limpeza do sessionStorage na montagem inicial
    const hasInitializedRef = useRef(false);

    // Salvar ID da oportunidade em visualização no sessionStorage
    // IMPORTANTE: Não remover na montagem inicial, apenas quando o usuário fecha o modal
    useEffect(() => {
        if (viewingOpportunity) {
            sessionStorage.setItem('viewing_opportunity_id', viewingOpportunity.id);
            hasInitializedRef.current = true;
        } else if (hasInitializedRef.current) {
            // Só remove se já foi inicializado (ou seja, usuário fechou o modal manualmente)
            sessionStorage.removeItem('viewing_opportunity_id');
            // Também limpar os drafts quando o modal é fechado manualmente
            // (mas preservar se for apenas um reload)
        }
    }, [viewingOpportunity]);

    useEffect(() => {
        if (user) {
            loadOpportunities();
        }
    }, [user, groupMode]);

    const loadOpportunities = async () => {
        try {
            let data;
            if (groupMode === 'flat') {
                data = await opportunityService.getOpportunitiesFlat(user.id);
            } else {
                data = await opportunityService.getOpportunities(user.id);
            }
            setOpportunities(data || []);
            // Initial filter will be applied via useMemo
        } catch (error) {
            console.error('Error loading opportunities:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!showExportMenu) return undefined;
        const close = (event) => {
            if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) setShowExportMenu(false);
        };
        const onKey = (event) => { if (event.key === 'Escape') setShowExportMenu(false); };
        document.addEventListener('mousedown', close);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', close);
            document.removeEventListener('keydown', onKey);
        };
    }, [showExportMenu]);

    const handleReport = (reportFormat) => {
        setShowExportMenu(false);
        const items = new Map();
        filteredOpportunities.forEach((row) => {
            if (!items.has(row.id)) items.set(row.id, { ...row, reportValue: 0 });
            items.get(row.id).reportValue += Number(groupMode === 'flat' ? row.estimated_value || 0 : row.total_value || 0);
        });
        const list = [...items.values()];
        const money = value => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const total = goal => list.filter(item => Boolean(item.is_goal) === goal)
            .reduce((sum, item) => sum + item.reportValue, 0);
        const lines = [
            'DEFY SOLUTIONS', 'RESUMO DE OPORTUNIDADES',
            `Gerado em: ${new Date().toLocaleString('pt-BR')}`,
            'Dados conforme filtros aplicados na lista.',
            groupMode === 'flat' ? 'Valores correspondem às previsões exibidas.' : 'Valores correspondem ao total de previsões de cada oportunidade.',
            '', 'RESUMO', '======',
            `Oportunidades: ${list.filter(item => !item.is_goal).length}`,
            `Valor previsto das oportunidades: ${money(total(false))}`,
            `Metas: ${list.filter(item => item.is_goal).length}`,
            `Valor previsto das metas: ${money(total(true))}`,
            '', 'OPORTUNIDADES E METAS', '======================',
        ];
        if (!list.length) lines.push('Nenhum resultado para os filtros aplicados.');
        list.forEach((item, index) => lines.push(
            '', `${index + 1}. ${item.title || 'Sem título'}${item.opportunity_number ? ` (#${item.opportunity_number})` : ''}`,
            `   Tipo: ${item.is_goal ? 'Meta' : 'Oportunidade'}${item.is_potential ? ' · Potencial' : ''}`,
            `   Cliente: ${item.client?.name || item.client_name || 'Não informado'}`,
            `   Estágio: ${item.stage || 'Não informado'}`,
            `   Responsável: ${item.responsible || 'Não informado'}`,
            `   Valor previsto: ${money(item.reportValue)}`
        ));
        if (reportFormat === 'pdf') {
            const printWindow = window.open('', '_blank');
            if (!printWindow) {
                window.alert('Permita pop-ups para gerar o PDF.');
                return;
            }
            printWindow.document.title = 'Resumo de oportunidades';
            const content = printWindow.document.createElement('pre');
            content.style.cssText = 'font: 11pt/1.5 Arial, sans-serif; white-space: pre-wrap; overflow-wrap: anywhere';
            content.textContent = lines.join('\n');
            printWindow.document.body.appendChild(content);
            printWindow.focus();
            printWindow.print();
            return;
        }
        const csvCell = value => {
            const text = String(value ?? '');
            return `"${(/^[\s]*[=+@\-\t\r]/.test(text) ? "'" + text : text).replace(/"/g, '""')}"`;
        };
        const csvRows = [
            ['Número', 'Título', 'Tipo', 'Potencial', 'Cliente', 'Estágio', 'Responsável', 'Valor previsto (R$)'],
            ...list.map(item => [item.opportunity_number, item.title, item.is_goal ? 'Meta' : 'Oportunidade', item.is_potential ? 'Sim' : 'Não', item.client?.name || item.client_name, item.stage, item.responsible, item.reportValue.toFixed(2).replace('.', ',')])
        ];
        const isCsv = reportFormat === 'csv';
        const content = isCsv ? csvRows.map(row => row.map(csvCell).join(';')).join('\r\n') : lines.join('\n');
        const url = URL.createObjectURL(new Blob(['\uFEFF', content], { type: isCsv ? 'text/csv;charset=utf-8' : 'text/plain;charset=utf-8' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = `resumo_oportunidades_${new Date().toISOString().slice(0, 10)}.${reportFormat}`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    };

    const handleCreate = () => {
        setEditingOpportunity(null);
        setShowModal(true);
    };

    const handleEdit = async (opportunity) => {
        // Load full opportunity data with forecasts
        try {
            const fullOpportunity = await opportunityService.getOpportunity(opportunity.id);
            setEditingOpportunity(fullOpportunity);
            setShowModal(true);
        } catch (error) {
            console.error('Error loading opportunity:', error);
            // Fallback to passed opportunity
            setEditingOpportunity(opportunity);
            setShowModal(true);
        }
    };

    const handleView = async (opportunity) => {
        // Load full opportunity data with forecasts
        try {
            const fullOpportunity = await opportunityService.getOpportunity(opportunity.id);
            setViewingOpportunity(fullOpportunity);
            setShowViewModal(true);
        } catch (error) {
            console.error('Error loading opportunity:', error);
            setViewingOpportunity(opportunity);
            setShowViewModal(true);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Tem certeza que deseja excluir esta oportunidade? Todas as previsões de faturamento serão excluídas também.')) {
            try {
                await opportunityService.deleteOpportunity(id);
                loadOpportunities();
            } catch (error) {
                console.error('Erro ao excluir oportunidade:', error);
            }
        }
    };

    const isArchived = (opp) => Boolean(opp?.custom_data?.archived_at);

    const handleArchive = async (opportunity, archived = !isArchived(opportunity), { silent = false } = {}) => {
        const id = opportunity.id;
        const applyLocal = (customData) => setOpportunities(prev => prev.map(opp =>
            opp.id === id ? { ...opp, custom_data: customData } : opp
        ));
        const previous = opportunity.custom_data || {};
        const { archived_at: _old, ...rest } = previous;
        // Atualização otimista: a linha some da lista na hora
        applyLocal(archived ? { ...rest, archived_at: new Date().toISOString() } : rest);
        try {
            const saved = await opportunityService.setArchived(id, archived);
            applyLocal(saved);
            if (!silent) {
                clearTimeout(archiveToastTimer.current);
                setArchiveToast({ opportunity: { ...opportunity, custom_data: saved }, archived });
                archiveToastTimer.current = setTimeout(() => setArchiveToast(null), 6000);
            }
        } catch (error) {
            console.error('Erro ao arquivar oportunidade:', error);
            applyLocal(previous);
            window.alert('Não foi possível ' + (archived ? 'arquivar' : 'desarquivar') + ' a oportunidade. Tente novamente.');
        }
    };

    const undoArchive = () => {
        if (!archiveToast) return;
        const { opportunity, archived } = archiveToast;
        clearTimeout(archiveToastTimer.current);
        setArchiveToast(null);
        handleArchive(opportunity, !archived, { silent: true });
    };

    useEffect(() => () => clearTimeout(archiveToastTimer.current), []);

    const handleReorder = async (updates) => {
        try {
            // Optimistic update: apply changes locally immediately
            setOpportunities(prev => prev.map(opp => {
                const update = updates.find(u => u.id === opp.id);
                return update ? { ...opp, display_priority: update.display_priority } : opp;
            }));
            await opportunityService.updateDisplayPriorities(updates);
        } catch (error) {
            console.error('Erro ao reordenar oportunidades:', error);
            // Revert on error
            loadOpportunities();
        }
    };

    // useEffect(() => {
    //     console.log('Opportunities: Component Mounted');
    //     return () => console.log('Opportunities: Component Unmounted');
    // }, []);

    // Filtrar oportunidades baseado nos estados de Meta e Potencial
    const archivedCount = React.useMemo(
        () => new Set(opportunities.filter(isArchived).map(opp => opp.id)).size,
        [opportunities]
    );

    const opportunitiesForFilters = React.useMemo(() => {
        // Visão de arquivadas: mostra todas as arquivadas, sem o filtro de Meta/Potencial
        if (showArchived) {
            return opportunities.filter(isArchived);
        }

        let filtered = opportunities.filter(opp => !isArchived(opp));

        // Estado 2 = filtrar somente (exclui tudo exceto o tipo)
        if (metaState === 2) {
            return filtered.filter(opp => opp.is_goal);
        }
        if (potencialState === 2) {
            return filtered.filter(opp => opp.is_potential);
        }

        // Estados 0 e 1 - ocultar ou mostrar junto
        if (metaState === 0) {
            filtered = filtered.filter(opp => !opp.is_goal);
        }
        if (potencialState === 0) {
            filtered = filtered.filter(opp => !opp.is_potential);
        }

        return filtered;
    }, [opportunities, metaState, potencialState, showArchived]);

    if (loading) {
        return (
            <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                <div style={{
                    padding: '24px',
                    background: 'white',
                    borderRadius: 'var(--border-radius-md)',
                    boxShadow: 'var(--shadow-sm)',
                    border: '1px solid var(--border-color-light)'
                }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        border: '3px solid var(--border-color-light)',
                        borderTop: '3px solid var(--color-primary)',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                        margin: '0 auto'
                    }}></div>
                    <style>{`
                        @keyframes spin {
                            0% { transform: rotate(0deg); }
                            100% { transform: rotate(360deg); }
                        }
                    `}</style>
                </div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            {/* Header fixo */}
            <div style={{ flexShrink: 0, zIndex: 10 }}>
                <div className="container">
                    <div className={styles.opportunitiesHeader}>
                        {/* Row 1: título + ações principais */}
                        <div className={styles.headerTop}>
                            <h1 className="page-title" style={{ margin: 0 }}>Oportunidades</h1>
                            <div className={styles.headerActions}>
                                <div className={styles.exportMenuWrapper} ref={exportMenuRef}>
                                    <button
                                        type="button"
                                        className={styles.secondaryAction}
                                        onClick={() => setShowExportMenu(open => !open)}
                                        aria-haspopup="menu"
                                        aria-expanded={showExportMenu}
                                        title="Exportar a lista com os filtros aplicados"
                                    >
                                        <Download size={16} />
                                        <span className={styles.btnLabel}>Exportar</span>
                                        <ChevronDown size={14} className={styles.exportCaret} />
                                    </button>
                                    {showExportMenu && (
                                        <div className={styles.exportMenu} role="menu">
                                            <span className={styles.exportMenuHint}>
                                                {filteredOpportunities.length} {filteredOpportunities.length === 1 ? 'item' : 'itens'} com os filtros atuais
                                            </span>
                                            <button type="button" role="menuitem" onClick={() => handleReport('csv')}>
                                                <Sheet size={16} />
                                                <span><strong>Planilha</strong><small>CSV para Excel</small></span>
                                            </button>
                                            <button type="button" role="menuitem" onClick={() => handleReport('pdf')}>
                                                <Printer size={16} />
                                                <span><strong>PDF</strong><small>Abre a impressão</small></span>
                                            </button>
                                            <button type="button" role="menuitem" onClick={() => handleReport('txt')}>
                                                <FileText size={16} />
                                                <span><strong>Texto</strong><small>Resumo em TXT</small></span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <button type="button" className={styles.primaryAction} onClick={handleCreate}>
                                    <Plus size={18} strokeWidth={2.5} />
                                    Nova oportunidade
                                </button>
                            </div>
                        </div>

                        {/* Row 2: Group Mode + View Mode (desktop only) */}
                        <div className={styles.headerControls}>
                            {/* Group Mode Switcher */}
                            <div className={styles.viewSwitcher}>
                                <button
                                    className={`${styles.viewBtn} ${groupMode === 'grouped' ? styles.active : ''}`}
                                    onClick={() => setGroupMode('grouped')}
                                    title="Visualização Agrupada por Oportunidade"
                                >
                                    <Layers size={16} /> <span className={styles.btnLabel}>Agrupado</span>
                                </button>
                                <button
                                    className={`${styles.viewBtn} ${groupMode === 'flat' ? styles.active : ''}`}
                                    onClick={() => setGroupMode('flat')}
                                    title="Visualização por Previsão de Faturamento"
                                >
                                    <LayoutList size={16} /> <span className={styles.btnLabel}>Por Previsão</span>
                                </button>
                            </div>

                            {/* View Mode Switcher - Hidden on mobile */}
                            {!isMobile && (
                                <div className={styles.viewSwitcher}>
                                    <button
                                        className={`${styles.viewBtn} ${viewMode === 'list' ? styles.active : ''}`}
                                        onClick={() => setViewMode('list')}
                                        title="Visualização em Lista"
                                    >
                                        <List size={16} /> Lista
                                    </button>
                                    <button
                                        className={`${styles.viewBtn} ${viewMode === 'cards' ? styles.active : ''}`}
                                        onClick={() => setViewMode('cards')}
                                        title="Visualização em Cartões"
                                    >
                                        <Grid3x3 size={16} /> Cartões
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Row 4: Filters */}
                        <OpportunityFilters
                            opportunities={opportunitiesForFilters}
                            onFilterChange={setFilteredOpportunities}
                            resultCount={filteredOpportunities.length}
                            metaState={metaState}
                            potencialState={potencialState}
                            onMetaStateChange={setMetaState}
                            onPotencialStateChange={setPotencialState}
                            showArchived={showArchived}
                            archivedCount={archivedCount}
                            onShowArchivedChange={setShowArchived}
                        />
                    </div>
                </div>
            </div>

            {/* Conteúdo com scroll */}
            <div style={{ flex: 1, overflow: 'auto', backgroundColor: 'var(--bg-main)' }}>
                <div className="container">
                    {showArchived && (
                        <div className={styles.archivedBanner}>
                            <Archive size={16} aria-hidden="true" />
                            <span>
                                <strong>Oportunidades arquivadas.</strong> Elas não aparecem na lista principal. Use o botão de desarquivar para trazer uma de volta.
                            </span>
                            <button type="button" onClick={() => setShowArchived(false)}>
                                <ArrowLeft size={14} /> Voltar para a lista
                            </button>
                        </div>
                    )}
                    {/* Force cards view on mobile, otherwise respect viewMode */}
                    {(isMobile || viewMode === 'cards') ? (
                        <OpportunityCards
                            opportunities={filteredOpportunities}
                            groupMode={groupMode}
                            onView={handleView}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            onArchive={handleArchive}
                        />
                    ) : (
                        <OpportunityList
                            opportunities={filteredOpportunities}
                            groupMode={groupMode}
                            onView={handleView}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            onArchive={handleArchive}
                            onReorder={groupMode === 'grouped' && !showArchived ? handleReorder : undefined}
                        />
                    )}
                </div>
            </div>

            {showViewModal && viewingOpportunity && (
                <OpportunityView
                    opportunity={viewingOpportunity}
                    fullscreen={false}
                    onClose={() => {
                        setShowViewModal(false);
                        setViewingOpportunity(null);
                        // Refresh silently without resetting filters
                        (async () => {
                            try {
                                let data;
                                if (groupMode === 'flat') {
                                    data = await opportunityService.getOpportunitiesFlat(user.id);
                                } else {
                                    data = await opportunityService.getOpportunities(user.id);
                                }
                                setOpportunities(data || []);
                            } catch (error) {
                                console.error('Error refreshing opportunities:', error);
                            }
                        })();
                    }}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onArchive={(opp, archived) => handleArchive(opp, archived)}
                    onUpdate={() => {
                        // Silent refresh
                        (async () => {
                            try {
                                let data;
                                if (groupMode === 'flat') {
                                    data = await opportunityService.getOpportunitiesFlat(user.id);
                                } else {
                                    data = await opportunityService.getOpportunities(user.id);
                                }
                                setOpportunities(data || []);
                            } catch (error) {
                                console.error('Error refreshing opportunities:', error);
                            }
                        })();
                    }}
                />
            )}

            {showModal && (
                <OpportunityForm
                    opportunity={editingOpportunity}
                    onClose={() => {
                        setShowModal(false);
                        setEditingOpportunity(null);
                    }}
                    onSave={loadOpportunities}
                />
            )}

            {archiveToast && (
                <div className={styles.archiveToast} role="status">
                    <span>
                        {archiveToast.archived ? 'Oportunidade arquivada' : 'Oportunidade desarquivada'}
                        {archiveToast.opportunity.title ? <> · <strong>{archiveToast.opportunity.title}</strong></> : null}
                    </span>
                    <button type="button" onClick={undoArchive}>Desfazer</button>
                </div>
            )}
        </div>
    );
};

export default Opportunities;
