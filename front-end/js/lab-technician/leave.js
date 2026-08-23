/* ============================================================
   leave.js — Lab Technician Leave Management
   ============================================================ */

const API_BASE = 'http://localhost:3000';

let myLeaveRequests = [];

(async () => {
  await loadComponents('leave', 'Leave');

  const user = getAuthenticatedLabTech();
  if (!user) return;

  setupLeaveForm(user);
  await loadMyLeaveRequests(user.id);
})();

function setupLeaveForm(user) {
  const dateInput = document.getElementById('leaveDate');
  if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.min = today;
  }

  const form = document.getElementById('leaveApplyForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await handleApplyLeave(user);
    });
  }
}

async function handleApplyLeave(user) {
  const date = document.getElementById('leaveDate')?.value?.trim();
  const type = document.getElementById('leaveType')?.value?.trim();
  const reason = document.getElementById('leaveReason')?.value?.trim();

  if (!date || !type || !reason) {
    showToast('Please fill all required fields.', 'warning');
    return;
  }

  const btnSubmit = document.getElementById('btnSubmitLeave');
  if (btnSubmit) btnSubmit.disabled = true;

  try {
    const response = await fetch(`${API_BASE}/leave-requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        role: 'labtech',
        'x-user-id': user.id,
      },
      body: JSON.stringify({
        doctorId: user.id,
        date,
        type,
        reason,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => null);
      throw new Error(err?.message || 'Failed to submit leave request');
    }

    showToast('Leave request submitted successfully.', 'success');
    document.getElementById('leaveApplyForm')?.reset();
    await loadMyLeaveRequests(user.id);
  } catch (error) {
    showToast(error.message || 'Error submitting leave request', 'error');
  } finally {
    if (btnSubmit) btnSubmit.disabled = false;
  }
}

async function loadMyLeaveRequests(technicianId) {
  const tbody = document.getElementById('leaveTableBody');
  try {
    const response = await fetch(`${API_BASE}/leave-requests`, {
      headers: {
        role: 'labtech',
        'x-user-id': technicianId,
      },
    });

    if (!response.ok) throw new Error('Failed to load leave requests');
    const allRequests = await response.json();
    myLeaveRequests = allRequests.filter((r) => r.doctorId === technicianId);

    const badge = document.getElementById('leaveCountBadge');
    if (badge) {
      badge.textContent = `${myLeaveRequests.length} request${myLeaveRequests.length !== 1 ? 's' : ''}`;
    }

    renderTable();
  } catch (error) {
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align:center;color:var(--red);padding:32px;">
            ${escapeHtml(error.message || 'Unable to load leave requests.')}
          </td>
        </tr>`;
    }
  }
}

function renderTable() {
  const tbody = document.getElementById('leaveTableBody');
  if (!tbody) return;

  if (!myLeaveRequests.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6">
          <div class="empty-state">
            <div class="empty-state-icon">📅</div>
            <div class="empty-state-text">You have not submitted any leave requests yet.</div>
          </div>
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = '';
  myLeaveRequests.forEach((req) => {
    const tr = document.createElement('tr');
    let badgeHtml = '<span class="badge badge-pending">Pending</span>';
    if (req.status === 'approved') badgeHtml = '<span class="badge badge-completed">Approved</span>';
    else if (req.status === 'rejected') badgeHtml = '<span class="badge" style="background:#fee2e2;color:#991b1b;">Rejected</span>';

    const appliedDate = req.createdAt ? new Date(req.createdAt).toLocaleDateString() : '—';

    tr.innerHTML = `
      <td><strong>${escapeHtml(req.date)}</strong></td>
      <td>${escapeHtml(req.type || 'Casual')}</td>
      <td><span style="color:var(--text);font-size:0.86rem;">${escapeHtml(req.reason || '—')}</span></td>
      <td>${badgeHtml}</td>
      <td><span style="color:var(--text-muted);font-size:0.84rem;">${escapeHtml(appliedDate)}</span></td>
      <td><span style="color:var(--text-muted);font-size:0.84rem;">${escapeHtml(req.actionedOn || '—')}</span></td>
    `;

    tbody.appendChild(tr);
  });
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
