import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { opportunityService } from '../../services/opportunityService';
import { clientService } from '../../services/clientService';
import styles from './Settings.module.css';

const downloadCsv = (rows, filename) => {
    if (!rows || rows.length === 0) return;
    const header = Object.keys(rows[0]).join(';');
    const data = rows.map(row =>
        Object.values(row)
            .map((value) => {
                if (value === null || value === undefined) return '';
                const str = String(value).replace(/"/g, '""');
                if (str.includes(';') || str.includes('"') || str.includes('\n')) {
                    return `"${str}"`;
                }
                return str;
            })
            .join(';')
    );
    const csv = [header, ...data].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

const ExportData = () => {
    const [exporting, setExporting] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const handleExportOpportunities = async () => {
        setExporting(true);
        setMessage({ type: '', text: '' });
        try {
            // Use flat mode to get one row per forecast (or 1 per opp if no forecasts)
            const data = await opportunityService.getOpportunitiesFlat(undefined, { includeGoals: true });

            const rows = data.map((item) => ({
                id_oportunidade: item.id,
                numero: item.opportunity_number,
                titulo: item.title || '',
                cliente: item.client?.name || item.client_name || '',
                valor_total_opp: parseFloat(item.total_value || item.estimated_value || 0).toFixed(2).replace('.', ','),
                data_criacao: item.creation_date ? new Date(item.creation_date).toLocaleDateString('pt-BR') : '',
                estagio: item.stage,
                responsavel: item.responsible || '',
                tipo: item.is_goal ? 'Meta' : 'Real',
                tags: (item.tagList || []).map(t => t.name).join(', '),
                obs_oportunidade: item.notes || '',

                // Forecast specific fields
                id_previsao: item.forecast_id || '',
                inicio_periodo: item.period_start ? new Date(item.period_start).toLocaleDateString('pt-BR') : '',
                fim_periodo: item.period_end ? new Date(item.period_end).toLocaleDateString('pt-BR') : '',
                valor_previsao: item.forecast_id ? parseFloat(item.estimated_value || 0).toFixed(2).replace('.', ',') : '',
                faturado: item.forecast_id ? (item.invoiced ? 'Sim' : 'Não') : '',
                obs_previsao: item.forecast_notes || ''
            }));

            downloadCsv(rows, `oportunidades_${new Date().toISOString().split('T')[0]}.csv`);
            setMessage({ type: 'success', text: 'Exportação de oportunidades concluída com sucesso!' });
        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: 'Erro ao exportar oportunidades: ' + error.message });
        } finally {
            setExporting(false);
        }
    };

    const handleExportClients = async () => {
        setExporting(true);
        setMessage({ type: '', text: '' });
        try {
            const data = await clientService.getClients(undefined, true);
            const rows = data.map((client) => ({
                id: client.id,
                nome: client.name,
                documento: client.document || '',
                endereco: client.address || '',
                obs: client.notes || '',
                excluido: client.is_deleted ? 'Sim' : 'Não',
                contatos: (client.contacts || [])
                    .map((c) => {
                        const parts = [
                            c.name,
                            c.email,
                            c.phone,
                            c.position,
                            c.is_primary ? '(Principal)' : ''
                        ].filter(Boolean);
                        return parts.join(' - ');
                    })
                    .join(' || '),
                data_criacao: client.created_at ? new Date(client.created_at).toLocaleDateString('pt-BR') : ''
            }));

            downloadCsv(rows, `clientes_${new Date().toISOString().split('T')[0]}.csv`);
            setMessage({ type: 'success', text: 'Exportação de clientes concluída com sucesso!' });
        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: 'Erro ao exportar clientes: ' + error.message });
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="card">
            <div className={styles.sectionHeader}>
                <div>
                    <h3 className={styles.sectionTitle}>Exportação de Dados</h3>
                    <p className={styles.sectionDescription}>
                        Exporte oportunidades e clientes (com contatos) em CSV separado por ";".
                    </p>
                </div>
            </div>

            {message.text && (
                <div className={`${styles.alert} ${styles[message.type]}`}>
                    {message.text}
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button className="btn btn-primary" onClick={handleExportOpportunities} disabled={exporting}>
                    <Download size={16} />
                    Exportar Oportunidades
                </button>
                <button className="btn btn-primary" onClick={handleExportClients} disabled={exporting}>
                    <Download size={16} />
                    Exportar Clientes
                </button>
            </div>
        </div>
    );
};

export default ExportData;
