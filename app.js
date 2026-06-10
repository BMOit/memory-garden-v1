/* ==========================================================================
   Memory Garden JS Logic - SPA Routing, localStorage State, and Animations
   ========================================================================== */

// --- Default Mock Data ---
const DEFAULT_MEMORIES = [
  {
    id: "memory-1",
    title: "Late Night Thoughts",
    body: "Today felt exhausting, but I learned something... There is a strange comfort in knowing that progress isn't always linear. Each leaf grows at its own pace.",
    date: "June 9, 2026",
    timestamp: Date.now() - 3600000 * 2, // 2 hours ago
    moodEmoji: "🌙",
    moodWord: "thoughtful",
    image: null
  },
  {
    id: "memory-2",
    title: "Morning cup of tea",
    body: "Today started with a good news... A gentle breeze, warm chamomile tea, and the sweet smell of morning mist. The garden looks peaceful.",
    date: "June 8, 2026",
    timestamp: Date.now() - 86400000 - 3600000 * 8, // Yesterday
    moodEmoji: "☀️",
    moodWord: "peaceful",
    image: null
  }
];

const DEFAULT_PROFILE = {
  username: "Bunny Gardener",
  gardenAge: "12 days old",
  dob: "2000-06-09",
  email: "bunny@garden.com",
  avatar: "assets/bunny_mascot.png"
};

// --- Application State ---
let state = {
  memories: {},
  profile: {},
  currentSelectedEmoji: "🌸",
  currentUploadedImage: null,
  currentCalendarDate: new Date()
};

// --- Helper Functions for Data Migration and State Structuring ---
function getLocalDateKey(timestamp) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMemoryDateKey(memory) {
  if (memory.timestamp) {
    return getLocalDateKey(memory.timestamp);
  }
  if (memory.date) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(memory.date)) {
      return memory.date;
    }
    const parsed = Date.parse(memory.date);
    if (!isNaN(parsed)) {
      return getLocalDateKey(parsed);
    }
  }
  return getLocalDateKey(Date.now());
}

function migrateMemories(loaded) {
  console.log("[migrateMemories] Starting migration with loaded data:", loaded);
  const migrated = {};

  if (Array.isArray(loaded)) {
    console.log("[migrateMemories] Format detected: flat array of memories");
    loaded.forEach(m => {
      if (!m || typeof m !== "object") return;
      const key = getMemoryDateKey(m);
      if (!migrated[key]) {
        migrated[key] = [];
      }
      migrated[key].push(m);
    });
  } else if (loaded && typeof loaded === "object") {
    console.log("[migrateMemories] Format detected: dictionary format");
    for (const key in loaded) {
      if (loaded.hasOwnProperty(key)) {
        const val = loaded[key];
        if (Array.isArray(val)) {
          // It's already an array of memories. Let's make sure the key is normalized.
          let normKey = key;
          if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) {
            const parsed = Date.parse(key);
            if (!isNaN(parsed)) {
              normKey = getLocalDateKey(parsed);
            }
          }
          if (!migrated[normKey]) {
            migrated[normKey] = [];
          }
          migrated[normKey].push(...val);
        } else if (val && typeof val === "object") {
          // It's a single memory object. Normalize key and wrap in array.
          let normKey = key;
          if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) {
            normKey = getMemoryDateKey(val);
          }
          if (!migrated[normKey]) {
            migrated[normKey] = [];
          }
          migrated[normKey].push(val);
        }
      }
    }
  }

  // Ensure all memories inside each date array have correct timestamp/date properties if missing
  for (const key in migrated) {
    migrated[key].forEach(m => {
      if (!m.timestamp) m.timestamp = Date.parse(key) || Date.now();
      if (!m.date) {
        m.date = new Date(m.timestamp).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric"
        });
      }
    });
    // Sort entries chronologically (oldest first)
    migrated[key].sort((a, b) => a.timestamp - b.timestamp);
    console.log(`[migrateMemories] Date [${key}] has ${migrated[key].length} memories:`, migrated[key]);
  }

  console.log("[migrateMemories] Finished migration. Resulting database:", migrated);
  return migrated;
}

function getFlatMemories() {
  const flat = [];
  for (const key in state.memories) {
    if (state.memories.hasOwnProperty(key)) {
      const entries = state.memories[key];
      if (Array.isArray(entries)) {
        flat.push(...entries);
      }
    }
  }
  // Sort descending by timestamp (newest first) for general dashboard/list usage
  return flat.sort((a, b) => b.timestamp - a.timestamp);
}

// --- Initializer ---
document.addEventListener("DOMContentLoaded", () => {
  initData();
  setupEventListeners();
  renderDashboard();
});

// --- Data Management (localStorage) ---
function initData() {
  // Load memories
  const savedMemories = localStorage.getItem("mg_memories");
  console.log("[initData] Raw savedMemories loaded from localStorage:", savedMemories);
  if (savedMemories) {
    try {
      const parsed = JSON.parse(savedMemories);
      state.memories = migrateMemories(parsed);
      saveMemoriesToStorage(); // Save migrated data
    } catch (e) {
      console.error("[initData] Failed to parse/migrate memories from localStorage", e);
      state.memories = migrateMemories([...DEFAULT_MEMORIES]);
      saveMemoriesToStorage();
    }
  } else {
    console.log("[initData] No savedMemories in localStorage. Using DEFAULT_MEMORIES mock data.");
    state.memories = migrateMemories([...DEFAULT_MEMORIES]);
    saveMemoriesToStorage();
  }

  // Load profile
  const savedProfile = localStorage.getItem("mg_profile");
  if (savedProfile) {
    state.profile = JSON.parse(savedProfile);
  } else {
    state.profile = { ...DEFAULT_PROFILE };
    saveProfileToStorage();
  }
}

function saveMemoriesToStorage() {
  console.log("[saveMemoriesToStorage] Saving state.memories to localStorage:", state.memories);
  localStorage.setItem("mg_memories", JSON.stringify(state.memories));
}

function saveProfileToStorage() {
  localStorage.setItem("mg_profile", JSON.stringify(state.profile));
  syncLayoutState();
}

// Helper to keep headers, leaf-counters, and avatars in sync across all pages
function syncLayoutState() {
  const flat = getFlatMemories();
  
  // Update header counter
  const headerCount = document.getElementById("header-memory-count");
  if (headerCount) headerCount.textContent = flat.length;

  // Update topbar avatar image and sidebar logo
  const topbarAvatar = document.querySelector(".profile-avatar-btn img");
  if (topbarAvatar) topbarAvatar.src = state.profile.avatar;

  const sidebarLogo = document.querySelector(".sidebar-logo");
  if (sidebarLogo) sidebarLogo.src = state.profile.avatar;
}

// --- Navigation Controller (View Swapping + Transitions) ---
function navigateTo(targetViewId, direction = "forward") {
  const updateDOM = () => {
    const signinEl = document.getElementById("view-signin");
    const shellEl = document.getElementById("main-shell");
    
    if (targetViewId === "view-signin") {
      signinEl.classList.remove("hidden-view");
      signinEl.classList.add("active-view");
      shellEl.classList.add("hidden-view");
      shellEl.classList.remove("active-view");
    } else {
      signinEl.classList.add("hidden-view");
      signinEl.classList.remove("active-view");
      shellEl.classList.remove("hidden-view");
      shellEl.classList.add("active-view");
      
      // Toggle specific subviews inside main-shell
      const subviews = ["view-dashboard", "view-plant", "view-my-garden", "view-mood", "view-profile"];
      subviews.forEach(viewId => {
        const el = document.getElementById(viewId);
        if (el) {
          if (viewId === targetViewId) {
            el.classList.remove("hidden-view");
            el.classList.add("active-view");
          } else {
            el.classList.add("hidden-view");
            el.classList.remove("active-view");
          }
        }
      });
      
      // Update topbar left dynamic content
      const searchWrapper = document.getElementById("topbar-search-wrapper");
      const pageTitle = document.getElementById("topbar-page-title");
      
      if (targetViewId === "view-dashboard") {
        searchWrapper.classList.remove("hidden-view");
        pageTitle.classList.add("hidden-view");
      } else {
        searchWrapper.classList.add("hidden-view");
        pageTitle.classList.remove("hidden-view");
        
        let titleText = "Memory Garden";
        if (targetViewId === "view-plant") titleText = "Plant a Memory";
        else if (targetViewId === "view-my-garden") titleText = "My Garden";
        else if (targetViewId === "view-mood") titleText = "Mood Calendar";
        else if (targetViewId === "view-profile") titleText = "Profile Settings";
        
        pageTitle.textContent = titleText;
      }
    }

    // Synchronize current page active state in sidebars
    const viewName = targetViewId.replace("view-", "");
    document.querySelectorAll(".sidebar-nav .nav-item").forEach(item => {
      if (item.getAttribute("data-view") === viewName) {
        item.classList.add("active");
      } else {
        item.classList.remove("active");
      }
    });

    // Sync state (avatars, counts) immediately
    syncLayoutState();

    // View-specific initialization on load
    if (targetViewId === "view-dashboard") {
      renderDashboard();
    } else if (targetViewId === "view-profile") {
      loadProfileFields();
    } else if (targetViewId === "view-plant") {
      resetPlantWorkspace();
    } else if (targetViewId === "view-my-garden") {
      renderMyGarden();
    } else if (targetViewId === "view-mood") {
      renderMoodCalendar();
    }
  };

  // If View Transitions API is not supported
  if (!document.startViewTransition) {
    updateDOM();
    return;
  }

  // Execute view transition with direction type
  document.startViewTransition({
    update: updateDOM,
    types: [direction]
  });
}

// --- Dashboard Renderer ---
function renderDashboard(filterQuery = "") {
  const listEl = document.getElementById("entries-list");
  listEl.innerHTML = "";

  const flat = getFlatMemories();

  // Filter memories
  const query = filterQuery.toLowerCase().trim();
  const filteredMemories = flat.filter(m => 
    m.title.toLowerCase().includes(query) || 
    m.body.toLowerCase().includes(query) ||
    m.moodWord.toLowerCase().includes(query)
  );

  // Sorting: most recent first
  filteredMemories.sort((a, b) => b.timestamp - a.timestamp);

  if (filteredMemories.length === 0) {
    listEl.innerHTML = `
      <div class="no-entries-card">
        <span style="font-size: 2rem;">🫙</span>
        <p>${filterQuery ? "No matching memories found." : "No memories planted yet. Let's grow your garden!"}</p>
      </div>
    `;
  } else {
    filteredMemories.forEach(memory => {
      const card = document.createElement("div");
      card.className = "entry-card";
      
      const dateFormatted = new Date(memory.timestamp).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
      });

      card.innerHTML = `
        <div class="entry-header">
          <div class="entry-title-wrap">
            <span class="entry-emoji">${memory.moodEmoji || "🌸"}</span>
            <h4 class="entry-title">${escapeHTML(memory.title)}</h4>
          </div>
          <div class="entry-meta">
            <span class="entry-mood-badge">${escapeHTML(memory.moodWord)}</span>
            <span class="entry-date">${dateFormatted}</span>
          </div>
        </div>
        <p class="entry-body">${escapeHTML(memory.body)}</p>
        ${memory.image ? `<img src="${memory.image}" alt="Memory illustration" class="entry-img-preview">` : ""}
      `;
      listEl.appendChild(card);
    });
  }

  // Update Stats & Header
  document.getElementById("stats-total-memories").textContent = flat.length;

  // Sync avatar and counts layout-wide
  syncLayoutState();

  // Calculate day streak
  document.getElementById("stats-streak").textContent = calculateStreak();
}

function calculateStreak() {
  const flat = getFlatMemories();
  if (flat.length === 0) return 0;
  
  // Sort timestamps descending
  const dates = flat
    .map(m => new Date(m.timestamp).setHours(0, 0, 0, 0))
    .sort((a, b) => b - a);
    
  const uniqueDates = [...new Set(dates)];
  
  let streak = 0;
  let today = new Date().setHours(0, 0, 0, 0);
  let yesterday = today - 86400000;
  
  // If the last entry was not today or yesterday, streak is broken
  if (uniqueDates[0] !== today && uniqueDates[0] !== yesterday) {
    return 0;
  }
  
  let checkDate = uniqueDates[0];
  for (let i = 0; i < uniqueDates.length; i++) {
    if (uniqueDates[i] === checkDate) {
      streak++;
      checkDate -= 86400000; // Shift back 1 day
    } else {
      break;
    }
  }
  
  return streak;
}

// --- Profile Page Controls ---
function loadProfileFields() {
  document.getElementById("profile-username").value = state.profile.username;
  document.getElementById("profile-garden-age").value = calculateGardenAge();
  document.getElementById("profile-dob").value = state.profile.dob;
  document.getElementById("profile-email").value = state.profile.email;
  document.getElementById("profile-display-avatar").src = state.profile.avatar;
}

function calculateGardenAge() {
  // Let's check first memory timestamp
  const flat = getFlatMemories();
  if (flat.length === 0) return "Just born!";
  const oldestTime = Math.min(...flat.map(m => m.timestamp));
  const diffTime = Math.abs(Date.now() - oldestTime);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} old`;
}

// --- Plant Workspace Helpers ---
function resetPlantWorkspace() {
  document.getElementById("input-memory-title").value = "";
  document.getElementById("textarea-memory-body").value = "";
  document.getElementById("input-mood-desc").value = "";
  state.currentSelectedEmoji = "🌸";
  state.currentUploadedImage = null;
  document.getElementById("selected-emoji-preview").textContent = "";
  
  // Hide image preview
  const previewContainer = document.getElementById("image-preview-container");
  previewContainer.classList.add("hidden-view");
  document.getElementById("image-preview").src = "";
}

// --- My Garden Renderer (White cards matching left mockup) ---
function renderMyGarden(filterQuery = "") {
  const gridEl = document.getElementById("garden-plants-grid");
  if (!gridEl) return;
  gridEl.innerHTML = "";

  const flat = getFlatMemories();
  const query = filterQuery.toLowerCase().trim();
  const filteredMemories = flat.filter(m => 
    m.title.toLowerCase().includes(query) || 
    m.body.toLowerCase().includes(query) ||
    m.moodWord.toLowerCase().includes(query)
  );

  filteredMemories.sort((a, b) => b.timestamp - a.timestamp);

  // Sync layout state
  syncLayoutState();

  if (filteredMemories.length === 0) {
    gridEl.innerHTML = `
      <div class="no-entries-card" style="grid-column: 1 / -1; width: 100%;">
        <span style="font-size: 2rem;">🫙</span>
        <p>${filterQuery ? "No matching memories found in your garden." : "Your garden is empty. Let's plant some thoughts!"}</p>
      </div>
    `;
    return;
  }

  filteredMemories.forEach(memory => {
    const card = document.createElement("div");
    card.className = "garden-memory-card";

    card.innerHTML = `
      <div class="garden-memory-card-header">
        <span>${memory.moodEmoji || "🌸"}</span>
        <span>${escapeHTML(memory.title)}</span>
      </div>
      <p class="garden-memory-card-body">${escapeHTML(memory.body)}</p>
      ${memory.image ? `<img src="${memory.image}" alt="Memory illustration" class="garden-memory-card-img-preview">` : ""}
    `;

    card.addEventListener("click", () => {
      openMemoryDetailsModal(memory);
    });

    gridEl.appendChild(card);
  });
}

// --- Mood Calendar Renderer ---
function renderMoodCalendar() {
  const year = state.currentCalendarDate.getFullYear();
  const month = state.currentCalendarDate.getMonth();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  
  const headerEl = document.getElementById("calendar-month-year");
  if (headerEl) {
    headerEl.textContent = `${monthNames[month]} ${year}`;
  }

  const flat = getFlatMemories();

  // Sync layout state
  syncLayoutState();

  // Calculate mood counts dynamically
  let happyCount = 0;
  let sadCount = 0;
  let angryCount = 0;
  let otherCount = 0;

  flat.forEach(m => {
    const moodWord = (m.moodWord || "").toLowerCase().trim();
    if (["happy", "joy", "excited", "cheerful", "glad", "peaceful", "calm", "relaxing", "cozy", "content", "relaxed"].some(w => moodWord.includes(w))) {
      happyCount++;
    } else if (["sad", "thoughtful", "reflective", "melancholy", "nostalgic", "tired", "weary", "lonely"].some(w => moodWord.includes(w))) {
      sadCount++;
    } else if (["angry", "mad", "annoyed", "stressed", "anxious", "worried", "scared"].some(w => moodWord.includes(w))) {
      angryCount++;
    } else {
      otherCount++;
    }
  });

  const happyStatEl = document.getElementById("stat-happy-days");
  if (happyStatEl) happyStatEl.textContent = `${happyCount} Happy day${happyCount === 1 ? "" : "s"}`;

  const sadStatEl = document.getElementById("stat-sad-days");
  if (sadStatEl) sadStatEl.textContent = `${sadCount} sad day${sadCount === 1 ? "" : "s"}`;

  const angryStatEl = document.getElementById("stat-angry-days");
  if (angryStatEl) angryStatEl.textContent = `${angryCount} angry day${angryCount === 1 ? "" : "s"}`;

  const otherStatEl = document.getElementById("stat-other-days");
  if (otherStatEl) otherStatEl.textContent = `${otherCount} day${otherCount === 1 ? "" : "s"}`;

  const gridEl = document.getElementById("calendar-grid-cells");
  if (!gridEl) return;
  gridEl.innerHTML = "";

  const firstDay = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  for (let i = 0; i < firstDay; i++) {
    const emptyCell = document.createElement("div");
    emptyCell.className = "calendar-cell empty-cell";
    gridEl.appendChild(emptyCell);
  }

  const todayDate = new Date();
  const isCurrentMonth = todayDate.getFullYear() === year && todayDate.getMonth() === month;

  for (let day = 1; day <= totalDays; day++) {
    const cell = document.createElement("div");
    cell.className = "calendar-cell";

    if (isCurrentMonth && todayDate.getDate() === day) {
      cell.classList.add("cell-today");
    }

    const cellContent = document.createElement("div");
    cellContent.className = "calendar-cell-content";

    const numLabel = document.createElement("span");
    numLabel.className = "calendar-cell-num";
    numLabel.textContent = day;
    cellContent.appendChild(numLabel);

    const cellDateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dayMemories = [...(state.memories[cellDateStr] || [])];

    if (dayMemories.length > 0) {
      console.log(`[renderMoodCalendar] Cell for ${cellDateStr} renders. Total memories: ${dayMemories.length}`, dayMemories);
      dayMemories.sort((a, b) => b.timestamp - a.timestamp);
      const mainMemory = dayMemories[0];

      const emojiWrapper = document.createElement("div");
      emojiWrapper.className = "calendar-cell-emoji-wrapper";

      const emojiSpan = document.createElement("span");
      emojiSpan.className = "calendar-cell-emoji";
      emojiSpan.textContent = mainMemory.moodEmoji || "🌸";
      emojiWrapper.appendChild(emojiSpan);

      if (dayMemories.length > 1) {
        const badgeSpan = document.createElement("span");
        badgeSpan.className = "calendar-cell-badge";
        badgeSpan.textContent = `+${dayMemories.length - 1}`;
        emojiWrapper.appendChild(badgeSpan);
      }

      cellContent.appendChild(emojiWrapper);

      const moodWord = (mainMemory.moodWord || "").toLowerCase().trim();
      let moodClass = "cell-mood-default";
      if (["happy", "joy", "excited", "cheerful", "glad"].some(w => moodWord.includes(w))) {
        moodClass = "cell-mood-happy";
      } else if (["peaceful", "calm", "relaxing", "cozy", "content", "relaxed"].some(w => moodWord.includes(w))) {
        moodClass = "cell-mood-peaceful";
      } else if (["thoughtful", "reflective", "melancholy", "nostalgic", "tired", "sad", "weary"].some(w => moodWord.includes(w))) {
        moodClass = "cell-mood-thoughtful";
      } else if (["excited", "energetic", "hyped", "love", "loved"].some(w => moodWord.includes(w))) {
        moodClass = "cell-mood-excited";
      } else if (["anxious", "stressed", "worried", "scared", "fear", "angry", "sad"].some(w => moodWord.includes(w))) {
        moodClass = "cell-mood-sad";
      }
      cell.classList.add(moodClass);

      cell.addEventListener("click", () => {
        const dateFormatted = new Date(year, month, day).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric"
        });
        openDayDetailsModal(dayMemories, dateFormatted);
      });
    }

    cell.appendChild(cellContent);
    gridEl.appendChild(cell);
  }
}

// --- Lightbox Modal Controllers ---
function openMemoryDetailsModal(memory) {
  const modal = document.getElementById("memory-details-modal");
  if (!modal) return;

  // Show single view, hide multi view
  document.getElementById("modal-single-view").classList.remove("hidden-view");
  document.getElementById("modal-multi-view").classList.add("hidden-view");

  document.getElementById("modal-mood-emoji").textContent = memory.moodEmoji || "🌸";
  document.getElementById("modal-memory-title").textContent = memory.title;
  document.getElementById("modal-mood-word").textContent = memory.moodWord || "happy";
  
  const dateFormatted = new Date(memory.timestamp).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric"
  });
  document.getElementById("modal-memory-date").textContent = dateFormatted;
  document.getElementById("modal-memory-body").textContent = memory.body;
  
  const modalImg = document.getElementById("modal-memory-image");
  if (memory.image) {
    modalImg.src = memory.image;
    modalImg.classList.remove("hidden-view");
  } else {
    modalImg.src = "";
    modalImg.classList.add("hidden-view");
  }

  modal.classList.remove("hidden-view");
}

function openDayDetailsModal(dayMemories, dateStr) {
  console.log(`[openDayDetailsModal] Opening day details modal for [${dateStr}] with ${dayMemories.length} memories:`, dayMemories);
  const modal = document.getElementById("memory-details-modal");
  if (!modal) return;

  // Hide single view, show multi view
  document.getElementById("modal-single-view").classList.add("hidden-view");
  document.getElementById("modal-multi-view").classList.remove("hidden-view");

  // Set header info
  document.getElementById("modal-multi-date").textContent = dateStr;
  document.getElementById("modal-multi-count").textContent = `${dayMemories.length} ${dayMemories.length === 1 ? "memory" : "memories"}`;

  // Sort day memories chronologically (oldest first, i.e., ascending timestamp)
  const sortedMemories = [...dayMemories].sort((a, b) => a.timestamp - b.timestamp);

  const container = document.getElementById("modal-multi-body");
  container.innerHTML = "";

  sortedMemories.forEach(memory => {
    const entry = document.createElement("div");
    entry.className = "modal-day-entry";

    const timeFormatted = new Date(memory.timestamp).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit"
    });

    entry.innerHTML = `
      <div class="modal-day-entry-header">
        <span class="modal-day-entry-emoji">${memory.moodEmoji || "🌸"}</span>
        <div class="modal-day-entry-meta">
          <div class="modal-day-entry-title-row">
            <h4 class="modal-day-entry-title">${escapeHTML(memory.title)}</h4>
            <span class="modal-day-entry-time">${timeFormatted}</span>
          </div>
          <span class="entry-mood-badge" style="margin-top: 4px; display: inline-block;">${escapeHTML(memory.moodWord || "happy")}</span>
        </div>
      </div>
      <p class="modal-day-entry-body">${escapeHTML(memory.body)}</p>
      ${memory.image ? `<img src="${memory.image}" alt="Memory illustration" class="modal-day-entry-image">` : ""}
    `;
    container.appendChild(entry);
  });

  modal.classList.remove("hidden-view");
}

function closeMemoryDetailsModal() {
  const modal = document.getElementById("memory-details-modal");
  if (modal) modal.classList.add("hidden-view");
}

// --- Event Listeners Setup ---
function setupEventListeners() {
  // --- View Sign In -> Dashboard ---
  const formLogin = document.getElementById("form-login");
  formLogin.addEventListener("submit", (e) => {
    e.preventDefault();
    navigateTo("view-dashboard", "forward");
  });

  // --- Sidebar Links Routing ---
  const navItems = document.querySelectorAll(".nav-item");
  navItems.forEach(item => {
    item.addEventListener("click", (e) => {
      const targetView = item.getAttribute("data-view");
      if (targetView) {
        e.preventDefault();
        
        // Remove active class from other items
        navItems.forEach(ni => ni.classList.remove("active"));
        if (!item.classList.contains("logout-link")) {
          item.classList.add("active");
        }
        
        // Navigate
        navigateTo(`view-${targetView}`, "forward");
      }
    });
  });

  // Logout actions
  document.querySelectorAll(".logout-link").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      navigateTo("view-signin", "backward");
    });
  });
  
  document.getElementById("btn-logout-profile").addEventListener("click", (e) => {
    e.preventDefault();
    navigateTo("view-signin", "backward");
  });

  // Topbar Profile Avatar Action
  document.querySelectorAll(".profile-avatar-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      navigateTo("view-profile", "forward");
    });
  });

  // FAB / Float Plant Button Action
  document.getElementById("btn-fab-plant").addEventListener("click", () => {
    navigateTo("view-plant", "forward");
  });

  // Real-time Search
  const searchInput = document.getElementById("search-input");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      renderDashboard(e.target.value);
    });
  }

  const searchInputGarden = document.getElementById("search-input-garden");
  if (searchInputGarden) {
    searchInputGarden.addEventListener("input", (e) => {
      renderMyGarden(e.target.value);
    });
  }

  // Calendar Controls
  const prevMonthBtn = document.getElementById("btn-prev-month");
  if (prevMonthBtn) {
    prevMonthBtn.addEventListener("click", () => {
      state.currentCalendarDate.setMonth(state.currentCalendarDate.getMonth() - 1);
      renderMoodCalendar();
    });
  }

  const nextMonthBtn = document.getElementById("btn-next-month");
  if (nextMonthBtn) {
    nextMonthBtn.addEventListener("click", () => {
      state.currentCalendarDate.setMonth(state.currentCalendarDate.getMonth() + 1);
      renderMoodCalendar();
    });
  }

  // Lightbox Modal Controls
  const closeModalBtn = document.getElementById("btn-close-modal");
  if (closeModalBtn) {
    closeModalBtn.addEventListener("click", closeMemoryDetailsModal);
  }

  const modalOverlay = document.getElementById("memory-details-modal");
  if (modalOverlay) {
    modalOverlay.addEventListener("click", (e) => {
      if (e.target === modalOverlay) {
        closeMemoryDetailsModal();
      }
    });
  }

  // --- Plant Memory Interaction ---
  document.getElementById("btn-plant-back")?.addEventListener("click", () => {
    navigateTo("view-dashboard", "backward");
  });

  // Trigger file selection for Memory Image
  const fileInput = document.getElementById("image-upload-input");
  document.getElementById("btn-trigger-upload").addEventListener("click", () => {
    fileInput.click();
  });

  fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        state.currentUploadedImage = event.target.result;
        
        // Show preview
        const previewContainer = document.getElementById("image-preview-container");
        const previewImg = document.getElementById("image-preview");
        previewImg.src = state.currentUploadedImage;
        previewContainer.classList.remove("hidden-view");
      };
      reader.readAsDataURL(file);
    }
  });

  // Remove uploaded image from creator
  document.getElementById("btn-remove-image").addEventListener("click", () => {
    state.currentUploadedImage = null;
    document.getElementById("image-upload-input").value = "";
    document.getElementById("image-preview").src = "";
    document.getElementById("image-preview-container").classList.add("hidden-view");
  });

  // Emoji Popover Trigger
  const emojiBtn = document.getElementById("btn-toggle-emoji");
  const emojiPopover = document.getElementById("emoji-popover");
  
  emojiBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    emojiPopover.classList.toggle("active");
  });

  // Close emoji popover on clicking elsewhere
  document.addEventListener("click", () => {
    emojiPopover.classList.remove("active");
  });

  // Emoji Selection
  const emojiItems = document.querySelectorAll(".emoji-item");
  emojiItems.forEach(item => {
    item.addEventListener("click", (e) => {
      state.currentSelectedEmoji = item.textContent;
      document.getElementById("selected-emoji-preview").textContent = `: ${state.currentSelectedEmoji}`;
      emojiPopover.classList.remove("active");
    });
  });

  // Save via bookmark icon or Main button
  const saveMemory = () => {
    const title = document.getElementById("input-memory-title").value.trim();
    const body = document.getElementById("textarea-memory-body").value.trim();
    const moodWord = document.getElementById("input-mood-desc").value.trim() || "happy";

    if (!title) {
      alert("Please title your memory 🌸");
      return;
    }
    if (!body) {
      alert("Please write something to plant in your garden 🪴");
      return;
    }

    const newMemory = {
      id: "memory-" + Date.now(),
      title: title,
      body: body,
      date: new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
      }),
      timestamp: Date.now(),
      moodEmoji: state.currentSelectedEmoji,
      moodWord: moodWord,
      image: state.currentUploadedImage
    };

    const dateStr = getLocalDateKey(newMemory.timestamp);
    if (!state.memories[dateStr]) {
      state.memories[dateStr] = [];
    }
    state.memories[dateStr].push(newMemory);

    console.log(`[saveMemory] Appended memory under key ${dateStr}. Total memories for date: ${state.memories[dateStr].length}`, state.memories[dateStr]);

    saveMemoriesToStorage();
    navigateTo("view-dashboard", "backward");
  };

  document.getElementById("btn-plant-submit").addEventListener("click", saveMemory);
  document.getElementById("btn-bookmark-save").addEventListener("click", saveMemory);


  // --- Profile Page Interaction ---
  document.getElementById("btn-profile-back")?.addEventListener("click", () => {
    navigateTo("view-dashboard", "backward");
  });

  // Trigger avatar selector
  const avatarInput = document.getElementById("avatar-upload-input");
  document.getElementById("btn-change-avatar").addEventListener("click", () => {
    avatarInput.click();
  });

  avatarInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        state.profile.avatar = event.target.result;
        document.getElementById("profile-display-avatar").src = state.profile.avatar;
        syncLayoutState();
      };
      reader.readAsDataURL(file);
    }
  });

  // Save Profile Details
  const formProfile = document.getElementById("form-profile");
  formProfile.addEventListener("submit", (e) => {
    e.preventDefault();
    
    state.profile.username = document.getElementById("profile-username").value.trim();
    state.profile.dob = document.getElementById("profile-dob").value;
    state.profile.email = document.getElementById("profile-email").value.trim();

    saveProfileToStorage();
    alert("Profile saved successfully! ✨");
    navigateTo("view-dashboard", "backward");
  });
}

// --- Helper Functions ---
function escapeHTML(str) {
  if (!str) return "";
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}
