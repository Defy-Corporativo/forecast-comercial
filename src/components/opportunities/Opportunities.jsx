import React, { useState, useEffect } from 'react';
import { Plus, List, Grid3x3, LayoutDashboard } from 'lucide-react';
import { Link } from 'react-router-dom';
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
                                <Link to="/" className="btn btn-secondary" title="Ir para o Painel">
                                    <LayoutDashboard size={16} />
                                    Painel
                                </Link>
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
