import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import { responsiblesService } from '../../services/responsiblesService';

/**
 * Rota /acoes sem UUID:
 *  - Se o usuário estiver logado e tiver cadastro como responsável → redireciona para /acoes/:uuid
 *  - Caso contrário → exibe mensagem orientando o usuário
 */
const AcoesRedirect = () => {
    const navigate = useNavigate();
    const [status, setStatus] = useState('loading'); // 'loading' | 'not-logged' | 'not-found'

    useEffect(() => {
        const resolve = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();

                if (!session?.user?.email) {
                    setStatus('not-logged');
                    return;
                }

                const resp = await responsiblesService.getResponsibleByEmail(session.user.email);

                if (resp?.id) {
                    navigate(`/acoes/${resp.id}`, { replace: true });
                } else {
                    setStatus('not-found');
                }
            } catch (err) {
                console.error('Erro ao redirecionar:', err);
                setStatus('not-found');
            }
        };

        resolve();
    }, [navigate]);

    if (status === 'loading') {
        return (
            <div style={styles.center}>
                <div style={styles.spinner} />
                <span style={styles.text}>Identificando seu acesso...</span>
            </div>
        );
    }

    if (status === 'not-logged') {
        return (
            <div style={styles.center}>
                <span style={{ fontSize: '2.5rem' }}>🔒</span>
                <h2 style={styles.title}>Acesso necessário</h2>
                <p style={styles.subtitle}>
                    Faça login no sistema para acessar suas ações diretamente por este link.
                </p>
                <a href="/login?returnTo=/acoes" style={styles.btn}>Fazer login</a>
            </div>
        );
    }

    return (
        <div style={styles.center}>
            <span style={{ fontSize: '2.5rem' }}>🔍</span>
            <h2 style={styles.title}>Responsável não encontrado</h2>
            <p style={styles.subtitle}>
                Seu e-mail não está vinculado a nenhum responsável cadastrado no sistema.<br />
                Solicite ao administrador que cadastre seu e-mail.
            </p>
        </div>
    );
};

const styles = {
    center: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        gap: '16px',
        padding: '24px',
        background: 'linear-gradient(135deg, #f0f4ff 0%, #e8eef8 50%, #f5f0ff 100%)',
        textAlign: 'center',
    },
    spinner: {
        width: '40px',
        height: '40px',
        border: '3px solid #e2e8f0',
        borderTopColor: '#3b82f6',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
    },
    text: {
        color: '#64748b',
        fontSize: '1rem',
    },
    title: {
        color: '#1e293b',
        fontSize: '1.4rem',
        fontWeight: '700',
        margin: '0',
    },
    subtitle: {
        color: '#64748b',
        fontSize: '0.95rem',
        maxWidth: '380px',
        lineHeight: '1.6',
        margin: '0',
    },
    btn: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px 24px',
        background: '#3b82f6',
        color: 'white',
        borderRadius: '10px',
        textDecoration: 'none',
        fontWeight: '700',
        fontSize: '0.95rem',
        marginTop: '8px',
    },
};

export default AcoesRedirect;
