import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import FirstLoginModal from '../auth/FirstLoginModal';
import { useAuth } from '../../contexts/AuthContext';
import styles from './Layout.module.css';

const MainLayout = () => {
    const { isFirstLogin } = useAuth();
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);

    const toggleSidebar = () => {
        setIsSidebarCollapsed(!isSidebarCollapsed);
    };

    return (
        <div className={styles.layout}>
            <Sidebar isCollapsed={isSidebarCollapsed} onToggle={toggleSidebar} />
            <div className={`${styles.mainContent} ${isSidebarCollapsed ? styles.expanded : ''}`}>
                <Header onMenuToggle={toggleSidebar} />
                <main className={styles.pageContent}>
                    <Outlet />
                </main>
            </div>
            {isFirstLogin && <FirstLoginModal />}
        </div>
    );
};

export default MainLayout;
