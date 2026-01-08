import { supabase } from './supabaseClient';
import { tagService } from './tagService';

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
                ),
                forecasts:opportunity_forecasts (
                    id,
                    period_start,
                    period_end,
                    estimated_value,
                    invoiced,
                    notes,
                    created_at
                ),
                tags:opportunity_tag_assignments (
                    id,
                    tag:opportunity_tags (
                        id,
                        name
                    )
                )
            `)
            .order('created_at', { ascending: false });

        // Apply filters if needed
        if (filters.stage) {
            query = query.eq('stage', filters.stage);
        }

        // Filter goals if specified (default: include all)
        if (filters.includeGoals === false) {
            query = query.eq('is_goal', false);
        } else if (filters.onlyGoals === true) {
            query = query.eq('is_goal', true);
        }

        const { data, error } = await query;
        if (error) {
            console.error('Erro ao buscar oportunidades:', error);
            throw error;
        }

        // Calculate totals for each opportunity and flatten tags
        return (data || []).map(opp => ({
            ...opp,
            total_value: (opp.forecasts || []).reduce((sum, f) => sum + parseFloat(f.estimated_value || 0), 0),
            forecast_count: (opp.forecasts || []).length,
            // For compatibility, get first forecast date and check if any forecast is invoiced
            forecast_date: opp.forecasts?.[0]?.period_start || null,
            estimated_value: (opp.forecasts || []).reduce((sum, f) => sum + parseFloat(f.estimated_value || 0), 0),
            invoiced: (opp.forecasts || []).every(f => f.invoiced),
            // Flatten tags array
            tagList: (opp.tags || []).map(t => t.tag).filter(Boolean)
        }));
    },

    // Get opportunities in flat mode (one row per forecast)
    async getOpportunitiesFlat(_userId, filters = {}) {
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
                ),
                forecasts:opportunity_forecasts (
                    id,
                    period_start,
                    period_end,
                    estimated_value,
                    invoiced,
                    notes,
                    created_at
                ),
                tags:opportunity_tag_assignments (
                    id,
                    tag:opportunity_tags (
                        id,
                        name
                    )
                ),
                notes:opportunity_notes (
                    id,
                    content,
                    created_by,
                    created_at
                ),
                actions:opportunity_actions (
                    id,
                    description,
                    responsible,
                    status,
                    created_at
                ),
                history:opportunity_history (
                    id,
                    field_changed,
                    old_value,
                    new_value,
                    changed_at
                )
            `)
            .order('created_at', { ascending: false });

        if (filters.stage) {
            query = query.eq('stage', filters.stage);
        }

        // Filter goals if specified (default: include all)
        if (filters.includeGoals === false) {
            query = query.eq('is_goal', false);
        } else if (filters.onlyGoals === true) {
            query = query.eq('is_goal', true);
        }

        const { data, error } = await query;
        if (error) {
            console.error('Erro ao buscar oportunidades:', error);
            throw error;
        }

        // Flatten: create one row per forecast
        const flattened = [];
        (data || []).forEach(opp => {
            const forecasts = opp.forecasts || [];
            const tagList = (opp.tags || []).map(t => t.tag).filter(Boolean);
            const notesList = opp.notes || [];
            const actionsList = opp.actions || [];
            const historyList = opp.history || [];

            if (forecasts.length === 0) {
                // Opportunity with no forecasts, still show it
                flattened.push({
                    ...opp,
                    forecast_id: null,
                    period_start: null,
                    period_end: null,
                    estimated_value: 0,
                    invoiced: false,
                    forecast_notes: null,
                    forecast_count: 0,
                    total_value: 0,
                    tagList,
                    notesList,
                    actionsList,
                    historyList
                });
            } else {
                forecasts.forEach(forecast => {
                    flattened.push({
                        ...opp,
                        forecast_id: forecast.id,
                        period_start: forecast.period_start,
                        period_end: forecast.period_end,
                        estimated_value: parseFloat(forecast.estimated_value),
                        invoiced: forecast.invoiced,
                        forecast_notes: forecast.notes,
                        forecast_count: forecasts.length,
                        total_value: forecasts.reduce((sum, f) => sum + parseFloat(f.estimated_value || 0), 0),
                        tagList,
                        notesList,
                        actionsList,
                        historyList
                    });
                });
            }
        });

        // Sort by period_start
        flattened.sort((a, b) => {
            if (!a.period_start) return 1;
            if (!b.period_start) return -1;
            return new Date(a.period_start) - new Date(b.period_start);
        });

        return flattened;
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
                ),
                forecasts:opportunity_forecasts (
                    id,
                    period_start,
                    period_end,
                    estimated_value,
                    invoiced,
                    notes,
                    created_at,
                    updated_at
                ),
                tags:opportunity_tag_assignments (
                    id,
                    tag:opportunity_tags (
                        id,
                        name
                    )
                )
            `)
            .eq('id', id)
            .single();

        if (error) {
            console.error('Erro ao buscar oportunidade:', error);
            throw error;
        }

        // Calculate totals and flatten tags
        return {
            ...data,
            total_value: (data.forecasts || []).reduce((sum, f) => sum + parseFloat(f.estimated_value || 0), 0),
            forecast_count: (data.forecasts || []).length,
            tagList: (data.tags || []).map(t => t.tag).filter(Boolean)
        };
    },

    async createOpportunity(_userId, opportunityData) {
        // Generate Opportunity Number
        const { count } = await supabase
            .from('opportunities')
            .select('*', { count: 'exact', head: true });

        const opportunityNumber = `OPP-${String(count + 1).padStart(7, '0')}`;

        // Separate forecasts and tags from opportunity data
        const { forecasts, tagNames, ...oppData } = opportunityData;

        // Create the opportunity first
        const { data: opportunity, error } = await supabase
            .from('opportunities')
            .insert([{
                ...oppData,
                opportunity_number: opportunityNumber
            }])
            .select()
            .single();

        if (error) throw error;

        // Create forecasts if provided
        if (forecasts && forecasts.length > 0) {
            const forecastsToInsert = forecasts.map(f => ({
                opportunity_id: opportunity.id,
                period_start: f.period_start,
                period_end: f.period_end,
                estimated_value: f.estimated_value,
                invoiced: f.invoiced || false,
                notes: f.notes || null
            }));

            const { error: forecastError } = await supabase
                .from('opportunity_forecasts')
                .insert(forecastsToInsert);

            if (forecastError) {
                console.error('Erro ao criar forecasts:', forecastError);
                // Don't throw, opportunity was created successfully
            }
        }

        // Assign tags if provided
        if (tagNames && tagNames.length > 0) {
            try {
                await tagService.assignTagsByName(opportunity.id, tagNames);
            } catch (tagError) {
                console.error('Erro ao atribuir tags:', tagError);
                // Don't throw, opportunity was created successfully
            }
        }

        return opportunity;
    },

    async updateOpportunity(id, opportunityData) {
        // Separate forecasts and tags from opportunity data
        const { forecasts, tagNames, tagList, tags, ...oppData } = opportunityData;

        // Update opportunity
        const { data: opportunity, error } = await supabase
            .from('opportunities')
            .update({ ...oppData, updated_at: new Date() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        // Update forecasts if provided
        if (forecasts !== undefined) {
            // Delete existing forecasts
            await supabase
                .from('opportunity_forecasts')
                .delete()
                .eq('opportunity_id', id);

            // Insert new forecasts
            if (forecasts && forecasts.length > 0) {
                const forecastsToInsert = forecasts.map(f => ({
                    opportunity_id: id,
                    period_start: f.period_start,
                    period_end: f.period_end,
                    estimated_value: f.estimated_value,
                    invoiced: f.invoiced || false,
                    notes: f.notes || null
                }));

                const { error: forecastError } = await supabase
                    .from('opportunity_forecasts')
                    .insert(forecastsToInsert);

                if (forecastError) {
                    console.error('Erro ao atualizar forecasts:', forecastError);
                }
            }
        }

        // Update tags if provided
        if (tagNames !== undefined) {
            try {
                await tagService.assignTagsByName(id, tagNames || []);
            } catch (tagError) {
                console.error('Erro ao atualizar tags:', tagError);
            }
        }

        return opportunity;
    },

    async deleteOpportunity(id) {
        // Forecasts will be deleted automatically via CASCADE
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
    },

    // Forecast-specific operations
    async createForecast(opportunityId, forecastData) {
        const { data, error } = await supabase
            .from('opportunity_forecasts')
            .insert([{
                opportunity_id: opportunityId,
                ...forecastData
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updateForecast(forecastId, forecastData) {
        const { data, error } = await supabase
            .from('opportunity_forecasts')
            .update({ ...forecastData, updated_at: new Date() })
            .eq('id', forecastId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deleteForecast(forecastId) {
        const { error } = await supabase
            .from('opportunity_forecasts')
            .delete()
            .eq('id', forecastId);

        if (error) throw error;
    },

    async updateForecastInvoiced(forecastId, invoiced) {
        const { data, error } = await supabase
            .from('opportunity_forecasts')
            .update({ invoiced, updated_at: new Date() })
            .eq('id', forecastId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }
};
