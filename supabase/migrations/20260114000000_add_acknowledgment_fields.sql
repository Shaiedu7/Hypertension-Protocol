-- Add acknowledgment fields to emergency_sessions table
ALTER TABLE emergency_sessions
ADD COLUMN acknowledged_at TIMESTAMPTZ,
ADD COLUMN acknowledged_by UUID REFERENCES auth.users(id);

-- Add index for querying acknowledged sessions
CREATE INDEX idx_emergency_sessions_acknowledged_at ON emergency_sessions(acknowledged_at);
