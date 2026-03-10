
-- Create students table for full student population
CREATE TABLE public.students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id text NOT NULL UNIQUE,
  student_name text NOT NULL,
  department text NOT NULL,
  campus text NOT NULL DEFAULT '',
  major text,
  cgpa numeric,
  credits_completed integer,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- Allow all access (matching existing pattern)
CREATE POLICY "Allow all access to students"
  ON public.students
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Add campus column to risk_cases
ALTER TABLE public.risk_cases ADD COLUMN IF NOT EXISTS campus text DEFAULT '';
