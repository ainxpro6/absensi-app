// State Management
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

// DOM Elements
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

// Initialize Application
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
  budgetInput.addEventListener("blur", saveBudget);
  saveBudgetBtn.addEventListener("click", saveBudget);
  saveChangesBtn.addEventListener("click", syncPendingChanges);
  
  searchInput.addEventListener("input", filterEmployees);
  resetBtn.addEventListener("click", resetAllAttendance);
  exportPdfBtn.addEventListener("click", printSlips);
});

// Load data based on current mode
async function initData() {
  updateConnectionStatusUI();
  
  if (isDemoMode) {
    // Load from LocalStorage or initialize with defaults
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

// Set default state for Local Demo Mode
function initializeLocalDemoState() {
  appState.budget = 300000;
  appState.totalEmployees = DEFAULT_EMPLOYEES.length;
  appState.employees = DEFAULT_EMPLOYEES.map(name => ({
    name: name,
    attendance: Array(10).fill(false), // 10 hari hadir (false = hadir)
    totalAbsen: 0,
    jatahDasar: 0,
    potongan: 0,
    bonus: 0,
    totalAkhir: 0
  }));
}

// Formula Calculation Engine (Sesuai Logika Konfirmasi User)
function calculateState() {
  const budget = appState.budget;
  const numEmployees = appState.totalEmployees;
  
  // 1. Jatah Dasar (M2) = FLOOR(Budget / 17, 5000)
  const jatahDasar = Math.floor((budget / numEmployees) / 5000) * 5000;
  
  // 2. Hitung absen dan potongan untuk karyawan tidak masuk penuh (1-10 hari absen)
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

  // 3. Hitung jumlah karyawan hadir penuh (0 absen)
  const rajinEmployees = appState.employees.filter(emp => emp.totalAbsen === 0);
  const totalRajin = rajinEmployees.length;
  appState.totalRajin = totalRajin;
  appState.totalPool = totalPool;

  // 4. Kalkulasi sisa anggaran dan bagi rata ke karyawan rajin (di-floor ke kelipatan 5000)
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
    // Jika tidak ada karyawan rajin, sisa jatah dasar (potongan) disimpan perusahaan
    appState.employees.forEach(emp => {
      if (emp.totalAbsen === 0) {
        emp.potongan = 0;
        emp.totalAkhir = jatahDasar;
        emp.bonus = 0;
      }
    });
  }

  // 5. Hitung pengeluaran total riil & efisiensi anggaran perusahaan
  const totalPaid = appState.employees.reduce((sum, emp) => sum + emp.totalAkhir, 0);
  appState.efisiensi = budget - totalPaid;

  // Save changes locally in demo mode
  if (isDemoMode) {
    localStorage.setItem("demo_absensi_data", JSON.stringify(appState));
  }
}

// Render Dashboard UI
function renderGrid(filterText = "") {
  // Update Sync Button
  updateSyncButtonState();

  // Update Stats Cards
  if (document.activeElement !== budgetInput) {
    budgetInput.value = appState.budget;
  }
  statJatahDasar.textContent = formatRupiah(appState.employees[0]?.jatahDasar || 0);
  statPoolPotongan.textContent = formatRupiah(appState.totalPool);
  statPenerimaBonus.textContent = `${appState.totalRajin} / ${appState.totalEmployees}`;
  
  const bonusPerOrang = appState.totalRajin > 0 ? Math.floor(appState.totalPool / appState.totalRajin) : 0;
  statBonusPerOrang.textContent = `Bonus per orang: ${formatRupiah(bonusPerOrang)}`;
  statEfisiensi.textContent = formatRupiah(appState.efisiensi);

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

  filtered.forEach(emp => {
    // Find index in global array
    const globalIdx = appState.employees.findIndex(e => e.name === emp.name);
    
    // Row classes
    let rowClass = "";
    if (emp.totalAbsen === 0) rowClass = "full-attendance";
    if (emp.totalAbsen === 10) rowClass = "full-absent";

    const tr = document.createElement("tr");
    if (rowClass) tr.className = rowClass;

    // Checkboxes columns B-K (1-10)
    let checkboxesHtml = "";
    for (let day = 0; day < 10; day++) {
      const isChecked = emp.attendance[day];
      checkboxesHtml += `
        <td class="checkbox-cell">
          <div class="custom-checkbox ${isChecked ? 'checked' : ''}" 
               onclick="toggleAttendanceCheckbox(${globalIdx}, ${day})"
               title="Hari ${day + 1} - ${emp.name}">
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
    
    attendanceRows.appendChild(tr);
  });
}

// User Actions
async function toggleAttendanceCheckbox(empIdx, dayIdx) {
  const currentVal = appState.employees[empIdx].attendance[dayIdx];
  const newVal = !currentVal;

  // Optimistic UI update
  appState.employees[empIdx].attendance[dayIdx] = newVal;
  calculateState();
  renderGrid(searchInput.value);

  if (!isDemoMode) {
    // Cari update yang sudah ada di antrean
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
      // Jika kembali ke nilai asli, hapus dari antrean
      if (existingIdx !== -1) {
        pendingUpdates.attendanceUpdates.splice(existingIdx, 1);
      }
    }
    updateSyncButtonState();
  }
}

async function saveBudget() {
  const val = Number(budgetInput.value);
  if (isNaN(val) || val < 100000) {
    alert("Masukkan nominal anggaran minimal Rp 100.000");
    budgetInput.value = appState.budget;
    return;
  }

  if (val === appState.budget) return;

  appState.budget = val;
  calculateState();
  renderGrid(searchInput.value);

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
  if (!confirm("Apakah Anda yakin ingin me-reset seluruh absensi periode desade ini?")) return;

  appState.employees.forEach(emp => {
    emp.attendance = Array(10).fill(false);
  });
  calculateState();
  renderGrid(searchInput.value);

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
        // Sinkronisasi berhasil, reset baseline
        syncedBudget = appState.budget;
        syncedEmployees = JSON.parse(JSON.stringify(appState.employees));
        pendingUpdates.budget = null;
        pendingUpdates.attendanceUpdates = [];
        updateSyncButtonState();
      }
    } catch (e) {
      alert("Gagal me-reset absensi di Google Sheets.");
    } finally {
      showTableLoading(false);
    }
  }
}

function filterEmployees() {
  renderGrid(searchInput.value);
}

// Google Sheets Sync API
async function fetchFromSheets() {
  showTableLoading(true);
  try {
    const res = await fetch(gasUrl, { method: "GET", mode: "cors" });
    const json = await res.json();
    if (json.status === "success") {
      appState = json.data;
      
      // Simpan copy data sinkronisasi awal
      syncedBudget = appState.budget;
      syncedEmployees = JSON.parse(JSON.stringify(appState.employees));
      
      // Reset status pending
      pendingUpdates.budget = null;
      pendingUpdates.attendanceUpdates = [];
      
      isDemoMode = false;
      updateConnectionStatusUI();
      updateSyncButtonState();
      renderGrid();
    } else {
      throw new Error(json.message);
    }
  } catch (err) {
    console.error("Fetch error:", err);
    alert("Gagal memuat data dari Google Sheets. Periksa URL Apps Script Anda.");
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
        "Content-Type": "text/plain;charset=utf-8" // Bypass preflight pre-cors
      },
      body: JSON.stringify(data)
    });
    return await res.json();
  } catch (err) {
    console.error("Post error:", err);
    throw err;
  }
}

// Settings Modal Actions
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
    alert("Masukkan URL yang valid!");
    return;
  }

  // Pre-validate Google Script URL
  if (!url.startsWith("https://script.google.com/")) {
    alert("Format URL salah. URL harus diawali dengan https://script.google.com/macros/s/");
    return;
  }

  gasUrl = url;
  localStorage.setItem("gas_url", url);
  isDemoMode = false;
  closeSettingsModal();
  
  await initData();
};

window.disconnectGoogleSheets = function() {
  if (confirm("Apakah Anda ingin memutuskan koneksi dari Google Sheets dan kembali ke penyimpanan lokal?")) {
    gasUrl = "";
    localStorage.removeItem("gas_url");
    isDemoMode = true;
    closeSettingsModal();
    initData();
  }
};

// UI Helpers
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

function formatRupiah(num) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(num);
}

// Theme Toggle
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
  lucide.createIcons();
}

// Print & PDF Slips Generator
function printSlips() {
  printSlipTemplate.innerHTML = "";
  
  const bonusPerOrang = appState.totalRajin > 0 ? Math.floor(appState.totalPool / appState.totalRajin) : 0;
  
  appState.employees.forEach(emp => {
    const slipDiv = document.createElement("div");
    slipDiv.className = "print-slip";
    
    // Status text for slip
    let statusText = "Hadir Penuh (0 Absen)";
    if (emp.totalAbsen === 10) statusText = "Absen Penuh (10 Hari)";
    else if (emp.totalAbsen > 0) statusText = `Absen ${emp.totalAbsen} Hari`;

    slipDiv.innerHTML = `
      <div class="print-slip-header">
        <h2>SLIP INSENTIF KARYAWAN</h2>
        <p>Siklus Desade (10 Hari Kerja)</p>
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
      
      <div style="margin-top: 3rem; display: flex; justify-content: space-between; text-align: center; font-size: 0.8rem;">
        <div>
          <p>Disetujui Oleh,</p>
          <div style="margin-top: 3rem; border-top: 1px solid #000; width: 150px;"></div>
          <p style="margin-top: 0.25rem;">Manajemen / Owner</p>
        </div>
        <div>
          <p>Diterima Oleh,</p>
          <div style="margin-top: 3rem; border-top: 1px solid #000; width: 150px;"></div>
          <p style="margin-top: 0.25rem;">${emp.name}</p>
        </div>
      </div>
    `;
    
    printSlipTemplate.appendChild(slipDiv);
  });
  
  // Open Browser Print Dialog
  window.print();
}

// Sinkronisasi dan Status Perubahan (Batching)
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
    saveChangesBtn.style.animation = "pulse-btn 2s infinite";
  } else {
    saveChangesBtn.setAttribute("disabled", "true");
    saveChangesBtn.style.animation = "none";
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
  saveChangesBtn.style.animation = "none";

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
      
      // Update baseline sinkronisasi
      syncedBudget = appState.budget;
      syncedEmployees = JSON.parse(JSON.stringify(appState.employees));
      
      // Reset pending
      pendingUpdates.budget = null;
      pendingUpdates.attendanceUpdates = [];
      
      updateSyncButtonState();
      renderGrid(searchInput.value);
    } else {
      throw new Error(result.message || "Gagal sinkronisasi");
    }
  } catch (e) {
    alert("Gagal sinkronisasi data ke Google Sheets: " + e.message);
    updateSyncButtonState(); // Aktifkan kembali agar bisa coba lagi
    renderGrid(searchInput.value); // Kembalikan grid dari loading
  }
}
