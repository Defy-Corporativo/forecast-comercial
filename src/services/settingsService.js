import { supabase } from './supabaseClient';

export const settingsService = {
    // Company Settings
    async getCompany() {
        const { data, error } = await supabase
            .from('companies')
            .select('*')
            .limit(1)
            .maybeSingle();

        if (error) throw error;
        return data;
    },

    async updateCompany(_userId, companyData) {
        const { data: existing } = await supabase
            .from('companies')
            .select('id')
            .limit(1)
            .maybeSingle();

        if (existing) {
            const { data, error } = await supabase
                .from('companies')
                .update({ ...companyData, updated_at: new Date() })
                .eq('id', existing.id)
                .select()
                .single();
            if (error) throw error;
            return data;
        } else {
            const { data, error } = await supabase
                .from('companies')
                .insert([{ ...companyData }])
                .select()
                .single();
            if (error) throw error;
            return data;
        }
    },

    // Custom Fields
    async getCustomFields() {
        const { data, error } = await supabase
            .from('custom_fields')
            .select('*')
            .eq('is_deleted', false)
            .order('order_index', { ascending: true });

        if (error) throw error;
        return data;
    },

    async createCustomField(_userId, fieldData) {
        const { data, error } = await supabase
            .from('custom_fields')
            .insert([{ ...fieldData }])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updateCustomField(id, fieldData) {
        const { data, error } = await supabase
            .from('custom_fields')
            .update(fieldData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deleteCustomField(id) {
        const { data, error } = await supabase
            .from('custom_fields')
            .update({ is_deleted: true })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // Stage Definitions
    async getStageDefinitions() {
        const { data, error } = await supabase
            .from('stage_definitions')
            .select('*')
            .order('order_index', { ascending: true });

        if (error) throw error;
        return data || [];
    },

    async createStageDefinition(_userId, stageData) {
        const { data, error } = await supabase
            .from('stage_definitions')
            .insert([{ ...stageData }])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updateStageDefinition(id, stageData) {
        const { data, error } = await supabase
            .from('stage_definitions')
            .update({ ...stageData, updated_at: new Date() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deleteStageDefinition(id) {
        const { error } = await supabase
            .from('stage_definitions')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    async resetStageDefinitions(_userId, defaultStages) {
        await supabase.from('stage_definitions').delete();

        const stagesToInsert = defaultStages.map((stage) => ({
            name: stage.name,
            description: stage.description,
            order_index: stage.order_index,
            color: stage.color,
            allowed_next_stages: stage.allowed_next_stages || [],
        }));

        const { data, error } = await supabase
            .from('stage_definitions')
            .insert(stagesToInsert)
            .select();

        if (error) throw error;
        return data;
    },

    // User Preferences (globais)
    async getUserPreferences() {
        const { data, error } = await supabase
            .from('user_preferences')
            .select('*')
            .limit(1)
            .maybeSingle();

        if (error) throw error;
        return data;
    },

    async updateUserPreferences(_userId, preferences) {
        const { data: existing } = await supabase
            .from('user_preferences')
            .select('id')
            .limit(1)
            .maybeSingle();

        if (existing) {
            const { data, error } = await supabase
                .from('user_preferences')
                .update({ ...preferences, updated_at: new Date() })
                .eq('id', existing.id)
                .select()
                .single();
            if (error) throw error;
            return data;
        } else {
            const { data, error } = await supabase
                .from('user_preferences')
                .insert([{ ...preferences }])
                .select()
                .single();
            if (error) throw error;
            return data;
        }
    },

    // Clients
    async getClients() {
        const { data, error } = await supabase
            .from('clients')
            .select('*')
            .order('name', { ascending: true });

        if (error) throw error;
        return data || [];
    },

    async getClient(id) {
        const { data, error } = await supabase
            .from('clients')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    },

    async createClient(userId, clientData) {
        const { data, error } = await supabase
            .from('clients')
            .insert([{ ...clientData, user_id: userId }])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updateClient(id, clientData) {
        const { data, error } = await supabase
            .from('clients')
            .update({ ...clientData, updated_at: new Date() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deleteClient(id) {
        const { error } = await supabase
            .from('clients')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};
