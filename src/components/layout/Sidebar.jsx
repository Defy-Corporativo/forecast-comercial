import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Briefcase, Settings, LogOut, Menu, ChevronLeft, Building2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import styles from './Layout.module.css';

const Sidebar = ({ isCollapsed, onToggle }) => {
    const { signOut } = useAuth();

    const handleLogout = async () => {
        try {
            await signOut();
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    return (
        <>
            {!isCollapsed && <div className={styles.sidebarOverlay} onClick={onToggle} />}
            <aside className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''}`}>
                <div className={styles.sidebarHeader}>
                    <div className={styles.logo}>{!isCollapsed && 'Forecast Comercial'}</div>
                    {isCollapsed && (
                        <button
                            className={styles.toggleBtn}
                            onClick={onToggle}
                            title="Abrir menu"
                        >
                            <Menu size={20} />
                        </button>
                    )}
                    {!isCollapsed && (
                        <button
                            className={styles.toggleBtn}
                            onClick={onToggle}
                            title="Recolher menu"
                            style={{
                                opacity: 0.7,
                                transition: 'opacity 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                            onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
                        >
                            <ChevronLeft size={20} />
                        </button>
                    )}
                </div>
                <nav className={styles.nav}>
                    <NavLink
                        to="/"
                        className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
                        end
                        title="Painel"
                        onClick={() => window.innerWidth < 768 && onToggle()}
                    >
                        <LayoutDashboard size={20} />
                        {!isCollapsed && <span>Painel</span>}
                    </NavLink>
                    <NavLink
                        to="/opportunities"
                        className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
                        title="Oportunidades"
                        onClick={() => window.innerWidth < 768 && onToggle()}
                    >
                        <Briefcase size={20} />
                        {!isCollapsed && <span>Oportunidades</span>}
                    </NavLink>
                    <NavLink
                        to="/clients"
                        className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
                        title="Clientes"
                        onClick={() => window.innerWidth < 768 && onToggle()}
                    >
                        <Building2 size={20} />
                        {!isCollapsed && <span>Clientes</span>}
                    </NavLink>
                    <NavLink
                        to="/settings"
                        className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
                        title="Configurações"
                        onClick={() => window.innerWidth < 768 && onToggle()}
                    >
                        <Settings size={20} />
                        {!isCollapsed && <span>Configurações</span>}
                    </NavLink>

                </nav>
            </aside>
        </>
    );
};

export default Sidebar;
