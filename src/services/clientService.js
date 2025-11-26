import { supabase } from './supabaseClient';

export const clientService = {
    // Get all clients (companies) with their contacts
    async getClients(_userId, includeDeleted = false) {
        let query = supabase
            .from('clients')
            .select(`
                *,
                contacts:client_contacts (
                    id,
                    name,
                    email,
                    phone,
                    position,
                    is_primary
                )
            `)
            .order('name', { ascending: true });

        if (!includeDeleted) {
            query = query.eq('is_deleted', false);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    },

    // Get single client with contacts
    async getClient(id) {
        const { data, error } = await supabase
            .from('clients')
            .select(`
                *,
                contacts:client_contacts (
                    id,
                    name,
                    email,
                    phone,
                    position,
                    is_primary
                )
            `)
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    },

    // Search clients by name (global search)
    async searchClients(_userId, searchTerm) {
        const { data, error } = await supabase
            .from('clients')
            .select(`
                id,
                name,
                document,
                contacts:client_contacts (
                    id,
                    name,
                    email,
                    phone,
                    is_primary
                )
            `)
            .eq('is_deleted', false)
            .ilike('name', `%${searchTerm}%`)
            .order('name', { ascending: true })
            .limit(10);

        if (error) throw error;
        return data || [];
    },

    // Create new client (company)
    async createClient(_userId, clientData) {
        const { data, error } = await supabase
            .from('clients')
            .insert([{
                ...clientData,
                is_deleted: false
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // Update client
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

    // Delete client (physical or logical)
    async deleteClient(id) {
        // Check if client has opportunities
        const { data: opportunities } = await supabase
            .from('opportunities')
            .select('id')
            .eq('client_id', id)
            .limit(1);

        if (opportunities && opportunities.length > 0) {
            // Logical delete - has opportunities
            const { error } = await supabase
                .from('clients')
                .update({ is_deleted: true, updated_at: new Date() })
                .eq('id', id);

            if (error) throw error;
            return { deleted: 'logical' };
        } else {
            // Physical delete - no opportunities
            const { error } = await supabase
                .from('clients')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return { deleted: 'physical' };
        }
    },

    // Restore logically deleted client
    async restoreClient(id) {
        const { data, error } = await supabase
            .from('clients')
            .update({ is_deleted: false, updated_at: new Date() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // ==================== CLIENT CONTACTS ====================

    // Get contacts for a client
    async getClientContacts(clientId) {
        const { data, error } = await supabase
            .from('client_contacts')
            .select('*')
            .eq('client_id', clientId)
            .order('is_primary', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    // Create new contact
    async createContact(clientId, contactData) {
        // If this is set as primary, unset other primary contacts
        if (contactData.is_primary) {
            await supabase
                .from('client_contacts')
                .update({ is_primary: false })
                .eq('client_id', clientId);
        }

        const { data, error } = await supabase
            .from('client_contacts')
            .insert([{ ...contactData, client_id: clientId }])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // Update contact
    async updateContact(id, contactData) {
        // If setting as primary, unset other primary contacts
        if (contactData.is_primary) {
            // Get the client_id first
            const { data: contact } = await supabase
                .from('client_contacts')
                .select('client_id')
                .eq('id', id)
                .single();

            if (contact) {
                await supabase
                    .from('client_contacts')
                    .update({ is_primary: false })
                    .eq('client_id', contact.client_id)
                    .neq('id', id);
            }
        }

        const { data, error } = await supabase
            .from('client_contacts')
            .update({ ...contactData, updated_at: new Date() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // Delete contact
    async deleteContact(id) {
        const { error } = await supabase
            .from('client_contacts')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // Set contact as primary
    async setPrimaryContact(contactId, clientId) {
        // Unset all primary contacts for this client
        await supabase
            .from('client_contacts')
            .update({ is_primary: false })
            .eq('client_id', clientId);

        // Set this contact as primary
        const { data, error } = await supabase
            .from('client_contacts')
            .update({ is_primary: true, updated_at: new Date() })
            .eq('id', contactId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }
};
