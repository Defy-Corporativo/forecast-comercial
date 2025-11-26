import React, { useState, useMemo } from 'react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie,
    AreaChart, Area, Legend
} from 'recharts';
import styles from './Dashboard.module.css';

const COLORS = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#64748B', '#0EA5E9'];

// Cores para o gráfico de forecast
const FORECAST_COLORS = {
    strongUpside: '#3B82F6',
    committed: '#8B5CF6', 
    dealNotInvoiced: '#10B981',
    dealInvoiced: '#059669'
};

export const FunnelChart = ({ data }) => {
    if (!data || data.length === 0) {
        return (
            <div className={styles.chartContainer}>
                <h3 className={styles.chartTitle}>Funil de Pipeline</h3>
                <div className={styles.emptyChart}>Nenhum dado para exibir.</div>
            </div>
        );
    }

    return (
        <div className={styles.chartContainer}>
            <h3 className={styles.chartTitle}>Funil de Pipeline</h3>
            <div style={{ width: '100%', minHeight: 320, height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={data}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={100} />
                        <Tooltip formatter={(value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)} />
                        <Bar dataKey="value" fill="#2563EB" radius={[0, 8, 8, 0]}>
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export const StageDistributionChart = ({ data }) => {
    if (!data || data.length === 0) {
        return (
            <div className={styles.chartContainer}>
                <h3 className={styles.chartTitle}>Oportunidades por Estágio</h3>
                <div className={styles.emptyChart}>Nenhum dado para exibir.</div>
            </div>
        );
    }

    return (
        <div className={styles.chartContainer}>
            <h3 className={styles.chartTitle}>Oportunidades por Estágio</h3>
            <div style={{ width: '100%', minHeight: 320, height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            outerRadius={100}
                            fill="#2563EB"
                            dataKey="count"
                            radius={[0, 8, 8, 0]}
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

// Função auxiliar para formatar moeda
const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { 
        style: 'currency', 
        currency: 'BRL',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value);
};

// Função para obter nome do mês
const getMonthName = (date) => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return months[date.getMonth()];
};

// Função para gerar lista de meses entre duas datas
const generateMonthRange = (startDate, endDate) => {
    const months = [];
    const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const end = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
    
    while (current <= end) {
        months.push({
            key: `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`,
            label: `${getMonthName(current)}/${current.getFullYear().toString().slice(-2)}`,
            year: current.getFullYear(),
            month: current.getMonth()
        });
        current.setMonth(current.getMonth() + 1);
    }
    return months;
};

// Componente de Gráfico de Projeção de Forecast
export const ForecastProjectionChart = ({ opportunities = [] }) => {
    // Estado para período selecionado
    const today = new Date();
    const defaultStartDate = new Date(today.getFullYear(), today.getMonth() - 3, 1);
    const defaultEndDate = new Date(today.getFullYear(), today.getMonth() + 6, 0);
    
    const [startDate, setStartDate] = useState(defaultStartDate.toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(defaultEndDate.toISOString().split('T')[0]);

    // Processa dados para o gráfico
    const chartData = useMemo(() => {
        if (!opportunities || opportunities.length === 0) return [];

        const start = new Date(startDate);
        const end = new Date(endDate);
        const monthRange = generateMonthRange(start, end);

        // Inicializa dados por mês
        const dataByMonth = {};
        monthRange.forEach(month => {
            dataByMonth[month.key] = {
                name: month.label,
                strongUpside: 0,
                committed: 0,
                dealNotInvoiced: 0,
                dealInvoiced: 0,
                total: 0
            };
        });

        // Agrupa oportunidades por mês de forecast
        opportunities.forEach(opp => {
            if (!opp.forecast_date) return;
            
            const forecastDate = new Date(opp.forecast_date);
            const monthKey = `${forecastDate.getFullYear()}-${String(forecastDate.getMonth() + 1).padStart(2, '0')}`;
            
            if (!dataByMonth[monthKey]) return;
            
            const value = Number(opp.estimated_value) || 0;
            
            if (opp.stage === 'Strong Upside') {
                dataByMonth[monthKey].strongUpside += value;
            } else if (opp.stage === 'Committed') {
                dataByMonth[monthKey].committed += value;
            } else if (opp.stage === 'Deal') {
                if (opp.invoiced) {
                    dataByMonth[monthKey].dealInvoiced += value;
                } else {
                    dataByMonth[monthKey].dealNotInvoiced += value;
                }
            }
            
            dataByMonth[monthKey].total += value;
        });

        return monthRange.map(month => dataByMonth[month.key]);
    }, [opportunities, startDate, endDate]);

    const hasData = chartData.some(d => d.total > 0);

    // Tooltip customizado
    const CustomTooltip = ({ active, payload, label }) => {
        if (!active || !payload || !payload.length) return null;

        return (
            <div style={{
                background: 'white',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '12px 16px',
                boxShadow: 'var(--shadow-md)'
            }}>
                <p style={{ margin: '0 0 8px 0', fontWeight: 600, color: 'var(--text-primary)' }}>{label}</p>
                {payload.map((entry, index) => (
                    <p key={index} style={{ 
                        margin: '4px 0', 
                        fontSize: '13px',
                        color: entry.color,
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: '16px'
                    }}>
                        <span>{entry.name}:</span>
                        <span style={{ fontWeight: 500 }}>{formatCurrency(entry.value)}</span>
                    </p>
                ))}
            </div>
        );
    };

    return (
        <div className={styles.forecastChartContainer}>
            <div className={styles.forecastHeader}>
                <h3 className={styles.chartTitle}>Projeção de Forecast</h3>
                <div className={styles.dateFilters}>
                    <div className={styles.dateFilter}>
                        <label>De:</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className={styles.dateInput}
                        />
                    </div>
                    <div className={styles.dateFilter}>
                        <label>Até:</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className={styles.dateInput}
                        />
                    </div>
                </div>
            </div>

            {!hasData ? (
                <div className={styles.emptyChart}>
                    Nenhuma oportunidade com data de forecast no período selecionado.
                </div>
            ) : (
                <div style={{ width: '100%', height: 380 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                            data={chartData}
                            margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
                        >
                            <defs>
                                <linearGradient id="colorStrongUpside" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={FORECAST_COLORS.strongUpside} stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor={FORECAST_COLORS.strongUpside} stopOpacity={0.05}/>
                                </linearGradient>
                                <linearGradient id="colorCommitted" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={FORECAST_COLORS.committed} stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor={FORECAST_COLORS.committed} stopOpacity={0.05}/>
                                </linearGradient>
                                <linearGradient id="colorDealNotInvoiced" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={FORECAST_COLORS.dealNotInvoiced} stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor={FORECAST_COLORS.dealNotInvoiced} stopOpacity={0.05}/>
                                </linearGradient>
                                <linearGradient id="colorDealInvoiced" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={FORECAST_COLORS.dealInvoiced} stopOpacity={0.4}/>
                                    <stop offset="95%" stopColor={FORECAST_COLORS.dealInvoiced} stopOpacity={0.1}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color-light)" />
                            <XAxis 
                                dataKey="name" 
                                tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
                                axisLine={{ stroke: 'var(--border-color)' }}
                            />
                            <YAxis 
                                tickFormatter={(value) => {
                                    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                                    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                                    return value;
                                }}
                                tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
                                axisLine={{ stroke: 'var(--border-color)' }}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend 
                                wrapperStyle={{ paddingTop: '20px' }}
                                formatter={(value) => <span style={{ color: 'var(--text-primary)', fontSize: '13px' }}>{value}</span>}
                            />
                            <Area
                                type="monotone"
                                dataKey="dealInvoiced"
                                name="Deal Faturado"
                                stackId="1"
                                stroke={FORECAST_COLORS.dealInvoiced}
                                strokeWidth={2}
                                fill="url(#colorDealInvoiced)"
                            />
                            <Area
                                type="monotone"
                                dataKey="dealNotInvoiced"
                                name="Deal Não Faturado"
                                stackId="1"
                                stroke={FORECAST_COLORS.dealNotInvoiced}
                                strokeWidth={2}
                                fill="url(#colorDealNotInvoiced)"
                            />
                            <Area
                                type="monotone"
                                dataKey="committed"
                                name="Committed"
                                stackId="1"
                                stroke={FORECAST_COLORS.committed}
                                strokeWidth={2}
                                fill="url(#colorCommitted)"
                            />
                            <Area
                                type="monotone"
                                dataKey="strongUpside"
                                name="Strong Upside"
                                stackId="1"
                                stroke={FORECAST_COLORS.strongUpside}
                                strokeWidth={2}
                                fill="url(#colorStrongUpside)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
};
