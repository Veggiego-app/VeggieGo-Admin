import {
    db,
    auth
}
from "./firebase.js"

import {

    collection,
    query,
    orderBy,
    onSnapshot,
    doc,
    updateDoc,
    getDocs

}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"
// 🔥 GLOBAL

let allOrders = []

let currentFilter = "ALL"
let currentPage = 1

const ORDERS_PER_PAGE = 50

let previousOrderCount = 0
let unreadNotifications = 0
let notifications = []

// 🔥 SOUND

const alertSound =
    document.getElementById(
        "alertSound"
    )

// 🔥 REALTIME ORDERS

const q =
    query(

        collection(
            db,
            "orders"
        ),

        orderBy(
            "timestamp",
            "desc"
        )
    )

onSnapshot(
    q,
    (snapshot) => {

    allOrders =
        snapshot.docs.map(doc => ({

            id: doc.id,

            ...doc.data()
        }))

    // 🔥 NEW ORDER SOUND

    if (

    previousOrderCount !== 0 &&

    allOrders.length >
    previousOrderCount

) {

    alertSound.play()

    .catch(error => {

        console.log(
            "Sound blocked until interaction 😎"
        )
    })

    showLiveNotification()

    updateNotificationCount()

    blinkNotificationBell()
    addNotification(
    allOrders[0]
)
}

    previousOrderCount =
        allOrders.length

    updateDashboard()

    renderOrders()
})

// 🔥 DASHBOARD

function updateDashboard() {

    const pending =
        allOrders.filter(
            o => o.status === "PENDING"
        ).length

    const approved =
        allOrders.filter(
            o => o.status === "APPROVED"
        ).length

    const preparing =
        allOrders.filter(
            o => o.status === "PREPARING"
        ).length

    const readyForPickup =
        allOrders.filter(
            o => o.status === "READY_FOR_PICKUP"
        ).length

    const riderAssigned =
        allOrders.filter(
            o =>
                o.status === "RIDER_ASSIGNED" ||
                o.status === "PICKED_UP"
        ).length

    const onTheWay =
        allOrders.filter(
            o => o.status === "OUT_FOR_DELIVERY"
        ).length

    const completed =
        allOrders.filter(
            o => o.status === "DELIVERED"
        ).length

    const cancelled =
        allOrders.filter(
            o =>

                o.status === "CANCELLED"

                ||

                o.status === "CUSTOMER_CANCELLED"

                ||

                o.status === "RESTAURANT_CANCELLED"
        ).length

    const total =
        allOrders.length

    document.getElementById(
        "pendingOrders"
    ).innerText = pending

    document.getElementById(
        "approvedOrders"
    ).innerText = approved

    document.getElementById(
        "preparingOrders"
    ).innerText = preparing

    document.getElementById(
        "readyForPickup"
    ).innerText = readyForPickup

    document.getElementById(
        "riderAssignedOrders"
    ).innerText = riderAssigned

    document.getElementById(
        "onTheWay"
    ).innerText = onTheWay

    document.getElementById(
        "completedOrders"
    ).innerText = completed

    document.getElementById(
        "cancelledOrders"
    ).innerText = cancelled

    document.getElementById(
        "totalOrders"
    ).innerText = total
}

// 🔥 FILTER

window.setFilter = function(filter) {

    currentFilter =
        filter
        currentPage = 1

    // 🔥 SHOW TABLE

    document
        .getElementById(
            "ordersSection"
        )
        .style.display =
        "block"

    renderOrders()

    // 🔥 SCROLL

    document
        .getElementById(
            "ordersSection"
        )
        
}

// 🔥 RENDER ORDERS

function renderOrders() {

    const tableBody =
    document.getElementById(
        "ordersTableBody"
    )
    tableBody.innerHTML = ""

    let filtered =
        allOrders

    // 🔥 FILTER

    if (
    currentFilter !== "ALL"
) {

    if (
        currentFilter ===
        "CANCELLED"
    ) {

        filtered =
            filtered.filter(

                o =>

                    o.status ===
                    "CANCELLED"

                    ||

                    o.status ===
                    "CUSTOMER_CANCELLED"

                    ||

                    o.status ===
                    "RESTAURANT_CANCELLED"
            )

    } else {

        filtered =
            filtered.filter(

                o =>
                    o.status ===
                    currentFilter
            )
    }
}

    // 🔥 SEARCH

    const search =
        document
            .getElementById(
                "searchInput"
            )
            ?.value
            ?.toLowerCase() || ""

    if (search) {

        filtered =
            filtered.filter(order =>

                (order.customerName || "")
                .toLowerCase()
                .includes(search)

                ||

                (order.restaurantName || "")
                .toLowerCase()
                .includes(search)

                ||

                (order.id || "")
                .toLowerCase()
                .includes(search)
            )
    }

    // 🔥 TABLE

    const startIndex =

    (currentPage - 1)

    * ORDERS_PER_PAGE

const endIndex =

    startIndex +

    ORDERS_PER_PAGE

const paginatedOrders =

    filtered.slice(

        startIndex,

        endIndex

    )
    const totalPages =

    Math.max(
        1,
        Math.ceil(
            filtered.length /
            ORDERS_PER_PAGE
        )
    )

document.getElementById(
    "pageNumber"
).innerText =

`Page ${currentPage} of ${totalPages}`
    const showingFrom =

    filtered.length === 0

    ? 0

    : startIndex + 1

const showingTo =

    Math.min(

        endIndex,

        filtered.length

    )

document.getElementById(
    "ordersCount"
).innerText =

`Showing ${showingFrom} - ${showingTo} of ${filtered.length} Orders`
    paginatedOrders.forEach(order => {

        const row =
            document.createElement("tr")

row.innerHTML = `

<td>

<span
class="order-id-link"

onclick="
window.location.href=
'order-details.html?id=${order.id}'
"
>

${order.orderId || order.id}

</span>

</td>

<td>
${formatDate(order.timestamp)}
</td>

<td>
${order.customerName || "-"}
</td>

<td>
${order.customerPhone || "-"}
</td>

<td>
${order.customerId || "-"}
</td>

<td>
${order.previousOrders || 0}
</td>

<td>
₹${(

    (order.itemTotal || 0)

    +

    (order.deliveryFee || 0)

    +

    (order.surgeFee || 0)

    +

    (order.packagingFee || 0)

    +

    (order.platformFee || 0)

    +

    (order.gstOnItems || 0)

    +

    (order.gstOnDelivery || 0)

    +

    (order.gstOnPackaging || 0)

    +

    (order.gstOnPlatform || 0)

    +

    (order.tip || 0)

    -

    (order.discount || 0)

).toFixed(2)}
</td>

<td>
${order.totalItems || getTotalQty(order.items)}
</td>

<td>

<span
class="status-badge-table"

style="
background:${getColor(order.status)}
"
>

${order.status || "-"}

</span>

</td>

<td>
${order.customerZone || "-"}
</td>

<td>
${order.storeName || order.restaurantName || "-"}
</td>

<td>
${order.storeId || "-"}
</td>

<td>
${order.paymentMethod || "COD"}
</td>

<td>
${formatDate(order.updatedAt)}
</td>

<td>
${order.lastUpdatedBy || "Admin"}
</td>

<td>

<button
class="view-btn"

onclick="
window.location.href=
'order-details.html?id=${order.id}'
"
>

VIEW

</button>

</td>

`

        tableBody.appendChild(row)
    })
}

// 🔥 BUTTON

function button(
    id,
    status,
    color
) {

    return `

        <button

            onclick="
event.stopPropagation();

updateStatus(
    '${id}',
    '${status}'
)
"

            style="
                background:${color}
            "

        >

            ${status}

        </button>
    `
}
async function autoAssignRider(orderId) {

    // 🔥 GET ALL RIDERS

    const ridersSnapshot =

        await getDocs(

            collection(
                db,
                "riders"
            )
        )

    let availableRiders = []

    // 🔥 FILTER RIDERS

    ridersSnapshot.forEach(docSnap => {

        const rider =
            docSnap.data()

        if (

            rider.online === true &&

            rider.status === "APPROVED" &&

            !rider.activeOrderId

        ) {

            availableRiders.push({

                id: docSnap.id,

                ...rider
            })
        }
    })

    // 🔥 NO RIDER

    if (

        availableRiders.length === 0

    ) {

        alert(
            "❌ No Online Rider Available"
        )

        return
    }

    // 🔥 PICK FIRST RIDER

    const selectedRider =
        availableRiders[0]

    // 🔥 UPDATE ORDER

    await updateDoc(

        doc(
            db,
            "orders",
            orderId
        ),

        {

            riderId:
                selectedRider.id,

            riderName:
                selectedRider.name || "",

            riderPhone:
                selectedRider.phone || "",

                riderAssigned: true,

            status:
                "RIDER_ASSIGNED",

            updatedAt:
                Date.now()
        }
    )

    // 🔥 UPDATE RIDER

    await updateDoc(

        doc(
            db,
            "riders",
            selectedRider.id
        ),

        {

            activeOrderId:
                orderId
        }
    )

    alert(
        "🚚 Rider Auto Assigned"
    )
}
// 🔥 UPDATE STATUS

function updateStatus(
    id,
    status
) {

    // 🔥 STOP SOUND

    alertSound.pause()

    alertSound.currentTime = 0

    // 🔥 CANCEL FLOW

    if (

        status ===
        "CANCELLED"

    ) {

        const reason = prompt(

            "Enter Cancel Reason 😎"
        )

        if (

            !reason ||

            reason.trim() === ""

        ) {

            alert(
                "❌ Cancel reason required"
            )

            return
        }

        db.collection("orders")

        .doc(id)

        .update({

            status: "CANCELLED",

            cancelReason:
                reason,

            updatedAt:
                Date.now()
        })

        .then(() => {

            alert(
                "❌ Order Cancelled"
            )
        })

        return
    }

    // 🔥 NORMAL UPDATE

    const updateData = {

        status: status,

        updatedAt:
            Date.now()
    }

    // 🔥 AUTO RIDER

    if (

    status ===
    "READY_FOR_PICKUP"

) {

    autoAssignRider(id)

    return
}

    updateDoc(

    doc(
        db,
        "orders",
        id
    ),

    updateData

)

.then(() => {

        console.log(
            "✅ Status Updated"
        )
    })

    .catch(error => {

        console.log(error)
    })
}

// 🔥 STATUS COLORS

function getColor(status) {

    switch(status) {
      

        case "PENDING":
            return "#FB8C00"

        case "ADMIN_APPROVAL":
            return "#FF9800"

        case "RESTAURANT_PENDING":
            return "#8E24AA"

        case "RESTAURANT_ACCEPTED":
            return "#43A047"

        case "READY_FOR_PICKUP":
            return "#EF6C00"

    case "READY":
    return "#f97316"

    case "PICKED_UP":
    return "#06b6d4"

    case "PICKED UP":
    return "#06b6d4"

        case "RIDER_PENDING":
            return "#3949AB"

        case "RIDER_ACCEPTED":
            return "#1E88E5"

        case "OUT_FOR_DELIVERY":
            return "#0097A7"

        case "DELIVERED":
            return "#2E7D32"

        case "CANCELLED":
            return "#E53935"
            case "APPROVED":
    return "#22c55e"

case "ASSIGNED":
    return "#7c3aed"

case "PREPARING":
    return "#f59e0b"

case "ACCEPTED":
    return "#10b981"

        default:
    return "#475569"
    }
}
function formatItems(items) {

    if (!items || items.length === 0)
        return ""

    return items.map(item => {

        // 🔥 OBJECT FORMAT

        if (
            typeof item === "object"
        ) {

            return `${item.quantity || 1}x ${item.name || ""}`
        }

        // 🔥 STRING FORMAT

        return `1x ${item}`

    }).join(", ")
}
document
    .getElementById(
        "searchInput"
    )
    ?.addEventListener(
        "input",
        renderOrders
    )
    function getTotalQty(items) {

    if (!items)
        return 0

    let total = 0

    items.forEach(item => {

        if (
            typeof item === "object"
        ) {

            total +=
                Number(
                    item.quantity || 1
                )

        } else {

            total += 1
        }
    })

    return total
}
function formatDate(timestamp) {

    if (!timestamp)
        return "-"

    const date =
        new Date(timestamp)

    return date.toLocaleString(
        "en-IN",
        {

            day: "2-digit",
            month: "short",

            hour: "2-digit",
            minute: "2-digit"
        }
    )
}
// 🔥 AUTO LOAD ALL ORDERS

window.addEventListener(

    "load",

    () => {

        setFilter("ALL")
    }
)
/* LIVE NOTIFICATION */

function showLiveNotification() {

    const popup =
        document.getElementById(
            "liveNotification"
        )

    popup.classList.add(
        "show"
    )

    setTimeout(() => {

        popup.classList.remove(
            "show"
        )

    }, 7000)
}
/* NOTIFICATION COUNT */

function updateNotificationCount() {

    unreadNotifications++

    document.getElementById(
        "notificationCount"
    ).innerText =
        unreadNotifications
}

/* BELL BLINK */

function blinkNotificationBell() {

    const bell =
        document.getElementById(
            "notificationBell"
        )

    bell.classList.add(
        "bell-blink"
    )

    setTimeout(() => {

        bell.classList.remove(
            "bell-blink"
        )

    }, 2200)
}
/* DROPDOWN TOGGLE */

const notificationBell =
    document.getElementById(
        "notificationBell"
    )

const notificationDropdown =
    document.getElementById(
        "notificationDropdown"
    )

notificationBell.addEventListener(
    "click",
    () => {

        notificationDropdown.classList.toggle(
            "show"
        )

        /* RESET COUNT */

        unreadNotifications = 0

        document.getElementById(
            "notificationCount"
        ).innerText = 0
    }
)

/* CLICK OUTSIDE CLOSE */

document.addEventListener(
    "click",
    (e) => {

        if (

            !notificationBell.contains(
                e.target
            )

        ) {

            notificationDropdown.classList.remove(
                "show"
            )
        }
    }
)
/* ADD NOTIFICATION */

function addNotification(order) {

    const list =
        document.getElementById(
            "notificationList"
        )

    /* REMOVE EMPTY */

    if (

        list.innerHTML.includes(
            "No Notifications"
        )

    ) {

        list.innerHTML = ""
    }

    /* CREATE HTML */

    const item =
        document.createElement(
            "div"
        )

    item.className =
        "notification-item"

    item.innerHTML = `

<div class="notification-item-title">

🔥 ${order.customerName || "Customer"}

</div>

<div class="notification-item-subtitle">

₹${order.total || 0} • ${order.status || "Pending"}

</div>

`

    /* LATEST FIRST */

    list.prepend(item)

    /* LIMIT */

    if (

        list.children.length > 15

    ) {

        list.removeChild(
            list.lastChild
        )
    }
}
import {
    signOut
}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"

document
.getElementById("logoutBtn")
?.addEventListener(
    "click",
    async () => {

        await signOut(auth)

        window.location.href =
            "login.html"

    }
)
document
.getElementById(
    "prevPage"
)
?.addEventListener(

    "click",

    () => {

        if (

            currentPage > 1

        ) {

            currentPage--

            renderOrders()
        }
    }
)

document
.getElementById(
    "nextPage"
)
?.addEventListener(

    "click",

    () => {

        const totalPages =

    Math.ceil(
        allOrders.length /
        ORDERS_PER_PAGE
    )

if (

    currentPage <
    totalPages

) {

    currentPage++

    renderOrders()
}
    }
)