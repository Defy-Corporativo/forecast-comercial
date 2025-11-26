import React, { useState, useEffect } from 'react';
import { Plus, List, Kanban, Grid3x3 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { opportunityService } from '../../services/opportunityService';
import OpportunityList from './OpportunityList';
import OpportunityKanban from './OpportunityKanban';
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
    const [viewMode, setViewMode] = useState('list'); // 'list', 'kanban', or 'cards'
    const [showModal, setShowModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [editingOpportunity, setEditingOpportunity] = useState(null);
    const [viewingOpportunity, setViewingOpportunity] = useState(null);

    useEffect(() => {
        if (user) {
            loadOpportunities();
        }
    }, [user]);

    const loadOpportunities = async () => {
        try {
            const data = await opportunityService.getOpportunities(user.id);
            setOpportunities(data || []);
            setFilteredOpportunities(data || []);
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

    const handleEdit = (opportunity) => {
        setEditingOpportunity(opportunity);
        setShowModal(true);
    };

    const handleView = (opportunity) => {
        setViewingOpportunity(opportunity);
        setShowViewModal(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Tem certeza que deseja excluir esta oportunidade?')) {
            try {
                await opportunityService.deleteOpportunity(id);
                loadOpportunities();
            } catch (error) {
                console.error('Erro ao excluir oportunidade:', error);
            }
        }
    };

    const handleStageChange = async (id, newStage) => {
        // Optimistic update
        setOpportunities(prev => prev.map(opp =>
            opp.id === id ? { ...opp, stage: newStage } : opp
        ));

        try {
            await opportunityService.updateStage(id, newStage);
        } catch (error) {
            console.error('Error updating stage:', error);
            loadOpportunities(); // Revert on error
        }
    };

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
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
            {/* Header fixo */}
            <div style={{ flexShrink: 0, backgroundColor: 'white', zIndex: 10 }}>
                <div className="container">
                    <div className="page-header">
                        <h1 className="page-title">Oportunidades</h1>
                        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                            <div className={styles.viewSwitcher}>
                                <button
                                    className={`${styles.viewBtn} ${viewMode === 'list' ? styles.active : ''}`}
                                    onClick={() => setViewMode('list')}
                                    title="Visualização em Lista"
                                >
                                    <List size={16} /> Lista
                                </button>
                                <button
                                    className={`${styles.viewBtn} ${viewMode === 'kanban' ? styles.active : ''}`}
                                    onClick={() => setViewMode('kanban')}
                                    title="Visualização em Kanban"
                                >
                                    <Kanban size={16} /> Kanban
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
                        opportunities={opportunities}
                        onFilterChange={setFilteredOpportunities}
                    />
                </div>
            </div>

            {/* Conteúdo com scroll */}
            <div style={{ flex: 1, overflow: 'auto', backgroundColor: 'var(--bg-main)' }}>
                <div className="container">
                    {viewMode === 'list' ? (
                        <OpportunityList
                            opportunities={filteredOpportunities}
                            onView={handleView}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                        />
                    ) : viewMode === 'kanban' ? (
                        <OpportunityKanban
                            opportunities={filteredOpportunities}
                            onView={handleView}
                            onEdit={handleEdit}
                            onStageChange={handleStageChange}
                        />
                    ) : (
                        <OpportunityCards
                            opportunities={filteredOpportunities}
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
                    }}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
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
