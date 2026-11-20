import React, { useState, useEffect, useMemo } from 'react';
import { DollarSign, Briefcase, Target, Plus, Trash2, Lightbulb } from 'lucide-react';
import { Button, Card } from '@iadefysolutions/design-system';
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
        potentialValue: 0
    });
    // Estado para gráficos customizados
    const [customCharts, setCustomCharts] = useState([]);
    const [showChartModal, setShowChartModal] = useState(false);

    // Global Date Filter - Default: "Este ano" com +3 meses antes e +3 meses depois
    const today = new Date();
    const defaultStartDate = new Date(today.getFullYear() - 1, 9, 1);  // Oct 1 of previous year (3 months before Jan)
    const defaultEndDate = new Date(today.getFullYear() + 1, 2, 31); // Mar 31 of next year (3 months after Dec)

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
            const [allOppData, fieldsData, chartsData] = await Promise.all([
                opportunityService.getOpportunities(user.id),
                settingsService.getCustomFields(),
                chartService.getCharts(user.id)
            ]);
            // Oportunidades arquivadas não entram nos números do painel
            const oppData = (allOppData || []).filter(opp => !opp.custom_data?.archived_at);
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

    // Calculate metrics based on opportunities and date range
    const filteredMetrics = useMemo(() => {
        const start = new Date(dateRange.startDate);
        const end = new Date(dateRange.endDate);

        // Helper to check if forecast is within date range (using period_end)
        const isInRange = (forecast) => {
            const dateToUse = forecast.period_end || forecast.period_start;
            if (!dateToUse) return false;
            const forecastDate = new Date(dateToUse);
            return forecastDate >= start && forecastDate <= end;
        };

        // Real opportunities (not goal, not potential)
        const realOpportunities = opportunities.filter(opp => !opp.is_goal && !opp.is_potential);

        // Count real opportunities with at least one forecast in range
        const totalOpportunities = realOpportunities.filter(opp => {
            if (!opp.forecasts || opp.forecasts.length === 0) return false;
            return opp.forecasts.some(isInRange);
        }).length;

        // Sum of real opportunities' forecasts in range
        let totalValue = 0;
        realOpportunities.forEach(opp => {
            if (opp.forecasts && opp.forecasts.length > 0) {
                opp.forecasts.forEach(f => {
                    if (isInRange(f)) {
                        totalValue += Number(f.estimated_value || 0);
                    }
                });
            }
        });

        // Invoiced value - forecasts marked as invoiced in range
        let invoicedValue = 0;
        opportunities.forEach(opp => {
            if (opp.forecasts && opp.forecasts.length > 0) {
                opp.forecasts.forEach(f => {
                    if (f.invoiced && isInRange(f)) {
                        invoicedValue += Number(f.estimated_value || 0);
                    }
                });
            }
        });

        // Goals value - sum of meta opportunities' forecasts in range
        const goals = opportunities.filter(opp => opp.is_goal);
        let goalsValue = 0;
        goals.forEach(opp => {
            if (opp.forecasts && opp.forecasts.length > 0) {
                opp.forecasts.forEach(f => {
                    if (isInRange(f)) {
                        goalsValue += Number(f.estimated_value || 0);
                    }
                });
            }
        });

        // Potential value - sum of potential opportunities' forecasts in range
        const potentials = opportunities.filter(opp => opp.is_potential);
        let potentialValue = 0;
        potentials.forEach(opp => {
            if (opp.forecasts && opp.forecasts.length > 0) {
                opp.forecasts.forEach(f => {
                    if (isInRange(f)) {
                        potentialValue += Number(f.estimated_value || 0);
                    }
                });
            }
        });

        return {
            totalOpportunities,
            totalValue,
            invoicedValue,
            goalsValue,
            potentialValue
        };
    }, [opportunities, dateRange]);

    // Keep calculateMetrics for initial load (legacy, but now uses useMemo)
    const calculateMetrics = (opps) => {
        // Metrics are now computed via useMemo, this is kept for compatibility
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
                <Card style={{ maxWidth: 520, margin: '40px auto' }}>
                    <h3 style={{ marginTop: 0 }}>Dashboard</h3>
                    <p style={{ color: 'var(--color-danger)' }}>{error}</p>
                    <Button onClick={loadDashboardData}>Tentar novamente</Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="container">
            <div className="page-header">
                <h1 className="page-title">Painel</h1>
                <Button icon={Plus} onClick={() => setShowChartModal(true)}>
                    Nova Visualização
                </Button>
            </div>

            {!hasData && (
                <Card style={{ marginBottom: '24px' }}>
                    <h3 style={{ marginTop: 0 }}>Sem dados ainda</h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
                        Cadastre uma oportunidade para ver os gráficos e métricas.
                    </p>
                    <Button as="a" href="/opportunities">
                        Ir para Oportunidades
                    </Button>
                </Card>
            )}

            {/* Filtro de período - Redesigned */}
            <div className={styles.periodFilter}>
                {/* Período predefinido */}
                <div className={styles.periodFilterGroup}>
                    <span className={styles.periodFilterLabel}>Período</span>
                    <select
                        onChange={(e) => setPredefinedPeriod(e.target.value)}
                        defaultValue="thisYear"
                        className={styles.periodSelect}
                    >
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
                <div className={styles.periodDivider} />

                {/* Período personalizado */}
                <div className={styles.periodFilterGroup}>
                    <span className={styles.periodFilterLabel}>De</span>
                    <input
                        type="date"
                        value={dateRange.startDate}
                        onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                        className={styles.periodDateInput}
                    />
                    <span className={styles.periodFilterLabel}>Até</span>
                    <input
                        type="date"
                        value={dateRange.endDate}
                        onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                        className={styles.periodDateInput}
                    />
                </div>
            </div>

            <div className={styles.metricsGrid}>
                <MetricsCard
                    title="VL Oportunidades Reais"
                    value={formatCurrency(filteredMetrics.totalValue)}
                    icon={DollarSign}
                    color="#2563EB"
                />
                <MetricsCard
                    title="QT Oportunidades Reais"
                    value={filteredMetrics.totalOpportunities}
                    icon={Briefcase}
                    color="#64748B"
                />
                <MetricsCard
                    title="Metas"
                    value={formatCurrency(filteredMetrics.goalsValue)}
                    icon={Target}
                    color="#F59E0B"
                />
                <MetricsCard
                    title="Potencial"
                    value={formatCurrency(filteredMetrics.potentialValue)}
                    icon={Lightbulb}
                    color="#8B5CF6"
                />
                <MetricsCard
                    title="Valor Faturado"
                    value={formatCurrency(filteredMetrics.invoicedValue)}
                    icon={DollarSign}
                    color="#059669"
                />
            </div>



            {/* Big Numbers Customizados - Abaixo do filtro de período */}
            {customCharts.filter(chart => chart.chart_type === 'big_number').length > 0 && (
                <div className={styles.metricsGrid}>
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

            {/* Gráfico de Comparação Metas vs Forecast vs Faturado - ACIMA do Projeção */}
            <GoalsComparisonChart
                opportunities={opportunities}
                startDate={dateRange.startDate}
                endDate={dateRange.endDate}
            />

            {/* Gráfico de Projeção de Forecast */}
            <ForecastProjectionChart
                opportunities={opportunities}
                stages={stages}
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
