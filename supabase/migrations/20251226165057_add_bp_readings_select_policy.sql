-- Applied via MCP Supabase
-- Add SELECT policy for bp_readings table

CREATE POLICY bp_readings_select_authenticated ON bp_readings
  FOR SELECT TO authenticated
  USING (true);
