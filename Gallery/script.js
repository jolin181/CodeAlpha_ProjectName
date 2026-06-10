/**
 * Aura Gallery — Interactive JavaScript Logic
 * Includes dynamic DOM injection, stateful filtering with CSS transitions,
 * a fully-featured accessible Lightbox, and real-time persistent local folder sync.
 */

// 1. Centralized Image Dataset (Fallback Showcase Set)
const defaultShowcaseData = [
  {
    id: 1,
    src: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=800&q=80",
    category: "nature",
    title: "Misty Alpine Forest"
  },
  {
    id: 2,
    src: "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&w=800&q=80",
    category: "nature",
    title: "Woodland Sunbeams"
  },
  {
    id: 3,
    src: "https://images.unsplash.com/photo-1472214222541-d510753a4907?auto=format&fit=crop&w=800&q=80",
    category: "nature",
    title: "Serene Meadow Valley"
  },
  {
    id: 4,
    src: "https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=800&q=80",
    category: "family",
    title: "Summer Picnic Gathering"
  },
  {
    id: 5,
    src: "https://images.unsplash.com/photo-1542037104857-ffbb0b9155fb?auto=format&fit=crop&w=800&q=80",
    category: "family",
    title: "Warm Backyard Moments"
  },
  {
    id: 6,
    src: "https://images.unsplash.com/photo-1595608464222-1d52676059c4?auto=format&fit=crop&w=800&q=80",
    category: "family",
    title: "Evening Hearth Sharing"
  },
  {
    id: 7,
    src: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
    category: "travel",
    title: "Tropical Shoreline Pier"
  },
  {
    id: 8,
    src: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80",
    category: "travel",
    title: "Adventure Planning Map"
  },
  {
    id: 9,
    src: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=800&q=80",
    category: "travel",
    title: "Parisian Sunset Vista"
  },
  {
    id: 10,
    src: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=800&q=80",
    category: "friends",
    title: "Urban Friends Gathering"
  },
  {
    id: 11,
    src: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80",
    category: "friends",
    title: "Creative Collaborative Workshop"
  },
  {
    id: 12,
    src: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=800&q=80",
    category: "friends",
    title: "Acoustic Campfire Session"
  }
];

// 2. Global State Variables
let galleryData = [...defaultShowcaseData];
let filteredImages = [...galleryData];
let currentFilter = "all";
let currentImageIndex = 0;
const failedToLoadImageIds = new Set(); // Tracks missing/deleted files

// Folder Sync States
let directoryHandle = null;
let syncIntervalId = null;
let currentDirectorySignature = "";

// 3. DOM Elements Setup
const galleryGrid = document.getElementById("galleryGrid");
const emptyState = document.getElementById("emptyState");
const filterButtons = document.querySelectorAll(".filter-btn");
const syncPanel = document.getElementById("syncPanel");

// Lightbox Elements
const lightbox = document.getElementById("lightbox");
const lightboxBackdrop = document.getElementById("lightboxBackdrop");
const lightboxImg = document.getElementById("lightboxImg");
const lightboxTitle = document.getElementById("lightboxTitle");
const lightboxCategory = document.getElementById("lightboxCategory");
const lightboxCounter = document.getElementById("lightboxCounter");
const lightboxLoader = document.getElementById("lightboxLoader");
const closeBtn = document.getElementById("closeBtn");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");

// 4. IndexedDB Folder Handle Storage
const DB_NAME = "AuraGalleryFolderDB";
const STORE_NAME = "folder_store";
const HANDLE_KEY = "directory_handle";

function openFolderDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

async function saveHandleToDB(handle) {
  try {
    const db = await openFolderDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.put(handle, HANDLE_KEY);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error("IndexedDB Save Error:", err);
  }
}

async function getHandleFromDB() {
  try {
    const db = await openFolderDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(HANDLE_KEY);
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error("IndexedDB Load Error:", err);
    return null;
  }
}

async function clearHandleFromDB() {
  try {
    const db = await openFolderDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.delete(HANDLE_KEY);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error("IndexedDB Clear Error:", err);
  }
}

// 5. Initial Launch
document.addEventListener("DOMContentLoaded", async () => {
  renderBadges();
  renderGallery();
  setupFilterListeners();
  setupLightboxListeners();
  await initFolderSync();
});

// Setup Folder Sync State Machine
async function initFolderSync() {
  // Check if File System Access API is supported (requires HTTPS or localhost secure context)
  const isSecure = window.isSecureContext && (typeof window.showDirectoryPicker === "function");
  
  if (!isSecure) {
    renderSyncPanelState("unsupported");
    return;
  }

  // Attempt to load directory handle from IndexedDB cache
  directoryHandle = await getHandleFromDB();

  if (directoryHandle) {
    // Check if browser already has permission
    const permission = await directoryHandle.queryPermission({ mode: "read" });
    if (permission === "granted") {
      startSyncingFolder();
    } else {
      renderSyncPanelState("reconnect");
    }
  } else {
    renderSyncPanelState("default");
  }
}

// Render the sync header controls dynamically based on connection status
function renderSyncPanelState(state) {
  if (!syncPanel) return;

  if (state === "unsupported") {
    syncPanel.innerHTML = `
      <div class="file-warning-banner">
        <strong>⚠️ Browser restrictions block local folder syncing on file:// protocols.</strong>
        <p>To enable real-time directory syncing, please run this project on a local server (localhost). You can do this easily in 1 second:</p>
        <ol>
          <li>Open your terminal in this project folder.</li>
          <li>Run the command: <code>npx -y http-server</code> or <code>npx serve</code>.</li>
          <li>Open the local URL generated (e.g. <code>http://localhost:8080</code>).</li>
        </ol>
        <p><em>Currently displaying the default static demo photo showcase.</em></p>
      </div>
    `;
    return;
  }

  if (state === "default") {
    syncPanel.innerHTML = `
      <div class="sync-buttons-row">
        <button class="sync-action-btn" id="startSyncBtn">
          <svg viewBox="0 0 24 24" width="18" height="18">
            <path fill="currentColor" d="M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-1 11H5V8h14v9zm-7-6v-2h2v2h2v2h-2v2h-2v-2H9v-2h3z"/>
          </svg>
          Sync Local Folder
        </button>
      </div>
      <div class="sync-status-row">
        <span class="sync-pulse inactive"></span>
        <span class="sync-status">Displaying default demo showcase</span>
      </div>
    `;
    
    document.getElementById("startSyncBtn").addEventListener("click", selectLocalFolder);
    return;
  }

  if (state === "reconnect") {
    syncPanel.innerHTML = `
      <div class="sync-buttons-row">
        <button class="sync-action-btn" id="authSyncBtn">
          <svg viewBox="0 0 24 24" width="18" height="18">
            <path fill="currentColor" d="M12 17c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-9h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6-5c1.66 0 3 1.34 3 3v2H9V6c0-1.66 1.34-3 3-3zm6 15H6V10h12v10z"/>
          </svg>
          Authorize Synced Folder
        </button>
        <button class="sync-action-btn secondary alert" id="disconnectSyncBtn">Disconnect</button>
      </div>
      <div class="sync-status-row">
        <span class="sync-pulse paused"></span>
        <span class="sync-status">Connection paused (re-authorization required on reload)</span>
      </div>
    `;

    document.getElementById("authSyncBtn").addEventListener("click", authorizeFolderAccess);
    document.getElementById("disconnectSyncBtn").addEventListener("click", disconnectFolder);
    return;
  }

  if (state === "syncing") {
    syncPanel.innerHTML = `
      <div class="sync-buttons-row">
        <button class="sync-action-btn secondary alert" id="disconnectSyncBtn">Disconnect Folder</button>
      </div>
      <div class="sync-status-row">
        <span class="sync-pulse watching"></span>
        <span class="sync-status">Syncing folder: <strong>${directoryHandle.name}</strong> (Watching live...)</span>
      </div>
    `;

    document.getElementById("disconnectSyncBtn").addEventListener("click", disconnectFolder);
  }
}

// Trigger directory picker selection
async function selectLocalFolder() {
  try {
    directoryHandle = await window.showDirectoryPicker();
    await saveHandleToDB(directoryHandle);
    startSyncingFolder();
  } catch (err) {
    console.warn("Folder selection cancelled or failed:", err);
  }
}

// Request read permission to saved directory handle
async function authorizeFolderAccess() {
  if (!directoryHandle) return;

  try {
    const permission = await directoryHandle.requestPermission({ mode: "read" });
    if (permission === "granted") {
      startSyncingFolder();
    }
  } catch (err) {
    console.error("Authorization failed:", err);
  }
}

// Stop observer interval, wipe database and restore showcase set
async function disconnectFolder() {
  stopSyncingInterval();
  await clearHandleFromDB();
  directoryHandle = null;
  currentDirectorySignature = "";
  
  // Revoke object URLs
  galleryData.forEach(img => {
    if (img.src && img.src.startsWith("blob:")) {
      URL.revokeObjectURL(img.src);
    }
  });

  failedToLoadImageIds.clear();
  galleryData = [...defaultShowcaseData];
  filteredImages = [...galleryData];
  currentFilter = "all";
  
  // Update Buttons
  filterButtons.forEach(b => b.classList.remove("active"));
  document.getElementById("filter-all").classList.add("active");

  renderBadges();
  renderGallery();
  renderSyncPanelState("default");
}

// Start polling interval
function startSyncingFolder() {
  renderSyncPanelState("syncing");
  stopSyncingInterval(); // Safeguard

  // Perform initial scan
  syncLocalFolderContents();

  // Set up polling loop (run every 2000 milliseconds)
  syncIntervalId = setInterval(syncLocalFolderContents, 2000);
}

function stopSyncingInterval() {
  if (syncIntervalId) {
    clearInterval(syncIntervalId);
    syncIntervalId = null;
  }
}

// Recursive directory file scanner
async function scanDirectory(dirHandle, pathParts = []) {
  const filesList = [];
  try {
    for await (const entry of dirHandle.values()) {
      if (entry.kind === "file") {
        // Filter for images only
        if (/\.(jpg|jpeg|png|webp|gif|svg)$/i.test(entry.name)) {
          const file = await entry.getFile();
          filesList.push({ file, pathParts, name: entry.name });
        }
      } else if (entry.kind === "directory") {
        const subFiles = await scanDirectory(entry, [...pathParts, entry.name]);
        filesList.push(...subFiles);
      }
    }
  } catch (err) {
    console.error("Error scanning folder node:", err);
  }
  return filesList;
}

// Dynamically check folder contents and rebuild database if modifications are observed
async function syncLocalFolderContents() {
  if (!directoryHandle) return;

  const files = await scanDirectory(directoryHandle);
  
  if (files.length === 0) {
    if (currentDirectorySignature !== "empty") {
      currentDirectorySignature = "empty";
      displayEmptyFolderState();
    }
    return;
  }

  // Generate unique signature based on: file names, file sizes, and last modified dates
  // Sorted to ignore layout shuffling triggers
  const signature = files
    .map(item => `${item.name}-${item.file.size}-${item.file.lastModified}`)
    .sort()
    .join("|");

  if (signature === currentDirectorySignature) {
    return; // No changes detected
  }

  // Changes detected: Rebuild the gallery dataset dynamically!
  currentDirectorySignature = signature;
  
  // Clean old blob URLs
  galleryData.forEach(img => {
    if (img.src && img.src.startsWith("blob:")) {
      URL.revokeObjectURL(img.src);
    }
  });

  failedToLoadImageIds.clear();
  const syncData = [];
  let idCounter = 1;

  files.forEach(item => {
    let category = "nature"; // fallback

    // Category parsing:
    // A. Parse from subfolder path (e.g. images/nature/mountain.jpg -> nature)
    if (item.pathParts.length > 0) {
      const subfolder = item.pathParts[0].toLowerCase();
      if (["nature", "family", "travel", "friends"].includes(subfolder)) {
        category = subfolder;
      }
    } else {
      // B. Parse from filename keywords
      const filename = item.name.toLowerCase();
      if (filename.includes("nature")) category = "nature";
      else if (filename.includes("family")) category = "family";
      else if (filename.includes("travel")) category = "travel";
      else if (filename.includes("friends")) category = "friends";
    }

    // Clean filename for Caption
    const nameWithoutExt = item.name.substring(0, item.name.lastIndexOf('.')) || item.name;
    const title = nameWithoutExt
      .replace(/[_-]/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());

    // Generate local Object URL resource path
    const objectUrl = URL.createObjectURL(item.file);

    syncData.push({
      id: idCounter++,
      src: objectUrl,
      category: category,
      title: title
    });
  });

  // Overwrite memory dataset
  galleryData = syncData;

  // Preserve filter button highlight but refresh current visible list
  const activeImages = galleryData.filter(img => !failedToLoadImageIds.has(img.id));
  if (currentFilter === "all") {
    filteredImages = [...activeImages];
  } else {
    filteredImages = activeImages.filter(img => img.category === currentFilter);
  }

  // Reset counters/indexes if current lightbox index goes out of range
  if (lightbox.classList.contains("active")) {
    if (currentImageIndex >= filteredImages.length) {
      currentImageIndex = 0;
      if (filteredImages.length === 0) {
        closeLightbox();
      } else {
        updateLightboxImage();
      }
    } else {
      updateLightboxImage();
    }
  }

  // Refresh GUI elements
  renderBadges();
  renderGallery();
  
  // Hide empty state if images exist
  emptyState.style.display = "none";
}

function displayEmptyFolderState() {
  galleryData = [];
  filteredImages = [];
  renderBadges();
  renderGallery();
}

// Calculate and render image count badges for category buttons (filtering out failed images)
function renderBadges() {
  const activeImages = galleryData.filter(img => !failedToLoadImageIds.has(img.id));
  
  // All count
  document.getElementById("badge-all").textContent = activeImages.length;
  
  // Counts by category
  const counts = { nature: 0, family: 0, travel: 0, friends: 0 };
  activeImages.forEach(img => {
    if (counts[img.category] !== undefined) {
      counts[img.category]++;
    }
  });

  Object.keys(counts).forEach(cat => {
    const badge = document.getElementById(`badge-${cat}`);
    if (badge) {
      badge.textContent = counts[cat];
    }
  });
}

// Generate image cards DOM nodes with onerror fallback
function renderGallery() {
  galleryGrid.innerHTML = "";
  const activeImages = galleryData.filter(img => !failedToLoadImageIds.has(img.id));
  
  if (activeImages.length === 0) {
    emptyState.style.display = "block";
    return;
  }
  
  activeImages.forEach(img => {
    const card = document.createElement("div");
    card.className = "card-item fade-in";
    card.setAttribute("data-category", img.category);
    card.setAttribute("data-id", img.id);
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-label", `View ${img.title} in ${img.category} category`);

    card.innerHTML = `
      <img src="${img.src}" alt="${img.title}" class="card-img" loading="lazy">
      <div class="card-overlay">
        <span class="card-category">${img.category}</span>
        <h3 class="card-title">${img.title}</h3>
      </div>
    `;

    // Handle deleted/missing files: Automatically hide them from the gallery grid
    const imgEl = card.querySelector(".card-img");
    imgEl.onerror = () => {
      card.style.display = "none";
      handleImageLoadError(img.id);
    };

    // Keyboard support for card focus opens lightbox
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openLightbox(img.id);
      }
    });

    // Mouse click opens lightbox
    card.addEventListener("click", () => openLightbox(img.id));

    galleryGrid.appendChild(card);
  });
}

// Update app state when a photo path fails to load (e.g. deleted from folder)
function handleImageLoadError(imgId) {
  failedToLoadImageIds.add(imgId);
  
  // Re-render count badges
  renderBadges();
  
  // Exclude failed image from lightbox cycle array
  const activeImages = galleryData.filter(img => !failedToLoadImageIds.has(img.id));
  if (currentFilter === "all") {
    filteredImages = [...activeImages];
  } else {
    filteredImages = activeImages.filter(img => img.category === currentFilter);
  }

  // If no visible images remain in active filter, display empty state
  const visibleCards = Array.from(document.querySelectorAll(".card-item")).filter(c => {
    const cardId = Number(c.getAttribute("data-id"));
    const category = c.getAttribute("data-category");
    const matchesFilter = (currentFilter === "all" || category === currentFilter);
    return matchesFilter && !failedToLoadImageIds.has(cardId);
  });

  if (visibleCards.length === 0) {
    emptyState.style.display = "block";
  }
}

// Set up event listeners for filtering
function setupFilterListeners() {
  filterButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const filterValue = btn.getAttribute("data-filter");
      
      if (currentFilter === filterValue) return;

      // Update active state in Navigation UI
      filterButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      
      currentFilter = filterValue;
      applyFilter(filterValue);
    });
  });
}

// Apply filter logic with smooth transitions (respecting load failures)
function applyFilter(filterValue) {
  const cards = document.querySelectorAll(".card-item");
  const activeImages = galleryData.filter(img => !failedToLoadImageIds.has(img.id));
  
  // Filter the internal state array (needed for Lightbox sequence logic)
  if (filterValue === "all") {
    filteredImages = [...activeImages];
  } else {
    filteredImages = activeImages.filter(img => img.category === filterValue);
  }

  // Smooth CSS Transition Timeout logic
  let visibleCount = 0;
  
  cards.forEach(card => {
    const cardId = Number(card.getAttribute("data-id"));
    
    // Skip entirely if this image failed to load previously
    if (failedToLoadImageIds.has(cardId)) {
      card.style.display = "none";
      return;
    }

    const category = card.getAttribute("data-category");
    const matches = (filterValue === "all" || category === filterValue);

    if (matches) {
      visibleCount++;
      card.style.display = "block";
      void card.offsetWidth; // Force layout recalculation
      card.classList.remove("fade-out");
      card.classList.add("fade-in");
    } else {
      card.classList.remove("fade-in");
      card.classList.add("fade-out");
      setTimeout(() => {
        if (card.classList.contains("fade-out")) {
          card.style.display = "none";
        }
      }, 400); // Matches stylesheet transitions
    }
  });

  // Handle empty state if no images are present in category
  if (visibleCount === 0) {
    setTimeout(() => {
      if (visibleCount === 0) {
        emptyState.style.display = "block";
        emptyState.classList.add("fade-in");
      }
    }, 300);
  } else {
    emptyState.style.display = "none";
  }
}

// 6. Lightbox Mechanics
function openLightbox(imageId) {
  currentImageIndex = filteredImages.findIndex(img => img.id === Number(imageId));
  
  if (currentImageIndex === -1) return; // Safeguard if mismatch happens

  // Reveal Modal Container
  lightbox.classList.add("active");
  lightbox.setAttribute("aria-hidden", "false");
  lightbox.focus();
  
  // Prevent body scrolling
  document.body.style.overflow = "hidden";
  
  updateLightboxImage();
}

function closeLightbox() {
  lightbox.classList.remove("active");
  lightbox.setAttribute("aria-hidden", "true");
  
  document.body.style.overflow = "";
  lightboxImg.src = "";
  lightboxImg.classList.remove("loaded");
}

function updateLightboxImage() {
  const currentImgData = filteredImages[currentImageIndex];
  if (!currentImgData) return;

  lightboxImg.classList.remove("loaded");
  lightboxLoader.style.display = "block";

  lightboxImg.src = currentImgData.src;
  lightboxImg.alt = currentImgData.title;

  lightboxImg.onload = () => {
    lightboxLoader.style.display = "none";
    lightboxImg.classList.add("loaded");
  };

  lightboxImg.onerror = () => {
    lightboxLoader.style.display = "none";
    lightboxTitle.textContent = "Failed to load image";
  };

  lightboxTitle.textContent = currentImgData.title;
  lightboxCategory.textContent = currentImgData.category;
  lightboxCounter.textContent = `${currentImageIndex + 1} of ${filteredImages.length}`;
}

// Lightbox Navigation Functions
function navigateLightbox(direction) {
  const total = filteredImages.length;
  if (total <= 1) return; // No cycling needed

  currentImageIndex = (currentImageIndex + direction + total) % total;
  updateLightboxImage();
}

// Register Listeners for Lightbox Controls
function setupLightboxListeners() {
  closeBtn.addEventListener("click", closeLightbox);
  lightboxBackdrop.addEventListener("click", closeLightbox);

  prevBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    navigateLightbox(-1);
  });
  nextBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    navigateLightbox(1);
  });

  document.addEventListener("keydown", (e) => {
    if (!lightbox.classList.contains("active")) return;

    if (e.key === "Escape") {
      closeLightbox();
    } else if (e.key === "ArrowLeft") {
      navigateLightbox(-1);
    } else if (e.key === "ArrowRight") {
      navigateLightbox(1);
    } else if (e.key === "Tab") {
      handleLightboxTabFocus(e);
    }
  });
}

// Accessibility Tab trapping inside Lightbox
function handleLightboxTabFocus(e) {
  const focusables = lightbox.querySelectorAll('button, [tabindex="0"]');
  const firstFocusable = focusables[0];
  const lastFocusable = focusables[focusables.length - 1];

  if (e.shiftKey) {
    if (document.activeElement === firstFocusable) {
      lastFocusable.focus();
      e.preventDefault();
    }
  } else {
    if (document.activeElement === lastFocusable) {
      firstFocusable.focus();
      e.preventDefault();
    }
  }
}
