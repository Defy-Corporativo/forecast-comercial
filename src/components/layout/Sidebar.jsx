import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Briefcase, Settings, Menu, ChevronLeft, Building2, TrendingUp } from 'lucide-react';
import styles from './Layout.module.css';

const Sidebar = ({ isCollapsed, onToggle }) => {
    return (
        <>
            {!isCollapsed && <div className={styles.sidebarOverlay} onClick={onToggle} />}
            <aside className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''}`}>
                <div className={styles.sidebarHeader}>
                    {isCollapsed ? (
                        <button
                            className={styles.toggleBtn}
                            onClick={onToggle}
                            title="Abrir menu"
                        >
                            <Menu size={20} />
                        </button>
                    ) : (
                        <>
                            <div className={styles.appBrand}>
                                <div className={styles.appIcon}>
                                    <TrendingUp size={22} />
                                </div>
                                <div className={styles.appBrandText}>
                                    <span className={styles.appName}>Forecast</span>
                                    <span className={styles.appTagline}>Comercial</span>
                                </div>
                            </div>
                            <button
                                className={styles.toggleBtnLight}
                                onClick={onToggle}
                                title="Recolher menu"
                            >
                                <ChevronLeft size={18} />
                            </button>
                        </>
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
