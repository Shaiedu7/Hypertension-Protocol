-- Allow residents and charge nurses to insert BP readings
-- They work together at bedside and either may record the BP

DROP POLICY IF EXISTS bp_insert_nurse ON bp_readings;

CREATE POLICY bp_insert_clinical_staff ON bp_readings FOR INSERT TO authenticated 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('nurse', 'resident', 'chargeNurse')
    )
  );
