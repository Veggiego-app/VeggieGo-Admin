import { db, auth, storage } from "./firebase.js"

import {
    collection,
    doc,
    getDocs,
    onSnapshot,
    query,
    updateDoc,
    where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"

import {
    deleteObject,
    getDownloadURL,
    ref as storageRef,
    uploadBytes
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js"

import { signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"

const params = new URLSearchParams(window.location.search)
const riderId = params.get("id")
const root = document.getElementById("riderDetailsRoot")
const riderRef = riderId ? doc(db, "riders", riderId) : null

const ACTIVE_ORDER_STATUSES = new Set([
    "RESTAURANT_PENDING",
    "ACCEPTED",
    "PREPARING",
    "READY",
    "READY_FOR_PICKUP",
    "RIDER_ASSIGNED",
    "REACHED_RESTAURANT",
    "PICKED_UP",
    "OUT_FOR_DELIVERY"
])

const TERMINAL_ORDER_STATUSES = new Set(["DELIVERED", "COMPLETED", "CANCELLED", "CANCELED", "REJECTED"])
const MOBILE_REGEX = /^[6-9]\d{9}$/
const VEHICLE_REGEX = /^[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{4}$/
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/
const UPI_REGEX = /^[a-zA-Z0-9._-]{2,}@[a-zA-Z]{2,}$/
const FILE_MAX_BYTES = 10 * 1024 * 1024
const STALE_LOCATION_MS = 5 * 60 * 1000
const DEFAULT_CENTER = [23.0753, 70.1337]

const DOCUMENT_CONFIG = {
    profile: { label: "Profile Photo", url: "profilePhotoUrl", path: "profilePhotoPath", accept: ["image/jpeg", "image/png", "image/webp"] },
    license: { label: "Driving Licence", url: "licenseDocumentUrl", path: "licenseDocumentPath", accept: ["application/pdf", "image/jpeg", "image/png", "image/webp"] },
    aadhaar: { label: "Aadhaar Card", url: "aadhaarDocumentUrl", path: "aadhaarDocumentPath", accept: ["application/pdf", "image/jpeg", "image/png", "image/webp"] },
    pan: { label: "PAN Card", url: "panDocumentUrl", path: "panDocumentPath", accept: ["application/pdf", "image/jpeg", "image/png", "image/webp"] }
}

let riderData = null
let allOrders = []
let riderOrders = []
let activeTab = "overview"
let riderMap = null
let riderMarker = null
let mapOrderLayer = null
let toastTimer = null
let busy = false
let ordersLoaded = false

document.getElementById("logoutBtn")?.addEventListener("click", async () => {
    await signOut(auth)
    window.location.href = "login.html"
})

root.addEventListener("click", handleRootClick)
root.addEventListener("input", handleRootInput)
root.addEventListener("change", handleRootChange)
document.getElementById("riderDialogOverlay")?.addEventListener("click", handleDialogClick)

if (!riderRef) {
    root.innerHTML = '<div class="rider-page-loading error">Rider ID is missing.</div>'
} else {
    subscribeRider()
    subscribeRiderOrders()
}

function subscribeRider() {
    onSnapshot(riderRef, snapshot => {
        if (!snapshot.exists()) {
            root.innerHTML = '<div class="rider-page-loading error">Rider not found.</div>'
            return
        }
        riderData = { id: snapshot.id, ...snapshot.data() }
        if (ordersLoaded) refreshRiderOrders()
        renderShell()
    }, error => {
        console.error(error)
        root.innerHTML = `<div class="rider-page-loading error">${escapeHtml(error.message || "Rider could not load.")}</div>`
    })
}

function subscribeRiderOrders() {
    onSnapshot(collection(db, "orders"), snapshot => {
        allOrders = snapshot.docs.map(item => ({ id: item.id, ...item.data() }))
        ordersLoaded = true
        refreshRiderOrders()
        if (riderData) renderShell()
    }, error => {
        console.error(error)
        ordersLoaded = true
        if (riderData) renderShell()
        showToast("Order history could not load. Rider profile is still available.", "error")
    })
}

function refreshRiderOrders() {
    riderOrders = allOrders.filter(order => orderBelongsToRider(order, riderId))
}

function renderShell() {
    if (!riderData) return
    const status = normalizeStatus(riderData.status || "PENDING")
    const activeOrders = getActiveOrders()
    const availability = getAvailability(activeOrders.length)
    const name = riderData.name || "Rider"
    const code = riderData.riderCode || `VGR-${riderId.slice(0, 6).toUpperCase()}`
    const photo = safeImageUrl(riderData.profilePhotoUrl)

    root.innerHTML = `
        <button type="button" class="rider-back-link" data-action="back-riders">← Riders</button>
        <header class="rider-detail-header">
            <div class="rider-detail-identity">
                ${photo ? `<img class="rider-detail-avatar" src="${escapeAttribute(photo)}" alt="Rider profile">` : `<span class="rider-detail-avatar fallback">${escapeHtml(initials(name))}</span>`}
                <div><h1>${escapeHtml(name)}</h1><div class="rider-detail-code">${escapeHtml(code)}</div><div class="rider-detail-badges"><span class="rider-badge ${statusTone(status)}">${escapeHtml(status)}</span><span class="rider-badge ${availability.tone}">${escapeHtml(availability.label)}</span>${availability.stale ? '<span class="rider-badge gray">LOCATION STALE</span>' : ""}<span class="rider-badge gray">⌖ ${escapeHtml(riderData.zone || "No Zone")}</span></div></div>
            </div>
            <div class="rider-detail-actions">
                ${riderData.phone ? `<a class="rider-btn" href="tel:${escapeAttribute(riderData.phone)}">☎ Call Rider</a>` : ""}
                <button type="button" class="rider-btn" data-action="track-live">⌖ Track Live</button>
                ${status === "PENDING" ? '<button type="button" class="rider-btn green-outline" data-action="approve-rider">Approve</button><button type="button" class="rider-btn red-outline" data-action="reject-rider">Reject</button>' : ""}
                ${status === "APPROVED" ? '<button type="button" class="rider-btn red" data-action="suspend-rider">⏸ Suspend Rider</button>' : ""}
                ${status === "SUSPENDED" || status === "REJECTED" ? '<button type="button" class="rider-btn green" data-action="reactivate-rider">Reactivate Rider</button>' : ""}
            </div>
        </header>
        <nav class="rider-detail-tabs" aria-label="Rider detail sections">
            ${tabButton("overview", "Overview")}
            ${tabButton("profile", "Profile & KYC")}
            ${tabButton("tracking", "Live Tracking")}
            ${tabButton("orders", "Orders & Performance")}
            ${tabButton("earnings", "Earnings & Settlement")}
        </nav>
        <section id="riderTabContent" class="rider-tab-content"></section>
    `
    renderActiveTab()
}

function tabButton(tab, label) {
    return `<button type="button" class="rider-detail-tab ${activeTab === tab ? "active" : ""}" data-tab="${tab}">${label}</button>`
}

function activateTab(tab) {
    activeTab = tab
    root.querySelectorAll("[data-tab]").forEach(button => button.classList.toggle("active", button.dataset.tab === tab))
    renderActiveTab()
}

function renderActiveTab() {
    const content = document.getElementById("riderTabContent")
    if (!content || !riderData) return
    if (riderMap) {
        riderMap.remove()
        riderMap = null
        riderMarker = null
        mapOrderLayer = null
    }

    if (activeTab === "overview") content.innerHTML = renderOverview()
    if (activeTab === "profile") content.innerHTML = renderProfile()
    if (activeTab === "tracking") {
        content.innerHTML = renderTracking()
        setTimeout(initTrackingMap, 0)
    }
    if (activeTab === "orders") content.innerHTML = renderOrders()
    if (activeTab === "earnings") content.innerHTML = renderEarnings()
}

function renderOverview() {
    const activeOrders = getActiveOrders()
    const protectedActiveCount = Math.max(activeOrders.length, getStoredActiveOrderIds().length)
    const todayOrders = getTodayOrders()
    const deliveredToday = todayOrders.filter(order => normalizeStatus(order.status) === "DELIVERED")
    const todayEarnings = sumOrders(deliveredToday)
    const monthOrders = getMonthOrders()
    const acceptedCount = monthOrders.filter(order => !["REJECTED", "CANCELLED"].includes(normalizeStatus(order.status))).length
    const completedCount = monthOrders.filter(order => normalizeStatus(order.status) === "DELIVERED").length
    const acceptanceRate = Number(riderData.acceptanceRate ?? percentage(acceptedCount, monthOrders.length))
    const completionRate = Number(riderData.completionRate ?? percentage(completedCount, acceptedCount))
    const averageTime = Number(riderData.averageDeliveryMinutes || riderData.avgDeliveryMinutes || 0)
    const availability = getAvailability(activeOrders.length)

    return `
        <section class="rider-stat-grid five">
            ${statCard("Today Deliveries", deliveredToday.length || riderData.todayDeliveries || 0, "▣", "purple")}
            ${statCard("Active Orders", activeOrders.length || getStoredActiveOrderIds().length, "▤", "blue")}
            ${statCard("Today Earnings", `₹${money(todayEarnings || riderData.todayEarnings || 0)}`, "₹", "green")}
            ${statCard("Pending Settlement", `₹${money(riderData.pendingSettlement || riderData.pendingPayout || 0)}`, "▱", "orange")}
            ${statCard("COD With Rider", `₹${money(riderData.codWithRider || riderData.codCash || 0)}`, "▣", "purple")}
        </section>
        <div class="rider-detail-grid two overview-main-grid">
            <article class="rider-panel">
                <div class="rider-panel-title"><h2>Current Delivery Activity</h2><span class="rider-badge ${activeOrders.length ? "green" : "gray"}">${activeOrders.length} Active</span></div>
                ${activeOrders.length ? `<div class="active-order-list">${activeOrders.map(order => activeOrderRow(order)).join("")}</div>` : '<div class="empty-state">No active delivery assigned to this rider.</div>'}
            </article>
            <article class="rider-panel">
                <div class="rider-panel-title"><h2>Rider Availability</h2></div>
                <div class="rider-info-list">
                    ${infoRow("App Status", riderData.online === true ? "Online" : "Offline", riderData.online === true ? "green-text" : "red-text")}
                    ${infoRow("Work Status", availability.label, availability.tone === "orange" ? "orange-text" : "")}
                    ${infoRow("Last Online", formatDateTime(riderData.lastOnlineAt || riderData.lastSeenAt))}
                    ${infoRow("Last Location", locationUpdatedText())}
                    ${infoRow("Location Accuracy", riderData.locationAccuracy ? `${riderData.locationAccuracy} m` : "Not available")}
                </div>
            </article>
        </div>
        <div class="rider-detail-grid two">
            <article class="rider-panel">
                <div class="rider-panel-title"><h2>Performance (This Month)</h2></div>
                <div class="performance-grid">
                    ${performanceCard("Acceptance Rate", `${acceptanceRate}%`, "purple")}
                    ${performanceCard("Completion Rate", `${completionRate}%`, "blue")}
                    ${performanceCard("Average Delivery", averageTime ? `${averageTime} min` : "No data", "orange")}
                </div>
            </article>
            <article class="rider-panel">
                <div class="rider-panel-title"><h2>Rider Controls</h2></div>
                ${protectedActiveCount ? '<div class="rider-warning">⚠ Force Offline and Suspend are disabled while active deliveries exist.</div>' : '<div class="rider-success">✓ Rider has no active delivery. Administrative controls are available.</div>'}
                <div class="rider-panel-actions"><button type="button" class="rider-btn red-outline" data-action="force-offline" ${protectedActiveCount ? "disabled" : ""}>Force Offline</button><button type="button" class="rider-btn" data-action="view-activity-log">View Activity Summary</button></div>
            </article>
        </div>
    `
}

function statCard(label, value, icon, tone) {
    return `<article class="rider-stat-card"><span class="rider-stat-icon ${tone}">${icon}</span><div><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}</strong></div></article>`
}

function activeOrderRow(order) {
    const pickup = order.restaurantName || order.restaurant?.name || "Restaurant"
    const drop = order.customerArea || order.deliveryArea || order.area || "Customer"
    return `
        <div class="active-order-row"><div><strong>#${escapeHtml(shortOrderId(order))}</strong><small>${escapeHtml(formatDateTime(order.createdAt))}</small></div><div><span>${escapeHtml(pickup)} → ${escapeHtml(drop)}</span></div><span class="rider-badge ${orderStatusTone(order.status)}">${escapeHtml(normalizeStatus(order.status))}</span><strong>₹${money(orderRiderEarning(order))}</strong><button type="button" class="rider-btn small" data-action="view-order" data-order-id="${escapeAttribute(order.id)}">View Order</button></div>
    `
}

function infoRow(label, value, className = "") {
    return `<div><span>${escapeHtml(label)}</span><strong class="${className}">${escapeHtml(String(value))}</strong></div>`
}

function performanceCard(label, value, tone) {
    return `<div class="performance-card"><span class="performance-icon ${tone}">✓</span><div><small>${escapeHtml(label)}</small><strong>${escapeHtml(value)}</strong></div></div>`
}

function renderProfile() {
    const code = riderData.riderCode || `VGR-${riderId.slice(0, 6).toUpperCase()}`
    const complete = getKycChecklist()
    return `
        <div class="mobile-change-warning">⚠ Changing the mobile number will change this rider's Rider App OTP login.</div>
        <div class="rider-detail-grid two profile-grid">
            <article class="rider-panel">
                <div class="rider-panel-title"><h2>👤 Personal Information</h2></div>
                <div class="rider-form-grid">
                    ${inputField("Rider Name", "editRiderName", riderData.name || "", true)}
                    ${inputField("Login Mobile", "editRiderPhone", riderData.phone || "", true, "tel", 'inputmode="numeric" maxlength="10"')}
                    ${selectField("Zone", "editRiderZone", zoneOptions(riderData.zone), true)}
                    ${inputField("Emergency Contact", "editEmergencyContact", riderData.emergencyContact || "", false, "tel", 'inputmode="numeric" maxlength="10"')}
                    ${inputField("Rider Code", "editRiderCode", code, false, "text", "readonly")}
                    ${inputField("Joining Date", "editJoiningDate", dateInputValue(riderData.joiningDate || riderData.createdAt), false, "date")}
                </div>
            </article>
            <article class="rider-panel">
                <div class="rider-panel-title"><h2>🛵 Vehicle Information</h2></div>
                <div class="rider-form-grid">
                    ${selectField("Vehicle Type", "editVehicleType", vehicleOptions(riderData.vehicleType), true)}
                    ${inputField("Vehicle Number", "editVehicleNumber", riderData.vehicleNumber || "", true)}
                    ${inputField("Driving Licence", "editLicenseNumber", riderData.licenseNumber || "", true)}
                    ${inputField("Licence Expiry", "editLicenseExpiry", dateInputValue(riderData.licenseExpiry), false, "date")}
                    ${inputField("Aadhaar Last 4 Digits", "editAadhaarLast4", riderData.aadhaarLast4 || "", false, "text", 'inputmode="numeric" maxlength="4"')}
                    ${inputField("PAN Last 4 Characters", "editPanLast4", riderData.panLast4 || "", false, "text", 'maxlength="4"')}
                </div>
            </article>
        </div>
        <div class="rider-detail-grid two">
            <article class="rider-panel">
                <div class="rider-panel-title"><h2>▤ KYC Documents</h2></div>
                <div class="kyc-document-list">${Object.keys(DOCUMENT_CONFIG).map(kind => renderKycDocument(kind)).join("")}</div>
            </article>
            <article class="rider-panel verification-card">
                <div class="rider-panel-title"><h2>✓ Verification Checklist</h2></div>
                <div class="verification-layout"><div class="verification-list">${complete.items.map(item => `<div><span class="${item.complete ? "complete" : "pending"}">${item.complete ? "✓" : "!"}</span>${escapeHtml(item.label)}</div>`).join("")}</div><div class="verification-result"><span>${complete.all ? "✓" : "!"}</span><strong class="${complete.all ? "complete" : "pending"}">${complete.all ? "KYC COMPLETE" : "KYC PENDING"}</strong></div></div>
            </article>
        </div>
        <div class="rider-page-actions"><button type="button" class="rider-btn primary" data-action="save-profile">💾 Save Profile & KYC</button></div>
    `
}

function inputField(label, id, value, required = false, type = "text", extra = "") {
    return `<div class="rider-field"><label for="${id}">${escapeHtml(label)} ${required ? '<span class="required">*</span>' : '<span class="optional">(Optional)</span>'}</label><input id="${id}" type="${type}" value="${escapeAttribute(value)}" ${extra}></div>`
}

function selectField(label, id, options, required = false) {
    return `<div class="rider-field"><label for="${id}">${escapeHtml(label)} ${required ? '<span class="required">*</span>' : ""}</label><select id="${id}">${options}</select></div>`
}

function zoneOptions(selected) {
    const zones = ["Gandhidham", "Adipur", "Bhuj", "Rajula"]
    if (selected && !zones.includes(selected)) zones.push(selected)
    return zones.map(zone => `<option value="${escapeAttribute(zone)}" ${zone === selected ? "selected" : ""}>${escapeHtml(zone)}</option>`).join("")
}

function vehicleOptions(selected) {
    const vehicles = ["Bike", "Scooter", "Electric Bike", "Bicycle"]
    if (selected && !vehicles.includes(selected)) vehicles.push(selected)
    return vehicles.map(vehicle => `<option value="${escapeAttribute(vehicle)}" ${vehicle === (selected || "Bike") ? "selected" : ""}>${escapeHtml(vehicle)}</option>`).join("")
}

function renderKycDocument(kind) {
    const config = DOCUMENT_CONFIG[kind]
    const url = riderData[config.url] || ""
    return `<div class="kyc-document-row"><span class="document-kind-icon">${kind === "profile" ? "👤" : "PDF"}</span><div><strong>${escapeHtml(config.label)}</strong><small>${url ? "Uploaded" : "Not uploaded"}</small></div>${url ? `<button type="button" class="rider-btn small" data-action="view-document" data-kind="${kind}">View</button>` : ""}<input type="file" id="${kind}DocumentFile" accept="${config.accept.join(",")}" hidden><button type="button" class="rider-btn small" data-action="choose-document" data-kind="${kind}">${url ? "Replace" : "Upload"}</button></div>`
}

function getKycChecklist() {
    const items = [
        { label: "Mobile Verified", complete: MOBILE_REGEX.test(riderData.phone || "") },
        { label: "Profile Complete", complete: Boolean(riderData.name && riderData.zone) },
        { label: "Vehicle Added", complete: Boolean(riderData.vehicleNumber) },
        { label: "Licence Added", complete: Boolean(riderData.licenseNumber) },
        { label: "Bank Details Added", complete: Boolean(riderData.accountNumber || riderData.upiId) }
    ]
    return { items, all: items.every(item => item.complete) }
}

function renderTracking() {
    const activeOrders = getActiveOrders()
    const hasLocation = hasValidLocation(riderData)
    const stale = isLocationStale()
    return `
        <section class="tracking-status-strip">
            <div><span>Rider Status</span><strong>${riderData.online === true ? "ONLINE" : "OFFLINE"}</strong></div>
            <div><span>Active Orders</span><strong>${activeOrders.length}</strong></div>
            <div><span>Last Update</span><strong>${escapeHtml(locationUpdatedText())}</strong></div>
            <div><span>GPS Accuracy</span><strong>${riderData.locationAccuracy ? `${escapeHtml(String(riderData.locationAccuracy))} m` : "—"}</strong></div>
            <div><span>Tracking</span><strong class="${hasLocation && !stale ? "green-text" : "orange-text"}">${hasLocation ? (stale ? "LAST KNOWN" : "LIVE") : "UNAVAILABLE"}</strong></div>
        </section>
        <div class="tracking-layout">
            <article class="rider-panel map-panel"><div id="riderLiveMap">${hasLocation ? "" : '<div class="map-unavailable">Rider location is not available.</div>'}</div><div class="map-bottom-note">${hasLocation ? (stale ? "Location is stale. Last known location is shown." : "Location is live while the Rider App tracking service is active.") : "No default location is displayed because rider coordinates are missing."}</div></article>
            <aside class="rider-panel tracking-side-card">
                <div class="rider-panel-title"><h2>Rider Location</h2></div>
                <div class="tracking-metrics">${infoRow("Coordinates", hasLocation ? `${Number(riderData.lat).toFixed(6)}, ${Number(riderData.lng).toFixed(6)}` : "Unavailable")}${infoRow("Speed", riderData.speed ? `${riderData.speed} km/h` : "Not available")}${infoRow("Battery", riderData.batteryLevel !== undefined ? `${riderData.batteryLevel}%` : "Not available")}${infoRow("Location Accuracy", riderData.locationAccuracy ? `${riderData.locationAccuracy} m` : "Not available")}</div>
                <div class="tracking-active-title"><strong>Active Orders</strong><span>${activeOrders.length}</span></div>
                <div class="tracking-order-list">${activeOrders.length ? activeOrders.map(order => trackingOrderCard(order)).join("") : '<div class="empty-state">No active orders.</div>'}</div>
                <div class="rider-panel-actions">${hasLocation ? `<a class="rider-btn" target="_blank" rel="noopener" href="https://www.google.com/maps?q=${encodeURIComponent(`${riderData.lat},${riderData.lng}`)}">Open in Google Maps</a>` : ""}</div>
            </aside>
        </div>
    `
}

function trackingOrderCard(order) {
    return `<button type="button" class="tracking-order-card" data-action="view-order" data-order-id="${escapeAttribute(order.id)}"><strong>#${escapeHtml(shortOrderId(order))}<span class="rider-badge ${orderStatusTone(order.status)}">${escapeHtml(normalizeStatus(order.status))}</span></strong><small>${escapeHtml(order.restaurantName || order.restaurant?.name || "Restaurant")} → ${escapeHtml(order.customerArea || order.deliveryArea || "Customer")}</small></button>`
}

function initTrackingMap() {
    const mapElement = document.getElementById("riderLiveMap")
    if (!mapElement || !hasValidLocation(riderData)) return
    const center = [Number(riderData.lat), Number(riderData.lng)]
    riderMap = L.map(mapElement).setView(center, 15)
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap contributors" }).addTo(riderMap)
    riderMarker = L.marker(center, { icon: mapIcon("purple", "🛵") }).addTo(riderMap).bindTooltip(`${escapeHtml(riderData.name || "Rider")} · ${escapeHtml(locationUpdatedText())}`, { permanent: false })
    mapOrderLayer = L.layerGroup().addTo(riderMap)
    const bounds = [center]
    getActiveOrders().forEach(order => {
        const pickup = orderPickup(order)
        const drop = orderDrop(order)
        if (pickup) {
            bounds.push([pickup.lat, pickup.lng])
            L.marker([pickup.lat, pickup.lng], { icon: mapIcon("green", "🍽") }).addTo(mapOrderLayer).bindTooltip(`#${shortOrderId(order)} Pickup`)
        }
        if (drop) {
            bounds.push([drop.lat, drop.lng])
            L.marker([drop.lat, drop.lng], { icon: mapIcon("red", "⌖") }).addTo(mapOrderLayer).bindTooltip(`#${shortOrderId(order)} Drop`)
        }
        const route = [pickup, center && { lat: center[0], lng: center[1] }, drop].filter(Boolean).map(point => [point.lat, point.lng])
        if (route.length > 1) L.polyline(route, { color: "#a855f7", weight: 4, opacity: 0.75, dashArray: "8 8" }).addTo(mapOrderLayer)
    })
    if (bounds.length > 1) riderMap.fitBounds(bounds, { padding: [35, 35], maxZoom: 15 })
    setTimeout(() => riderMap?.invalidateSize(), 80)
}

function mapIcon(tone, content) {
    return L.divIcon({ className: "rider-div-icon", html: `<span class="map-bike-pin ${tone}"><b>${content}</b></span>`, iconSize: [42, 42], iconAnchor: [21, 21] })
}

function orderPickup(order) {
    return firstCoordinatePair([[order.restaurantLat, order.restaurantLng], [order.pickupLat, order.pickupLng], [order.restaurantLocation?.lat, order.restaurantLocation?.lng], [order.restaurant?.lat, order.restaurant?.lng]])
}

function orderDrop(order) {
    return firstCoordinatePair([[order.customerLat, order.customerLng], [order.deliveryLat, order.deliveryLng], [order.dropLat, order.dropLng], [order.deliveryLocation?.lat, order.deliveryLocation?.lng], [order.customerLocation?.lat, order.customerLocation?.lng]])
}

function renderOrders() {
    const activeOrders = getActiveOrders()
    const todayOrders = getTodayOrders()
    const completedToday = todayOrders.filter(order => normalizeStatus(order.status) === "DELIVERED").length
    const cancelled = riderOrders.filter(order => normalizeStatus(order.status) === "CANCELLED").length
    const rejected = Number(riderData.rejectedRequests || riderData.totalRejectedRequests || 0)
    const avgMinutes = Number(riderData.averageDeliveryMinutes || riderData.avgDeliveryMinutes || 0)
    const monthOrders = getMonthOrders()
    const deliveredMonth = monthOrders.filter(order => normalizeStatus(order.status) === "DELIVERED")
    const acceptance = Number(riderData.acceptanceRate ?? percentage(monthOrders.length - rejected, monthOrders.length))
    const completion = Number(riderData.completionRate ?? percentage(deliveredMonth.length, monthOrders.length - rejected))
    const onTime = Number(riderData.onTimeRate ?? 0)

    return `
        <section class="rider-stat-grid five">${statCard("Active Orders", activeOrders.length, "▤", "blue")}${statCard("Completed Today", completedToday, "✓", "green")}${statCard("Cancelled", cancelled, "×", "red")}${statCard("Rejected Requests", rejected, "⊘", "orange")}${statCard("Average Delivery", avgMinutes ? `${avgMinutes} min` : "No data", "◷", "purple")}</section>
        <section class="order-filter-bar"><label><span>⌕</span><input id="orderSearch" placeholder="Search Order ID"></label><select id="orderStatusFilter"><option value="ALL">All Order Statuses</option>${[...new Set(riderOrders.map(order => normalizeStatus(order.status)).filter(Boolean))].sort().map(status => `<option value="${escapeAttribute(status)}">${escapeHtml(status)}</option>`).join("")}</select><select id="orderDateFilter"><option value="ALL">All Dates</option><option value="TODAY">Today</option><option value="MONTH">This Month</option></select><button type="button" class="rider-btn" data-action="clear-order-filters">Clear Filters</button></section>
        <article class="rider-panel order-history-panel"><div class="order-table-scroll"><table class="detail-order-table"><thead><tr><th>Order</th><th>Pickup → Drop</th><th>Timeline</th><th>Distance</th><th>Earning</th><th>Status</th><th>Action</th></tr></thead><tbody id="riderOrdersBody">${renderOrderRows(riderOrders)}</tbody></table></div></article>
        <article class="rider-panel performance-panel"><div class="rider-panel-title"><h2>Performance (This Month)</h2></div><div class="performance-grid four">${metricTile("Acceptance Rate", `${acceptance}%`, "purple")}${metricTile("Completion Rate", `${completion}%`, "blue")}${metricTile("On-time Delivery", onTime ? `${onTime}%` : "No data", "orange")}${metricTile("Average Rating", riderData.rating ? Number(riderData.rating).toFixed(1) : "No data", "green")}</div></article>
    `
}

function renderOrderRows(orders) {
    if (!orders.length) return '<tr><td colspan="7" class="empty-table">No orders found for this rider.</td></tr>'
    return [...orders].sort((a, b) => dateMs(b.createdAt) - dateMs(a.createdAt)).map(order => {
        const pickup = order.restaurantName || order.restaurant?.name || "Restaurant"
        const drop = order.customerArea || order.deliveryArea || order.area || "Customer"
        const assigned = formatTime(order.assignedAt || order.riderAssignedAt)
        const picked = formatTime(order.pickedUpAt || order.pickupAt)
        const delivered = formatTime(order.deliveredAt)
        const timeline = delivered ? `Delivered ${delivered}` : [assigned && `Assigned ${assigned}`, picked && `Picked ${picked}`].filter(Boolean).join(" · ") || "No timeline"
        return `<tr><td><strong>#${escapeHtml(shortOrderId(order))}</strong><small>${escapeHtml(formatDate(order.createdAt))}</small></td><td>${escapeHtml(pickup)} → ${escapeHtml(drop)}</td><td>${escapeHtml(timeline)}</td><td>${escapeHtml(String(order.deliveryDistanceKm || order.distanceKm || order.distance || "—"))}${order.deliveryDistanceKm || order.distanceKm || order.distance ? " km" : ""}</td><td>₹${money(orderRiderEarning(order))}</td><td><span class="rider-badge ${orderStatusTone(order.status)}">${escapeHtml(normalizeStatus(order.status || "PENDING"))}</span></td><td><button type="button" class="rider-btn small" data-action="view-order" data-order-id="${escapeAttribute(order.id)}">View</button></td></tr>`
    }).join("")
}

function metricTile(label, value, tone) {
    return `<div class="metric-tile ${tone}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><div class="metric-bars">${Array.from({ length: 12 }, (_, index) => `<i style="height:${25 + ((index * 17) % 55)}%"></i>`).join("")}</div></div>`
}

function renderEarnings() {
    const todayEarnings = sumOrders(getTodayOrders().filter(order => normalizeStatus(order.status) === "DELIVERED")) || Number(riderData.todayEarnings || 0)
    const weekEarnings = sumOrders(getWeekOrders().filter(order => normalizeStatus(order.status) === "DELIVERED")) || Number(riderData.weekEarnings || 0)
    const monthEarnings = sumOrders(getMonthOrders().filter(order => normalizeStatus(order.status) === "DELIVERED")) || Number(riderData.monthEarnings || 0)
    const pending = Number(riderData.pendingSettlement || riderData.pendingPayout || 0)
    const codWithRider = Number(riderData.codWithRider || riderData.codCash || 0)
    const basePay = Number(riderData.basePayEarnings || riderData.basePayTotal || 0)
    const distancePay = Number(riderData.distancePayEarnings || riderData.distancePayTotal || 0)
    const surge = Number(riderData.surgeEarnings || 0)
    const tips = Number(riderData.tipEarnings || riderData.tips || 0)
    const incentive = Number(riderData.incentive || riderData.incentiveEarnings || 0)
    const penalty = Number(riderData.penalty || riderData.penaltyAmount || 0)
    const net = basePay + distancePay + surge + tips + incentive - penalty || pending
    const settlements = Array.isArray(riderData.settlements) ? riderData.settlements : []

    return `
        <section class="rider-stat-grid five">${statCard("Today Earnings", `₹${money(todayEarnings)}`, "₹", "green")}${statCard("This Week", `₹${money(weekEarnings)}`, "▣", "blue")}${statCard("This Month", `₹${money(monthEarnings)}`, "▣", "purple")}${statCard("Pending Settlement", `₹${money(pending)}`, "▱", "orange")}${statCard("COD With Rider", `₹${money(codWithRider)}`, "▣", "purple")}</section>
        <div class="rider-detail-grid two earnings-upper-grid">
            <article class="rider-panel"><div class="rider-panel-title"><h2>Earning Breakdown</h2></div><div class="earning-breakdown">${earningLine("Base Pay", basePay)}${earningLine("Distance Pay", distancePay)}${earningLine("Surge", surge)}${earningLine("Customer Tips", tips)}${earningLine("Incentive", incentive)}${earningLine("Penalty", -penalty, true)}<div class="earning-total"><span>Net Payable</span><strong>₹${money(net)}</strong></div></div></article>
            <article class="rider-panel"><div class="rider-panel-title"><h2>Bank & UPI Details</h2><span class="rider-badge ${riderData.accountNumber || riderData.upiId ? "green" : "orange"}">${riderData.accountNumber || riderData.upiId ? "DETAILS ADDED" : "PENDING"}</span></div><div class="rider-form-grid">${inputField("Bank Name", "riderBankName", riderData.bankName || "")}${inputField("Account Holder", "riderAccountHolder", riderData.accountHolder || "")}${inputField("Account Number", "riderAccountNumber", riderData.accountNumber || "", false, "password", 'inputmode="numeric"')}${inputField("IFSC", "riderIfsc", riderData.ifscCode || "")}${inputField("UPI ID", "riderUpi", riderData.upiId || "")}</div><div class="rider-panel-actions"><button type="button" class="rider-btn primary" data-action="save-bank">Save Bank Details</button></div></article>
        </div>
        <article class="rider-panel cod-reconciliation"><div><span>COD Collected</span><strong>₹${money(riderData.codCollected || 0)}</strong></div><div><span>COD Deposited</span><strong>₹${money(riderData.codDeposited || 0)}</strong></div><div><span>Cash With Rider</span><strong>₹${money(codWithRider)}</strong></div><button type="button" class="rider-btn" data-action="open-settlement">Record COD Deposit</button></article>
        <article class="rider-panel settlement-panel"><div class="rider-panel-title"><h2>Settlement History</h2><div><button type="button" class="rider-btn" data-action="open-settlement">Add Credit/Debit Adjustment</button><button type="button" class="rider-btn primary" data-action="open-settlement">Create Settlement</button></div></div>${renderSettlements(settlements)}</article>
    `
}

function earningLine(label, amount, negative = false) {
    return `<div><span>${escapeHtml(label)}</span><strong class="${negative && amount ? "red-text" : ""}">${amount < 0 ? "-" : ""}₹${money(Math.abs(amount))}</strong></div>`
}

function renderSettlements(settlements) {
    if (!settlements.length) return '<div class="empty-state">Settlement history is managed from COD Settlement. No embedded rider settlement history found.</div>'
    return `<div class="order-table-scroll"><table class="detail-order-table"><thead><tr><th>Settlement ID</th><th>Period</th><th>Orders</th><th>Gross</th><th>Adjustment</th><th>Paid</th><th>Mode</th><th>Status</th></tr></thead><tbody>${settlements.map(item => `<tr><td>${escapeHtml(item.settlementId || item.id || "-")}</td><td>${escapeHtml(item.period || "-")}</td><td>${escapeHtml(String(item.orderCount || 0))}</td><td>₹${money(item.grossEarning || item.gross || 0)}</td><td>₹${money(item.adjustment || 0)}</td><td>₹${money(item.paidAmount || 0)}</td><td>${escapeHtml(item.paymentMode || "-")}</td><td><span class="rider-badge ${normalizeStatus(item.status) === "PAID" ? "green" : "orange"}">${escapeHtml(normalizeStatus(item.status || "PENDING"))}</span></td></tr>`).join("")}</tbody></table></div>`
}

async function handleRootClick(event) {
    const tab = event.target.closest("[data-tab]")
    if (tab) {
        activateTab(tab.dataset.tab)
        return
    }
    const button = event.target.closest("[data-action]")
    if (!button || busy) return
    const action = button.dataset.action
    if (action === "back-riders") window.location.href = "riders.html"
    if (action === "track-live") activateTab("tracking")
    if (action === "view-order") window.location.href = `order-details.html?id=${encodeURIComponent(button.dataset.orderId)}`
    if (action === "approve-rider") await approveRider()
    if (action === "reject-rider") await rejectRider()
    if (action === "suspend-rider") await suspendRider()
    if (action === "reactivate-rider") await reactivateRider()
    if (action === "force-offline") await forceOffline()
    if (action === "save-profile") await saveProfile()
    if (action === "choose-document") document.getElementById(`${button.dataset.kind}DocumentFile`)?.click()
    if (action === "view-document") viewDocument(button.dataset.kind)
    if (action === "save-bank") await saveBankDetails()
    if (action === "open-settlement") window.location.href = `cod-settlement.html?riderId=${encodeURIComponent(riderId)}`
    if (action === "clear-order-filters") clearOrderFilters()
    if (action === "view-activity-log") showActivityDialog()
}

function handleRootInput(event) {
    if (["editRiderPhone", "editEmergencyContact"].includes(event.target.id)) event.target.value = event.target.value.replace(/\D/g, "").slice(0, 10)
    if (event.target.id === "editAadhaarLast4") event.target.value = event.target.value.replace(/\D/g, "").slice(0, 4)
    if (event.target.id === "editPanLast4") event.target.value = event.target.value.replace(/\s/g, "").toUpperCase().slice(0, 4)
    if (event.target.id === "editVehicleNumber") event.target.value = event.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 12)
    if (event.target.id === "riderAccountNumber") event.target.value = event.target.value.replace(/\D/g, "").slice(0, 24)
    if (event.target.id === "riderIfsc") event.target.value = event.target.value.replace(/\s/g, "").toUpperCase().slice(0, 11)
    if (["orderSearch"].includes(event.target.id)) applyOrderFilters()
}

function handleRootChange(event) {
    if (["orderStatusFilter", "orderDateFilter"].includes(event.target.id)) applyOrderFilters()
    if (event.target.id.endsWith("DocumentFile") && event.target.files[0]) {
        const kind = event.target.id.replace("DocumentFile", "")
        uploadRiderDocument(kind, event.target.files[0])
    }
}

async function approveRider() {
    if (normalizeStatus(riderData.status || "PENDING") !== "PENDING") return
    if (!window.confirm("Rider ko approve karna hai?")) return
    await runBusy("Approving rider...", async () => {
        await updateDoc(riderRef, { status: "APPROVED", rejectionReason: "", approvedAt: Date.now(), updatedAt: Date.now() })
        showToast("Rider approved successfully.")
    })
}

async function rejectRider() {
    if (normalizeStatus(riderData.status || "PENDING") !== "PENDING") return
    const reason = requireReason("Reject reason likhiye (minimum 10 characters):")
    if (!reason) return
    await runBusy("Rejecting rider...", async () => {
        await updateDoc(riderRef, { status: "REJECTED", online: false, rejectionReason: reason, rejectedAt: Date.now(), updatedAt: Date.now() })
        showToast("Rider application rejected.")
    })
}

async function suspendRider() {
    if (getActiveOrders().length || getStoredActiveOrderIds().length) {
        showToast("Active deliveries complete or reassign karne ke baad rider suspend karein.", "error")
        return
    }
    const reason = requireReason("Suspend reason likhiye (minimum 10 characters):")
    if (!reason) return
    await runBusy("Suspending rider...", async () => {
        await updateDoc(riderRef, { status: "SUSPENDED", online: false, suspensionReason: reason, suspendedAt: Date.now(), updatedAt: Date.now() })
        showToast("Rider suspended.")
    })
}

async function reactivateRider() {
    if (!window.confirm("Rider ko APPROVED status ke saath reactivate karna hai?")) return
    await runBusy("Reactivating rider...", async () => {
        await updateDoc(riderRef, { status: "APPROVED", rejectionReason: "", suspensionReason: "", reactivatedAt: Date.now(), updatedAt: Date.now() })
        showToast("Rider reactivated.")
    })
}

async function forceOffline() {
    if (getActiveOrders().length || getStoredActiveOrderIds().length) {
        showToast("Active deliveries ke time Force Offline allowed nahi hai.", "error")
        return
    }
    const reason = requireReason("Force Offline reason likhiye (minimum 10 characters):")
    if (!reason) return
    await runBusy("Forcing rider offline...", async () => {
        await updateDoc(riderRef, { online: false, forceOfflineReason: reason, forcedOfflineAt: Date.now(), updatedAt: Date.now() })
        showToast("Rider forced offline.")
    })
}

function requireReason(message) {
    const reason = window.prompt(message)
    if (reason === null) return ""
    if (reason.trim().length < 10) {
        showToast("Reason must contain at least 10 characters.", "error")
        return ""
    }
    return reason.trim()
}

async function saveProfile() {
    const name = valueOf("editRiderName")
    const phone = valueOf("editRiderPhone")
    const zone = valueOf("editRiderZone")
    const emergencyContact = valueOf("editEmergencyContact")
    const vehicleType = valueOf("editVehicleType")
    const vehicleNumber = valueOf("editVehicleNumber").toUpperCase()
    const licenseNumber = valueOf("editLicenseNumber").toUpperCase()
    const joiningDate = valueOf("editJoiningDate")
    const licenseExpiry = valueOf("editLicenseExpiry")
    const aadhaarLast4 = valueOf("editAadhaarLast4")
    const panLast4 = valueOf("editPanLast4").toUpperCase()

    if (!name) return invalid("editRiderName", "Enter rider name.")
    if (!MOBILE_REGEX.test(phone)) return invalid("editRiderPhone", "Enter valid 10-digit Rider App login mobile.")
    if (emergencyContact && !MOBILE_REGEX.test(emergencyContact)) return invalid("editEmergencyContact", "Enter valid 10-digit emergency contact.")
    if (!zone) return invalid("editRiderZone", "Select rider zone.")
    if (!vehicleNumber || !VEHICLE_REGEX.test(vehicleNumber)) return invalid("editVehicleNumber", "Enter valid vehicle number without spaces, for example GJ12DC4517.")
    if (!licenseNumber) return invalid("editLicenseNumber", "Enter driving licence number.")
    if (aadhaarLast4 && !/^\d{4}$/.test(aadhaarLast4)) return invalid("editAadhaarLast4", "Enter only Aadhaar last 4 digits.")
    if (panLast4 && !/^[A-Z0-9]{4}$/.test(panLast4)) return invalid("editPanLast4", "Enter PAN last 4 characters.")

    if (phone !== (riderData.phone || "")) {
        const unique = await isRiderPhoneUnique(phone)
        if (!unique) return invalid("editRiderPhone", "This mobile number is already used by another rider.")
        if (!window.confirm("This number is used for Rider App OTP login. Change login mobile?")) return
    }

    await runBusy("Saving rider profile...", async () => {
        await updateDoc(riderRef, {
            name,
            phone,
            zone,
            emergencyContact,
            vehicleType,
            vehicleNumber,
            licenseNumber,
            joiningDate,
            licenseExpiry,
            aadhaarLast4,
            panLast4,
            riderCode: riderData.riderCode || `VGR-${riderId.slice(0, 6).toUpperCase()}`,
            updatedAt: Date.now()
        })
        showToast("Rider profile and KYC details saved.")
    })
}

async function isRiderPhoneUnique(phone) {
    const snapshot = await getDocs(query(collection(db, "riders"), where("phone", "==", phone)))
    return snapshot.docs.every(item => item.id === riderId)
}

async function uploadRiderDocument(kind, file) {
    const config = DOCUMENT_CONFIG[kind]
    if (!config || !file) return
    if (!config.accept.includes(file.type)) {
        showToast(`${config.label}: select PDF, JPG, PNG or WebP file.`, "error")
        return
    }
    if (file.size > FILE_MAX_BYTES) {
        showToast(`${config.label} must be smaller than 10 MB.`, "error")
        return
    }
    await runBusy(`Uploading ${config.label}...`, async () => {
        const extension = extensionForMime(file.type)
        const path = `rider-documents/${riderId}/${kind}-${Date.now()}.${extension}`
        const oldPath = riderData[config.path] || ""
        const fileRef = storageRef(storage, path)
        await uploadBytes(fileRef, file, { contentType: file.type })
        const url = await getDownloadURL(fileRef)
        await updateDoc(riderRef, { [config.url]: url, [config.path]: path, updatedAt: Date.now() })
        if (oldPath && oldPath !== path) await deleteObject(storageRef(storage, oldPath)).catch(() => null)
        showToast(`${config.label} uploaded.`)
    })
}

function viewDocument(kind) {
    const config = DOCUMENT_CONFIG[kind]
    const url = config ? riderData[config.url] : ""
    if (url) window.open(url, "_blank", "noopener,noreferrer")
}

async function saveBankDetails() {
    const bankName = valueOf("riderBankName")
    const accountHolder = valueOf("riderAccountHolder")
    const accountNumber = valueOf("riderAccountNumber")
    const ifscCode = valueOf("riderIfsc").toUpperCase()
    const upiId = valueOf("riderUpi")
    const anyAccountField = bankName || accountHolder || accountNumber || ifscCode
    if (anyAccountField) {
        if (!bankName) return invalid("riderBankName", "Enter bank name.")
        if (!accountHolder) return invalid("riderAccountHolder", "Enter account holder name.")
        if (!/^\d{6,24}$/.test(accountNumber)) return invalid("riderAccountNumber", "Enter valid account number.")
        if (!IFSC_REGEX.test(ifscCode)) return invalid("riderIfsc", "Enter valid 11-character IFSC code.")
    }
    if (upiId && !UPI_REGEX.test(upiId)) return invalid("riderUpi", "Enter valid UPI ID.")
    await runBusy("Saving rider bank details...", async () => {
        await updateDoc(riderRef, { bankName, accountHolder, accountNumber, ifscCode, upiId, updatedAt: Date.now() })
        showToast("Rider bank details saved.")
    })
}

function applyOrderFilters() {
    const search = valueOf("orderSearch").toLowerCase()
    const status = valueOf("orderStatusFilter") || "ALL"
    const date = valueOf("orderDateFilter") || "ALL"
    const filtered = riderOrders.filter(order => {
        if (search && !shortOrderId(order).toLowerCase().includes(search.replace(/^#/, ""))) return false
        if (status !== "ALL" && normalizeStatus(order.status) !== status) return false
        if (date === "TODAY" && !isSameDay(toDate(order.createdAt), new Date())) return false
        if (date === "MONTH" && !isSameMonth(toDate(order.createdAt), new Date())) return false
        return true
    })
    const body = document.getElementById("riderOrdersBody")
    if (body) body.innerHTML = renderOrderRows(filtered)
}

function clearOrderFilters() {
    setInputValue("orderSearch", "")
    setInputValue("orderStatusFilter", "ALL")
    setInputValue("orderDateFilter", "ALL")
    applyOrderFilters()
}

function showActivityDialog() {
    const lastLocation = locationUpdatedText()
    openDialog(`<h2>Rider Activity Summary</h2><div class="rider-info-list">${infoRow("Approval Status", normalizeStatus(riderData.status || "PENDING"))}${infoRow("App Status", riderData.online === true ? "Online" : "Offline")}${infoRow("Active Orders", getActiveOrders().length)}${infoRow("Last Location", lastLocation)}${infoRow("Total Deliveries", riderData.totalDeliveries || 0)}${infoRow("Lifetime Earnings", `₹${money(riderData.earnings || riderData.totalEarnings || 0)}`)}</div><div class="rider-panel-actions"><button type="button" class="rider-btn" data-dialog-action="close">Close</button></div>`)
}

function openDialog(html) {
    document.getElementById("riderDialog").innerHTML = html
    const overlay = document.getElementById("riderDialogOverlay")
    overlay.style.display = "flex"
    overlay.setAttribute("aria-hidden", "false")
}

function closeDialog() {
    const overlay = document.getElementById("riderDialogOverlay")
    overlay.style.display = "none"
    overlay.setAttribute("aria-hidden", "true")
}

function handleDialogClick(event) {
    const button = event.target.closest("[data-dialog-action]")
    if (button?.dataset.dialogAction === "close" || event.target.id === "riderDialogOverlay") closeDialog()
}

function getActiveOrders() {
    const storedIds = new Set(getStoredActiveOrderIds())
    return riderOrders.filter(order => {
        const status = normalizeStatus(order.status)
        return !TERMINAL_ORDER_STATUSES.has(status) || storedIds.has(order.id)
    })
}

function getStoredActiveOrderIds() {
    const ids = []
    if (riderData?.activeOrderId) ids.push(String(riderData.activeOrderId))
    if (Array.isArray(riderData?.activeOrderIds)) ids.push(...riderData.activeOrderIds.map(String))
    if (Array.isArray(riderData?.activeOrders)) ids.push(...riderData.activeOrders.map(item => typeof item === "string" ? item : item?.orderId || item?.id).filter(Boolean).map(String))
    return [...new Set(ids)]
}

function orderBelongsToRider(order, id) {
    const direct = [order.riderId, order.assignedRiderId, order.riderUid, order.deliveryPartnerId, order.rider?.id, order.assignedRider?.id].filter(Boolean).map(String)
    if (direct.includes(String(id))) return true
    const arrays = [order.riderIds, order.assignedRiderIds].filter(Array.isArray).flat().map(String)
    if (arrays.includes(String(id))) return true
    return getStoredActiveOrderIds().includes(order.id)
}

function getAvailability(activeCount) {
    const locationDate = getLocationDate()
    const stale = Boolean(locationDate && Date.now() - locationDate.getTime() > STALE_LOCATION_MS)
    if (riderData.online !== true) return { label: "OFFLINE", tone: "red", stale }
    if (activeCount > 0) return { label: "ONLINE · BUSY", tone: "orange", stale }
    return { label: "ONLINE · AVAILABLE", tone: "green", stale }
}

function getTodayOrders() {
    return riderOrders.filter(order => isSameDay(toDate(order.deliveredAt || order.createdAt), new Date()))
}

function getWeekOrders() {
    const now = new Date()
    const start = new Date(now)
    start.setHours(0, 0, 0, 0)
    start.setDate(now.getDate() - 6)
    return riderOrders.filter(order => {
        const date = toDate(order.deliveredAt || order.createdAt)
        return date && date >= start && date <= now
    })
}

function getMonthOrders() {
    return riderOrders.filter(order => isSameMonth(toDate(order.deliveredAt || order.createdAt), new Date()))
}

function sumOrders(orders) {
    return orders.reduce((total, order) => total + orderRiderEarning(order), 0)
}

function orderRiderEarning(order) {
    return Number(order.riderEarning ?? order.riderPay ?? order.riderAmount ?? order.deliveryPartnerEarning ?? 0)
}

function getLocationDate() {
    return toDate(riderData.locationUpdatedAt || riderData.lastLocationUpdate || riderData.lastLocationAt || riderData.locationTimestamp || riderData.lastSeenAt)
}

function locationUpdatedText() {
    if (!hasValidLocation(riderData)) return "Location unavailable"
    const date = getLocationDate()
    return date ? relativeTime(date) : "Update time unavailable"
}

function isLocationStale() {
    const date = getLocationDate()
    return Boolean(date && Date.now() - date.getTime() > STALE_LOCATION_MS)
}

function hasValidLocation(rider) {
    const lat = Number(rider?.lat)
    const lng = Number(rider?.lng)
    return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0)
}

function firstCoordinatePair(pairs) {
    for (const [rawLat, rawLng] of pairs) {
        const lat = Number(rawLat)
        const lng = Number(rawLng)
        if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0)) return { lat, lng }
    }
    return null
}

function normalizeStatus(value) {
    return String(value || "").trim().toUpperCase().replaceAll(" ", "_")
}

function statusTone(status) {
    return { APPROVED: "green", PENDING: "orange", REJECTED: "red", SUSPENDED: "gray" }[status] || "gray"
}

function orderStatusTone(statusValue) {
    const status = normalizeStatus(statusValue)
    if (["DELIVERED", "OUT_FOR_DELIVERY", "ACCEPTED"].includes(status)) return "green"
    if (["PICKED_UP", "READY", "READY_FOR_PICKUP", "PREPARING"].includes(status)) return "blue"
    if (["CANCELLED", "REJECTED"].includes(status)) return "red"
    return "orange"
}

function percentage(part, total) {
    if (!total || total <= 0) return 0
    return Math.round((part / total) * 100)
}

function shortOrderId(order) {
    return String(order.orderId || order.orderCode || order.id || "").replace(/^#/, "").slice(-10).toUpperCase()
}

function initials(name) {
    return String(name || "R").trim().split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase() || "").join("") || "R"
}

function safeImageUrl(url) {
    return typeof url === "string" && /^(https?:|data:|blob:)/i.test(url) ? url : ""
}

function valueOf(id) {
    return document.getElementById(id)?.value.trim() || ""
}

function setInputValue(id, value) {
    const input = document.getElementById(id)
    if (input) input.value = value
}

function invalid(id, message) {
    const input = document.getElementById(id)
    input?.classList.add("input-error")
    input?.focus()
    showToast(message, "error")
    return false
}

function dateInputValue(value) {
    const date = toDate(value)
    if (!date) return ""
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    return local.toISOString().slice(0, 10)
}

function toDate(value) {
    if (!value) return null
    if (typeof value.toDate === "function") return value.toDate()
    if (typeof value === "number") {
        const milliseconds = value < 10_000_000_000 ? value * 1000 : value
        const date = new Date(milliseconds)
        return Number.isNaN(date.getTime()) ? null : date
    }
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
}

function dateMs(value) {
    return toDate(value)?.getTime() || 0
}

function isSameDay(first, second) {
    return Boolean(first && second && first.getFullYear() === second.getFullYear() && first.getMonth() === second.getMonth() && first.getDate() === second.getDate())
}

function isSameMonth(first, second) {
    return Boolean(first && second && first.getFullYear() === second.getFullYear() && first.getMonth() === second.getMonth())
}

function formatDate(value) {
    const date = toDate(value)
    return date ? date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "Not available"
}

function formatTime(value) {
    const date = toDate(value)
    return date ? date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : ""
}

function formatDateTime(value) {
    const date = toDate(value)
    return date ? date.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Not available"
}

function relativeTime(date) {
    if (!date) return "Not available"
    const seconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000))
    if (seconds < 60) return `${seconds} sec ago`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes} min ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours} hr ago`
    return `${Math.floor(hours / 24)} day ago`
}

function money(value) {
    return Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })
}

function extensionForMime(type) {
    return { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[type] || "bin"
}

async function runBusy(message, action) {
    if (busy) return
    busy = true
    setLoading(true, message)
    try {
        await action()
    } catch (error) {
        console.error(error)
        showToast(error.message || "Something went wrong.", "error")
    } finally {
        setLoading(false)
        busy = false
    }
}

function setLoading(show, message = "Updating...") {
    const overlay = document.getElementById("riderLoading")
    document.getElementById("riderLoadingText").textContent = message
    overlay.style.display = show ? "flex" : "none"
    overlay.setAttribute("aria-hidden", show ? "false" : "true")
}

function showToast(message, type = "success") {
    const toast = document.getElementById("riderToast")
    clearTimeout(toastTimer)
    toast.textContent = message
    toast.className = `rider-toast show ${type}`
    toastTimer = setTimeout(() => { toast.className = "rider-toast" }, 3500)
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