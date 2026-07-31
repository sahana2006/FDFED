/* MEDBITS - medicines.js */

const MEDICINES_API_BASE_URL = 'http://localhost:3000';

const MED_ICONS = {
  'Pain Relief': '<i class="fa-solid fa-bandage"></i>',
  'Diabetes Care': '<i class="fa-solid fa-syringe"></i>',
  'Cardiac Care': '<i class="fa-solid fa-heart-pulse"></i>',
  'Stomach Care': '<i class="fa-solid fa-pills"></i>',
  'Oral Care': '<i class="fa-solid fa-tooth"></i>',
  Respiratory: '<i class="fa-solid fa-wind"></i>',
  'Sexual Health': '<i class="fa-solid fa-capsules"></i>',
  'Cold and Immunity': '<i class="fa-solid fa-shield-heart"></i>',
  'Liver Care': '<i class="fa-solid fa-flask"></i>',
  'Elderly Care': '<i class="fa-solid fa-user"></i>',
};

let medicines = [];
let cartOrders = [];
let orderHistory = [];
let activeCategory = 'Pain Relief';

function useTemplate(id) {
  return document.getElementById(id).content.cloneNode(true);
}

async function initializeMedicinesPage() {
  await Promise.all([loadMedicines(), loadCartOrders(), loadOrderHistory()]);
  renderMedicines();
}

async function loadMedicines() {
  const response = await fetch(`${MEDICINES_API_BASE_URL}/medicines`, {
    headers: {
      role: 'patient',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to load medicines');
  }

  medicines = await response.json();
}

async function loadCartOrders() {
  const session = requireRole('patient');
  if (!session) return;

  const response = await fetch(
    `${MEDICINES_API_BASE_URL}/orders/cart/${encodeURIComponent(session.id)}`,
    {
      headers: {
        role: 'patient',
      },
    },
  );

  if (!response.ok) {
    throw new Error('Failed to load cart');
  }

  cartOrders = await response.json();
}

async function loadOrderHistory() {
  const session = requireRole('patient');
  if (!session) return;

  const response = await fetch(
    `${MEDICINES_API_BASE_URL}/orders/history/${encodeURIComponent(session.id)}`,
    {
      headers: {
        role: 'patient',
      },
    },
  );

  if (!response.ok) {
    throw new Error('Failed to load order history');
  }

  orderHistory = await response.json();
}

function renderMedicines() {
  renderCartSummary();
  renderCartItems();
  renderOrderHistory();

  if (activeCategory === 'All Medicines') {
    showAllMeds();
    return;
  }

  showMedCategory(activeCategory);
}

function showMedCategory(cat) {
  activeCategory = cat;
  setText('medCategoryTitle', cat);
  renderMedProducts(medicines.filter((medicine) => medicine.category === cat));
}

function showAllMeds() {
  activeCategory = 'All Medicines';
  setText('medCategoryTitle', 'All Medicines');
  renderMedProducts(medicines);
}

function searchMedicines(q) {
  const query = q.trim().toLowerCase();
  const results = query
    ? medicines.filter((medicine) => medicine.name.toLowerCase().includes(query))
    : medicines.filter((medicine) => medicine.category === 'Pain Relief');

  setText('medCategoryTitle', query ? `Results for "${q}"` : 'Pain Relief');
  renderMedProducts(results);
}

function renderMedProducts(items) {
  const grid = document.getElementById('medProductGrid');
  grid.innerHTML = '';

  if (!items.length) {
    const msg = document.createElement('p');
    msg.className = 'text-muted';
    msg.textContent = 'No medicines available right now.';
    grid.appendChild(msg);
    return;
  }

  items.forEach((medicine) => {
    const frag = useTemplate('tpl-med-card');
    const card = frag.querySelector('.product-card');
    const existingCartOrder = cartOrders.find((order) => order.medicineId === medicine.id);

    card.querySelector('.med-icon').innerHTML = MED_ICONS[medicine.category] || '<i class="fa-solid fa-capsules"></i>';
    card.querySelector('.med-name').textContent = medicine.name;
    card.querySelector('.med-desc').textContent = medicine.description;
    card.querySelector('.med-price').textContent = `Rs ${medicine.price.toFixed(2)}`;

    const btn = card.querySelector('.med-btn');
    btn.textContent = existingCartOrder ? 'Remove' : 'Add';
    btn.className = `${existingCartOrder ? 'btn btn-outline' : 'btn-add'} med-btn`;
    btn.disabled = false;
    btn.onclick = async function () {
      if (existingCartOrder) {
        await removeMedicineFromCart(existingCartOrder.id);
        return;
      }

      await addMedicineToCart(medicine.id);
    };

    grid.appendChild(frag);
  });
}

async function addMedicineToCart(medicineId) {
  const session = requireRole('patient');
  if (!session) return;

  const response = await fetch(`${MEDICINES_API_BASE_URL}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      role: 'patient',
    },
    body: JSON.stringify({
      userId: session.id,
      medicineId,
      quantity: 1,
    }),
  });

  if (!response.ok) {
    showToast('Unable to add medicine', 'error');
    return;
  }

  await loadCartOrders();
  renderMedicines();
  showToast('Medicine added to cart', 'success');
}

async function updateMedicineCartQuantity(orderId, quantity) {
  if (quantity <= 0) {
    await removeMedicineFromCart(orderId);
    return;
  }

  const response = await fetch(
    `${MEDICINES_API_BASE_URL}/orders/cart/${encodeURIComponent(orderId)}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        role: 'patient',
      },
      body: JSON.stringify({ quantity }),
    },
  );

  if (!response.ok) {
    showToast('Unable to update cart item', 'error');
    return;
  }

  await loadCartOrders();
  renderMedicines();
}

async function removeMedicineFromCart(orderId) {
  const response = await fetch(
    `${MEDICINES_API_BASE_URL}/orders/cart/${encodeURIComponent(orderId)}`,
    {
      method: 'DELETE',
      headers: {
        role: 'patient',
      },
    },
  );

  if (!response.ok) {
    showToast('Unable to remove cart item', 'error');
    return;
  }

  await loadCartOrders();
  renderMedicines();
  showToast('Medicine removed from cart', 'info');
}

function renderCartSummary() {
  const bar = document.getElementById('medCartBar');
  const cartCount = cartOrders.reduce((sum, order) => sum + order.quantity, 0);
  const cartTotal = cartOrders.reduce((sum, order) => sum + order.totalPrice, 0);

  if (!bar) return;

  bar.classList.toggle('hidden', cartOrders.length === 0);
  setText('cartCount', `(${cartCount} item${cartCount !== 1 ? 's' : ''})`);
  setText('cartTotal', `Rs ${cartTotal.toFixed(2)}`);
}

function showCart() {
  const cartSection = document.getElementById('cartSection');
  if (!cartSection) return;

  cartSection.style.display = 'block';
  cartSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function hideCart() {
  const cartSection = document.getElementById('cartSection');
  if (!cartSection) return;

  cartSection.style.display = 'none';
}

function renderCartItems() {
  const cartList = document.getElementById('cartItemsList');
  const cartEmpty = document.getElementById('cartEmptyState');
  const placeOrderBtn = document.getElementById('placeOrderBtn');
  const cartSubtotal = document.getElementById('cartSubtotal');

  if (!cartList || !cartEmpty || !placeOrderBtn || !cartSubtotal) return;

  cartList.innerHTML = '';

  if (!cartOrders.length) {
    cartEmpty.style.display = 'block';
    placeOrderBtn.disabled = true;
    setText('cartSubtotal', 'Rs 0.00');
    return;
  }

  cartEmpty.style.display = 'none';
  placeOrderBtn.disabled = false;

  cartOrders.forEach((order) => {
    const frag = useTemplate('tpl-cart-row');
    const row = frag.querySelector('.cart-item');

    row.querySelector('.cart-item-icon').innerHTML =
      MED_ICONS[order.medicine.category] || '<i class="fa-solid fa-capsules"></i>';
    row.querySelector('.cart-item-name').textContent = order.medicine.name;
    row.querySelector('.cart-item-qty').textContent = order.medicine.category;
    row.querySelector('.cart-item-qty-value').textContent = order.quantity;
    row.querySelector('.cart-item-price').textContent = `Rs ${order.totalPrice.toFixed(2)}`;
    row.querySelector('.cart-minus').onclick = async function () {
      await updateMedicineCartQuantity(order.id, order.quantity - 1);
    };
    row.querySelector('.cart-plus').onclick = async function () {
      await updateMedicineCartQuantity(order.id, order.quantity + 1);
    };
    row.querySelector('.cart-remove').onclick = async function () {
      await removeMedicineFromCart(order.id);
    };

    cartList.appendChild(frag);
  });

  const subtotal = cartOrders.reduce((sum, order) => sum + order.totalPrice, 0);
  setText('cartSubtotal', `Rs ${subtotal.toFixed(2)}`);
}

async function placeOrder() {
  const session = requireRole('patient');
  if (!session || !cartOrders.length) return;

  const response = await fetch(
    `${MEDICINES_API_BASE_URL}/orders/place/${encodeURIComponent(session.id)}`,
    {
      method: 'POST',
      headers: {
        role: 'patient',
      },
    },
  );

  if (!response.ok) {
    showToast('Unable to place order', 'error');
    return;
  }

  await Promise.all([loadCartOrders(), loadOrderHistory()]);
  renderMedicines();
  hideCart();
  showToast('Order placed successfully', 'success');
}

function renderOrderHistory() {
  const el = document.getElementById('medOrderList');
  if (!el) return;
  el.innerHTML = '';

  if (!orderHistory.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    const icon = document.createElement('div');
    icon.className = 'empty-icon';
    icon.innerHTML = '<i class="fa-solid fa-box-open"></i>';
    const msg = document.createElement('p');
    msg.textContent = 'No placed orders yet';
    empty.appendChild(icon);
    empty.appendChild(msg);
    el.appendChild(empty);
    return;
  }

  const groupedOrders = groupItemsByOrderId(orderHistory);

  groupedOrders.forEach((group) => {
    const frag = useTemplate('tpl-order-row');
    const row = frag.querySelector('.order-item');
    const primaryOrder = group.items[0];
    const itemSummary = group.items
      .map((order) => `${order.medicine.name} x${order.quantity}`)
      .join(', ');
    const totalQuantity = group.items.reduce((sum, order) => sum + order.quantity, 0);
    const totalPrice = group.items.reduce((sum, order) => sum + order.totalPrice, 0);

    row.querySelector('.order-icon').innerHTML =
      MED_ICONS[primaryOrder.medicine.category] || '<i class="fa-solid fa-capsules"></i>';
    row.querySelector('.order-id').textContent = `Order #${group.orderId}`;
    row.querySelector('.order-name').textContent =
      `${group.items.length} item${group.items.length !== 1 ? 's' : ''} in this order`;
    row.querySelector('.order-info').textContent =
      `${itemSummary} | Total Qty ${totalQuantity} | ${primaryOrder.status}`;
    row.querySelector('.order-total').textContent = `Rs ${totalPrice.toFixed(2)}`;

    el.appendChild(frag);
  });
}

function groupItemsByOrderId(items) {
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
