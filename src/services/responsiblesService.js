import { supabase } from './supabaseClient';

export const responsiblesService = {
    // Get all responsibles (active only by default)
    async getResponsibles(includeInactive = false) {
        let query = supabase
            .from('responsibles')
            .select('*')
            .order('name', { ascending: true });

        if (!includeInactive) {
            query = query.eq('is_active', true);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    },

    // Create a new responsible
    async createResponsible(name) {
        const { data, error } = await supabase
            .from('responsibles')
            .insert([{ name: name.trim() }])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // Update a responsible
    async updateResponsible(id, name) {
        const { data, error } = await supabase
            .from('responsibles')
            .update({
                name: name.trim(),
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // Toggle active status
    async toggleActive(id, isActive) {
        const { data, error } = await supabase
            .from('responsibles')
            .update({
                is_active: isActive,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // Delete a responsible
    async deleteResponsible(id) {
        const { error } = await supabase
            .from('responsibles')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};
