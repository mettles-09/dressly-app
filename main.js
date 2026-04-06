// ======== STATE ========
const EMOJIS = {
  'Shirt': ['👔','👕','🎽','👚'],
  'T-Shirt': ['👕','🎽'],
  'Winter (Jacket/Sweater)': ['🧥','🥼','🧣','🧤'],
  'Bottom': ['👖','🩳','👗','🩲'],
  'Footwear': ['👟','👞','🥾','👠','👡','🩴'],
  'Accessory': ['👒','🎩','💍','👜','🕶️','⌚', '🧣']
};

let wardrobe = JSON.parse(localStorage.getItem('dressly-wardrobe') || '[]');
let user = JSON.parse(localStorage.getItem('dressly-user') || 'null');
let selectedEmoji = '👕';
let clothingPhotoData = null; // base64 of processed clothing image
let savedOutfits = JSON.parse(localStorage.getItem('dressly-saved-outfits') || '[]');
let currentOutfits = []; // temporary holder for the latest AI suggestions
let editingIdx = null;
let categoryOrder = JSON.parse(localStorage.getItem('dressly-category-order') || '["Shirt", "T-Shirt", "Winter (Jacket/Sweater)", "Bottom", "Footwear", "Accessory"]');
let draggedItem = null;
let draggedCategory = null;

// ======== LOGIN ========
let loginStep = 0;

function setDot(n) {
  document.querySelectorAll('.dot').forEach((d, i) => d.classList.toggle('active', i === n));
}

function loginStep1() {
  const name = document.getElementById('l-name').value.trim();
  const email = document.getElementById('l-email').value.trim();
  if (!name) { showToast('Please enter your name'); return; }
  if (!email || !email.includes('@')) { showToast('Please enter a valid email'); return; }
  loginStep = 1;
  document.getElementById('step-0').classList.remove('active');
  document.getElementById('step-1').classList.add('active');
  setDot(1);
}

function loginStep2() {
  loginStep = 2;
  document.getElementById('step-1').classList.remove('active');
  document.getElementById('step-2').classList.add('active');
  setDot(2);
}

function handleProfilePhoto(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const area = document.getElementById('profile-upload-area');
    const preview = document.getElementById('profile-photo-preview');
    preview.innerHTML = `<img class="photo-preview" src="${e.target.result}" />
      <p style="font-size:12px;color:var(--sage)">Looking great! ✓</p>`;
    user = user || {};
    user.photoData = e.target.result;
  };
  reader.readAsDataURL(file);
}

function finishLogin() {
  const name = document.getElementById('l-name').value.trim() || 'Friend';
  const email = document.getElementById('l-email').value.trim() || '';
  user = {
    name,
    email,
    age: document.getElementById('l-age').value || '',
    gender: document.getElementById('l-gender').value,
    height: document.getElementById('l-height').value,
    build: document.getElementById('l-build').value,
    skin: document.getElementById('l-skin').value,
    photoData: user?.photoData || null,
  };
  localStorage.setItem('dressly-user', JSON.stringify(user));
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  initApp();
}

function initApp() {
  // Nav avatar
  const initials = user.name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
  const navAvatar = document.getElementById('nav-avatar');
  const navInitials = document.getElementById('nav-initials');
  if (user.photoData) {
    navAvatar.innerHTML = `<img src="${user.photoData}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
  } else {
    navInitials.textContent = initials;
  }

  // Profile page
  document.getElementById('profile-name-display').textContent = user.name;
  document.getElementById('profile-email-display').textContent = user.email;
  document.getElementById('profile-initials-large').textContent = initials;
  if (user.photoData) {
    document.getElementById('profile-avatar-display').innerHTML = `<img src="${user.photoData}">`;
  }
  // Sync profile fields
  if (user.age) document.getElementById('p-age').value = user.age;
  document.getElementById('p-gender').value = user.gender || 'Man';
  document.getElementById('p-height').value = user.height || "5'5\" – 5'8\"";
  document.getElementById('p-build').value = user.build || 'Average';
  document.getElementById('p-skin').value = user.skin || 'Medium / wheatish';

  // Show photo analysis if photo uploaded
  if (user.photoData) showPhotoAnalysis();

  // Migrate old categories to new ones
  let migrated = false;
  wardrobe.forEach(item => {
    const oldCat = item.category;
    if (oldCat === 'Top' || oldCat === 'Dress / Kurta' || oldCat === 'Ethnic wear') {
      const name = (item.name || '').toLowerCase();
      if (name.includes('sweater') || name.includes('hoodie') || name.includes('jacket') || name.includes('coat')) {
        item.category = 'Winter (Jacket/Sweater)';
      } else if (name.includes('tee') || name.includes('t-shirt') || name.includes('polo')) {
        item.category = 'T-Shirt';
      } else {
        item.category = 'Shirt';
      }
      migrated = true;
    } else if (oldCat === 'Jacket / Blazer') {
      item.category = 'Winter (Jacket/Sweater)'; migrated = true;
    } else if (oldCat === 'Shoes') {
      item.category = 'Footwear'; migrated = true;
    }
  });
  if (migrated) localStorage.setItem('dressly-wardrobe', JSON.stringify(wardrobe));

  updateProfileStats();
  renderWardrobe();
  renderSavedOutfits();
  renderEmojiGrid('Shirt');
  renderDiscoverFocusOptions();
}

function showPhotoAnalysis() {
  // Sample AI-style analysis based on user profile
  const analyses = {
    'Very fair': 'Jewel tones like emerald, navy, and burgundy will complement your fair complexion beautifully. Avoid washed-out pastels close to your face.',
    'Fair': 'Warm earthy tones and soft blues work wonderfully. Coral and warm pinks will bring out natural warmth in your skin.',
    'Medium / wheatish': 'You have the most versatile skin tone — almost any colour palette works well. Deep jewel tones and warm earthy hues look especially striking.',
    'Olive / tan': 'Earth tones, mustard, olive, and rust tones complement your complexion. White and off-white create a beautiful contrast.',
    'Dark / deep': 'Bold, rich colours — cobalt, fuchsia, bright white — look spectacular against your skin. Avoid overly muted or washed-out tones.',
  };
  const skin = user.skin || 'Medium / wheatish';
  const text = analyses[skin] || analyses['Medium / wheatish'];
  document.getElementById('photo-analysis-text').textContent = text;
  document.getElementById('photo-analysis').classList.add('show');
}

// ======== CLOTHING PHOTO PROCESSING ========
function handleClothingPhoto(input) {
  const file = input.files[0];
  if (!file) return;

  document.getElementById('processing-indicator').style.display = 'block';
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => processClothingImage(img);
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function processClothingImage(img) {
  const canvas = document.getElementById('processing-canvas');
  // Target: 300x400 (3:4 ratio)
  const TW = 300, TH = 400;
  canvas.width = TW; canvas.height = TH;
  const ctx = canvas.getContext('2d');

  // White background
  ctx.fillStyle = '#F8F4EF';
  ctx.fillRect(0, 0, TW, TH);

  // Scale image to fit within 3:4, centred, with 16px padding
  const PAD = 16;
  const maxW = TW - PAD * 2;
  const maxH = TH - PAD * 2;
  const scale = Math.min(maxW / img.width, maxH / img.height);
  const sw = img.width * scale;
  const sh = img.height * scale;
  const sx = (TW - sw) / 2;
  const sy = (TH - sh) / 2;

  ctx.drawImage(img, sx, sy, sw, sh);

  // Soft vignette to soften edges
  const grad = ctx.createRadialGradient(TW/2, TH/2, Math.min(TW,TH)*0.3, TW/2, TH/2, Math.max(TW,TH)*0.75);
  grad.addColorStop(0, 'rgba(248,244,239,0)');
  grad.addColorStop(1, 'rgba(248,244,239,0.45)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, TW, TH);

  // Show in the upload widget
  const uploadCanvas = document.getElementById('cloth-canvas');
  uploadCanvas.width = TW; uploadCanvas.height = TH;
  uploadCanvas.getContext('2d').drawImage(canvas, 0, 0);
  uploadCanvas.style.display = 'block';

  const uploadArea = document.getElementById('cloth-photo-upload');
  uploadArea.classList.add('has-image');

  // Store as base64
  clothingPhotoData = canvas.toDataURL('image/jpeg', 0.85);

  // Clear emoji selection since photo is used
  selectedEmoji = null;
  document.querySelectorAll('.emoji-btn').forEach(b => b.classList.remove('selected'));

  document.getElementById('processing-indicator').style.display = 'none';
  document.getElementById('processing-indicator').innerHTML = '<span class="processing-badge">✓ Processed</span>';
  document.getElementById('processing-indicator').style.display = 'block';
}

// ======== WARDROBE ========
function saveWardrobe() {
  localStorage.setItem('dressly-wardrobe', JSON.stringify(wardrobe));
  updateProfileStats();
  renderWardrobe();
  renderDiscoverFocusOptions();
}

function renderWardrobe() {
  const container = document.getElementById('wardrobe-content');
  const statsBar = document.getElementById('stats-bar');
  if (wardrobe.length === 0) {
    statsBar.style.display = 'none';
    container.innerHTML = `<div class="wardrobe-empty">
      <div class="icon">👗</div>
      <h3>Your wardrobe is empty</h3>
      <p style="margin-bottom:20px">Add your first item to get started</p>
      <button class="btn btn-primary" style="width:auto;padding:12px 28px" onclick="openModal()">Add clothes</button>
    </div>`;
    return;
  }
  statsBar.style.display = 'flex';
  document.getElementById('stat-total').textContent = wardrobe.length;
  const cats = [...new Set(wardrobe.map(i => i.category))];
  document.getElementById('stat-categories').innerHTML = `<b>${cats.length}</b> categories`;

  const grouped = {};
  wardrobe.forEach((item, idx) => {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push({ ...item, origIdx: idx });
  });

  const categoriesToRender = categoryOrder.filter(c => grouped[c]?.length > 0);
  cats.forEach(c => { if (!categoryOrder.includes(c)) categoriesToRender.push(c); });

  let html = '';
  categoriesToRender.forEach(cat => {
    html += `<div class="category-block" draggable="true" data-cat="${cat}">
      <div class="category-header">
        <div class="drag-handle" title="Drag to reorder category">⋮⋮</div>
        <h3>${cat}</h3>
      </div>
      <div class="wardrobe-grid" data-cat="${cat}">`;
    grouped[cat].forEach(item => {
      const idx = item.origIdx;
      const imgContent = item.photoData
        ? `<img src="${item.photoData}" alt="${item.name}">`
        : item.emoji;
      html += `<div class="clothing-card" draggable="true" data-idx="${idx}">
        <button class="remove-btn" onclick="removeItem(${idx})">×</button>
        <div class="clothing-img">${imgContent}</div>
        <div class="clothing-info">
          <div class="clothing-name">${item.name}</div>
          ${item.color ? `<div style="font-size:11px;color:var(--muted);margin-top:3px">${item.color}</div>` : ''}
        </div>
        <button class="edit-btn" onclick="openModal(${idx}); event.stopPropagation();">✎</button>
      </div>`;
    });
    html += `</div></div>`;
  });

  html += `<div style="margin-top: 32px; text-align:center;">
    <button class="btn btn-primary" style="padding:12px 28px; width:auto; border-radius:30px; box-shadow:0 4px 12px rgba(0,0,0,0.1);" onclick="openModal()">+ Add New Item</button>
  </div>`;
  
  container.innerHTML = html;
}

function removeItem(idx) {
  wardrobe.splice(idx, 1);
  saveWardrobe();
  showToast('Item removed');
}

function updateProfileStats() {
  document.getElementById('pstat-items').textContent = wardrobe.length;
  document.getElementById('pstat-outfits').textContent = savedOutfits.length;
}

function renderDiscoverFocusOptions() {
  const select = document.getElementById('ctx-discover-focus');
  if (!select) return;
  let html = '<option value="">Any item in wardrobe</option>';
  wardrobe.forEach(item => {
    html += `<option value="${item.name}">${item.emoji || '👗'} ${item.name}</option>`;
  });
  select.innerHTML = html;
}

// ======== ADD / EDIT MODAL ========
function openModal(idx) {
  if (typeof idx === 'number') {
    editingIdx = idx;
    const item = wardrobe[idx];
    document.getElementById('item-name').value = item.name || '';
    document.getElementById('item-category').value = item.category || 'Shirt';
    document.getElementById('item-color').value = item.color || '';
    document.getElementById('item-notes').value = item.notes || '';
    document.getElementById('modal-submit-btn').textContent = 'Save changes';
    document.querySelector('.modal h3').textContent = 'Edit item';
    
    selectedEmoji = item.emoji || '👕';
    clothingPhotoData = item.photoData || null;

    const upload = document.getElementById('cloth-photo-upload');
    const c = document.getElementById('cloth-canvas');
    if (clothingPhotoData) {
      upload.classList.add('has-image');
      const img = new Image();
      img.onload = () => {
        c.width = 300; c.height = 400;
        c.getContext('2d').drawImage(img, 0, 0, 300, 400);
        c.style.display = 'block';
      };
      img.src = clothingPhotoData;
    } else {
      upload.classList.remove('has-image');
      c.style.display = 'none';
      renderEmojiGrid(item.category);
    }
  } else {
    editingIdx = null;
    selectedEmoji = '👕';
    clothingPhotoData = null;
    document.getElementById('item-name').value = '';
    document.getElementById('item-category').value = 'Shirt';
    document.getElementById('item-color').value = '';
    document.getElementById('item-notes').value = '';
    document.getElementById('modal-submit-btn').textContent = 'Add item';
    document.querySelector('.modal h3').textContent = 'Add to wardrobe';
    
    const upload = document.getElementById('cloth-photo-upload');
    upload.classList.remove('has-image');
    document.getElementById('cloth-canvas').style.display = 'none';
    renderEmojiGrid('Shirt');
  }
  document.getElementById('processing-indicator').style.display = 'none';
  document.getElementById('modal').classList.add('open');
}
function closeModal() { document.getElementById('modal').classList.remove('open'); }
function closeModalIfBg(e) { if (e.target.id === 'modal') closeModal(); }

function renderEmojiGrid(cat) {
  const emojis = EMOJIS[cat] || EMOJIS['Top'];
  document.getElementById('emoji-grid').innerHTML = emojis.map(e =>
    `<button class="emoji-btn${e === selectedEmoji ? ' selected' : ''}" onclick="selectEmoji('${e}', this)">${e}</button>`
  ).join('');
}

document.getElementById('item-category').onchange = function() {
  renderEmojiGrid(this.value);
  selectedEmoji = (EMOJIS[this.value] || EMOJIS['Shirt'])[0];
};

function selectEmoji(e, btn) {
  // Selecting emoji clears photo
  clothingPhotoData = null;
  const upload = document.getElementById('cloth-photo-upload');
  upload.classList.remove('has-image');
  document.getElementById('cloth-canvas').style.display = 'none';
  document.getElementById('processing-indicator').style.display = 'none';
  selectedEmoji = e;
  document.querySelectorAll('.emoji-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
}

function saveModalItem() {
  const name = document.getElementById('item-name').value.trim();
  if (!name) { showToast('Please give your item a name'); return; }
  
  const newItem = {
    emoji: clothingPhotoData ? null : (selectedEmoji || '👕'),
    photoData: clothingPhotoData || null,
    name,
    category: document.getElementById('item-category').value,
    color: document.getElementById('item-color').value.trim(),
    notes: document.getElementById('item-notes').value.trim(),
  };

  if (editingIdx !== null) {
    wardrobe[editingIdx] = newItem;
    showToast('Item updated ✓');
  } else {
    wardrobe.push(newItem);
    showToast('Added to wardrobe ✓');
  }
  saveWardrobe();
  closeModal();
}

// ======== AI SUGGESTIONS ========
async function getSuggestions() {
  if (wardrobe.length < 2) { showToast('Add at least 2 items to your wardrobe first'); return; }
  const btn = document.getElementById('suggest-btn');
  const panel = document.getElementById('results-panel');
  btn.disabled = true;
  btn.innerHTML = '<span class="btn-spinner"></span> Styling…';

  const msgs = ['Reading your wardrobe…', 'Considering your profile…', 'Mixing and matching…', 'Almost ready…'];
  let mi = 0;
  panel.innerHTML = `<div class="loading-state"><div class="spinner"></div><p id="loading-msg">${msgs[0]}</p></div>`;
  const iv = setInterval(() => {
    mi = (mi + 1) % msgs.length;
    const el = document.getElementById('loading-msg');
    if (el) el.textContent = msgs[mi];
  }, 1600);

  const city = document.getElementById('ctx-city').value || 'unspecified city';
  const occasion = document.getElementById('ctx-occasion').value;
  const mood = document.getElementById('ctx-mood').value;
  const count = document.getElementById('ctx-count').value;

  const profile = {
    gender: document.getElementById('p-gender').value,
    height: document.getElementById('p-height').value,
    build: document.getElementById('p-build').value,
    skin: document.getElementById('p-skin').value,
    age: document.getElementById('p-age').value,
    styles: [...document.querySelectorAll('#style-chips .chip.selected')].map(c => c.textContent),
    colors: [...document.querySelectorAll('#color-chips .chip.selected')].map(c => c.textContent),
  };

  const wardrobeDesc = wardrobe.map(i =>
    `- ${i.emoji || '👗'} ${i.name} (${i.category}${i.color ? ', ' + i.color : ''}${i.notes ? ', ' + i.notes : ''})`
  ).join('\n');

  const prompt = `You are an expert personal stylist. Based on the wardrobe below and user profile, suggest ${count} complete outfit combinations.

USER PROFILE:
- Name: ${user?.name || 'User'}
- Age: ${profile.age || 'unknown'}
- Gender: ${profile.gender}
- Height: ${profile.height}
- Build: ${profile.build}
- Skin tone: ${profile.skin}
- Style preferences: ${profile.styles.join(', ')}
- Preferred colours: ${profile.colors.join(', ')}

CONTEXT:
- Location/weather: ${city}
- Occasion: ${occasion}
- Mood: ${mood}

WARDROBE:
${wardrobeDesc}

Respond ONLY with a valid JSON array (no markdown, no preamble). Each element:
{"name":"Short poetic outfit name","items":["item name 1","item name 2"],"reason":"2-3 sentence explanation","vibe":"3-word vibe"}`;

  let rawText = '';
  try {
    const resp = await fetch('/api/suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: prompt }], count }),
    });

    clearInterval(iv);

    if (!resp.ok) {
      const err = await resp.text();
      panel.innerHTML = `<div class="empty-state"><div class="big-icon">⚠</div>
        <p>Server error ${resp.status}</p>
        <pre style="font-size:11px;text-align:left;margin-top:8px;white-space:pre-wrap;color:var(--muted)">${err.slice(0,300)}</pre>
      </div>`;
      btn.disabled = false; btn.innerHTML = '✦ Style me'; return;
    }

    const data = await resp.json();
    rawText = (data.content || []).map(b => b.text || '').join('');
    const outfits = JSON.parse(rawText.replace(/```json|```/g, '').trim());
    currentOutfits = outfits;

    panel.innerHTML = '';
    for (let i = 0; i < outfits.length; i++) {
      await delay(i === 0 ? 0 : 280);
      panel.appendChild(buildOutfitCard(outfits[i], i));
    }
    if (!panel.children.length)
      panel.innerHTML = `<div class="empty-state"><div class="big-icon">⚠</div><p>No outfits returned. Try again.</p></div>`;

  } catch(e) {
    clearInterval(iv);
    panel.innerHTML = `<div class="empty-state"><div class="big-icon">⚠</div>
      <p><b>Error:</b> ${e.message}</p>
      ${rawText ? `<pre style="font-size:11px;text-align:left;margin-top:8px;white-space:pre-wrap;color:var(--muted)">${rawText.slice(0,400)}</pre>` : ''}
    </div>`;
  }
  btn.disabled = false; btn.innerHTML = '✦ Style me';
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function buildOutfitCard(o, i) {
  const div = document.createElement('div');
  div.className = 'outfit-card';
  const items = (o.items || []).map(item => {
    const match = wardrobe.find(w =>
      w.name.toLowerCase().includes(item.toLowerCase()) ||
      item.toLowerCase().includes(w.name.toLowerCase())
    );
    const thumb = match?.photoData
      ? `<img src="${match.photoData}" style="width:20px;height:20px;border-radius:4px;object-fit:cover;vertical-align:middle">`
      : (match?.emoji || '👗');
    return `<div class="outfit-item">${thumb} ${item}</div>`;
  }).join('');
  div.innerHTML = `
    <div class="outfit-header">
      <div>
        <div class="outfit-label">${o.name || 'Look ' + (i+1)}</div>
        <div style="color:var(--muted);font-size:12px;margin-top:2px">${o.vibe || ''}</div>
      </div>
      <span class="outfit-score">Look ${i+1}</span>
    </div>
    <div class="outfit-items">${items}</div>
    <div class="outfit-reason">${o.reason || ''}</div>
    <div class="outfit-actions">
      <button class="like-btn" id="like-${i}" onclick="likeOutfit(${i})">♡ Love it</button>
      <button class="skip-btn" onclick="this.closest('.outfit-card').style.opacity='0.4';this.closest('.outfit-card').style.pointerEvents='none'">Skip</button>
    </div>`;
  return div;
}

function likeOutfit(i) {
  const btn = document.getElementById(`like-${i}`);
  const wasLiked = btn.classList.contains('liked');
  
  if (wasLiked) {
    btn.classList.remove('liked');
    btn.textContent = '♡ Love it';
    showToast('Removed from favourites');
    // Try to remove it from savedOutfits if we can match it
    const lookName = currentOutfits[i].name;
    const idx = savedOutfits.findIndex(o => o.name === lookName);
    if (idx !== -1) {
      savedOutfits.splice(idx, 1);
      localStorage.setItem('dressly-saved-outfits', JSON.stringify(savedOutfits));
      updateProfileStats();
      renderSavedOutfits();
    }
  } else {
    btn.classList.add('liked');
    btn.textContent = '♥ Loved';
    savedOutfits.unshift(currentOutfits[i]);
    localStorage.setItem('dressly-saved-outfits', JSON.stringify(savedOutfits));
    updateProfileStats();
    renderSavedOutfits();
    showToast('Saved to favourites ✓');
  }
}

// ======== SAVED LOOKS ========
function renderSavedOutfits() {
  const container = document.getElementById('saved-content');
  if (savedOutfits.length === 0) {
    container.innerHTML = `<div class="empty-state">
      <div class="big-icon">♥</div>
      <p>You haven't saved any looks yet. Generate outfits and click "Love it" to save them here.</p>
    </div>`;
    return;
  }

  let html = '<div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px;">';
  savedOutfits.forEach((o, idx) => {
    const items = (o.items || []).map(item => {
      const match = wardrobe.find(w =>
        w.name.toLowerCase().includes(item.toLowerCase()) ||
        item.toLowerCase().includes(w.name.toLowerCase())
      );
      const thumb = match?.photoData
        ? `<img src="${match.photoData}" style="width:20px;height:20px;border-radius:4px;object-fit:cover;vertical-align:middle">`
        : (match?.emoji || '👗');
      return `<div class="outfit-item">${thumb} ${item}</div>`;
    }).join('');

    html += `
    <div class="outfit-card" style="margin-bottom:0">
      <div class="outfit-header">
        <div>
          <div class="outfit-label">${o.name || 'Saved Look'}</div>
          <div style="color:var(--muted);font-size:12px;margin-top:2px">${o.vibe || ''}</div>
        </div>
      </div>
      <div class="outfit-items">${items}</div>
      <div class="outfit-reason">${o.reason || ''}</div>
      <div class="outfit-actions">
        <button class="skip-btn" onclick="removeSavedOutfit(${idx})" style="color:var(--accent); border-color:var(--border);">Remove</button>
      </div>
    </div>`;
  });
  html += '</div>';
  container.innerHTML = html;
}

function removeSavedOutfit(idx) {
  savedOutfits.splice(idx, 1);
  localStorage.setItem('dressly-saved-outfits', JSON.stringify(savedOutfits));
  updateProfileStats();
  renderSavedOutfits();
  showToast('Removed from favourites');
}

// ======== PROFILE ========
function toggleChip(btn) { btn.classList.toggle('selected'); }

function updateProfilePhoto(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    user.photoData = e.target.result;
    localStorage.setItem('dressly-user', JSON.stringify(user));
    document.getElementById('profile-avatar-display').innerHTML = `<img src="${e.target.result}">`;
    document.getElementById('nav-avatar').innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
    showPhotoAnalysis();
    showToast('Photo updated ✓');
  };
  reader.readAsDataURL(file);
}

function saveProfile() {
  if (user) {
    user.age = document.getElementById('p-age').value;
    user.gender = document.getElementById('p-gender').value;
    user.height = document.getElementById('p-height').value;
    user.build = document.getElementById('p-build').value;
    user.skin = document.getElementById('p-skin').value;
    localStorage.setItem('dressly-user', JSON.stringify(user));
  }
  const notice = document.getElementById('save-notice');
  notice.classList.add('show');
  setTimeout(() => notice.classList.remove('show'), 2200);
  showToast('Profile saved ✓');
}

// ======== NAV ========
function showPage(id, btn) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');
  if (btn) btn.classList.add('active');
}

// ======== TOAST ========
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

// ======== INIT ========
// If user already logged in, skip login screen
if (user) {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  initApp();
} else {
  renderEmojiGrid('Shirt');
}

// Sample wardrobe if empty
if (user && wardrobe.length === 0) {
  wardrobe = [
    { emoji: '👔', name: 'White Oxford shirt', category: 'Top', color: 'White', notes: 'Cotton, slim fit' },
    { emoji: '👕', name: 'Navy blue tee', category: 'Top', color: 'Navy', notes: 'Cotton, regular fit' },
    { emoji: '🎽', name: 'Grey marl tee', category: 'Top', color: 'Grey', notes: 'Cotton blend' },
    { emoji: '👖', name: 'Dark wash jeans', category: 'Bottom', color: 'Dark indigo', notes: 'Slim fit' },
    { emoji: '👖', name: 'Beige chinos', category: 'Bottom', color: 'Beige', notes: 'Smart casual' },
    { emoji: '🧥', name: 'Olive bomber jacket', category: 'Jacket / Blazer', color: 'Olive green', notes: 'Lightweight' },
    { emoji: '👟', name: 'White sneakers', category: 'Shoes', color: 'White', notes: 'Canvas' },
    { emoji: '👞', name: 'Brown loafers', category: 'Shoes', color: 'Tan brown', notes: 'Leather' },
  ];
  saveWardrobe();
} else {
  renderDiscoverFocusOptions();
}

// ======== DISCOVER (SHOPPING GAP ADVISOR) ========
async function analyzeWardrobeGaps() {
  if (wardrobe.length < 3) { showToast('Add at least 3 items to get meaningful shopping advice'); return; }
  const btn = document.getElementById('discover-btn');
  const panel = document.getElementById('discover-results');
  btn.disabled = true;
  btn.innerHTML = '<span class="btn-spinner"></span> Analyzing…';

  panel.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>Finding the missing pieces in your wardrobe…</p></div>`;

  const profile = {
    gender: user?.gender || 'unknown',
    age: user?.age || 'unknown',
    styles: [...document.querySelectorAll('#style-chips .chip.selected')].map(c => c.textContent),
    colors: [...document.querySelectorAll('#color-chips .chip.selected')].map(c => c.textContent),
  };

  const wardrobeDesc = wardrobe.map(i =>
    `- ${i.emoji || '👗'} ${i.name} (${i.category}${i.color ? ', ' + i.color : ''})`
  ).join('\n');

  const focusItem = document.getElementById('ctx-discover-focus').value;
  const focusContext = focusItem ? `\nCRITICAL REQUIREMENT: The user specifically wants to find new items that pair well with their existing "${focusItem}". Focus the suggestions around pairing with this item.` : '';

  const prompt = `You are an extremely creative, high-fashion expert personal stylist and shopping advisor. Review the user's profile and current wardrobe.
Identify exactly 3 distinct core or statement pieces they do NOT currently own. THINK OUTSIDE THE BOX. Suggest high-impact, modern, and very specific items to maximize wardrobe versatility and elevate their look.${focusContext}

USER PROFILE:
- Gender: ${profile.gender}
- Age: ${profile.age}
- Style: ${profile.styles.join(', ')}
- Colors: ${profile.colors.join(', ')}

CURRENT WARDROBE:
${wardrobeDesc}

Respond ONLY with a valid JSON array of 3 objects (no markdown blocks, no preamble). 
Format for each object:
{"itemTitle":"Name of item to buy","emoji":"1 emoji","description":"Write 2-3 flowing sentences. Explain why they need this piece, and EXPLICITLY state how it pairs perfectly with specific items they already own from their wardrobe list."}`;

  try {
    const resp = await fetch('/api/suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      panel.innerHTML = `<div class="empty-state"><div class="big-icon">⚠</div><p>Server error ${resp.status}</p></div>`;
      btn.disabled = false; btn.innerHTML = '✦ Analyze Gaps'; return;
    }

    const data = await resp.json();
    const rawText = (data.content || []).map(b => b.text || '').join('');
    const items = JSON.parse(rawText.replace(/```json|```/g, '').trim());

    panel.innerHTML = '';
    items.forEach(item => {
      const title = item.itemTitle || item.name || item.title || item.item || 'Suggested Item';
      const promptQuery = encodeURIComponent('minimalist high fashion photography of a single ' + title + ' laying flat on solid white background studio lighting');
      const imgSrc = `https://image.pollinations.ai/prompt/${promptQuery}?width=200&height=200&nologo=true`;
      
      const div = document.createElement('div');
      div.className = 'discover-card';
      div.innerHTML = `
        <div class="discover-header">
          <div class="discover-icon" style="overflow:hidden; border-radius:0px;">
            <img src="${imgSrc}" style="width:100%; height:100%; object-fit:cover;" onerror="this.outerHTML='${item.emoji || '🛍️'}'" alt="${title}" />
          </div>
          <div>
            <div class="discover-title">${title}</div>
            <div class="discover-reason" style="margin-top:8px;">${item.description || item.reason || ''}</div>
          </div>
        </div>`;
      panel.appendChild(div);
    });

  } catch(e) {
    panel.innerHTML = `<div class="empty-state"><div class="big-icon">⚠</div><p><b>Error:</b> ${e.message}</p></div>`;
  }
  btn.disabled = false; btn.innerHTML = '✦ Analyze Gaps';
}

// ======== WEATHER FETCH ========
const WMO_CODES = {
  0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Fog', 48: 'Depositing rime fog', 51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle',
  61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
  80: 'Slight rain showers', 81: 'Moderate rain showers', 82: 'Violent rain showers',
  95: 'Thunderstorm', 96: 'Thunderstorm with light hail', 99: 'Thunderstorm with heavy hail'
};

async function detectWeather() {
  const btn = document.getElementById('detect-weather-btn');
  const input = document.getElementById('ctx-city');
  if (!navigator.geolocation) {
    showToast('Geolocation is not supported by your browser');
    return;
  }
  
  btn.innerHTML = '<span class="btn-spinner" style="width:10px;height:10px;border-width:1.5px;border-top-color:var(--sage)"></span> Locating...';
  btn.disabled = true;

  navigator.geolocation.getCurrentPosition(async (pos) => {
    try {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      
      const geoRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
      const geoData = await geoRes.json();
      const city = geoData.city || geoData.locality || geoData.principalSubdivision || 'Unknown Location';

      const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
      const weatherData = await weatherRes.json();
      const temp = weatherData.current_weather.temperature;
      const code = weatherData.current_weather.weathercode;
      const desc = WMO_CODES[code] || 'Clear';

      input.value = `${city}, ${temp}°C ${desc.toLowerCase()}`;
      showToast('Weather detected ✓');
    } catch (e) {
      showToast('Failed to fetch weather');
      console.error(e);
    } finally {
      btn.innerHTML = '📍 Auto-detect';
      btn.disabled = false;
    }
  }, (err) => {
    showToast('Location access denied');
    btn.innerHTML = '📍 Auto-detect';
    btn.disabled = false;
  });
}

// ======== DRAG & DROP ========
document.addEventListener('dragstart', e => {
  const t = e.target;
  if (t.classList.contains('drag-handle') || t.classList.contains('category-block')) {
     const block = t.closest('.category-block');
     draggedCategory = block;
     if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
     setTimeout(() => block.classList.add('dragging'), 0);
  } else if (t.classList && t.classList.contains('clothing-card')) {
     draggedItem = t;
     if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
     setTimeout(() => t.classList.add('dragging'), 0);
  }
});

document.addEventListener('dragover', e => {
  if (draggedCategory || draggedItem) e.preventDefault();
  if (draggedCategory) {
     const overBlock = e.target.closest('.category-block');
     if (overBlock && overBlock !== draggedCategory) {
        document.querySelectorAll('.category-block').forEach(b => b.classList.remove('drag-over'));
        overBlock.classList.add('drag-over');
     }
  } else if (draggedItem) {
     const card = e.target.closest('.clothing-card');
     const grid = e.target.closest('.wardrobe-grid');
     if (grid) {
        grid.classList.add('drag-over');
        if (card && card !== draggedItem) {
           const rect = card.getBoundingClientRect();
           const next = (e.clientY - rect.top) / (rect.bottom - rect.top) > 0.5;
           grid.insertBefore(draggedItem, next && card.nextSibling || card);
        } else if (!card && grid !== draggedItem.parentNode) {
           grid.appendChild(draggedItem);
        }
     }
  }
});

document.addEventListener('dragend', e => {
  if (draggedCategory) draggedCategory.classList.remove('dragging');
  if (draggedItem) draggedItem.classList.remove('dragging');
  document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
  draggedCategory = null;
  draggedItem = null;
});

document.addEventListener('drop', e => {
  e.preventDefault();
  document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
  
  if (draggedCategory) {
     const overBlock = e.target.closest('.category-block');
     if (overBlock && overBlock !== draggedCategory) {
        const parent = overBlock.parentNode;
        const rect = overBlock.getBoundingClientRect();
        const next = (e.clientY - rect.top) / (rect.bottom - rect.top) > 0.5;
        parent.insertBefore(draggedCategory, next && overBlock.nextSibling || overBlock);
        
        const newOrder = [...document.querySelectorAll('.category-block')].map(b => b.getAttribute('data-cat'));
        categoryOrder = newOrder;
        localStorage.setItem('dressly-category-order', JSON.stringify(categoryOrder));
        renderWardrobe();
     }
  } else if (draggedItem) {
     const grids = document.querySelectorAll('.wardrobe-grid');
     const newWardrobe = [];
     grids.forEach(grid => {
        const cat = grid.getAttribute('data-cat');
        const cards = grid.querySelectorAll('.clothing-card');
        cards.forEach(card => {
           const idx = parseInt(card.getAttribute('data-idx'));
           const item = wardrobe[idx];
           if (item) {
              item.category = cat;
              newWardrobe.push(item);
           }
        });
     });
     wardrobe = newWardrobe;
     saveWardrobe();
  }
  
  if (draggedCategory) draggedCategory.classList.remove('dragging');
  if (draggedItem) draggedItem.classList.remove('dragging');
  draggedCategory = null;
  draggedItem = null;
});
