import { supabase } from './supabaseClient';
import { tagService } from './tagService';

const OPPORTUNITY_NUMBER_PREFIX = 'OPP-'
const OPPORTUNITY_NUMBER_PADDING = 7
const OPPORTUNITY_NUMBER_MAX_ATTEMPTS = 100
const OPPORTUNITY_NUMBER_PAGE_SIZE = 1000

// Arquivada = fora de forecast, painel, relatórios e ações; desarquivar devolve tudo como estava
export const isArchivedOpportunity = (opp) => Boolean(opp?.custom_data?.archived_at)

const withoutArchived = (rows, filters) =>
    filters.includeArchived ? (rows || []) : (rows || []).filter(opp => !isArchivedOpportunity(opp))

const formatOpportunityNumber = (sequence) =>
    `${OPPORTUNITY_NUMBER_PREFIX}${String(sequence).padStart(OPPORTUNITY_NUMBER_PADDING, '0')}`

const parseOpportunitySequence = (opportunityNumber) => {
    const match = /^OPP-(\d+)$/.exec(opportunityNumber || '')

    if (!match) {
        return null
    }

    return Number.parseInt(match[1], 10)
}

const isOpportunityNumberDuplicateError = (error) => {
    const errorText = [error?.message, error?.details, error?.hint]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

    const isUniqueViolation = error?.code === '23505' || errorText.includes('duplicate key value')

    return isUniqueViolation && (
        errorText.includes('opportunity_number') ||
        errorText.includes('fcst_opportunities_opportunity_number_key')
    )
}

const getUsedOpportunitySequences = async () => {
    const usedSequences = new Set()
    let from = 0

    while (true) {
        const to = from + OPPORTUNITY_NUMBER_PAGE_SIZE - 1
        const { data, error } = await supabase
            .from('fcst_opportunities')
            .select('opportunity_number')
            .like('opportunity_number', `${OPPORTUNITY_NUMBER_PREFIX}%`)
            .order('opportunity_number', { ascending: true })
            .range(from, to)

        if (error) {
            throw error
        }

        const page = data || []

        page.forEach(({ opportunity_number }) => {
            const sequence = parseOpportunitySequence(opportunity_number)

            if (Number.isInteger(sequence) && sequence > 0) {
                usedSequences.add(sequence)
            }
        })

        if (page.length < OPPORTUNITY_NUMBER_PAGE_SIZE) {
            break
        }

        from += OPPORTUNITY_NUMBER_PAGE_SIZE
    }

    return usedSequences
}

const getNextAvailableOpportunitySequence = async (minSequence = 1) => {
    const usedSequences = await getUsedOpportunitySequences()

    let nextSequence = Math.max(1, minSequence)

    while (usedSequences.has(nextSequence)) {
        nextSequence += 1
    }

    return nextSequence
}

export const opportunityService = {
    async getOpportunities(_userId, filters = {}) {
        let query = supabase
            .from('fcst_opportunities')
            .select(`
                *,
                client:fcst_clients (
                    id,
                    name,
                    nickname,
                    document,
                    contacts:fcst_client_contacts (
                        id,
                        name,
                        email,
                        phone,
                        position,
                        is_primary
                    )
                ),
                forecasts:fcst_opportunity_forecasts (
                    id,
                    period_start,
                    period_end,
                    estimated_value,
                    invoiced,
                    notes,
                    created_at
                ),
                tags:fcst_opportunity_tag_assignments (
                    id,
                    tag:fcst_opportunity_tags (
                        id,
                        name
                    )
                )
            `)
            .order('display_priority', { ascending: false })
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
        return withoutArchived(data, filters).map(opp => ({
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
            .from('fcst_opportunities')
            .select(`
                *,
                client:fcst_clients (
                    id,
                    name,
                    nickname,
                    document,
                    contacts:fcst_client_contacts (
                        id,
                        name,
                        email,
                        phone,
                        position,
                        is_primary
                    )
                ),
                forecasts:fcst_opportunity_forecasts (
                    id,
                    period_start,
                    period_end,
                    estimated_value,
                    invoiced,
                    notes,
                    created_at
                ),
                tags:fcst_opportunity_tag_assignments (
                    id,
                    tag:fcst_opportunity_tags (
                        id,
                        name
                    )
                ),
                notes:fcst_opportunity_notes (
                    id,
                    content,
                    created_by,
                    created_at
                ),
                actions:fcst_opportunity_actions (
                    id,
                    description,
                    responsible,
                    due_date,
                    status,
                    created_at
                ),
                history:fcst_opportunity_history (
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
        withoutArchived(data, filters).forEach(opp => {
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

        // Sort by period_end (data final do período)
        flattened.sort((a, b) => {
            if (!a.period_end && !a.period_start) return 1;
            if (!b.period_end && !b.period_start) return -1;
            return new Date(a.period_end || a.period_start) - new Date(b.period_end || b.period_start);
        });

        return flattened;
    },

    async getOpportunity(id) {
        const { data, error } = await supabase
            .from('fcst_opportunities')
            .select(`
                *,
                client:fcst_clients (
                    id,
                    name,
                    nickname,
                    document,
                    contacts:fcst_client_contacts (
                        id,
                        name,
                        email,
                        phone,
                        position,
                        is_primary
                    )
                ),
                forecasts:fcst_opportunity_forecasts (
                    id,
                    period_start,
                    period_end,
                    estimated_value,
                    invoiced,
                    notes,
                    created_at,
                    updated_at
                ),
                tags:fcst_opportunity_tag_assignments (
                    id,
                    tag:fcst_opportunity_tags (
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
        // Separate forecasts and tags from opportunity data
        const { forecasts, tagNames, ...oppData } = opportunityData;

        let nextSequence = await getNextAvailableOpportunitySequence()
        let opportunity = null
        let lastDuplicateError = null

        for (let attempt = 0; attempt < OPPORTUNITY_NUMBER_MAX_ATTEMPTS; attempt += 1) {
            const { data, error } = await supabase
                .from('fcst_opportunities')
                .insert([{
                    ...oppData,
                    opportunity_number: formatOpportunityNumber(nextSequence)
                }])
                .select()
                .single()

            if (!error) {
                opportunity = data
                break
            }

            if (!isOpportunityNumberDuplicateError(error)) {
                throw error
            }

            lastDuplicateError = error
            nextSequence = await getNextAvailableOpportunitySequence(nextSequence + 1)
        }

        if (!opportunity) {
            throw lastDuplicateError || new Error('Nao foi possivel gerar um numero de oportunidade disponivel.')
        }

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
                .from('fcst_opportunity_forecasts')
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
            .from('fcst_opportunities')
            .update({ ...oppData, updated_at: new Date() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        // Update forecasts if provided
        if (forecasts !== undefined) {
            // Delete existing forecasts
            await supabase
                .from('fcst_opportunity_forecasts')
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
                    .from('fcst_opportunity_forecasts')
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

    // Arquivamento: guardado em custom_data.archived_at (sem alteração de schema)
    async setArchived(id, archived) {
        const { data: current, error: readError } = await supabase
            .from('fcst_opportunities')
            .select('custom_data')
            .eq('id', id)
            .single();

        if (readError) throw readError;

        const { archived_at: _previous, ...rest } = current?.custom_data || {};
        const custom_data = archived ? { ...rest, archived_at: new Date().toISOString() } : rest;

        const { error } = await supabase
            .from('fcst_opportunities')
            .update({ custom_data })
            .eq('id', id);

        if (error) throw error;
        return custom_data;
    },

    // Empresas responsáveis já usadas (custom_data.company)
    async getCompanies() {
        const { data, error } = await supabase
            .from('fcst_opportunities')
            .select('custom_data');

        if (error) throw error;

        const counts = new Map();
        (data || []).forEach(row => {
            const name = row.custom_data?.company?.trim();
            if (name) counts.set(name, (counts.get(name) || 0) + 1);
        });
        return [...counts.entries()]
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    },

    // Remove uma empresa digitada errada de todas as oportunidades que a usam
    async removeCompany(name) {
        const { data, error } = await supabase
            .from('fcst_opportunities')
            .select('id, custom_data')
            .eq('custom_data->>company', name);

        if (error) throw error;

        for (const row of data || []) {
            const { company: _removed, ...rest } = row.custom_data || {};
            const { error: updateError } = await supabase
                .from('fcst_opportunities')
                .update({ custom_data: rest })
                .eq('id', row.id);
            if (updateError) throw updateError;
        }
        return (data || []).length;
    },

    async deleteOpportunity(id) {
        // Forecasts will be deleted automatically via CASCADE
        const { error } = await supabase
            .from('fcst_opportunities')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    async updateStage(id, stage) {
        const { data, error } = await supabase
            .from('fcst_opportunities')
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
            .from('fcst_opportunity_forecasts')
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
            .from('fcst_opportunity_forecasts')
            .update({ ...forecastData, updated_at: new Date() })
            .eq('id', forecastId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deleteForecast(forecastId) {
        const { error } = await supabase
            .from('fcst_opportunity_forecasts')
            .delete()
            .eq('id', forecastId);

        if (error) throw error;
    },

    async updateForecastInvoiced(forecastId, invoiced) {
        const { data, error } = await supabase
            .from('fcst_opportunity_forecasts')
            .update({ invoiced, updated_at: new Date() })
            .eq('id', forecastId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // Update display priorities for multiple opportunities
    async updateDisplayPriorities(updates) {
        const errors = [];
        for (const { id, display_priority } of updates) {
            const { error } = await supabase
                .from('fcst_opportunities')
                .update({ display_priority, updated_at: new Date().toISOString() })
                .eq('id', id);
            if (error) errors.push(error);
        }
        if (errors.length > 0) {
            console.error('Errors updating display priorities:', errors);
            throw errors[0];
        }
    }
};
