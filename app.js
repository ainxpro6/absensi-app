// ==================== UTILITY FUNCTIONS ====================

/** Debounce utility — delays function execution until after `wait` ms of inactivity */
function debounce(fn, wait) {
  let timerId = null;
  return function (...args) {
    clearTimeout(timerId);
    timerId = setTimeout(() => fn.apply(this, args), wait);
  };
}

/** Cached Intl.NumberFormat instance — reused across all formatRupiah calls */
const rupiahFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
});

/** Format number to Rupiah string using cached formatter */
function formatRupiah(num) {
  return rupiahFormatter.format(num);
}

// ==================== TOAST NOTIFICATION SYSTEM ====================

/** 
 * Show a toast notification instead of alert().
 * @param {string} message - Text to display
 * @param {'success'|'error'|'warning'|'info'} type - Toast type
 * @param {number} duration - Duration in ms (default 3500)
 */
function showToast(message, type = "info", duration = 3500) {
  // Create container if it doesn't exist
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;

  const iconMap = {
    success: "check-circle",
    error: "alert-circle",
    warning: "alert-triangle",
    info: "info"
  };

  toast.innerHTML = `
    <i data-lucide="${iconMap[type] || 'info'}" class="toast-icon"></i>
    <span class="toast-message">${message}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">
      <i data-lucide="x"></i>
    </button>
  `;

  container.appendChild(toast);
  lucide.createIcons({ nodes: [toast] });

  // Trigger entrance animation
  requestAnimationFrame(() => toast.classList.add("toast-visible"));

  // Auto-dismiss
  setTimeout(() => {
    toast.classList.remove("toast-visible");
    toast.addEventListener("transitionend", () => toast.remove(), { once: true });
    // Fallback removal if transitionend doesn't fire
    setTimeout(() => toast.remove(), 400);
  }, duration);
}

/**
 * Custom confirm dialog (replaces window.confirm).
 * Returns a Promise that resolves to true/false.
 */
function showConfirm(message, title = "Konfirmasi") {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "confirm-overlay active";
    overlay.innerHTML = `
      <div class="confirm-card">
        <div class="confirm-header">
          <i data-lucide="alert-triangle"></i>
          <h3>${title}</h3>
        </div>
        <p class="confirm-message">${message}</p>
        <div class="confirm-actions">
          <button class="btn btn-secondary confirm-cancel">Batal</button>
          <button class="btn btn-danger confirm-ok">Ya, Lanjutkan</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    lucide.createIcons({ nodes: [overlay] });

    const cleanup = (result) => {
      overlay.classList.remove("active");
      overlay.addEventListener("transitionend", () => overlay.remove(), { once: true });
      setTimeout(() => overlay.remove(), 400);
      resolve(result);
    };

    overlay.querySelector(".confirm-cancel").addEventListener("click", () => cleanup(false));
    overlay.querySelector(".confirm-ok").addEventListener("click", () => cleanup(true));
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) cleanup(false);
    });

    // Focus the cancel button by default (safer)
    overlay.querySelector(".confirm-cancel").focus();
  });
}

// ==================== STATE MANAGEMENT ====================

let appState = {
  budget: 300000,
  totalEmployees: 17,
  totalPool: 0,
  totalRajin: 0,
  employees: []
};

// Default Karyawan (17 nama sesuai PRD)
const DEFAULT_EMPLOYEES = [
  "Anto", "Berry", "Bocil", "Davit", "Dede", "Doyok", 
  "Ega", "Fadil", "Farid", "Gugun", "Rahmen", "Otam", 
  "Alvian", "Riski", "Ari", "Ariel", "Iket"
];

// Configuration
let gasUrl = localStorage.getItem("gas_url") || "";
let isDemoMode = !gasUrl;

// Sync State Pelacakan (Batching)
let syncedEmployees = [];
let syncedBudget = 300000;
let pendingUpdates = {
  budget: null,
  attendanceUpdates: []
};

// ==================== DOM ELEMENTS ====================

const budgetInput = document.getElementById("budget-input");
const saveBudgetBtn = document.getElementById("save-budget-btn");
const saveChangesBtn = document.getElementById("save-changes-btn");
const unsavedCount = document.getElementById("unsaved-count");
const statJatahDasar = document.getElementById("stat-jatah-dasar");
const statPoolPotongan = document.getElementById("stat-pool-potongan");
const statPenerimaBonus = document.getElementById("stat-penerima-bonus");
const statBonusPerOrang = document.getElementById("stat-bonus-per-orang");
const statEfisiensi = document.getElementById("stat-efisiensi");
const searchInput = document.getElementById("search-input");
const resetBtn = document.getElementById("reset-attendance-btn");
const exportPdfBtn = document.getElementById("export-pdf-btn");
const attendanceRows = document.getElementById("attendance-rows");
const connectionStatus = document.getElementById("connection-status");
const themeToggle = document.getElementById("theme-toggle");
const settingsModal = document.getElementById("settings-modal");
const gasUrlInput = document.getElementById("gas-url-input");
const printSlipTemplate = document.getElementById("print-slip-template");

// ==================== INITIALIZATION ====================

document.addEventListener("DOMContentLoaded", () => {
  // Initialize Theme
  const savedTheme = localStorage.getItem("theme") || "light";
  if (savedTheme === "dark") {
    document.body.classList.add("dark-theme");
    updateThemeIcon(true);
  }
  
  // Initialize lucide icons
  lucide.createIcons();

  // Load Data
  initData();

  // Event Listeners
  themeToggle.addEventListener("click", toggleTheme);
  
  budgetInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      saveBudget();
      budgetInput.blur();
    }
  });
  budgetInput.addEventListener("change", saveBudget);
  saveBudgetBtn.addEventListener("click", saveBudget);
  saveChangesBtn.addEventListener("click", syncPendingChanges);
  
  // Debounced search (300ms delay)
  searchInput.addEventListener("input", debounce(() => {
    renderGrid(searchInput.value);
  }, 300));
  
  resetBtn.addEventListener("click", resetAllAttendance);
  exportPdfBtn.addEventListener("click", printSlips);
});

// ==================== DATA LOADING ====================

async function initData() {
  updateConnectionStatusUI();
  
  if (isDemoMode) {
    const localData = localStorage.getItem("demo_absensi_data");
    if (localData) {
      try {
        appState = JSON.parse(localData);
      } catch (e) {
        initializeLocalDemoState();
      }
    } else {
      initializeLocalDemoState();
    }
    calculateState();
    renderGrid();
  } else {
    await fetchFromSheets();
  }
}

function initializeLocalDemoState() {
  appState.budget = 300000;
  appState.totalEmployees = DEFAULT_EMPLOYEES.length;
  appState.employees = DEFAULT_EMPLOYEES.map(name => ({
    name: name,
    attendance: Array(10).fill(false),
    totalAbsen: 0,
    jatahDasar: 0,
    potongan: 0,
    bonus: 0,
    totalAkhir: 0
  }));
}

// ==================== CALCULATION ENGINE ====================

function calculateState() {
  const budget = appState.budget;
  const numEmployees = appState.totalEmployees;
  
  // 1. Jatah Dasar = FLOOR(Budget / 17, 5000)
  const jatahDasar = Math.floor((budget / numEmployees) / 5000) * 5000;
  
  // 2. Hitung absen dan potongan
  let totalBayarAbsen = 0;
  let totalPool = 0;
  
  appState.employees.forEach(emp => {
    emp.totalAbsen = emp.attendance.filter(v => v === true).length;
    emp.jatahDasar = jatahDasar;
    
    if (emp.totalAbsen === 10) {
      emp.potongan = jatahDasar;
      emp.totalAkhir = 0;
      emp.bonus = 0;
      totalPool += emp.potongan;
      totalBayarAbsen += emp.totalAkhir;
    } else if (emp.totalAbsen > 0) {
      emp.potongan = Math.min(emp.totalAbsen * 10000, 100000, jatahDasar);
      emp.totalAkhir = jatahDasar - emp.potongan;
      emp.bonus = 0;
      totalPool += emp.potongan;
      totalBayarAbsen += emp.totalAkhir;
    }
  });

  // 3. Hitung karyawan hadir penuh
  const rajinEmployees = appState.employees.filter(emp => emp.totalAbsen === 0);
  const totalRajin = rajinEmployees.length;
  appState.totalRajin = totalRajin;
  appState.totalPool = totalPool;

  // 4. Redistribusi ke karyawan rajin
  if (totalRajin > 0) {
    const sisaAnggaran = budget - totalBayarAbsen;
    const totalAkhirRajin = Math.floor((sisaAnggaran / totalRajin) / 5000) * 5000;
    
    appState.employees.forEach(emp => {
      if (emp.totalAbsen === 0) {
        emp.potongan = 0;
        emp.totalAkhir = totalAkhirRajin;
        emp.bonus = totalAkhirRajin - jatahDasar;
      }
    });
  } else {
    appState.employees.forEach(emp => {
      if (emp.totalAbsen === 0) {
        emp.potongan = 0;
        emp.totalAkhir = jatahDasar;
        emp.bonus = 0;
      }
    });
  }

  // 5. Efisiensi anggaran
  const totalPaid = appState.employees.reduce((sum, emp) => sum + emp.totalAkhir, 0);
  appState.efisiensi = budget - totalPaid;

  if (isDemoMode) {
    localStorage.setItem("demo_absensi_data", JSON.stringify(appState));
  }
}

// ==================== RENDERING ====================

/**
 * Full render of the entire grid. Used for initial load, filter changes, and full resets.
 */
function renderGrid(filterText = "") {
  // Update Sync Button
  updateSyncButtonState();

  // Update Stats Cards (with pulse animation on value change)
  if (document.activeElement !== budgetInput) {
    budgetInput.value = appState.budget;
  }
  
  animateStatUpdate(statJatahDasar, formatRupiah(appState.employees[0]?.jatahDasar || 0));
  animateStatUpdate(statPoolPotongan, formatRupiah(appState.totalPool));
  statPenerimaBonus.textContent = `${appState.totalRajin} / ${appState.totalEmployees}`;
  
  const bonusPerOrang = appState.totalRajin > 0 ? Math.floor(appState.totalPool / appState.totalRajin) : 0;
  statBonusPerOrang.textContent = `Bonus per orang: ${formatRupiah(bonusPerOrang)}`;
  animateStatUpdate(statEfisiensi, formatRupiah(appState.efisiensi));

  // Render Rows
  attendanceRows.innerHTML = "";
  
  const filtered = appState.employees.filter(emp => 
    emp.name.toLowerCase().includes(filterText.toLowerCase())
  );

  if (filtered.length === 0) {
    attendanceRows.innerHTML = `
      <tr>
        <td colspan="16" class="loading-state">
          <p>Karyawan dengan nama "${filterText}" tidak ditemukan.</p>
        </td>
      </tr>
    `;
    return;
  }

  const fragment = document.createDocumentFragment();
  
  filtered.forEach(emp => {
    const globalIdx = appState.employees.findIndex(e => e.name === emp.name);
    const tr = buildEmployeeRow(emp, globalIdx);
    fragment.appendChild(tr);
  });
  
  attendanceRows.appendChild(fragment);
}

/**
 * Build a single employee table row element.
 */
function buildEmployeeRow(emp, globalIdx) {
  let rowClass = "";
  if (emp.totalAbsen === 0) rowClass = "full-attendance";
  if (emp.totalAbsen === 10) rowClass = "full-absent";

  const tr = document.createElement("tr");
  tr.setAttribute("data-emp-index", globalIdx);
  if (rowClass) tr.className = rowClass;

  let checkboxesHtml = "";
  for (let day = 0; day < 10; day++) {
    const isChecked = emp.attendance[day];
    checkboxesHtml += `
      <td class="checkbox-cell">
        <div class="custom-checkbox ${isChecked ? 'checked' : ''}" 
             role="checkbox"
             aria-checked="${isChecked}"
             aria-label="Hari ${day + 1} - ${emp.name}"
             tabindex="0"
             data-emp="${globalIdx}"
             data-day="${day}">
        </div>
      </td>
    `;
  }

  tr.innerHTML = `
    <td class="col-name">${emp.name}</td>
    ${checkboxesHtml}
    <td class="col-summary">${emp.totalAbsen} Hari</td>
    <td class="col-summary">${formatRupiah(emp.jatahDasar)}</td>
    <td class="col-summary text-danger">${emp.potongan > 0 ? '-' + formatRupiah(emp.potongan) : 'Rp 0'}</td>
    <td class="col-summary text-success">${emp.bonus > 0 ? '+' + formatRupiah(emp.bonus) : 'Rp 0'}</td>
    <td class="col-summary text-right ${emp.totalAbsen === 0 ? 'text-success' : 'text-danger'}">
      ${formatRupiah(emp.totalAkhir)}
    </td>
  `;
  
  return tr;
}

/**
 * Targeted row update — only re-renders the specific employee row 
 * instead of rebuilding the entire table.
 */
function updateSingleRow(empIdx) {
  const emp = appState.employees[empIdx];
  const existingRow = attendanceRows.querySelector(`tr[data-emp-index="${empIdx}"]`);
  
  if (!existingRow) {
    // Row not visible (filtered out), skip
    return;
  }
  
  const newRow = buildEmployeeRow(emp, empIdx);
  existingRow.replaceWith(newRow);
}

/**
 * Animate stat value update with a subtle pulse.
 */
function animateStatUpdate(el, newValue) {
  if (el.textContent !== newValue) {
    el.textContent = newValue;
    el.classList.add("stat-pulse");
    el.addEventListener("animationend", () => {
      el.classList.remove("stat-pulse");
    }, { once: true });
  }
}

// ==================== USER ACTIONS ====================

// Use event delegation on the table body for checkbox clicks + keyboard
attendanceRows.addEventListener("click", (e) => {
  const checkbox = e.target.closest(".custom-checkbox");
  if (checkbox) {
    const empIdx = parseInt(checkbox.dataset.emp, 10);
    const dayIdx = parseInt(checkbox.dataset.day, 10);
    toggleAttendanceCheckbox(empIdx, dayIdx);
  }
});

attendanceRows.addEventListener("keydown", (e) => {
  if (e.key === " " || e.key === "Enter") {
    const checkbox = e.target.closest(".custom-checkbox");
    if (checkbox) {
      e.preventDefault();
      const empIdx = parseInt(checkbox.dataset.emp, 10);
      const dayIdx = parseInt(checkbox.dataset.day, 10);
      toggleAttendanceCheckbox(empIdx, dayIdx);
    }
  }
});

function toggleAttendanceCheckbox(empIdx, dayIdx) {
  const currentVal = appState.employees[empIdx].attendance[dayIdx];
  const newVal = !currentVal;

  // Optimistic UI update
  appState.employees[empIdx].attendance[dayIdx] = newVal;
  calculateState();
  
  // Targeted update — only re-render the changed row + stats
  updateStatsCards();
  updateSingleRow(empIdx);
  
  // Also update other rows if their bonus/totalAkhir might have changed
  // (toggling one employee's attendance affects all "rajin" employees' bonus)
  appState.employees.forEach((emp, idx) => {
    if (idx !== empIdx) {
      updateSingleRow(idx);
    }
  });

  if (!isDemoMode) {
    trackPendingChange(empIdx, dayIdx, newVal);
  }
}

function trackPendingChange(empIdx, dayIdx, newVal) {
  const existingIdx = pendingUpdates.attendanceUpdates.findIndex(
    u => u.employeeIndex === empIdx && u.dayIndex === dayIdx
  );
  
  const originalVal = syncedEmployees[empIdx] ? syncedEmployees[empIdx].attendance[dayIdx] : false;

  if (newVal !== originalVal) {
    if (existingIdx !== -1) {
      pendingUpdates.attendanceUpdates[existingIdx].value = newVal;
    } else {
      pendingUpdates.attendanceUpdates.push({
        employeeIndex: empIdx,
        dayIndex: dayIdx,
        value: newVal
      });
    }
  } else {
    if (existingIdx !== -1) {
      pendingUpdates.attendanceUpdates.splice(existingIdx, 1);
    }
  }
  updateSyncButtonState();
}

/**
 * Update only the stats cards without re-rendering the table.
 */
function updateStatsCards() {
  if (document.activeElement !== budgetInput) {
    budgetInput.value = appState.budget;
  }
  
  animateStatUpdate(statJatahDasar, formatRupiah(appState.employees[0]?.jatahDasar || 0));
  animateStatUpdate(statPoolPotongan, formatRupiah(appState.totalPool));
  statPenerimaBonus.textContent = `${appState.totalRajin} / ${appState.totalEmployees}`;
  
  const bonusPerOrang = appState.totalRajin > 0 ? Math.floor(appState.totalPool / appState.totalRajin) : 0;
  statBonusPerOrang.textContent = `Bonus per orang: ${formatRupiah(bonusPerOrang)}`;
  animateStatUpdate(statEfisiensi, formatRupiah(appState.efisiensi));
  
  updateSyncButtonState();
}

async function saveBudget() {
  const val = Number(budgetInput.value);
  if (isNaN(val) || val < 100000) {
    showToast("Masukkan nominal anggaran minimal Rp 100.000", "warning");
    budgetInput.value = appState.budget;
    return;
  }

  if (val === appState.budget) return;

  appState.budget = val;
  calculateState();
  renderGrid(searchInput.value);
  showToast("Anggaran diperbarui: " + formatRupiah(val), "success", 2000);

  if (!isDemoMode) {
    if (val !== syncedBudget) {
      pendingUpdates.budget = val;
    } else {
      pendingUpdates.budget = null;
    }
    updateSyncButtonState();
  }
}

async function resetAllAttendance() {
  const confirmed = await showConfirm(
    "Apakah Anda yakin ingin me-reset seluruh absensi periode desade ini? Semua data kehadiran akan dikosongkan.",
    "Reset Absensi"
  );
  if (!confirmed) return;

  appState.employees.forEach(emp => {
    emp.attendance = Array(10).fill(false);
  });
  calculateState();
  renderGrid(searchInput.value);
  showToast("Seluruh absensi berhasil di-reset", "success");

  if (!isDemoMode) {
    showTableLoading(true);
    const updates = [];
    for (let empIdx = 0; empIdx < appState.totalEmployees; empIdx++) {
      for (let dayIdx = 0; dayIdx < 10; dayIdx++) {
        updates.push({
          employeeIndex: empIdx,
          dayIndex: dayIdx,
          value: false
        });
      }
    }
    
    try {
      const result = await postToSheets({ attendanceUpdates: updates });
      if (result && result.status === "success") {
        appState = result.data;
        syncedBudget = appState.budget;
        syncedEmployees = JSON.parse(JSON.stringify(appState.employees));
        pendingUpdates.budget = null;
        pendingUpdates.attendanceUpdates = [];
        updateSyncButtonState();
        showToast("Data berhasil disinkronkan ke Google Sheets", "success");
      }
    } catch (e) {
      showToast("Gagal me-reset absensi di Google Sheets", "error");
    } finally {
      showTableLoading(false);
    }
  }
}

// ==================== GOOGLE SHEETS SYNC API ====================

async function fetchFromSheets() {
  showTableLoading(true);
  try {
    const res = await fetch(gasUrl, { method: "GET", mode: "cors" });
    const json = await res.json();
    if (json.status === "success") {
      appState = json.data;
      
      syncedBudget = appState.budget;
      syncedEmployees = JSON.parse(JSON.stringify(appState.employees));
      
      pendingUpdates.budget = null;
      pendingUpdates.attendanceUpdates = [];
      
      isDemoMode = false;
      updateConnectionStatusUI();
      updateSyncButtonState();
      renderGrid();
      showToast("Data berhasil dimuat dari Google Sheets", "success", 2000);
    } else {
      throw new Error(json.message || "Unknown error");
    }
  } catch (err) {
    console.error("Fetch error:", err);
    showToast("Gagal memuat data dari Google Sheets. Periksa URL Apps Script Anda.", "error", 5000);
    isDemoMode = true;
    updateConnectionStatusUI();
    initData();
  } finally {
    showTableLoading(false);
  }
}

async function postToSheets(data) {
  try {
    const res = await fetch(gasUrl, {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(data)
    });
    return await res.json();
  } catch (err) {
    console.error("Post error:", err);
    throw err;
  }
}

// ==================== SETTINGS MODAL ====================

window.openSettingsModal = function() {
  gasUrlInput.value = gasUrl;
  settingsModal.classList.add("active");
};

window.closeSettingsModal = function() {
  settingsModal.classList.remove("active");
};

window.saveSettings = async function() {
  const url = gasUrlInput.value.trim();
  if (!url) {
    showToast("Masukkan URL yang valid!", "warning");
    return;
  }

  if (!url.startsWith("https://script.google.com/")) {
    showToast("Format URL salah. URL harus diawali dengan https://script.google.com/macros/s/", "error");
    return;
  }

  gasUrl = url;
  localStorage.setItem("gas_url", url);
  isDemoMode = false;
  closeSettingsModal();
  showToast("Menghubungkan ke Google Sheets...", "info", 2000);
  
  await initData();
};

window.disconnectGoogleSheets = async function() {
  const confirmed = await showConfirm(
    "Apakah Anda ingin memutuskan koneksi dari Google Sheets dan kembali ke penyimpanan lokal?",
    "Putuskan Koneksi"
  );
  if (confirmed) {
    gasUrl = "";
    localStorage.removeItem("gas_url");
    isDemoMode = true;
    closeSettingsModal();
    showToast("Koneksi Google Sheets diputuskan. Beralih ke penyimpanan lokal.", "warning");
    initData();
  }
};

// ==================== UI HELPERS ====================

function showTableLoading(show) {
  if (show) {
    attendanceRows.innerHTML = `
      <tr>
        <td colspan="16" class="loading-state">
          <div class="spinner"></div>
          <p>Sinkronisasi data Google Sheets...</p>
        </td>
      </tr>
    `;
  }
}

function updateConnectionStatusUI() {
  if (isDemoMode) {
    connectionStatus.className = "status-badge mode-demo";
    connectionStatus.querySelector(".status-text").textContent = "Mode Demo (Penyimpanan Lokal)";
  } else {
    connectionStatus.className = "status-badge mode-connected";
    connectionStatus.querySelector(".status-text").textContent = "Terhubung dengan Google Sheets";
  }
}

// ==================== THEME TOGGLE ====================

function toggleTheme() {
  const isDark = document.body.classList.toggle("dark-theme");
  localStorage.setItem("theme", isDark ? "dark" : "light");
  updateThemeIcon(isDark);
}

function updateThemeIcon(isDark) {
  const icon = themeToggle.querySelector("i");
  if (isDark) {
    icon.setAttribute("data-lucide", "sun");
  } else {
    icon.setAttribute("data-lucide", "moon");
  }
  // Scoped icon refresh — only re-render the changed icon, not the entire DOM
  lucide.createIcons({ nodes: [icon] });
}

// ==================== PRINT & PDF ====================

function printSlips() {
  printSlipTemplate.innerHTML = "";
  
  const bonusPerOrang = appState.totalRajin > 0 ? Math.floor(appState.totalPool / appState.totalRajin) : 0;
  const printDate = new Date().toLocaleDateString("id-ID", {
    day: "numeric", month: "long", year: "numeric"
  });
  
  const fragment = document.createDocumentFragment();
  
  appState.employees.forEach(emp => {
    const slipDiv = document.createElement("div");
    slipDiv.className = "print-slip";
    
    let statusText = "Hadir Penuh (0 Absen)";
    if (emp.totalAbsen === 10) statusText = "Absen Penuh (10 Hari)";
    else if (emp.totalAbsen > 0) statusText = `Absen ${emp.totalAbsen} Hari`;

    slipDiv.innerHTML = `
      <div class="print-slip-header">
        <h2>SLIP INSENTIF KARYAWAN</h2>
        <p>Siklus Desade (10 Hari Kerja)</p>
        <p class="print-date">Dicetak: ${printDate}</p>
      </div>
      
      <div class="print-slip-row">
        <span><strong>Nama Karyawan</strong></span>
        <span><strong>${emp.name}</strong></span>
      </div>
      
      <div class="print-slip-row">
        <span>Status Kehadiran</span>
        <span>${statusText}</span>
      </div>
      
      <div class="print-slip-row">
        <span>Jatah Dasar Awal (Dibulatkan)</span>
        <span>${formatRupiah(emp.jatahDasar)}</span>
      </div>
      
      <div class="print-slip-row text-danger">
        <span>Denda Potongan Absensi</span>
        <span>-${formatRupiah(emp.potongan)}</span>
      </div>
      
      <div class="print-slip-row text-success">
        <span>Bonus Distribusi Pool Karyawan Rajin</span>
        <span>+${formatRupiah(emp.bonus)}</span>
      </div>
      
      <div class="print-slip-row highlight">
        <span>TOTAL INSENTIF DITERIMA</span>
        <span>${formatRupiah(emp.totalAkhir)}</span>
      </div>
      
      <div class="print-slip-signatures">
        <div>
          <p>Disetujui Oleh,</p>
          <div class="signature-line"></div>
          <p>Manajemen / Owner</p>
        </div>
        <div>
          <p>Diterima Oleh,</p>
          <div class="signature-line"></div>
          <p>${emp.name}</p>
        </div>
      </div>
    `;
    
    fragment.appendChild(slipDiv);
  });
  
  printSlipTemplate.appendChild(fragment);
  window.print();
}

// ==================== SYNC BUTTON STATE ====================

function updateSyncButtonState() {
  if (isDemoMode) {
    saveChangesBtn.style.display = "none";
    return;
  }

  const unsavedAttendanceCount = pendingUpdates.attendanceUpdates.length;
  const unsavedBudgetCount = pendingUpdates.budget !== null ? 1 : 0;
  const totalUnsaved = unsavedAttendanceCount + unsavedBudgetCount;

  saveChangesBtn.style.display = "inline-flex";
  unsavedCount.textContent = totalUnsaved;

  if (totalUnsaved > 0) {
    saveChangesBtn.removeAttribute("disabled");
    saveChangesBtn.classList.add("has-changes");
  } else {
    saveChangesBtn.setAttribute("disabled", "true");
    saveChangesBtn.classList.remove("has-changes");
  }
}

async function syncPendingChanges() {
  if (isDemoMode) return;

  const unsavedAttendanceCount = pendingUpdates.attendanceUpdates.length;
  const unsavedBudgetCount = pendingUpdates.budget !== null ? 1 : 0;
  const totalUnsaved = unsavedAttendanceCount + unsavedBudgetCount;

  if (totalUnsaved === 0) return;

  showTableLoading(true);
  saveChangesBtn.setAttribute("disabled", "true");
  saveChangesBtn.classList.remove("has-changes");

  const payload = {};
  if (pendingUpdates.budget !== null) {
    payload.budget = pendingUpdates.budget;
  }
  if (pendingUpdates.attendanceUpdates.length > 0) {
    payload.attendanceUpdates = pendingUpdates.attendanceUpdates;
  }

  try {
    const result = await postToSheets(payload);
    if (result && result.status === "success") {
      appState = result.data;
      
      syncedBudget = appState.budget;
      syncedEmployees = JSON.parse(JSON.stringify(appState.employees));
      
      pendingUpdates.budget = null;
      pendingUpdates.attendanceUpdates = [];
      
      updateSyncButtonState();
      renderGrid(searchInput.value);
      showToast(`${totalUnsaved} perubahan berhasil disinkronkan`, "success");
    } else {
      throw new Error(result.message || "Gagal sinkronisasi");
    }
  } catch (e) {
    showToast("Gagal sinkronisasi data ke Google Sheets: " + e.message, "error", 5000);
    updateSyncButtonState();
    renderGrid(searchInput.value);
  }
}
