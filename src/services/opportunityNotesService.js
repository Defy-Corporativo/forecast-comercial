import { supabase } from './supabaseClient';

export const opportunityNotesService = {
    async getNotes(opportunityId, filters = {}) {
        let query = supabase
            .from('opportunity_notes')
            .select('*')
            .eq('opportunity_id', opportunityId)
            .order('created_at', { ascending: false });

        // Filtro por texto
        if (filters.searchText) {
            query = query.ilike('content', `%${filters.searchText}%`);
        }

        // Filtro por data inicial
        if (filters.startDate) {
            query = query.gte('created_at', filters.startDate);
        }

        // Filtro por data final
        if (filters.endDate) {
            // Adiciona 1 dia para incluir o dia final completo
            const endDate = new Date(filters.endDate);
            endDate.setDate(endDate.getDate() + 1);
            query = query.lt('created_at', endDate.toISOString());
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    },

    async createNote(opportunityId, content, createdBy) {
        const { data, error } = await supabase
            .from('opportunity_notes')
            .insert([{
                opportunity_id: opportunityId,
                content: content,
                created_by: createdBy
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updateNote(noteId, content) {
        const { data, error } = await supabase
            .from('opportunity_notes')
            .update({ content, updated_at: new Date() })
            .eq('id', noteId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deleteNote(noteId) {
        const { error } = await supabase
            .from('opportunity_notes')
            .delete()
            .eq('id', noteId);

        if (error) throw error;
    }
};

