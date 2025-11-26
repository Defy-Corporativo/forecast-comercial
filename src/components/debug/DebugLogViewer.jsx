import React, { useEffect, useState } from 'react';
import { getLogs, clearLogs, logDebug } from '../../utils/logger';

const DebugLogViewer = () => {
    const isDebugMode = typeof window !== 'undefined'
        && new URLSearchParams(window.location.search).get('debug') === '1';

    const [logs, setLogs] = useState(getLogs());

    useEffect(() => {
        if (!isDebugMode) return undefined;

        const interval = setInterval(() => {
            setLogs(getLogs());
        }, 1000);

        return () => clearInterval(interval);
    }, [isDebugMode]);

    if (!isDebugMode) return null;

    const handleCopy = async () => {
        try {
            const text = logs.map((l) => `${l.ts} | ${l.message} | ${JSON.stringify(l.data)}`).join('\n');
            await navigator.clipboard.writeText(text || 'No logs collected.');
            logDebug('Debug logs copied to clipboard');
        } catch (err) {
            logDebug('Failed to copy debug logs', { error: err.message });
        }
    };

    const handleClear = () => {
        clearLogs();
        setLogs(getLogs());
    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <span>Debug Logs (query param ?debug=1)</span>
                <div style={styles.actions}>
                    <button type="button" onClick={handleCopy} style={styles.button}>Copy</button>
                    <button type="button" onClick={handleClear} style={styles.button}>Clear</button>
                </div>
            </div>
            <div style={styles.body}>
                {logs.length === 0 ? (
                    <div style={styles.empty}>No logs yet.</div>
                ) : (
                    logs.slice(-100).map((log, idx) => (
                        <div key={`${log.ts}-${idx}`} style={styles.line}>
                            <strong>{log.ts}</strong> — {log.message}
                            {log.data !== null && log.data !== undefined && (
                                <pre style={styles.pre}>{JSON.stringify(log.data, null, 2)}</pre>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

const styles = {
    container: {
        position: 'fixed',
        bottom: '16px',
        right: '16px',
        width: '360px',
        maxHeight: '50vh',
        background: 'rgba(15, 23, 42, 0.92)',
        color: 'white',
        borderRadius: '12px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
        overflow: 'hidden',
        zIndex: 9999,
        fontSize: '12px',
        display: 'flex',
        flexDirection: 'column',
    },
    header: {
        padding: '10px 12px',
        background: 'rgba(255,255,255,0.06)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '8px',
    },
    actions: {
        display: 'flex',
        gap: '6px',
    },
    button: {
        background: 'rgba(255,255,255,0.12)',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        padding: '6px 10px',
        cursor: 'pointer',
        fontSize: '12px',
    },
    body: {
        padding: '10px 12px',
        overflowY: 'auto',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    line: {
        background: 'rgba(255,255,255,0.05)',
        padding: '8px',
        borderRadius: '8px',
        wordBreak: 'break-word',
    },
    pre: {
        marginTop: '4px',
        whiteSpace: 'pre-wrap',
        fontSize: '11px',
        color: '#cbd5f5',
    },
    empty: {
        textAlign: 'center',
        padding: '12px',
        opacity: 0.8,
    },
};

export default DebugLogViewer;
