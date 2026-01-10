import React, { useState, useEffect, useRef } from 'react';
import { Plus, List, Grid3x3, Layers, LayoutList } from 'lucide-react';
import { Button } from '@iadefysolutions/design-system';
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
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'cards'
    const [groupMode, setGroupMode] = useState('grouped'); // 'grouped' or 'flat'
    const [showModal, setShowModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [editingOpportunity, setEditingOpportunity] = useState(null);
    const [viewingOpportunity, setViewingOpportunity] = useState(null);
    // Meta e Potencial states: 0=oculto, 1=listar junto, 2=filtrar somente
    const [metaState, setMetaState] = useState(0);
    const [potencialState, setPotencialState] = useState(0);

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
            setLoading(true);
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

    // useEffect(() => {
    //     console.log('Opportunities: Component Mounted');
    //     return () => console.log('Opportunities: Component Unmounted');
    // }, []);

    // Filtrar oportunidades baseado nos estados de Meta e Potencial
    const opportunitiesForFilters = React.useMemo(() => {
        let filtered = [...opportunities];

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
    }, [opportunities, metaState, potencialState]);

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
                        {/* Row 1: Page Title */}
                        <h1 className="page-title" style={{ margin: 0 }}>Oportunidades</h1>

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

                        {/* Row 3: New Opportunity Button */}
                        <Button icon={Plus} onClick={handleCreate} className={styles.newOpportunityBtn}>
                            Nova Oportunidade
                        </Button>

                        {/* Row 4: Filters */}
                        <OpportunityFilters
                            opportunities={opportunitiesForFilters}
                            onFilterChange={setFilteredOpportunities}
                            metaState={metaState}
                            potencialState={potencialState}
                            onMetaStateChange={setMetaState}
                            onPotencialStateChange={setPotencialState}
                        />
                    </div>
                </div>
            </div>

            {/* Conteúdo com scroll */}
            <div style={{ flex: 1, overflow: 'auto', backgroundColor: 'var(--bg-main)' }}>
                <div className="container">
                    {/* Force cards view on mobile, otherwise respect viewMode */}
                    {(isMobile || viewMode === 'cards') ? (
                        <OpportunityCards
                            opportunities={filteredOpportunities}
                            groupMode={groupMode}
                            onView={handleView}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                        />
                    ) : (
                        <OpportunityList
                            opportunities={filteredOpportunities}
                            groupMode={groupMode}
                            onView={handleView}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
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
        </div>
    );
};

export default Opportunities;
