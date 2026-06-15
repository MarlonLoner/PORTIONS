# PORTIONS Multi-Tenant Architecture

PORTIONS uses a shared PostgreSQL database with an explicit `Tenant` boundary for each pharmacy organisation. Platform administration is separated from pharmacy administration so PORTIONS operators can manage tenants, subscriptions, onboarding, support access, and system health without automatically seeing pharmacy operational records.

## Platform Versus Tenant Roles

Tenant users live in `AppUser` and belong to one pharmacy tenant through `tenantId`. Their permissions are pharmacy roles such as `OWNER`, `GENERAL_MANAGER`, `BRANCH_MANAGER`, `PHARMACIST`, `STOCK_CONTROLLER`, and `VIEW_ONLY`.

Platform users live in `PlatformUser` and authenticate through a separate platform session cookie. Platform roles are `PLATFORM_OWNER`, `PLATFORM_ADMIN`, `PLATFORM_SUPPORT`, `PLATFORM_FINANCE`, and `PLATFORM_VIEW_ONLY`.

Platform users do not inherit tenant permissions. Tenant users do not gain access to `/platform`.

## Shared Database Tenant Isolation

Customer-owned records now have additive nullable `tenantId` fields, including branches, staff, patients, follow-ups, orders, stock, reports, imports, operational actions, notifications, communications, events, operating units, and app users.

The first migration stage creates:

- a primary tenant for the current installation: `PORTIONS Demonstration Pharmacy`
- a dedicated demo tenant: `PORTIONS Demo Tenant`
- platform identity tables
- support access requests
- audit logs

Existing production records are backfilled into the primary tenant. Fields remain nullable in this stage so production migration can be verified before enforcing required ownership.

## Tenant Isolation Rules

Server-side code must derive tenant identity from the authenticated session, not a submitted form field or URL parameter.

Creation rules:

- set `tenantId` from the current tenant context
- validate branch, staff, operating unit, patient, order, or event IDs inside the current tenant
- never trust tenant IDs submitted by the browser

Read/update rules:

- detail routes must query by `id` and `tenantId`
- unknown or cross-tenant IDs should return `notFound()` or access denied without revealing existence
- list queries should include `tenantId` at the database layer
- never load global customer data and filter it in the browser

Reusable helpers live in `src/lib/tenant.ts` and include `requireTenantUser`, `tenantWhere`, `buildTenantScope`, tenant-specific query scope builders, `assertTenantRecordAccess`, `canTenantUseFeature`, and `requireActiveTenant`.

## Support Access Policy

Support access is not a backdoor. `TenantSupportAccessRequest` records the tenant, requesting platform user, reason, scope, status, requested time, approval time, expiry, and revocation.

Rules:

- tenant approval is required for support access unless a future emergency policy is explicitly defined
- support access is scoped and time-limited
- support actions must be audited
- sensitive patient/customer fields should be masked unless scope permits access
- tenant admins should be able to review support access history

## Demo Tenant Policy

Demo access resolves to `tenant_portions_demo` and is marked as demo mode. Demo sessions are blocked from tenant-admin and security routes:

- `/admin/users`
- `/admin/users/new`
- `/admin/operating-units`
- `/setup`
- `/platform`
- password/security settings

Demo writes should either be blocked or limited to resettable demo records inside the demo tenant.

## Platform Control Plane

The platform control plane lives under `/platform` and uses a separate platform session cookie.

Routes:

- `/platform`
- `/platform/tenants`
- `/platform/tenants/new`
- `/platform/tenants/[id]`
- `/platform/support`
- `/platform/audit`
- `/platform/system-health`
- `/platform/setup`
- `/platform/login`

Platform pages show aggregate tenant and system information, not patient names, phone numbers, messages, clinical details, or order line details by default.

## Bootstrap Strategy

`/platform/setup` uses `PORTIONS_PLATFORM_SETUP_KEY` to create the first `PLATFORM_OWNER`. It is disabled after a platform owner exists.

`/setup` remains the pharmacy bootstrap path, but new owners are attached to the primary tenant. Future tenant-specific onboarding should use a tenant invitation token instead of global setup.

## Subscription Enforcement

Helpers in `src/lib/tenant.ts` centralize subscription checks:

- `isTenantActive`
- `requireActiveTenant`
- `canTenantUseFeature`
- `getTenantPlanLimits`

Suspended, disabled, archived, paused, or cancelled tenants are blocked from normal login/use. Deep billing enforcement is intentionally deferred.

## Migration and Backfill Strategy

The current migration is staged:

1. create tenant/platform/support/audit models
2. add nullable `tenantId` columns
3. create primary and demo tenants
4. backfill existing rows to the primary tenant
5. add indexes and foreign keys
6. validate no orphan rows
7. progressively update queries and mutations to include tenant scope
8. only then make `tenantId` required where safe

Do not run destructive resets in production.

## Dedicated Database Option

Enterprise customers may require isolated databases or regions. The current shared-database model is compatible with a future dedicated database option because tenant identity is explicit and query scoping is centralized.

## No-Backdoor Principle

PORTIONS must not include a universal bypass password, hidden cookie, or invisible platform access to tenant data. Platform support is explicit, scoped, expiring, tenant-approved, and audited.
