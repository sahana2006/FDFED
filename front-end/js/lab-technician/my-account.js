/* ============================================================
   my-account.js — Lab Technician My Account (Read-only)
   ============================================================ */

const API_BASE = 'http://localhost:3000';

(async () => {
  await loadComponents('my-account', 'My Account');

  const user = getAuthenticatedLabTech();
  if (!user) return;

  renderAccountDetails(user);
  await loadBranchInfo(user.branchId);
})();

function renderAccountDetails(user) {
  const dispAvatar = document.getElementById('dispAvatar');
  const dispHeaderName = document.getElementById('dispHeaderName');
  const dispHeaderEmail = document.getElementById('dispHeaderEmail');
  const dispName = document.getElementById('dispName');
  const dispEmail = document.getElementById('dispEmail');
  const dispTechId = document.getElementById('dispTechId');
  const dispBranchId = document.getElementById('dispBranchId');

  if (dispAvatar) dispAvatar.textContent = user.initials || 'LT';
  if (dispHeaderName) dispHeaderName.textContent = user.name || 'Lab Technician';
  if (dispHeaderEmail) dispHeaderEmail.textContent = user.email || '—';
  if (dispName) dispName.textContent = user.name || '—';
  if (dispEmail) dispEmail.textContent = user.email || '—';
  if (dispTechId) dispTechId.textContent = user.id || '—';
  if (dispBranchId) dispBranchId.textContent = user.branchId || '—';
}

async function loadBranchInfo(branchId) {
  const dispBranchName = document.getElementById('dispBranchName');
  if (!branchId || !dispBranchName) return;

  try {
    const response = await fetch(`${API_BASE}/hospital-branches/${encodeURIComponent(branchId)}`);
    if (response.ok) {
      const branch = await response.json();
      dispBranchName.textContent = branch.name || branch.branchName || branchId;
    } else {
      dispBranchName.textContent = `Branch (${branchId})`;
    }
  } catch (_) {
    dispBranchName.textContent = `Branch (${branchId})`;
  }
}
