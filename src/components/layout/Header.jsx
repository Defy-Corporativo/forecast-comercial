import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { settingsService } from '../../services/settingsService';
import { userService } from '../../services/userService';
import { supabase } from '../../services/supabaseClient';
import { LogOut, Menu, Edit3, Lock } from 'lucide-react';
import { UserButton } from '@clerk/clerk-react';
import styles from './Layout.module.css';

const Header = ({ onMenuToggle }) => {
    const { user, signOut, profile } = useAuth();
    const [companyName, setCompanyName] = useState('');
    const [companyLogo, setCompanyLogo] = useState('');
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [showEditProfile, setShowEditProfile] = useState(false);
    const [showChangePassword, setShowChangePassword] = useState(false);
    const [nameValue, setNameValue] = useState('');
    const [savingName, setSavingName] = useState(false);
    const [nameMessage, setNameMessage] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordMessage, setPasswordMessage] = useState('');
    const [savingPassword, setSavingPassword] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        if (showEditProfile || showChangePassword) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [showEditProfile, showChangePassword]);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (user) {
            loadCompany();
        }
    }, [user]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setShowUserMenu(false);
            }
        };

        if (showUserMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showUserMenu]);

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
            setShowUserMenu(false);
        } catch (error) {
            console.error('Erro ao fazer logout:', error);
        }
    };

    const openEditProfile = () => {
        const initialName = profile?.name || user?.user_metadata?.name || user?.email?.split('@')[0] || '';
        setNameValue(initialName);
        setNameMessage('');
        setShowUserMenu(false);
        setShowEditProfile(true);
    };

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        if (!user) return;
        if (!nameValue.trim()) {
            setNameMessage('O nome não pode ficar vazio.');
            return;
        }

        setSavingName(true);
        setNameMessage('');

        try {
            await userService.updateUser(user.id, { name: nameValue.trim() });
            await supabase.auth.updateUser({ data: { name: nameValue.trim() } });
            setNameMessage('Nome atualizado com sucesso.');
        } catch (error) {
            console.error('Erro ao atualizar nome:', error);
            setNameMessage(error.message || 'Erro ao atualizar nome.');
        } finally {
            setSavingName(false);
        }
    };

    const openChangePassword = () => {
        setNewPassword('');
        setConfirmPassword('');
        setPasswordMessage('');
        setShowUserMenu(false);
        setShowChangePassword(true);
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setPasswordMessage('');

        if (newPassword.length < 6) {
            setPasswordMessage('A nova senha deve ter pelo menos 6 caracteres.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setPasswordMessage('As senhas não coincidem.');
            return;
        }

        setSavingPassword(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;
            setPasswordMessage('Senha alterada com sucesso.');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error) {
            console.error('Erro ao alterar senha:', error);
            setPasswordMessage(error.message || 'Erro ao alterar senha.');
        } finally {
            setSavingPassword(false);
        }
    };

    const getUserName = () => {
        return user?.user_metadata?.name || user?.email?.split('@')[0] || 'Usuário';
    };

    const getUserInitial = () => {
        const name = getUserName();
        return name.charAt(0).toUpperCase();
    };

    return (
        <header className={styles.header}>
            <div className={styles.headerContent}>
                <div className={styles.headerLeft}>
                    {isMobile && onMenuToggle && (
                        <button className={styles.mobileMenuBtn} onClick={onMenuToggle}>
                            <Menu size={24} />
                        </button>
                    )}
                    {companyLogo ? (
                        <div className={styles.logoContainer}>
                            <img src={companyLogo} alt={companyName || 'Logo'} className={styles.companyLogo} />
                            {companyName && (
                                <span className={styles.companyName}>{companyName}</span>
                            )}
                        </div>
                    ) : (
                        <h2 className={styles.pageTitle}>Forecast Comercial</h2>
                    )}
                </div>
                <div className={styles.userInfo} ref={menuRef}>
                    <span className={styles.userName}>{getUserName()}</span>
                    <UserButton afterSignOutUrl="/" />
                </div>
            </div>
            {showEditProfile && (
                <div className={styles.modalOverlay} onClick={() => setShowEditProfile(false)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h3>Alterar cadastro</h3>
                        </div>
                        <form onSubmit={handleSaveProfile}>
                            <div className={styles.modalBody}>
                                <div className="input-group">
                                    <label className="label" htmlFor="edit-name">Nome</label>
                                    <input
                                        id="edit-name"
                                        type="text"
                                        name="name"
                                        className="input"
                                        value={nameValue}
                                        onChange={(e) => setNameValue(e.target.value)}
                                        autoComplete="name"
                                        required
                                    />
                                </div>
                                {nameMessage && (
                                    <div className={`${styles.alert} ${nameMessage.includes('sucesso') ? styles.success : styles.error}`}>
                                        {nameMessage}
                                    </div>
                                )}
                            </div>
                            <div className={styles.modalFooter}>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setShowEditProfile(false)}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={savingName}
                                >
                                    {savingName ? 'Salvando...' : 'Salvar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showChangePassword && (
                <div className={styles.modalOverlay} onClick={() => setShowChangePassword(false)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h3>Alterar senha</h3>
                        </div>
                        <form onSubmit={handleChangePassword}>
                            <div className={styles.modalBody}>
                                <div className="input-group">
                                    <label className="label" htmlFor="new-password">Nova senha</label>
                                    <input
                                        id="new-password"
                                        type="password"
                                        name="newPassword"
                                        className="input"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Mínimo 6 caracteres"
                                        autoComplete="new-password"
                                        minLength={6}
                                        required
                                    />
                                </div>
                                <div className="input-group">
                                    <label className="label" htmlFor="confirm-password">Confirmar nova senha</label>
                                    <input
                                        id="confirm-password"
                                        type="password"
                                        name="confirmPassword"
                                        className="input"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Digite a senha novamente"
                                        autoComplete="new-password"
                                        minLength={6}
                                        required
                                    />
                                </div>
                                {passwordMessage && (
                                    <div className={`${styles.alert} ${passwordMessage.includes('sucesso') ? styles.success : styles.error}`}>
                                        {passwordMessage}
                                    </div>
                                )}
                            </div>
                            <div className={styles.modalFooter}>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setShowChangePassword(false)}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={savingPassword}
                                >
                                    {savingPassword ? 'Alterando...' : 'Alterar senha'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </header>
    );
};

export default Header;
