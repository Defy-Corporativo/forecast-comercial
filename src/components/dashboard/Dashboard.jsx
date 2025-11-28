import React, { useState, useEffect } from 'react';
import { DollarSign, Briefcase, TrendingUp, Activity, Plus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useStageContext } from '../../contexts/StageContext';
import { opportunityService } from '../../services/opportunityService';
import { settingsService } from '../../services/settingsService';
import { logDebug } from '../../utils/logger';
import MetricsCard from './MetricsCard';
import { StageDistributionChart, ForecastProjectionChart, CustomChartModal, CustomChart } from './Charts';
import styles from './Dashboard.module.css';

const CUSTOM_CHARTS_STORAGE_KEY = 'forecast_custom_charts';

const Dashboard = () => {
    const { user } = useAuth();
    const { stages } = useStageContext();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [hasData, setHasData] = useState(false);
    const [opportunities, setOpportunities] = useState([]);
    const [customFields, setCustomFields] = useState([]);
    const [metrics, setMetrics] = useState({
        totalOpportunities: 0,
        totalValue: 0,
        avgTicket: 0,
        winRate: 0,
        dealValue: 0,
        invoicedValue: 0
    });
    const [distributionData, setDistributionData] = useState([]);
    
    // Estado para gráficos customizados
    const [customCharts, setCustomCharts] = useState(() => {
        const saved = localStorage.getItem(CUSTOM_CHARTS_STORAGE_KEY);
        return saved ? JSON.parse(saved) : [];
    });
    const [showChartModal, setShowChartModal] = useState(false);

    useEffect(() => {
        if (user) {
            logDebug('Dashboard: loading data', { userId: user.id });
            loadDashboardData();
        }
    }, [user]);

    // Salvar gráficos customizados no localStorage
    useEffect(() => {
        localStorage.setItem(CUSTOM_CHARTS_STORAGE_KEY, JSON.stringify(customCharts));
    }, [customCharts]);

    const loadDashboardData = async () => {
        try {
            setError('');
            const [oppData, fieldsData] = await Promise.all([
                opportunityService.getOpportunities(user.id),
                settingsService.getCustomFields()
            ]);
            logDebug('Dashboard: opportunities loaded', { count: oppData.length });
            setOpportunities(oppData);
            setCustomFields(fieldsData || []);
            setHasData(oppData.length > 0);
            calculateMetrics(oppData);
        } catch (error) {
            logDebug('Dashboard: error loading data', { error: error.message });
            setError('Erro ao carregar dados do painel. Verifique sua conexão e permissões.');
        } finally {
            setLoading(false);
        }
    };

    const calculateMetrics = (opportunities) => {
        const totalOpportunities = opportunities.length;
        const totalValue = opportunities.reduce((sum, opp) => sum + Number(opp.estimated_value), 0);
        const avgTicket = totalOpportunities > 0 ? totalValue / totalOpportunities : 0;

        // Taxa de conversão = Deal / Total de oportunidades
        const wonOpportunities = opportunities.filter(opp => opp.stage === 'Deal').length;
        const winRate = totalOpportunities > 0 ? (wonOpportunities / totalOpportunities) * 100 : 0;

        // Valor total Deal e Faturado
        const dealValue = opportunities
            .filter(opp => opp.stage === 'Deal')
            .reduce((sum, opp) => sum + Number(opp.estimated_value), 0);

        const invoicedValue = opportunities
            .filter(opp => opp.stage === 'Deal' && opp.invoiced === true)
            .reduce((sum, opp) => sum + Number(opp.estimated_value), 0);

        setMetrics({
            totalOpportunities,
            totalValue,
            avgTicket,
            winRate,
            dealValue,
            invoicedValue
        });

        // Prepare chart data usando estágios cadastrados
        const stageNames = stages.map(s => s.name);

        const distribution = stageNames.map(stage => ({
            name: stage,
            count: opportunities.filter(opp => opp.stage === stage).length
        })).filter(item => item.count > 0);

        setDistributionData(distribution);
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    const handleSaveCustomChart = (config) => {
        const newChart = {
            ...config,
            id: Date.now().toString()
        };
        setCustomCharts(prev => [...prev, newChart]);
        setShowChartModal(false);
    };

    const handleDeleteCustomChart = (chartId) => {
        if (window.confirm('Tem certeza que deseja excluir este gráfico?')) {
            setCustomCharts(prev => prev.filter(c => c.id !== chartId));
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

    if (error) {
        return (
            <div className="container">
                <div className="card" style={{ maxWidth: 520, margin: '40px auto' }}>
                    <h3 style={{ marginTop: 0 }}>Dashboard</h3>
                    <p style={{ color: 'var(--color-danger)' }}>{error}</p>
                    <button className="btn btn-primary" onClick={loadDashboardData}>Tentar novamente</button>
                </div>
            </div>
        );
    }

    return (
        <div className="container">
            <div className="page-header">
                <h1 className="page-title">Painel</h1>
                <button className="btn btn-primary" onClick={() => setShowChartModal(true)}>
                    <Plus size={18} />
                    Novo Gráfico
                </button>
            </div>

            {!hasData && (
                <div className="card" style={{ marginBottom: '24px' }}>
                    <h3 style={{ marginTop: 0 }}>Sem dados ainda</h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
                        Cadastre uma oportunidade para ver os gráficos e métricas.
                    </p>
                    <a className="btn btn-primary" href="/opportunities">
                        Ir para Oportunidades
                    </a>
                </div>
            )}

            <div className={styles.metricsGrid}>
                <MetricsCard
                    title="Pipeline Total"
                    value={formatCurrency(metrics.totalValue)}
                    icon={DollarSign}
                    color="#2563EB"
                />
                <MetricsCard
                    title="Oportunidades Ativas"
                    value={metrics.totalOpportunities}
                    icon={Briefcase}
                    color="#64748B"
                />
                <MetricsCard
                    title="Ticket Médio"
                    value={formatCurrency(metrics.avgTicket)}
                    icon={TrendingUp}
                    color="#10B981"
                />
                <MetricsCard
                    title="Taxa de Conversão"
                    value={`${metrics.winRate.toFixed(1)}%`}
                    icon={Activity}
                    color="#F59E0B"
                />
                <MetricsCard
                    title="Valor Total Deal"
                    value={formatCurrency(metrics.dealValue)}
                    icon={DollarSign}
                    color="#10B981"
                />
                <MetricsCard
                    title="Valor Faturado"
                    value={formatCurrency(metrics.invoicedValue)}
                    icon={DollarSign}
                    color="#059669"
                />
            </div>

            {/* Gráfico de Projeção de Forecast */}
            <ForecastProjectionChart opportunities={opportunities} stages={stages} />

            {/* Gráfico de distribuição por estágio */}
            <div className={styles.chartsGrid}>
                <StageDistributionChart data={distributionData} stages={stages} />
            </div>

            {/* Gráficos customizados - aparecem no final */}
            {customCharts.length > 0 && (
                <div className={styles.customChartsGrid}>
                    {customCharts.map(chart => (
                        <CustomChart
                            key={chart.id}
                            config={chart}
                            opportunities={opportunities}
                            stages={stages}
                            onDelete={() => handleDeleteCustomChart(chart.id)}
                        />
                    ))}
                </div>
            )}

            {/* Modal para criar gráfico customizado */}
            {showChartModal && (
                <CustomChartModal
                    opportunities={opportunities}
                    stages={stages}
                    customFields={customFields}
                    onSave={handleSaveCustomChart}
                    onClose={() => setShowChartModal(false)}
                />
            )}
        </div>
    );
};

export default Dashboard;
