/* MEDBITS - labtests.js */

const LABTESTS_API_BASE_URL = 'http://localhost:3000';

const LAB_TEST_ICONS = {
  'Full Body Check Up': '🧪',
  Diabetes: '🩸',
  'Blood Studies': '🔬',
  Heart: '🫀',
  Kidney: '🧫',
  Liver: '⚗️',
  Thyroid: '🦋',
  Vitamin: '🌿',
  "Women's Health": '🌸',
  'Senior Citizen': '🧓',
};

let labTests = [];
let cartBookings = [];
let bookingHistory = [];
let assignedLabTests = [];
let activeLabCategory = 'Full Body Check Up';

function useTemplate(id) {
  return document.getElementById(id).content.cloneNode(true);
}

async function initializeLabTestsPage() {
  await Promise.all([loadLabTests(), loadLabCart(), loadLabHistory()]);
  await loadAssignedLabTestsSafely();
  renderLabTests();
}

async function loadLabTests() {
  const response = await fetch(`${LABTESTS_API_BASE_URL}/labtests`, {
    headers: {
      role: 'patient',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to load lab tests');
  }

  labTests = await response.json();
}

async function loadLabCart() {
  const session = requireRole('patient');
  if (!session) return;

  const response = await fetch(
    `${LABTESTS_API_BASE_URL}/labtests/cart/${encodeURIComponent(session.id)}`,
    {
      headers: {
        role: 'patient',
      },
    },
  );

  if (!response.ok) {
    throw new Error('Failed to load lab cart');
  }

  cartBookings = await response.json();
}

async function loadLabHistory() {
  const session = requireRole('patient');
  if (!session) return;

  const response = await fetch(
    `${LABTESTS_API_BASE_URL}/labtests/history/${encodeURIComponent(session.id)}`,
    {
      headers: {
        role: 'patient',
      },
    },
  );

  if (!response.ok) {
    throw new Error('Failed to load lab history');
  }

  bookingHistory = await response.json();
}

async function loadAssignedLabTests() {
  const session = requireRole('patient');
  if (!session) return;

  const response = await fetch(
    `${LABTESTS_API_BASE_URL}/labtests/assignments/user/${encodeURIComponent(session.id)}`,
    {
      headers: {
        role: 'patient',
      },
    },
  );

  if (!response.ok) {
    throw new Error('Failed to load assigned lab tests');
  }

  assignedLabTests = await response.json();
}

async function loadAssignedLabTestsSafely() {
  try {
    await loadAssignedLabTests();
  } catch (_) {
    assignedLabTests = [];
  }
  assignedLabTests = mergeLegacyAssignedLabTests(assignedLabTests);
}

function mergeLegacyAssignedLabTests(assignments) {
  const session = requireRole('patient');
  if (!session) return assignments;
  if (assignments.length) return assignments;

  let legacyAssignments = [];
  try {
    legacyAssignments = JSON.parse(localStorage.getItem('labAssignments') || '[]');
  } catch (_) {
    legacyAssignments = [];
  }
  if (!Array.isArray(legacyAssignments) || !legacyAssignments.length) return assignments;

  const patientName = (session.name || `${session.firstName || ''} ${session.lastName || ''}`).trim().toLowerCase();
  const migrated = legacyAssignments
    .filter((item) => String(item.patient || '').trim().toLowerCase() === patientName)
    .map((item, index) => ({
      id: `legacy-${index}`,
      userId: session.id,
      patientName: item.patient,
      doctorName: item.doctorName || 'Doctor',
      packageName: item.packageName || 'Assigned Lab Package',
      tests: String(item.tests || '').split(',').map((test) => test.trim()).filter(Boolean),
      remarks: item.remarks || '',
      status: 'assigned',
    }));

  const existingKeys = new Set(
    assignments.map((item) => `${item.packageName}|${Array.isArray(item.tests) ? item.tests.join(',') : item.tests}`),
  );
  return [
    ...assignments,
    ...migrated.filter((item) => !existingKeys.has(`${item.packageName}|${item.tests.join(',')}`)),
  ];
}

function renderLabTests() {
  renderLabCartSummary();
  renderLabCartItems();
  renderLabOrders();
  renderTopTests();

  if (activeLabCategory === 'All Tests') {
    showAllLab();
    return;
  }

  showLabCategory(activeLabCategory);
}

function showLabCategory(cat) {
  activeLabCategory = cat;
  const tests = labTests.filter((test) => test.category === cat);
  setText('labCategoryTitle', `${cat} (${tests.length})`);
  renderLabProducts(tests);
}

function showAllLab() {
  activeLabCategory = 'All Tests';
  setText('labCategoryTitle', `All Tests (${labTests.length})`);
  renderLabProducts(labTests);
}

function searchLabTests(q) {
  const query = q.trim().toLowerCase();
  if (!query) {
    showLabCategory('Full Body Check Up');
    return;
  }

  const results = labTests.filter((test) =>
    test.name.toLowerCase().includes(query),
  );
  setText('labCategoryTitle', `Results for "${q}"`);
  renderLabProducts(results);
}

function renderLabProducts(tests) {
  fillLabGrid(document.getElementById('labProductGrid'), tests);
}

function renderTopTests() {
  fillLabGrid(document.getElementById('topLabGrid'), labTests.slice(0, 4));
}

function fillLabGrid(grid, tests) {
  if (!grid) return;
  grid.innerHTML = '';

  if (!tests.length) {
    const msg = document.createElement('p');
    msg.className = 'text-muted';
    msg.textContent = 'No tests in this category.';
    grid.appendChild(msg);
    return;
  }

  tests.forEach((test) => {
    const frag = useTemplate('tpl-lab-card');
    const card = frag.querySelector('.product-card');
    const existingCartBooking = cartBookings.find(
      (booking) => booking.labTestId === test.id,
    );

    card.querySelector('.lab-icon').textContent =
      LAB_TEST_ICONS[test.category] || '🧪';
    card.querySelector('.lab-name').textContent = test.name;
    card.querySelector('.lab-desc').textContent = test.description;
    card.querySelector('.lab-price').textContent = `Rs ${test.price.toFixed(2)}`;

    const btn = card.querySelector('.lab-btn');
    btn.textContent = existingCartBooking ? 'Remove' : 'Add';
    btn.className = `${existingCartBooking ? 'btn btn-outline' : 'btn-add'} lab-btn`;
    btn.onclick = async function () {
      if (existingCartBooking) {
        await removeLabTestFromCart(existingCartBooking.id);
        return;
      }

      await addLabTestToCart(test.id);
    };

    grid.appendChild(frag);
  });
}

async function addLabTestToCart(labTestId) {
  const session = requireRole('patient');
  if (!session) return;

  const response = await fetch(`${LABTESTS_API_BASE_URL}/labtests/book`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      role: 'patient',
    },
    body: JSON.stringify({
      userId: session.id,
      labTestId,
    }),
  });

  if (!response.ok) {
    showToast('Unable to add lab test', 'error');
    return;
  }

  await loadLabCart();
  renderLabTests();
  showToast('Lab test added to cart', 'success');
}

async function removeLabTestFromCart(bookingId) {
  const response = await fetch(
    `${LABTESTS_API_BASE_URL}/labtests/cart/${encodeURIComponent(bookingId)}`,
    {
      method: 'DELETE',
      headers: {
        role: 'patient',
      },
    },
  );

  if (!response.ok) {
    showToast('Unable to remove lab test', 'error');
    return;
  }

  await loadLabCart();
  renderLabTests();
  showToast('Lab test removed from cart', 'info');
}

function renderLabCartSummary() {
  const bar = document.getElementById('labCartBar');
  const cartTotal = cartBookings.reduce(
    (sum, booking) => sum + booking.labTest.price,
    0,
  );

  if (!bar) return;

  bar.classList.toggle('hidden', cartBookings.length === 0);
  setText('labCartTotal', `Rs ${cartTotal.toFixed(2)}`);
  setText(
    'labCartCount',
    `(${cartBookings.length} item${cartBookings.length !== 1 ? 's' : ''})`,
  );
}

function showLabCart() {
  const cartSection = document.getElementById('labCartSection');
  if (!cartSection) return;

  cartSection.style.display = 'block';
  cartSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function hideLabCart() {
  const cartSection = document.getElementById('labCartSection');
  if (!cartSection) return;

  cartSection.style.display = 'none';
}

function renderLabCartItems() {
  const cartList = document.getElementById('labCartItemsList');
  const emptyState = document.getElementById('labCartEmptyState');
  const totalEl = document.getElementById('labCartSubtotal');
  const confirmBtn = document.getElementById('confirmLabBookingBtn');

  if (!cartList || !emptyState || !totalEl || !confirmBtn) return;

  cartList.innerHTML = '';

  if (!cartBookings.length) {
    emptyState.style.display = 'block';
    confirmBtn.disabled = true;
    setText('labCartSubtotal', 'Rs 0.00');
    return;
  }

  emptyState.style.display = 'none';
  confirmBtn.disabled = false;

  cartBookings.forEach((booking) => {
    const frag = useTemplate('tpl-lab-cart-row');
    const row = frag.querySelector('.cart-item');

    row.querySelector('.lab-cart-icon').textContent =
      LAB_TEST_ICONS[booking.labTest.category] || '🧪';
    row.querySelector('.lab-cart-name').textContent = booking.labTest.name;
    row.querySelector('.lab-cart-cat').textContent = booking.labTest.category;
    row.querySelector('.lab-cart-price').textContent = `Rs ${booking.labTest.price.toFixed(2)}`;
    row.querySelector('.lab-cart-remove').onclick = async function () {
      await removeLabTestFromCart(booking.id);
    };

    cartList.appendChild(frag);
  });

  const subtotal = cartBookings.reduce(
    (sum, booking) => sum + booking.labTest.price,
    0,
  );
  setText('labCartSubtotal', `Rs ${subtotal.toFixed(2)}`);
}

async function confirmLabBooking() {
  const session = requireRole('patient');
  if (!session || !cartBookings.length) return;

  const response = await fetch(
    `${LABTESTS_API_BASE_URL}/labtests/confirm/${encodeURIComponent(session.id)}`,
    {
      method: 'POST',
      headers: {
        role: 'patient',
      },
    },
  );

  if (!response.ok) {
    showToast('Unable to confirm lab booking', 'error');
    return;
  }

  await Promise.all([loadLabCart(), loadLabHistory()]);
  await loadAssignedLabTestsSafely();
  renderLabTests();
  hideLabCart();
  showToast('Lab tests booked!', 'success');
}

function renderLabOrders() {
  const el = document.getElementById('labOrderList');
  if (!el) return;
  el.innerHTML = '';

  if (!bookingHistory.length && !assignedLabTests.length) {
    const msg = document.createElement('p');
    msg.className = 'text-muted';
    msg.textContent = 'No assigned or completed lab tests yet.';
    el.appendChild(msg);
    return;
  }

  assignedLabTests.forEach((assignment) => {
    const frag = useTemplate('tpl-lab-order-row');
    const row = frag.querySelector('.order-item');

    row.querySelector('.lab-order-test').textContent = assignment.packageName || 'Assigned Lab Package';
    const assignedTests = Array.isArray(assignment.tests) ? assignment.tests.join(', ') : String(assignment.tests || '');
    row.querySelector('.lab-order-date').textContent =
      `${assignedTests} | Assigned by ${assignment.doctorName}${assignment.remarks ? ' | ' + assignment.remarks : ''}`;
    row.querySelector('.lab-order-badge').textContent = 'Assigned';

    el.appendChild(frag);
  });

  const groupedBookings = groupLabBookingsByOrderId(bookingHistory);

  groupedBookings.forEach((group) => {
    const frag = useTemplate('tpl-lab-order-row');
    const row = frag.querySelector('.order-item');
    const primaryBooking = group.items[0];
    const testSummary = group.items.map((booking) => booking.labTest.name).join(', ');
    const totalPrice = group.items.reduce(
      (sum, booking) => sum + booking.labTest.price,
      0,
    );

    row.querySelector('.lab-order-test').textContent = `Order #${group.orderId}`;
    row.querySelector('.lab-order-date').textContent =
      `${testSummary} | ${group.items.length} test${group.items.length !== 1 ? 's' : ''} | Rs ${totalPrice.toFixed(2)}`;
    row.querySelector('.lab-order-badge').textContent = primaryBooking.status === 'booked' ? 'Completed' : primaryBooking.status;

    el.appendChild(frag);
  });
}

function groupLabBookingsByOrderId(items) {
  const groups = new Map();

  items.forEach((item) => {
    const orderId = item.orderId || item.id;
    const existingGroup = groups.get(orderId);
    if (existingGroup) {
      existingGroup.items.push(item);
      return;
    }

    groups.set(orderId, {
      orderId,
      items: [item],
    });
  });

  return Array.from(groups.values());
}
