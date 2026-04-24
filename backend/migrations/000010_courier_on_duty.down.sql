DROP INDEX IF EXISTS idx_employees_on_duty_role;

ALTER TABLE employees
    DROP COLUMN IF EXISTS on_duty_changed_at,
    DROP COLUMN IF EXISTS on_duty;
