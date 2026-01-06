import React, { useState, useEffect } from 'react';
import { Plus, List, Grid3x3, Layers, LayoutList } from 'lucide-react';
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
    const [includeGoals, setIncludeGoals] = useState(false); // Hide goals by default

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
            // Apply goal filter
            const filtered = includeGoals ? data : (data || []).filter(opp => !opp.is_goal);
            setFilteredOpportunities(filtered);
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

    const opportunitiesForFilters = React.useMemo(() => {
        return includeGoals ? opportunities : opportunities.filter(opp => !opp.is_goal);
    }, [opportunities, includeGoals]);

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
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: 'var(--border-radius-md)',
                        padding: '16px',
                        marginTop: '16px',
                        marginBottom: '16px',
                        boxShadow: 'var(--shadow-sm)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px',
                        border: '1px solid var(--border-color-light)'
                    }}>
                        <div className="page-header" style={{ marginBottom: 0 }}>
                            <h1 className="page-title">Oportunidades</h1>
                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                                {/* Group Mode Switcher */}
                                <div className={styles.viewSwitcher}>
                                    <button
                                        className={`${styles.viewBtn} ${groupMode === 'grouped' ? styles.active : ''}`}
                                        onClick={() => setGroupMode('grouped')}
                                        title="Visualização Agrupada por Oportunidade"
                                    >
                                        <Layers size={16} /> Agrupado
                                    </button>
                                    <button
                                        className={`${styles.viewBtn} ${groupMode === 'flat' ? styles.active : ''}`}
                                        onClick={() => setGroupMode('flat')}
                                        title="Visualização por Previsão de Faturamento"
                                    >
                                        <LayoutList size={16} /> Por Previsão
                                    </button>
                                </div>

                                {/* View Mode Switcher */}
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

                                <button className="btn btn-primary" onClick={handleCreate}>
                                    <Plus size={16} />
                                    Nova Oportunidade
                                </button>
                            </div>
                        </div>

                        <OpportunityFilters
                            opportunities={opportunitiesForFilters}
                            onFilterChange={setFilteredOpportunities}
                            includeGoals={includeGoals}
                            onIncludeGoalsChange={(value) => {
                                setIncludeGoals(value);
                                // Re-apply filter - using the stable filtered logic is cleaner but for now stick to previous pattern
                                const base = value ? opportunities : opportunities.filter(opp => !opp.is_goal);
                                setFilteredOpportunities(base);
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Conteúdo com scroll */}
            <div style={{ flex: 1, overflow: 'auto', backgroundColor: 'var(--bg-main)' }}>
                <div className="container">
                    {viewMode === 'list' ? (
                        <OpportunityList
                            opportunities={filteredOpportunities}
                            groupMode={groupMode}
                            onView={handleView}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                        />
                    ) : (
                        <OpportunityCards
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
                    onClose={() => {
                        setShowViewModal(false);
                        setViewingOpportunity(null);
                        loadOpportunities(); // Refresh list to reflect any changes made
                    }}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onUpdate={loadOpportunities}
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
