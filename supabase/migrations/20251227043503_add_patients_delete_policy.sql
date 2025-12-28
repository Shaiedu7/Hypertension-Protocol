-- Applied via MCP Supabase
-- Add DELETE policy for patients table

CREATE POLICY patients_delete_authenticated ON patients
  FOR DELETE TO authenticated
  USING (true);

-- Also add INSERT and UPDATE policies if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'patients' 
    AND policyname = 'patients_insert_authenticated'
  ) THEN
    CREATE POLICY patients_insert_authenticated ON patients
      FOR INSERT TO authenticated
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'patients' 
    AND policyname = 'patients_update_authenticated'
  ) THEN
    CREATE POLICY patients_update_authenticated ON patients
      FOR UPDATE TO authenticated
      USING (true);
  END IF;
END $$;
