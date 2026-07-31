/* ============================================================
   DASHBOARD.JS - Dashboard page logic
   ============================================================ */

const FRONTDESK_DASHBOARD_API_BASE_URL = 'http://localhost:3000';
let frontdeskDashboardRefreshTimer = null;

document.addEventListener('DOMContentLoaded', async () => {
  renderShell('dashboard');

  try {
    await loadDashboardFrontdeskProfile();
    await loadDashboardData();
    startDashboardRefresh();
  } catch (error) {
    console.error('Frontdesk dashboard load error:', error);
    showToast('Failed to load dashboard. Please refresh.', 'error');
    return;
  }
});

async function loadDashboardFrontdeskProfile() {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  if (!user?.id) {
    throw new Error('Logged-in frontdesk user not found');
  }

  const response = await fetch(
    `${FRONTDESK_DASHBOARD_API_BASE_URL}/frontdesk/${encodeURIComponent(user.id)}`,
    { headers: { role: 'frontdesk' } },
  );

  if (!response.ok) {
    throw new Error('Failed to load frontdesk profile');
  }

  const profile = await response.json();
  localStorage.setItem('user', JSON.stringify({ ...user, name: profile.name, email: profile.email }));

  const nameElement = document.getElementById('topbar-username');
  if (nameElement) {
    nameElement.textContent = profile.name;
  }

  const welcomeElement = document.getElementById('dashboard-welcome-title');
  if (welcomeElement) {
    welcomeElement.textContent = `Welcome, ${profile.name}!`;
  }

  return profile;
}

async function loadDashboardData() {
  const [walkins, appointments, queueItems] = await Promise.all([
    fetchWithRole('/walkins'),
    fetchWithRole('/appointments'),
    fetchWithRole('/queue'),
  ]);

  const activeQueueItems = queueItems.filter((item) => item.status !== 'done');
  const waitingItems = queueItems.filter((item) => item.status === 'waiting').slice(0, 4);
  const consultItems = queueItems.filter((item) => item.status === 'in-consultation').slice(0, 4);

  document.getElementById('stat-walkins').textContent = walkins.length;
  document.getElementById('stat-appointments').textContent = appointments.length;
  document.getElementById('stat-queue').textContent = activeQueueItems.length;

  const waitingList = document.getElementById('queue-waiting-list');
  if (!waitingItems.length) {
    waitingList.innerHTML = '<div class="empty-state"><p>No patients waiting</p></div>';
  } else {
    waitingList.innerHTML = waitingItems.map(item => `
      <div class="queue-item">
        <div class="queue-item-token">#${item.tokenNumber}</div>
        <div class="queue-item-name">${item.patient?.name || item.userId}</div>
      </div>
    `).join('');
  }

  const consultList = document.getElementById('queue-consulting-list');
  if (!consultItems.length) {
    consultList.innerHTML = '<div class="empty-state"><p>No active consultations</p></div>';
  } else {
    consultList.innerHTML = consultItems.map(item => `
      <div class="queue-item queue-item--consulting">
        <div class="queue-item-token">#${item.tokenNumber}</div>
        <div class="queue-item-name">${item.patient?.name || item.userId}</div>
        <div class="queue-item-doctor">${item.doctor.name}</div>
      </div>
    `).join('');
  }
}

async function fetchWithRole(path) {
  const response = await fetch(`${FRONTDESK_DASHBOARD_API_BASE_URL}${path}`, {
    headers: { role: 'frontdesk' },
  });

  if (!response.ok) {
    throw new Error(`Failed to load ${path}`);
  }

  return response.json();
}

function startDashboardRefresh() {
  if (frontdeskDashboardRefreshTimer) return;

  frontdeskDashboardRefreshTimer = window.setInterval(async () => {
    if (document.hidden) return;
    try {
      await loadDashboardData();
    } catch (_) {}
  }, 5000);
}
