/* ============================================================
   leave-management.js — Branch Admin
   Manage Doctor Leave Requests
   ============================================================ */

(async () => {
  await loadComponents('leave-management', 'Leave Management');
  fetchLeaveRequests();
})();

let allRequests = [];

async function fetchLeaveRequests() {
  try {
    const res = await apiRequest('/leave-requests');
    allRequests = res;
    renderTable();
  } catch (err) {
    showToast('Failed to load leave requests', 'error');
  }
}

function renderTable() {
  const tbody = document.getElementById('leaveTableBody');
  if (allRequests.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center">No leave requests found.</td></tr>';
    return;
  }

  tbody.innerHTML = allRequests.map(req => {
    let statusBadge = '';
    if (req.status === 'pending') statusBadge = '<span class="badge badge-warning">Pending</span>';
    else if (req.status === 'approved') statusBadge = '<span class="badge badge-teal">Approved</span>';
    else if (req.status === 'rejected') statusBadge = '<span class="badge badge-danger">Rejected</span>';

    return `
      <tr>
        <td>
          <div style="font-weight: 600; color: var(--text-main);">${escapeHtml(req.name)}</div>
        </td>
        <td>${escapeHtml(req.dept || '—')}</td>
        <td><div style="font-weight: 500;">${escapeHtml(req.dateRange)}</div></td>
        <td>${escapeHtml(req.type || 'Full Day Off')}</td>
        <td>${escapeHtml(req.reason || '—')}</td>
        <td>${statusBadge}</td>
        <td><div class="text-muted" style="font-size: 13px;">${new Date(req.createdAt).toLocaleDateString()}</div></td>
        <td>
          ${req.status === 'pending' ? `
            <div class="action-btns">
              <button class="btn-icon" title="Approve" onclick="updateStatus('${req.id}', 'approved')" style="color: var(--teal-600)">✅</button>
              <button class="btn-icon" title="Reject" onclick="updateStatus('${req.id}', 'rejected')" style="color: var(--danger)">❌</button>
            </div>
          ` : `
            <div class="text-muted" style="font-size: 13px;">${req.actionedOn || '—'}</div>
          `}
        </td>
      </tr>
    `;
  }).join('');
}

window.updateStatus = async function(id, status) {
  if (!confirm(`Are you sure you want to ${status} this leave request?`)) return;

  try {
    await apiRequest(`/leave-requests/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
    showToast(`Leave request ${status} successfully.`, 'success');
    fetchLeaveRequests();
  } catch (err) {
    showToast(err.message || 'Failed to update request status', 'error');
  }
};
