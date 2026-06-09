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
  memories: [],
  profile: {},
  currentSelectedEmoji: "🌸",
  currentUploadedImage: null,
  currentCalendarDate: new Date()
};

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
  if (savedMemories) {
    state.memories = JSON.parse(savedMemories);
  } else {
    state.memories = [...DEFAULT_MEMORIES];
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
  localStorage.setItem("mg_memories", JSON.stringify(state.memories));
}

function saveProfileToStorage() {
  localStorage.setItem("mg_profile", JSON.stringify(state.profile));
}

// --- Navigation Controller (View Swapping + Transitions) ---
function navigateTo(targetViewId, direction = "forward") {
  const views = ["view-signin", "view-dashboard", "view-plant", "view-profile", "view-my-garden", "view-mood"];
  
  const updateDOM = () => {
    views.forEach(viewId => {
      const el = document.getElementById(viewId);
      if (viewId === targetViewId) {
        el.classList.remove("hidden-view");
        el.classList.add("active-view");
      } else {
        el.classList.add("hidden-view");
        el.classList.remove("active-view");
      }
    });

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

  // Filter memories
  const query = filterQuery.toLowerCase().trim();
  const filteredMemories = state.memories.filter(m => 
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
  document.getElementById("header-memory-count").textContent = state.memories.length;
  document.getElementById("stats-total-memories").textContent = state.memories.length;

  // Render profile avatar across all views
  const avatarElements = [
    document.getElementById("btn-to-profile") ? document.getElementById("btn-to-profile").querySelector("img") : null,
    document.getElementById("btn-to-profile-garden") ? document.getElementById("btn-to-profile-garden").querySelector("img") : null,
    document.getElementById("btn-to-profile-mood") ? document.getElementById("btn-to-profile-mood").querySelector("img") : null,
    ...document.querySelectorAll(".sidebar-logo")
  ].filter(Boolean);
  avatarElements.forEach(img => {
    if (img) img.src = state.profile.avatar;
  });

  // Calculate day streak
  document.getElementById("stats-streak").textContent = calculateStreak();
}

function calculateStreak() {
  if (state.memories.length === 0) return 0;
  
  // Sort timestamps descending
  const dates = state.memories
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
  if (state.memories.length === 0) return "Just born!";
  const oldestTime = Math.min(...state.memories.map(m => m.timestamp));
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

// --- My Garden Renderer (Plant Pots) ---
function renderMyGarden(filterQuery = "") {
  const gridEl = document.getElementById("garden-plants-grid");
  if (!gridEl) return;
  gridEl.innerHTML = "";

  const query = filterQuery.toLowerCase().trim();
  const filteredMemories = state.memories.filter(m => 
    m.title.toLowerCase().includes(query) || 
    m.body.toLowerCase().includes(query) ||
    m.moodWord.toLowerCase().includes(query)
  );

  filteredMemories.sort((a, b) => b.timestamp - a.timestamp);

  const countEl = document.getElementById("garden-memory-count");
  if (countEl) countEl.textContent = state.memories.length;

  const profileAvatar = document.getElementById("btn-to-profile-garden") ? document.getElementById("btn-to-profile-garden").querySelector("img") : null;
  if (profileAvatar) {
    profileAvatar.src = state.profile.avatar;
  }

  // Update all sidebars active state
  document.querySelectorAll(".sidebar-nav").forEach(nav => {
    nav.querySelectorAll(".nav-item").forEach(item => {
      if (item.getAttribute("data-view") === "my-garden") {
        item.classList.add("active");
      } else {
        item.classList.remove("active");
      }
    });
  });

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
    card.className = "plant-pot-card";
    
    const dateFormatted = new Date(memory.timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });

    card.innerHTML = `
      <div class="plant-drawing">
        <span class="plant-flower">${memory.moodEmoji || "🌸"}</span>
        <div class="plant-stem">
          <div class="plant-leaf-left"></div>
          <div class="plant-leaf-right"></div>
        </div>
        <div class="plant-pot-rim"></div>
        <div class="plant-pot"></div>
      </div>
      <h4 class="plant-title" title="${escapeHTML(memory.title)}">${escapeHTML(memory.title)}</h4>
      <span class="plant-date">${dateFormatted}</span>
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

  const profileAvatar = document.getElementById("btn-to-profile-mood") ? document.getElementById("btn-to-profile-mood").querySelector("img") : null;
  if (profileAvatar) {
    profileAvatar.src = state.profile.avatar;
  }

  // Update all sidebars active state
  document.querySelectorAll(".sidebar-nav").forEach(nav => {
    nav.querySelectorAll(".nav-item").forEach(item => {
      if (item.getAttribute("data-view") === "mood") {
        item.classList.add("active");
      } else {
        item.classList.remove("active");
      }
    });
  });

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

    const numLabel = document.createElement("span");
    numLabel.className = "calendar-cell-num";
    numLabel.textContent = day;
    cell.appendChild(numLabel);

    const dayMemories = state.memories.filter(m => {
      const memoryDate = new Date(m.timestamp);
      return memoryDate.getFullYear() === year &&
             memoryDate.getMonth() === month &&
             memoryDate.getDate() === day;
    });

    if (dayMemories.length > 0) {
      dayMemories.sort((a, b) => b.timestamp - a.timestamp);
      const mainMemory = dayMemories[0];

      const emojiSpan = document.createElement("span");
      emojiSpan.className = "calendar-cell-emoji";
      emojiSpan.textContent = mainMemory.moodEmoji || "🌸";
      cell.appendChild(emojiSpan);

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
        openMemoryDetailsModal(mainMemory);
      });
    }

    gridEl.appendChild(cell);
  }
}

// --- Lightbox Modal Controllers ---
function openMemoryDetailsModal(memory) {
  const modal = document.getElementById("memory-details-modal");
  if (!modal) return;

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
  const toProfileButtons = [
    document.getElementById("btn-to-profile"),
    document.getElementById("btn-to-profile-garden"),
    document.getElementById("btn-to-profile-mood")
  ].filter(Boolean);
  toProfileButtons.forEach(btn => {
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
  document.getElementById("btn-plant-back").addEventListener("click", () => {
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

    state.memories.unshift(newMemory);
    saveMemoriesToStorage();
    navigateTo("view-dashboard", "backward");
  };

  document.getElementById("btn-plant-submit").addEventListener("click", saveMemory);
  document.getElementById("btn-bookmark-save").addEventListener("click", saveMemory);


  // --- Profile Page Interaction ---
  document.getElementById("btn-profile-back").addEventListener("click", () => {
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
