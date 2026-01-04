import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            handleSession(session);
        });

        // Listen for changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            handleSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleSession = async (session) => {
        if (!session?.user) {
            setUser(null);
            setLoading(false);
            return;
        }

        const userEmail = session.user.email;
        if (!userEmail?.endsWith('@defysolutions.com.br')) {
            await supabase.auth.signOut();
            alert('Acesso restrito apenas para o domínio @defysolutions.com.br');
            setUser(null);
            setLoading(false);
            return;
        }

        setUser(session.user);

        // Ensure profile exists
        const { data, error } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', session.user.id)
            .maybeSingle();

        if (!error && !data) {
            await supabase.from('profiles').insert({
                id: session.user.id,
                email: userEmail,
                name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || userEmail.split('@')[0],
                role: 'user',
            });
        }

        setLoading(false);
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        setUser(null);
    };

    const value = {
        user,
        loading,
        signOut,
        isFirstLogin: false, // Legacy support if needed
        clearFirstLogin: () => { },
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
