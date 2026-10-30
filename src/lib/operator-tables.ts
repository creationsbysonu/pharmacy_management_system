/**
 * Tables the Super Admin data browser may open. A whitelist, never user input:
 * the table name ends up in a service-role query, so it must never come
 * straight from the request.
 */
export const OPERATOR_TABLES = [
  "workspaces",
  "workspace_members",
  "profiles",
  "employee",
  "meds",
  "sales",
  "sales_items",
  "purchase",
  "customer",
  "suppliers",
  "upgrade_request",
  "invoice_email",
  "audit_log",
  "operator_audit",
] as const;

export type OperatorTable = (typeof OPERATOR_TABLES)[number];

export function isOperatorTable(value: string): value is OperatorTable {
  return (OPERATOR_TABLES as readonly string[]).includes(value);
}

/**
 * Tables where one row really is one row, so the raw delete control is safe.
 *
 * Excluded on purpose:
 *   * `workspace_members` and `sales_items` have composite keys, so deleting by
 *     the column below would silently delete every row that shares it;
 *   * `workspaces` and `profiles` are account-bearing: they have dedicated,
 *     audited flows so a pharmacy or a login is never left half-deleted;
 *   * `operator_audit` is append-only.
 * Anything excluded here is refused by `deleteOperatorRow` as well as hidden in
 * the UI — the form is not the security boundary.
 */
const DELETABLE: readonly OperatorTable[] = [
  "employee",
  "meds",
  "sales",
  "purchase",
  "customer",
  "suppliers",
  "upgrade_request",
  "invoice_email",
  "audit_log",
];

export function canDeleteRow(table: OperatorTable): boolean {
  return DELETABLE.includes(table);
}

/** Why a table is protected, in words the operator can act on. */
export const DELETE_BLOCKED_REASON: Partial<Record<OperatorTable, string>> = {
  workspaces:
    "Close a pharmacy from its workspace page: that deletes its data and detaches its logins in one audited step.",
  workspace_members:
    "This table is keyed by pharmacy and person, so a row delete would remove every member. Use Remove on the workspace page.",
  profiles:
    "Deleting a profile revokes a login. Use Remove on the workspace page, which also clears the membership.",
  sales_items:
    "Rows here are keyed by sale, so a raw delete would wipe every line of one invoice. Delete the sale instead.",
  operator_audit: "The operator audit log is append-only and cannot be deleted.",
};

/** Primary key column per table, used by the delete control. */
export const OPERATOR_ID_COLUMN: Record<OperatorTable, string> = {
  workspaces: "id",
  workspace_members: "user_id",
  profiles: "id",
  employee: "e_id",
  meds: "med_id",
  sales: "sale_id",
  sales_items: "sale_id",
  purchase: "p_id",
  customer: "c_id",
  suppliers: "sup_id",
  upgrade_request: "id",
  invoice_email: "id",
  audit_log: "id",
  operator_audit: "id",
};
