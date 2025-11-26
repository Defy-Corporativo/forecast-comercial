import { createClient } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.SUPABASE_ANON_KEY;

export const userService = {
    // List all users (profiles)
    async getUsers() {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Erro ao buscar usuários:', error);
            throw error;
        }
        console.log('Usuários encontrados:', data);
        return data || [];
    },

    // Create a new user record (profile). Note: authentication is handled by Clerk.
    async createUser(userData) {
        const tempSupabase = createClient(supabaseUrl, supabaseAnonKey, {
            auth: {
                persistSession: false, // Don't save session to localStorage
                autoRefreshToken: false,
                detectSessionInUrl: false,
                storageKey: 'sb-forecast-temp-admin',
            }
        });

        const { data, error } = await tempSupabase
            .from('profiles')
            .insert({
                id: userData.id,
                email: userData.email,
                name: userData.name,
                role: userData.role || 'user'
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // Update user profile (name only)
    async updateUser(userId, userData) {
        const { data, error } = await supabase
            .from('profiles')
            .update({
                name: userData.name,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // Delete user (cascades to profile via FK)
    async deleteUser(userId) {
        // Note: This requires service_role key to delete auth users
        // For now, we'll just delete the profile and mark as inactive
        const { error } = await supabase
            .from('profiles')
            .delete()
            .eq('id', userId);

        if (error) throw error;
        return true;
    },
};
