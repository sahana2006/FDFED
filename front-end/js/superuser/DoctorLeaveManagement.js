// ============================================================
// DATA STORE
// ============================================================
let leaveRequests = [];
let activeFilter = null;
let currentViewAll = 'approved';
let toastTimer = null;
const API_BASE = 'http://localhost:3000';
const AUTH_HEADERS = { 'Content-Type': 'application/json', 'role': 'admin' };

async function loadLeaveRequests() {
    try {
        const res = await fetch(`${API_BASE}/leave-requests`, { headers: AUTH_HEADERS });
        if (res.ok) {
            leaveRequests = await res.json();
            // Map dates back to the filtering logic
            leaveRequests = leaveRequests.map(r => ({
                ...r,
                startDate: r.date,
                endDate: r.date
            }));
            updateCounts();
            if (document.getElementById('page-main').classList.contains('active')) {
                renderTable();
            } else {
                renderViewAll(currentViewAll);
            }
        }
    } catch (e) {
        console.error('Failed to load leave requests', e);
    }
}
 
// ============================================================
// HELPERS
// ============================================================
 
function getTypeClass(type) {
    if (type === 'Sick')   return 'type-sick';
    if (type === 'Casual') return 'type-casual';
    return 'type-emergency';
}
 
function dateInRange(startDate, endDate, filterDate) {
    return new Date(filterDate) >= new Date(startDate) &&
           new Date(filterDate) <= new Date(endDate);
}
 
// ============================================================
// COUNTS
// ============================================================
 
function updateCounts() {
    const pending  = leaveRequests.filter(r => r.status === 'pending').length;
    const approved = leaveRequests.filter(r => r.status === 'approved').length;
    const rejected = leaveRequests.filter(r => r.status === 'rejected').length;
 
    animateCount('count-pending',  pending);
    animateCount('count-approved', approved);
    animateCount('count-rejected', rejected);
 
    const badge = document.getElementById('pending-badge');
    if (badge) badge.textContent = `${pending} pending`;
}
 
function animateCount(id, val) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = val;
    el.classList.remove('count-pop');
    void el.offsetWidth;
    el.classList.add('count-pop');
}
 
// ============================================================
// RENDER PENDING TABLE (main page)
// ============================================================
 
function renderTable() {
    const tbody      = document.getElementById('leave-table-body');
    const emptyState = document.getElementById('empty-state');
    if (!tbody) return;
 
    let rows = leaveRequests.filter(r => r.status === 'pending');
    if (activeFilter) {
        rows = rows.filter(r => dateInRange(r.startDate, r.endDate, activeFilter));
    }
 
    if (rows.length === 0) {
        tbody.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        lucide.createIcons();
        return;
    }
 
    if (emptyState) emptyState.style.display = 'none';
    tbody.innerHTML = rows.map(r => `
        <tr id="row-${r.id}">
            <td class="doctor-name">${r.name}</td>
            <td>${r.dept}</td>
            <td><span style="font-family:'DM Mono',monospace;font-size:0.8rem">${r.dateRange}</span></td>
            <td><span class="type-badge ${getTypeClass(r.type)}">${r.type}</span></td>
            <td>${r.reason}</td>
            <td class="actions">
                <button class="btn btn-approve" onclick="handleAction('${r.id}', 'approved')">✓ Approve</button>
                <button class="btn btn-reject"  onclick="handleAction('${r.id}', 'rejected')">✕ Reject</button>
            </td>
        </tr>
    `).join('');
 
    lucide.createIcons();
}
 
// ============================================================
// APPROVE / REJECT
// ============================================================
 
async function handleAction(id, action) {
    const req = leaveRequests.find(r => r.id === id);
    if (!req) return;
 
    try {
        const res = await fetch(`${API_BASE}/leave-requests/${id}`, {
            method: 'PUT',
            headers: AUTH_HEADERS,
            body: JSON.stringify({ status: action })
        });
        
        if (!res.ok) {
            const err = await res.json().catch(() => null);
            alert(err?.message || 'Failed to update leave request status');
            return;
        }

        // Show toast immediately
        showToast(req.name, action);
     
        const row = document.getElementById(`row-${id}`);
        if (row) {
            row.style.transition = 'opacity 0.35s, transform 0.35s';
            row.style.opacity    = '0';
            row.style.transform  = 'translateX(30px)';
        }
     
        // Update data after animation
        setTimeout(async () => {
            await loadLeaveRequests();
        }, 350);
    } catch (e) {
        alert('Network error updating status');
    }
}
 
// ============================================================
// TOAST
// ============================================================
 
function showToast(name, action) {
    const toast = document.getElementById('toast');
    const msg   = document.getElementById('toast-msg');
    const icon  = document.getElementById('toast-icon');
    if (!toast || !msg || !icon) return;
 
    clearTimeout(toastTimer);
    toast.className = 'toast';
 
    if (action === 'approved') {
        toast.classList.add('toast-approve');
        icon.setAttribute('data-lucide', 'check-circle');
        msg.textContent = `${name}'s leave approved`;
    } else {
        toast.classList.add('toast-reject');
        icon.setAttribute('data-lucide', 'x-circle');
        msg.textContent = `${name}'s leave rejected`;
    }
 
    lucide.createIcons();
    toast.classList.add('show');
    toastTimer = setTimeout(() => toast.classList.remove('show'), 3500);
}
 
// ============================================================
// DATE FILTER
// ============================================================
 
function applyDateFilter() {
    const val = document.getElementById('date-filter').value;
    if (!val) { clearFilter(); return; }
 
    activeFilter = val;
    const label = new Date(val).toLocaleDateString('en-US', {
        weekday: 'short', month: 'long', day: 'numeric', year: 'numeric'
    });
 
    const info = document.getElementById('filter-info');
    if (info) { info.textContent = `Showing: ${label}`; info.style.display = 'inline-flex'; }
 
    renderTable();
}
 
function clearFilter() {
    activeFilter = null;
    const d = document.getElementById('date-filter');
    const i = document.getElementById('filter-info');
    if (d) d.value = '';
    if (i) i.style.display = 'none';
    renderTable();
}
 
// ============================================================
// PAGE NAVIGATION
// ============================================================
 
function showPage(name) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
 
    if (name === 'main') {
        document.getElementById('page-main').classList.add('active');
        const h = document.getElementById('header-page-title');
        if (h) h.textContent = 'Staff Leave Management';
        renderTable();
    }
}
 
function showViewAll(type) {
    currentViewAll = type;
 
    // Switch visible page
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-viewall').classList.add('active');
 
    // Update headings
    const titleEl  = document.getElementById('viewall-title');
    const pillEl   = document.getElementById('viewall-pill');
    const emptyMsg = document.getElementById('viewall-empty-msg');
    const headerH2 = document.getElementById('header-page-title');
 
    if (type === 'approved') {
        if (titleEl)  titleEl.textContent  = 'Approved Leave Requests';
        if (pillEl)   { pillEl.textContent = 'Approved'; pillEl.className = 'status-pill pill-approved'; }
        if (emptyMsg) emptyMsg.textContent = 'No approved requests yet';
        if (headerH2) headerH2.textContent = 'Approved Leave Requests';
    } else {
        if (titleEl)  titleEl.textContent  = 'Rejected Leave Requests';
        if (pillEl)   { pillEl.textContent = 'Rejected'; pillEl.className = 'status-pill pill-rejected'; }
        if (emptyMsg) emptyMsg.textContent = 'No rejected requests yet';
        if (headerH2) headerH2.textContent = 'Rejected Leave Requests';
    }
 
    renderViewAll(type);
}
 
// ============================================================
// RENDER VIEW-ALL TABLE
// ============================================================
 
function renderViewAll(type) {
    const tbody = document.getElementById('viewall-table-body');
    const empty = document.getElementById('viewall-empty');
    if (!tbody) return;
 
    const rows = leaveRequests.filter(r => r.status === type);
 
    if (rows.length === 0) {
        tbody.innerHTML = '';
        if (empty) empty.style.display = 'block';
        lucide.createIcons();
        return;
    }
 
    if (empty) empty.style.display = 'none';
 
    tbody.innerHTML = rows.map(r => `
        <tr>
            <td class="doctor-name">${r.name}</td>
            <td>${r.dept}</td>
            <td><span style="font-family:'DM Mono',monospace;font-size:0.8rem">${r.dateRange}</span></td>
            <td><span class="type-badge ${getTypeClass(r.type)}">${r.type}</span></td>
            <td>${r.reason}</td>
            <td style="font-size:0.78rem;color:var(--text-muted)">${r.actionedOn || '—'}</td>
        </tr>
    `).join('');
 
    lucide.createIcons();
}
 
// ============================================================
// INIT
// ============================================================
window.addEventListener('DOMContentLoaded', async () => {
    lucide.createIcons();
    await loadLeaveRequests();
});
 
