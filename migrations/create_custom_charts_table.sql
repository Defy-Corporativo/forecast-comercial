-- Create custom_charts table
CREATE TABLE IF NOT EXISTS custom_charts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by text NOT NULL, -- Storing user ID as text to match profiles.id
  is_public boolean DEFAULT false,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add comment
COMMENT ON TABLE custom_charts IS 'Stores custom dashboard charts configuration';
