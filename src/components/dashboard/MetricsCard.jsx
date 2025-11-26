import React from 'react';
import styles from './Dashboard.module.css';

const MetricsCard = ({ title, value, icon: Icon, color }) => {
    return (
        <div className={styles.metricCard}>
            <div className={styles.metricContent}>
                <div className={styles.metricTitle}>{title}</div>
                <div className={styles.metricValue}>{value}</div>
            </div>
            <div className={styles.metricIcon} style={{ backgroundColor: color }}>
                <Icon size={18} color="white" />
            </div>
        </div>
    );
};

export default MetricsCard;
