-- Applied via MCP Supabase
-- Add RLS policies for notifications table

CREATE POLICY notifications_insert_authenticated ON notifications
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY notifications_select_authenticated ON notifications
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY notifications_update_authenticated ON notifications
  FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY notifications_delete_authenticated ON notifications
  FOR DELETE TO authenticated
  USING (true);
