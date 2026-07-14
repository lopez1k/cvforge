const API_BASE_URL = 'http://localhost:8000/api';

const STORAGE_KEYS = {
  access: 'access_token',
  refresh: 'refresh_token',
  resumeId: 'cvforge_resume_id',
};

const STEPS = [
  { n: 1, label: 'Основне',        file: '01_basics.json' },
  { n: 2, label: 'Персональні дані',        file: '02_personal.json' },
  { n: 3, label: 'Посилання',      file: '03_links.json' },
  { n: 4, label: 'Досвід роботи',  file: '04_experience.json' },
  { n: 5, label: 'Проєкти',        file: '05_projects.json' },
  { n: 6, label: 'Освіта',         file: '06_education.json' },
  { n: 7, label: 'Мови',           file: '07_languages.json' },
  { n: 8, label: 'Навички',           file: '08_skills.json' },
  { n: 9, label: 'Сертифікати',    file: '09_certifications.json' },
  { n: 10, label: 'Перегляд',       file: '10_resume.json' },
];
const TOTAL_STEPS = STEPS.length;

let currentStep = 1;
let createdResumeId = null;
let savedOnce = false;
let personalInfoId = null;
const editingResumeId = new URLSearchParams(location.search).get('resume');

/* ============================================================
   Toasts (replaces alert())
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
   Pipeline / stepper rendering
   ============================================================ */
function initPipeline() {
  const list = document.getElementById('pipelineList');
  list.innerHTML = STEPS.map(s => `
    <li class="pipeline-item" data-step="${s.n}" onclick="handlePipelineClick(${s.n})">
      <span class="pipeline-node">${s.n}</span>
      <span class="pipeline-label">${s.label}</span>
    </li>
  `).join('');
  renderPipelineState();
}

function renderPipelineState() {
  document.querySelectorAll('.pipeline-item').forEach(item => {
    const n = parseInt(item.dataset.step, 10);
    item.classList.toggle('is-completed', n < currentStep);
    item.classList.toggle('is-active', n === currentStep);
    const node = item.querySelector('.pipeline-node');
    node.textContent = n < currentStep ? '✓' : String(n);
  });
  const fillPct = ((currentStep - 1) / (TOTAL_STEPS - 1)) * 100;
  document.getElementById('railFill').style.height = fillPct + '%';
  document.getElementById('activeTab').textContent = STEPS[currentStep - 1].file;
  document.getElementById('stepCounter').textContent = `Крок ${currentStep} з ${TOTAL_STEPS}`;
}

function handlePipelineClick(n) {
  goToStep(n);
}

/* ============================================================
   Step navigation
   ============================================================ */
function goToStep(n) {
  document.querySelectorAll('.step-panel').forEach(p => {
    p.classList.toggle('active', parseInt(p.dataset.step, 10) === n);
  });
  currentStep = n;
  renderPipelineState();
  updateFooter();
  if (n === TOTAL_STEPS) renderReview();
  document.querySelector('.panel-scroll').scrollTop = 0;
}

function updateFooter() {
  const backBtn = document.getElementById('backBtn');
  const nextBtn = document.getElementById('nextBtn');
  const saveBtn = document.getElementById('saveBtn');
  const exportBtn = document.getElementById('exportBtn');

  backBtn.disabled = currentStep === 1;

  if (currentStep < TOTAL_STEPS) {
    nextBtn.classList.remove('hidden');
    saveBtn.classList.add('hidden');
  } else {
    nextBtn.classList.add('hidden');
    saveBtn.classList.remove('hidden');
    saveBtn.textContent = editingResumeId ? 'Зберегти зміни' : (savedOnce ? 'Оновити резюме' : 'Зберегти резюме');
  }
  if (!(currentStep === TOTAL_STEPS && savedOnce)) {
    exportBtn.classList.add('hidden');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('backBtn').addEventListener('click', () => {
    if (currentStep > 1) goToStep(currentStep - 1);
  });
  document.getElementById('nextBtn').addEventListener('click', () => {
    if (currentStep < TOTAL_STEPS) goToStep(currentStep + 1);
  });
  document.getElementById('saveBtn').addEventListener('click', handleSave);
  document.getElementById('logoutBtn').addEventListener('click', logout);
  document.getElementById('loginForm').addEventListener('submit', handleLogin);

  const token = localStorage.getItem(STORAGE_KEYS.access);
  if (token) document.getElementById('authModal').classList.add('hidden');

  // restore "resume already saved" state across page reloads
  const storedResumeId = localStorage.getItem(STORAGE_KEYS.resumeId);
  // Відновлюємо тільки якщо ми реально зараз редагуємо це резюме
  if (token && storedResumeId && editingResumeId === storedResumeId) {
    createdResumeId = storedResumeId;
    savedOnce = true;
  }

  document.getElementById('exportBtn').addEventListener('click', () => {
  if (!createdResumeId) {
    showToast('Спочатку збережіть резюме!', 'error');
    return;
  }
  openTemplateModal(); // Ми викликаємо нову функцію, а не handleExportClick
});


  initPhotoUpload();
  initPipeline();
  updateFooter();

  if (editingResumeId) {
    loadResumeForEdit(editingResumeId);
  } else {
    // seed one default entry in the sections that had defaults originally
    addLink();
    addExperience();
    addLanguage();
    addSkill();
  }
});

/* ============================================================
   Auth
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

function logout() {
  localStorage.removeItem(STORAGE_KEYS.access);
  localStorage.removeItem(STORAGE_KEYS.refresh);
  localStorage.removeItem(STORAGE_KEYS.resumeId);
  location.reload();
}

/* ============================================================
   Token refresh + authenticated fetch wrapper
   ============================================================ */
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
   Empty-state helper
   ============================================================ */
function updateEmptyState(containerId, emptyId) {
  const container = document.getElementById(containerId);
  const empty = document.getElementById(emptyId);
  empty.classList.toggle('hidden', container.children.length > 0);
}

/* ============================================================
   Dynamic entry builders
   ============================================================ */
function addLink() {
  const container = document.getElementById('linksContainer');
  const div = document.createElement('div');
  div.className = 'entry-card grid-2';
  div.innerHTML = `
    <div class="field" style="margin-bottom:0">
      <label>Платформа</label>
      <select class="input link-platform">
        <option value="linkedin">LinkedIn</option>
        <option value="github">GitHub</option>
        <option value="gitlab">GitLab</option>
        <option value="telegram">Telegram</option>
        <option value="portfolio">Portfolio / Website</option>
      </select>
    </div>
    <div class="field" style="margin-bottom:0">
      <label>URL посилання</label>
      <input type="url" class="input link-url" placeholder="https://..." required>
      <button type="button" onclick="removeEntry(this,'linksContainer','linksEmpty')" class="btn-remove">Видалити</button>
    </div>
  `;
  container.appendChild(div);
  updateEmptyState('linksContainer', 'linksEmpty');
}

function addExperience() {
  const container = document.getElementById('experienceContainer');
  const div = document.createElement('div');
  div.className = 'entry-card';
  div.innerHTML = `
    <div class="grid-2">
      <div class="field"><label>Посада</label><input type="text" class="input exp-position" required></div>
      <div class="field"><label>Компанія</label><input type="text" class="input exp-company" required></div>
    </div>
    <div class="grid-3">
      <div class="field"><label>Дата початку</label><input type="date" class="input exp-start" required></div>
      <div class="field"><label>Дата кінця</label><input type="date" class="input exp-end"></div>
      <div class="check-row"><input type="checkbox" class="exp-current" onchange="toggleDateEnd(this)"><label>Теперішній час</label></div>
    </div>
    <div class="field"><label>Опис обов'язків</label><textarea class="input exp-desc" rows="2"></textarea></div>
    <button type="button" onclick="removeEntry(this,'experienceContainer','experienceEmpty')" class="btn-remove">Видалити досвід</button>
  `;
  container.appendChild(div);
  updateEmptyState('experienceContainer', 'experienceEmpty');
}

function toggleDateEnd(checkbox) {
  const dateInput = checkbox.closest('.entry-card').querySelector('.exp-end');
  dateInput.disabled = checkbox.checked;
  if (checkbox.checked) dateInput.value = '';
}

function addProject() {
  const container = document.getElementById('projectsContainer');
  const div = document.createElement('div');
  div.className = 'entry-card';
  div.innerHTML = `
    <div class="grid-2">
      <div class="field"><label>Назва проєкту</label><input type="text" class="input proj-title" required></div>
      <div class="field"><label>Стек технологій</label><input type="text" class="input proj-tech" placeholder="Python, Django"></div>
    </div>
    <div class="field"><label>Посилання</label><input type="url" class="input proj-link" placeholder="https://..."></div>
    <div class="field"><label>Опис проєкту</label><textarea class="input proj-desc" rows="2"></textarea></div>
    <button type="button" onclick="removeEntry(this,'projectsContainer','projectsEmpty')" class="btn-remove">Видалити проєкт</button>
  `;
  container.appendChild(div);
  updateEmptyState('projectsContainer', 'projectsEmpty');
}

function addEducation() {
  const container = document.getElementById('educationContainer');
  const div = document.createElement('div');
  div.className = 'entry-card';
  div.innerHTML = `
    <div class="field"><label>Навчальний заклад</label><input type="text" class="input edu-inst" required></div>
    <div class="grid-2">
      <div class="field"><label>Ступінь</label><input type="text" class="input edu-degree" required></div>
      <div class="field"><label>Спеціальність</label><input type="text" class="input edu-study" required></div>
    </div>
    <div class="grid-2">
      <div class="field"><label>Рік вступу</label><input type="number" class="input edu-startyear" required></div>
      <div class="field"><label>Рік випуску</label><input type="number" class="input edu-year" required></div>
    </div>
    <button type="button" onclick="removeEntry(this,'educationContainer','educationEmpty')" class="btn-remove">Видалити освіту</button>
  `;
  container.appendChild(div);
  updateEmptyState('educationContainer', 'educationEmpty');
}

function addLanguage() {
  const container = document.getElementById('languagesContainer');
  const div = document.createElement('div');
  div.className = 'entry-card grid-2';
  div.innerHTML = `
    <div class="field" style="margin-bottom:0"><label>Мова</label><input type="text" class="input lang-name" required></div>
    <div class="field" style="margin-bottom:0">
      <label>Рівень</label>
      <select class="input lang-level">
        <option value="A1">A1</option><option value="A2">A2</option>
        <option value="B1">B1</option><option value="B2">B2</option>
        <option value="C1">C1</option><option value="C2">C2</option>
        <option value="Native">Native Speaker</option>
      </select>
      <button type="button" onclick="removeEntry(this,'languagesContainer','languagesEmpty')" class="btn-remove">Видалити</button>
    </div>
  `;
  container.appendChild(div);
  updateEmptyState('languagesContainer', 'languagesEmpty');
}

function addSkill() {
  const container = document.getElementById('skillsContainer');
  const div = document.createElement('div');
  div.className = 'entry-card grid-2';
  div.innerHTML = `
    <div class="field" style="margin-bottom:0"><label>Навичка</label><input type="text" class="input skill-name" required></div>
    <div class="field" style="margin-bottom:0">
      <label>Рівень</label>
      <select class="input skill-level">
        <option value="None">Не хочу вказувати</option><option value="Novice">Новачок</option>
        <option value="Advanced Beginner">Початківець-практик</option><option value="Competent">Компетентний</option>
        <option value="Proficient">Професіонал</option><option value="Expert">Експерт</option>
      </select>
      <button type="button" onclick="removeEntry(this,'skillsContainer','skillsEmpty')" class="btn-remove">Видалити</button>
    </div>
  `;
  container.appendChild(div);
  updateEmptyState('skillsContainer', 'skillsEmpty');
}

function addCertification() {
  const container = document.getElementById('certificationsContainer');
  const div = document.createElement('div');
  div.className = 'entry-card';
  div.innerHTML = `
    <div class="field"><label>Сертифікат</label><input type="text" class="input cert-name" required></div>
    <div class="grid-2">
      <div class="field"><label>Організація</label><input type="text" class="input cert-org" required></div>
      <div class="field"><label>Дата отримання</label><input type="date" class="input cert-date"></div>
    </div>
    <button type="button" onclick="removeEntry(this,'certificationsContainer','certificationsEmpty')" class="btn-remove">Видалити</button>
  `;
  container.appendChild(div);
  updateEmptyState('certificationsContainer', 'certificationsEmpty');
}

function removeEntry(btn, containerId, emptyId) {
  btn.closest('.entry-card').remove();
  updateEmptyState(containerId, emptyId);
}

/* ============================================================
   Photo upload + crop tool
   ============================================================
   - "Обрати фото" opens the native file picker (native input is
     visually hidden; the styled button triggers it).
   - Picking a file opens a crop modal: drag to pan, slider to
     zoom, all within a fixed square viewport.
   - What's visible in that square IS the exported image — the
     canvas is drawn at CROP_OUTPUT_SIZE px internally so the
     result stays sharp even though the on-screen box is smaller.
*/
const CROP_OUTPUT_SIZE = 500;
let photoDataUrl = null;
let cropImage = null;
let cropZoomValue = 1;
let cropOffsetX = 0;
let cropOffsetY = 0;
let cropDragging = false;
let cropDragStartX = 0;
let cropDragStartY = 0;
let cropDragOffsetStartX = 0;
let cropDragOffsetStartY = 0;

function initPhotoUpload() {
  const chooseBtn = document.getElementById('photoChooseBtn');
  const removeBtn = document.getElementById('photoRemoveBtn');
  const fileInput = document.getElementById('userPhoto');
  const cropCanvas = document.getElementById('cropCanvas');
  const cropStage = document.getElementById('cropStage');
  const cropZoom = document.getElementById('cropZoom');
  const cropCancelBtn = document.getElementById('cropCancelBtn');
  const cropConfirmBtn = document.getElementById('cropConfirmBtn');

  chooseBtn.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        cropImage = img;
        cropZoomValue = 1;
        cropOffsetX = 0;
        cropOffsetY = 0;
        cropZoom.value = 1;
        cropCanvas.width = CROP_OUTPUT_SIZE;
        cropCanvas.height = CROP_OUTPUT_SIZE;
        drawCrop();
        document.getElementById('cropModal').classList.remove('hidden');
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });

  removeBtn.addEventListener('click', () => {
    photoDataUrl = null;
    document.getElementById('photoPreviewImg').classList.add('hidden');
    document.getElementById('photoPreviewImg').src = '';
    document.getElementById('photoPlaceholder').classList.remove('hidden');
    removeBtn.classList.add('hidden');
  });

  cropZoom.addEventListener('input', () => {
    cropZoomValue = parseFloat(cropZoom.value);
    clampCropOffset();
    drawCrop();
  });

  const getStageScale = () => CROP_OUTPUT_SIZE / cropStage.getBoundingClientRect().width;

  const startDrag = (clientX, clientY) => {
    cropDragging = true;
    cropDragStartX = clientX;
    cropDragStartY = clientY;
    cropDragOffsetStartX = cropOffsetX;
    cropDragOffsetStartY = cropOffsetY;
  };
  const moveDrag = (clientX, clientY) => {
    if (!cropDragging) return;
    const scale = getStageScale();
    cropOffsetX = cropDragOffsetStartX + (clientX - cropDragStartX) * scale;
    cropOffsetY = cropDragOffsetStartY + (clientY - cropDragStartY) * scale;
    clampCropOffset();
    drawCrop();
  };
  const endDrag = () => { cropDragging = false; };

  cropStage.addEventListener('mousedown', (e) => startDrag(e.clientX, e.clientY));
  window.addEventListener('mousemove', (e) => moveDrag(e.clientX, e.clientY));
  window.addEventListener('mouseup', endDrag);

  cropStage.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    startDrag(t.clientX, t.clientY);
  }, { passive: true });
  cropStage.addEventListener('touchmove', (e) => {
    const t = e.touches[0];
    moveDrag(t.clientX, t.clientY);
  }, { passive: true });
  cropStage.addEventListener('touchend', endDrag);

  cropCancelBtn.addEventListener('click', () => {
    document.getElementById('cropModal').classList.add('hidden');
    fileInput.value = '';
  });

  cropConfirmBtn.addEventListener('click', () => {
    drawCrop();
    photoDataUrl = cropCanvas.toDataURL('image/jpeg', 0.92);
    document.getElementById('photoPreviewImg').src = photoDataUrl;
    document.getElementById('photoPreviewImg').classList.remove('hidden');
    document.getElementById('photoPlaceholder').classList.add('hidden');
    document.getElementById('photoRemoveBtn').classList.remove('hidden');
    document.getElementById('cropModal').classList.add('hidden');
    fileInput.value = '';
  });
}

function getCropGeometry() {
  const coverScale = Math.max(CROP_OUTPUT_SIZE / cropImage.width, CROP_OUTPUT_SIZE / cropImage.height);
  const finalScale = coverScale * cropZoomValue;
  const drawW = cropImage.width * finalScale;
  const drawH = cropImage.height * finalScale;
  return { drawW, drawH };
}

function clampCropOffset() {
  if (!cropImage) return;
  const { drawW, drawH } = getCropGeometry();
  const maxX = Math.max(0, (drawW - CROP_OUTPUT_SIZE) / 2);
  const maxY = Math.max(0, (drawH - CROP_OUTPUT_SIZE) / 2);
  cropOffsetX = Math.min(maxX, Math.max(-maxX, cropOffsetX));
  cropOffsetY = Math.min(maxY, Math.max(-maxY, cropOffsetY));
}

function drawCrop() {
  if (!cropImage) return;
  const canvas = document.getElementById('cropCanvas');
  const ctx = canvas.getContext('2d');
  const { drawW, drawH } = getCropGeometry();
  const dx = (CROP_OUTPUT_SIZE - drawW) / 2 + cropOffsetX;
  const dy = (CROP_OUTPUT_SIZE - drawH) / 2 + cropOffsetY;
  ctx.clearRect(0, 0, CROP_OUTPUT_SIZE, CROP_OUTPUT_SIZE);
  ctx.drawImage(cropImage, dx, dy, drawW, drawH);
}

/**
 * The cropper only produces a base64 data URL (from canvas.toDataURL).
 * The backend's photo field expects an actual uploaded file, so this
 * turns that data URL into a real Blob we can put in a FormData request.
 */
function dataUrlToBlob(dataUrl) {
  const [header, base64] = dataUrl.split(',');
  const mimeMatch = header.match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/* ============================================================
   Data collection (shared by review + save)
   ============================================================ */
function collectResumeData() {
  const resumeData = {
    title: document.getElementById('title').value,
    summary: document.getElementById('summary').value,
    personal_info: {}, links: [], experience: [], projects: [], education: [], languages: [], skills: [], certifications: [],
  };

  const personalInfoContainer = document.querySelector('#personalInfoContainer')

  resumeData.personal_info = {
    id: personalInfoId,
    first_name: personalInfoContainer.querySelector('#firstName').value,
    last_name: personalInfoContainer.querySelector('#lastName').value,
    email: personalInfoContainer.querySelector('#email').value,
    phone_number: personalInfoContainer.querySelector('#phoneNumber').value,
    photo: photoDataUrl,
  };


  document.querySelectorAll('#linksContainer > .entry-card').forEach(el => {
    resumeData.links.push({
      platform: el.querySelector('.link-platform').value,
      url: el.querySelector('.link-url').value,
    });
  });

  document.querySelectorAll('#experienceContainer > .entry-card').forEach(el => {
    const endDate = el.querySelector('.exp-end').value;
    resumeData.experience.push({
      position: el.querySelector('.exp-position').value,
      company_name: el.querySelector('.exp-company').value,
      start_date: el.querySelector('.exp-start').value,
      end_date: endDate ? endDate : null,
      is_current: el.querySelector('.exp-current').checked,
      description: el.querySelector('.exp-desc').value,
    });
  });

  document.querySelectorAll('#projectsContainer > .entry-card').forEach(el => {
    const link = el.querySelector('.proj-link').value;
    resumeData.projects.push({
      title: el.querySelector('.proj-title').value,
      technologies: el.querySelector('.proj-tech').value,
      link: link ? link : null,
      description: el.querySelector('.proj-desc').value,
    });
  });

  document.querySelectorAll('#educationContainer > .entry-card').forEach(el => {
    resumeData.education.push({
      institution: el.querySelector('.edu-inst').value,
      degree: el.querySelector('.edu-degree').value,
      field_of_study: el.querySelector('.edu-study').value,
      start_year: parseInt(el.querySelector('.edu-startyear').value),
      graduation_year: parseInt(el.querySelector('.edu-year').value),
    });
  });

  document.querySelectorAll('#languagesContainer > .entry-card').forEach(el => {
    resumeData.languages.push({
      name: el.querySelector('.lang-name').value,
      level: el.querySelector('.lang-level').value,
    });
  });

  document.querySelectorAll('#skillsContainer > .entry-card').forEach(el => {
    resumeData.skills.push({
      name: el.querySelector('.skill-name').value,
      level: el.querySelector('.skill-level').value,
    });
  });

  document.querySelectorAll('#certificationsContainer > .entry-card').forEach(el => {
    const date = el.querySelector('.cert-date').value;
    resumeData.certifications.push({
      name: el.querySelector('.cert-name').value,
      issuing_organization: el.querySelector('.cert-org').value,
      issue_date: date ? date : null,
    });
  });

  return resumeData;
}

/* ============================================================
   Review step rendering
   ============================================================ */
function renderReview() {
  const data = collectResumeData();
  const host = document.getElementById('reviewContent');

  const card = (stepN, title, bodyHtml) => `
    <div class="review-card">
      <div class="review-card-head">
        <h3>${title}</h3>
        <button type="button" class="review-edit" onclick="goToStep(${stepN})">Редагувати →</button>
      </div>
      ${bodyHtml}
    </div>
  `;

  host.innerHTML = [
    card(1, 'Основне', `
      <p class="review-row"><span>Посада:</span> ${escapeHtml(data.title) || '—'}</p>
      <p class="review-row"><span>Про себе:</span> ${escapeHtml(data.summary) || '—'}</p>
    `),
    card(2, 'Персональні дані', `
      ${photoDataUrl ? `<img src="${photoDataUrl}" alt="Фото профілю" style="width:64px;height:64px;border-radius:50%;object-fit:cover;margin-bottom:.6rem;">` : ''}
      <p class="review-row"><span>Ім'я:</span> ${escapeHtml(data.personal_info.first_name) || '—'}</p>
      <p class="review-row"><span>Прізвище:</span> ${escapeHtml(data.personal_info.last_name) || '—'}</p>
      <p class="review-row"><span>Електронна пошта:</span> ${escapeHtml(data.personal_info.email) || '—'}</p>
      <p class="review-row"><span>Номер телефону:</span> ${escapeHtml(data.personal_info.phone_number) || '—'}</p>
    `),
    card(3, 'Посилання', data.links.length
      ? data.links.map(l => `<p class="review-row review-item"><span>${l.platform}:</span> ${escapeHtml(l.url) || '—'}</p>`).join('')
      : `<p class="review-empty">Немає посилань.</p>`),
    card(4, 'Досвід роботи', data.experience.length
      ? data.experience.map(e => `
          <div class="review-item">
            <p class="review-row"><strong>${escapeHtml(e.position) || '—'}</strong> · ${escapeHtml(e.company_name) || '—'}</p>
            <p class="review-row"><span>Період:</span> ${e.start_date || '—'} — ${e.is_current ? 'дотепер' : (e.end_date || '—')}</p>
          </div>`).join('')
      : `<p class="review-empty">Досвід не додано.</p>`),
    card(5, 'Проєкти', data.projects.length
      ? data.projects.map(p => `<p class="review-row review-item"><strong>${escapeHtml(p.title) || '—'}</strong> · ${escapeHtml(p.technologies) || '—'}</p>`).join('')
      : `<p class="review-empty">Проєкти не додано.</p>`),
    card(6, 'Освіта', data.education.length
      ? data.education.map(e => `<p class="review-row review-item">${escapeHtml(e.institution) || '—'} — ${escapeHtml(e.degree) || '—'} (${e.start_year || '—'} - ${e.graduation_year || '—'})</p>`).join('')
      : `<p class="review-empty">Освіту не додано.</p>`),
    card(7, 'Мови', data.languages.length
      ? data.languages.map(l => `<p class="review-row review-item">${escapeHtml(l.name) || '—'} — ${l.level}</p>`).join('')
      : `<p class="review-empty">Мови не додано.</p>`),
    card(8, 'Навички', data.skills.length
      ? data.skills.map(l => `<p class="review-row review-item">${escapeHtml(l.name) || '—'} — ${l.level}</p>`).join('')
      : `<p class="review-empty">Навичок не додано.</p>`),
    card(9, 'Сертифікати', data.certifications.length
      ? data.certifications.map(c => `<p class="review-row review-item">${escapeHtml(c.name) || '—'} · ${escapeHtml(c.issuing_organization) || '—'}</p>`).join('')
      : `<p class="review-empty">Сертифікати не додано.</p>`),
  ].join('');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

/* ============================================================
   Edit mode: load an existing resume and prefill the wizard
   ============================================================ */
async function loadResumeForEdit(id) {
  if (!localStorage.getItem(STORAGE_KEYS.access)) return;

  const response = await authFetch(`${API_BASE_URL}/resumes/${id}/`, { method: 'GET' });
  if (!response) return;

  if (!response.ok) {
    showToast('Не вдалося завантажити резюме для редагування.', 'error');
    return;
  }

  const data = await response.json();

  personalInfoId = data.personal_info.id || null;
  document.getElementById('title').value = data.title || '';
  document.getElementById('summary').value = data.summary || '';

  document.getElementById('firstName').value = data.personal_info.first_name || '';
  document.getElementById('lastName').value = data.personal_info.last_name || '';
  document.getElementById('email').value = data.personal_info.email || '';
  document.getElementById('phoneNumber').value = data.personal_info.phone_number || '';

  if (data.personal_info.photo) {
    photoDataUrl = data.personal_info.photo;
    document.getElementById('photoPreviewImg').src = photoDataUrl;
    document.getElementById('photoPreviewImg').classList.remove('hidden');
    document.getElementById('photoPlaceholder').classList.add('hidden');
    document.getElementById('photoRemoveBtn').classList.remove('hidden');
  }

  (data.links || []).forEach(link => {
    addLink();
    const el = document.querySelector('#linksContainer > .entry-card:last-child');
    el.querySelector('.link-platform').value = link.platform;
    el.querySelector('.link-url').value = link.url;
  });

  (data.experience || []).forEach(exp => {
    addExperience();
    const el = document.querySelector('#experienceContainer > .entry-card:last-child');
    el.querySelector('.exp-position').value = exp.position || '';
    el.querySelector('.exp-company').value = exp.company_name || '';
    el.querySelector('.exp-start').value = exp.start_date || '';
    el.querySelector('.exp-current').checked = !!exp.is_current;
    el.querySelector('.exp-desc').value = exp.description || '';
    if (exp.is_current) {
      toggleDateEnd(el.querySelector('.exp-current'));
    } else {
      el.querySelector('.exp-end').value = exp.end_date || '';
    }
  });

  (data.projects || []).forEach(proj => {
    addProject();
    const el = document.querySelector('#projectsContainer > .entry-card:last-child');
    el.querySelector('.proj-title').value = proj.title || '';
    el.querySelector('.proj-tech').value = proj.technologies || '';
    el.querySelector('.proj-link').value = proj.link || '';
    el.querySelector('.proj-desc').value = proj.description || '';
  });

  (data.education || []).forEach(edu => {
    addEducation();
    const el = document.querySelector('#educationContainer > .entry-card:last-child');
    el.querySelector('.edu-inst').value = edu.institution || '';
    el.querySelector('.edu-degree').value = edu.degree || '';
    el.querySelector('.edu-study').value = edu.field_of_study || '';
    el.querySelector('.edu-startyear').value = edu.start_year || '';
    el.querySelector('.edu-year').value = edu.graduation_year || '';
  });

  (data.languages || []).forEach(lang => {
    addLanguage();
    const el = document.querySelector('#languagesContainer > .entry-card:last-child');
    el.querySelector('.lang-name').value = lang.name || '';
    el.querySelector('.lang-level').value = lang.level || 'B1';
  });

  (data.skills || []).forEach(lang => {
    addSkill();
    const el = document.querySelector('#skillsContainer > .entry-card:last-child');
    el.querySelector('.skill-name').value = lang.name || '';
    el.querySelector('.skill-level').value = lang.level || 'Не хочу вказувати';
  });

  (data.certifications || []).forEach(cert => {
    addCertification();
    const el = document.querySelector('#certificationsContainer > .entry-card:last-child');
    el.querySelector('.cert-name').value = cert.name || '';
    el.querySelector('.cert-org').value = cert.issuing_organization || '';
    el.querySelector('.cert-date').value = cert.issue_date || '';
  });

  createdResumeId = id;
  savedOnce = true;
  localStorage.setItem(STORAGE_KEYS.resumeId, id);
  document.getElementById('saveBtn').textContent = 'Зберегти зміни';
  document.getElementById('exportBtn').classList.remove('hidden');
  showToast('Резюме завантажено для редагування.', 'success');
}


/**
 * The save request now goes as multipart/form-data instead of plain JSON,
 * because the backend's personal_info.photo field needs a real uploaded
 * file, not a base64 string. List sections (links, experience, ...) are
 * plain JSON, so they're sent as JSON-encoded text fields alongside it.
 *
 * NOTE: adjust the key names below (e.g. 'personal_info.photo') if your
 * Django view/serializer expects a different field name — check how it
 * reads request.data / request.FILES for the nested personal_info write.
 */

function buildResumeFormData(data) {
  const fd = new FormData();
  fd.append('title', data.title || '');
  fd.append('summary', data.summary || '');

  const personalInfo = {
    id: data.personal_info.id || null,
    first_name: data.personal_info.first_name || '',
    last_name: data.personal_info.last_name || '',
    email: data.personal_info.email || '',
    phone_number: data.personal_info.phone_number || '',
  };
  fd.append('personal_info', JSON.stringify(personalInfo));

  if (photoDataUrl && photoDataUrl.startsWith('data:')) {
    fd.append('photo', dataUrlToBlob(photoDataUrl), 'photo.jpg');
  }

  fd.append('links', JSON.stringify(data.links));
  fd.append('experience', JSON.stringify(data.experience));
  fd.append('projects', JSON.stringify(data.projects));
  fd.append('education', JSON.stringify(data.education));
  fd.append('languages', JSON.stringify(data.languages));
  fd.append('skills', JSON.stringify(data.skills));
  fd.append('certifications', JSON.stringify(data.certifications));

  return fd;
}


async function handleSave() {
  if (!localStorage.getItem(STORAGE_KEYS.access)) {
    showToast('Потрібно авторизуватися.', 'error');
    document.getElementById('authModal').classList.remove('hidden');
    return;
  }

  const resumeData = collectResumeData();
  const saveBtn = document.getElementById('saveBtn');
  const originalLabel = saveBtn.textContent;
  saveBtn.disabled = true;
  saveBtn.textContent = editingResumeId ? 'Оновлення...' : 'Збереження...';

  try {
    const url = editingResumeId
      ? `${API_BASE_URL}/resumes/${editingResumeId}/`
      : `${API_BASE_URL}/resumes/`;

    // No Content-Type header here on purpose — the browser sets the
    // correct multipart/form-data boundary automatically for FormData.
    const response = await authFetch(url, {
      method: editingResumeId ? 'PATCH' : 'POST',
      body: buildResumeFormData(resumeData),
    });

    if (!response) {
      saveBtn.textContent = originalLabel;
      return;
    }

    if (response.ok) {
      const result = await response.json();
      createdResumeId = result.id;
      savedOnce = true;
      localStorage.setItem(STORAGE_KEYS.resumeId, result.id);

      showToast(editingResumeId ? 'Зміни збережено!' : 'Резюме збережено!', 'success');

      document.getElementById('exportBtn').classList.remove('hidden');
      saveBtn.textContent = 'Зберегти зміни';
    } else {
      const errorData = await response.json();
      showToast('Помилка сервера: ' + JSON.stringify(errorData), 'error');
      saveBtn.textContent = originalLabel;
    }
  } catch (error) {
    console.error(error);
    showToast('Не вдалося з’єднатися із сервером.', 'error');
    saveBtn.textContent = originalLabel;
  } finally {
    saveBtn.disabled = false;
  }
}


// Конфігурація шаблонів (як у resume.js)
const EXPORT_TEMPLATES = [
  { id: 'default', label: 'Default' },
  { id: 'circular_cvwizard', label: 'Circular · CV Wizard' },
  { id: 'claude_template_01', label: 'Claude — Template 01' },
  { id: 'claude_template_02', label: 'Claude — Template 02' },
  { id: 'claude_template_03', label: 'Claude — Template 03' },
  { id: 'claude_template_04', label: 'Claude — Template 04' },
];

// Відкриття модалки
function openTemplateModal() {
  const list = document.getElementById('templateList');
  list.innerHTML = EXPORT_TEMPLATES.map(t => `
    <button type="button" class="template-option" data-template="${t.id}">
      <span class="template-option-name">${t.label}</span>
      <span class="template-option-id">${t.id}</span>
    </button>
  `).join('');

  list.querySelectorAll('.template-option').forEach(opt => {
    opt.addEventListener('click', async () => {
      document.getElementById('templateModal').classList.add('hidden');
      await performExport(opt.dataset.template);
    });
  });

  document.getElementById('templateModal').classList.remove('hidden');
}

// Обробка скасування
document.getElementById('templateModalCancel').addEventListener('click', () => {
  document.getElementById('templateModal').classList.add('hidden');
});

// Функція експорту (викликається при кліку на кнопку Експорт у вашому UI)
async function performExport(template) {
  const exportBtn = document.getElementById('exportBtn'); // ID вашої кнопки експорту
  const originalLabel = exportBtn.textContent;
  
  exportBtn.disabled = true;
  exportBtn.textContent = 'Готуємо...';

  try {
    const url = `${API_BASE_URL}/resumes/${createdResumeId}/export/?template=${encodeURIComponent(template)}`;
    const response = await authFetch(url, { method: 'GET' });
    
    if (!response || !response.ok) throw new Error('Export error');

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, '_blank');
    showToast('Резюме експортовано!', 'success');
  } catch (error) {
    showToast('Не вдалося експортувати резюме.', 'error');
  } finally {
    exportBtn.disabled = false;
    exportBtn.textContent = originalLabel;
  }
}