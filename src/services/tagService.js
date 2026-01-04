import { supabase } from './supabaseClient';

export const tagService = {
    // Get all tags
    async getTags() {
        const { data, error } = await supabase
            .from('opportunity_tags')
            .select('*')
            .order('name', { ascending: true });

        if (error) {
            console.error('Erro ao buscar tags:', error);
            throw error;
        }

        return data || [];
    },

    // Search tags for autocomplete
    async searchTags(query) {
        if (!query || query.trim().length === 0) {
            return this.getTags();
        }

        const { data, error } = await supabase
            .from('opportunity_tags')
            .select('*')
            .ilike('name', `%${query}%`)
            .order('name', { ascending: true })
            .limit(10);

        if (error) {
            console.error('Erro ao buscar tags:', error);
            throw error;
        }

        return data || [];
    },

    // Create a new tag
    async createTag(name) {
        const normalizedName = name.trim();

        // Check if tag already exists
        const { data: existing } = await supabase
            .from('opportunity_tags')
            .select('id')
            .ilike('name', normalizedName)
            .single();

        if (existing) {
            return existing;
        }

        const { data, error } = await supabase
            .from('opportunity_tags')
            .insert([{ name: normalizedName }])
            .select()
            .single();

        if (error) {
            console.error('Erro ao criar tag:', error);
            throw error;
        }

        return data;
    },

    // Get tags for a specific opportunity
    async getTagsByOpportunity(opportunityId) {
        const { data, error } = await supabase
            .from('opportunity_tag_assignments')
            .select(`
                id,
                tag:opportunity_tags (
                    id,
                    name
                )
            `)
            .eq('opportunity_id', opportunityId);

        if (error) {
            console.error('Erro ao buscar tags da oportunidade:', error);
            throw error;
        }

        return (data || []).map(assignment => assignment.tag);
    },

    // Assign tags to an opportunity (replaces existing assignments)
    async assignTags(opportunityId, tagIds) {
        // First, remove all existing assignments
        await supabase
            .from('opportunity_tag_assignments')
            .delete()
            .eq('opportunity_id', opportunityId);

        if (!tagIds || tagIds.length === 0) {
            return [];
        }

        // Create new assignments
        const assignments = tagIds.map(tagId => ({
            opportunity_id: opportunityId,
            tag_id: tagId
        }));

        const { data, error } = await supabase
            .from('opportunity_tag_assignments')
            .insert(assignments)
            .select();

        if (error) {
            console.error('Erro ao atribuir tags:', error);
            throw error;
        }

        return data;
    },

    // Create or get tag by name, then assign to opportunity
    async assignTagsByName(opportunityId, tagNames) {
        if (!tagNames || tagNames.length === 0) {
            return this.assignTags(opportunityId, []);
        }

        const tagIds = [];
        for (const name of tagNames) {
            const tag = await this.createTag(name);
            tagIds.push(tag.id);
        }

        return this.assignTags(opportunityId, tagIds);
    }
};
