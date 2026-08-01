export type BranchRequestContext = {
  role?: string;
  userId?: string;
  branchId?: string;
};

export function isBranchAdminRole(role?: string): boolean {
  return role === 'admin' || role === 'branch_admin';
}