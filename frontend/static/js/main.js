
const API_BASE_URL = 'https://cvforge.mudev.agency/api';
const API_BASE = 'https://cvforge.mudev.agency';


const STORAGE_KEYS = {
  access: 'access_token',
  refresh: 'refresh_token',
  resumeId: 'cvforge_resume_id',
};

/* ============================================================
   Toasts
   ============================================================ */
function showToast(message, type = 'info') {
  const host = document.getElementById('toastHost');
  const el = document.createElement('div');
  el.className = `toast${type === 'success' ? ' toast-success' : ''}${type === 'error' ? ' toast-error' : ''}`;
  el.textContent = message;
  host.appendChild(el);
  setTimeout(() => el.remove(), 3600);
}
 
/* ============================================================
   Auth: login, logout, refresh-and-retry
   ============================================================ */
async function handleLogin(event) {
  event.preventDefault();
  const usernameInput = document.getElementById('username').value;
  const passwordInput = document.getElementById('password').value;
  const errorEl = document.getElementById('loginError');
  errorEl.classList.add('hidden');
 
  try {
    const response = await fetch(`${API_BASE_URL}/token/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: usernameInput, password: passwordInput }),
    });
 
    if (response.ok) {
      const data = await response.json();
      localStorage.setItem(STORAGE_KEYS.access, data.access);
      if (data.refresh) localStorage.setItem(STORAGE_KEYS.refresh, data.refresh);
      document.getElementById('authModal').classList.add('hidden');
      showToast('Авторизація успішна!', 'success');
      fetchResumes();
    } else {
      errorEl.textContent = 'Невірний логін або пароль.';
      errorEl.classList.remove('hidden');
    }
  } catch (error) {
    console.error('Помилка авторизації:', error);
    errorEl.textContent = 'Не вдалося з’єднатися з сервером токенів.';
    errorEl.classList.remove('hidden');
  }
}
 
function showAuthView(view) {
  const loginView = document.getElementById('loginView');
  const registerView = document.getElementById('registerView');
  const loginError = document.getElementById('loginError');
  const registerError = document.getElementById('registerError');
 
  if (view === 'register') {
    loginView.classList.add('hidden');
    registerView.classList.remove('hidden');
  } else {
    registerView.classList.add('hidden');
    loginView.classList.remove('hidden');
  }
  loginError.classList.add('hidden');
  registerError.classList.add('hidden');
}
 
async function handleRegister(event) {
  event.preventDefault();
  const usernameInput = document.getElementById('regUsername').value;
  const passwordInput = document.getElementById('regPassword').value;
  const errorEl = document.getElementById('registerError');
  errorEl.classList.add('hidden');
 
  try {
    const response = await fetch(`${API_BASE_URL}/register/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: usernameInput, password: passwordInput }),
    });
 
    if (response.ok) {
      showToast('Реєстрація успішна! Тепер увійдіть.', 'success');
      document.getElementById('username').value = usernameInput;
      document.getElementById('password').value = '';
      document.getElementById('registerForm').reset();
      showAuthView('login');
    } else {
      let message = 'Не вдалося зареєструватися. Перевірте дані.';
      try {
        const data = await response.json();
        message = Object.values(data).flat().join(' ') || message;
      } catch (_) { /* ignore parse errors */ }
      errorEl.textContent = message;
      errorEl.classList.remove('hidden');
    }
  } catch (error) {
    console.error('Помилка реєстрації:', error);
    errorEl.textContent = 'Не вдалося з’єднатися з сервером.';
    errorEl.classList.remove('hidden');
  }
}
 
function logout() {
  localStorage.removeItem(STORAGE_KEYS.access);
  localStorage.removeItem(STORAGE_KEYS.refresh);
  localStorage.removeItem(STORAGE_KEYS.resumeId);
  location.reload();
}
 
async function refreshAccessToken() {
  const refresh = localStorage.getItem(STORAGE_KEYS.refresh);
  if (!refresh) return null;
 
  try {
    const res = await fetch(`${API_BASE_URL}/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    });
    if (!res.ok) return null;
 
    const data = await res.json();
    if (!data.access) return null;
 
    localStorage.setItem(STORAGE_KEYS.access, data.access);
    if (data.refresh) localStorage.setItem(STORAGE_KEYS.refresh, data.refresh);
    return data.access;
  } catch (error) {
    console.error('Не вдалося оновити токен:', error);
    return null;
  }
}
 
function handleSessionExpired() {
  localStorage.removeItem(STORAGE_KEYS.access);
  localStorage.removeItem(STORAGE_KEYS.refresh);
  showToast('Сесія застаріла. Авторизуйтесь знову.', 'error');
  document.getElementById('authModal').classList.remove('hidden');
}
 
async function authFetch(url, options = {}) {
  const buildOptions = (token) => ({
    ...options,
    headers: {
      ...(options.headers || {}),
      'Authorization': `Bearer ${token}`,
    },
  });
 
  let token = localStorage.getItem(STORAGE_KEYS.access);
  if (!token) {
    document.getElementById('authModal').classList.remove('hidden');
    return null;
  }
 
  let response = await fetch(url, buildOptions(token));
 
  if (response.status === 401) {
    const newToken = await refreshAccessToken();
    if (!newToken) {
      handleSessionExpired();
      return null;
    }
    response = await fetch(url, buildOptions(newToken));
    if (response.status === 401) {
      handleSessionExpired();
      return null;
    }
  }
 
  return response;
}
 
/* ============================================================
   Init
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('logoutBtn').addEventListener('click', logout);
  document.getElementById('loginForm').addEventListener('submit', handleLogin);
  document.getElementById('registerForm').addEventListener('submit', handleRegister);
  document.getElementById('showRegisterBtn').addEventListener('click', () => showAuthView('register'));
  document.getElementById('showLoginBtn').addEventListener('click', () => showAuthView('login'));
  document.getElementById('refreshBtn').addEventListener('click', fetchResumes);

  document.getElementById('shareModalClose').addEventListener('click', () => {
    document.getElementById('shareModal').classList.add('hidden');
  });
  document.getElementById('shareCopyBtn').addEventListener('click', copyShareLink);
  document.getElementById('shareUnpublishBtn').addEventListener('click', async () => {
    if (!currentShareResumeId) return;
    const id = currentShareResumeId;
    const data = await setResumePublicState(id, false);
    if (data) {
      showToast('Резюме знову приватне.', 'success');
      updateShareButtonState(id, false);
      document.getElementById('shareModal').classList.add('hidden');
      currentShareResumeId = null;
    } else {
      showToast('Не вдалося зняти публічний доступ.', 'error');
    }
  });

  const token = localStorage.getItem(STORAGE_KEYS.access);
  if (token) {
    document.getElementById('authModal').classList.add('hidden');
    fetchResumes();
  } else {
    document.getElementById('authModal').classList.remove('hidden');
    document.getElementById('loadingState').classList.add('hidden');
  }
});
 
/* ============================================================
   Fetch + render
   ============================================================ */
function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
 
function fileNameFor(resume) {
  return `resume_${String(resume.id).padStart(3, '0')}.json`;
}
 
async function fetchResumes() {
  const loadingState = document.getElementById('loadingState');
  const emptyState = document.getElementById('emptyState');
  const list = document.getElementById('resumeList');
 
  loadingState.classList.remove('hidden');
  emptyState.classList.add('hidden');
  list.innerHTML = '';
 
  try {
    const response = await authFetch(`${API_BASE_URL}/resumes/`, { method: 'GET' });
    if (!response) { loadingState.classList.add('hidden'); return; }
 
    if (!response.ok) {
      loadingState.classList.add('hidden');
      showToast('Не вдалося завантажити список резюме.', 'error');
      return;
    }
 
    const resumes = await response.json();
    loadingState.classList.add('hidden');
    document.getElementById('listEyebrow').textContent = `resumes/ · ${resumes.length} файл${resumes.length === 1 ? '' : 'ів'}`;
 
    if (!resumes.length) {
      emptyState.classList.remove('hidden');
      return;
    }
 
    renderResumes(resumes);
  } catch (error) {
    console.error(error);
    loadingState.classList.add('hidden');
    showToast('Не вдалося з’єднатися із сервером.', 'error');
  }
}
 
 
document.getElementById('newResumeBtn').addEventListener('click', (e) => {
  // Очищаємо всі дані старого резюме
  localStorage.removeItem(STORAGE_KEYS.resumeId);
  createdResumeId = null;
  savedOnce = false;
  
 
  if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
     e.preventDefault(); // Запобігаємо переходу, якщо ми вже на сторінці
     location.reload();  // Просто перезавантажуємо, щоб очистити поля
  }
});
 
 
function renderResumes(resumes) {
  const list = document.getElementById('resumeList');
  list.innerHTML = resumes.map(r => `
    <div class="resume-card" data-id="${r.id}">
      <div class="resume-card-top">
        <p class="eyebrow" id="publicStatus-${r.id}">${fileNameFor(r)}${r.is_public ? ' · 🌐 публічне' : ''}</p>
        <h3 class="resume-title">${escapeHtml(r.title) || 'Без назви'}</h3>
        <p class="resume-meta">Створено ${formatDate(r.created_at)} · Оновлено ${formatDate(r.updated_at)}</p>
      </div>
      <div class="resume-actions">
        <a href="index.html?resume=${r.id}" class="btn btn-outline btn-sm">✎ Редагувати</a>
        <button type="button" class="btn btn-accent-2 btn-sm" data-action="export" data-id="${r.id}">📥 Експорт</button>
        <button type="button" class="btn btn-outline btn-sm" data-action="share" data-id="${r.id}">${r.is_public ? '🔗 Посилання' : '🔗 Поділитись'}</button>
        ${r.is_public ? `<button type="button" class="btn btn-ghost btn-sm" data-action="unshare" data-id="${r.id}">🔒 Зняти з публічного</button>` : ''}
        <button type="button" class="btn btn-danger-outline btn-sm" data-action="delete" data-id="${r.id}">✕ Видалити</button>
      </div>
    </div>
  `).join('');
 
  list.querySelectorAll('[data-action="export"]').forEach(btn => {
    btn.addEventListener('click', () => handleExport(btn));
  });
  list.querySelectorAll('[data-action="share"]').forEach(btn => {
    btn.addEventListener('click', () => handleShare(btn));
  });
  list.querySelectorAll('[data-action="unshare"]').forEach(btn => {
    btn.addEventListener('click', () => handleUnshare(btn));
  });
  list.querySelectorAll('[data-action="delete"]').forEach(btn => {
    btn.addEventListener('click', () => handleDelete(btn));
  });
}
 
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}
/* ============================================================
   Share (робить резюме публічним/приватним і показує посилання)
   ============================================================ */
let currentShareResumeId = null;

// Ендпоінт resumes/<id>/ приймає multipart/form-data, тож шлемо FormData, а не JSON.
// Повертає оновлений об'єкт резюме (з public_slug/is_public) або null при помилці.
async function setResumePublicState(id, isPublic) {
  try {
    const formData = new FormData();
    formData.append('is_public', isPublic ? 'true' : 'false');

    const response = await authFetch(`${API_BASE_URL}/resumes/${id}/`, {
      method: 'PATCH',
      body: formData,
    });
    if (!response || !response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error(error);
    return null;
  }
}

// Оновлює вигляд кнопок і мітки "🌐 публічне" конкретної картки без повного перезавантаження списку
function updateShareButtonState(id, isPublic) {
  const card = document.querySelector(`.resume-card[data-id="${id}"]`);
  if (!card) return;

  const statusEl = document.getElementById(`publicStatus-${id}`);
  if (statusEl) {
    const baseName = `resume_${String(id).padStart(3, '0')}.json`;
    statusEl.textContent = baseName + (isPublic ? ' · 🌐 публічне' : '');
  }

  const shareBtn = card.querySelector('[data-action="share"]');
  if (shareBtn) shareBtn.textContent = isPublic ? '🔗 Посилання' : '🔗 Поділитись';

  let unshareBtn = card.querySelector('[data-action="unshare"]');
  if (isPublic && !unshareBtn && shareBtn) {
    unshareBtn = document.createElement('button');
    unshareBtn.type = 'button';
    unshareBtn.className = 'btn btn-ghost btn-sm';
    unshareBtn.dataset.action = 'unshare';
    unshareBtn.dataset.id = id;
    unshareBtn.textContent = '🔒 Зняти з публічного';
    unshareBtn.addEventListener('click', () => handleUnshare(unshareBtn));
    shareBtn.insertAdjacentElement('afterend', unshareBtn);
  } else if (!isPublic && unshareBtn) {
    unshareBtn.remove();
  }
}

// Клік по "Поділитись"/"Посилання" — спершу просимо обрати шаблон
function handleShare(btn) {
  const id = btn.dataset.id;
  openTemplateModal('share', id, btn);
}

// Виконується після вибору шаблону в модалці: вмикає публічний доступ
// і формує посилання з підставленим шаблоном
async function performShare(id, template, btn, originalLabel) {
  btn.disabled = true;
  btn.textContent = 'Ділимось...';

  const data = await setResumePublicState(id, true);

  btn.disabled = false;
  btn.textContent = originalLabel;

  if (!data) {
    showToast('Не вдалося увімкнути публічний доступ.', 'error');
    return;
  }

  const publicUrl = `${API_BASE}/resume/${data.slug}/?template=${encodeURIComponent(template)}`;

  currentShareResumeId = id;
  document.getElementById('shareLinkInput').value = publicUrl;
  document.getElementById('shareModal').classList.remove('hidden');
  updateShareButtonState(id, true);
}

// Кнопка "Зняти з публічного" прямо на картці — без вибору шаблону
async function handleUnshare(btn) {
  const id = btn.dataset.id;
  const originalLabel = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Знімаємо...';

  const data = await setResumePublicState(id, false);

  btn.disabled = false;

  if (!data) {
    showToast('Не вдалося зняти публічний доступ.', 'error');
    btn.textContent = originalLabel;
    return;
  }

  showToast('Резюме знову приватне.', 'success');
  updateShareButtonState(id, false);
}

async function copyShareLink() {
  const input = document.getElementById('shareLinkInput');
  input.select();
  input.setSelectionRange(0, 99999);

  try {
    await navigator.clipboard.writeText(input.value);
    showToast('Посилання скопійовано в буфер обміну!', 'success');
  } catch (_) {
    showToast('Не вдалося скопіювати автоматично, скопіюйте вручну.', 'error');
  }
}

/* ============================================================
   Export templates
   ============================================================ */
const EXPORT_TEMPLATES = [
  { id: 'default', label: 'Default' },
  { id: 'circular_cvwizard', label: 'Circular · CV Wizard' },
  { id: 'claude_template_01', label: 'Claude — Template 01' },
  { id: 'claude_template_02', label: 'Claude — Template 02' },
  { id: 'claude_template_03', label: 'Claude — Template 03' },
  { id: 'claude_template_04', label: 'Claude — Template 04' },
];
 
let pendingAction = null; // { mode: 'export' | 'share', id, btn, originalLabel }
 
function openTemplateModal(mode, id, btn) {
  pendingAction = { mode, id, btn, originalLabel: btn.textContent };
 
  const list = document.getElementById('templateList');
  list.innerHTML = EXPORT_TEMPLATES.map(t => `
    <button type="button" class="template-option" data-template="${t.id}">
      <span class="template-option-name">${t.label}</span>
      <span class="template-option-id">${t.id}</span>
    </button>
  `).join('');
 
  list.querySelectorAll('.template-option').forEach(opt => {
    opt.addEventListener('click', () => {
      document.getElementById('templateModal').classList.add('hidden');
      const { mode: actionMode, id: resumeId, btn: actionBtn, originalLabel } = pendingAction;
      if (actionMode === 'share') {
        performShare(resumeId, opt.dataset.template, actionBtn, originalLabel);
      } else {
        performExport(resumeId, opt.dataset.template, actionBtn, originalLabel);
      }
      pendingAction = null;
    });
  });
 
  document.getElementById('templateModal').classList.remove('hidden');
}
 
function handleExport(btn) {
  const id = btn.dataset.id;
  openTemplateModal('export', id, btn);
}
 
async function performExport(id, template, btn, originalLabel) {
  btn.disabled = true;
  btn.textContent = 'Готуємо...';
 
  try {
    const url = `${API_BASE_URL}/resumes/${id}/export/?template=${encodeURIComponent(template)}`;
    const response = await authFetch(url, { method: 'GET' });
    if (!response) return;
 
    if (!response.ok) {
      showToast('Не вдалося експортувати резюме.', 'error');
      return;
    }
 
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, '_blank');
  } catch (error) {
    console.error(error);
    showToast('Не вдалося з’єднатися із сервером.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = originalLabel;
  }
} 
 
 
document.getElementById('templateModalCancel').addEventListener('click', () => {
  document.getElementById('templateModal').classList.add('hidden');
  pendingAction = null;
});
 
/* ============================================================
   Delete (click once to arm, click again within 4s to confirm)
   ============================================================ */
function handleDelete(btn) {
  if (!btn.classList.contains('is-confirming')) {
    btn.classList.add('is-confirming');
    const original = btn.textContent;
    btn.textContent = 'Точно видалити?';
    btn._revertTimer = setTimeout(() => {
      btn.classList.remove('is-confirming');
      btn.textContent = original;
    }, 4000);
    return;
  }
 
  clearTimeout(btn._revertTimer);
  performDelete(btn);
}
 
async function performDelete(btn) {
  const id = btn.dataset.id;
  btn.disabled = true;
  btn.textContent = 'Видалення...';
 
  try {
    const response = await authFetch(`${API_BASE_URL}/resumes/${id}/`, { method: 'DELETE' });
    if (!response) return;
 
    if (response.ok || response.status === 204) {
      showToast('Резюме видалено.', 'success');
      const card = document.querySelector(`.resume-card[data-id="${id}"]`);
      if (card) card.remove();
 
      const remaining = document.querySelectorAll('.resume-card').length;
      document.getElementById('listEyebrow').textContent = `resumes/ · ${remaining} файл${remaining === 1 ? '' : 'ів'}`;
      if (!remaining) document.getElementById('emptyState').classList.remove('hidden');
 
      if (localStorage.getItem(STORAGE_KEYS.resumeId) === id) {
        localStorage.removeItem(STORAGE_KEYS.resumeId);
      }
    } else {
      showToast('Не вдалося видалити резюме.', 'error');
      btn.disabled = false;
      btn.classList.remove('is-confirming');
      btn.textContent = '✕ Видалити';
    }
  } catch (error) {
    console.error(error);
    showToast('Не вдалося з’єднатися із сервером.', 'error');
    btn.disabled = false;
    btn.classList.remove('is-confirming');
    btn.textContent = '✕ Видалити';
  }
}