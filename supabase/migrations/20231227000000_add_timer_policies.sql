-- Migration: Add RLS policies for timers table
-- Purpose: Allow authenticated users (nurses, residents, etc.) to create and manage timers

-- Drop existing timer policies if any
DROP POLICY IF EXISTS timers_insert_authenticated ON timers;
DROP POLICY IF EXISTS timers_select_authenticated ON timers;
DROP POLICY IF EXISTS timers_update_authenticated ON timers;
DROP POLICY IF EXISTS timers_delete_authenticated ON timers;

-- Allow authenticated users to insert timers
CREATE POLICY timers_insert_authenticated ON timers 
  FOR INSERT TO authenticated 
  WITH CHECK (true);

-- Allow authenticated users to read timers
CREATE POLICY timers_select_authenticated ON timers 
  FOR SELECT TO authenticated 
  USING (true);

-- Allow authenticated users to update timers
CREATE POLICY timers_update_authenticated ON timers 
  FOR UPDATE TO authenticated 
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to delete timers
CREATE POLICY timers_delete_authenticated ON timers 
  FOR DELETE TO authenticated 
  USING (true);
