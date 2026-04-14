/* ============================================================
   TIMPRAZ CATÁLOGO — script.js
   ============================================================ */

const STORE_KEY       = 'timpraz-products';
const ADMIN_KEY       = 'timpraz-admin-session';
const ADMIN_PASSWORD  = '0993';
const WA_NUMBER       = '51956252241';
const STORE_NAME      = 'Timpraz';
const FIXED_CATEGORIES = ['Ropa de bebé', 'Ropa deportiva', 'Ropa interior'];
const DEFAULT_PRODUCTS = [];

let products     = loadProducts();
let activeFilter = 'Todos';
let searchQuery  = '';
let tapCount     = 0;
let tapTimer     = null;
let pressTimer   = null;
let searchDebounce = null;
let deleteTarget = null;

/* ────────────────────────────────────
   PERSISTENCE
──────────────────────────────────── */
function loadProducts() {
  try {
    const saved = localStorage.getItem(STORE_KEY);
    if (!saved) {
      localStorage.setItem(STORE_KEY, JSON.stringify(DEFAULT_PRODUCTS));
      return [...DEFAULT_PRODUCTS];
    }
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [...DEFAULT_PRODUCTS];
  } catch {
    localStorage.setItem(STORE_KEY, JSON.stringify(DEFAULT_PRODUCTS));
    return [...DEFAULT_PRODUCTS];
  }
}

function persistProducts() {
  localStorage.setItem(STORE_KEY, JSON.stringify(products));
}

function nextId() {
  return products.length
    ? Math.max(...products.map(p => Number(p.id) || 0)) + 1
    : 1;
}

/* ────────────────────────────────────
   UTILS
──────────────────────────────────── */
function formatPrice(price) {
  return `S/ ${Number(price).toFixed(2)}`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#39;');
}

function isValidUrl(string) {
  try { new URL(string); return true; }
  catch { return false; }
}

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/* ────────────────────────────────────
   TOAST SYSTEM
──────────────────────────────────── */
function showToast(message, type = 'info', duration = 3200) {
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-icon" aria-hidden="true">${icons[type] || icons.info}</span><span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('leaving');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, duration);
}

/* ────────────────────────────────────
   CONFIRM DIALOG (replaces window.confirm)
──────────────────────────────────── */
function showConfirm(message, onConfirm) {
  document.getElementById('confirmMsg').textContent = message;
  document.getElementById('confirmOverlay').classList.add('open');

  const yesBtn = document.getElementById('confirmYes');
  const noBtn  = document.getElementById('confirmNo');

  const cleanup = () => {
    document.getElementById('confirmOverlay').classList.remove('open');
    yesBtn.replaceWith(yesBtn.cloneNode(true));
    noBtn.replaceWith(noBtn.cloneNode(true));
    // Re-attach cancel to the new node
    document.getElementById('confirmNo').addEventListener('click', () => {
      document.getElementById('confirmOverlay').classList.remove('open');
    });
  };

  document.getElementById('confirmYes').addEventListener('click', () => {
    cleanup();
    onConfirm();
  }, { once: true });

  document.getElementById('confirmNo').addEventListener('click', cleanup, { once: true });
}

/* ────────────────────────────────────
   MEDIA RENDERING
──────────────────────────────────── */
function renderMedia(product, size) {
  if (product.image) {
    return `<img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'emoji-fallback',textContent:'${escapeHtml(product.emoji || '📦')}'}))">`;
  }
  return `<span class="emoji-fallback"${size ? ` style="font-size:${size}"` : ''}>${escapeHtml(product.emoji || '📦')}</span>`;
}

/* ────────────────────────────────────
   IMAGE PREVIEW (admin)
──────────────────────────────────── */
function previewImageUrl() {
  const url     = document.getElementById('p-image').value.trim();
  const preview = document.getElementById('imagePreview');

  if (!url)               { preview.innerHTML = '<div class="empty">Sin imagen</div>'; return; }
  if (!isValidUrl(url))   { preview.innerHTML = '<div class="empty">URL inválida</div>'; return; }

  const img = new Image();
  img.onload = () => { preview.innerHTML = `<img src="${escapeHtml(url)}" alt="Preview">`; };
  img.onerror = () => { preview.innerHTML = '<div class="empty">No se pudo cargar</div>'; };
  img.src = url;
}

function validateEmojiInput(input) {
  const emojiRegex = /^(\p{Extended_Pictographic}|\p{Emoji_Component})*$/u;
  const value = input.value.trim();
  if (value && !emojiRegex.test(value)) {
    input.value = value.replace(/[^éáíóúñ\p{Extended_Pictographic}\p{Emoji_Component}]/gu, '');
  }
  if (input.value.length > 2) input.value = input.value.substring(0, 2);
}

/* ────────────────────────────────────
   CATEGORIES & FILTERS
──────────────────────────────────── */
function getCategories() {
  return ['Todos', ...FIXED_CATEGORIES];
}

function populateCategorySelect() {
  document.getElementById('p-cat').innerHTML = FIXED_CATEGORIES
    .map(cat => `<option value="${cat}">${cat}</option>`)
    .join('');
}

function getCountByCategory(cat) {
  if (cat === 'Todos') return products.length;
  return products.filter(p => p.cat === cat).length;
}

function renderFilters() {
  document.getElementById('filters').innerHTML = getCategories()
    .map(cat => {
      const count = getCountByCategory(cat);
      return `
        <button
          class="filter-btn ${cat === activeFilter ? 'active' : ''}"
          type="button"
          onclick="setFilter('${cat}')"
          aria-pressed="${cat === activeFilter}"
          aria-label="Filtrar por ${cat} (${count} productos)">
          ${cat}
          <span class="filter-count" aria-hidden="true">${count}</span>
        </button>`;
    })
    .join('');
}

function setFilter(cat) {
  activeFilter = cat;
  // Clear search when changing category
  if (searchQuery) {
    searchQuery = '';
    document.getElementById('searchInput').value = '';
    updateSearchClear();
  }
  renderFilters();
  renderGrid();
}

/* ────────────────────────────────────
   SEARCH
──────────────────────────────────── */
function getFilteredProducts() {
  let list = activeFilter === 'Todos'
    ? products
    : products.filter(p => p.cat === activeFilter);

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    list = list.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.short  || '').toLowerCase().includes(q) ||
      (p.desc   || '').toLowerCase().includes(q) ||
      p.cat.toLowerCase().includes(q)
    );
  }

  return list;
}

function updateSearchClear() {
  const clearBtn = document.getElementById('searchClear');
  const has = document.getElementById('searchInput').value.length > 0;
  clearBtn.classList.toggle('visible', has);
}

/* ────────────────────────────────────
   SKELETON LOADER
──────────────────────────────────── */
function renderSkeletons(n = 8) {
  const grid = document.getElementById('grid');
  grid.innerHTML = Array.from({ length: n }, () => `
    <div class="skeleton-card" aria-hidden="true">
      <div class="skeleton skeleton-img"></div>
      <div class="skeleton-body">
        <div class="skeleton skeleton-line short"></div>
        <div class="skeleton skeleton-line medium"></div>
        <div class="skeleton skeleton-line full"></div>
        <div class="skeleton skeleton-line short"></div>
      </div>
      <div class="skeleton-footer">
        <div class="skeleton skeleton-btn"></div>
        <div class="skeleton skeleton-btn"></div>
      </div>
    </div>
  `).join('');
}

/* ────────────────────────────────────
   RENDER GRID
──────────────────────────────────── */
function renderGrid() {
  const list = getFilteredProducts();
  const grid = document.getElementById('grid');
  const countEl = document.getElementById('resultCount');

  // Update count
  const isSearching = searchQuery.trim().length > 0;
  if (isSearching) {
    countEl.textContent = `${list.length} resultado${list.length !== 1 ? 's' : ''} para "${searchQuery.trim()}"`;
  } else {
    countEl.textContent = `${list.length} producto${list.length !== 1 ? 's' : ''}`;
  }

  if (!list.length) {
    grid.innerHTML = `
      <div class="empty-state" role="status">
        <div class="empty-state-icon">${isSearching ? '🔍' : '📦'}</div>
        <div class="empty-state-title">${isSearching ? 'Sin resultados' : 'Sin productos'}</div>
        <p class="empty-state-desc">${
          isSearching
            ? `No encontramos nada para <strong>"${escapeHtml(searchQuery.trim())}"</strong>. Intenta con otro término.`
            : 'No hay productos en esta categoría todavía.'
        }</p>
        ${isSearching
          ? `<button class="empty-state-action" type="button" onclick="clearSearch()">Limpiar búsqueda</button>`
          : ''}
      </div>`;
    return;
  }

  grid.innerHTML = list.map((p, i) => `
    <article
      class="card"
      onclick="openModal(${p.id})"
      style="animation-delay:${Math.min(i * 0.05, 0.4)}s"
      tabindex="0"
      role="button"
      aria-label="Ver ${escapeHtml(p.name)}, ${formatPrice(p.price)}"
      onkeydown="if(event.key==='Enter'||event.key===' ')openModal(${p.id})">
      <div class="card-img">
        ${p.nuevo ? '<span class="badge">Nuevo</span>' : ''}
        ${renderMedia(p, '3rem')}
      </div>
      <div class="card-body">
        <div class="card-cat">${escapeHtml(p.cat)}</div>
        <div class="card-name">${escapeHtml(p.name)}</div>
        <div class="card-desc">${escapeHtml(p.short || '')}</div>
        <div class="card-price">${formatPrice(p.price)}</div>
      </div>
      <div class="card-footer">
        <button class="btn-wa" type="button" onclick="event.stopPropagation();waProduct(${p.id})" aria-label="Consultar ${escapeHtml(p.name)} por WhatsApp">WhatsApp</button>
        <button class="btn-linklike" type="button" onclick="event.stopPropagation();openModal(${p.id})" aria-label="Ver detalle de ${escapeHtml(p.name)}">Detalle</button>
      </div>
    </article>
  `).join('');
}

function clearSearch() {
  searchQuery = '';
  document.getElementById('searchInput').value = '';
  updateSearchClear();
  renderGrid();
}

/* ────────────────────────────────────
   PRODUCT MODAL
──────────────────────────────────── */
function openModal(id) {
  const p = products.find(item => Number(item.id) === Number(id));
  if (!p) return;

  document.getElementById('m-media').innerHTML =
    `${p.nuevo ? '<span class="badge">Nuevo</span>' : ''}${renderMedia(p, '5rem')}`;
  document.getElementById('m-cat').textContent   = p.cat;
  document.getElementById('m-name').textContent  = p.name;
  document.getElementById('m-desc').textContent  = p.desc;
  document.getElementById('m-price').textContent = formatPrice(p.price);
  document.getElementById('m-wa').onclick = () => waProduct(id);

  const modal = document.getElementById('modal');
  modal.classList.add('open');

  // Focus the WA button
  setTimeout(() => document.getElementById('m-wa').focus(), 50);
}

function hideModal(id) {
  document.getElementById(id).classList.remove('open');
}

function closeModal(event) {
  if (event.target.id === 'modal') hideModal('modal');
}

function closeOverlay(event, id) {
  if (event.target.id === id) hideModal(id);
}

/* ────────────────────────────────────
   WHATSAPP
──────────────────────────────────── */
function waProduct(id) {
  const p = products.find(item => Number(item.id) === Number(id));
  if (!p) return;
  const msg = encodeURIComponent(
    `Hola, estoy interesado en "${p.name}" de ${STORE_NAME}. Precio: ${formatPrice(p.price)}. Quisiera más información, por favor.`
  );
  window.open(`https://wa.me/${WA_NUMBER}?text=${msg}`, '_blank');
}

function waGeneral() {
  const msg = encodeURIComponent(
    `Hola, quiero información sobre los productos de ${STORE_NAME} en Lima.`
  );
  window.open(`https://wa.me/${WA_NUMBER}?text=${msg}`, '_blank');
}

/* ────────────────────────────────────
   ADMIN AUTH
──────────────────────────────────── */
function openAdminLogin() {
  document.getElementById('loginStatus').textContent = '';
  document.getElementById('adminPassword').value    = '';
  document.getElementById('adminLoginOverlay').classList.add('open');
  setTimeout(() => document.getElementById('adminPassword').focus(), 100);
}

function triggerAdminAccess() {
  ensureAdmin();
}

function loginAdmin() {
  const loginBtn = document.getElementById('loginBtn');
  const password = document.getElementById('adminPassword').value;
  const statusEl = document.getElementById('loginStatus');

  if (password !== ADMIN_PASSWORD) {
    statusEl.textContent = 'Contraseña incorrecta.';
    statusEl.className = 'status error';
    document.getElementById('adminPassword').focus();
    // Shake animation
    const input = document.getElementById('adminPassword');
    input.style.animation = 'none';
    input.offsetHeight; // reflow
    input.style.animation = 'shake 0.35s ease';
    return;
  }

  loginBtn.textContent = 'Ingresando…';
  loginBtn.disabled    = true;

  setTimeout(() => {
    localStorage.setItem(ADMIN_KEY, 'true');
    hideModal('adminLoginOverlay');
    openAdminPanel();
    loginBtn.textContent = 'Ingresar';
    loginBtn.disabled    = false;
  }, 400);
}

function openAdminPanel() {
  renderAdminTable();
  document.getElementById('adminPanelOverlay').classList.add('open');
}

function logoutAdmin() {
  localStorage.removeItem(ADMIN_KEY);
  resetForm();
  hideModal('adminPanelOverlay');
  showToast('Sesión cerrada.', 'info');
}

function ensureAdmin() {
  if (localStorage.getItem(ADMIN_KEY) === 'true') {
    openAdminPanel();
    return true;
  }
  openAdminLogin();
  return false;
}

/* ────────────────────────────────────
   ADMIN FORM
──────────────────────────────────── */
function resetForm() {
  document.getElementById('p-id').value    = '';
  document.getElementById('p-name').value  = '';
  document.getElementById('p-price').value = '';
  document.getElementById('p-short').value = '';
  document.getElementById('p-desc').value  = '';
  document.getElementById('p-emoji').value = '';
  document.getElementById('p-image').value = '';
  document.getElementById('p-cat').value   = FIXED_CATEGORIES[0];
  document.getElementById('adminStatus').textContent = '';
  document.getElementById('adminStatus').className   = 'status';
  document.getElementById('imagePreview').innerHTML  = '<div class="empty">Sin imagen</div>';
  document.getElementById('formTitle').textContent   = 'Nuevo producto';

  // Clear field errors
  ['p-name','p-price','p-short','p-desc'].forEach(id => {
    document.getElementById(id).classList.remove('error');
  });
}

function setFormStatus(msg, type = '') {
  const el = document.getElementById('adminStatus');
  el.textContent = msg;
  el.className = `status ${type}`;
}

function validateForm() {
  const name  = document.getElementById('p-name').value.trim();
  const price = parseFloat(document.getElementById('p-price').value);
  const short = document.getElementById('p-short').value.trim();
  const desc  = document.getElementById('p-desc').value.trim();
  const image = document.getElementById('p-image').value.trim();

  let valid = true;

  const fields = [
    { id: 'p-name',  val: name,      test: v => v.length > 0 },
    { id: 'p-price', val: price,     test: v => !Number.isNaN(v) && v >= 0 },
    { id: 'p-short', val: short,     test: v => v.length > 0 },
    { id: 'p-desc',  val: desc,      test: v => v.length > 0 },
  ];

  fields.forEach(({ id, val, test }) => {
    const el = document.getElementById(id);
    if (!test(val)) {
      el.classList.add('error');
      valid = false;
    } else {
      el.classList.remove('error');
    }
  });

  if (image && !isValidUrl(image)) {
    document.getElementById('p-image').classList.add('error');
    valid = false;
    setFormStatus('URL de imagen inválida.', 'error');
    return false;
  } else {
    document.getElementById('p-image').classList.remove('error');
  }

  if (!valid) {
    setFormStatus('Completa los campos requeridos (*).', 'error');
    // Focus first error
    const firstError = document.querySelector('.panel .error');
    if (firstError) firstError.focus();
  }

  return valid;
}

function saveProduct() {
  if (localStorage.getItem(ADMIN_KEY) !== 'true') return;
  if (!validateForm()) return;

  const id    = document.getElementById('p-id').value;
  const name  = document.getElementById('p-name').value.trim();
  const price = parseFloat(document.getElementById('p-price').value);
  const cat   = document.getElementById('p-cat').value;
  const short = document.getElementById('p-short').value.trim();
  const desc  = document.getElementById('p-desc').value.trim();
  const emoji = document.getElementById('p-emoji').value.trim() || '📦';
  const image = document.getElementById('p-image').value.trim();

  const saveBtn = document.getElementById('saveBtn');
  saveBtn.disabled = true;

  const product = { id: id ? Number(id) : nextId(), name, cat, price, short, desc, emoji, image, nuevo: true };
  const existingIndex = products.findIndex(item => Number(item.id) === Number(product.id));

  if (existingIndex >= 0) {
    product.nuevo = products[existingIndex].nuevo;
    products[existingIndex] = product;
    showToast(`"${name}" actualizado correctamente.`, 'success');
  } else {
    products.unshift(product);
    showToast(`"${name}" agregado al catálogo.`, 'success');
  }

  persistProducts();
  renderFilters();
  renderGrid();
  renderAdminTable();
  resetForm();
  saveBtn.disabled = false;
}

function editProduct(id) {
  const p = products.find(item => Number(item.id) === Number(id));
  if (!p) return;

  document.getElementById('p-id').value    = p.id;
  document.getElementById('p-name').value  = p.name;
  document.getElementById('p-price').value = p.price;
  document.getElementById('p-cat').value   = p.cat;
  document.getElementById('p-short').value = p.short  || '';
  document.getElementById('p-desc').value  = p.desc   || '';
  document.getElementById('p-emoji').value = p.emoji  || '';
  document.getElementById('p-image').value = p.image  || '';
  document.getElementById('formTitle').textContent = `Editando: ${p.name}`;
  setFormStatus('', '');
  previewImageUrl();

  // Scroll form into view on mobile
  document.querySelector('.panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function deleteProduct(id) {
  if (localStorage.getItem(ADMIN_KEY) !== 'true') return;
  const p = products.find(item => Number(item.id) === Number(id));
  if (!p) return;

  showConfirm(`¿Deseas eliminar "${p.name}"? Esta acción no se puede deshacer.`, () => {
    products = products.filter(item => Number(item.id) !== Number(id));
    persistProducts();
    renderFilters();
    renderGrid();
    renderAdminTable();
    resetForm();
    showToast(`"${p.name}" eliminado.`, 'info');
  });
}

/* ────────────────────────────────────
   ADMIN TABLE
──────────────────────────────────── */
function renderAdminTable(filterQuery = '') {
  const body      = document.getElementById('adminTable');
  const emptyEl   = document.getElementById('tableEmpty');
  const countEl   = document.getElementById('tableCount');

  let list = products;
  if (filterQuery.trim()) {
    const q = filterQuery.toLowerCase();
    list = products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.cat.toLowerCase().includes(q)
    );
  }

  countEl.textContent = `${list.length} de ${products.length} producto${products.length !== 1 ? 's' : ''}`;

  if (!list.length) {
    body.innerHTML = '';
    emptyEl.hidden = false;
    return;
  }

  emptyEl.hidden = true;
  body.innerHTML = list.map(p => `
    <tr>
      <td>
        <div class="table-product">
          <div class="thumb">
            ${p.image
              ? `<img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" loading="lazy" onerror="this.replaceWith(document.createTextNode('${escapeHtml(p.emoji || '📦')}'))">`
              : `<span>${escapeHtml(p.emoji || '📦')}</span>`}
          </div>
          <div>
            <strong>${escapeHtml(p.name)}</strong>
            <div class="helper">${escapeHtml(p.short || '')}</div>
          </div>
        </div>
      </td>
      <td>${escapeHtml(p.cat)}</td>
      <td>${formatPrice(p.price)}</td>
      <td>
        <div class="mini-actions">
          <button class="btn-secondary" type="button" onclick="editProduct(${p.id})" aria-label="Editar ${escapeHtml(p.name)}">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Editar
          </button>
          <button class="btn-danger" type="button" onclick="deleteProduct(${p.id})" aria-label="Eliminar ${escapeHtml(p.name)}">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
            Eliminar
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

/* ────────────────────────────────────
   HEADER SCROLL EFFECT
──────────────────────────────────── */
window.addEventListener('scroll', () => {
  document.querySelector('header').classList.toggle('scrolled', window.scrollY > 10);
}, { passive: true });

/* ────────────────────────────────────
   SEARCH BAR TOGGLE
──────────────────────────────────── */
const searchToggle = document.getElementById('searchToggle');
const searchBar    = document.getElementById('searchBar');
const searchInput  = document.getElementById('searchInput');
const searchClear  = document.getElementById('searchClear');

searchToggle.addEventListener('click', () => {
  const isOpen = searchBar.classList.toggle('open');
  searchToggle.classList.toggle('active', isOpen);
  searchToggle.setAttribute('aria-expanded', String(isOpen));
  searchBar.setAttribute('aria-hidden', String(!isOpen));

  if (isOpen) {
    searchInput.setAttribute('tabindex', '0');
    searchClear.setAttribute('tabindex', '0');
    setTimeout(() => searchInput.focus(), 100);
  } else {
    searchInput.setAttribute('tabindex', '-1');
    searchClear.setAttribute('tabindex', '-1');
    clearSearch();
  }
});

searchInput.addEventListener('input', () => {
  updateSearchClear();
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    searchQuery = searchInput.value;
    renderGrid();
  }, 220);
});

searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    searchToggle.click();
    searchToggle.focus();
  }
});

searchClear.addEventListener('click', () => {
  clearSearch();
  searchInput.focus();
});

/* ────────────────────────────────────
   PASSWORD TOGGLE
──────────────────────────────────── */
document.getElementById('togglePassword').addEventListener('click', () => {
  const input = document.getElementById('adminPassword');
  const isText = input.type === 'text';
  input.type = isText ? 'password' : 'text';
  document.getElementById('togglePassword').setAttribute('aria-label',
    isText ? 'Mostrar contraseña' : 'Ocultar contraseña');
});

/* ────────────────────────────────────
   ADMIN TABLE FILTER
──────────────────────────────────── */
document.getElementById('adminSearch').addEventListener('input', debounce(function () {
  renderAdminTable(this.value);
}, 180));

/* ────────────────────────────────────
   SECRET ADMIN TRIGGER
──────────────────────────────────── */
const secretTrigger = document.getElementById('secretTrigger');

secretTrigger.addEventListener('click', () => {
  tapCount += 1;
  clearTimeout(tapTimer);
  tapTimer = setTimeout(() => { tapCount = 0; }, 1800);
  if (tapCount >= 5) {
    tapCount = 0;
    triggerAdminAccess();
  }
});

secretTrigger.addEventListener('dblclick', () => triggerAdminAccess());

function startPressAccess() {
  clearTimeout(pressTimer);
  pressTimer = setTimeout(() => triggerAdminAccess(), 1200);
}

function cancelPressAccess() { clearTimeout(pressTimer); }

secretTrigger.addEventListener('mousedown',   startPressAccess);
secretTrigger.addEventListener('mouseup',     cancelPressAccess);
secretTrigger.addEventListener('mouseleave',  cancelPressAccess);
secretTrigger.addEventListener('touchstart',  startPressAccess,  { passive: true });
secretTrigger.addEventListener('touchend',    cancelPressAccess);
secretTrigger.addEventListener('touchcancel', cancelPressAccess);

/* ────────────────────────────────────
   KEYBOARD SHORTCUTS
──────────────────────────────────── */
document.addEventListener('keydown', (e) => {
  if (e.altKey && e.shiftKey && e.key.toLowerCase() === 'a') {
    triggerAdminAccess();
  }

  if (e.key === 'Escape') {
    hideModal('modal');
    hideModal('adminLoginOverlay');
    hideModal('confirmOverlay');

    // Close search if open
    if (searchBar.classList.contains('open')) {
      searchToggle.click();
    }
  }

  // Cmd/Ctrl+K = open search
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    if (!searchBar.classList.contains('open')) {
      searchToggle.click();
    } else {
      searchInput.focus();
    }
  }
});

/* ────────────────────────────────────
   LOGIN ON ENTER KEY
──────────────────────────────────── */
document.getElementById('adminPassword').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') loginAdmin();
});

/* ────────────────────────────────────
   HASH-BASED ADMIN
──────────────────────────────────── */
if (window.location.hash === '#admin') {
  setTimeout(() => triggerAdminAccess(), 250);
}

/* ────────────────────────────────────
   SHAKE KEYFRAME (injected)
──────────────────────────────────── */
const shakeStyle = document.createElement('style');
shakeStyle.textContent = `
  @keyframes shake {
    0%,100% { transform: translateX(0); }
    20% { transform: translateX(-6px); }
    40% { transform: translateX(6px); }
    60% { transform: translateX(-4px); }
    80% { transform: translateX(4px); }
  }
`;
document.head.appendChild(shakeStyle);

/* ────────────────────────────────────
   INIT
──────────────────────────────────── */
populateCategorySelect();
resetForm();
renderFilters();

// Tiny skeleton flash for perceived performance
renderSkeletons(8);
setTimeout(() => renderGrid(), 180);

document.getElementById('p-image').addEventListener('input', previewImageUrl);
document.getElementById('p-emoji').addEventListener('input', (e) => validateEmojiInput(e.target));
