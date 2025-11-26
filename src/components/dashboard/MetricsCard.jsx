import React from 'react';
import styles from './Dashboard.module.css';

const MetricsCard = ({ title, value, icon: Icon, color }) => {
    return (
        <div className={styles.metricCard}>
            <div className={styles.metricHeader}>
                <div className={styles.metricTitle}>{title}</div>
                <div className={styles.metricIcon} style={{ backgroundColor: color }}>
                    <Icon size={20} color="white" />
                </div>
            </div>
            <div className={styles.metricValue}>{value}</div>
        </div>
    );
};

export default MetricsCard;
