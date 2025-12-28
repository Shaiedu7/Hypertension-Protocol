-- Applied via MCP Supabase
-- Add RLS policies for emergency_sessions table

CREATE POLICY emergency_sessions_insert_authenticated ON emergency_sessions
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY emergency_sessions_select_authenticated ON emergency_sessions
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY emergency_sessions_update_authenticated ON emergency_sessions
  FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY emergency_sessions_delete_authenticated ON emergency_sessions
  FOR DELETE TO authenticated
  USING (true);
