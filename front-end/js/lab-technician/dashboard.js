/* ============================================================
   dashboard.js — Lab Technician Dashboard
   ============================================================ */

const API_BASE = 'http://localhost:3000';

(async () => {
  await loadComponents('dashboard', 'Dashboard');

  const user = getAuthenticatedLabTech();
  if (!user) return;

  const profile = getLabTechProfile();
  const welcomeTitle = document.getElementById('welcomeTitle');
  if (welcomeTitle) {
    welcomeTitle.textContent = `Welcome back, ${profile.name}!`;
  }

  await loadDashboardData(user.id);
})();

async function loadDashboardData(technicianId) {
  const statPending = document.getElementById('statPending');
  const statInProgress = document.getElementById('statInProgress');
  const statCompleted = document.getElementById('statCompleted');
  const statRejected = document.getElementById('statRejected');
  const welcomeSub = document.getElementById('welcomeSub');
  const recentContainer = document.getElementById('recentRequestsContainer');

  try {
    const response = await fetch(`${API_BASE}/lab-requests`, {
      method: 'GET',
      headers: {
        role: 'labtech',
        'x-user-id': technicianId,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to load lab requests');
    }

    const requests = await response.json();

    const pending = requests.filter((r) => r.status === 'pending');
    const inProgress = requests.filter((r) => r.status === 'in_progress' || r.status === 'draft_report' || r.status === 'accepted');
    const completed = requests.filter((r) => r.status === 'completed');
    const rejected = requests.filter((r) => r.status === 'rejected');

    if (statPending) statPending.textContent = pending.length;
    if (statInProgress) statInProgress.textContent = inProgress.length;
    if (statCompleted) statCompleted.textContent = completed.length;
    if (statRejected) statRejected.textContent = rejected.length;

    if (welcomeSub) {
      welcomeSub.innerHTML = `You have <strong>${pending.length} pending lab test request${pending.length !== 1 ? 's' : ''}</strong> awaiting acceptance in your branch.`;
    }

    const sortedRequests = [...requests].sort((a, b) => {
      const timeA = new Date(a.createdAt || a.requestDate || 0).getTime();
      const timeB = new Date(b.createdAt || b.requestDate || 0).getTime();
      return timeB - timeA;
    });

    renderRecentRequests(recentContainer, sortedRequests);
  } catch (error) {
    if (recentContainer) {
      recentContainer.innerHTML =
        '<p style="color:var(--text-muted);font-size:.875rem;padding:16px 0;">Could not load lab requests from server.</p>';
    }
    showToast(error.message || 'Unable to load dashboard data', 'error');
  }
}

function renderRecentRequests(container, requests) {
  if (!container) return;

  if (!requests.length) {
    container.innerHTML =
      '<p style="color:var(--text-muted);font-size:.875rem;padding:16px 0;">No lab requests found for your branch.</p>';
    return;
  }

  container.innerHTML = '';
  const list = document.createElement('div');
  list.className = 'recent-requests-list';

  requests.slice(0, 5).forEach((req) => {
    const initials = getInitials(req.patientName || req.patientId);
    const badgeClass = getStatusBadgeClass(req.status);
    const statusLabel = formatStatusLabel(req.status);

    const row = document.createElement('div');
    row.className = 'recent-request-row';
    row.innerHTML = `
      <div class="req-left">
        <div class="req-avatar">${initials}</div>
        <div>
          <div class="req-title">${escapeHtml(req.testName)} — <strong>${escapeHtml(req.patientName || req.patientId)}</strong></div>
          <div class="req-meta">Dr. ${escapeHtml(req.doctorName)} &middot; ${escapeHtml(req.requestDate)} &middot; ${escapeHtml(req.appointmentId || 'Direct')}</div>
        </div>
      </div>
      <div class="req-right">
        <span class="badge ${badgeClass}">${statusLabel}</span>
        <a href="test-requests.html?id=${encodeURIComponent(req.id)}" class="btn btn-outline btn-sm">View</a>
      </div>
    `;
    list.appendChild(row);
  });

  container.appendChild(list);
}

function getStatusBadgeClass(status) {
  switch (status) {
    case 'pending':
      return 'badge-pending';
    case 'accepted':
    case 'in_progress':
    case 'draft_report':
      return 'badge-in-progress';
    case 'completed':
      return 'badge-completed';
    case 'rejected':
      return 'badge-danger';
    default:
      return 'badge-pending';
  }
}

function formatStatusLabel(status) {
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'accepted':
    case 'in_progress':
    case 'draft_report':
      return 'In Progress';
    case 'completed':
      return 'Completed';
    case 'rejected':
      return 'Rejected';
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
}

function getInitials(str) {
  if (!str) return 'PT';
  return str
    .split(/[\s-]+/)
    .map((w) => w[0]?.toUpperCase() || '')
    .slice(0, 2)
    .join('') || 'PT';
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
