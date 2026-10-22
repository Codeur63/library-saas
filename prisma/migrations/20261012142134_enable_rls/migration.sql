-- Enable Row Level Security on all application tables

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

CREATE SCHEMA IF NOT EXISTS private;

REVOKE ALL ON SCHEMA private FROM PUBLIC;

GRANT USAGE ON SCHEMA private TO authenticated;


CREATE OR REPLACE FUNCTION private.is_active_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND status::text = 'ACTIVE'
    );
$$;


CREATE OR REPLACE FUNCTION private.can_use_library()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND status::text = 'ACTIVE'
          AND must_change_password = false
    );
$$;


CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND status::text = 'ACTIVE'
          AND must_change_password = false
          AND role::text IN ('ADMIN', 'SUPERADMIN')
    );
$$;

CREATE POLICY "user_read_own_profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (
    id = auth.uid()
);


CREATE POLICY "admin_read_profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
    private.is_admin()
);

CREATE POLICY "read_faculties"
ON public.faculties
FOR SELECT
TO authenticated
USING (
    private.can_use_library()
);


CREATE POLICY "read_programs"
ON public.programs
FOR SELECT
TO authenticated
USING (
    private.can_use_library()
);


CREATE POLICY "read_program_options"
ON public.program_options
FOR SELECT
TO authenticated
USING (
    private.can_use_library()
);


CREATE POLICY "read_levels"
ON public.academic_levels
FOR SELECT
TO authenticated
USING (
    private.can_use_library()
);


CREATE POLICY "read_subjects"
ON public.subjects
FOR SELECT
TO authenticated
USING (
    private.can_use_library()
);


CREATE POLICY "read_academic_years"
ON public.academic_years
FOR SELECT
TO authenticated
USING (
    private.can_use_library()
);


CREATE POLICY "read_document_categories"
ON public.document_categories
FOR SELECT
TO authenticated
USING (
    private.can_use_library()
);