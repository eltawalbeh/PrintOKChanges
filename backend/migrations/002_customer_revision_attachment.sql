-- Customer feedback attachment is a private reference, NOT a production artwork version.
ALTER TABLE printok_versions ADD COLUMN IF NOT EXISTS revision_file_key text;
ALTER TABLE printok_versions ADD COLUMN IF NOT EXISTS revision_file_name text;
ALTER TABLE printok_versions ADD COLUMN IF NOT EXISTS revision_file_type text;
ALTER TABLE printok_versions ADD COLUMN IF NOT EXISTS revision_file_size bigint;
ALTER TABLE printok_versions ADD CONSTRAINT printok_revision_size_check CHECK (revision_file_size IS NULL OR revision_file_size BETWEEN 1 AND 20971520);
