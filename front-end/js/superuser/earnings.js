const API_BASE_URL = 'http://localhost:3000';
const STORAGE_KEY = 'user';

const $ = (id) => document.getElementById(id);

function getSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_error) {
    return null;
  }
}

function getAuthHeaders(extra = {}) {
  const session = getSession();
  const headers = { ...extra };
  if (session?.role) headers.role = session.role;
  if (session?.id) headers['x-user-id'] = session.id;
  return headers;
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message || 'Request failed.');
  }

  if (response.status === 204) return null;
  return response.json();
}

function showToast(message, type = 'success') {
  const host = $('toast-host');
  if (!host) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  host.appendChild(toast);

  window.setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(6px)';
    toast.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
  }, 2600);

  window.setTimeout(() => toast.remove(), 3000);
}

async function loadShell() {
  const [sidebarResponse, headerResponse] = await Promise.all([
    fetch('./components/sidebar.html'),
    fetch('./components/header.html'),
  ]);

  $('sidebar-slot').innerHTML = await sidebarResponse.text();
  $('header-slot').innerHTML = await headerResponse.text();

  document.querySelectorAll('.nav-item').forEach((link) => link.classList.remove('active'));
  const activeLink = document.querySelector('[data-nav="earnings"]');
  if (activeLink) activeLink.classList.add('active');

  const session = getSession();
  const headerTitle = $('header-page-title');
  if (headerTitle) headerTitle.textContent = 'Earnings';
  const userName = document.querySelector('.user-name');
  if (userName) userName.textContent = session?.name || 'Super Admin';

  lucide.createIcons();
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
}

async function loadEarnings() {
  try {
    const data = await apiRequest('/super-admin/hospital-branches/earnings');

    $('this-month-earnings').textContent = formatCurrency(data.thisMonthEarnings);
    $('total-earnings').textContent = formatCurrency(data.totalEarnings);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function init() {
  await loadShell();
  await loadEarnings();
}

document.addEventListener('DOMContentLoaded', init);
