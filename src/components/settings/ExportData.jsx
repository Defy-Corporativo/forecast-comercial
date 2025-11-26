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
            const data = await opportunityService.getOpportunities();
            const rows = data.map((opp) => ({
                id: opp.id,
                opportunity_number: opp.opportunity_number,
                client_name: opp.client?.name || opp.client_name || '',
                estimated_value: opp.estimated_value,
                creation_date: opp.creation_date,
                stage: opp.stage,
                forecast_date: opp.forecast_date || '',
                responsible: opp.responsible || '',
                notes: opp.notes || '',
                invoiced: opp.invoiced ? 'Sim' : 'Não',
            }));
            downloadCsv(rows, 'oportunidades.csv');
            setMessage({ type: 'success', text: 'Exportação de oportunidades concluída.' });
        } catch (error) {
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
                name: client.name,
                document: client.document || '',
                address: client.address || '',
                notes: client.notes || '',
                is_deleted: client.is_deleted ? 'Sim' : 'Não',
                contacts: (client.contacts || [])
                    .map((c) => `${c.name} | ${c.email || ''} | ${c.phone || ''} | ${c.position || ''} | ${c.is_primary ? 'Principal' : ''}`)
                    .join(' || '),
            }));
            downloadCsv(rows, 'clientes.csv');
            setMessage({ type: 'success', text: 'Exportação de clientes concluída.' });
        } catch (error) {
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
