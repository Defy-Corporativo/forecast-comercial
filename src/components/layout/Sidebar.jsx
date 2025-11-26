import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Briefcase, Settings, LogOut, Menu, ChevronLeft, Building2, TrendingUp } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { settingsService } from '../../services/settingsService';
import styles from './Layout.module.css';

const Sidebar = ({ isCollapsed, onToggle }) => {
    const { signOut, user } = useAuth();
    const [companyName, setCompanyName] = useState('');
    const [companyLogo, setCompanyLogo] = useState('');

    useEffect(() => {
        if (user) {
            loadCompany();
        }
    }, [user]);

    const loadCompany = async () => {
        try {
            const data = await settingsService.getCompany(user.id);
            if (data) {
                setCompanyName(data.name || '');
                setCompanyLogo(data.logo_url || '');
            }
        } catch (error) {
            console.error('Erro ao carregar empresa:', error);
        }
    };

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
                            <div className={styles.brandArea}>
                                {companyLogo ? (
                                    <div className={styles.companyBrand}>
                                        <img 
                                            src={companyLogo} 
                                            alt={companyName || 'Logo'} 
                                            className={styles.sidebarLogo} 
                                        />
                                        {companyName && (
                                            <span className={styles.sidebarCompanyName}>{companyName}</span>
                                        )}
                                    </div>
                                ) : (
                                    <div className={styles.appBrand}>
                                        <div className={styles.appIcon}>
                                            <TrendingUp size={22} />
                                        </div>
                                        <div className={styles.appBrandText}>
                                            <span className={styles.appName}>Forecast</span>
                                            <span className={styles.appTagline}>Comercial</span>
                                        </div>
                                    </div>
                                )}
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
