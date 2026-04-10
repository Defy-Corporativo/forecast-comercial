import { supabase } from './supabaseClient';

export const chartService = {
    async getCharts(userId) {
        // Fetch charts created by the user OR charts that are public
        const { data, error } = await supabase
            .from('fcst_custom_charts')
            .select('*')
            .or(`created_by.eq.${userId},is_public.eq.true`)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching charts:', error);
            throw error;
        }

        // Map DB rows to the format expected by the frontend
        return data.map(row => ({
            ...row.config,
            id: row.id,
            is_public: row.is_public,
            created_by: row.created_by,
            title: row.title // Ensure title is available at top level if needed, though it's likely in config too
        }));
    },

    async createChart(chartData) {
        const { data, error } = await supabase
            .from('fcst_custom_charts')
            .insert([{
                title: chartData.title,
                config: chartData, // Store the whole config object in the jsonb column
                created_by: chartData.created_by,
                is_public: chartData.is_public || false
            }])
            .select()
            .single();

        if (error) throw error;

        return {
            ...data.config,
            id: data.id,
            is_public: data.is_public,
            created_by: data.created_by,
            title: data.title
        };
    },

    async deleteChart(id) {
        const { error } = await supabase
            .from('fcst_custom_charts')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};
