/**
 * Organization RBAC for PrithviScan.
 * Roles: owner > agronomist > scout > viewer
 */

export const ORG_ROLES = [
  { id: "owner", label: "Owner", rank: 40 },
  { id: "agronomist", label: "Agronomist", rank: 30 },
  { id: "scout", label: "Scout", rank: 20 },
  { id: "viewer", label: "Viewer", rank: 10 },
  { id: "member", label: "Member", rank: 15 }, // legacy → treat like scout
];

const RANK = Object.fromEntries(ORG_ROLES.map((r) => [r.id, r.rank]));

export function normalizeOrgRole(role, { isOwner = false } = {}) {
  if (isOwner) return "owner";
  const r = String(role || "viewer").toLowerCase();
  if (r === "member") return "scout";
  if (RANK[r] != null) return r;
  return "viewer";
}

export function roleRank(role) {
  return RANK[normalizeOrgRole(role)] || 0;
}

export function canManageMembers(role) {
  return normalizeOrgRole(role) === "owner";
}

export function canWriteFields(role) {
  const r = normalizeOrgRole(role);
  return r === "owner" || r === "agronomist" || r === "scout";
}

export function canDeleteFields(role) {
  const r = normalizeOrgRole(role);
  return r === "owner" || r === "agronomist";
}

export function canAssignTasks(role) {
  const r = normalizeOrgRole(role);
  return r === "owner" || r === "agronomist";
}

export function canEditPrescriptions(role) {
  const r = normalizeOrgRole(role);
  return r === "owner" || r === "agronomist";
}

export function roleLabel(role) {
  const id = normalizeOrgRole(role);
  return ORG_ROLES.find((r) => r.id === id)?.label || id;
}
