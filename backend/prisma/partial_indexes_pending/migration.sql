-- ---------------------------------------------------------------------------
-- Partial (filtered) unique indexes.
--
-- Prisma's schema language has no syntax for a WHERE clause on an index, so the
-- invariants below cannot be expressed in schema.prisma. They are enforced here
-- instead. Run this migration AFTER the initial schema migration.
--
-- Without this file the four invariants below are unenforced at the database
-- level, and the application is the only thing standing between you and two
-- execs holding the same plot.
-- ---------------------------------------------------------------------------

-- §7.6 — at most ONE active hold per unit.
-- A unit may accumulate many historical holds (released, expired, converted);
-- only ACTIVE and EXTENDED occupy the slot.
CREATE UNIQUE INDEX "holds_one_active_per_unit"
  ON "holds" ("unit_id")
  WHERE "status" IN ('ACTIVE', 'EXTENDED');

-- §10.4 — at most ONE live token per unit, for the same reason.
CREATE UNIQUE INDEX "tokens_one_live_per_unit"
  ON "tokens" ("unit_id")
  WHERE "status" = 'RECEIVED';

-- §22 — Lead.phone is unique per company among non-merged, non-deleted leads.
-- The merge loser (merged_into_id IS NOT NULL) becomes an alias and stops
-- competing for the number. Soft-deleted rows are excluded, otherwise a deleted
-- lead would permanently block its own phone number from being re-entered.
CREATE UNIQUE INDEX "leads_phone_unique_per_company"
  ON "leads" ("company_id", "phone")
  WHERE "merged_into_id" IS NULL AND "deleted_at" IS NULL;

-- §23 — unit_code is unique per company, but only among live rows. Same
-- soft-delete reasoning as above.
CREATE UNIQUE INDEX "units_code_unique_per_company"
  ON "units" ("company_id", "unit_code")
  WHERE "deleted_at" IS NULL;

-- ---------------------------------------------------------------------------
-- Supporting indexes for the hot paths named in §25 (lists < 500ms P95 at 100k
-- leads). These could live in schema.prisma but are kept here so the whole
-- performance story sits in one file.
-- ---------------------------------------------------------------------------

-- My Day: overdue and due-today follow-ups for one exec.
CREATE INDEX "tasks_open_by_assignee_due"
  ON "tasks" ("assignee_id", "due_at")
  WHERE "status" = 'OPEN' AND "deleted_at" IS NULL;

-- Collections: the due and overdue list, bucketed by age.
CREATE INDEX "demands_outstanding_by_due"
  ON "demands" ("company_id", "due_date")
  WHERE "status" IN ('DUE', 'OVERDUE', 'PARTIAL') AND "deleted_at" IS NULL;

-- The hold-expiry job scans this every minute.
CREATE INDEX "holds_active_expiry"
  ON "holds" ("expires_at")
  WHERE "status" IN ('ACTIVE', 'EXTENDED');

-- Approvals inbox.
CREATE INDEX "approvals_pending_by_approver"
  ON "approval_requests" ("approver_id", "sla_due_at")
  WHERE "status" = 'PENDING';
