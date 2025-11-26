import React, { useState, useEffect } from 'react';
import { DollarSign, Briefcase, TrendingUp, Activity } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { opportunityService } from '../../services/opportunityService';
import { logDebug } from '../../utils/logger';
import MetricsCard from './MetricsCard';
import { FunnelChart, StageDistributionChart, ForecastProjectionChart } from './Charts';
import styles from './Dashboard.module.css';

const Dashboard = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [hasData, setHasData] = useState(false);
    const [opportunities, setOpportunities] = useState([]);
    const [metrics, setMetrics] = useState({
        totalOpportunities: 0,
        totalValue: 0,
        avgTicket: 0,
        winRate: 0,
        dealValue: 0,
        invoicedValue: 0
    });
    const [funnelData, setFunnelData] = useState([]);
    const [distributionData, setDistributionData] = useState([]);

    useEffect(() => {
        if (user) {
            logDebug('Dashboard: loading data', { userId: user.id });
            loadDashboardData();
        }
    }, [user]);

    const loadDashboardData = async () => {
        try {
            setError('');
            const data = await opportunityService.getOpportunities(user.id);
            logDebug('Dashboard: opportunities loaded', { count: data.length });
            setOpportunities(data);
            setHasData(data.length > 0);
            calculateMetrics(data);
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

        // Deal = contrato fechado
        const wonOpportunities = opportunities.filter(opp => opp.stage === 'Deal').length;
        const lostOpportunities = opportunities.filter(opp => opp.stage === 'Lost').length;
        const closedOpportunities = wonOpportunities + lostOpportunities;
        const winRate = closedOpportunities > 0 ? (wonOpportunities / closedOpportunities) * 100 : 0;

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

        // Prepare chart data
        const stages = ['Pipeline', 'Strong Upside', 'Committed', 'Deal', 'Lost'];

        const funnel = stages.map(stage => ({
            name: stage,
            value: opportunities
                .filter(opp => opp.stage === stage)
                .reduce((sum, opp) => sum + Number(opp.estimated_value), 0)
        })).filter(item => item.value > 0);

        const distribution = stages.map(stage => ({
            name: stage,
            count: opportunities.filter(opp => opp.stage === stage).length
        })).filter(item => item.count > 0);

        setFunnelData(funnel);
        setDistributionData(distribution);
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
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
            <ForecastProjectionChart opportunities={opportunities} />

            <div className={styles.chartsGrid}>
                <FunnelChart data={funnelData} />
                <StageDistributionChart data={distributionData} />
            </div>
        </div>
    );
};

export default Dashboard;
