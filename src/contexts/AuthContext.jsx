import React, { createContext, useContext, useEffect } from 'react';
import { useUser, useAuth as useClerkAuth } from '@clerk/clerk-react';
import { supabase } from '../services/supabaseClient';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const { isLoaded, user } = useUser();
    const { signOut } = useClerkAuth();

    useEffect(() => {
        const ensureProfile = async () => {
            if (!user) return;
            const profileId = user.id;
            const { data, error } = await supabase
                .from('profiles')
                .select('id')
                .eq('id', profileId)
                .maybeSingle();
            if (error) return;
            if (!data) {
                await supabase.from('profiles').insert({
                    id: profileId,
                    email: user.primaryEmailAddress?.emailAddress,
                    name: user.fullName,
                    role: 'user',
                });
            }
        };
        ensureProfile();
    }, [user]);

    // Map Clerk user to the shape expected in the app
    const mappedUser = user
        ? {
            id: user.id,
            email: user.primaryEmailAddress?.emailAddress,
            user_metadata: { name: user.fullName },
        }
        : null;

    const value = {
        user: mappedUser,
        profile: null,
        isFirstLogin: false,
        clearFirstLogin: () => {},
        signOut,
        loading: !isLoaded,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
