-- Applied via MCP Supabase
-- Add CASCADE DELETE to foreign key constraints

ALTER TABLE bp_readings 
  DROP CONSTRAINT IF EXISTS bp_readings_patient_id_fkey,
  ADD CONSTRAINT bp_readings_patient_id_fkey 
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;

ALTER TABLE emergency_sessions 
  DROP CONSTRAINT IF EXISTS emergency_sessions_patient_id_fkey,
  ADD CONSTRAINT emergency_sessions_patient_id_fkey 
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;

ALTER TABLE medications 
  DROP CONSTRAINT IF EXISTS medications_patient_id_fkey,
  ADD CONSTRAINT medications_patient_id_fkey 
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;

ALTER TABLE timers 
  DROP CONSTRAINT IF EXISTS timers_patient_id_fkey,
  ADD CONSTRAINT timers_patient_id_fkey 
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;

ALTER TABLE notifications 
  DROP CONSTRAINT IF EXISTS notifications_patient_id_fkey,
  ADD CONSTRAINT notifications_patient_id_fkey 
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;

ALTER TABLE audit_logs 
  DROP CONSTRAINT IF EXISTS audit_logs_patient_id_fkey,
  ADD CONSTRAINT audit_logs_patient_id_fkey 
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;
