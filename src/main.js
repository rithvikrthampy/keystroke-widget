// Retrieve Tauri APIs if available
let appWindow = null;
let listen = null;
let invoke = null;

if (window.__TAURI__) {
  if (window.__TAURI__.window) {
    appWindow = window.__TAURI__.window.getCurrentWindow();
  }
  if (window.__TAURI__.core) {
    invoke = window.__TAURI__.core.invoke;
  }
  if (window.__TAURI__.event) {
    listen = window.__TAURI__.event.listen;
  }
}

// State variables
let history = {};
let todayKeystrokes = 0;
let dailyGoal = 5000;
let themeClass = "theme-cyan";
let alwaysOnTop = false;
let showCrt = true;
let showGrid = true;
let widgetOpacity = 100;
let autostart = false;

// DOM Elements
let widgetContainer;
let strokesTodayDisplay;
let avgStrokesDisplay;
let currentSpeedDisplay;
let settingsPanel;

// Form Inputs
let inputDailyGoal;
let themeOpts;
let inputAlwaysOnTop;
let inputAutostart;
let inputCrt;
let inputGrid;
let inputOpacity;
let opacityValDisplay;

// Live Typing Speed state
let keyTimestamps = [];

function recordKeystroke() {
  keyTimestamps.push(Date.now());
  pruneTimestamps();
}

function pruneTimestamps() {
  const cutoff = Date.now() - 5000;
  keyTimestamps = keyTimestamps.filter(t => t > cutoff);
}

// Format date to local YYYY-MM-DD
function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Generate array of past 7 days (local YYYY-MM-DD)
function getLast7Days() {
  const list = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    list.push(getLocalDateString(d));
  }
  return list;
}

// Format big number with commas
function formatNumber(num) {
  return num.toLocaleString();
}

function formatDayLabel(dateStr) {
  // Return "Mon", "Tue" etc.
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString('en-US', { weekday: 'short' });
}

// Load state from localStorage or set defaults
function loadState() {
  dailyGoal = parseInt(localStorage.getItem("keystroke_daily_goal") || "5000", 10);
  themeClass = localStorage.getItem("keystroke_theme") || "theme-cyan";
  alwaysOnTop = localStorage.getItem("keystroke_always_on_top") === "true";
  showCrt = localStorage.getItem("keystroke_crt_enabled") !== "false";
  showGrid = localStorage.getItem("keystroke_grid_enabled") !== "false";
  widgetOpacity = parseInt(localStorage.getItem("keystroke_opacity") || "100", 10);
}

function saveState() {
  localStorage.setItem("keystroke_daily_goal", dailyGoal.toString());
  localStorage.setItem("keystroke_theme", themeClass);
  localStorage.setItem("keystroke_always_on_top", alwaysOnTop.toString());
  localStorage.setItem("keystroke_crt_enabled", showCrt.toString());
  localStorage.setItem("keystroke_grid_enabled", showGrid.toString());
  localStorage.setItem("keystroke_opacity", widgetOpacity.toString());
}

function logToConsole(message) {
  const consoleEl = document.getElementById("tactical-console");
  if (!consoleEl) return;
  const div = document.createElement("div");
  div.className = "console-line";
  div.textContent = `> ${message}`;
  consoleEl.appendChild(div);
  while (consoleEl.children.length > 3) {
    consoleEl.removeChild(consoleEl.firstChild);
  }
}

// Apply settings visual states to HUD
function applyConfigurations() {
  if (widgetContainer) {
    widgetContainer.className = "widget-container " + themeClass;
    widgetContainer.style.opacity = widgetOpacity / 100;
  }

  // CRT scanlines overlay visibility
  if (showCrt) {
    document.body.classList.remove("scanlines-disabled");
  } else {
    document.body.classList.add("scanlines-disabled");
  }

  // Grid pattern visibility
  if (showGrid) {
    document.body.classList.remove("grid-disabled");
  } else {
    document.body.classList.add("grid-disabled");
  }

  // Apply Always on top configuration via Tauri
  if (appWindow) {
    appWindow.setAlwaysOnTop(alwaysOnTop).catch(err => {
      console.error("Failed to set always on top:", err);
    });
  }

  // Set picker inputs
  if (inputDailyGoal) inputDailyGoal.value = dailyGoal;
  if (inputAlwaysOnTop) inputAlwaysOnTop.checked = alwaysOnTop;
  if (inputAutostart) inputAutostart.checked = autostart;
  if (inputCrt) inputCrt.checked = showCrt;
  if (inputGrid) inputGrid.checked = showGrid;
  if (inputOpacity) {
    inputOpacity.value = widgetOpacity;
    if (opacityValDisplay) opacityValDisplay.textContent = widgetOpacity + "%";
  }

  themeOpts.forEach(btn => {
    if (btn.getAttribute("data-theme") === themeClass) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });
}

// Render the 7-day SVG chart and compute stats
function drawChartAndStats() {
  const days = getLast7Days();
  const barsGroup = document.getElementById("chart-bars-group");
  if (!barsGroup) return;

  barsGroup.innerHTML = "";

  // Get data for these 7 days
  const values = days.map(d => history[d] || 0);
  const maxVal = Math.max(...values, 100); // minimum scale is 100 keystrokes

  // Render SVG Bars
  const chartWidth = 340;
  const barWidth = 12;
  const barSpacing = chartWidth / 7; // ~48.5px

  days.forEach((dayStr, idx) => {
    const val = values[idx];
    const barHeight = (val / maxVal) * 22; // maximum bar height is 22px
    const x = idx * barSpacing + (barSpacing - barWidth) / 2;
    const y = 30 - barHeight; // baseline is at y=30

    // Group wrapper for hover label effect
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.setAttribute("class", "chart-bar-group");

    // The Rounded Minimalist Bar
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("class", "chart-bar");
    rect.setAttribute("x", x);
    rect.setAttribute("y", y);
    rect.setAttribute("width", barWidth);
    rect.setAttribute("height", barHeight);
    rect.setAttribute("rx", "3");

    // Dynamic hover label (Value)
    const valText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    valText.setAttribute("class", "chart-bar-val");
    valText.setAttribute("x", x + barWidth / 2);
    valText.setAttribute("y", Math.max(y - 3, 6)); // avoid clipping off top
    valText.textContent = formatNumber(val);

    // Day of week label
    const labelText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    labelText.setAttribute("class", "chart-bar-lbl");
    labelText.setAttribute("x", x + barWidth / 2);
    labelText.setAttribute("y", 41);
    labelText.textContent = formatDayLabel(dayStr);

    group.appendChild(rect);
    group.appendChild(valText);
    group.appendChild(labelText);
    barsGroup.appendChild(group);
  });

  // Calculate statistics
  // Today's Keystrokes
  const todayStr = getLocalDateString();
  todayKeystrokes = history[todayStr] || 0;
  if (strokesTodayDisplay) strokesTodayDisplay.textContent = formatNumber(todayKeystrokes);

  // Daily Average
  const historyVals = Object.values(history);
  let average = 0;
  if (historyVals.length > 0) {
    const sum = historyVals.reduce((a, b) => a + b, 0);
    average = Math.round(sum / historyVals.length);
  }
  if (avgStrokesDisplay) avgStrokesDisplay.textContent = formatNumber(average);

  // Daily Goal progress bar saturation
  const pct = Math.min((todayKeystrokes / dailyGoal) * 100, 100).toFixed(1);
  const pctDisplay = document.getElementById("progress-pct-val");
  const fillBar = document.getElementById("progress-fill-bar");
  
  if (pctDisplay) pctDisplay.textContent = pct + "%";
  if (fillBar) fillBar.style.width = pct + "%";
}

// Fetch stats and update UI
function updateUI() {
  drawChartAndStats();
}

document.addEventListener("DOMContentLoaded", () => {
  // Bind DOM elements
  widgetContainer = document.getElementById("widget-container");
  strokesTodayDisplay = document.getElementById("strokes-today-val");
  avgStrokesDisplay = document.getElementById("avg-strokes-val");
  currentSpeedDisplay = document.getElementById("current-speed-val");
  settingsPanel = document.getElementById("settings-panel");

  inputDailyGoal = document.getElementById("input-daily-goal");
  themeOpts = document.querySelectorAll(".theme-opt");
  inputAlwaysOnTop = document.getElementById("input-always-on-top");
  inputAutostart = document.getElementById("input-autostart");
  inputCrt = document.getElementById("input-crt");
  inputGrid = document.getElementById("input-grid");
  inputOpacity = document.getElementById("input-opacity");
  opacityValDisplay = document.getElementById("opacity-val-display");

  // Load configuration
  loadState();

  // Load autostart value from Tauri
  if (invoke) {
    invoke("is_autostart_enabled")
      .then(res => {
        autostart = res;
        if (inputAutostart) inputAutostart.checked = autostart;
      })
      .catch(err => console.error("Autostart check failed:", err));
  }

  // Apply configurations
  applyConfigurations();

  // Load history data from Rust backend
  if (invoke) {
    invoke("get_keystroke_history")
      .then(res => {
        history = res || {};
        updateUI();
        logToConsole("HISTORY RECOVERY: NOMINAL");
      })
      .catch(err => {
        console.error("Failed to load history:", err);
        logToConsole("HISTORY DATA: FAILED TO RECOVER");
      });
  } else {
    // Mock data for browser testing
    const today = getLocalDateString();
    const yesterday = getLocalDateString(new Date(Date.now() - 86400000));
    history = {};
    history[today] = 1254;
    history[yesterday] = 4320;
    updateUI();
  }

  // Setup live keypress listener via Tauri event
  if (listen) {
    listen("keystroke-incremented", (event) => {
      const newCount = event.payload;
      const todayStr = getLocalDateString();
      history[todayStr] = newCount;
      recordKeystroke();
      updateUI();
    });
  }

  // Update speed display in a loop
  setInterval(() => {
    pruneTimestamps();
    const speed = (keyTimestamps.length / 5.0).toFixed(1);
    if (currentSpeedDisplay) currentSpeedDisplay.textContent = `${speed} K/S`;
  }, 1000); // update regularly

  // Hook Settings Actions
  const btnSettings = document.getElementById("btn-settings");
  const btnCloseSettings = document.getElementById("btn-close-settings");
  const btnSaveSettings = document.getElementById("btn-save-settings");

  if (btnSettings) {
    btnSettings.addEventListener("click", () => {
      // populate settings page fields
      if (inputDailyGoal) inputDailyGoal.value = dailyGoal;
      settingsPanel.classList.add("open");
    });
  }

  if (btnCloseSettings) {
    btnCloseSettings.addEventListener("click", () => {
      settingsPanel.classList.remove("open");
    });
  }

  // Theme option pickers
  themeOpts.forEach(opt => {
    opt.addEventListener("click", () => {
      themeOpts.forEach(b => b.classList.remove("active"));
      opt.classList.add("active");
      themeClass = opt.getAttribute("data-theme");
      if (widgetContainer) {
        widgetContainer.className = "widget-container " + themeClass;
      }
    });
  });

  // Opacity Slider
  if (inputOpacity) {
    inputOpacity.addEventListener("input", () => {
      const op = inputOpacity.value;
      widgetOpacity = op;
      if (opacityValDisplay) opacityValDisplay.textContent = op + "%";
      if (widgetContainer) widgetContainer.style.opacity = op / 100;
    });
  }

  // Save Settings Changes
  if (btnSaveSettings) {
    btnSaveSettings.addEventListener("click", () => {
      const newGoal = parseInt(inputDailyGoal.value, 10);
      if (isNaN(newGoal) || newGoal < 100) {
        alert("PLEASE ENTER A VALID KEYSTROKE GOAL (MINIMUM 100).");
        return;
      }

      const newAlwaysOnTop = inputAlwaysOnTop.checked;
      const newCrt = inputCrt.checked;
      const newGrid = inputGrid.checked;
      const newAutostart = inputAutostart.checked;

      // Handle autostart save via Tauri
      if (newAutostart !== autostart && invoke) {
        invoke("set_autostart", { enable: newAutostart })
          .then(() => {
            autostart = newAutostart;
            logToConsole(`AUTOSTART FLAGGED: ${autostart ? 'TRUE' : 'FALSE'}`);
          })
          .catch(err => {
            console.error("Autostart set failed:", err);
            alert("FAILED TO COMMIT AUTOSTART REGISTRY VALUE.");
          });
      }

      dailyGoal = newGoal;
      alwaysOnTop = newAlwaysOnTop;
      showCrt = newCrt;
      showGrid = newGrid;

      saveState();
      applyConfigurations();
      updateUI();

      settingsPanel.classList.remove("open");
      logToConsole("HUD SETTINGS MODIFIED & APPLIED");
    });
  }

  // Purge history
  const btnClearHistory = document.getElementById("btn-clear-history");
  if (btnClearHistory) {
    btnClearHistory.addEventListener("click", () => {
      if (confirm("ARE YOU SURE YOU WANT TO PURGE ALL KEYSTROKE LOGS? THIS ACTION CANNOT BE UNDONE.")) {
        if (invoke) {
          invoke("clear_keystroke_history")
            .then(() => {
              history = {};
              updateUI();
              logToConsole("DATABASE EXPUNGED");
              alert("DATABASE SUCCESSFULLY PURGED.");
            })
            .catch(err => {
              console.error("Purge failed:", err);
              alert("FAILED TO PURGE DATABASE.");
            });
        } else {
          history = {};
          updateUI();
        }
      }
    });
  }

  // ==================== AUTO UPDATER CLIENT ====================
  if (window.__TAURI__ && window.__TAURI__.core) {
    let detectedUpdateVersion = null;

    function checkUpdates(isManual = false) {
      const statusEl = document.getElementById("manual-check-status");
      const btnManual = document.getElementById("btn-check-updates-manual");
      
      if (isManual) {
        if (statusEl) statusEl.textContent = "QUERYING SERVERS...";
        if (btnManual) {
          btnManual.disabled = true;
          btnManual.textContent = "CHECKING...";
        }
      }
      
      invoke("check_for_updates")
        .then(newVersion => {
          if (newVersion) {
            detectedUpdateVersion = newVersion;
            
            const gearBtn = document.getElementById("btn-settings");
            if (gearBtn) gearBtn.classList.add("has-update");
            
            const banner = document.getElementById("update-banner");
            const bannerVer = document.getElementById("update-banner-ver");
            if (banner) banner.style.display = "flex";
            if (bannerVer) bannerVer.textContent = "v" + newVersion;

            logToConsole(`FIRMWARE UPDATE v${newVersion} DETECTED`);

            const verVal = document.getElementById("update-version-val");
            if (verVal) verVal.textContent = "v" + newVersion;

            if (isManual) {
              const prompt = document.getElementById("update-prompt");
              if (prompt) prompt.classList.add("open");
            }
          } else {
            if (isManual && statusEl) {
              statusEl.textContent = "FIRMWARE IS UP TO DATE.";
              setTimeout(() => { statusEl.textContent = ""; }, 3000);
            }
          }
        })
        .catch(err => {
          console.error("Error checking for updates:", err);
          if (isManual && statusEl) {
            statusEl.textContent = "CONNECTION DRIFT / ERROR.";
            setTimeout(() => { statusEl.textContent = ""; }, 3000);
          }
        })
        .finally(() => {
          if (isManual && btnManual) {
            btnManual.disabled = false;
            btnManual.textContent = "CHECK FOR UPDATES";
          }
        });
    }

    setTimeout(() => {
      checkUpdates(false);
    }, 4000);

    setInterval(() => {
      checkUpdates(false);
    }, 86400000);

    const btnManualCheck = document.getElementById("btn-check-updates-manual");
    if (btnManualCheck) {
      btnManualCheck.addEventListener("click", () => {
        checkUpdates(true);
      });
    }

    const btnBannerInstall = document.getElementById("btn-banner-update");
    if (btnBannerInstall) {
      btnBannerInstall.addEventListener("click", () => {
        const prompt = document.getElementById("update-prompt");
        const verVal = document.getElementById("update-version-val");
        if (prompt) {
          if (verVal) verVal.textContent = detectedUpdateVersion ? "v" + detectedUpdateVersion : "NEW VERSION";
          prompt.classList.add("open");
        }
      });
    }

    const btnConfirmUpdate = document.getElementById("btn-confirm-update");
    const btnCancelUpdate = document.getElementById("btn-cancel-update");
    
    if (btnConfirmUpdate) {
      btnConfirmUpdate.addEventListener("click", () => {
        btnConfirmUpdate.textContent = "DOWNLOADING...";
        btnConfirmUpdate.disabled = true;
        if (btnCancelUpdate) btnCancelUpdate.disabled = true;

        invoke("start_update_install")
          .catch(err => {
            console.error("Update install failed:", err);
            alert("FIRMWARE DOWNLOAD FAILED.");
            btnConfirmUpdate.textContent = "COMMIT UPDATE";
            btnConfirmUpdate.disabled = false;
            if (btnCancelUpdate) btnCancelUpdate.disabled = false;
          });
      });
    }

    if (btnCancelUpdate) {
      btnCancelUpdate.addEventListener("click", () => {
        const prompt = document.getElementById("update-prompt");
        if (prompt) prompt.classList.remove("open");
      });
    }
  }

  // Hook window controls
  const btnMinimize = document.getElementById("btn-minimize");
  const btnClose = document.getElementById("btn-close");

  if (btnMinimize && appWindow) {
    btnMinimize.addEventListener("click", () => {
      appWindow.minimize();
    });
  }

  if (btnClose && appWindow) {
    btnClose.addEventListener("click", () => {
      appWindow.hide(); // Hide instead of closing entirely so we can track keys in tray!
      logToConsole("HUD COLLAPSED TO SYSTEM TRAY");
    });
  }
});
