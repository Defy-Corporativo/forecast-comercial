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

            const rows = data.map((item) => {
                // Format custom fields
                const customData = item.custom_data || {};
                const customFieldsStr = Object.entries(customData)
                    .map(([key, value]) => `${key}: ${value}`)
                    .join(' | ');

                // Format notes
                const notesStr = (item.notesList || [])
                    .map(note => {
                        const date = note.created_at ? new Date(note.created_at).toLocaleDateString('pt-BR') : '';
                        const author = note.created_by || '';
                        return `[${date}${author ? ' - ' + author : ''}] ${note.content}`;
                    })
                    .join(' || ');

                // Format actions
                const actionsStr = (item.actionsList || [])
                    .map(action => {
                        const status = action.status === 'concluida' ? '✓' : '○';
                        const date = action.created_at ? new Date(action.created_at).toLocaleDateString('pt-BR') : '';
                        return `${status} ${action.description} (${action.responsible}) [${date}]`;
                    })
                    .join(' || ');

                // Format history (últimas 5 mudanças mais recentes)
                const historyStr = (item.historyList || [])
                    .sort((a, b) => new Date(b.changed_at) - new Date(a.changed_at))
                    .slice(0, 5)
                    .map(h => {
                        const date = h.changed_at ? new Date(h.changed_at).toLocaleDateString('pt-BR') : '';
                        return `[${date}] ${h.field_changed}: ${h.old_value || '(vazio)'} → ${h.new_value || '(vazio)'}`;
                    })
                    .join(' || ');

                return {
                    id_oportunidade: item.id,
                    numero: item.opportunity_number,
                    titulo: item.title || '',
                    cliente: item.client?.name || item.client_name || '',
                    documento_cliente: item.client?.document || '',
                    contatos_cliente: (item.client?.contacts || [])
                        .map(c => `${c.name}${c.email ? ' (' + c.email + ')' : ''}${c.phone ? ' - ' + c.phone : ''}`)
                        .join(' | '),
                    valor_total_opp: parseFloat(item.total_value || item.estimated_value || 0).toFixed(2).replace('.', ','),
                    data_criacao: item.creation_date ? new Date(item.creation_date).toLocaleDateString('pt-BR') : '',
                    estagio: item.stage,
                    responsavel: item.responsible || '',
                    tipo: item.is_goal ? 'Meta' : 'Real',
                    potencial: item.is_potential ? 'Sim' : 'Não',
                    probabilidade_faturamento: item.billing_probability || '',
                    tags: (item.tagList || []).map(t => t.name).join(', '),
                    obs_oportunidade: item.notes || '',
                    campos_personalizados: customFieldsStr,
                    notas: notesStr,
                    acoes: actionsStr,
                    historico_mudancas: historyStr,

                    // Forecast specific fields
                    id_previsao: item.forecast_id || '',
                    inicio_periodo: item.period_start ? new Date(item.period_start).toLocaleDateString('pt-BR') : '',
                    fim_periodo: item.period_end ? new Date(item.period_end).toLocaleDateString('pt-BR') : '',
                    valor_previsao: item.forecast_id ? parseFloat(item.estimated_value || 0).toFixed(2).replace('.', ',') : '',
                    faturado: item.forecast_id ? (item.invoiced ? 'Sim' : 'Não') : '',
                    obs_previsao: item.forecast_notes || ''
                };
            });

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
            const rows = data.map((client) => {
                // Format contacts with all details
                const contactsStr = (client.contacts || [])
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
                    .join(' || ');

                return {
                    id: client.id,
                    nome: client.name,
                    documento: client.document || '',
                    endereco: client.address || '',
                    obs: client.notes || '',
                    excluido: client.is_deleted ? 'Sim' : 'Não',
                    contatos: contactsStr,
                    data_criacao: client.created_at ? new Date(client.created_at).toLocaleDateString('pt-BR') + ' ' + new Date(client.created_at).toLocaleTimeString('pt-BR') : '',
                    data_atualizacao: client.updated_at ? new Date(client.updated_at).toLocaleDateString('pt-BR') + ' ' + new Date(client.updated_at).toLocaleTimeString('pt-BR') : ''
                };
            });

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
                        Exporte todos os dados relacionados em CSV separado por ";".
                        <br/>
                        <strong>Oportunidades:</strong> inclui previsões, notas, ações, histórico, tags, campos personalizados e dados do cliente.
                        <br/>
                        <strong>Clientes:</strong> inclui contatos, datas de criação/atualização e todos os dados cadastrais.
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
