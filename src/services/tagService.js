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

    // Update an existing tag
    async updateTag(tagId, newName) {
        const normalizedName = newName.trim();

        // Check if another tag with this name exists
        const { data: existing } = await supabase
            .from('opportunity_tags')
            .select('id')
            .ilike('name', normalizedName)
            .neq('id', tagId)
            .single();

        if (existing) {
            throw new Error('Já existe uma tag com este nome.');
        }

        const { data, error } = await supabase
            .from('opportunity_tags')
            .update({ name: normalizedName })
            .eq('id', tagId)
            .select()
            .single();

        if (error) {
            console.error('Erro ao atualizar tag:', error);
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
    },

    // Delete a tag (if not in use)
    async deleteTag(tagId) {
        // Check if tag is assigned to any opportunity
        const { count, error: countError } = await supabase
            .from('opportunity_tag_assignments')
            .select('*', { count: 'exact', head: true })
            .eq('tag_id', tagId);

        if (countError) {
            console.error('Erro ao verificar uso da tag:', countError);
            throw countError;
        }

        if (count > 0) {
            throw new Error(`Esta tag não pode ser excluída pois está vinculada a ${count} oportunidade(s).`);
        }

        // Delete the tag
        const { error } = await supabase
            .from('opportunity_tags')
            .delete()
            .eq('id', tagId);

        if (error) {
            console.error('Erro ao excluir tag:', error);
            throw error;
        }

        return true;
    }
};
