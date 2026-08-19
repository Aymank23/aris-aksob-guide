CREATE TABLE public.semester_archives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  archived_by uuid,
  archived_by_name text,
  case_count integer NOT NULL DEFAULT 0,
  student_count integer NOT NULL DEFAULT 0,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.semester_archives TO authenticated;
GRANT SELECT, INSERT ON public.semester_archives TO anon;
GRANT ALL ON public.semester_archives TO service_role;

ALTER TABLE public.semester_archives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to semester_archives" ON public.semester_archives
FOR ALL USING (true) WITH CHECK (true);

UPDATE public.risk_cases SET campus = 'Not Specified' WHERE campus IS NULL OR btrim(campus) = '';
UPDATE public.students SET campus = 'Not Specified' WHERE campus IS NULL OR btrim(campus) = '';

ALTER TABLE public.risk_cases ALTER COLUMN campus SET DEFAULT 'Not Specified';
ALTER TABLE public.students ALTER COLUMN campus SET DEFAULT 'Not Specified';