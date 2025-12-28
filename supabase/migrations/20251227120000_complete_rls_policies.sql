-- Complete RLS Policies Audit and Missing Policies
-- Generated: 2025-12-27
-- This migration adds all missing CRUD policies for tables

-- ============================================================================
-- USERS TABLE
-- ============================================================================
-- Current: Only SELECT own profile
-- Needed: UPDATE own profile, SELECT all users (for role checks)

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'users_select_all_authenticated'
  ) THEN
    CREATE POLICY users_select_all_authenticated ON users
      FOR SELECT TO authenticated
      USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'users_update_own'
  ) THEN
    CREATE POLICY users_update_own ON users
      FOR UPDATE TO authenticated
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- ============================================================================
-- PATIENTS TABLE  
-- ============================================================================
-- Current: SELECT, INSERT, DELETE (all authenticated)
-- UPDATE policy already exists from previous migration

-- ============================================================================
-- BP_READINGS TABLE
-- ============================================================================
-- Current: INSERT (nurses only), SELECT (all authenticated)
-- Needed: UPDATE, DELETE (for corrections/cleanup)

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'bp_readings' AND policyname = 'bp_readings_update_authenticated'
  ) THEN
    CREATE POLICY bp_readings_update_authenticated ON bp_readings
      FOR UPDATE TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'bp_readings' AND policyname = 'bp_readings_delete_authenticated'
  ) THEN
    CREATE POLICY bp_readings_delete_authenticated ON bp_readings
      FOR DELETE TO authenticated
      USING (true);
  END IF;
END $$;

-- ============================================================================
-- MEDICATIONS TABLE
-- ============================================================================
-- Current: NONE (completely missing!)
-- Needed: Full CRUD for residents (order) and nurses (administer)

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'medications' AND policyname = 'medications_insert_authenticated'
  ) THEN
    CREATE POLICY medications_insert_authenticated ON medications
      FOR INSERT TO authenticated
      WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'medications' AND policyname = 'medications_select_authenticated'
  ) THEN
    CREATE POLICY medications_select_authenticated ON medications
      FOR SELECT TO authenticated
      USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'medications' AND policyname = 'medications_update_authenticated'
  ) THEN
    CREATE POLICY medications_update_authenticated ON medications
      FOR UPDATE TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'medications' AND policyname = 'medications_delete_authenticated'
  ) THEN
    CREATE POLICY medications_delete_authenticated ON medications
      FOR DELETE TO authenticated
      USING (true);
  END IF;
END $$;

-- ============================================================================
-- AUDIT_LOGS TABLE
-- ============================================================================
-- Current: NONE (completely missing!)
-- Needed: INSERT (create logs), SELECT (view logs)

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'audit_logs' AND policyname = 'audit_logs_insert_authenticated'
  ) THEN
    CREATE POLICY audit_logs_insert_authenticated ON audit_logs
      FOR INSERT TO authenticated
      WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'audit_logs' AND policyname = 'audit_logs_select_authenticated'
  ) THEN
    CREATE POLICY audit_logs_select_authenticated ON audit_logs
      FOR SELECT TO authenticated
      USING (true);
  END IF;
END $$;

-- Note: No UPDATE/DELETE for audit logs (immutable for compliance)

-- ============================================================================
-- SCHEMA CORRECTIONS
-- ============================================================================
-- Fix timer column name and remove unused columns

-- Rename timer_type to type (if it exists)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'timers' AND column_name = 'timer_type'
  ) THEN
    ALTER TABLE timers RENAME COLUMN timer_type TO type;
  END IF;
END $$;

-- Remove columns that don't exist in code model
ALTER TABLE timers DROP COLUMN IF EXISTS completed_at;
ALTER TABLE timers DROP COLUMN IF EXISTS expired_at;
ALTER TABLE timers DROP COLUMN IF EXISTS created_at;

-- ============================================================================
-- POLICY SUMMARY
-- ============================================================================
-- 
-- ✅ users: SELECT (all + own), UPDATE (own)
-- ✅ patients: Full CRUD (all authenticated)
-- ✅ emergency_sessions: Full CRUD (all authenticated)
-- ✅ bp_readings: Full CRUD (all authenticated)
-- ✅ medications: Full CRUD (all authenticated)
-- ✅ timers: Full CRUD (all authenticated)
-- ✅ notifications: Full CRUD (all authenticated)
-- ✅ audit_logs: INSERT + SELECT only (immutable)
--
-- All policies use authenticated role - role-specific enforcement happens
-- in application layer for flexibility and easier maintenance.
