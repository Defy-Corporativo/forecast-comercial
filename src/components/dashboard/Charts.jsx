import React, { useState, useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie,
    AreaChart, Area, Legend, LineChart, Line
} from 'recharts';
import { X, Trash2 } from 'lucide-react';
import styles from './Dashboard.module.css';

const COLORS = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#64748B', '#0EA5E9', '#8B5CF6', '#EC4899'];

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

// Tooltip customizado para gráficos
const CustomChartTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;

    return (
        <div style={{
            background: 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(8px)',
            border: '1px solid var(--border-color-light)',
            borderRadius: '10px',
            padding: '12px 16px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
            minWidth: '160px'
        }}>
            {label && (
                <p style={{
                    margin: '0 0 8px 0',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    fontSize: '13px'
                }}>{label}</p>
            )}
            {payload.map((entry, index) => (
                <p key={index} style={{
                    margin: '4px 0',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px'
                }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                        <span style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: entry.payload?.color || entry.color || COLORS[index % COLORS.length]
                        }}></span>
                        {entry.name || entry.payload?.name}
                    </span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {typeof entry.value === 'number' && entry.value >= 1000
                            ? formatCurrency(entry.value)
                            : entry.value}
                    </span>
                </p>
            ))}
        </div>
    );
};

// Gráfico de Oportunidades por Estágio
export const StageDistributionChart = ({ data, stages = [] }) => {
    if (!data || data.length === 0) {
        return (
            <div className={styles.chartContainer}>
                <h3 className={styles.chartTitle}>Oportunidades por Estágio</h3>
                <div className={styles.emptyChart}>Nenhum dado para exibir.</div>
            </div>
        );
    }

    // Associar cores dos estágios
    const dataWithColors = data.map(item => {
        const stage = stages.find(s => s.name === item.name);
        return {
            ...item,
            color: stage?.color || COLORS[data.indexOf(item) % COLORS.length]
        };
    });

    // Renderizar label customizada com porcentagem
    const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
        const RADIAN = Math.PI / 180;
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);

        if (percent < 0.05) return null; // Não mostrar labels muito pequenos

        return (
            <text
                x={x}
                y={y}
                fill="white"
                textAnchor="middle"
                dominantBaseline="central"
                style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                }}
            >
                {`${(percent * 100).toFixed(0)}%`}
            </text>
        );
    };

    return (
        <div className={styles.chartContainer}>
            <h3 className={styles.chartTitle}>Oportunidades por Estágio</h3>
            <div style={{ width: '100%', minHeight: 320, height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <defs>
                            {dataWithColors.map((entry, index) => (
                                <linearGradient key={`gradient-${index}`} id={`pieGradient-${index}`} x1="0" y1="0" x2="1" y2="1">
                                    <stop offset="0%" stopColor={entry.color} stopOpacity={0.95} />
                                    <stop offset="100%" stopColor={entry.color} stopOpacity={0.7} />
                                </linearGradient>
                            ))}
                            <filter id="pieShadow" x="-20%" y="-20%" width="140%" height="140%">
                                <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15" />
                            </filter>
                        </defs>
                        <Pie
                            data={dataWithColors}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={renderCustomLabel}
                            outerRadius={110}
                            innerRadius={45}
                            dataKey="count"
                            paddingAngle={2}
                            filter="url(#pieShadow)"
                        >
                            {dataWithColors.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={`url(#pieGradient-${index})`}
                                    stroke="white"
                                    strokeWidth={2}
                                />
                            ))}
                        </Pie>
                        <Tooltip content={<CustomChartTooltip />} />
                        <Legend
                            verticalAlign="bottom"
                            iconType="circle"
                            iconSize={8}
                            formatter={(value) => (
                                <span style={{ color: 'var(--text-secondary)', fontSize: '12px', marginLeft: '4px' }}>{value}</span>
                            )}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

// Componente de Gráfico de Projeção de Forecast
export const ForecastProjectionChart = ({ opportunities = [], stages = [] }) => {
    const today = new Date();
    // 12 meses começando 3 meses antes do mês atual (3 meses atrás + 9 meses à frente = 12 meses)
    const defaultStartDate = new Date(today.getFullYear(), today.getMonth() - 3, 1);
    const defaultEndDate = new Date(today.getFullYear(), today.getMonth() + 9, 0);

    const [startDate, setStartDate] = useState(defaultStartDate.toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(defaultEndDate.toISOString().split('T')[0]);

    // Todos os estágios disponíveis para filtro (incluindo todos)
    const availableStages = useMemo(() => {
        return [...stages].sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
    }, [stages]);

    // Estado para estágios selecionados (inicialmente todos selecionados)
    const [selectedStages, setSelectedStages] = useState(() => {
        return availableStages.map(s => s.name);
    });

    // Atualiza seleção quando estágios mudam
    React.useEffect(() => {
        setSelectedStages(prev => {
            const stageNames = availableStages.map(s => s.name);
            // Adiciona novos estágios mantendo os já selecionados
            const newSelection = [...prev];
            stageNames.forEach(name => {
                if (!newSelection.includes(name) && !prev.length) {
                    newSelection.push(name);
                }
            });
            // Se não tinha nenhum selecionado, seleciona todos
            if (prev.length === 0) {
                return stageNames;
            }
            return prev.filter(s => stageNames.includes(s));
        });
    }, [availableStages]);

    const toggleStage = (stageName) => {
        setSelectedStages(prev => {
            if (prev.includes(stageName)) {
                return prev.filter(s => s !== stageName);
            }
            return [...prev, stageName];
        });
    };

    // Processa dados para o gráfico
    const chartData = useMemo(() => {
        if (!opportunities || opportunities.length === 0) return [];

        const start = new Date(startDate);
        const end = new Date(endDate);
        const monthRange = generateMonthRange(start, end);

        // Inicializa dados por mês
        const dataByMonth = {};
        monthRange.forEach(month => {
            const monthData = { name: month.label };
            availableStages.forEach(stage => {
                monthData[stage.name] = 0;
            });
            dataByMonth[month.key] = monthData;
        });

        // Agrupa oportunidades por mês de forecast e estágio
        opportunities.forEach(opp => {
            const forecasts = opp.forecasts || [];
            if (forecasts.length === 0 && opp.period_start) {
                // Compatibility if forecasts not present but period_start is (unlikely with new service)
                // But let's assume opp.forecasts is the source of truth
            }

            forecasts.forEach(forecast => {
                if (!forecast.period_start) return;

                const forecastDate = new Date(forecast.period_start);
                const monthKey = `${forecastDate.getFullYear()}-${String(forecastDate.getMonth() + 1).padStart(2, '0')}`;

                if (!dataByMonth[monthKey]) return;

                const value = Number(forecast.estimated_value) || 0;
                const stageName = opp.stage;

                if (dataByMonth[monthKey][stageName] !== undefined) {
                    dataByMonth[monthKey][stageName] += value;
                }
            });
        });

        return monthRange.map(month => dataByMonth[month.key]);
    }, [opportunities, startDate, endDate, availableStages]);

    const hasData = chartData.some(d => {
        return availableStages.some(stage => d[stage.name] > 0);
    });

    // Ordena estágios por valor total (maior para menor) para renderização
    const stagesByTotalValue = useMemo(() => {
        const totals = availableStages.map(stage => ({
            ...stage,
            total: chartData.reduce((sum, d) => sum + (d[stage.name] || 0), 0)
        }));
        return totals.sort((a, b) => b.total - a.total);
    }, [availableStages, chartData]);

    // Tooltip customizado
    const CustomTooltip = ({ active, payload, label }) => {
        if (!active || !payload || !payload.length) return null;

        // Ordena payload por valor (maior primeiro)
        const sortedPayload = [...payload].sort((a, b) => (b.value || 0) - (a.value || 0));
        const total = sortedPayload.reduce((sum, entry) => sum + (entry.value || 0), 0);

        return (
            <div style={{
                background: 'white',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '12px 16px',
                boxShadow: 'var(--shadow-md)',
                minWidth: '200px'
            }}>
                <p style={{ margin: '0 0 8px 0', fontWeight: 600, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color-light)', paddingBottom: '8px' }}>{label}</p>
                {sortedPayload.map((entry, index) => (
                    <p key={index} style={{
                        margin: '4px 0',
                        fontSize: '13px',
                        color: entry.color,
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: '16px'
                    }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: entry.color }}></span>
                            {entry.name}:
                        </span>
                        <span style={{ fontWeight: 500 }}>{formatCurrency(entry.value)}</span>
                    </p>
                ))}
                <p style={{
                    margin: '8px 0 0 0',
                    paddingTop: '8px',
                    borderTop: '1px solid var(--border-color-light)',
                    fontSize: '13px',
                    fontWeight: 600,
                    display: 'flex',
                    justifyContent: 'space-between'
                }}>
                    <span>Total:</span>
                    <span>{formatCurrency(total)}</span>
                </p>
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

            {/* Filtro de estágios com estilo melhorado */}
            <div className={styles.stageFilters}>
                {availableStages.map(stage => (
                    <label key={stage.name} className={`${styles.stageChip} ${selectedStages.includes(stage.name) ? styles.stageChipActive : ''}`}>
                        <input
                            type="checkbox"
                            checked={selectedStages.includes(stage.name)}
                            onChange={() => toggleStage(stage.name)}
                            className={styles.stageChipInput}
                        />
                        <span
                            className={styles.stageChipColor}
                            style={{ background: stage.color || '#64748B' }}
                        />
                        <span className={styles.stageChipLabel}>{stage.name}</span>
                    </label>
                ))}
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
                                {availableStages.map(stage => (
                                    <linearGradient key={stage.name} id={`color${stage.name.replace(/\s/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={stage.color || '#64748B'} stopOpacity={0.6} />
                                        <stop offset="95%" stopColor={stage.color || '#64748B'} stopOpacity={0.1} />
                                    </linearGradient>
                                ))}
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
                            {/* Renderiza na ordem: maior na traseira, menor na frente */}
                            {stagesByTotalValue.map(stage => (
                                selectedStages.includes(stage.name) && (
                                    <Area
                                        key={stage.name}
                                        type="monotone"
                                        dataKey={stage.name}
                                        name={stage.name}
                                        stroke={stage.color || '#64748B'}
                                        strokeWidth={2}
                                        fill={`url(#color${stage.name.replace(/\s/g, '')})`}
                                        fillOpacity={1}
                                    />
                                )
                            ))}
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
};

// Tipos de gráficos disponíveis
const CHART_TYPES = [
    { value: 'pie', label: 'Pizza' },
    { value: 'barVertical', label: 'Barras Vertical' },
    { value: 'barHorizontal', label: 'Barras Horizontal' },
    { value: 'line', label: 'Linhas' },
    { value: 'area', label: 'Área' }
];

// Componente para criar gráficos customizados
export const CustomChartModal = ({ opportunities = [], stages = [], customFields = [], onSave, onClose }) => {
    const [chartConfig, setChartConfig] = useState({
        title: '',
        field: 'stage',
        chartType: 'pie',
        timeDistributed: false,
        dateField: 'period_start',
        is_public: false
    });

    // Campos disponíveis para agrupar
    const availableFields = [
        { value: 'stage', label: 'Estágio' },
        { value: 'responsible', label: 'Responsável' },
        { value: 'client_name', label: 'Cliente' },
        ...customFields.map(f => ({ value: `custom_${f.field_name}`, label: f.field_name }))
    ];

    const handleSave = () => {
        if (!chartConfig.title.trim()) {
            alert('Digite um título para o gráfico');
            return;
        }
        onSave(chartConfig);
    };

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.chartModal}>
                <div className={styles.chartModalHeader}>
                    <h3>Criar Novo Gráfico</h3>
                    <button className={styles.closeBtn} onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>
                <div className={styles.chartModalBody}>
                    <div className="input-group">
                        <label className="label">Título do Gráfico *</label>
                        <input
                            type="text"
                            className="input"
                            value={chartConfig.title}
                            onChange={(e) => setChartConfig(prev => ({ ...prev, title: e.target.value }))}
                            placeholder="Ex: Oportunidades por Responsável"
                        />
                    </div>

                    <div className="input-group">
                        <label className="label">Agrupar por</label>
                        <select
                            className="input"
                            value={chartConfig.field}
                            onChange={(e) => setChartConfig(prev => ({ ...prev, field: e.target.value }))}
                        >
                            {availableFields.map(f => (
                                <option key={f.value} value={f.value}>{f.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="input-group">
                        <label className="label">Tipo de Gráfico</label>
                        <select
                            className="input"
                            value={chartConfig.chartType}
                            onChange={(e) => setChartConfig(prev => ({ ...prev, chartType: e.target.value }))}
                        >
                            {CHART_TYPES.map(t => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="input-group">
                        <label className={styles.toggleLabel}>
                            <div className={styles.toggleSwitch}>
                                <input
                                    type="checkbox"
                                    checked={chartConfig.timeDistributed}
                                    onChange={(e) => setChartConfig(prev => ({ ...prev, timeDistributed: e.target.checked }))}
                                />
                                <span className={styles.toggleSlider}></span>
                            </div>
                            <span>Distribuir no tempo (por mês)</span>
                        </label>
                    </div>

                    {chartConfig.timeDistributed && (
                        <div className="input-group">
                            <label className="label">Campo de Data</label>
                            <select
                                className="input"
                                value={chartConfig.dateField}
                                onChange={(e) => setChartConfig(prev => ({ ...prev, dateField: e.target.value }))}
                            >
                                <option value="period_start">Período Início</option>
                                <option value="created_at">Data de Criação</option>
                            </select>
                        </div>
                    )}

                    <div className="input-group" style={{ marginTop: '16px', borderTop: '1px solid var(--border-color-light)', paddingTop: '16px' }}>
                        <label className={styles.toggleLabel}>
                            <div className={styles.toggleSwitch}>
                                <input
                                    type="checkbox"
                                    checked={chartConfig.is_public}
                                    onChange={(e) => setChartConfig(prev => ({ ...prev, is_public: e.target.checked }))}
                                />
                                <span className={styles.toggleSlider}></span>
                            </div>
                            <span>Visível para todos (Público)</span>
                        </label>
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', marginLeft: '44px' }}>
                            Se marcado, este gráfico será exibido para todos os usuários do sistema.
                        </p>
                    </div>
                </div>
                <div className={styles.chartModalFooter}>
                    <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
                    <button className="btn btn-primary" onClick={handleSave}>Criar Gráfico</button>
                </div>
            </div>
        </div>
    );
};

// Componente que renderiza um gráfico customizado
export const CustomChart = ({ config, opportunities = [], stages = [], onDelete }) => {
    const chartData = useMemo(() => {
        if (!opportunities.length) return [];

        const field = config.field;
        const isCustomField = field.startsWith('custom_');
        const fieldName = isCustomField ? field.replace('custom_', '') : field;

        if (config.timeDistributed) {
            // Agrupar por mês e pelo campo selecionado
            const dataByMonth = {};
            const uniqueValues = new Set();

            opportunities.forEach(opp => {
                const dateValue = opp[config.dateField];
                if (!dateValue) return;

                const date = new Date(dateValue);
                const monthKey = `${getMonthName(date)}/${date.getFullYear().toString().slice(-2)}`;

                let groupValue;
                if (isCustomField) {
                    groupValue = opp.custom_data?.[fieldName] || 'Não informado';
                } else {
                    groupValue = opp[fieldName] || 'Não informado';
                }

                uniqueValues.add(groupValue);

                if (!dataByMonth[monthKey]) {
                    dataByMonth[monthKey] = { name: monthKey };
                }

                dataByMonth[monthKey][groupValue] = (dataByMonth[monthKey][groupValue] || 0) + Number(opp.estimated_value || 0);
            });

            return {
                data: Object.values(dataByMonth),
                keys: Array.from(uniqueValues)
            };
        } else {
            // Agrupar apenas pelo campo
            const groupedData = {};

            opportunities.forEach(opp => {
                let groupValue;
                if (isCustomField) {
                    groupValue = opp.custom_data?.[fieldName] || 'Não informado';
                } else {
                    groupValue = opp[fieldName] || 'Não informado';
                }

                if (!groupedData[groupValue]) {
                    groupedData[groupValue] = { name: groupValue, value: 0, count: 0 };
                }
                groupedData[groupValue].value += Number(opp.estimated_value || 0);
                groupedData[groupValue].count += 1;
            });

            // Associar cores para estágios
            const data = Object.values(groupedData).map((item, index) => {
                const stage = stages.find(s => s.name === item.name);
                return {
                    ...item,
                    color: stage?.color || COLORS[index % COLORS.length]
                };
            });

            return { data, keys: null };
        }
    }, [opportunities, config, stages]);

    if (!chartData.data || chartData.data.length === 0) {
        return (
            <div className={styles.customChartContainer}>
                <div className={styles.customChartHeader}>
                    <h3 className={styles.chartTitle}>{config.title}</h3>
                    <button className={styles.deleteChartBtn} onClick={onDelete} title="Excluir gráfico">
                        <Trash2 size={16} />
                    </button>
                </div>
                <div className={styles.emptyChart}>Nenhum dado para exibir.</div>
            </div>
        );
    }

    // Renderiza label interno para pizza
    const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
        const RADIAN = Math.PI / 180;
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);

        if (percent < 0.05) return null;

        return (
            <text
                x={x}
                y={y}
                fill="white"
                textAnchor="middle"
                dominantBaseline="central"
                style={{ fontSize: '11px', fontWeight: 600, textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
            >
                {`${(percent * 100).toFixed(0)}%`}
            </text>
        );
    };

    const renderChart = () => {
        const { data, keys } = chartData;
        const chartType = config.chartType;

        if (config.timeDistributed && keys) {
            // Gráfico distribuído no tempo
            if (chartType === 'barVertical') {
                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                            <defs>
                                {keys.map((key, index) => (
                                    <linearGradient key={key} id={`barGrad-${key.replace(/\s/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.9} />
                                        <stop offset="100%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.6} />
                                    </linearGradient>
                                ))}
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color-light)" vertical={false} />
                            <XAxis
                                dataKey="name"
                                tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                                axisLine={{ stroke: 'var(--border-color-light)' }}
                                tickLine={false}
                            />
                            <YAxis
                                tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}
                                tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip content={<CustomChartTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                            <Legend
                                iconType="circle"
                                iconSize={8}
                                formatter={(value) => <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>{value}</span>}
                            />
                            {keys.map((key, index) => (
                                <Bar
                                    key={key}
                                    dataKey={key}
                                    fill={`url(#barGrad-${key.replace(/\s/g, '')})`}
                                    radius={[6, 6, 0, 0]}
                                    maxBarSize={50}
                                />
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                );
            } else if (chartType === 'barHorizontal') {
                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} layout="vertical" margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                            <defs>
                                {keys.map((key, index) => (
                                    <linearGradient key={key} id={`barHGrad-${key.replace(/\s/g, '')}`} x1="0" y1="0" x2="1" y2="0">
                                        <stop offset="0%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.6} />
                                        <stop offset="100%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.9} />
                                    </linearGradient>
                                ))}
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color-light)" horizontal={false} />
                            <XAxis
                                type="number"
                                tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}
                                tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                                axisLine={{ stroke: 'var(--border-color-light)' }}
                                tickLine={false}
                            />
                            <YAxis
                                dataKey="name"
                                type="category"
                                width={80}
                                tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip content={<CustomChartTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                            <Legend
                                iconType="circle"
                                iconSize={8}
                                formatter={(value) => <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>{value}</span>}
                            />
                            {keys.map((key, index) => (
                                <Bar
                                    key={key}
                                    dataKey={key}
                                    fill={`url(#barHGrad-${key.replace(/\s/g, '')})`}
                                    radius={[0, 6, 6, 0]}
                                    maxBarSize={35}
                                />
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                );
            } else if (chartType === 'line') {
                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color-light)" />
                            <XAxis
                                dataKey="name"
                                tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                                axisLine={{ stroke: 'var(--border-color-light)' }}
                                tickLine={false}
                            />
                            <YAxis
                                tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}
                                tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip content={<CustomChartTooltip />} />
                            <Legend
                                iconType="circle"
                                iconSize={8}
                                formatter={(value) => <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>{value}</span>}
                            />
                            {keys.map((key, index) => (
                                <Line
                                    key={key}
                                    type="monotone"
                                    dataKey={key}
                                    stroke={COLORS[index % COLORS.length]}
                                    strokeWidth={2.5}
                                    dot={{ r: 4, strokeWidth: 2, fill: 'white' }}
                                    activeDot={{ r: 6, strokeWidth: 0 }}
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                );
            } else {
                // Area chart
                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                            <defs>
                                {keys.map((key, index) => (
                                    <linearGradient key={key} id={`areaGrad-${key.replace(/\s/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.5} />
                                        <stop offset="95%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.05} />
                                    </linearGradient>
                                ))}
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color-light)" />
                            <XAxis
                                dataKey="name"
                                tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                                axisLine={{ stroke: 'var(--border-color-light)' }}
                                tickLine={false}
                            />
                            <YAxis
                                tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}
                                tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip content={<CustomChartTooltip />} />
                            <Legend
                                iconType="circle"
                                iconSize={8}
                                formatter={(value) => <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>{value}</span>}
                            />
                            {keys.map((key, index) => (
                                <Area
                                    key={key}
                                    type="monotone"
                                    dataKey={key}
                                    fill={`url(#areaGrad-${key.replace(/\s/g, '')})`}
                                    stroke={COLORS[index % COLORS.length]}
                                    strokeWidth={2}
                                />
                            ))}
                        </AreaChart>
                    </ResponsiveContainer>
                );
            }
        } else {
            // Gráfico não distribuído no tempo
            if (chartType === 'pie') {
                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <defs>
                                {data.map((entry, index) => (
                                    <linearGradient key={`pieG-${index}`} id={`customPieGrad-${index}`} x1="0" y1="0" x2="1" y2="1">
                                        <stop offset="0%" stopColor={entry.color} stopOpacity={0.95} />
                                        <stop offset="100%" stopColor={entry.color} stopOpacity={0.7} />
                                    </linearGradient>
                                ))}
                                <filter id="customPieShadow" x="-20%" y="-20%" width="140%" height="140%">
                                    <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.12" />
                                </filter>
                            </defs>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={renderPieLabel}
                                outerRadius={100}
                                innerRadius={35}
                                dataKey="value"
                                paddingAngle={2}
                                filter="url(#customPieShadow)"
                            >
                                {data.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={`url(#customPieGrad-${index})`}
                                        stroke="white"
                                        strokeWidth={2}
                                    />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomChartTooltip />} />
                            <Legend
                                verticalAlign="bottom"
                                iconType="circle"
                                iconSize={8}
                                formatter={(value) => <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>{value}</span>}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                );
            } else if (chartType === 'barHorizontal') {
                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} layout="vertical" margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                            <defs>
                                {data.map((entry, index) => (
                                    <linearGradient key={`barH-${index}`} id={`customBarHGrad-${index}`} x1="0" y1="0" x2="1" y2="0">
                                        <stop offset="0%" stopColor={entry.color} stopOpacity={0.6} />
                                        <stop offset="100%" stopColor={entry.color} stopOpacity={0.9} />
                                    </linearGradient>
                                ))}
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color-light)" horizontal={false} />
                            <XAxis
                                type="number"
                                tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}
                                tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                                axisLine={{ stroke: 'var(--border-color-light)' }}
                                tickLine={false}
                            />
                            <YAxis
                                dataKey="name"
                                type="category"
                                width={100}
                                tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip content={<CustomChartTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                            <Bar dataKey="value" radius={[0, 8, 8, 0]} maxBarSize={40}>
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={`url(#customBarHGrad-${index})`} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                );
            } else if (chartType === 'barVertical') {
                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                            <defs>
                                {data.map((entry, index) => (
                                    <linearGradient key={`barV-${index}`} id={`customBarVGrad-${index}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={entry.color} stopOpacity={0.9} />
                                        <stop offset="100%" stopColor={entry.color} stopOpacity={0.6} />
                                    </linearGradient>
                                ))}
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color-light)" vertical={false} />
                            <XAxis
                                dataKey="name"
                                tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                                axisLine={{ stroke: 'var(--border-color-light)' }}
                                tickLine={false}
                            />
                            <YAxis
                                tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}
                                tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip content={<CustomChartTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                            <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={60}>
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={`url(#customBarVGrad-${index})`} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                );
            } else {
                // Line or Area
                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                            <defs>
                                {data.map((entry, index) => (
                                    <linearGradient key={`barDef-${index}`} id={`defaultBarGrad-${index}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={entry.color} stopOpacity={0.9} />
                                        <stop offset="100%" stopColor={entry.color} stopOpacity={0.6} />
                                    </linearGradient>
                                ))}
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color-light)" vertical={false} />
                            <XAxis
                                dataKey="name"
                                tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                                axisLine={{ stroke: 'var(--border-color-light)' }}
                                tickLine={false}
                            />
                            <YAxis
                                tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}
                                tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip content={<CustomChartTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                            <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={60}>
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={`url(#defaultBarGrad-${index})`} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                );
            }
        }
    };

    return (
        <div className={styles.customChartContainer}>
            <div className={styles.customChartHeader}>
                <h3 className={styles.chartTitle}>{config.title}</h3>
                <button className={styles.deleteChartBtn} onClick={onDelete} title="Excluir gráfico">
                    <Trash2 size={16} />
                </button>
            </div>
            <div style={{ width: '100%', minHeight: 300, height: 300 }}>
                {renderChart()}
            </div>
        </div>
    );
};

// Goals Comparison Chart - Meta vs Cadastrado vs Faturado
export const GoalsComparisonChart = ({ opportunities = [] }) => {
    const today = new Date();
    const defaultStartDate = new Date(today.getFullYear(), today.getMonth() - 6, 1);
    const defaultEndDate = new Date(today.getFullYear(), today.getMonth() + 6, 0);

    const [startDate, setStartDate] = useState(defaultStartDate.toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(defaultEndDate.toISOString().split('T')[0]);

    const chartData = useMemo(() => {
        if (!opportunities || opportunities.length === 0) return [];

        const start = new Date(startDate);
        const end = new Date(endDate);
        const monthRange = generateMonthRange(start, end);

        // Initialize data by month
        const dataByMonth = {};
        monthRange.forEach(month => {
            dataByMonth[month.key] = {
                name: month.label,
                meta: 0,
                cadastrado: 0,
                faturado: 0
            };
        });

        // Process opportunities
        opportunities.forEach(opp => {
            const forecasts = opp.forecasts || [];

            forecasts.forEach(forecast => {
                if (!forecast.period_start) return;

                const forecastDate = new Date(forecast.period_start);
                const monthKey = `${forecastDate.getFullYear()}-${String(forecastDate.getMonth() + 1).padStart(2, '0')}`;

                if (!dataByMonth[monthKey]) return;

                const value = Number(forecast.estimated_value) || 0;

                if (opp.is_goal) {
                    // Goal opportunity
                    dataByMonth[monthKey].meta += value;
                } else {
                    // Regular opportunity
                    dataByMonth[monthKey].cadastrado += value;
                    if (forecast.invoiced) {
                        dataByMonth[monthKey].faturado += value;
                    }
                }
            });
        });

        return monthRange.map(month => dataByMonth[month.key]);
    }, [opportunities, startDate, endDate]);

    const hasData = chartData.some(d => d.meta > 0 || d.cadastrado > 0 || d.faturado > 0);

    const CustomTooltip = ({ active, payload, label }) => {
        if (!active || !payload || !payload.length) return null;

        return (
            <div style={{
                background: 'white',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '12px 16px',
                boxShadow: 'var(--shadow-md)',
                minWidth: '180px'
            }}>
                <p style={{ margin: '0 0 8px 0', fontWeight: 600, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color-light)', paddingBottom: '8px' }}>{label}</p>
                {payload.map((entry, index) => (
                    <p key={index} style={{
                        margin: '4px 0',
                        fontSize: '13px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: '16px'
                    }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: entry.color }}>
                            <span style={{ width: '10px', height: '3px', borderRadius: '2px', background: entry.color }}></span>
                            {entry.name}:
                        </span>
                        <span style={{ fontWeight: 500 }}>{formatCurrency(entry.value)}</span>
                    </p>
                ))}
            </div>
        );
    };

    return (
        <div className={styles.forecastChartContainer}>
            <div className={styles.forecastHeader}>
                <h3 className={styles.chartTitle}>Meta vs Cadastrado vs Faturado</h3>
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

            {/* Legend */}
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginBottom: '16px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                    <span style={{ width: '12px', height: '3px', background: '#f59e0b', borderRadius: '2px' }}></span>
                    Meta
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                    <span style={{ width: '12px', height: '3px', background: '#3b82f6', borderRadius: '2px' }}></span>
                    Cadastrado
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                    <span style={{ width: '12px', height: '3px', background: '#10b981', borderRadius: '2px' }}></span>
                    Faturado
                </span>
            </div>

            {!hasData ? (
                <div className={styles.emptyChart}>
                    Nenhuma meta ou oportunidade no período selecionado.
                </div>
            ) : (
                <div style={{ width: '100%', height: 350 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                            <defs>
                                <linearGradient id="metaGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
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
                            <Line
                                type="monotone"
                                dataKey="meta"
                                name="Meta"
                                stroke="#f59e0b"
                                strokeWidth={3}
                                strokeDasharray="5 5"
                                dot={{ r: 4, fill: '#f59e0b' }}
                                activeDot={{ r: 6 }}
                            />
                            <Line
                                type="monotone"
                                dataKey="cadastrado"
                                name="Cadastrado"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                dot={{ r: 3, fill: '#3b82f6' }}
                                activeDot={{ r: 5 }}
                            />
                            <Line
                                type="monotone"
                                dataKey="faturado"
                                name="Faturado"
                                stroke="#10b981"
                                strokeWidth={2}
                                dot={{ r: 3, fill: '#10b981' }}
                                activeDot={{ r: 5 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
};
