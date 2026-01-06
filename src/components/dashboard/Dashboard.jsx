import React, { useState, useEffect } from 'react';
import { DollarSign, Briefcase, Target, TrendingUp, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useStageContext } from '../../contexts/StageContext';
import { opportunityService } from '../../services/opportunityService';
import { settingsService } from '../../services/settingsService';
import { chartService } from '../../services/chartService';
import { logDebug } from '../../utils/logger';
import MetricsCard from './MetricsCard';
import { ForecastProjectionChart, GoalsComparisonChart, CustomChartModal, CustomChart } from './Charts';
import styles from './Dashboard.module.css';

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
        invoicedValue: 0,
        goalsValue: 0,
        totalForecastValue: 0
    });
    // Estado para gráficos customizados
    const [customCharts, setCustomCharts] = useState([]);
    const [showChartModal, setShowChartModal] = useState(false);

    // Global Date Filter
    const today = new Date();
    // Start: 1st day of 3rd month ago
    const defaultStartDate = new Date(today.getFullYear(), today.getMonth() - 3, 1);
    // End: Last day of current year
    const defaultEndDate = new Date(today.getFullYear(), 11, 31);

    const [dateRange, setDateRange] = useState({
        startDate: defaultStartDate.toISOString().split('T')[0],
        endDate: defaultEndDate.toISOString().split('T')[0]
    });

    // Função para definir períodos padrão
    const setPredefinedPeriod = (period) => {
        const today = new Date();
        let start, end;

        switch (period) {
            case 'thisMonth':
                start = new Date(today.getFullYear(), today.getMonth(), 1);
                end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                break;
            case 'lastMonth':
                start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                end = new Date(today.getFullYear(), today.getMonth(), 0);
                break;
            case 'last3Months':
                start = new Date(today.getFullYear(), today.getMonth() - 2, 1);
                end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                break;
            case 'last6Months':
                start = new Date(today.getFullYear(), today.getMonth() - 5, 1);
                end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                break;
            case 'thisYear':
                start = new Date(today.getFullYear(), 0, 1);
                end = new Date(today.getFullYear(), 11, 31);
                break;
            case 'lastYear':
                start = new Date(today.getFullYear() - 1, 0, 1);
                end = new Date(today.getFullYear() - 1, 11, 31);
                break;
            case 'next3Months':
                start = new Date(today.getFullYear(), today.getMonth(), 1);
                end = new Date(today.getFullYear(), today.getMonth() + 3, 0);
                break;
            case 'next6Months':
                start = new Date(today.getFullYear(), today.getMonth(), 1);
                end = new Date(today.getFullYear(), today.getMonth() + 6, 0);
                break;
            default:
                return;
        }

        setDateRange({
            startDate: start.toISOString().split('T')[0],
            endDate: end.toISOString().split('T')[0]
        });
    };

    useEffect(() => {
        if (user) {
            logDebug('Dashboard: loading data', { userId: user.id });
            loadDashboardData();
        }
    }, [user]);

    const loadDashboardData = async () => {
        try {
            setError('');
            const [oppData, fieldsData, chartsData] = await Promise.all([
                opportunityService.getOpportunities(user.id),
                settingsService.getCustomFields(),
                chartService.getCharts(user.id)
            ]);
            logDebug('Dashboard: opportunities loaded', { count: oppData.length });
            setOpportunities(oppData);
            setCustomFields(fieldsData || []);
            setCustomCharts(chartsData || []);
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
        // Filtrar apenas oportunidades reais (não metas)
        const realOpportunities = opportunities.filter(opp => !opp.is_goal);
        const totalOpportunities = realOpportunities.length;
        const totalValue = realOpportunities.reduce((sum, opp) => sum + Number(opp.estimated_value || 0), 0);

        // Valor Faturado - somar todos os forecasts marcados como invoiced = true
        let invoicedValue = 0;
        opportunities.forEach(opp => {
            if (opp.forecasts && opp.forecasts.length > 0) {
                const invoicedForecasts = opp.forecasts.filter(f => f.invoiced === true);
                invoicedValue += invoicedForecasts.reduce((sum, f) => sum + Number(f.estimated_value || 0), 0);
            }
        });

        // Valor total das Metas (is_goal = true)
        const goals = opportunities.filter(opp => opp.is_goal);
        const goalsValue = goals.reduce((sum, opp) => sum + Number(opp.estimated_value || 0), 0);

        // Previsão Total de Faturamento - somar todos os forecasts (faturados e não faturados)
        let totalForecastValue = 0;
        opportunities.forEach(opp => {
            if (opp.forecasts && opp.forecasts.length > 0) {
                totalForecastValue += opp.forecasts.reduce((sum, f) => sum + Number(f.estimated_value || 0), 0);
            }
        });

        setMetrics({
            totalOpportunities,
            totalValue,
            invoicedValue,
            goalsValue,
            totalForecastValue
        });
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    const calculateBigNumberValue = (opportunities, chartConfig, dateRange) => {
        let filtered = opportunities.filter(opp => !opp.is_goal); // Excluir metas por padrão

        // Filtrar por estágio se especificado
        if (chartConfig.stage_filter && chartConfig.stage_filter !== 'all') {
            filtered = filtered.filter(opp => opp.stage === chartConfig.stage_filter);
        }

        // Filtrar por período - considerar forecasts dentro do range
        if (dateRange && dateRange.startDate && dateRange.endDate) {
            const start = new Date(dateRange.startDate);
            const end = new Date(dateRange.endDate);

            // Para contagem, filtrar oportunidades que têm pelo menos um forecast no período
            if (chartConfig.calculation_type === 'count') {
                filtered = filtered.filter(opp => {
                    if (!opp.forecasts || opp.forecasts.length === 0) return false;
                    return opp.forecasts.some(f => {
                        const forecastDate = new Date(f.period_end || f.period_start);
                        return forecastDate >= start && forecastDate <= end;
                    });
                });
                return filtered.length;
            }

            // Para soma, somar apenas valores de forecasts dentro do período
            let total = 0;
            filtered.forEach(opp => {
                if (opp.forecasts && opp.forecasts.length > 0) {
                    opp.forecasts.forEach(f => {
                        const forecastDate = new Date(f.period_end || f.period_start);
                        if (forecastDate >= start && forecastDate <= end) {
                            total += Number(f.estimated_value || 0);
                        }
                    });
                }
            });
            return total;
        }

        // Sem filtro de data - comportamento original
        if (chartConfig.calculation_type === 'count') {
            return filtered.length;
        }
        return filtered.reduce((sum, opp) => sum + Number(opp.estimated_value || 0), 0);
    };

    const handleSaveCustomChart = async (config) => {
        try {
            const chartData = {
                ...config,
                created_by: user.id
            };
            const savedChart = await chartService.createChart(chartData);
            setCustomCharts(prev => [savedChart, ...prev]);
            setShowChartModal(false);
        } catch (error) {
            console.error('Erro ao salvar gráfico:', error);
            alert('Erro ao salvar gráfico. Tente novamente.');
        }
    };

    const handleDeleteCustomChart = async (chartId) => {
        const chart = customCharts.find(c => c.id === chartId);
        const isBigNumber = chart?.chart_type === 'big_number';
        const message = isBigNumber
            ? 'Tem certeza que deseja excluir este indicador?'
            : 'Tem certeza que deseja excluir este gráfico?';

        if (window.confirm(message)) {
            try {
                await chartService.deleteChart(chartId);
                setCustomCharts(prev => prev.filter(c => c.id !== chartId));
            } catch (error) {
                console.error(`Erro ao excluir ${isBigNumber ? 'indicador' : 'gráfico'}:`, error);
                alert(`Erro ao excluir ${isBigNumber ? 'indicador' : 'gráfico'}. Tente novamente.`);
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
    0 % { transform: rotate(0deg); }
    100 % { transform: rotate(360deg); }
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
                    Nova Visualização
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
                    title="Valor Oportunidades"
                    value={formatCurrency(metrics.totalValue)}
                    icon={DollarSign}
                    color="#2563EB"
                />
                <MetricsCard
                    title="Quantidade Oportunidades"
                    value={metrics.totalOpportunities}
                    icon={Briefcase}
                    color="#64748B"
                />
                <MetricsCard
                    title="Previsão Total"
                    value={formatCurrency(metrics.totalForecastValue)}
                    icon={TrendingUp}
                    color="#8B5CF6"
                />
                <MetricsCard
                    title="Metas"
                    value={formatCurrency(metrics.goalsValue)}
                    icon={Target}
                    color="#F59E0B"
                />
                <MetricsCard
                    title="Valor Faturado"
                    value={formatCurrency(metrics.invoicedValue)}
                    icon={DollarSign}
                    color="#059669"
                />
            </div>

            {/* Filtro de período - Redesigned */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                background: 'white',
                padding: '12px 16px',
                borderRadius: '10px',
                border: '1px solid var(--border-color-light)',
                boxShadow: 'var(--shadow-xs)',
                marginBottom: '24px',
                gap: '24px',
                flexWrap: 'wrap'
            }}>
                {/* Período predefinido */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        color: 'var(--text-secondary)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                    }}>Período</span>
                    <select
                        onChange={(e) => setPredefinedPeriod(e.target.value)}
                        defaultValue=""
                        style={{
                            border: '1px solid var(--border-color-light)',
                            borderRadius: '8px',
                            padding: '10px 14px',
                            fontSize: '0.9rem',
                            background: 'var(--bg-main)',
                            cursor: 'pointer',
                            minWidth: '180px',
                            color: 'var(--text-primary)',
                            fontWeight: 500,
                            outline: 'none',
                            transition: 'all 0.2s'
                        }}
                    >
                        <option value="">Selecione um período</option>
                        <option value="thisMonth">Este mês</option>
                        <option value="lastMonth">Mês passado</option>
                        <option value="last3Months">Últimos 3 meses</option>
                        <option value="last6Months">Últimos 6 meses</option>
                        <option value="next3Months">Próximos 3 meses</option>
                        <option value="next6Months">Próximos 6 meses</option>
                        <option value="thisYear">Este ano</option>
                        <option value="lastYear">Ano passado</option>
                    </select>
                </div>

                {/* Separador visual */}
                <div style={{
                    width: '1px',
                    height: '28px',
                    background: 'var(--border-color-light)'
                }} />

                {/* Período personalizado */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        color: 'var(--text-secondary)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                    }}>De</span>
                    <input
                        type="date"
                        value={dateRange.startDate}
                        onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                        style={{
                            border: '1px solid var(--border-color-light)',
                            borderRadius: '8px',
                            padding: '10px 14px',
                            fontSize: '0.9rem',
                            background: 'var(--bg-main)',
                            color: 'var(--text-primary)',
                            fontWeight: 500,
                            outline: 'none'
                        }}
                    />
                    <span style={{
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        color: 'var(--text-secondary)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                    }}>Até</span>
                    <input
                        type="date"
                        value={dateRange.endDate}
                        onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                        style={{
                            border: '1px solid var(--border-color-light)',
                            borderRadius: '8px',
                            padding: '10px 14px',
                            fontSize: '0.9rem',
                            background: 'var(--bg-main)',
                            color: 'var(--text-primary)',
                            fontWeight: 500,
                            outline: 'none'
                        }}
                    />
                </div>
            </div>

            {/* Big Numbers Customizados - Abaixo do filtro de período */}
            {customCharts.filter(chart => chart.chart_type === 'big_number').length > 0 && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                    gap: '16px',
                    marginBottom: '24px'
                }}>
                    {customCharts
                        .filter(chart => chart.chart_type === 'big_number')
                        .map(chart => {
                            const value = calculateBigNumberValue(opportunities, chart, dateRange);
                            const isCount = chart.calculation_type === 'count';
                            return (
                                <div
                                    key={chart.id}
                                    style={{ position: 'relative' }}
                                    className="custom-bignumber-card"
                                >
                                    <MetricsCard
                                        title={chart.title}
                                        value={isCount ? value : formatCurrency(value)}
                                        icon={isCount ? Briefcase : DollarSign}
                                        color={chart.color || "#6366F1"}
                                    />
                                    <button
                                        onClick={() => handleDeleteCustomChart(chart.id)}
                                        className={styles.deleteChartBtn}
                                        style={{
                                            position: 'absolute',
                                            top: '8px',
                                            right: '8px',
                                            opacity: 0,
                                            transition: 'opacity 0.2s'
                                        }}
                                        title="Excluir indicador"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            );
                        })}
                </div>
            )}

            {/* Gráfico de Projeção de Forecast */}
            <ForecastProjectionChart
                opportunities={opportunities}
                stages={stages}
                startDate={dateRange.startDate}
                endDate={dateRange.endDate}
            />

            {/* Gráfico de Comparação Metas vs Cadastrado vs Faturado */}
            <GoalsComparisonChart
                opportunities={opportunities}
                startDate={dateRange.startDate}
                endDate={dateRange.endDate}
            />

            {/* Gráficos customizados - aparecem no final (exceto big_numbers que já estão no grid de métricas) */}
            {customCharts.filter(chart => chart.chart_type !== 'big_number').length > 0 && (
                <div className={styles.customChartsGrid}>
                    {customCharts
                        .filter(chart => chart.chart_type !== 'big_number')
                        .map(chart => (
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
