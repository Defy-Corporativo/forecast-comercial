import React, { useState } from 'react';
import CustomFields from './CustomFields';
import StageSettings from './StageSettings';
import ViewSettings from './ViewSettings';
import ResponsiblesSettings from './ResponsiblesSettings';
import TagSettings from './TagSettings';
import styles from './Settings.module.css';
import ExportData from './ExportData';

const Settings = () => {
    const [activeTab, setActiveTab] = useState('responsibles');

    return (
        <div className="container">
            <div className="page-header">
                <h1 className="page-title">Configurações</h1>
            </div>

            <div className={styles.tabs}>
                <button
                    className={`${styles.tab} ${activeTab === 'responsibles' ? styles.active : ''}`}
                    onClick={() => setActiveTab('responsibles')}
                >
                    Responsáveis
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'tags' ? styles.active : ''}`}
                    onClick={() => setActiveTab('tags')}
                >
                    Tags
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'fields' ? styles.active : ''}`}
                    onClick={() => setActiveTab('fields')}
                >
                    Campos Personalizados
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'stages' ? styles.active : ''}`}
                    onClick={() => setActiveTab('stages')}
                >
                    Estágios
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'view' ? styles.active : ''}`}
                    onClick={() => setActiveTab('view')}
                >
                    Visualização
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'export' ? styles.active : ''}`}
                    onClick={() => setActiveTab('export')}
                >
                    Exportar
                </button>
            </div>

            <div className={styles.tabContent}>
                {activeTab === 'responsibles' && <ResponsiblesSettings />}
                {activeTab === 'tags' && <TagSettings />}
                {activeTab === 'fields' && <CustomFields />}
                {activeTab === 'stages' && <StageSettings />}
                {activeTab === 'view' && <ViewSettings />}
                {activeTab === 'export' && <ExportData />}
            </div>
        </div>
    );
};

export default Settings;
