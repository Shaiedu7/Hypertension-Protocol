-- Applied via MCP Supabase
-- Add RLS policies for timers table

CREATE POLICY timers_insert_authenticated ON timers
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY timers_select_authenticated ON timers
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY timers_update_authenticated ON timers
  FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY timers_delete_authenticated ON timers
  FOR DELETE TO authenticated
  USING (true);
