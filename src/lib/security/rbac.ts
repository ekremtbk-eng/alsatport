export type Role = "member" | "seller" | "admin";

const RANK: Record<Role, number> = {
  member: 1,
  seller: 2,
  admin: 3,
};

export function hasRole(actual: Role | undefined, needed: Role) {
  if (!actual) return false;
  return RANK[actual] >= RANK[needed];
}

export function roleForProfile(complete: boolean, existing?: Role): Role {
  if (existing === "admin") return "admin";
  return complete ? "seller" : "member";
}
