-- Applied via MCP Supabase
-- Add INSERT policy for patients table

CREATE POLICY patients_insert_authenticated ON patients
  FOR INSERT TO authenticated
  WITH CHECK (true);
