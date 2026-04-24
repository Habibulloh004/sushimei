ALTER TABLE employees
    ADD COLUMN IF NOT EXISTS on_duty BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS on_duty_changed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_employees_on_duty_role
    ON employees(role_code, on_duty)
    WHERE deleted_at IS NULL AND is_active = TRUE;
