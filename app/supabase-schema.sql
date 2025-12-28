-- Database Schema for OB-Hypertension Emergency Response App
-- This file documents the required Supabase schema

-- Users table with role-based access
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('nurse', 'resident', 'attending', 'chargeNurse')),
  name TEXT NOT NULL,
  push_token TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Patients table (anonymous identifiers for HIPAA compliance)
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anonymous_identifier TEXT UNIQUE NOT NULL,
  room_number TEXT,
  has_asthma BOOLEAN DEFAULT false,
  current_emergency_session_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Emergency sessions
CREATE TABLE emergency_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) NOT NULL,
  initiated_at TIMESTAMPTZ DEFAULT NOW(),
  initiated_by UUID REFERENCES users(id) NOT NULL,
  algorithm_selected TEXT CHECK (algorithm_selected IN ('labetalol', 'hydralazine', 'nifedipine')),
  current_step INTEGER DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('active', 'resolved', 'escalated')),
  resolved_at TIMESTAMPTZ,
  escalated_at TIMESTAMPTZ
);

-- Blood pressure readings
CREATE TABLE bp_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) NOT NULL,
  systolic INTEGER NOT NULL,
  diastolic INTEGER NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  recorded_by UUID REFERENCES users(id) NOT NULL,
  is_positioned_correctly BOOLEAN DEFAULT false,
  notes TEXT
);

-- Medication doses
CREATE TABLE medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) NOT NULL,
  emergency_session_id UUID REFERENCES emergency_sessions(id),
  algorithm TEXT NOT NULL CHECK (algorithm IN ('labetalol', 'hydralazine', 'nifedipine')),
  dose_number INTEGER NOT NULL,
  dose_amount NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  ordered_by UUID REFERENCES users(id) NOT NULL,
  administered_by UUID REFERENCES users(id),
  ordered_at TIMESTAMPTZ DEFAULT NOW(),
  administered_at TIMESTAMPTZ,
  next_bp_check_at TIMESTAMPTZ
);

-- Timers for BP checks and medication waits
CREATE TABLE timers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('bp_recheck', 'medication_wait')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  duration_minutes INTEGER NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('info', 'warning', 'critical', 'stat')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  recipient_role TEXT CHECK (recipient_role IN ('nurse', 'resident', 'attending', 'chargeNurse')),
  recipient_user_id UUID REFERENCES users(id),
  patient_id UUID REFERENCES patients(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES users(id)
);

-- Audit logs for HIPAA compliance
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES users(id) NOT NULL,
  action_type TEXT NOT NULL,
  patient_id UUID REFERENCES patients(id),
  details JSONB
);

-- Row Level Security (RLS) Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bp_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE timers ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Example RLS policies (customize based on your needs)
-- Users can read their own profile
CREATE POLICY users_read_own ON users FOR SELECT USING (auth.uid() = id);

-- All authenticated users can read patient data (adjust as needed)
CREATE POLICY patients_read_authenticated ON patients FOR SELECT TO authenticated USING (true);

-- Nurses can insert BP readings
CREATE POLICY bp_insert_nurse ON bp_readings FOR INSERT TO authenticated 
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'nurse'));

-- Add more RLS policies based on role requirements...
