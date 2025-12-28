-- Migration: Add missing fields to medications and timers tables
-- Date: 2023-12-26
-- Purpose: Add medication_name, route to medications table and completed_at, expired_at, created_at to timers table

-- Add missing fields to medications table if they don't exist
DO $$ 
BEGIN
  -- Add medication_name column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'medications' AND column_name = 'medication_name'
  ) THEN
    ALTER TABLE medications ADD COLUMN medication_name TEXT NOT NULL DEFAULT 'Unknown';
    -- Remove default after adding
    ALTER TABLE medications ALTER COLUMN medication_name DROP DEFAULT;
  END IF;

  -- Add route column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'medications' AND column_name = 'route'
  ) THEN
    ALTER TABLE medications ADD COLUMN route TEXT NOT NULL DEFAULT 'IV' CHECK (route IN ('IV', 'PO'));
    -- Remove default after adding
    ALTER TABLE medications ALTER COLUMN route DROP DEFAULT;
  END IF;
END $$;

-- Add missing fields to timers table if they don't exist
DO $$ 
BEGIN
  -- Rename type to timer_type if it exists as 'type'
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'timers' AND column_name = 'type'
  ) THEN
    ALTER TABLE timers RENAME COLUMN type TO timer_type;
  END IF;

  -- Update timer_type CHECK constraint to include administration_deadline
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'timers' AND column_name = 'timer_type'
  ) THEN
    -- Drop old constraint
    ALTER TABLE timers DROP CONSTRAINT IF EXISTS timers_timer_type_check;
    ALTER TABLE timers DROP CONSTRAINT IF EXISTS timers_type_check;
    -- Add new constraint
    ALTER TABLE timers ADD CONSTRAINT timers_timer_type_check 
      CHECK (timer_type IN ('bp_recheck', 'medication_wait', 'administration_deadline'));
  END IF;

  -- Add completed_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'timers' AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE timers ADD COLUMN completed_at TIMESTAMPTZ;
  END IF;

  -- Add expired_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'timers' AND column_name = 'expired_at'
  ) THEN
    ALTER TABLE timers ADD COLUMN expired_at TIMESTAMPTZ;
  END IF;

  -- Add created_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'timers' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE timers ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Update any existing medications without medication_name to extract from algorithm
UPDATE medications 
SET medication_name = CASE 
  WHEN algorithm = 'labetalol' THEN 'Labetalol'
  WHEN algorithm = 'hydralazine' THEN 'Hydralazine'
  WHEN algorithm = 'nifedipine' THEN 'Nifedipine'
  ELSE 'Unknown'
END
WHERE medication_name IS NULL OR medication_name = 'Unknown';

-- Update any existing medications without route to default based on algorithm
UPDATE medications 
SET route = CASE 
  WHEN algorithm IN ('labetalol', 'hydralazine') THEN 'IV'
  WHEN algorithm = 'nifedipine' THEN 'PO'
  ELSE 'IV'
END
WHERE route IS NULL OR route = 'IV';
