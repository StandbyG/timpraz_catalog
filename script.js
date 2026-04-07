const STORE_KEY = 'timpraz-products';
const ADMIN_KEY = 'timpraz-admin-session';
const ADMIN_PASSWORD = '0993';
const WA_NUMBER = '51956252241';
const STORE_NAME = 'Timpraz';
const FIXED_CATEGORIES = ['Ropa de bebe','Ropa deportiva','Ropa interior'];
const DEFAULT_PRODUCTS = [];

let products = loadProducts();
let activeFilter = 'Todos';
let tapCount = 0;
let tapTimer = null;
let pressTimer = null;

function loadProducts(){
  const saved = localStorage.getItem(STORE_KEY);
  if(!saved){
    localStorage.setItem(STORE_KEY, JSON.stringify(DEFAULT_PRODUCTS));
    return [...DEFAULT_PRODUCTS];
  }
  try{
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [...DEFAULT_PRODUCTS];
  }catch{
    localStorage.setItem(STORE_KEY, JSON.stringify(DEFAULT_PRODUCTS));
    return [...DEFAULT_PRODUCTS];
  }
}

function persistProducts(){
  localStorage.setItem(STORE_KEY, JSON.stringify(products));
}

function nextId(){
  return products.length ? Math.max(...products.map(p=>Number(p.id)||0)) + 1 : 1;
}

function formatPrice(price){
  return `S/ ${Number(price).toFixed(2)}`;
}

function renderMedia(product,size){
  if(product.image){
    return `<img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" onerror="this.remove();this.parentNode.innerHTML='<span class=&quot;emoji-fallback&quot;>${escapeHtml(product.emoji || '📦')}</span>';">`;
  }
  return `<span class="emoji-fallback"${size ? ` style="font-size:${size}"` : ''}>${escapeHtml(product.emoji || '📦')}</span>`;
}

function escapeHtml(value){
  return String(value)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}

function isValidUrl(string){
  try{
    new URL(string);
    return true;
  }catch(_){
    return false;
  }
}

function previewImageUrl(){
  const url = document.getElementById('p-image').value.trim();
  const preview = document.getElementById('imagePreview');
  if(!url){
    preview.innerHTML = '<div class="empty">Sin imagen</div>';
    return;
  }
  if(!isValidUrl(url)){
    preview.innerHTML = '<div class="empty">URL inválida</div>';
    return;
  }
  const img = new Image();
  img.onload = () => {
    preview.innerHTML = `<img src="${escapeHtml(url)}" alt="Preview">`;
  };
  img.onerror = () => {
    preview.innerHTML = '<div class="empty">No se pudo cargar la imagen</div>';
  };
  img.src = url;
}

function validateEmojiInput(input){
  const value = input.value.trim();
  const emojiRegex = /^(\p{Extended_Pictographic}|\p{Emoji_Component})*$/u;
  if(value && !emojiRegex.test(value)){
    input.value = value.replace(/[^éáíóúñ\p{Extended_Pictographic}\p{Emoji_Component}]/gu, '');
  }
  if(input.value.length > 2){
    input.value = input.value.substring(0, 2);
  }
}

function getCategories(){
  return ['Todos', ...FIXED_CATEGORIES];
}

function populateCategorySelect(){
  document.getElementById('p-cat').innerHTML = FIXED_CATEGORIES.map(cat => `<option value="${cat}">${cat}</option>`).join('');
}

function renderFilters(){
  document.getElementById('filters').innerHTML = getCategories().map(cat => `
    <button class="filter-btn ${cat===activeFilter?'active':''}" type="button" onclick="setFilter('${cat}')">${cat}</button>
  `).join('');
}

function setFilter(cat){
  activeFilter = cat;
  renderFilters();
  renderGrid();
}

function renderGrid(){
  const list = activeFilter === 'Todos' ? products : products.filter(p => p.cat === activeFilter);
  const grid = document.getElementById('grid');
  if(!list.length){
    grid.innerHTML = '<div class="empty">No hay productos en esta categoria.</div>';
    return;
  }
  grid.innerHTML = list.map(p => `
    <article class="card" onclick="openModal(${p.id})">
      <div class="card-img">
        ${p.nuevo ? '<span class="badge">Nuevo</span>' : ''}
        ${renderMedia(p,'3rem')}
      </div>
      <div class="card-body">
        <div class="card-cat">${escapeHtml(p.cat)}</div>
        <div class="card-name">${escapeHtml(p.name)}</div>
        <div class="card-desc">${escapeHtml(p.short || '')}</div>
        <div class="card-price">${formatPrice(p.price)}</div>
      </div>
      <div class="card-footer">
        <button class="btn-wa" type="button" onclick="event.stopPropagation();waProduct(${p.id})">WhatsApp</button>
        <button class="btn-linklike" type="button" onclick="event.stopPropagation();openModal(${p.id})">Detalle</button>
      </div>
    </article>
  `).join('');
}

function openModal(id){
  const p = products.find(item => Number(item.id) === Number(id));
  if(!p) return;
  document.getElementById('m-media').innerHTML = `${p.nuevo ? '<span class="badge">Nuevo</span>' : ''}${renderMedia(p,'5rem')}`;
  document.getElementById('m-cat').textContent = p.cat;
  document.getElementById('m-name').textContent = p.name;
  document.getElementById('m-desc').textContent = p.desc;
  document.getElementById('m-price').textContent = formatPrice(p.price);
  document.getElementById('m-wa').onclick = () => waProduct(id);
  document.getElementById('modal').classList.add('open');
}

function hideModal(id){
  document.getElementById(id).classList.remove('open');
}

function closeModal(event){
  if(event.target.id === 'modal') hideModal('modal');
}

function closeOverlay(event,id){
  if(event.target.id === id) hideModal(id);
}

function waProduct(id){
  const p = products.find(item => Number(item.id) === Number(id));
  if(!p) return;
  const msg = encodeURIComponent(`Hola, estoy interesado en "${p.name}" de ${STORE_NAME}. Precio: ${formatPrice(p.price)}. Quisiera mas informacion, por favor.`);
  window.open(`https://wa.me/${WA_NUMBER}?text=${msg}`,'_blank');
}

function waGeneral(){
  const msg = encodeURIComponent(`Hola, quiero informacion sobre los productos de ${STORE_NAME} en Lima.`);
  window.open(`https://wa.me/${WA_NUMBER}?text=${msg}`,'_blank');
}

function openAdminLogin(){
  document.getElementById('loginStatus').textContent = '';
  document.getElementById('adminPassword').value = '';
  document.getElementById('adminLoginOverlay').classList.add('open');
}

function triggerAdminAccess(){
  ensureAdmin();
}

function loginAdmin(){
  const password = document.getElementById('adminPassword').value;
  if(password !== ADMIN_PASSWORD){
    document.getElementById('loginStatus').textContent = 'Contrasena incorrecta.';
    return;
  }
  localStorage.setItem(ADMIN_KEY,'true');
  hideModal('adminLoginOverlay');
  openAdminPanel();
}

function openAdminPanel(){
  renderAdminTable();
  document.getElementById('adminPanelOverlay').classList.add('open');
}

function logoutAdmin(){
  localStorage.removeItem(ADMIN_KEY);
  resetForm();
  hideModal('adminPanelOverlay');
}

function ensureAdmin(){
  if(localStorage.getItem(ADMIN_KEY) === 'true'){
    openAdminPanel();
    return true;
  }
  openAdminLogin();
  return false;
}

function resetForm(){
  document.getElementById('p-id').value = '';
  document.getElementById('p-name').value = '';
  document.getElementById('p-price').value = '';
  document.getElementById('p-short').value = '';
  document.getElementById('p-desc').value = '';
  document.getElementById('p-emoji').value = '';
  document.getElementById('p-image').value = '';
  document.getElementById('p-cat').value = FIXED_CATEGORIES[0];
  document.getElementById('adminStatus').textContent = '';
  document.getElementById('imagePreview').innerHTML = '<div class="empty">Sin imagen</div>';
}

function saveProduct(){
  if(localStorage.getItem(ADMIN_KEY) !== 'true') return;
  const id = document.getElementById('p-id').value;
  const name = document.getElementById('p-name').value.trim();
  const price = parseFloat(document.getElementById('p-price').value);
  const cat = document.getElementById('p-cat').value;
  const short = document.getElementById('p-short').value.trim();
  const desc = document.getElementById('p-desc').value.trim();
  const emoji = document.getElementById('p-emoji').value.trim() || '📦';
  let image = document.getElementById('p-image').value.trim();

  if(!name || Number.isNaN(price) || !short || !desc){
    document.getElementById('adminStatus').textContent = 'Completa nombre, precio y descripciones.';
    return;
  }

  if(image && !isValidUrl(image)){
    document.getElementById('adminStatus').textContent = 'URL de imagen inválida.';
    return;
  }

  const product = {id:id ? Number(id) : nextId(),name,cat,price,short,desc,emoji,image,nuevo:true};
  const existingIndex = products.findIndex(item => Number(item.id) === Number(product.id));
  if(existingIndex >= 0){
    product.nuevo = products[existingIndex].nuevo;
    products[existingIndex] = product;
    document.getElementById('adminStatus').textContent = 'Producto actualizado correctamente.';
  }else{
    products.unshift(product);
    document.getElementById('adminStatus').textContent = 'Producto agregado correctamente.';
  }
  persistProducts();
  renderFilters();
  renderGrid();
  renderAdminTable();
  resetForm();
}

function editProduct(id){
  const p = products.find(item => Number(item.id) === Number(id));
  if(!p) return;
  document.getElementById('p-id').value = p.id;
  document.getElementById('p-name').value = p.name;
  document.getElementById('p-price').value = p.price;
  document.getElementById('p-cat').value = p.cat;
  document.getElementById('p-short').value = p.short || '';
  document.getElementById('p-desc').value = p.desc || '';
  document.getElementById('p-emoji').value = p.emoji || '';
  document.getElementById('p-image').value = p.image || '';
  document.getElementById('adminStatus').textContent = `Editando: ${p.name}`;
  previewImageUrl();
}

function deleteProduct(id){
  if(localStorage.getItem(ADMIN_KEY) !== 'true') return;
  const p = products.find(item => Number(item.id) === Number(id));
  if(!p) return;
  if(!window.confirm(`Deseas eliminar "${p.name}"?`)) return;
  products = products.filter(item => Number(item.id) !== Number(id));
  persistProducts();
  renderFilters();
  renderGrid();
  renderAdminTable();
  resetForm();
  document.getElementById('adminStatus').textContent = 'Producto eliminado.';
}

function renderAdminTable(){
  const body = document.getElementById('adminTable');
  body.innerHTML = products.map(p => `
    <tr>
      <td>
        <div class="table-product">
          <div class="thumb">${p.image ? `<img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" onerror="this.innerHTML='<span>${escapeHtml(p.emoji || '📦')}</span>';">` : `<span>${escapeHtml(p.emoji || '📦')}</span>`}</div>
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
          <button class="btn-secondary" type="button" onclick="editProduct(${p.id})">Editar</button>
          <button class="btn-danger" type="button" onclick="deleteProduct(${p.id})">Eliminar</button>
        </div>
      </td>
    </tr>
  `).join('');
}

const secretTrigger = document.getElementById('secretTrigger');

secretTrigger.addEventListener('click', () => {
  tapCount += 1;
  clearTimeout(tapTimer);
  tapTimer = setTimeout(() => { tapCount = 0; }, 1800);
  if(tapCount >= 5){
    tapCount = 0;
    triggerAdminAccess();
  }
});

secretTrigger.addEventListener('dblclick', () => {
  triggerAdminAccess();
});

function startPressAccess(){
  clearTimeout(pressTimer);
  pressTimer = setTimeout(() => {
    triggerAdminAccess();
  }, 1200);
}

function cancelPressAccess(){
  clearTimeout(pressTimer);
}

secretTrigger.addEventListener('mousedown', startPressAccess);
secretTrigger.addEventListener('mouseup', cancelPressAccess);
secretTrigger.addEventListener('mouseleave', cancelPressAccess);
secretTrigger.addEventListener('touchstart', startPressAccess, { passive: true });
secretTrigger.addEventListener('touchend', cancelPressAccess);
secretTrigger.addEventListener('touchcancel', cancelPressAccess);

document.addEventListener('keydown', (event) => {
  if(event.altKey && event.shiftKey && event.key.toLowerCase() === 'a'){
    triggerAdminAccess();
  }
  if(event.key === 'Escape'){
    hideModal('modal');
    hideModal('adminLoginOverlay');
  }
});

if(window.location.hash === '#admin'){
  setTimeout(() => {
    triggerAdminAccess();
  }, 250);
}

populateCategorySelect();
resetForm();
renderFilters();
renderGrid();

document.getElementById('p-image').addEventListener('input', previewImageUrl);
document.getElementById('p-emoji').addEventListener('input', (e) => validateEmojiInput(e.target));
