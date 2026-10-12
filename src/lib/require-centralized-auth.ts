/**
 * Every new API route MUST:
 *  1. Add a row to API_ROUTE_POLICIES in src/lib/permissions.ts
 *  2. Gate with requireSession / requireCapability / requireOwner (not ad-hoc role strings)
 *  3. Apply branch/employee scope via canAccessBranchData / canAccessEmployeeRecord
 *
 * verify:phase1 fails if a route.ts file is missing from the registry.
 */
export const NEW_API_AUTH_RULE =
  'New APIs must register in API_ROUTE_POLICIES and use centralized permission helpers.';
