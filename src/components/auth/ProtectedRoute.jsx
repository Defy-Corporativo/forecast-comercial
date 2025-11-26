import React, { useEffect, useState } from 'react';
import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react';
import { useAuth } from '../../contexts/AuthContext';

const ALLOWED_DOMAIN = 'defysolutions.com.br';

const DomainGuard = ({ children }) => {
    const { user, signOut } = useAuth();
    const [status, setStatus] = useState('checking'); // checking | allowed | blocked

    useEffect(() => {
        if (!user) return;
        const domain = user.email?.split('@')[1]?.toLowerCase();
        if (domain !== ALLOWED_DOMAIN) {
            setStatus('blocked');
            signOut().catch(() => {});
        } else {
            setStatus('allowed');
        }
    }, [user, signOut]);

    if (status === 'blocked') {
        return (
            <div style={{ padding: '32px', maxWidth: 500, margin: '40px auto' }}>
                <h3 style={{ marginTop: 0 }}>Acesso restrito</h3>
                <p>Somente contas com domínio {ALLOWED_DOMAIN} podem acessar.</p>
            </div>
        );
    }

    if (status === 'checking') {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <div>Validando acesso...</div>
            </div>
        );
    }

    return children;
};

const ProtectedRoute = ({ children }) => {
    return (
        <>
            <SignedIn>
                <DomainGuard>{children}</DomainGuard>
            </SignedIn>
            <SignedOut>
                <RedirectToSignIn />
            </SignedOut>
        </>
    );
};

export default ProtectedRoute;
