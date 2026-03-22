import { supabase } from './supabaseClient';
import { opportunityNotesService } from './opportunityNotesService';

export const opportunityActionsService = {
    // Get actions for a specific opportunity
    async getActions(opportunityId, filters = {}) {
        let query = supabase
            .from('opportunity_actions')
            .select('*')
            .eq('opportunity_id', opportunityId)
            .order('created_at', { ascending: false });

        if (filters.status) {
            query = query.eq('status', filters.status);
        }

        if (filters.responsible) {
            query = query.eq('responsible', filters.responsible);
        }

        if (filters.searchText) {
            query = query.ilike('description', `%${filters.searchText}%`);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    },

    // Get all actions (for dedicated actions page)
    async getAllActions(filters = {}) {
        let query = supabase
            .from('opportunity_actions')
            .select(`
                *,
                opportunity:opportunities (
                    id,
                    opportunity_number,
                    title,
                    client_name,
                    is_goal,
                    is_potential,
                    display_priority
                )
            `)
            .order('created_at', { ascending: false });

        if (filters.status) {
            query = query.eq('status', filters.status);
        }

        if (filters.responsible) {
            query = query.eq('responsible', filters.responsible);
        }

        if (filters.searchText) {
            query = query.ilike('description', `%${filters.searchText}%`);
        }

        const { data, error } = await query;
        if (error) throw error;

        // Filter out actions from goal opportunities (meta)
        return (data || []).filter(action =>
            action.opportunity && !action.opportunity.is_goal
        );
    },

    // Create a new action
    async createAction(opportunityId, description, responsible, dueDate = null) {
        const insertData = {
            opportunity_id: opportunityId,
            description: description,
            responsible: responsible,
            status: 'pendente'
        };
        if (dueDate) {
            insertData.due_date = dueDate;
        }
        const { data, error } = await supabase
            .from('opportunity_actions')
            .insert([insertData])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // Update an action
    async updateAction(actionId, updates) {
        const { data, error } = await supabase
            .from('opportunity_actions')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('id', actionId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // Delete an action
    async deleteAction(actionId, opportunityId = null, noteText = '', userName = '') {
        // Get action details before deleting (if we need to create a note)
        let action = null;
        if (opportunityId && userName) {
            const { data } = await supabase
                .from('opportunity_actions')
                .select('*')
                .eq('id', actionId)
                .single();
            action = data;
        }

        // Delete the action
        const { error } = await supabase
            .from('opportunity_actions')
            .delete()
            .eq('id', actionId);

        if (error) throw error;

        // Create automatic note if opportunityId and userName are provided
        if (opportunityId && userName && action) {
            const noteContent = noteText?.trim()
                ? `[Ação Excluída] ${action.description}\n\nResponsável: ${action.responsible}\n\n${noteText}`
                : `[Ação Excluída] ${action.description}\n\nResponsável: ${action.responsible}`;

            await opportunityNotesService.createNote(
                opportunityId,
                noteContent,
                userName
            );
        }
    },

    // Complete an action and create a note
    async completeAction(actionId, opportunityId, noteText, userName) {
        // First, update the action status
        const { data: action, error: updateError } = await supabase
            .from('opportunity_actions')
            .update({
                status: 'concluida',
                updated_at: new Date().toISOString()
            })
            .eq('id', actionId)
            .select()
            .single();

        if (updateError) throw updateError;

        // Create the automatic note
        const noteContent = noteText?.trim()
            ? `[Ação Concluída] ${action.description}\n\nResponsável: ${action.responsible}\n\n${noteText}`
            : `[Ação Concluída] ${action.description}\n\nResponsável: ${action.responsible}`;

        await opportunityNotesService.createNote(
            opportunityId,
            noteContent,
            userName
        );

        return action;
    },

    // Get action counts for an opportunity
    async getActionCounts(opportunityId) {
        const { data, error } = await supabase
            .from('opportunity_actions')
            .select('status')
            .eq('opportunity_id', opportunityId);

        if (error) throw error;

        const pending = (data || []).filter(a => a.status === 'pendente').length;
        const completed = (data || []).filter(a => a.status === 'concluida').length;

        return { pending, completed, total: pending + completed };
    },

    // Calculate action age in days
    calculateAge(createdAt) {
        const created = new Date(createdAt);
        const now = new Date();
        const diffTime = Math.abs(now - created);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    }
};
