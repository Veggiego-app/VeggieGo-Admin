import { db, auth, storage } from "./firebase.js"

import {
    doc,
    getDoc,
    updateDoc,
    collection,
    query,
    where,
    getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"

import {
    ref as storageRef,
    uploadBytes,
    getDownloadURL,
    deleteObject
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js"

import {
    signOut,
    getAuth,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    deleteUser
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"

import {
    initializeApp,
    getApps
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js"

const params = new URLSearchParams(window.location.search)
const restaurantId = params.get("id")
const root = document.getElementById("restaurantDetails")
const restaurantRef = restaurantId ? doc(db, "restaurants", restaurantId) : null

const secondaryConfig = {
    apiKey: "AIzaSyCGxua4ApZbRdYP1wA6e8b4AwvqdKxrZVc",
    authDomain: "veggie-go-98215.firebaseapp.com",
    projectId: "veggie-go-98215",
    storageBucket: "veggie-go-98215.firebasestorage.app",
    messagingSenderId: "472084397101",
    appId: "1:472084397101:web:297e14252e111e597b0ca4"
}

const secondaryApp = getApps().find(item => item.name === "RestaurantDetailsCreator")
    || initializeApp(secondaryConfig, "RestaurantDetailsCreator")
const secondaryAuth = getAuth(secondaryApp)

const WEEK_DAYS = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday"
]

const MOBILE_REGEX = /^[6-9]\d{9}$/
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i
const PINCODE_REGEX = /^\d{6}$/
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/
const UPI_REGEX = /^[a-zA-Z0-9._-]{2,}@[a-zA-Z]{2,}$/
const IMAGE_MAX_BYTES = 5 * 1024 * 1024
const DOCUMENT_MAX_BYTES = 10 * 1024 * 1024

let restaurantData = null
let activeTab = "overview"
let profileMap = null
let profileMarker = null
let profileGeocoder = null
let toastTimer = null
let autoStatusTimer = null
let isBusy = false

document.querySelectorAll(".restaurant-sidebar [data-href]").forEach(button => {
    button.addEventListener("click", () => {
        window.location.href = button.dataset.href
    })
})

document.getElementById("logoutBtn")?.addEventListener("click", async () => {
    await signOut(auth)
    window.location.href = "login.html"
})

root.addEventListener("click", handleRootClick)
root.addEventListener("change", handleRootChange)
root.addEventListener("input", handleRootInput)
document.getElementById("dialogOverlay").addEventListener("click", handleDialogClick)

loadRestaurant()

async function loadRestaurant() {
    if (!restaurantRef) {
        root.innerHTML = '<div class="restaurant-not-found">❌ Restaurant ID is missing.</div>'
        return
    }

    try {
        const snapshot = await getDoc(restaurantRef)
        if (!snapshot.exists()) {
            root.innerHTML = '<div class="restaurant-not-found">❌ Restaurant Not Found</div>'
            return
        }

        restaurantData = {
            id: snapshot.id,
            ...snapshot.data()
        }

        renderShell()
        startAutoStatusTimer()
        await updateLiveRestaurantStatus(false)
    } catch (error) {
        console.error(error)
        root.innerHTML = `<div class="restaurant-not-found">${escapeHtml(error.message || "Restaurant could not be loaded.")}</div>`
    }
}

async function reloadRestaurant(message = "") {
    const snapshot = await getDoc(restaurantRef)
    if (!snapshot.exists()) return

    restaurantData = {
        id: snapshot.id,
        ...snapshot.data()
    }
    renderShell()
    if (message) showToast(message, "success")
}

function renderShell() {
    const status = getAvailabilityState(restaurantData)
    const logoUrl = safeImageUrl(restaurantData.logoUrl, "https://placehold.co/180x180?text=No+Logo")
    const restaurantName = restaurantData.name || restaurantData.restaurantName || "Restaurant"
    const ownerName = restaurantData.ownerName || "-"
    const approval = restaurantData.status || "PENDING"
    const zone = restaurantData.zone || "Not Set"
    const commission = restaurantData.commissionPercent ?? "Not Set"

    root.innerHTML = `
        <button type="button" class="rd-back-link" data-action="back-restaurants">← Restaurants</button>

        <header class="rd-header">
            <div class="rd-identity">
                <img class="rd-logo" src="${escapeAttribute(logoUrl)}" alt="Restaurant logo">
                <div class="rd-title-wrap">
                    <h1>${escapeHtml(restaurantName)}</h1>
                    <div class="rd-subtitle">${escapeHtml(restaurantData.restaurantCode || "No Code")} • Owner: ${escapeHtml(ownerName)}</div>
                    <div class="rd-badges">
                        <span class="rd-badge ${approval === "APPROVED" ? "success" : "warning"}">${escapeHtml(approval)}</span>
                        <span class="rd-badge ${status.manualOnline ? "success" : "danger"}"><span class="status-dot"></span>${status.manualOnline ? "ONLINE" : "OFFLINE"}</span>
                        ${status.temporarilyClosed ? '<span class="rd-badge warning">TEMPORARILY CLOSED</span>' : ""}
                        <span class="rd-badge">📍 ${escapeHtml(zone)}</span>
                        <span class="rd-badge">${escapeHtml(String(commission))}${commission !== "Not Set" ? "%" : ""} Commission</span>
                    </div>
                </div>
            </div>

            <div class="rd-actions">
                <button type="button" class="rd-btn" data-action="manage-menu">☷ Manage Menu</button>
                <button type="button" class="rd-btn" data-action="customer-preview">↗ Customer Preview</button>
                <button type="button" class="rd-btn ${restaurantData.online ? "red-outline" : "primary"}" data-action="toggle-online">
                    ${restaurantData.online ? "● Go Offline" : "◉ Go Online"}
                </button>
                <button type="button" class="rd-btn ${restaurantData.temporaryClosed ? "green-outline" : "orange"}" data-action="temporary-close">
                    ${restaurantData.temporaryClosed ? "Remove Temporary Close" : "⏸ Temporarily Close"}
                </button>
            </div>
        </header>

        <nav class="rd-tabs" aria-label="Restaurant detail sections">
            ${renderTabButton("overview", "Overview")}
            ${renderTabButton("profile", "Profile")}
            ${renderTabButton("business", "Business & Finance")}
            ${renderTabButton("documents", "Documents")}
            ${renderTabButton("access", "Access & Timing")}
        </nav>

        <section id="rdTabContent" class="rd-tab-content"></section>
    `

    renderActiveTab()
}

function renderTabButton(tab, label) {
    return `<button type="button" class="rd-tab ${activeTab === tab ? "active" : ""}" data-tab="${tab}">${label}</button>`
}

function activateTab(tab) {
    activeTab = tab
    root.querySelectorAll(".rd-tab").forEach(button => {
        button.classList.toggle("active", button.dataset.tab === tab)
    })
    renderActiveTab()
}

function renderActiveTab() {
    const content = document.getElementById("rdTabContent")
    if (!content || !restaurantData) return

    profileMap = null
    profileMarker = null
    profileGeocoder = null

    if (activeTab === "overview") content.innerHTML = renderOverviewTab()
    if (activeTab === "profile") content.innerHTML = renderProfileTab()
    if (activeTab === "business") content.innerHTML = renderBusinessTab()
    if (activeTab === "documents") content.innerHTML = renderDocumentsTab()
    if (activeTab === "access") content.innerHTML = renderAccessTab()

    if (activeTab === "profile") initProfileMap()
}

function renderOverviewTab() {
    const status = getAvailabilityState(restaurantData)
    const weeklySlots = getWeeklySlots(restaurantData)
    const today = getTodayName()
    const todaySlots = weeklySlots[today] || []
    const todaySlotText = todaySlots.length
        ? todaySlots.map(slot => `${slot.start} → ${slot.end}`).join(", ")
        : "Closed"
    const scheduleText = status.insideTiming ? "Open Now" : "Closed Now"
    const customerText = status.customerOpen
        ? "Open"
        : status.temporarilyClosed
            ? "Temporarily Closed"
            : "Offline"
    const nextCloseText = getCurrentSlotCloseText(todaySlots)
    const phone = restaurantData.restaurantPhone || restaurantData.phone || "Not Set"
    const ownerPhone = restaurantData.ownerPhone || "Not Set"
    const contactEmail = restaurantData.email || "Not Set"
    const hasTiming = WEEK_DAYS.some(day => (weeklySlots[day] || []).length > 0)
    const hasMap = Number.isFinite(Number(restaurantData.lat)) && Number.isFinite(Number(restaurantData.lng))
    const hasBank = Boolean(restaurantData.accountNumber || restaurantData.upiId)
    const hasFssai = Boolean(restaurantData.fssaiNumber && restaurantData.fssaiDocumentUrl)

    return `
        <div class="rd-grid five">
            ${summaryCard("Customer Status", customerText, status.customerOpen ? "green" : "red", "◉")}
            ${summaryCard("Manual Status", status.manualOnline ? "Online" : "Offline", status.manualOnline ? "green" : "red", "⚙")}
            ${summaryCard("Schedule Status", scheduleText, status.insideTiming ? "green" : "red", "▣")}
            ${summaryCard("Approval", restaurantData.status || "Pending", restaurantData.status === "APPROVED" ? "green" : "", "✓")}
            ${summaryCard("Zone", restaurantData.zone || "Not Set", "", "⌖")}
        </div>

        <div class="rd-grid rd-overview-main">
            <article class="rd-card">
                <div class="rd-card-title-row"><h2>🕒 Today’s Schedule</h2></div>
                <div class="today-schedule">
                    <strong>${today}</strong>
                    <span class="schedule-chip">${escapeHtml(todaySlotText)}</span>
                    <span class="rd-helper">${escapeHtml(nextCloseText || restaurantData.openingText || "No active slot right now")}</span>
                    <button type="button" class="rd-btn green-outline small" data-action="view-timing" style="margin-top:14px;">View Weekly Timing</button>
                </div>
            </article>

            <article class="rd-card">
                <div class="rd-card-title-row"><h2>☎ Restaurant Contact</h2></div>
                <div class="rd-info-list">
                    ${infoItem("App Login Mobile", phone)}
                    ${infoItem("Owner Mobile", ownerPhone)}
                    ${infoItem("Contact Email", contactEmail)}
                </div>
                <button type="button" class="rd-btn small" data-action="edit-profile" style="margin-top:15px;">✎ Edit Profile</button>
            </article>

            <article class="rd-card">
                <div class="rd-card-title-row"><h2>☷ Setup Checklist</h2></div>
                <div class="rd-check-list">
                    ${checkItem("Map location confirmed", hasMap)}
                    ${checkItem("Weekly timing added", hasTiming)}
                    ${checkItem("Bank details added", hasBank)}
                    ${checkItem("FSSAI document added", hasFssai)}
                    ${checkItem(restaurantData.online ? "Restaurant is manually Online" : "Restaurant is manually Offline", restaurantData.online)}
                </div>
            </article>
        </div>

        <article class="rd-card">
            <div class="rd-card-title-row"><h2>◉ Restaurant Availability</h2></div>
            <div class="availability-flow">
                ${availabilityStep("Approved", status.approved)}
                ${availabilityStep("Manual Online", status.manualOnline)}
                ${availabilityStep("Not Temporarily Closed", !status.temporarilyClosed)}
                ${availabilityStep("Inside Timing Slot", status.insideTiming)}
                <div class="availability-result">
                    <span>CUSTOMER STATUS</span>
                    <strong class="${status.customerOpen ? "rd-summary-value green" : "rd-summary-value red"}">${status.customerOpen ? "OPEN" : "OFFLINE"}</strong>
                </div>
            </div>
            <span class="rd-helper">All four conditions must be active for customers to place orders.</span>
        </article>

        <div class="rd-card rd-footer-strip">
            <span>ⓘ Last Updated: ${escapeHtml(formatTimestamp(restaurantData.updatedAt || restaurantData.createdAt))}</span>
            <span>◇ Restaurant Code: ${escapeHtml(restaurantData.restaurantCode || "-")}</span>
        </div>
    `
}

function summaryCard(label, value, tone, icon) {
    return `
        <article class="rd-card rd-summary-card">
            <div class="rd-summary-label"><span>${icon}</span>${escapeHtml(label)}</div>
            <div class="rd-summary-value ${tone}">${escapeHtml(String(value))}</div>
        </article>
    `
}

function infoItem(label, value) {
    return `<div class="rd-info-item"><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}</strong></div>`
}

function checkItem(label, complete) {
    return `
        <div class="rd-check-item">
            <span class="rd-check-icon ${complete ? "" : "warning"}">${complete ? "✓" : "!"}</span>
            ${escapeHtml(label)}
        </div>
    `
}

function availabilityStep(label, active) {
    return `
        <div class="availability-step">
            <div class="availability-circle ${active ? "" : "off"}">${active ? "✓" : "×"}</div>
            <span>${escapeHtml(label)}</span>
        </div>
    `
}

function renderProfileTab() {
    const logoUrl = safeImageUrl(restaurantData.logoUrl, "https://placehold.co/240x180?text=No+Logo")
    const bannerUrl = safeImageUrl(restaurantData.bannerUrl, "https://placehold.co/520x180?text=No+Banner")
    const restaurantPhone = restaurantData.restaurantPhone || restaurantData.phone || ""

    return `
        <div class="rd-grid profile-upper-grid">
            <article class="rd-card">
                <div class="rd-card-title-row"><h2>🏪 Basic Information</h2></div>
                <div class="rd-form-grid">
                    ${field("Restaurant Name", "profileRestaurantName", restaurantData.name || restaurantData.restaurantName || "", true)}
                    ${field("Owner Name", "profileOwnerName", restaurantData.ownerName || "", true)}
                    <div class="rd-field">
                        <label for="profileRestaurantPhone">Restaurant Mobile (OTP Login) <span class="required">*</span></label>
                        <input id="profileRestaurantPhone" inputmode="numeric" maxlength="10" value="${escapeAttribute(restaurantPhone)}">
                        <small class="rd-helper success">✓ Valid 10-digit login mobile</small>
                        <small class="rd-helper warning">Changing this number changes Restaurant App OTP login.</small>
                    </div>
                    ${field("Owner Mobile", "profileOwnerPhone", restaurantData.ownerPhone || "", false, "tel")}
                    ${field("Contact Email", "profileEmail", restaurantData.email || "", false, "email")}
                    <div class="rd-field">
                        <label for="profileZone">Zone <span class="required">*</span></label>
                        <select id="profileZone">${renderZoneOptions(restaurantData.zone)}</select>
                    </div>
                    ${field("Restaurant Code", "profileRestaurantCode", restaurantData.restaurantCode || "", false, "text", true)}
                </div>
                <div class="rd-card-actions"><button type="button" class="rd-btn primary" data-action="save-profile">Save Profile</button></div>
            </article>

            <article class="rd-card">
                <div class="rd-card-title-row"><h2>📸 Restaurant Images</h2></div>
                <div class="rd-image-grid">
                    <div>
                        <span class="rd-helper">Restaurant Logo</span>
                        <img id="profileLogoPreview" class="rd-image-preview" src="${escapeAttribute(logoUrl)}" alt="Restaurant logo">
                        <input id="profileLogoFile" class="rd-file-input" type="file" accept="image/jpeg,image/png,image/webp">
                        <div class="document-buttons">
                            <button type="button" class="rd-btn small" data-action="upload-logo">Change Logo</button>
                            <button type="button" class="rd-btn small" data-action="view-image" data-image-url="${escapeAttribute(logoUrl)}" data-image-title="Restaurant Logo">View</button>
                        </div>
                    </div>
                    <div>
                        <span class="rd-helper">Restaurant Banner</span>
                        <img id="profileBannerPreview" class="rd-image-preview banner" src="${escapeAttribute(bannerUrl)}" alt="Restaurant banner">
                        <input id="profileBannerFile" class="rd-file-input" type="file" accept="image/jpeg,image/png,image/webp">
                        <div class="document-buttons">
                            <button type="button" class="rd-btn small" data-action="upload-banner">Change Banner</button>
                            <button type="button" class="rd-btn small" data-action="view-image" data-image-url="${escapeAttribute(bannerUrl)}" data-image-title="Restaurant Banner">View</button>
                        </div>
                    </div>
                </div>
                <span class="rd-helper">JPG, PNG or WebP · Max 5 MB. Images are uploaded as WebP.</span>
            </article>
        </div>

        <article class="rd-card">
            <div class="rd-card-title-row"><h2>📍 Address & Map Location</h2></div>
            <div class="rd-location-layout">
                <div>
                    <div class="rd-form-grid">
                        ${field("Search Location", "profileLocationSearch", "", false, "text", false, true)}
                        ${field("Address Line 1", "profileAddressLine1", restaurantData.addressLine1 || "", true, "text", false, true)}
                        ${field("Address Line 2", "profileAddressLine2", restaurantData.addressLine2 || "", false, "text", false, true)}
                        ${field("Area", "profileArea", restaurantData.area || "", true, "text", false, true)}
                        ${field("City", "profileCity", restaurantData.city || "", true)}
                        ${field("State", "profileState", restaurantData.state || "", true)}
                        ${field("Pincode", "profilePincode", restaurantData.pincode || "", true)}
                    </div>
                    <div class="rd-card-actions"><button type="button" class="rd-btn primary" data-action="save-location">Save Location</button></div>
                </div>
                <div>
                    <div id="restaurantMap"></div>
                    <div class="rd-coordinate-row">
                        <span class="coordinate-chip">Latitude <strong id="profileLatitude">${escapeHtml(String(restaurantData.lat ?? "-"))}</strong></span>
                        <span class="coordinate-chip">Longitude <strong id="profileLongitude">${escapeHtml(String(restaurantData.lng ?? "-"))}</strong></span>
                    </div>
                </div>
            </div>
            <div class="rd-alert">⚠ Changing location may affect delivery distance and customer availability.</div>
        </article>
    `
}

function field(label, id, value, required = false, type = "text", readonly = false, full = false) {
    const mobileAttributes = type === "tel" ? 'inputmode="numeric" maxlength="10"' : ""
    const pincodeAttributes = id === "profilePincode" ? 'inputmode="numeric" maxlength="6"' : ""
    return `
        <div class="rd-field ${full ? "full" : ""}">
            <label for="${id}">${escapeHtml(label)} ${required ? '<span class="required">*</span>' : '<span class="optional">(Optional)</span>'}</label>
            <input type="${type}" id="${id}" value="${escapeAttribute(value)}" ${mobileAttributes} ${pincodeAttributes} ${readonly ? "readonly" : ""}>
        </div>
    `
}

function renderZoneOptions(selected) {
    return ["Gandhidham", "Adipur", "Bhuj", "Rajula"]
        .map(zone => `<option value="${zone}" ${zone === selected ? "selected" : ""}>${zone}</option>`)
        .join("")
}

function renderBusinessTab() {
    const hasBank = Boolean(restaurantData.accountNumber || restaurantData.upiId)
    const accountNumber = restaurantData.accountNumber || ""
    const settlementReady = Boolean(
        restaurantData.bankName
        && restaurantData.accountHolder
        && restaurantData.accountNumber
        && restaurantData.ifscCode
    )

    return `
        <div class="rd-grid two">
            <article class="rd-card">
                <div class="rd-card-title-row"><h2>💰 Business Settings</h2></div>
                <div class="rd-form-grid">
                    ${numberField("Commission (%)", "businessCommission", restaurantData.commissionPercent ?? "", true, 0, 100)}
                    ${numberField("Packaging Fee (₹)", "businessPackagingFee", restaurantData.packagingFee ?? 0, false, 0)}
                    ${numberField("Minimum Order (₹)", "businessMinimumOrder", restaurantData.minimumOrder ?? 0, true, 0)}
                    ${numberField("Max Delivery Distance (KM)", "businessMaxDistance", restaurantData.maxDeliveryDistance ?? 15, true, 0.1)}
                    <div class="rd-field">
                        <label for="businessZone">Zone <span class="required">*</span></label>
                        <select id="businessZone">${renderZoneOptions(restaurantData.zone)}</select>
                    </div>
                </div>
                <div class="rd-alert">ⓘ Commission changes apply only to future orders. Existing order commission remains unchanged.</div>
                <div class="rd-card-actions"><button type="button" class="rd-btn primary" data-action="save-business">Save Business Settings</button></div>
            </article>

            <article class="rd-card">
                <div class="rd-card-title-row">
                    <h2>🏦 Bank Details</h2>
                    <span class="rd-badge ${hasBank ? "success" : "warning"}">${hasBank ? "Details Added" : "Not Added"}</span>
                </div>
                <div class="rd-form-grid">
                    ${field("Bank Name", "bankName", restaurantData.bankName || "", false, "text", false, true)}
                    ${field("Account Holder", "bankAccountHolder", restaurantData.accountHolder || "", false, "text", false, true)}
                    <div class="rd-field full">
                        <label for="bankAccountNumber">Account Number</label>
                        <div class="bank-account-wrap">
                            <input type="password" id="bankAccountNumber" inputmode="numeric" value="${escapeAttribute(accountNumber)}">
                            <button type="button" class="icon-button" data-action="toggle-account-number" aria-label="Show account number">👁</button>
                        </div>
                    </div>
                    ${field("IFSC Code", "bankIfsc", restaurantData.ifscCode || "", false)}
                    ${field("UPI ID", "bankUpi", restaurantData.upiId || "", false)}
                </div>
                <span class="rd-helper">Bank details are required before the first settlement.</span>
                <div class="rd-card-actions"><button type="button" class="rd-btn primary" data-action="save-bank">Save Bank Details</button></div>
            </article>
        </div>

        <div class="rd-grid two">
            <article class="rd-card">
                <div class="rd-card-title-row"><h2>☷ Settlement Readiness</h2></div>
                <div class="rd-check-list">
                    ${checkItem("Bank account added", Boolean(restaurantData.accountNumber))}
                    ${checkItem("IFSC code added", Boolean(restaurantData.ifscCode))}
                    ${checkItem("UPI ID added", Boolean(restaurantData.upiId))}
                    ${checkItem("Restaurant approved", restaurantData.status === "APPROVED")}
                </div>
                <span class="rd-badge ${settlementReady ? "success" : "warning"}" style="margin-top:15px;">${settlementReady ? "READY FOR SETTLEMENT" : "BANK DETAILS PENDING"}</span>
            </article>

            <article class="rd-card">
                <div class="rd-card-title-row"><h2>ⓘ Settings Impact</h2></div>
                <table class="settings-impact-table">
                    <tr><td>New Orders</td><td>${escapeHtml(String(restaurantData.commissionPercent ?? 0))}% commission</td></tr>
                    <tr><td>Existing Orders</td><td>No change</td></tr>
                    <tr><td>Delivery Range</td><td>Up to ${escapeHtml(String(restaurantData.maxDeliveryDistance ?? 0))} KM</td></tr>
                </table>
                <span class="rd-helper">Restaurant defaults are copied into each new order when the order is created.</span>
            </article>
        </div>
    `
}

function numberField(label, id, value, required, min, max = "") {
    return `
        <div class="rd-field">
            <label for="${id}">${escapeHtml(label)} ${required ? '<span class="required">*</span>' : ""}</label>
            <input type="number" id="${id}" value="${escapeAttribute(value)}" min="${min}" ${max !== "" ? `max="${max}"` : ""} step="0.01">
        </div>
    `
}

function renderDocumentsTab() {
    const gstComplete = Boolean(restaurantData.gstNumber && restaurantData.gstDocumentUrl)
    const fssaiComplete = Boolean(restaurantData.fssaiNumber && restaurantData.fssaiDocumentUrl)

    return `
        <div class="rd-grid document-status-grid">
            ${documentStatusCard("GST Details", gstComplete)}
            ${documentStatusCard("FSSAI Details", fssaiComplete)}
        </div>

        <div class="rd-grid two">
            ${renderDocumentCard("gst", "GST Details", "GST Number", restaurantData.gstNumber || "", restaurantData.gstDocumentUrl, restaurantData.gstDocumentPath, true)}
            ${renderDocumentCard("fssai", "FSSAI Details", "FSSAI Number", restaurantData.fssaiNumber || "", restaurantData.fssaiDocumentUrl, restaurantData.fssaiDocumentPath, false)}
        </div>

        <div class="rd-grid two">
            <article class="rd-card">
                <div class="rd-card-title-row"><h2>✓ Document Checklist</h2></div>
                <div class="rd-check-list">
                    ${checkItem("GST number added", Boolean(restaurantData.gstNumber))}
                    ${checkItem("GST document uploaded", Boolean(restaurantData.gstDocumentUrl))}
                    ${checkItem("FSSAI number added", Boolean(restaurantData.fssaiNumber))}
                    ${checkItem("FSSAI document uploaded", Boolean(restaurantData.fssaiDocumentUrl))}
                </div>
            </article>

            <article class="rd-card">
                <div class="rd-card-title-row"><h2>ⓘ Upload Requirements</h2></div>
                <table class="upload-requirements-table">
                    <tr><td>Supported Files</td><td>PDF, JPG, PNG or WebP</td></tr>
                    <tr><td>Maximum Size</td><td>10 MB per file</td></tr>
                    <tr><td>Security</td><td>Only admins can replace documents</td></tr>
                </table>
                <span class="rd-helper">A new file replaces the previous document only after upload succeeds.</span>
            </article>
        </div>
    `
}

function documentStatusCard(title, complete) {
    return `
        <article class="rd-card document-status-card">
            <div class="document-status-main">
                <span class="document-icon">▤</span>
                <div><h3>${title}</h3><span class="rd-helper">${complete ? "Number & Document Added" : "Details Incomplete"}</span></div>
            </div>
            <span class="rd-badge ${complete ? "success" : "warning"}">${complete ? "COMPLETE" : "PENDING"}</span>
        </article>
    `
}

function renderDocumentCard(kind, title, numberLabel, numberValue, documentUrl, documentPath, optionalNumber) {
    const hasDocument = Boolean(documentUrl)
    const fileName = getFileName(documentPath, `${title.replace(/\s+/g, "-")}-Document`)

    return `
        <article class="rd-card">
            <div class="rd-card-title-row">
                <h2>▤ ${title}</h2>
                <span class="rd-badge ${hasDocument ? "success" : "warning"}">${hasDocument ? "Document Added" : "No Document"}</span>
            </div>
            <div class="rd-field">
                <label for="${kind}Number">${numberLabel} ${optionalNumber ? '<span class="optional">(Optional)</span>' : ""}</label>
                <input id="${kind}Number" value="${escapeAttribute(numberValue)}">
            </div>
            <div class="document-preview">
                <span class="pdf-icon">${hasDocument ? "PDF" : "—"}</span>
                <div class="document-preview-info">
                    <strong id="${kind}SelectedFileName">${hasDocument ? escapeHtml(fileName) : "No document uploaded"}</strong>
                    <span class="rd-helper">PDF or image document</span>
                    <div class="document-buttons">
                        ${hasDocument ? `<button type="button" class="rd-btn small" data-action="view-document" data-kind="${kind}">◉ View Document</button>` : ""}
                        <button type="button" class="rd-btn small" data-action="choose-document" data-kind="${kind}">${hasDocument ? "Replace Document" : "Choose Document"}</button>
                        ${hasDocument ? `<button type="button" class="rd-btn red-outline small" data-action="remove-document" data-kind="${kind}">🗑 Remove</button>` : ""}
                    </div>
                    <input type="file" id="${kind}File" class="rd-file-input" accept="application/pdf,image/jpeg,image/png,image/webp" hidden>
                </div>
            </div>
            <div class="rd-card-actions"><button type="button" class="rd-btn primary" data-action="save-document" data-kind="${kind}">Save ${title}</button></div>
        </article>
    `
}

function renderAccessTab() {
    const weeklySlots = getWeeklySlots(restaurantData)
    const status = getAvailabilityState(restaurantData)
    const today = getTodayName()
    const todaySlots = weeklySlots[today] || []
    const scheduleText = todaySlots.length
        ? todaySlots.map(slot => `${slot.start}–${slot.end}`).join(", ")
        : "Closed"
    const webEnabled = getWebPanelEnabled(restaurantData)
    const loginEmail = restaurantData.loginEmail || "Login email not saved"
    const phone = restaurantData.restaurantPhone || restaurantData.phone || "Not Set"

    return `
        <div class="rd-grid access-grid">
            <article class="rd-card">
                <div class="rd-card-title-row"><h2>📱 Restaurant App Access</h2></div>
                <span class="rd-helper">OTP Login Mobile</span>
                <div class="access-mobile-value">${escapeHtml(phone)}</div>
                <span class="rd-badge success">Active</span>
                <span class="rd-helper">Restaurant App login with mobile OTP</span>
                <button type="button" class="rd-btn small" data-action="change-login-mobile" style="margin-top:14px;">Change Login Mobile</button>
            </article>

            <article class="rd-card">
                <div class="rd-card-title-row">
                    <h2>🌐 Restaurant Web Panel Access</h2>
                    <label class="rd-switch" aria-label="Web panel access">
                        <input type="checkbox" id="webAccessToggle" ${webEnabled ? "checked" : ""}>
                        <span class="rd-switch-slider"></span>
                    </label>
                </div>
                <span class="rd-helper">Login Email / ID</span>
                <div class="access-email-value">${escapeHtml(loginEmail)}</div>
                <span class="rd-helper">Password is never displayed.</span>
                <div class="document-buttons">
                    <button type="button" class="rd-btn green-outline small" data-action="reset-web-password" ${webEnabled && EMAIL_REGEX.test(loginEmail) ? "" : "disabled"}>✉ Send Password Reset</button>
                    <button type="button" class="rd-btn red-outline small" data-action="toggle-web-access">${webEnabled ? "Disable Access" : "Enable Access"}</button>
                </div>
            </article>
        </div>

        <article class="rd-card timing-card">
            <div class="rd-card-title-row">
                <div><h2>🕒 Weekly Restaurant Timing</h2><span class="rd-helper">Existing weeklySlots logic is preserved.</span></div>
                <div class="document-buttons">
                    <button type="button" class="rd-btn small" data-action="copy-monday">Copy Monday to All Days</button>
                    <button type="button" class="rd-btn primary small" data-action="save-weekly-timing">💾 Save Weekly Timing</button>
                </div>
            </div>
            <div class="timing-summary-strip">
                <span>Today: <strong>${today}</strong></span>
                <span>Schedule: <strong>${escapeHtml(scheduleText)}</strong></span>
                <span>Customer Status: <strong class="${status.customerOpen ? "" : "status-off"}">${status.customerOpen ? "Open" : "Offline"}</strong></span>
            </div>
            <div class="timing-table-head"><span>Day</span><span>Status</span><span>Time Slots</span><span>Action</span></div>
            <div id="weeklySlotsContainer">${WEEK_DAYS.map(day => renderTimingDay(day, weeklySlots[day] || [])).join("")}</div>
            <span class="rd-helper">Multiple slots are allowed. Overlapping slots cannot be saved.</span>
        </article>
    `
}

function renderTimingDay(day, slots) {
    const isOpen = slots.length > 0
    const renderSlots = isOpen ? slots : [{ start: "", end: "" }]
    return `
        <div class="timing-day-row ${isOpen ? "" : "day-closed"}" data-day="${day}">
            <span class="timing-day-name">${day}</span>
            <div class="timing-status">
                <label class="rd-switch">
                    <input type="checkbox" class="day-open-toggle" ${isOpen ? "checked" : ""}>
                    <span class="rd-switch-slider"></span>
                </label>
                <span class="day-status-text">${isOpen ? "Open" : "Closed"}</span>
            </div>
            <div class="timing-slots">
                <span class="closed-text">Closed</span>
                ${renderSlots.map(slot => timingSlotMarkup(slot.start, slot.end)).join("")}
            </div>
            <button type="button" class="rd-btn green-outline small" data-action="add-timing-slot" ${isOpen ? "" : "disabled"}>+ Slot</button>
        </div>
    `
}

function timingSlotMarkup(start = "", end = "") {
    return `
        <div class="timing-slot">
            <input type="time" class="slot-start" value="${escapeAttribute(start)}" aria-label="Opening time">
            <span>→</span>
            <input type="time" class="slot-end" value="${escapeAttribute(end)}" aria-label="Closing time">
            <button type="button" class="remove-slot-btn" data-action="remove-timing-slot" aria-label="Delete time slot">🗑</button>
        </div>
    `
}

async function handleRootClick(event) {
    const tab = event.target.closest("[data-tab]")
    if (tab) {
        activateTab(tab.dataset.tab)
        return
    }

    const button = event.target.closest("[data-action]")
    if (!button || isBusy) return

    const action = button.dataset.action

    if (action === "back-restaurants") window.location.href = "restaurants.html"
    if (action === "manage-menu") window.location.href = `menu.html?id=${encodeURIComponent(restaurantId)}`
    if (action === "customer-preview") showCustomerPreview()
    if (action === "toggle-online") await toggleOnlineStatus()
    if (action === "temporary-close") await toggleTemporaryClose()
    if (action === "edit-profile") activateTab("profile")
    if (action === "view-timing") activateTab("access")
    if (action === "save-profile") await saveProfile()
    if (action === "save-location") await saveLocation()
    if (action === "upload-logo") await uploadRestaurantImage("logo")
    if (action === "upload-banner") await uploadRestaurantImage("banner")
    if (action === "view-image") showImageDialog(button.dataset.imageUrl, button.dataset.imageTitle)
    if (action === "save-business") await saveBusinessSettings()
    if (action === "toggle-account-number") toggleAccountNumber(button)
    if (action === "save-bank") await saveBankDetails()
    if (action === "view-document") viewDocument(button.dataset.kind)
    if (action === "choose-document") document.getElementById(`${button.dataset.kind}File`)?.click()
    if (action === "save-document") await saveDocumentDetails(button.dataset.kind)
    if (action === "remove-document") await removeDocument(button.dataset.kind)
    if (action === "change-login-mobile") {
        activateTab("profile")
        setTimeout(() => document.getElementById("profileRestaurantPhone")?.focus(), 50)
    }
    if (action === "toggle-web-access") await toggleWebPanelAccess()
    if (action === "reset-web-password") await resetWebPanelPassword()
    if (action === "add-timing-slot") addTimingSlot(button.closest(".timing-day-row"))
    if (action === "remove-timing-slot") removeTimingSlot(button)
    if (action === "copy-monday") copyMondayTiming()
    if (action === "save-weekly-timing") await saveWeeklyTiming()
}

function handleRootChange(event) {
    if (event.target.classList.contains("day-open-toggle")) {
        setTimingDayOpen(event.target.closest(".timing-day-row"), event.target.checked)
    }

    if (event.target.id === "webAccessToggle") {
        event.target.checked = getWebPanelEnabled(restaurantData)
        toggleWebPanelAccess()
    }

    if (event.target.id === "profileLogoFile") previewSelectedImage(event.target, "profileLogoPreview")
    if (event.target.id === "profileBannerFile") previewSelectedImage(event.target, "profileBannerPreview")

    if (event.target.id === "gstFile" || event.target.id === "fssaiFile") {
        const kind = event.target.id.replace("File", "")
        const file = event.target.files[0]
        if (file) document.getElementById(`${kind}SelectedFileName`).textContent = file.name
    }
}

function handleRootInput(event) {
    if (["profileRestaurantPhone", "profileOwnerPhone", "profilePincode"].includes(event.target.id)) {
        const max = event.target.id === "profilePincode" ? 6 : 10
        event.target.value = event.target.value.replace(/\D/g, "").slice(0, max)
    }
    if (event.target.id === "bankAccountNumber") {
        event.target.value = event.target.value.replace(/\D/g, "").slice(0, 24)
    }
    if (event.target.id === "bankIfsc") {
        event.target.value = event.target.value.replace(/\s/g, "").toUpperCase().slice(0, 11)
    }
}

async function toggleOnlineStatus() {
    const nextOnline = !restaurantData.online
    const message = nextOnline
        ? "Restaurant ko Online karna hai?"
        : "Restaurant ko Offline karna hai?"
    if (!window.confirm(message)) return

    await runBusy("Updating restaurant status...", async () => {
        await updateDoc(restaurantRef, { online: nextOnline, updatedAt: Date.now() })
        await reloadRestaurant(`Restaurant is now ${nextOnline ? "Online" : "Offline"}.`)
    })
}

async function toggleTemporaryClose() {
    if (restaurantData.temporaryClosed === true) {
        if (!window.confirm("Restaurant se Temporary Close hatana hai?")) return
        await runBusy("Removing temporary close...", async () => {
            await updateDoc(restaurantRef, {
                temporaryClosed: false,
                closeReason: "",
                openingText: "",
                liveStatus: restaurantData.online === true ? "OPEN" : "CLOSED",
                updatedAt: Date.now()
            })
            await reloadRestaurant("Temporary close removed.")
        })
        return
    }

    const reason = window.prompt("Temporary close ka reason likhiye:")
    if (reason === null) return
    if (!reason.trim()) {
        showToast("Temporary close reason is required.", "error")
        return
    }

    await runBusy("Temporarily closing restaurant...", async () => {
        await updateDoc(restaurantRef, {
            temporaryClosed: true,
            closeReason: reason.trim(),
            openingText: "Temporarily Closed",
            liveStatus: "TEMPORARILY_CLOSED",
            updatedAt: Date.now()
        })
        await reloadRestaurant("Restaurant temporarily closed.")
    })
}

async function saveProfile() {
    const name = requiredValue("profileRestaurantName", "Enter restaurant name.")
    const ownerName = requiredValue("profileOwnerName", "Enter owner name.")
    const restaurantPhone = requiredValue("profileRestaurantPhone", "Enter restaurant mobile number.")
    const ownerPhone = valueOf("profileOwnerPhone")
    const email = valueOf("profileEmail").toLowerCase()
    const zone = valueOf("profileZone")

    if (!name || !ownerName || !restaurantPhone) return
    if (!MOBILE_REGEX.test(restaurantPhone)) return invalid("profileRestaurantPhone", "Enter a valid 10-digit restaurant mobile number.")
    if (ownerPhone && !MOBILE_REGEX.test(ownerPhone)) return invalid("profileOwnerPhone", "Enter a valid 10-digit owner mobile number.")
    if (email && !EMAIL_REGEX.test(email)) return invalid("profileEmail", "Enter a valid contact email.")

    const oldPhone = restaurantData.restaurantPhone || restaurantData.phone || ""
    if (restaurantPhone !== oldPhone) {
        const unique = await isRestaurantPhoneUnique(restaurantPhone)
        if (!unique) return invalid("profileRestaurantPhone", "This mobile number is already registered with another restaurant.")
        if (!window.confirm("This number is used for Restaurant App OTP login. Change the login mobile?")) return
    }

    await runBusy("Saving restaurant profile...", async () => {
        await updateDoc(restaurantRef, {
            name,
            restaurantName: name,
            ownerName,
            restaurantPhone,
            ownerPhone,
            email,
            zone,
            updatedAt: Date.now()
        })
        await reloadRestaurant("Restaurant profile saved.")
    })
}

async function isRestaurantPhoneUnique(phone) {
    const phoneQuery = query(collection(db, "restaurants"), where("restaurantPhone", "==", phone))
    const snapshot = await getDocs(phoneQuery)
    return snapshot.docs.every(item => item.id === restaurantId)
}

async function saveLocation() {
    const addressLine1 = requiredValue("profileAddressLine1", "Enter Address Line 1.")
    const addressLine2 = valueOf("profileAddressLine2")
    const area = requiredValue("profileArea", "Enter restaurant area.")
    const city = requiredValue("profileCity", "Enter city.")
    const state = requiredValue("profileState", "Enter state.")
    const pincode = requiredValue("profilePincode", "Enter pincode.")

    if (!addressLine1 || !area || !city || !state || !pincode) return
    if (!PINCODE_REGEX.test(pincode)) return invalid("profilePincode", "Enter a valid 6-digit pincode.")
    if (!profileMarker) {
        showToast("Map is not ready. Please wait and try again.", "error")
        return
    }

    const position = profileMarker.getPosition()
    if (!window.confirm("Changing location may affect delivery distance. Save this location?")) return

    await runBusy("Saving restaurant location...", async () => {
        await updateDoc(restaurantRef, {
            addressLine1,
            addressLine2,
            area,
            city,
            state,
            pincode,
            lat: position.lat(),
            lng: position.lng(),
            updatedAt: Date.now()
        })
        await reloadRestaurant("Restaurant location saved.")
    })
}

async function initProfileMap() {
    try {
        await waitForGoogleMaps()
    } catch {
        const mapBox = document.getElementById("restaurantMap")
        if (mapBox) mapBox.innerHTML = '<div class="page-loading-card">Google Map could not load.</div>'
        return
    }

    if (activeTab !== "profile" || !document.getElementById("restaurantMap")) return

    const center = {
        lat: Number(restaurantData.lat) || 23.0753,
        lng: Number(restaurantData.lng) || 70.1337
    }

    profileGeocoder = new google.maps.Geocoder()
    profileMap = new google.maps.Map(document.getElementById("restaurantMap"), {
        center,
        zoom: 15,
        mapTypeControl: false
    })
    profileMarker = new google.maps.Marker({ position: center, map: profileMap, draggable: true })

    const updateCoordinates = location => {
        const latElement = document.getElementById("profileLatitude")
        const lngElement = document.getElementById("profileLongitude")
        if (latElement) latElement.textContent = location.lat.toFixed(7)
        if (lngElement) lngElement.textContent = location.lng.toFixed(7)
    }

    profileMarker.addListener("dragend", () => {
        const position = profileMarker.getPosition()
        const location = { lat: position.lat(), lng: position.lng() }
        updateCoordinates(location)
        fillProfileAddress(location)
    })

    profileMap.addListener("click", event => {
        const location = { lat: event.latLng.lat(), lng: event.latLng.lng() }
        profileMarker.setPosition(location)
        updateCoordinates(location)
        fillProfileAddress(location)
    })

    const autocomplete = new google.maps.places.Autocomplete(document.getElementById("profileLocationSearch"), {
        componentRestrictions: { country: "in" },
        fields: ["geometry", "formatted_address", "address_components", "name"]
    })

    autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace()
        if (!place.geometry?.location) return
        const location = { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() }
        profileMap.setCenter(location)
        profileMap.setZoom(16)
        profileMarker.setPosition(location)
        updateCoordinates(location)
        applyProfileAddress(place)
    })
}

function waitForGoogleMaps(timeout = 10000) {
    return new Promise((resolve, reject) => {
        const started = Date.now()
        const timer = setInterval(() => {
            if (window.google?.maps?.places) {
                clearInterval(timer)
                resolve()
            } else if (Date.now() - started > timeout) {
                clearInterval(timer)
                reject(new Error("Google Maps timeout"))
            }
        }, 100)
    })
}

function fillProfileAddress(location) {
    profileGeocoder.geocode({ location }, (results, status) => {
        if (status === "OK" && results?.[0]) applyProfileAddress(results[0])
    })
}

function applyProfileAddress(place) {
    const components = place.address_components || []
    const component = (...types) => {
        const found = components.find(item => types.some(type => item.types.includes(type)))
        return found?.long_name || ""
    }

    setValue("profileAddressLine1", place.formatted_address || place.name || "")
    setValue("profileArea", component("sublocality_level_1", "sublocality", "neighborhood", "administrative_area_level_3"))
    setValue("profileCity", component("locality", "postal_town", "administrative_area_level_2"))
    setValue("profileState", component("administrative_area_level_1"))
    setValue("profilePincode", component("postal_code"))
}

async function uploadRestaurantImage(kind) {
    const isLogo = kind === "logo"
    const input = document.getElementById(isLogo ? "profileLogoFile" : "profileBannerFile")
    const file = input?.files[0]
    if (!file) {
        showToast(`Select a ${kind} image first.`, "error")
        return
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        showToast("Select a JPG, PNG or WebP image.", "error")
        return
    }
    if (file.size > IMAGE_MAX_BYTES) {
        showToast("Image must be smaller than 5 MB.", "error")
        return
    }

    await runBusy(`Uploading restaurant ${kind}...`, async () => {
        const converted = await convertImageToWebP(file, isLogo ? 1000 : 1800, isLogo ? 1000 : 1000)
        const path = `restaurant-${isLogo ? "logos" : "banners"}/${restaurantData.restaurantCode}_${kind}.webp`
        const oldPath = restaurantData[`${kind}Path`] || ""
        const fileRef = storageRef(storage, path)
        await uploadBytes(fileRef, converted, { contentType: "image/webp" })
        const url = await getDownloadURL(fileRef)
        await updateDoc(restaurantRef, {
            [`${kind}Url`]: url,
            [`${kind}Path`]: path,
            updatedAt: Date.now()
        })

        if (oldPath && oldPath !== path) {
            await deleteObject(storageRef(storage, oldPath)).catch(() => null)
        }
        await reloadRestaurant(`Restaurant ${kind} updated.`)
    })
}

async function convertImageToWebP(file, maxWidth, maxHeight) {
    const bitmap = await createImageBitmap(file)
    const ratio = Math.min(1, maxWidth / bitmap.width, maxHeight / bitmap.height)
    const canvas = document.createElement("canvas")
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio))
    canvas.height = Math.max(1, Math.round(bitmap.height * ratio))
    const context = canvas.getContext("2d")
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()

    const blob = await new Promise((resolve, reject) => {
        canvas.toBlob(result => result ? resolve(result) : reject(new Error("Image conversion failed.")), "image/webp", 0.86)
    })
    return new File([blob], `${Date.now()}.webp`, { type: "image/webp" })
}

function previewSelectedImage(input, previewId) {
    const file = input.files[0]
    if (!file) return
    const preview = document.getElementById(previewId)
    if (preview) preview.src = URL.createObjectURL(file)
}

async function saveBusinessSettings() {
    const commissionPercent = validNumber("businessCommission", 0, 100, "Enter valid commission between 0 and 100.")
    const packagingFee = validNumber("businessPackagingFee", 0, Infinity, "Enter valid packaging fee.")
    const minimumOrder = validNumber("businessMinimumOrder", 0, Infinity, "Enter valid minimum order.")
    const maxDeliveryDistance = validNumber("businessMaxDistance", 0.1, Infinity, "Enter valid delivery distance.")
    const zone = valueOf("businessZone")
    if ([commissionPercent, packagingFee, minimumOrder, maxDeliveryDistance].some(value => value === null)) return
    if (!window.confirm("Business settings save karni hain? Commission change sirf future orders ke liye hoga.")) return

    await runBusy("Saving business settings...", async () => {
        await updateDoc(restaurantRef, {
            commissionPercent,
            packagingFee,
            minimumOrder,
            maxDeliveryDistance,
            zone,
            updatedAt: Date.now()
        })
        await reloadRestaurant("Business settings saved.")
    })
}

async function saveBankDetails() {
    const bankName = valueOf("bankName")
    const accountHolder = valueOf("bankAccountHolder")
    const accountNumber = valueOf("bankAccountNumber")
    const ifscCode = valueOf("bankIfsc").toUpperCase()
    const upiId = valueOf("bankUpi")
    const anyAccountField = bankName || accountHolder || accountNumber || ifscCode

    if (anyAccountField) {
        if (!bankName) return invalid("bankName", "Enter bank name.")
        if (!accountHolder) return invalid("bankAccountHolder", "Enter account holder name.")
        if (!/^\d{6,24}$/.test(accountNumber)) return invalid("bankAccountNumber", "Enter valid account number.")
        if (!IFSC_REGEX.test(ifscCode)) return invalid("bankIfsc", "Enter valid 11-character IFSC code.")
    }
    if (upiId && !UPI_REGEX.test(upiId)) return invalid("bankUpi", "Enter valid UPI ID.")
    if (!window.confirm("Bank details save karni hain?")) return

    await runBusy("Saving bank details...", async () => {
        await updateDoc(restaurantRef, {
            bankName,
            accountHolder,
            accountNumber,
            ifscCode,
            upiId,
            updatedAt: Date.now()
        })
        await reloadRestaurant("Bank details saved.")
    })
}

function toggleAccountNumber(button) {
    const input = document.getElementById("bankAccountNumber")
    if (!input) return
    input.type = input.type === "password" ? "text" : "password"
    button.textContent = input.type === "password" ? "👁" : "🙈"
}

function viewDocument(kind) {
    const url = restaurantData[`${kind}DocumentUrl`]
    if (url) window.open(url, "_blank", "noopener,noreferrer")
}

async function saveDocumentDetails(kind) {
    const isGst = kind === "gst"
    const number = valueOf(`${kind}Number`)
    const fileInput = document.getElementById(`${kind}File`)
    const file = fileInput?.files[0] || null

    if (!isGst && number && !/^\d{14}$/.test(number)) {
        return invalid("fssaiNumber", "FSSAI number must contain 14 digits.")
    }
    if (file) {
        const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp"]
        if (!allowed.includes(file.type)) {
            showToast("Select PDF, JPG, PNG or WebP document.", "error")
            return
        }
        if (file.size > DOCUMENT_MAX_BYTES) {
            showToast("Document must be smaller than 10 MB.", "error")
            return
        }
    }

    await runBusy(`Saving ${kind.toUpperCase()} details...`, async () => {
        const update = {
            [isGst ? "gstNumber" : "fssaiNumber"]: number,
            updatedAt: Date.now()
        }
        let oldPathToDelete = ""

        if (file) {
            const extension = extensionForMime(file.type)
            const path = `restaurant-${kind}/${restaurantData.restaurantCode}_${kind}.${extension}`
            const oldPath = restaurantData[`${kind}DocumentPath`] || ""
            const fileRef = storageRef(storage, path)
            await uploadBytes(fileRef, file, { contentType: file.type })
            update[`${kind}DocumentUrl`] = await getDownloadURL(fileRef)
            update[`${kind}DocumentPath`] = path
            if (oldPath && oldPath !== path) oldPathToDelete = oldPath
        }

        await updateDoc(restaurantRef, update)
        if (oldPathToDelete) await deleteObject(storageRef(storage, oldPathToDelete)).catch(() => null)
        await reloadRestaurant(`${kind.toUpperCase()} details saved.`)
    })
}

async function removeDocument(kind) {
    if (!window.confirm(`${kind.toUpperCase()} document remove karna hai?`)) return
    const oldPath = restaurantData[`${kind}DocumentPath`] || ""

    await runBusy(`Removing ${kind.toUpperCase()} document...`, async () => {
        await updateDoc(restaurantRef, {
            [`${kind}DocumentUrl`]: "",
            [`${kind}DocumentPath`]: "",
            updatedAt: Date.now()
        })
        if (oldPath) await deleteObject(storageRef(storage, oldPath)).catch(() => null)
        await reloadRestaurant(`${kind.toUpperCase()} document removed.`)
    })
}

async function toggleWebPanelAccess() {
    const enabled = getWebPanelEnabled(restaurantData)

    if (enabled) {
        if (!window.confirm("Restaurant Web Panel access disable karna hai?")) return
        await runBusy("Disabling Web Panel access...", async () => {
            await updateDoc(restaurantRef, {
                webPanelEnabled: false,
                disabledWebUserId: restaurantData.userId || restaurantData.disabledWebUserId || "",
                userId: "",
                updatedAt: Date.now()
            })
            await reloadRestaurant("Web Panel access disabled.")
        })
        return
    }

    if (restaurantData.disabledWebUserId) {
        if (!window.confirm("Existing Web Panel access dobara enable karna hai?")) return
        await runBusy("Enabling Web Panel access...", async () => {
            await updateDoc(restaurantRef, {
                webPanelEnabled: true,
                userId: restaurantData.disabledWebUserId,
                disabledWebUserId: "",
                updatedAt: Date.now()
            })
            await reloadRestaurant("Web Panel access enabled.")
        })
        return
    }

    showEnableWebAccessDialog()
}

function showEnableWebAccessDialog() {
    openDialog(`
        <h2>Enable Restaurant Web Panel</h2>
        <p>Create optional Email/Password access for the Restaurant Web Panel.</p>
        <div class="rd-form-grid">
            <div class="rd-field full"><label for="dialogLoginEmail">Login Email <span class="required">*</span></label><input type="email" id="dialogLoginEmail" value="${escapeAttribute(restaurantData.loginEmail || "")}"></div>
            <div class="rd-field"><label for="dialogPassword">Password <span class="required">*</span></label><input type="password" id="dialogPassword" minlength="8"></div>
            <div class="rd-field"><label for="dialogConfirmPassword">Confirm Password <span class="required">*</span></label><input type="password" id="dialogConfirmPassword" minlength="8"></div>
        </div>
        <div class="rd-card-actions">
            <button type="button" class="rd-btn" data-dialog-action="close">Cancel</button>
            <button type="button" class="rd-btn primary" data-dialog-action="enable-web-access">Enable Access</button>
        </div>
    `)
}

async function createWebPanelAccess() {
    const email = dialogValue("dialogLoginEmail").toLowerCase()
    const password = dialogValue("dialogPassword")
    const confirmPassword = dialogValue("dialogConfirmPassword")

    if (!EMAIL_REGEX.test(email)) {
        showToast("Enter a valid Web Panel login email.", "error")
        return
    }
    if (password.length < 8) {
        showToast("Password must contain at least 8 characters.", "error")
        return
    }
    if (password !== confirmPassword) {
        showToast("Password and Confirm Password do not match.", "error")
        return
    }

    closeDialog()
    let createdUser = null
    await runBusy("Creating Web Panel access...", async () => {
        try {
            const credential = await createUserWithEmailAndPassword(secondaryAuth, email, password)
            createdUser = credential.user
            await updateDoc(restaurantRef, {
                webPanelEnabled: true,
                loginEmail: email,
                userId: credential.user.uid,
                disabledWebUserId: "",
                updatedAt: Date.now()
            })
            await signOut(secondaryAuth)
            await reloadRestaurant("Web Panel access created.")
        } catch (error) {
            if (createdUser) await deleteUser(createdUser).catch(() => null)
            throw error
        }
    })
}

async function resetWebPanelPassword() {
    const email = restaurantData.loginEmail || ""
    if (!EMAIL_REGEX.test(email)) {
        showToast("Valid Web Panel login email is not saved.", "error")
        return
    }
    if (!window.confirm(`Password reset email ${email} par bhejna hai?`)) return

    await runBusy("Sending password reset email...", async () => {
        await sendPasswordResetEmail(secondaryAuth, email)
        showToast("Password reset email sent.", "success")
    })
}

function getWebPanelEnabled(data) {
    if (typeof data.webPanelEnabled === "boolean") return data.webPanelEnabled
    return Boolean(data.userId)
}

function addTimingSlot(row) {
    row?.querySelector(".timing-slots")?.insertAdjacentHTML("beforeend", timingSlotMarkup())
}

function removeTimingSlot(button) {
    const row = button.closest(".timing-day-row")
    const slots = row.querySelectorAll(".timing-slot")
    if (slots.length === 1) {
        slots[0].querySelector(".slot-start").value = ""
        slots[0].querySelector(".slot-end").value = ""
        return
    }
    button.closest(".timing-slot").remove()
}

function setTimingDayOpen(row, open) {
    row.classList.toggle("day-closed", !open)
    row.querySelector(".day-status-text").textContent = open ? "Open" : "Closed"
    row.querySelector('[data-action="add-timing-slot"]').disabled = !open
    if (open && row.querySelectorAll(".timing-slot").length === 0) {
        row.querySelector(".timing-slots").insertAdjacentHTML("beforeend", timingSlotMarkup())
    }
}

function copyMondayTiming() {
    const monday = document.querySelector('.timing-day-row[data-day="Monday"]')
    if (!monday) return
    const open = monday.querySelector(".day-open-toggle").checked
    const slots = [...monday.querySelectorAll(".timing-slot")].map(slot => ({
        start: slot.querySelector(".slot-start").value,
        end: slot.querySelector(".slot-end").value
    }))

    WEEK_DAYS.slice(1).forEach(day => {
        const row = document.querySelector(`.timing-day-row[data-day="${day}"]`)
        row.querySelector(".day-open-toggle").checked = open
        row.querySelector(".timing-slots").innerHTML = `
            <span class="closed-text">Closed</span>
            ${slots.map(slot => timingSlotMarkup(slot.start, slot.end)).join("")}
        `
        setTimingDayOpen(row, open)
    })
    showToast("Monday timing copied to all days.", "success")
}

async function saveWeeklyTiming() {
    let weeklySlots
    try {
        weeklySlots = collectWeeklySlotsFromForm()
    } catch (error) {
        showToast(error.message, "error")
        error.element?.focus()
        return
    }

    await runBusy("Saving weekly timing...", async () => {
        await updateDoc(restaurantRef, {
            weeklySlots,
            updatedAt: Date.now()
        })
        restaurantData.weeklySlots = weeklySlots
        await updateLiveRestaurantStatus(false)
        await reloadRestaurant("Weekly timing saved.")
    })
}

function collectWeeklySlotsFromForm() {
    const result = {}

    WEEK_DAYS.forEach(day => {
        const row = document.querySelector(`.timing-day-row[data-day="${day}"]`)
        const open = row.querySelector(".day-open-toggle").checked
        result[day] = []
        if (!open) return

        row.querySelectorAll(".timing-slot").forEach(slot => {
            const startInput = slot.querySelector(".slot-start")
            const endInput = slot.querySelector(".slot-end")
            const start = startInput.value
            const end = endInput.value
            if (!start || !end) throw timingError(`Enter both start and end time for ${day}.`, !start ? startInput : endInput)
            if (timeToMinutes(end) <= timeToMinutes(start)) throw timingError(`${day} closing time must be after opening time.`, endInput)
            result[day].push({ start, end })
        })

        const sorted = [...result[day]].sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start))
        for (let index = 1; index < sorted.length; index += 1) {
            if (timeToMinutes(sorted[index].start) < timeToMinutes(sorted[index - 1].end)) {
                throw timingError(`${day} time slots cannot overlap.`, row.querySelector(".slot-start"))
            }
        }
    })

    if (!WEEK_DAYS.some(day => result[day].length > 0)) throw new Error("Add at least one weekly timing slot.")
    return result
}

function timingError(message, element) {
    const error = new Error(message)
    error.element = element
    return error
}

function getWeeklySlots(data) {
    const result = Object.fromEntries(WEEK_DAYS.map(day => [day, []]))

    if (data.weeklySlots && typeof data.weeklySlots === "object") {
        WEEK_DAYS.forEach(day => {
            const rawSlots = data.weeklySlots[day] || data.weeklySlots[day.toLowerCase()]
            const slots = Array.isArray(rawSlots) ? rawSlots : []
            result[day] = slots
                .filter(slot => slot?.start && slot?.end)
                .map(slot => ({ start: String(slot.start), end: String(slot.end) }))
        })
        if (WEEK_DAYS.some(day => result[day].length > 0)) return result
    }

    // Compatibility for restaurants created by the earlier Add Restaurant file.
    if (data.weeklyTimings && typeof data.weeklyTimings === "object") {
        WEEK_DAYS.forEach(day => {
            const entry = data.weeklyTimings[day.toLowerCase()] || data.weeklyTimings[day]
            if (entry?.isOpen && Array.isArray(entry.slots)) {
                result[day] = entry.slots
                    .filter(slot => slot?.start && slot?.end)
                    .map(slot => ({ start: String(slot.start), end: String(slot.end) }))
            }
        })
    }
    return result
}

function getTodayName() {
    return ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][new Date().getDay()]
}

function checkRestaurantOpen(slots) {
    const now = new Date()
    const currentMinutes = now.getHours() * 60 + now.getMinutes()

    for (const slot of slots) {
        const startMinutes = timeToMinutes(slot.start)
        const endMinutes = timeToMinutes(slot.end)
        if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) return true
    }
    return false
}

function timeToMinutes(time) {
    const [hours, minutes] = String(time).split(":").map(Number)
    return hours * 60 + minutes
}

function getAvailabilityState(data) {
    const slots = getWeeklySlots(data)[getTodayName()] || []
    const approved = data.status === "APPROVED"
    const manualOnline = data.online === true
    const temporarilyClosed = data.temporaryClosed === true
    const insideTiming = checkRestaurantOpen(slots)
    return {
        approved,
        manualOnline,
        temporarilyClosed,
        insideTiming,
        customerOpen: approved && manualOnline && !temporarilyClosed && insideTiming
    }
}

function getOpeningText(weeklySlots, today, isOpen) {
    const slots = weeklySlots[today] || []
    if (isOpen) return ""

    const now = new Date()
    const currentMinutes = now.getHours() * 60 + now.getMinutes()

    for (const slot of slots) {
        const startMinutes = timeToMinutes(slot.start)
        if (startMinutes > currentMinutes) {
            const difference = startMinutes - currentMinutes
            if (difference <= 60) return `Opening in ${difference} mins`
            return `Opens at ${formatTime12(slot.start)}`
        }
    }

    const orderedDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    const todayIndex = orderedDays.indexOf(today)
    for (let offset = 1; offset <= 7; offset += 1) {
        const nextDay = orderedDays[(todayIndex + offset) % 7]
        const nextSlots = weeklySlots[nextDay] || []
        if (nextSlots.length > 0) return `Opens ${nextDay} ${formatTime12(nextSlots[0].start)}`
    }
    return ""
}

async function updateLiveRestaurantStatus(rerender = true) {
    if (!restaurantData || !restaurantRef) return

    try {
        if (restaurantData.isHoliday) {
            await updateDoc(restaurantRef, { autoOpen: false, liveStatus: "HOLIDAY" })
            restaurantData.autoOpen = false
            restaurantData.liveStatus = "HOLIDAY"
            if (rerender) renderShell()
            return
        }

        const weeklySlots = getWeeklySlots(restaurantData)
        const today = getTodayName()
        const isOpen = checkRestaurantOpen(weeklySlots[today] || [])
        const openingText = getOpeningText(weeklySlots, today, isOpen)

        await updateDoc(restaurantRef, {
            autoOpen: isOpen,
            liveStatus: isOpen ? "OPEN" : "CLOSED",
            openingText
        })

        restaurantData.autoOpen = isOpen
        restaurantData.liveStatus = isOpen ? "OPEN" : "CLOSED"
        restaurantData.openingText = openingText
        if (rerender && ["overview", "access"].includes(activeTab)) renderShell()
    } catch (error) {
        console.error("Auto status update failed", error)
    }
}

function startAutoStatusTimer() {
    if (autoStatusTimer) clearInterval(autoStatusTimer)
    autoStatusTimer = setInterval(() => updateLiveRestaurantStatus(true), 60000)
}

function getCurrentSlotCloseText(slots) {
    const now = new Date()
    const minutes = now.getHours() * 60 + now.getMinutes()
    const slot = slots.find(item => minutes >= timeToMinutes(item.start) && minutes <= timeToMinutes(item.end))
    return slot ? `Next close at ${formatTime12(slot.end)}` : ""
}

function formatTime12(time) {
    const [hourText, minute] = String(time).split(":")
    const hour = Number(hourText)
    const suffix = hour >= 12 ? "PM" : "AM"
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minute} ${suffix}`
}

function showCustomerPreview() {
    const status = getAvailabilityState(restaurantData)
    const logo = safeImageUrl(restaurantData.logoUrl, "https://placehold.co/160x160?text=Logo")
    const banner = safeImageUrl(restaurantData.bannerUrl, "https://placehold.co/600x240?text=Banner")
    openDialog(`
        <h2>Customer App Preview</h2>
        <p>Quick preview of how the restaurant identity and status appear to customers.</p>
        <div class="customer-preview-card">
            <img class="customer-preview-banner" src="${escapeAttribute(banner)}" alt="Restaurant banner">
            <div class="customer-preview-info">
                <img class="customer-preview-logo" src="${escapeAttribute(logo)}" alt="Restaurant logo">
                <div><h3>${escapeHtml(restaurantData.name || restaurantData.restaurantName || "Restaurant")}</h3><p>${escapeHtml(restaurantData.zone || restaurantData.city || "")}</p><strong style="color:${status.customerOpen ? "#16a34a" : "#ef4444"}">${status.customerOpen ? "OPEN" : "CLOSED"}</strong></div>
            </div>
        </div>
        <div class="rd-card-actions"><button type="button" class="rd-btn" data-dialog-action="close">Close</button></div>
    `)
}

function showImageDialog(url, title) {
    openDialog(`
        <h2>${escapeHtml(title || "Image Preview")}</h2>
        <img class="preview-dialog-image" src="${escapeAttribute(safeImageUrl(url, "https://placehold.co/600x400?text=No+Image"))}" alt="Preview">
        <div class="rd-card-actions"><button type="button" class="rd-btn" data-dialog-action="close">Close</button></div>
    `)
}

function openDialog(html) {
    document.getElementById("dialogContent").innerHTML = html
    const overlay = document.getElementById("dialogOverlay")
    overlay.style.display = "flex"
    overlay.setAttribute("aria-hidden", "false")
}

function closeDialog() {
    const overlay = document.getElementById("dialogOverlay")
    overlay.style.display = "none"
    overlay.setAttribute("aria-hidden", "true")
    document.getElementById("dialogContent").innerHTML = ""
}

async function handleDialogClick(event) {
    const button = event.target.closest("[data-dialog-action]")
    if (!button) {
        if (event.target.id === "dialogOverlay") closeDialog()
        return
    }
    if (button.dataset.dialogAction === "close") closeDialog()
    if (button.dataset.dialogAction === "enable-web-access") await createWebPanelAccess()
}

async function runBusy(message, action) {
    if (isBusy) return
    isBusy = true
    setLoading(true, message)
    try {
        await action()
    } catch (error) {
        console.error(error)
        const friendly = error.code === "auth/email-already-in-use"
            ? "This Web Panel email is already registered."
            : error.message || "Something went wrong."
        showToast(friendly, "error")
    } finally {
        setLoading(false)
        isBusy = false
    }
}

function setLoading(show, message = "Saving...") {
    const overlay = document.getElementById("loadingOverlay")
    document.getElementById("loadingText").textContent = message
    overlay.style.display = show ? "flex" : "none"
    overlay.setAttribute("aria-hidden", show ? "false" : "true")
}

function showToast(message, type = "success") {
    const toast = document.getElementById("toast")
    clearTimeout(toastTimer)
    toast.textContent = message
    toast.className = `restaurant-toast show ${type}`
    toastTimer = setTimeout(() => {
        toast.className = "restaurant-toast"
    }, 3500)
}

function requiredValue(id, message) {
    const value = valueOf(id)
    if (!value) {
        invalid(id, message)
        return ""
    }
    return value
}

function valueOf(id) {
    return document.getElementById(id)?.value.trim() || ""
}

function dialogValue(id) {
    return document.getElementById(id)?.value.trim() || ""
}

function setValue(id, value) {
    const input = document.getElementById(id)
    if (input && value) input.value = value
}

function invalid(id, message) {
    const input = document.getElementById(id)
    input?.classList.add("input-error")
    input?.focus()
    showToast(message, "error")
    return false
}

function validNumber(id, minimum, maximum, message) {
    const raw = valueOf(id)
    const number = Number(raw)
    if (raw === "" || !Number.isFinite(number) || number < minimum || number > maximum) {
        invalid(id, message)
        return null
    }
    return number
}

function extensionForMime(type) {
    return {
        "application/pdf": "pdf",
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp"
    }[type] || "bin"
}

function getFileName(path, fallback) {
    if (!path) return fallback
    const name = path.split("/").pop()
    try { return decodeURIComponent(name) } catch { return name }
}

function safeImageUrl(url, fallback) {
    if (typeof url !== "string" || !url.trim()) return fallback
    if (/^(https?:|data:|blob:)/i.test(url)) return url
    return fallback
}

function formatTimestamp(value) {
    if (!value) return "Not Available"
    let date
    if (typeof value?.toDate === "function") date = value.toDate()
    else if (typeof value === "number") date = new Date(value)
    else date = new Date(value)
    if (Number.isNaN(date.getTime())) return "Not Available"
    return date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    })
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;")
}

function escapeAttribute(value) {
    return escapeHtml(value)
}