# EstateOS — backend

Prisma schema for the CRM described in `../uploads/realestate-crm-ux-spec.md` v1.0.

    prisma/
      schema.prisma                                 72 models, 71 enums
      migrations/00000000000000_partial_indexes/    filtered indexes Prisma cannot express

## Setup

```bash
npm init -y
npm i -D prisma
npm i @prisma/client
# DATABASE_URL="postgresql://user:pass@localhost:5432/estateos"
npx prisma validate
npx prisma migrate dev --name init
```

## Seed data

```bash
npm run seed        # admin user only (admin@estateos.local / Admin@12345)
npm run seed:demo   # full demo data set for testing — wipes and rebuilds company EST
```

`seed:demo` is idempotent. Currency is **INR only**: every amount is stored as
BigInt paise (₹1 = 100 paise) and `Company.settingsJson.currency` is `"INR"`.
Non-admin demo users log in with `Password@123`.

## Migration order matters

`migrate dev --name init` generates the tables. The `00000000000000_partial_indexes`
migration must run **after** it — rename its directory to a timestamp later than the
generated init migration if Prisma orders them wrongly.

Four invariants from spec §22 live only in that file, because Prisma's schema
language has no syntax for a `WHERE` clause on an index:

- one active hold per unit
- one live token per unit
- `Lead.phone` unique per company among non-merged, non-deleted leads
- `unit_code` unique per company among non-deleted units

Skip it and nothing at the database level stops two execs holding the same plot.

## Conventions

| Rule | Why |
|---|---|
| Money is `BigInt` paise | §22. Serialize to string at the API boundary — JSON has no BigInt. |
| `Unit.status` is written only by the status service | §7.6. Every transition writes `UnitStatusHistory`. |
| Every query filters `companyId` | §25. Two companies share this instance; a missing filter is a data breach. |
| `deletedAt` everywhere | §22 soft delete. Note it weakens unique constraints — hence the partial indexes. |
| PAN / Aadhaar / bank columns hold ciphertext | §25. Prisma has no encryption layer; encrypt in the application. |
| `createdById` / `updatedById` are plain ids, not relations | Keeps `User` from growing ~40 back-relation arrays. |
| `Activity` and `CustomFieldValue` are polymorphic | One timeline across leads, bookings, units, customers. No FK there. |

## Not yet built

Migrations have not been run and `@prisma/client` has not been generated — there is
no `package.json` in this folder yet. The schema is validated for relation integrity
only (every named relation pairs, every referenced model exists).
