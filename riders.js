import { db, auth } from "./firebase.js"

import {
    collection,
    doc,
    getDoc,
    onSnapshot,
    updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"

import { signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"

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
const STALE_LOCATION_MS = 5 * 60 * 1000
const DEFAULT_CENTER = [23.0753, 70.1337]

const state = {
    riders: [],
    orders: [],
    selectedOrder: null,
    pickupLocation: null,
    selectedRiderId: "",
    mapOpen: false,
    mapAutoFitted: false
}

let allRidersMap = null
let riderMarkerLayer = null
let pickupMarker = null
let ordersUnsubscribe = null
let toastTimer = null
let busy = false

const elements = {
    ridersTable: document.getElementById("ridersTable"),
    totalRiders: document.getElementById("totalRiders"),
    pendingRiders: document.getElementById("pendingRiders"),
    availableRiders: document.getElementById("availableRiders"),
    busyRiders: document.getElementById("busyRiders"),
    activeDeliveries: document.getElementById("activeDeliveries"),
    offlineRiders: document.getElementById("offlineRiders"),
    riderSearch: document.getElementById("riderSearch"),
    zoneFilter: document.getElementById("zoneFilter"),
    approvalFilter: document.getElementById("approvalFilter"),
    availabilityFilter: document.getElementById("availabilityFilter"),
    riderResultCount: document.getElementById("riderResultCount"),
    trackOverlay: document.getElementById("trackRidersOverlay"),
    urgentOrderSelect: document.getElementById("urgentOrderSelect"),
    trackZoneFilter: document.getElementById("trackZoneFilter"),
    trackStatusFilter: document.getElementById("trackStatusFilter"),
    trackRiderSearch: document.getElementById("trackRiderSearch"),
    trackSummary: document.getElementById("trackSummary"),
    nearbyRidersList: document.getElementById("nearbyRidersList"),
    nearbyRiderCount: document.getElementById("nearbyRiderCount"),
    trackedRiderDetails: document.getElementById("trackedRiderDetails"),
    selectedOrderInfo: document.getElementById("selectedOrderInfo")
}

document.getElementById("logoutBtn")?.addEventListener("click", async () => {
    await signOut(auth)
    window.location.href = "login.html"
})

document.getElementById("trackAllRidersBtn")?.addEventListener("click", () => openTrackAllRiders())
document.getElementById("closeTrackRidersBtn")?.addEventListener("click", closeTrackAllRiders)
document.getElementById("clearFiltersBtn")?.addEventListener("click", clearListFilters)

;[elements.riderSearch, elements.zoneFilter, elements.approvalFilter, elements.availabilityFilter]
    .forEach(input => input?.addEventListener(input.tagName === "INPUT" ? "input" : "change", renderRidersPage))

;[elements.trackZoneFilter, elements.trackStatusFilter]
    .forEach(input => input?.addEventListener("change", () => renderTrackExperience({ fitMap: true })))

elements.trackRiderSearch?.addEventListener("input", () => renderTrackExperience({ fitMap: true }))
elements.urgentOrderSelect?.addEventListener("change", handleUrgentOrderChange)
elements.ridersTable?.addEventListener("click", handleTableAction)
elements.nearbyRidersList?.addEventListener("click", handleTrackAction)
elements.trackedRiderDetails?.addEventListener("click", handleTrackAction)

elements.trackOverlay?.addEventListener("click", event => {
    if (event.target === elements.trackOverlay) closeTrackAllRiders()
})

window.addEventListener("keydown", event => {
    if (event.key === "Escape" && state.mapOpen) closeTrackAllRiders()
})

onSnapshot(
    collection(db, "riders"),
    snapshot => {
        state.riders = snapshot.docs.map(item => ({ id: item.id, ...item.data() }))
        refreshZoneOptions()
        renderRidersPage()
        if (state.mapOpen) renderTrackExperience()
    },
    error => {
        console.error(error)
        elements.ridersTable.innerHTML = `<tr><td colspan="8" class="empty-table">${escapeHtml(error.message || "Riders could not load.")}</td></tr>`
    }
)

function renderRidersPage() {
    renderSummaryCards()
    const riders = getFilteredRiders()
    elements.riderResultCount.textContent = `${riders.length} of ${state.riders.length} riders`

    if (riders.length === 0) {
        elements.ridersTable.innerHTML = '<tr><td colspan="8" class="empty-table">No riders match these filters.</td></tr>'
        return
    }

    elements.ridersTable.innerHTML = riders.map(rider => {
        const status = normalizeStatus(rider.status || "PENDING")
        const activeCount = getRiderActiveOrderCount(rider)
        const availability = getRiderAvailability(rider, activeCount)
        const lastLocation = getRiderLocationDate(rider)
        const code = rider.riderCode || `VGR-${rider.id.slice(0, 6).toUpperCase()}`

        return `
            <tr>
                <td><div class="rider-identity-cell"><span class="rider-avatar">${escapeHtml(initials(rider.name))}</span><div><strong>${escapeHtml(rider.name || "No Name")}</strong><small>${escapeHtml(code)}</small></div></div></td>
                <td><div class="stacked-cell"><span>☎ ${escapeHtml(rider.phone || "No Phone")}</span><small>⌖ ${escapeHtml(rider.zone || "No Zone")}</small></div></td>
                <td><span class="rider-badge ${statusTone(status)}">${escapeHtml(status)}</span>${status === "REJECTED" && rider.rejectionReason ? `<small class="reason-text" title="${escapeAttribute(rider.rejectionReason)}">Reason saved</small>` : ""}</td>
                <td><div class="availability-cell"><span class="status-light ${availability.tone}"></span><strong>${availability.label}</strong>${availability.stale ? "<small>Location stale</small>" : ""}</div></td>
                <td><strong>${activeCount}</strong>${activeCount ? "<small class=\"block-note\">Busy</small>" : ""}</td>
                <td><div class="stacked-cell"><span>${escapeHtml(String(rider.totalDeliveries || 0))} deliveries</span><small>₹${money(rider.earnings || rider.totalEarnings || 0)}</small></div></td>
                <td>${lastLocation ? `<div class="stacked-cell"><span>${escapeHtml(relativeTime(lastLocation))}</span><small>${hasValidLocation(rider) ? "Location available" : "No coordinates"}</small></div>` : '<span class="muted">Not available</span>'}</td>
                <td><div class="rider-row-actions">${renderRiderActions(rider, status, availability)}</div></td>
            </tr>
        `
    }).join("")
}

function renderSummaryCards() {
    const total = state.riders.length
    let pending = 0
    let available = 0
    let busyCount = 0
    let offline = 0
    let activeDeliveries = 0

    state.riders.forEach(rider => {
        const status = normalizeStatus(rider.status || "PENDING")
        const active = getRiderActiveOrderCount(rider)
        activeDeliveries += active
        if (status === "PENDING") pending += 1
        if (rider.online === true && status === "APPROVED" && active === 0) available += 1
        if (rider.online === true && status === "APPROVED" && active > 0) busyCount += 1
        if (rider.online !== true && status === "APPROVED") offline += 1
    })

    elements.totalRiders.textContent = total
    elements.pendingRiders.textContent = pending
    elements.availableRiders.textContent = available
    elements.busyRiders.textContent = busyCount
    elements.activeDeliveries.textContent = activeDeliveries
    elements.offlineRiders.textContent = offline
}

function getFilteredRiders() {
    const search = elements.riderSearch.value.trim().toLowerCase()
    const zone = elements.zoneFilter.value
    const approval = elements.approvalFilter.value
    const availabilityFilter = elements.availabilityFilter.value

    return [...state.riders]
        .filter(rider => {
            const status = normalizeStatus(rider.status || "PENDING")
            const availability = getRiderAvailability(rider, getRiderActiveOrderCount(rider))
            const searchable = `${rider.name || ""} ${rider.phone || ""} ${rider.riderCode || ""}`.toLowerCase()
            if (search && !searchable.includes(search)) return false
            if (zone !== "ALL" && (rider.zone || "") !== zone) return false
            if (approval !== "ALL" && status !== approval) return false
            if (availabilityFilter === "NO_LOCATION" && hasValidLocation(rider)) return false
            if (!["ALL", "NO_LOCATION"].includes(availabilityFilter) && availability.key !== availabilityFilter) return false
            return true
        })
        .sort((a, b) => riderSortWeight(a) - riderSortWeight(b) || String(a.name || "").localeCompare(String(b.name || "")))
}

function riderSortWeight(rider) {
    const status = normalizeStatus(rider.status || "PENDING")
    if (status === "PENDING") return 0
    const availability = getRiderAvailability(rider, getRiderActiveOrderCount(rider)).key
    return { AVAILABLE: 1, BUSY: 2, OFFLINE: 3 }[availability] ?? 4
}

function renderRiderActions(rider, status, availability) {
    const view = actionButton("view", rider.id, "View", "blue")
    if (status === "PENDING") {
        return `${actionButton("approve", rider.id, "Approve", "green")}${actionButton("reject", rider.id, "Reject", "red")}${view}`
    }
    if (status === "APPROVED" && availability.key !== "OFFLINE" && hasValidLocation(rider)) {
        return `${actionButton("track", rider.id, "Track", "green")}${view}`
    }
    return view
}

function actionButton(action, id, label, tone) {
    return `<button type="button" class="mini-action ${tone}" data-action="${action}" data-rider-id="${escapeAttribute(id)}">${label}</button>`
}

async function handleTableAction(event) {
    const button = event.target.closest("[data-action]")
    if (!button || busy) return
    const riderId = button.dataset.riderId
    if (button.dataset.action === "view") window.location.href = `rider-details.html?id=${encodeURIComponent(riderId)}`
    if (button.dataset.action === "track") await openTrackAllRiders(riderId)
    if (button.dataset.action === "approve") await approveRider(riderId)
    if (button.dataset.action === "reject") await rejectRider(riderId)
}

async function approveRider(riderId) {
    const rider = state.riders.find(item => item.id === riderId)
    if (!rider || normalizeStatus(rider.status || "PENDING") !== "PENDING") return
    if (!window.confirm(`${rider.name || "This rider"} ko approve karna hai?`)) return
    await runBusy("Approving rider...", async () => {
        await updateDoc(doc(db, "riders", riderId), {
            status: "APPROVED",
            rejectionReason: "",
            approvedAt: Date.now(),
            updatedAt: Date.now()
        })
        showToast("Rider approved successfully.", "success")
    })
}

async function rejectRider(riderId) {
    const rider = state.riders.find(item => item.id === riderId)
    if (!rider || normalizeStatus(rider.status || "PENDING") !== "PENDING") return
    const reason = window.prompt("Reject reason likhiye (minimum 10 characters):")
    if (reason === null) return
    if (reason.trim().length < 10) {
        showToast("Reject reason must contain at least 10 characters.", "error")
        return
    }
    await runBusy("Rejecting rider...", async () => {
        await updateDoc(doc(db, "riders", riderId), {
            status: "REJECTED",
            online: false,
            rejectionReason: reason.trim(),
            rejectedAt: Date.now(),
            updatedAt: Date.now()
        })
        showToast("Rider application rejected.", "success")
    })
}

function clearListFilters() {
    elements.riderSearch.value = ""
    elements.zoneFilter.value = "ALL"
    elements.approvalFilter.value = "ALL"
    elements.availabilityFilter.value = "ALL"
    renderRidersPage()
}

async function openTrackAllRiders(focusRiderId = "") {
    state.mapOpen = true
    state.mapAutoFitted = false
    state.selectedRiderId = focusRiderId
    elements.trackOverlay.style.display = "flex"
    elements.trackOverlay.setAttribute("aria-hidden", "false")
    document.body.classList.add("modal-open")

    if (!allRidersMap) {
        allRidersMap = L.map("allRidersMap", { zoomControl: true }).setView(DEFAULT_CENTER, 12)
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: "© OpenStreetMap contributors"
        }).addTo(allRidersMap)
        riderMarkerLayer = L.layerGroup().addTo(allRidersMap)
    }

    setTimeout(() => allRidersMap.invalidateSize(), 80)
    subscribeOrdersForTracking()
    renderTrackExperience({ fitMap: true })
    if (focusRiderId) setTimeout(() => focusTrackedRider(focusRiderId), 150)
}

function closeTrackAllRiders() {
    state.mapOpen = false
    state.selectedRiderId = ""
    state.selectedOrder = null
    state.pickupLocation = null
    state.mapAutoFitted = false
    elements.urgentOrderSelect.value = ""
    elements.trackOverlay.style.display = "none"
    elements.trackOverlay.setAttribute("aria-hidden", "true")
    document.body.classList.remove("modal-open")
    if (ordersUnsubscribe) ordersUnsubscribe()
    ordersUnsubscribe = null
    state.orders = []
}

function subscribeOrdersForTracking() {
    if (ordersUnsubscribe) return
    ordersUnsubscribe = onSnapshot(
        collection(db, "orders"),
        snapshot => {
            state.orders = snapshot.docs.map(item => ({ id: item.id, ...item.data() }))
            renderUrgentOrderOptions()
            renderTrackExperience()
        },
        error => {
            console.error(error)
            showToast("Orders could not load. Rider tracking is still available.", "error")
        }
    )
}

function renderUrgentOrderOptions() {
    const currentValue = elements.urgentOrderSelect.value
    const urgentOrders = state.orders
        .filter(order => !TERMINAL_ORDER_STATUSES.has(normalizeStatus(order.status)))
        .sort((a, b) => dateMs(b.createdAt) - dateMs(a.createdAt))

    elements.urgentOrderSelect.innerHTML = '<option value="">Select Urgent Order (Optional)</option>' + urgentOrders.map(order => {
        const restaurant = order.restaurantName || order.restaurant?.name || "Restaurant"
        return `<option value="${escapeAttribute(order.id)}">#${escapeHtml(shortOrderId(order))} · ${escapeHtml(restaurant)} · ${escapeHtml(normalizeStatus(order.status || "PENDING"))}</option>`
    }).join("")
    if (urgentOrders.some(order => order.id === currentValue)) elements.urgentOrderSelect.value = currentValue
}

async function handleUrgentOrderChange() {
    const orderId = elements.urgentOrderSelect.value
    state.selectedOrder = state.orders.find(order => order.id === orderId) || null
    state.pickupLocation = null
    if (state.selectedOrder) state.pickupLocation = await resolvePickupLocation(state.selectedOrder)
    renderTrackExperience({ fitMap: true })
}

async function resolvePickupLocation(order) {
    const direct = firstCoordinatePair([
        [order.restaurantLat, order.restaurantLng],
        [order.pickupLat, order.pickupLng],
        [order.restaurantLocation?.lat, order.restaurantLocation?.lng],
        [order.restaurant?.lat, order.restaurant?.lng]
    ])
    if (direct) return direct
    const restaurantId = order.restaurantId || order.restaurant?.id
    if (!restaurantId) return null
    try {
        const snapshot = await getDoc(doc(db, "restaurants", restaurantId))
        if (!snapshot.exists()) return null
        const restaurant = snapshot.data()
        return firstCoordinatePair([[restaurant.lat, restaurant.lng], [restaurant.location?.lat, restaurant.location?.lng]])
    } catch (error) {
        console.error(error)
        return null
    }
}

function renderTrackExperience({ fitMap = false } = {}) {
    if (!state.mapOpen || !allRidersMap) return
    const riders = getTrackFilteredRiders()
    renderTrackSummary(riders)
    renderTrackedRiderList(riders)
    renderTrackMap(riders, fitMap)
    renderSelectedOrderInfo()
    renderTrackedRiderDetails()
}

function getTrackFilteredRiders() {
    const zone = elements.trackZoneFilter.value
    const filter = elements.trackStatusFilter.value
    const search = elements.trackRiderSearch.value.trim().toLowerCase()

    return state.riders
        .map(rider => {
            const activeCount = getRiderActiveOrderCount(rider)
            const trackState = getRiderTrackState(rider, activeCount)
            const distance = state.pickupLocation && hasValidLocation(rider)
                ? distanceKm(state.pickupLocation.lat, state.pickupLocation.lng, Number(rider.lat), Number(rider.lng))
                : null
            return { rider, activeCount, trackState, distance }
        })
        .filter(item => {
            if (zone !== "ALL" && (item.rider.zone || "") !== zone) return false
            if (filter !== "ALL" && item.trackState.key !== filter) return false
            const searchable = `${item.rider.name || ""} ${item.rider.phone || ""} ${item.rider.riderCode || ""}`.toLowerCase()
            if (search && !searchable.includes(search)) return false
            return true
        })
        .sort((a, b) => trackStateWeight(a.trackState.key) - trackStateWeight(b.trackState.key)
            || nullableNumber(a.distance) - nullableNumber(b.distance)
            || String(a.rider.name || "").localeCompare(String(b.rider.name || "")))
}

function renderTrackSummary(items) {
    const count = key => items.filter(item => item.trackState.key === key).length
    elements.trackSummary.innerHTML = `
        <span><i class="green"></i><strong>${count("AVAILABLE")}</strong> Available</span>
        <span><i class="orange"></i><strong>${count("BUSY")}</strong> Busy</span>
        <span><i class="red"></i><strong>${count("OFFLINE")}</strong> Offline</span>
        <span><i class="gray"></i><strong>${count("STALE")}</strong> Stale</span>
    `
}

function renderTrackedRiderList(items) {
    elements.nearbyRiderCount.textContent = items.length
    if (!items.length) {
        elements.nearbyRidersList.innerHTML = '<div class="empty-state">No riders match these filters.</div>'
        return
    }
    elements.nearbyRidersList.innerHTML = items.map((item, index) => {
        const { rider, trackState, activeCount, distance } = item
        return `
            <button type="button" class="nearby-rider-card ${state.selectedRiderId === rider.id ? "selected" : ""}" data-track-action="select-rider" data-rider-id="${escapeAttribute(rider.id)}">
                <span class="map-rider-avatar">${escapeHtml(initials(rider.name))}</span>
                <span class="nearby-rider-main"><strong>${escapeHtml(rider.name || "No Name")}${index === 0 && trackState.key === "AVAILABLE" && distance !== null ? '<em>RECOMMENDED</em>' : ""}</strong><small><i class="${trackState.tone}"></i>${escapeHtml(trackState.label)} · ${activeCount} active order${activeCount === 1 ? "" : "s"}</small></span>
                <span class="nearby-distance">${distance === null ? "—" : `${distance.toFixed(1)} km`}<small>${hasValidLocation(rider) ? relativeTime(getRiderLocationDate(rider)) : "No location"}</small></span>
            </button>
        `
    }).join("")
}

function renderTrackMap(items, forceFit = false) {
    riderMarkerLayer.clearLayers()
    if (pickupMarker) {
        pickupMarker.remove()
        pickupMarker = null
    }

    const bounds = []
    items.forEach(item => {
        const { rider, trackState, activeCount, distance } = item
        if (!hasValidLocation(rider)) return
        const location = [Number(rider.lat), Number(rider.lng)]
        bounds.push(location)
        const marker = L.marker(location, { icon: riderMapIcon(trackState.tone) }).addTo(riderMarkerLayer)
        marker.bindTooltip(`
            <div class="rider-map-tooltip"><strong>${escapeHtml(rider.name || "No Name")}</strong><span>${escapeHtml(trackState.label)} · ${activeCount} active</span><span>${distance === null ? "Pickup not selected" : `Pickup distance ${distance.toFixed(1)} km`}</span><span>${escapeHtml(locationUpdatedText(rider))}</span></div>
        `, { direction: "top", offset: [0, -16], opacity: 1 })
        marker.on("mouseover", () => marker.openTooltip())
        marker.on("click", () => {
            state.selectedRiderId = rider.id
            renderTrackedRiderList(getTrackFilteredRiders())
            renderTrackedRiderDetails()
        })
        marker.__riderId = rider.id
    })

    if (state.pickupLocation) {
        const pickup = [state.pickupLocation.lat, state.pickupLocation.lng]
        bounds.push(pickup)
        pickupMarker = L.marker(pickup, { icon: pickupMapIcon() }).addTo(allRidersMap).bindTooltip("Urgent order pickup", { permanent: false })
    }

    if (forceFit || !state.mapAutoFitted) {
        if (bounds.length > 1) allRidersMap.fitBounds(bounds, { padding: [42, 42], maxZoom: 15 })
        else if (bounds.length === 1) allRidersMap.setView(bounds[0], 14)
        else allRidersMap.setView(DEFAULT_CENTER, 12)
        state.mapAutoFitted = true
    }
}

function renderSelectedOrderInfo() {
    if (!state.selectedOrder) {
        elements.selectedOrderInfo.innerHTML = "Select an urgent order to compare pickup distance."
        return
    }
    const order = state.selectedOrder
    const restaurant = order.restaurantName || order.restaurant?.name || "Restaurant"
    elements.selectedOrderInfo.innerHTML = `
        <span>Urgent Order</span><strong>#${escapeHtml(shortOrderId(order))}</strong>
        <small>${escapeHtml(restaurant)} · ${escapeHtml(normalizeStatus(order.status || "PENDING"))}</small>
        ${state.pickupLocation ? '<em>Pickup location loaded</em>' : '<em class="warning">Pickup coordinates unavailable</em>'}
    `
}

function renderTrackedRiderDetails() {
    const rider = state.riders.find(item => item.id === state.selectedRiderId)
    if (!rider) {
        elements.trackedRiderDetails.innerHTML = '<div class="empty-state">Click a rider marker or rider card to see details.</div>'
        return
    }
    const activeCount = getRiderActiveOrderCount(rider)
    const trackState = getRiderTrackState(rider, activeCount)
    const distance = state.pickupLocation && hasValidLocation(rider)
        ? distanceKm(state.pickupLocation.lat, state.pickupLocation.lng, Number(rider.lat), Number(rider.lng))
        : null
    const activeOrders = getRiderActiveOrders(rider.id).slice(0, 3)

    elements.trackedRiderDetails.innerHTML = `
        <div class="tracked-profile"><span class="rider-avatar large">${escapeHtml(initials(rider.name))}</span><div><strong>${escapeHtml(rider.name || "No Name")}</strong><small>${escapeHtml(rider.riderCode || rider.id)}</small></div><span class="rider-badge ${trackState.tone}">${escapeHtml(trackState.label)}</span></div>
        <div class="tracked-info-grid"><span>Mobile<strong>${escapeHtml(rider.phone || "-")}</strong></span><span>Zone<strong>${escapeHtml(rider.zone || "-")}</strong></span><span>Active Orders<strong>${activeCount}</strong></span><span>Pickup Distance<strong>${distance === null ? "—" : `${distance.toFixed(1)} km`}</strong></span><span>Last Location<strong>${escapeHtml(locationUpdatedText(rider))}</strong></span><span>Today Deliveries<strong>${escapeHtml(String(rider.todayDeliveries || 0))}</strong></span></div>
        ${activeOrders.length ? `<div class="tracked-active-orders"><strong>Current Orders</strong>${activeOrders.map(order => `<button type="button" data-track-action="open-order" data-order-id="${escapeAttribute(order.id)}"><span>#${escapeHtml(shortOrderId(order))}</span><small>${escapeHtml(normalizeStatus(order.status))}</small></button>`).join("")}</div>` : ""}
        <div class="tracked-actions">
            ${rider.phone ? `<a class="rider-btn" href="tel:${escapeAttribute(rider.phone)}">☎ Call Rider</a>` : ""}
            <button type="button" class="rider-btn" data-track-action="view-rider" data-rider-id="${escapeAttribute(rider.id)}">View Rider</button>
            ${state.selectedOrder ? `<button type="button" class="rider-btn primary" data-track-action="open-order" data-order-id="${escapeAttribute(state.selectedOrder.id)}">Open Order Assignment</button>` : ""}
        </div>
        ${state.selectedOrder ? '<div class="safe-assignment-note">Assignment is completed from Order Details so the existing rider request/accept logic remains unchanged.</div>' : ""}
    `
}

function handleTrackAction(event) {
    const target = event.target.closest("[data-track-action]")
    if (!target) return
    const action = target.dataset.trackAction
    if (action === "select-rider") {
        state.selectedRiderId = target.dataset.riderId
        renderTrackedRiderList(getTrackFilteredRiders())
        renderTrackedRiderDetails()
        focusTrackedRider(state.selectedRiderId)
    }
    if (action === "view-rider") window.location.href = `rider-details.html?id=${encodeURIComponent(target.dataset.riderId)}`
    if (action === "open-order") window.location.href = `order-details.html?id=${encodeURIComponent(target.dataset.orderId)}`
}

function focusTrackedRider(riderId) {
    const rider = state.riders.find(item => item.id === riderId)
    if (rider && hasValidLocation(rider)) allRidersMap.setView([Number(rider.lat), Number(rider.lng)], 16)
    renderTrackedRiderDetails()
}

function refreshZoneOptions() {
    const zones = [...new Set(state.riders.map(rider => rider.zone).filter(Boolean))].sort()
    const listValue = elements.zoneFilter.value || "ALL"
    const trackValue = elements.trackZoneFilter.value || "ALL"
    const options = '<option value="ALL">All Zones</option>' + zones.map(zone => `<option value="${escapeAttribute(zone)}">${escapeHtml(zone)}</option>`).join("")
    elements.zoneFilter.innerHTML = options
    elements.trackZoneFilter.innerHTML = options
    if (["ALL", ...zones].includes(listValue)) elements.zoneFilter.value = listValue
    if (["ALL", ...zones].includes(trackValue)) elements.trackZoneFilter.value = trackValue
}

function getRiderAvailability(rider, activeCount) {
    const locationDate = getRiderLocationDate(rider)
    const stale = Boolean(locationDate && Date.now() - locationDate.getTime() > STALE_LOCATION_MS)
    if (rider.online !== true) return { key: "OFFLINE", label: "OFFLINE", tone: "red", stale }
    if (activeCount > 0) return { key: "BUSY", label: "ONLINE · BUSY", tone: "orange", stale }
    return { key: "AVAILABLE", label: "ONLINE · AVAILABLE", tone: "green", stale }
}

function getRiderTrackState(rider, activeCount) {
    const status = normalizeStatus(rider.status || "PENDING")
    const locationDate = getRiderLocationDate(rider)
    const stale = Boolean(locationDate && Date.now() - locationDate.getTime() > STALE_LOCATION_MS)
    if (status !== "APPROVED") return { key: "STALE", label: status, tone: "gray" }
    if (stale) return { key: "STALE", label: "LOCATION STALE", tone: "gray" }
    if (rider.online !== true) return { key: "OFFLINE", label: "OFFLINE", tone: "red" }
    if (activeCount > 0) return { key: "BUSY", label: "ONLINE · BUSY", tone: "orange" }
    return { key: "AVAILABLE", label: "ONLINE · AVAILABLE", tone: "green" }
}

function getRiderActiveOrderIds(rider) {
    const ids = []
    if (rider.activeOrderId) ids.push(String(rider.activeOrderId))
    if (Array.isArray(rider.activeOrderIds)) ids.push(...rider.activeOrderIds.map(String))
    if (Array.isArray(rider.activeOrders)) {
        ids.push(...rider.activeOrders.map(item => typeof item === "string" ? item : item?.orderId || item?.id).filter(Boolean).map(String))
    }
    return [...new Set(ids)]
}

function getRiderActiveOrderCount(rider) {
    const ids = getRiderActiveOrderIds(rider)
    const orderCount = state.orders.length ? getRiderActiveOrders(rider.id).length : 0
    const storedCount = Number(rider.activeOrderCount || rider.activeDeliveries || 0)
    return Math.max(ids.length, orderCount, Number.isFinite(storedCount) ? storedCount : 0)
}

function getRiderActiveOrders(riderId) {
    const rider = state.riders.find(item => item.id === riderId)
    const storedIds = new Set(rider ? getRiderActiveOrderIds(rider) : [])
    return state.orders.filter(order => {
        if (TERMINAL_ORDER_STATUSES.has(normalizeStatus(order.status))) return false
        return storedIds.has(order.id) || orderBelongsToRider(order, riderId)
    })
}

function orderBelongsToRider(order, riderId) {
    const direct = [
        order.riderId,
        order.assignedRiderId,
        order.riderUid,
        order.deliveryPartnerId,
        order.rider?.id,
        order.assignedRider?.id
    ].filter(Boolean).map(String)
    if (direct.includes(String(riderId))) return true
    const arrays = [order.riderIds, order.assignedRiderIds].filter(Array.isArray).flat().map(String)
    return arrays.includes(String(riderId))
}

function getRiderLocationDate(rider) {
    return toDate(
        rider.locationUpdatedAt
        || rider.lastLocationUpdate
        || rider.lastLocationAt
        || rider.lastSeenAt
        || rider.locationTimestamp
    )
}

function locationUpdatedText(rider) {
    const date = getRiderLocationDate(rider)
    if (!hasValidLocation(rider)) return "Location unavailable"
    return date ? `Updated ${relativeTime(date)}` : "Update time unavailable"
}

function hasValidLocation(rider) {
    const lat = Number(rider.lat)
    const lng = Number(rider.lng)
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

function riderMapIcon(tone) {
    return L.divIcon({
        className: "rider-div-icon",
        html: `<span class="map-bike-pin ${tone}"><b>🛵</b></span>`,
        iconSize: [42, 42],
        iconAnchor: [21, 21]
    })
}

function pickupMapIcon() {
    return L.divIcon({
        className: "rider-div-icon",
        html: '<span class="map-bike-pin purple"><b>🍽</b></span>',
        iconSize: [42, 42],
        iconAnchor: [21, 21]
    })
}

function distanceKm(lat1, lng1, lat2, lng2) {
    const radius = 6371
    const dLat = degreesToRadians(lat2 - lat1)
    const dLng = degreesToRadians(lng2 - lng1)
    const a = Math.sin(dLat / 2) ** 2
        + Math.cos(degreesToRadians(lat1)) * Math.cos(degreesToRadians(lat2)) * Math.sin(dLng / 2) ** 2
    return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function degreesToRadians(degrees) {
    return degrees * Math.PI / 180
}

function trackStateWeight(key) {
    return { AVAILABLE: 0, BUSY: 1, OFFLINE: 2, STALE: 3 }[key] ?? 4
}

function nullableNumber(value) {
    return value === null || !Number.isFinite(value) ? Number.MAX_SAFE_INTEGER : value
}

function normalizeStatus(value) {
    return String(value || "").trim().toUpperCase().replaceAll(" ", "_")
}

function statusTone(status) {
    return { APPROVED: "green", PENDING: "orange", REJECTED: "red", SUSPENDED: "gray" }[status] || "gray"
}

function initials(name) {
    const parts = String(name || "R").trim().split(/\s+/).filter(Boolean)
    return parts.slice(0, 2).map(part => part[0].toUpperCase()).join("") || "R"
}

function shortOrderId(order) {
    return String(order.orderId || order.orderCode || order.id || "").replace(/^#/, "").slice(-10).toUpperCase()
}

function money(value) {
    return Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })
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