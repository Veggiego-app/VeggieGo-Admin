import {
    db,
    auth
}
from "./firebase.js"

import {

    doc,
    updateDoc,
    onSnapshot,
    
    getDocs,
    collection

}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"
import {
    signOut
}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"

// URL PARAMS

const params =
    new URLSearchParams(
        window.location.search
    )

const orderId =
    params.get("id")

// CARD

const orderCard =
    document.getElementById(
        "orderCard"
    )

// FIREBASE REF

const ref =
    doc(
        db,
        "orders",
        orderId
    )

// REALTIME

onSnapshot(
    ref,
    (snap) => {

        if (!snap.exists()) {

            orderCard.innerHTML = `

<h2>
❌ Order Not Found
</h2>

`

            return
        }

        const order =
            snap.data()

        renderOrder(order)
    }
)

// RENDER

function renderOrder(order) {

    let statusColor =
        "#7c3aed"

    switch(order.status) {

        case "DELIVERED":
            statusColor = "#16a34a"
            break

        case "CANCELLED":
            statusColor = "#dc2626"
            break

            case "CUSTOMER_CANCELLED":
    statusColor = "#dc2626"
    break

        case "OUT_FOR_DELIVERY":
            statusColor = "#0891b2"
            break

        case "PREPARING":
            statusColor = "#f59e0b"
            break
    }

    orderCard.innerHTML = `

<div class="order-details-card">

<!-- HEADER -->

<div class="order-header">

<div class="order-left">

<h1>

${order.restaurantName || "VeggieGo"}

</h1>

<div class="order-meta">

<div class="meta-pill">
🧾 ${orderId.slice(0,10)}
</div>

<div class="meta-pill">
🕒 ${formatDate(order.timestamp)}
</div>

<div class="meta-pill">
💳 ${order.paymentMethod || "COD"}
</div>

</div>

</div>

<div
class="order-status"
style="
background:${statusColor};
"
>

${
order.status === "CANCELLED"

?

(
order.cancelledBy === "RESTAURANT"

?

"Restaurant Cancelled"

:

order.cancelledBy === "ADMIN"

?

"Admin Cancelled"

:

"Customer Cancelled"
)

:

(order.status || "PENDING")
}

</div>

</div>

<!-- INFO GRID -->

<div class="info-grid">

<div class="info-card">

<h3>
👤 Customer Info
</h3>

<p>
👤 ${order.customerName || "-"}
</p>

<p>
📞 ${order.customerPhone || "-"}
</p>

<hr>

<p>
🏠 House:
${order.house || "-"}
</p>

<p>
📍 Area:
${order.area || "-"}
</p>

<p>
🗺 Landmark:
${order.landmark || "-"}
</p>

<p>
🏙 City:
${order.city || "-"}
</p>

<p>
📮 Pincode:
${order.pincode || "-"}
</p>

<p>

<a
href="https://www.google.com/maps?q=${order.customerLat},${order.customerLng}"
target="_blank"
class="location-btn"
>

📍 Open Exact Customer Location

</a>

</p>

</div>

<div class="info-card">

<h3>
🛵 Rider Info
</h3>

<p>
👤 ${order.riderName || "Not Assigned"}
</p>

<p>
📞 ${order.riderPhone || "-"}
</p>

</div>

<div class="info-card">

<h3>
📦 Order Info
</h3>

<p>
🛵 Rider:
${order.riderName || "Not Assigned"}
</p>

<p>
💳 Method:
${order.paymentMethod || "COD"}
</p>

<p>
💰 Payment Status:

${

order.paymentReceived

?

`✅ RECEIVED

${

order.paymentReceivedReason

?

`<br><br>
<b>Reason:</b><br>
${order.paymentReceivedReason}
`

:

""

}`

:

order.cashCollected

?

`✅ RECEIVED BY RIDER

<br><br>

👤 Rider:
${order.riderName || "-"}

<br>

📞 Mobile:
${order.riderPhone || "-"}

<br>

🕒
${formatDate(order.cashCollectedAt)}
`

:

"❌ NOT RECEIVED"

}

${

order.paymentReceivedReason

?

`<br><br>
<b>Reason:</b><br>
${order.paymentReceivedReason}
`

:

""

}

</p>
${
!order.paymentReceived &&
!order.cashCollected
?
`
<button
id="paymentReceivedBtn"
class="action-btn"
>
💳 MARK PAYMENT RECEIVED
</button>
`
:
""
}
</p>
<p>
💰 Total:
₹${order.total || 0}
</p>

<p>
🍔 Items:
${getTotalItems(order.items)}
</p>

<p>
📦 Status:
${order.status || "-"}
</p>

</div>

</div>

${
order.status === "CANCELLED"
||
order.status === "CUSTOMER_CANCELLED"
?
`

<div class="cancel-box">

<div class="cancel-top">

<div>

<h3>
❌ Order Cancelled
</h3>

<p>

<b>Reason:</b>

${order.cancelReason || "No reason"}

</p>

</div>

<div class="cancel-badge">

${

order.cancelledBy === "RESTAURANT"

?

"Restaurant Cancelled"

:

order.cancelledBy === "ADMIN"

?

"Admin Cancelled"

:

"Customer Cancelled"

}

</div>

</div>

</div>

`

:

""

}
${



order.adminStatusReason



?



`



<div class="cancel-box">



<div class="cancel-top">



<div>



<h3>

👨‍💼 Admin Status Change

</h3>



<p>

<b>Status:</b>

${order.adminStatusTarget || "-"}

<br><br>

<b>Reason:</b>

${order.adminStatusReason}

</p>



</div>



<div class="cancel-badge">



ADMIN



</div>



</div>



</div>



`



:



""



}
<!-- ITEMS -->

<div class="items-box">

<div class="items-title">

<h3>
🍔 Ordered Items
</h3>

<div class="meta-pill">
${getTotalItems(order.items)} Items
</div>

</div>

${formatItems(order.items)}

<div class="bill-box">

<div class="bill-row">
<span>Item Total</span>
<span>₹${order.itemTotal || 0}</span>
</div>

<div class="bill-row">
<span>Delivery Fee</span>
<span>₹${order.deliveryFee || 0}</span>
</div>

<div class="bill-row">
<span>Packaging Fee</span>
<span>₹${order.packagingFee || 0}</span>
</div>

<div class="bill-row">
<span>Platform Fee</span>
<span>₹${order.platformFee || 0}</span>
</div>

<div class="bill-row">
<span>

${

order.surgeReason

?

`⚡ Surge Fee (${order.surgeReason})`

:

"⚡ Surge Fee"

}

</span>

<span>
₹${order.surgeFee || 0}
</span>
</div>

<div class="bill-row">
<span>GST On Items</span>
<span>₹${(order.gstOnItems || 0).toFixed(2)}</span>
</div>

<div class="bill-row">
<span>GST On Delivery</span>
<span>₹${(order.gstOnDelivery || 0).toFixed(2)}</span>
</div>

<div class="bill-row">
<span>GST On Packaging</span>
<span>₹${(order.gstOnPackaging || 0).toFixed(2)}</span>
</div>

<div class="bill-row">
<span>GST On Platform</span>
<span>₹${(order.gstOnPlatform || 0).toFixed(2)}</span>
</div>

<div class="bill-row">
<span>Discount</span>
<span>- ₹${order.discount || 0}</span>
</div>

<div class="bill-row">
<span>Tip</span>
<span>₹${order.tip || 0}</span>
</div>

<div class="bill-total">

<span>
Grand Total
</span>

<span>
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
</span>

</div>

</div>
</div>

<!-- CUSTOMER ACTIONS -->

<div class="section-title">
📞 Customer Actions
</div>

<div class="action-buttons">

<button
class="btn-blue"
id="callBtn"
>
📞 CALL
</button>

<button
class="btn-green"
id="whatsappBtn"
>
💬 WHATSAPP
</button>

<button
class="btn-cyan"
id="mapBtn"
>
📍 MAP
</button>

</div>

<!-- ADMIN ACTIONS -->

<div class="section-title">
⚙ Admin Actions
</div>

<div class="action-buttons">

<div class="status-dropdown-wrapper">

<button
class="btn-purple"
id="changeStatusBtn"
>

⚙ CHANGE STATUS

</button>

<div
class="status-dropdown"
id="statusDropdown"
>

<div class="status-option">
PENDING
</div>

<div class="status-option">
APPROVED
</div>

<div class="status-option">
PREPARING
</div>

<div class="status-option">
READY_FOR_PICKUP
</div>

<div class="status-option">
RIDER_ASSIGNED
</div>

<div class="status-option">
OUT_FOR_DELIVERY
</div>

<div class="status-option">
DELIVERED
</div>

<div class="status-option">
CANCELLED
</div>

</div>

</div>

<button
class="action-btn"
onclick="window.print()"
>

🖨 PRINT ORDER

</button>

</div>

<!-- TIMELINE -->

<div class="timeline-box">

<h3>
🚀 Order Timeline
</h3>

<div class="timeline">

${renderTimeline(order)}

</div>

</div>

<!-- NOTES -->

<div class="note-box">

<h3>
📝 Admin Note
</h3>

<textarea
id="adminNote"
placeholder="Write admin note..."
>${order.adminNote || ""}</textarea>

<button
class="note-save-btn"
id="saveNoteBtn"
>

💾 SAVE NOTE

</button>

</div>

</div>

`

    // CALL

    const callBtn =
        document.getElementById(
            "callBtn"
        )

    if (callBtn) {

        callBtn.onclick = () => {

            window.location.href =
                `tel:${order.customerPhone}`
        }
    }

    // WHATSAPP

    const whatsappBtn =
        document.getElementById(
            "whatsappBtn"
        )

    if (whatsappBtn) {

        whatsappBtn.onclick = () => {

            const msg =
encodeURIComponent(

`Hello ${order.customerName},

Your VeggieGo order status:
${order.status} 😎`
)

            window.open(

`https://wa.me/91${order.customerPhone}?text=${msg}`,

                "_blank"
            )
        }
    }

    // MAP

    const mapBtn =
    document.getElementById(
        "mapBtn"
    )

if (mapBtn) {

    mapBtn.onclick = () => {

        const lat =
            order.customerLat

        const lng =
            order.customerLng

        if (!lat || !lng) {

            alert(
                "Customer location not available"
            )

            return
        }

        window.open(

`https://www.google.com/maps?q=${lat},${lng}`,

            "_blank"
        )
    }
}

    // SAVE NOTE

    const saveNoteBtn =
        document.getElementById(
            "saveNoteBtn"
        )

    if (saveNoteBtn) {

        saveNoteBtn.onclick =
        async () => {

            const note =
                document
                    .getElementById(
                        "adminNote"
                    )
                    .value

            await updateDoc(
                ref,
                {
                    adminNote: note
                }
            )

            alert(
                "✅ Note Saved"
            )
        }
        const paymentBtn =

    document.getElementById(
        "paymentReceivedBtn"
    )

if (paymentBtn) {

    paymentBtn.onclick =
async () => {

    let reason = prompt(

        "Enter Payment Reason (Minimum 12 Characters)"

    ) || ""

    reason = reason.trim()

    if (

        reason.length < 12

    ) {

        alert(

            "❌ Reason must be minimum 12 characters"

        )

        return
    }

    await updateDoc(
        ref,
        {
            paymentReceived: true,

            paymentReceivedAt:
                Date.now(),

            paymentReceivedReason:
                reason,

            paymentReceivedBy:
                "ADMIN"
        }
    )

    alert(
        "✅ Payment Marked As Received"
    )
}
}
    }

    // CHANGE STATUS DROPDOWN

const changeStatusBtn =
    document.getElementById(
        "changeStatusBtn"
    )

const statusDropdown =
    document.getElementById(
        "statusDropdown"
    )

if (
    changeStatusBtn &&
    statusDropdown
) {

    // OPEN CLOSE

    changeStatusBtn.onclick = () => {

    statusDropdown.classList.remove(
        "dropdown-up",
        "dropdown-down"
    )

    const rect =
        changeStatusBtn.getBoundingClientRect()

    const dropdownHeight = 320

    const spaceBelow =
        window.innerHeight - rect.bottom

    if (spaceBelow >= dropdownHeight) {

        statusDropdown.classList.add(
            "dropdown-down"
        )

    } else {

        statusDropdown.classList.add(
            "dropdown-up"
        )
    }

    statusDropdown.classList.toggle(
        "show-dropdown"
    )
}

    // OPTIONS
if (
    order.status ===
    "CUSTOMER_CANCELLED"
) {

    changeStatusBtn.innerHTML =
        "❌ CUSTOMER CANCELLED"

    changeStatusBtn.disabled = true

    changeStatusBtn.style.opacity = "0.6"

    changeStatusBtn.style.cursor =
        "not-allowed"

    return
}
    const options =
        document.querySelectorAll(
            ".status-option"
        )

    options.forEach(option => {

        option.onclick =
        async () => {

            const finalStatus =
                option.innerText.trim()

            const updateData = {

                status:
                    finalStatus,

                updatedAt:
                    Date.now()
            }
            if (
    finalStatus !== "CANCELLED"
) {

    updateData.cancelReason = ""

    updateData.cancelledBy = ""

    updateData.cancelledAt = null
}
            if (

    order.status === "PENDING"

    &&

    finalStatus === "APPROVED"

) {

    let adminReason = prompt(

        "Enter Approval Reason (Minimum 3 Characters)"

    ) || ""

    adminReason = adminReason.trim()

    if (

        adminReason.length < 3

    ) {

        alert(

            "❌ Reason must be minimum 3 characters"

        )

        return
    }

    updateData.statusChangedBy =
    "ADMIN"

updateData.adminStatusReason =
    adminReason

updateData.adminStatusTarget =
    finalStatus

updateData.statusChangedAt =
    Date.now()
}
            // 🔥 FREE RIDER AFTER DELIVERY

if (
    finalStatus ===
    "DELIVERED"
) {

    const riderId =
        order.riderId || ""

    if (riderId) {

        await updateDoc(

            doc(
                db,
                "riders",
                riderId
            ),

            {
                activeOrderId: "",

                totalDeliveries:
                    (order.totalDeliveries || 0) + 1
            }
        )
    }
}
            if (
    finalStatus ===
    "READY_FOR_PICKUP"
) {

    await updateDoc(
        ref,
        {
            status: "READY_FOR_PICKUP",
            riderId: "",
            riderName: "",
            riderPhone: "",
            riderAssigned: false,
            updatedAt: Date.now()
        }
    )

    alert(
        "🚚 Order Sent To All Riders"
    )

    return
}

            // CANCEL REASON

            if (
    finalStatus !==
    "CANCELLED"
) {

    updateData.cancelReason = ""

    updateData.cancelledBy = ""

    updateData.cancelledAt = null
}

            // ASK REASON

            if (
    finalStatus ===
    "CANCELLED"
) {

    let reason = prompt(
    "Enter Cancel Reason (Minimum 3 Characters)"
) || ""

    reason = reason.trim()

    if (
        reason.length < 3
    ) {

        alert(
            "❌ Reason must be minimum 3 characters"
        )

        return
    }

    updateData.cancelReason =
    reason

updateData.cancelledBy =
    "ADMIN"

updateData.cancelledAt =
    Date.now()

updateData.statusChangedBy =
    "ADMIN"

updateData.adminStatusReason =
    reason

updateData.adminStatusTarget =
    "CANCELLED"

updateData.statusChangedAt =
    Date.now()
}

            await updateDoc(
                ref,
                updateData
            )

            statusDropdown
                .classList
                .remove(
                    "show-dropdown"
                )

            alert(
`✅ Status Changed To ${finalStatus}`
            )
        }
    })
}
// ITEMS

function formatItems(items) {

    if (!items)
        return ""

    return items.map(item => {

        const addonsHtml =

            item.addons &&
            item.addons.length > 0

            ?

            item.addons.map(addon => `

<div class="addon-line">

${addon.name}
${addon.price}RS

</div>

`).join("")

            :

            ""

        return `

<div class="item-block">

<div class="item-single-row">

<div class="item-left-side">

<div class="category-line">

Category:
${item.category || "-"}

</div>

<div class="item-main-line">

${item.name || ""}

</div>

${

item.variant

?

`

<div class="variant-line">

Variant:
${item.variant}

</div>

`

:

""

}

${addonsHtml}

</div>

<div class="qty-price">

${item.quantity || 1}*${item.variantPrice || item.price || 0}

</div>

<div class="item-total">

₹${item.itemTotal || 0}

</div>

</div>

<hr class="item-divider">

`

    }).join("")
}

// TOTAL ITEMS

function getTotalItems(items) {

    if (!items)
        return 0

    return items.length
}

// DATE

function formatDate(timestamp) {

    if (!timestamp)
        return "-"

    const date =
        new Date(timestamp)

    return date.toLocaleString()
}

// TIMELINE

function renderTimeline(order) {

    const timeline = [

        "PENDING",
        "APPROVED",
        "PREPARING",
        "READY_FOR_PICKUP",
        "RIDER_ASSIGNED",
        "OUT_FOR_DELIVERY",
        "DELIVERED",
        "CANCELLED"

    ]

    return timeline.map(status => `

<div class="timeline-item">

<div class="timeline-dot"
style="
opacity:
${order.status === status ? 1 : 0.3}
"
></div>

<div class="timeline-content">

<h4>
${status.replaceAll("_"," ")}
</h4>

<p>
${order.status === status ? "Current Status 😎" : ""}
</p>

</div>

</div>

`).join("")
}
async function autoAssignRider(orderId) {

    const ridersSnapshot =

        await getDocs(
            collection(
                db,
                "riders"
            )
        )

    let availableRiders = []

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

    if (
        availableRiders.length === 0
    ) {

        alert(
            "❌ No Online Rider Available"
        )

        return
    }

    const selectedRider =
        availableRiders[0]

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
}
const logoutBtn =
document.getElementById(
    "logoutBtn"
)

if (logoutBtn) {

    logoutBtn.onclick =
    async () => {

        await signOut(auth)

        window.location.href =
        "login.html"
    }
}