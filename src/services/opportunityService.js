import { supabase } from './supabaseClient';

export const opportunityService = {
    async getOpportunities(_userId, filters = {}) {
        let query = supabase
            .from('opportunities')
            .select(`
                *,
                client:clients (
                    id,
                    name,
                    document,
                    contacts:client_contacts (
                        id,
                        name,
                        email,
                        phone,
                        position,
                        is_primary
                    )
                )
            `)
            .order('created_at', { ascending: false });

        // Apply filters if needed (basic implementation)
        if (filters.stage) {
            query = query.eq('stage', filters.stage);
        }

        const { data, error } = await query;
        if (error) {
            console.error('Erro ao buscar oportunidades:', error);
            throw error;
        }
        return data;
    },

    async getOpportunity(id) {
        const { data, error } = await supabase
            .from('opportunities')
            .select(`
                *,
                client:clients (
                    id,
                    name,
                    document,
                    contacts:client_contacts (
                        id,
                        name,
                        email,
                        phone,
                        position,
                        is_primary
                    )
                )
            `)
            .eq('id', id)
            .single();

        if (error) {
            console.error('Erro ao buscar oportunidade:', error);
            throw error;
        }
        return data;
    },

    async createOpportunity(_userId, opportunityData) {
        // Generate Opportunity Number
        const { count } = await supabase
            .from('opportunities')
            .select('*', { count: 'exact', head: true });

        const opportunityNumber = `OPP-${String(count + 1).padStart(7, '0')}`;

        const { data, error } = await supabase
            .from('opportunities')
            .insert([{
                ...opportunityData,
                opportunity_number: opportunityNumber
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updateOpportunity(id, opportunityData) {
        const { data, error } = await supabase
            .from('opportunities')
            .update({ ...opportunityData, updated_at: new Date() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deleteOpportunity(id) {
        const { error } = await supabase
            .from('opportunities')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    async updateStage(id, stage) {
        const { data, error } = await supabase
            .from('opportunities')
            .update({ stage, updated_at: new Date() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }
};
