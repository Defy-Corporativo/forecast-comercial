-- Drop helper function if exists (legacy)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'handle_new_user'
  ) THEN
    DROP FUNCTION public.handle_new_user();
  END IF;
END;
$$;

-- Drop tables in dependency order
DO $$
BEGIN
  IF to_regclass('public.opportunity_notes') IS NOT NULL THEN
    DROP TABLE public.opportunity_notes CASCADE;
  END IF;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.opportunity_history') IS NOT NULL THEN
    DROP TABLE public.opportunity_history CASCADE;
  END IF;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.custom_charts') IS NOT NULL THEN
    DROP TABLE public.custom_charts CASCADE;
  END IF;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.opportunities') IS NOT NULL THEN
    DROP TABLE public.opportunities CASCADE;
  END IF;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.custom_fields') IS NOT NULL THEN
    DROP TABLE public.custom_fields CASCADE;
  END IF;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.client_contacts') IS NOT NULL THEN
    DROP TABLE public.client_contacts CASCADE;
  END IF;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.clients') IS NOT NULL THEN
    DROP TABLE public.clients CASCADE;
  END IF;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.companies') IS NOT NULL THEN
    DROP TABLE public.companies CASCADE;
  END IF;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.user_preferences') IS NOT NULL THEN
    DROP TABLE public.user_preferences CASCADE;
  END IF;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.stage_definitions') IS NOT NULL THEN
    DROP TABLE public.stage_definitions CASCADE;
  END IF;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    DROP TABLE public.profiles CASCADE;
  END IF;
END;
$$;