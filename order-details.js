import {
    db,
    auth
}
from "./firebase.js"

import {

    doc,
    updateDoc,
    onSnapshot,
    getDoc,
    getDocs,
    collection,
    writeBatch,
    arrayUnion

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

const ORDER_STATUS_FLOW = [
    "PENDING",
    "APPROVED",
    "PREPARING",
    "READY_FOR_PICKUP",
    "RIDER_ASSIGNED",
    "RIDER_ACCEPTED",
    "REACHED_RESTAURANT",
    "PICKED_UP",
    "OUT_FOR_DELIVERY",
    "DELIVERED"
]

const ORDER_STATUS_DESCRIPTIONS = {
    PENDING:
        "Order मिला है, लेकिन अभी restaurant processing शुरू नहीं हुई है।",

    APPROVED:
        "Order admin ने approve कर दिया है। अब restaurant इसे process कर सकता है।",

    PREPARING:
        "Restaurant order तैयार कर रहा है। अभी pickup नहीं किया जा सकता।",

    READY_FOR_PICKUP:
        "Order तैयार है और rider pickup कर सकता है। मौजूदा rider अपने-आप नहीं हटेगा।",

    RIDER_ASSIGNED:
        "Rider को order request भेज दी गई है। Rider का accept या reject बाकी है।",

    RIDER_ACCEPTED:
        "Rider ने order accept कर लिया है और restaurant की तरफ जा रहा है।",

    REACHED_RESTAURANT:
        "Rider restaurant location पर पहुँच गया है और order लेने का इंतजार कर रहा है।",

    PICKED_UP:
        "Rider ने restaurant से order प्राप्त कर लिया है।",

    OUT_FOR_DELIVERY:
        "Rider customer की location पर order deliver करने जा रहा है।",

    DELIVERED:
        "Order customer को मिल चुका है। Order complete होगा और rider active delivery से free होगा।",

    CANCELLED:
        "Order बंद हो जाएगा और आगे process नहीं होगा। Cancel reason जरूरी है।",

    CUSTOMER_CANCELLED:
        "Customer ने order cancel किया है। इसे normal status change से नहीं खोला जा सकता।"
}

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

<div
class="meta-pill order-id-pill"
title="${order.orderId || orderId}"
>
🧾 ${order.orderId || orderId}
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

${
String(order.status || "").toUpperCase() === "DELIVERED"

?

`
<p>
✅ Order Delivered
</p>
`

:

`
<button
id="riderActionBtn"
class="action-btn"
>

${
order.riderId

?

"🔄 CHANGE RIDER"

:

"🛵 ASSIGN RIDER"
}

</button>

<p
id="riderActionMessage"
style="
font-size:12px;
margin-top:8px;
"
>
</p>
`
}

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



<div
class="
cancel-box
${
    String(
        order.adminStatusTarget || ""
    ).toUpperCase() === "APPROVED"

    ? "admin-status-approved"

    : ""
}
"
>

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

</div>

<button
class="action-btn"
id="printOrderBtn"
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

<!-- PRINT INVOICE: visible only while printing -->

${buildPrintInvoice(order)}

`
// RIDER ASSIGN / CHANGE BUTTON

const riderActionBtn =
    document.getElementById(
        "riderActionBtn"
    )

const riderActionMessage =
    document.getElementById(
        "riderActionMessage"
    )

if (riderActionBtn) {

    const currentStatus =
        String(
            order.status || ""
        ).toUpperCase()

    const riderActionAllowedStatuses = [

        "PREPARING",

        "READY_FOR_PICKUP",

        "RIDER_ASSIGNED",

        "RIDER_ACCEPTED",

        "REACHED_RESTAURANT",

        "PICKED_UP",

        "OUT_FOR_DELIVERY"

    ]

    const riderActionAllowed =
        riderActionAllowedStatuses
            .includes(
                currentStatus
            )

    if (!riderActionAllowed) {

        riderActionBtn.disabled =
            true

        riderActionBtn.style.opacity =
            "0.6"

        riderActionBtn.style.cursor =
            "not-allowed"

        if (riderActionMessage) {

            riderActionMessage.innerText =

                currentStatus === "PENDING"

                ||

                currentStatus === "APPROVED"

                ?

                "Rider can be assigned after PREPARING status."

                :

                "Rider assignment is not available in this status."
        }

    } else {

        if (riderActionMessage) {

            riderActionMessage.innerText =

                order.riderId

                ?

                "Current rider will remain active until the new rider accepts."

                :

                "Select an online approved rider."
        }

        riderActionBtn.onclick =
            async () => {

                await openRiderSelectionModal(
                    order
                )
            }
    }
}
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
// PRINT COMPLETE INVOICE

const printOrderBtn =
    document.getElementById(
        "printOrderBtn"
    )

if (printOrderBtn) {

    printOrderBtn.onclick = () => {

        document.title =
            `VeggieGo Invoice - ${order.orderId || orderId}`

        window.print()
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

    // SAFE STATUS CHANGE MODAL

const changeStatusBtn =
    document.getElementById(
        "changeStatusBtn"
    )

if (changeStatusBtn) {

    const currentStatus =
        normalizeOrderStatus(
            order.status
        )

    if (
        currentStatus ===
        "CUSTOMER_CANCELLED"
    ) {

        changeStatusBtn.innerHTML =
            "❌ CUSTOMER CANCELLED"

        changeStatusBtn.disabled =
            true

        changeStatusBtn.style.opacity =
            "0.6"

        changeStatusBtn.style.cursor =
            "not-allowed"

        changeStatusBtn.title =
            ORDER_STATUS_DESCRIPTIONS
                .CUSTOMER_CANCELLED

    } else {

        changeStatusBtn.onclick =
            () => {

                openStatusChangeModal(
                    order
                )
            }
    }
}

function normalizeOrderStatus(value) {

    return String(
        value || "PENDING"
    )
        .trim()
        .toUpperCase()
}

function formatOrderStatusLabel(value) {

    return normalizeOrderStatus(
        value
    ).replaceAll(
        "_",
        " "
    )
}

function getStatusDescription(status) {

    return (
        ORDER_STATUS_DESCRIPTIONS[
            normalizeOrderStatus(
                status
            )
        ]

        ||

        "इस status की जानकारी उपलब्ध नहीं है।"
    )
}

function getNormalNextStatus(
    currentStatus
) {

    const currentIndex =
        ORDER_STATUS_FLOW.indexOf(
            normalizeOrderStatus(
                currentStatus
            )
        )

    if (
        currentIndex < 0 ||
        currentIndex >=
            ORDER_STATUS_FLOW.length - 1
    ) {

        return ""
    }

    return ORDER_STATUS_FLOW[
        currentIndex + 1
    ]
}

function getBackwardStatuses(
    currentStatus,
    currentOrder
) {

    const normalizedStatus =
        normalizeOrderStatus(
            currentStatus
        )

    if (
        normalizedStatus ===
        "CANCELLED"
    ) {

        const statusBeforeCancel =
            normalizeOrderStatus(
                currentOrder
                    .statusBeforeCancel ||
                currentOrder
                    .previousStatus ||
                ""
            )

        const statuses = [
            statusBeforeCancel,
            ...ORDER_STATUS_FLOW
                .slice()
                .reverse()
        ]
            .filter(
                status =>
                    status &&
                    status !==
                        "CANCELLED"
            )

        return Array.from(
            new Set(statuses)
        )
    }

    const currentIndex =
        ORDER_STATUS_FLOW.indexOf(
            normalizedStatus
        )

    if (currentIndex <= 0) {

        return []
    }

    return ORDER_STATUS_FLOW
        .slice(
            0,
            currentIndex
        )
        .reverse()
}

function getRequiredReasonLength(
    currentStatus,
    targetStatus,
    mode
) {

    const current =
        normalizeOrderStatus(
            currentStatus
        )

    const target =
        normalizeOrderStatus(
            targetStatus
        )

    if (mode === "EMERGENCY") {

        return 20
    }

    if (
        mode === "BACKWARD" ||
        current === "DELIVERED" ||
        current === "CANCELLED" ||
        target === "DELIVERED" ||
        target === "CANCELLED"
    ) {

        return 10
    }

    if (
        current === "PENDING" &&
        target === "APPROVED"
    ) {

        return 3
    }

    return 0
}

function isActiveDeliveryStatus(status) {

    return [
        "PENDING",
        "APPROVED",
        "PREPARING",
        "READY_FOR_PICKUP",
        "RIDER_ASSIGNED",
        "RIDER_ACCEPTED",
        "REACHED_RESTAURANT",
        "PICKED_UP",
        "OUT_FOR_DELIVERY"
    ].includes(
        normalizeOrderStatus(
            status
        )
    )
}

function isRiderAssignmentStatus(status) {

    return [
        "PREPARING",
        "READY_FOR_PICKUP",
        "RIDER_ASSIGNED",
        "RIDER_ACCEPTED",
        "REACHED_RESTAURANT",
        "PICKED_UP",
        "OUT_FOR_DELIVERY"
    ].includes(
        normalizeOrderStatus(
            status
        )
    )
}

function ensureStatusModalStyles() {

    if (
        document.getElementById(
            "orderStatusModalStyles"
        )
    ) return

    const style =
        document.createElement(
            "style"
        )

    style.id =
        "orderStatusModalStyles"

    style.textContent = `
        #orderStatusChangeModal {
            position: fixed;
            inset: 0;
            z-index: 12000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 18px;
            background: rgba(15, 23, 42, 0.72);
        }

        .order-status-modal-box {
            width: min(820px, 100%);
            max-height: 92vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            border-radius: 18px;
            color: #0f172a;
            background: #ffffff;
            box-shadow: 0 28px 80px rgba(15, 23, 42, 0.32);
        }

        .order-status-modal-header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 16px;
            padding: 20px 22px 16px;
            border-bottom: 1px solid #e2e8f0;
        }

        .order-status-modal-header h2 {
            margin: 0;
            color: #0f172a;
            font-size: 22px;
        }

        .order-status-modal-header p {
            margin: 6px 0 0;
            color: #64748b;
            font-size: 13px;
        }

        .order-status-close {
            width: 38px;
            height: 38px;
            border: 0;
            border-radius: 10px;
            color: #475569;
            background: #e2e8f0;
            cursor: pointer;
            font-size: 18px;
            font-weight: 900;
        }

        .order-status-modal-body {
            overflow-y: auto;
            padding: 18px 22px;
        }

        .status-current-next-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
        }

        .status-info-card {
            padding: 15px;
            border: 1px solid #dbeafe;
            border-radius: 13px;
            background: #f8fafc;
        }

        .status-info-card.next {
            border-color: #a7f3d0;
            background: #f0fdf4;
        }

        .status-info-label {
            color: #64748b;
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 0.06em;
            text-transform: uppercase;
        }

        .status-info-name {
            margin-top: 7px;
            color: #0f172a;
            font-size: 18px;
            font-weight: 900;
        }

        .status-info-description {
            margin-top: 7px;
            color: #475569;
            font-size: 13px;
            line-height: 1.5;
        }

        .status-modal-section {
            margin-top: 18px;
        }

        .status-modal-section > label,
        .status-modal-section > h3 {
            display: block;
            margin: 0 0 9px;
            color: #334155;
            font-size: 13px;
            font-weight: 900;
        }

        .status-mode-grid {
            display: grid;
            grid-template-columns: repeat(4, minmax(130px, 1fr));
            gap: 9px;
        }

        .status-mode-btn {
            min-height: 48px;
            padding: 10px;
            border: 1px solid #cbd5e1;
            border-radius: 11px;
            color: #334155;
            background: #f8fafc;
            cursor: pointer;
            font-size: 12px;
            font-weight: 900;
        }

        .status-mode-btn.active {
            border-color: #7c3aed;
            color: #ffffff;
            background: #7c3aed;
        }

        .status-mode-btn.cancel-mode {
            border-color: #fca5a5;
            color: #b91c1c;
            background: #fef2f2;
        }

        .status-mode-btn.emergency-mode {
            border-color: #fdba74;
            color: #c2410c;
            background: #fff7ed;
        }

        .status-mode-btn:disabled {
            cursor: not-allowed;
            opacity: 0.45;
        }

        #orderStatusChangeModal
        .status-mode-btn:hover:not(:disabled):not(.active) {
            color: #0f172a !important;
            background: #eef2ff !important;
        }

        .status-target-select,
        .status-reason-textarea {
            width: 100%;
            border: 1px solid #cbd5e1;
            border-radius: 11px;
            color: #0f172a;
            background: #ffffff;
            box-sizing: border-box;
            font: inherit;
        }

        #orderStatusChangeModal
        .status-target-select option {
            color: #0f172a;
            background: #ffffff;
        }

        .status-target-select {
            min-height: 45px;
            padding: 10px 12px;
            font-weight: 800;
        }

        .status-reason-textarea {
            min-height: 92px;
            padding: 12px;
            resize: vertical;
        }

        .status-selected-description {
            margin-top: 9px;
            padding: 12px;
            border-radius: 10px;
            color: #1e3a8a;
            background: #eff6ff;
            font-size: 13px;
            line-height: 1.5;
        }

        .status-rider-actions {
            display: grid;
            gap: 9px;
        }

        .status-rider-option {
            display: flex;
            align-items: flex-start;
            gap: 10px;
            padding: 12px;
            border: 1px solid #e2e8f0;
            border-radius: 11px;
            cursor: pointer;
            background: #ffffff;
        }

        .status-rider-option:has(input:checked) {
            border-color: #86efac;
            background: #f0fdf4;
        }

        .status-rider-option input {
            margin-top: 3px;
        }

        .status-rider-option strong {
            display: block;
            color: #0f172a;
            font-size: 13px;
        }

        .status-rider-option span {
            display: block;
            margin-top: 3px;
            color: #64748b;
            font-size: 12px;
            line-height: 1.4;
        }

        .status-effect-box {
            margin-top: 14px;
            padding: 12px 14px;
            border: 1px solid #fde68a;
            border-radius: 11px;
            color: #92400e;
            background: #fffbeb;
            font-size: 13px;
            line-height: 1.5;
        }

        .status-reason-footer {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            margin-top: 6px;
            color: #64748b;
            font-size: 11px;
        }

        .status-emergency-confirm {
            display: none;
            align-items: flex-start;
            gap: 9px;
            margin-top: 12px;
            padding: 12px;
            border-radius: 10px;
            color: #9a3412;
            background: #fff7ed;
            font-size: 12px;
            font-weight: 700;
        }

        .status-emergency-confirm.show {
            display: flex;
        }

        .order-status-modal-footer {
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            padding: 15px 22px;
            border-top: 1px solid #e2e8f0;
            background: #ffffff;
        }

        .status-modal-btn {
            min-height: 42px;
            padding: 10px 17px;
            border: 0;
            border-radius: 10px;
            cursor: pointer;
            font-weight: 900;
        }

        .status-modal-btn.cancel {
            color: #334155;
            background: #e2e8f0;
        }

        .status-modal-btn.confirm {
            color: #ffffff;
            background: #16a34a;
        }

        .status-modal-btn.confirm.emergency {
            background: #ea580c;
        }

        .status-modal-btn:disabled {
            cursor: not-allowed;
            opacity: 0.55;
        }

        @media (max-width: 720px) {
            .status-current-next-grid {
                grid-template-columns: 1fr;
            }

            .status-mode-grid {
                grid-template-columns: 1fr 1fr;
            }

            .order-status-modal-footer {
                flex-wrap: wrap;
            }

            .status-modal-btn {
                flex: 1;
            }
        }
    `

    document.head.appendChild(
        style
    )
}

function openStatusChangeModal(
    currentOrder
) {

    ensureStatusModalStyles()

    document
        .getElementById(
            "orderStatusChangeModal"
        )
        ?.remove()

    const currentStatus =
        normalizeOrderStatus(
            currentOrder.status
        )

    const normalNextStatus =
        getNormalNextStatus(
            currentStatus
        )

    const backwardStatuses =
        getBackwardStatuses(
            currentStatus,
            currentOrder
        )

    const defaultMode =
        normalNextStatus

        ?

        "NORMAL_NEXT"

        :

        backwardStatuses.length

        ?

        "BACKWARD"

        :

        "EMERGENCY"

    const modal =
        document.createElement(
            "div"
        )

    modal.id =
        "orderStatusChangeModal"

    modal.innerHTML = `
        <div
            class="order-status-modal-box"
            role="dialog"
            aria-modal="true"
            aria-labelledby="orderStatusModalTitle"
        >
            <div class="order-status-modal-header">
                <div>
                    <h2 id="orderStatusModalTitle">
                        Change Order Status
                    </h2>

                    <p>
                        Order:
                        ${escapeStatusHtml(
                            currentOrder.orderId ||
                            orderId
                        )}
                    </p>
                </div>

                <button
                    type="button"
                    id="closeOrderStatusModal"
                    class="order-status-close"
                >
                    ✕
                </button>
            </div>

            <div class="order-status-modal-body">
                <div class="status-current-next-grid">
                    <div class="status-info-card">
                        <div class="status-info-label">
                            Current Status
                        </div>

                        <div class="status-info-name">
                            ${escapeStatusHtml(
                                formatOrderStatusLabel(
                                    currentStatus
                                )
                            )}
                        </div>

                        <div class="status-info-description">
                            ${escapeStatusHtml(
                                getStatusDescription(
                                    currentStatus
                                )
                            )}
                        </div>
                    </div>

                    <div class="status-info-card next">
                        <div class="status-info-label">
                            Normal Next Status
                        </div>

                        <div class="status-info-name">
                            ${
                                normalNextStatus

                                ?

                                escapeStatusHtml(
                                    formatOrderStatusLabel(
                                        normalNextStatus
                                    )
                                )

                                :

                                "No Next Step"
                            }
                        </div>

                        <div class="status-info-description">
                            ${
                                normalNextStatus

                                ?

                                escapeStatusHtml(
                                    getStatusDescription(
                                        normalNextStatus
                                    )
                                )

                                :

                                "Normal sequence में आगे कोई status उपलब्ध नहीं है।"
                            }
                        </div>
                    </div>
                </div>

                <div class="status-modal-section">
                    <h3>Change Type</h3>

                    <div class="status-mode-grid">
                        <button
                            type="button"
                            class="status-mode-btn"
                            data-status-mode="NORMAL_NEXT"
                            ${normalNextStatus ? "" : "disabled"}
                        >
                            Next Step
                        </button>

                        <button
                            type="button"
                            class="status-mode-btn"
                            data-status-mode="BACKWARD"
                            ${backwardStatuses.length ? "" : "disabled"}
                        >
                            Go Back
                        </button>

                        <button
                            type="button"
                            class="status-mode-btn cancel-mode"
                            data-status-mode="CANCEL"
                            ${currentStatus === "CANCELLED" ? "disabled" : ""}
                        >
                            Cancel Order
                        </button>

                        <button
                            type="button"
                            class="status-mode-btn emergency-mode"
                            data-status-mode="EMERGENCY"
                        >
                            Emergency
                        </button>
                    </div>
                </div>

                <div class="status-modal-section">
                    <label for="statusTargetSelect">
                        Target Status
                    </label>

                    <select
                        id="statusTargetSelect"
                        class="status-target-select"
                    ></select>

                    <div
                        id="selectedStatusDescription"
                        class="status-selected-description"
                    ></div>
                </div>

                <div
                    id="statusRiderSection"
                    class="status-modal-section"
                >
                    <h3>Rider Handling</h3>

                    <div
                        id="statusRiderActions"
                        class="status-rider-actions"
                    ></div>
                </div>

                <div
                    id="statusChangeEffect"
                    class="status-effect-box"
                ></div>

                <div class="status-modal-section">
                    <label
                        id="statusReasonLabel"
                        for="statusChangeReason"
                    >
                        Reason
                    </label>

                    <textarea
                        id="statusChangeReason"
                        class="status-reason-textarea"
                        placeholder="Status change का reason लिखें..."
                    ></textarea>

                    <div class="status-reason-footer">
                        <span id="statusReasonHelp"></span>
                        <span id="statusReasonCounter">0 characters</span>
                    </div>

                    <label
                        id="statusEmergencyConfirm"
                        class="status-emergency-confirm"
                    >
                        <input
                            type="checkbox"
                            id="statusEmergencyCheckbox"
                        >

                        <span>
                            मैं समझता हूँ कि Emergency Override normal status sequence को bypass करेगा।
                        </span>
                    </label>
                </div>
            </div>

            <div class="order-status-modal-footer">
                <button
                    type="button"
                    id="cancelOrderStatusChange"
                    class="status-modal-btn cancel"
                >
                    Close
                </button>

                <button
                    type="button"
                    id="confirmOrderStatusChange"
                    class="status-modal-btn confirm"
                >
                    Confirm Status Change
                </button>
            </div>
        </div>
    `

    document.body.appendChild(
        modal
    )

    const targetSelect =
        document.getElementById(
            "statusTargetSelect"
        )

    const statusDescription =
        document.getElementById(
            "selectedStatusDescription"
        )

    const riderActions =
        document.getElementById(
            "statusRiderActions"
        )

    const riderSection =
        document.getElementById(
            "statusRiderSection"
        )

    const effectBox =
        document.getElementById(
            "statusChangeEffect"
        )

    const reasonInput =
        document.getElementById(
            "statusChangeReason"
        )

    const reasonLabel =
        document.getElementById(
            "statusReasonLabel"
        )

    const reasonHelp =
        document.getElementById(
            "statusReasonHelp"
        )

    const reasonCounter =
        document.getElementById(
            "statusReasonCounter"
        )

    const emergencyConfirm =
        document.getElementById(
            "statusEmergencyConfirm"
        )

    const emergencyCheckbox =
        document.getElementById(
            "statusEmergencyCheckbox"
        )

    const confirmButton =
        document.getElementById(
            "confirmOrderStatusChange"
        )

    let selectedMode =
        defaultMode

    let selectedRiderAction =
        "KEEP"

    const closeModal = () => {

        modal.remove()
    }

    document
        .getElementById(
            "closeOrderStatusModal"
        )
        .onclick =
            closeModal

    document
        .getElementById(
            "cancelOrderStatusChange"
        )
        .onclick =
            closeModal

    modal.onclick = event => {

        if (event.target === modal) {

            closeModal()
        }
    }

    function getTargetsForMode() {

        switch (
            selectedMode
        ) {

            case "NORMAL_NEXT":
                return normalNextStatus
                    ? [normalNextStatus]
                    : []

            case "BACKWARD":
                return backwardStatuses

            case "CANCEL":
                return currentStatus ===
                    "CANCELLED"
                    ? []
                    : ["CANCELLED"]

            case "EMERGENCY":
                return [
                    ...ORDER_STATUS_FLOW,
                    "CANCELLED"
                ].filter(
                    status =>
                        status !==
                        currentStatus
                )

            default:
                return []
        }
    }

    function renderTargetOptions() {

        const targets =
            getTargetsForMode()

        targetSelect.innerHTML =
            targets.map(
                status => `
                    <option value="${
                        escapeStatusHtml(
                            status
                        )
                    }">
                        ${escapeStatusHtml(
                            formatOrderStatusLabel(
                                status
                            )
                        )}
                    </option>
                `
            )
            .join("")

        targetSelect.disabled =
            targets.length <= 1

        selectedRiderAction =
            "KEEP"

        updateStatusModalPreview()
    }

    function renderRiderActions(
        targetStatus
    ) {

        const target =
            normalizeOrderStatus(
                targetStatus
            )

        const targetIsTerminal =
            target === "DELIVERED" ||
            target === "CANCELLED"

        if (targetIsTerminal) {

            riderSection.style.display =
                "block"

            riderActions.innerHTML = `
                <label class="status-rider-option">
                    <input
                        type="radio"
                        name="statusRiderAction"
                        value="KEEP"
                        checked
                    >

                    <span>
                        <strong>
                            Keep Rider Details
                        </strong>

                        <span>
                            Rider का नाम और delivery history order में रहेगी, लेकिन active delivery बंद होगी।
                        </span>
                    </span>
                </label>
            `

            selectedRiderAction =
                "KEEP"

            return
        }

        const hasRider =
            Boolean(
                currentOrder.riderId
            )

        riderSection.style.display =
            "block"

        riderActions.innerHTML = `
            <label class="status-rider-option">
                <input
                    type="radio"
                    name="statusRiderAction"
                    value="KEEP"
                    checked
                >

                <span>
                    <strong>
                        Status Only — Keep Rider
                    </strong>

                    <span>
                        केवल status बदलेगा। ${
                            hasRider

                            ?

                            `${escapeStatusHtml(
                                currentOrder.riderName ||
                                "Current rider"
                            )} order से नहीं हटेगा।`

                            :

                            "अभी कोई rider assigned नहीं है।"
                        }
                    </span>
                </span>
            </label>

            ${
                hasRider &&
                (
                    currentStatus ===
                        "DELIVERED" ||
                    currentStatus ===
                        "CANCELLED"
                ) &&
                isRiderAssignmentStatus(
                    target
                )

                ?

                `
                    <label class="status-rider-option">
                        <input
                            type="radio"
                            name="statusRiderAction"
                            value="SAME_RIDER"
                        >

                        <span>
                            <strong>
                                Resume With Same Rider
                            </strong>

                            <span>
                                उसी rider को दोबारा active करके delivery resume होगी।
                            </span>
                        </span>
                    </label>
                `

                :

                ""
            }

            ${
                isRiderAssignmentStatus(
                    target
                )

                ?

                `
                    <label class="status-rider-option">
                        <input
                            type="radio"
                            name="statusRiderAction"
                            value="CHANGE_RIDER"
                        >

                        <span>
                            <strong>
                                Change / Assign Rider
                            </strong>

                            <span>
                                Status save होने के बाद rider selection खुलेगा। Current rider नया rider accept होने तक रहेगा।
                            </span>
                        </span>
                    </label>
                `

                :

                ""
            }

            ${
                hasRider

                ?

                `
                    <label class="status-rider-option">
                        <input
                            type="radio"
                            name="statusRiderAction"
                            value="REMOVE_RIDER"
                        >

                        <span>
                            <strong>
                                Remove Rider / Send To All
                            </strong>

                            <span>
                                Rider fields साफ होंगी। यह option चुनने पर ही rider हटेगा।
                            </span>
                        </span>
                    </label>
                `

                :

                ""
            }
        `

        riderActions
            .querySelectorAll(
                'input[name="statusRiderAction"]'
            )
            .forEach(
                input => {

                    input.onchange =
                        () => {

                            selectedRiderAction =
                                input.value

                            updateEffectBox()
                            validateStatusForm()
                        }
                }
            )
    }

    function updateEffectBox() {

        const targetStatus =
            normalizeOrderStatus(
                targetSelect.value
            )

        let effect =
            "केवल selected status change होगा।"

        if (
            targetStatus ===
            "READY_FOR_PICKUP"
        ) {

            effect =
                "Order pickup के लिए ready माना जाएगा। Rider अपने-आप remove नहीं होगा।"
        }

        if (
            targetStatus ===
            "DELIVERED"
        ) {

            effect =
                "Order complete होगा, rider active delivery से free होगा और rider details history में रहेंगी।"
        }

        if (
            targetStatus ===
            "CANCELLED"
        ) {

            effect =
                "Order cancel होगा, active delivery बंद होगी और minimum 10 characters reason save होगा।"
        }

        if (
            selectedMode ===
            "BACKWARD"
        ) {

            effect +=
                " यह backward change है; पुरानी status history delete नहीं होगी।"
        }

        if (
            selectedMode ===
            "EMERGENCY"
        ) {

            effect +=
                " Emergency Override audit history में अलग से save होगा।"
        }

        if (
            selectedRiderAction ===
            "SAME_RIDER"
        ) {

            effect +=
                " Same rider को active order पर वापस लगाया जाएगा।"
        }

        if (
            selectedRiderAction ===
            "CHANGE_RIDER"
        ) {

            effect +=
                " Status save होने के बाद rider selection खुलेगा।"
        }

        if (
            selectedRiderAction ===
            "REMOVE_RIDER"
        ) {

            effect +=
                " Current rider और pending rider request साफ होगी।"
        }

        effectBox.textContent =
            effect
    }

    function validateStatusForm() {

        const targetStatus =
            normalizeOrderStatus(
                targetSelect.value
            )

        const reason =
            reasonInput.value.trim()

        const minimumReasonLength =
            getRequiredReasonLength(
                currentStatus,
                targetStatus,
                selectedMode
            )

        const reasonIsValid =
            minimumReasonLength === 0 ||
            reason.length >=
                minimumReasonLength

        const emergencyIsValid =
            selectedMode !==
                "EMERGENCY" ||
            emergencyCheckbox.checked

        confirmButton.disabled =
            !targetStatus ||
            targetStatus ===
                currentStatus ||
            !reasonIsValid ||
            !emergencyIsValid
    }

    function updateStatusModalPreview() {

        const targetStatus =
            normalizeOrderStatus(
                targetSelect.value
            )

        statusDescription.textContent =
            getStatusDescription(
                targetStatus
            )

        const minimumReasonLength =
            getRequiredReasonLength(
                currentStatus,
                targetStatus,
                selectedMode
            )

        reasonLabel.textContent =
            minimumReasonLength

            ?

            `Reason (Minimum ${
                minimumReasonLength
            } Characters)`

            :

            "Reason (Optional)"

        reasonHelp.textContent =
            minimumReasonLength

            ?

            `कम से कम ${
                minimumReasonLength
            } characters जरूरी हैं।`

            :

            "Normal next step के लिए reason optional है।"

        emergencyConfirm
            .classList
            .toggle(
                "show",
                selectedMode ===
                    "EMERGENCY"
            )

        confirmButton
            .classList
            .toggle(
                "emergency",
                selectedMode ===
                    "EMERGENCY"
            )

        confirmButton.textContent =
            selectedMode ===
                "EMERGENCY"

            ?

            "Confirm Emergency Change"

            :

            "Confirm Status Change"

        renderRiderActions(
            targetStatus
        )

        updateEffectBox()
        validateStatusForm()
    }

    modal
        .querySelectorAll(
            "[data-status-mode]"
        )
        .forEach(
            modeButton => {

                modeButton.onclick =
                    () => {

                        if (
                            modeButton.disabled
                        ) return

                        selectedMode =
                            modeButton.dataset
                                .statusMode

                        modal
                            .querySelectorAll(
                                "[data-status-mode]"
                            )
                            .forEach(
                                button =>
                                    button
                                        .classList
                                        .toggle(
                                            "active",
                                            button ===
                                                modeButton
                                        )
                            )

                        emergencyCheckbox.checked =
                            false

                        reasonInput.value =
                            ""

                        reasonCounter.textContent =
                            "0 characters"

                        renderTargetOptions()
                    }
            }
        )

    targetSelect.onchange =
        () => {

            selectedRiderAction =
                "KEEP"

            updateStatusModalPreview()
        }

    reasonInput.oninput =
        () => {

            reasonCounter.textContent =
                `${
                    reasonInput
                        .value
                        .trim()
                        .length
                } characters`

            validateStatusForm()
        }

    emergencyCheckbox.onchange =
        validateStatusForm

    confirmButton.onclick =
        async () => {

            const targetStatus =
                normalizeOrderStatus(
                    targetSelect.value
                )

            const reason =
                reasonInput
                    .value
                    .trim()

            const minimumReasonLength =
                getRequiredReasonLength(
                    currentStatus,
                    targetStatus,
                    selectedMode
                )

            if (
                minimumReasonLength &&
                reason.length <
                    minimumReasonLength
            ) {

                alert(
                    `❌ Reason must be minimum ${
                        minimumReasonLength
                    } characters`
                )

                return
            }

            if (
                selectedMode ===
                    "EMERGENCY" &&
                !emergencyCheckbox.checked
            ) {

                alert(
                    "❌ Emergency confirmation checkbox select करें।"
                )

                return
            }

            const confirmed =
                confirm(
                    `${
                        selectedMode ===
                            "EMERGENCY"

                        ?

                        "EMERGENCY STATUS CHANGE"

                        :

                        "CONFIRM STATUS CHANGE"
                    }\n\n` +
                    `${
                        formatOrderStatusLabel(
                            currentStatus
                        )
                    } → ${
                        formatOrderStatusLabel(
                            targetStatus
                        )
                    }\n\n` +
                    `Rider Action: ${
                        selectedRiderAction
                    }`
                )

            if (!confirmed) return

            confirmButton.disabled =
                true

            confirmButton.textContent =
                "Updating..."

            try {

                const updatedOrder =
                    await applySafeStatusChange(
                        currentOrder,
                        targetStatus,
                        selectedMode,
                        reason,
                        selectedRiderAction
                    )

                closeModal()

                alert(
                    `✅ Status Changed\n\n${
                        formatOrderStatusLabel(
                            currentStatus
                        )
                    } → ${
                        formatOrderStatusLabel(
                            targetStatus
                        )
                    }`
                )

                if (
                    selectedRiderAction ===
                    "CHANGE_RIDER" &&
                    isActiveDeliveryStatus(
                        targetStatus
                    )
                ) {

                    await openRiderSelectionModal(
                        updatedOrder
                    )
                }
            }

            catch (error) {

                console.error(
                    "Safe status change failed:",
                    error
                )

                alert(
                    error.message ||
                    "❌ Status change failed"
                )

                confirmButton.disabled =
                    false

                confirmButton.textContent =
                    selectedMode ===
                        "EMERGENCY"

                    ?

                    "Confirm Emergency Change"

                    :

                    "Confirm Status Change"
            }
        }

    const defaultModeButton =
        modal.querySelector(
            `[data-status-mode="${
                defaultMode
            }"]`
        )

    if (defaultModeButton) {

        defaultModeButton
            .classList
            .add("active")
    }

    renderTargetOptions()
}

async function applySafeStatusChange(
    currentOrder,
    targetStatus,
    mode,
    reason,
    riderAction
) {

    const freshSnapshot =
        await getDoc(ref)

    if (!freshSnapshot.exists()) {

        throw new Error(
            "❌ Order not found"
        )
    }

    const freshOrder =
        freshSnapshot.data()

    const currentStatus =
        normalizeOrderStatus(
            freshOrder.status
        )

    const expectedStatus =
        normalizeOrderStatus(
            currentOrder.status
        )

    const target =
        normalizeOrderStatus(
            targetStatus
        )

    if (
        currentStatus !==
        expectedStatus
    ) {

        throw new Error(
            `❌ Order status already changed to ${
                formatOrderStatusLabel(
                    currentStatus
                )
            }. Modal दोबारा खोलें।`
        )
    }

    if (
        target ===
        currentStatus
    ) {

        throw new Error(
            "❌ Current और target status same हैं।"
        )
    }

    if (
        mode ===
            "NORMAL_NEXT" &&
        getNormalNextStatus(
            currentStatus
        ) !== target
    ) {

        throw new Error(
            "❌ Forward status केवल one-by-one change हो सकता है।"
        )
    }

    if (
        mode ===
        "BACKWARD"
    ) {

        const allowedBackwardStatuses =
            getBackwardStatuses(
                currentStatus,
                freshOrder
            )

        if (
            !allowedBackwardStatuses
                .includes(target)
        ) {

            throw new Error(
                "❌ Selected backward status allowed नहीं है।"
            )
        }
    }

    if (
        mode === "CANCEL" &&
        target !== "CANCELLED"
    ) {

        throw new Error(
            "❌ Invalid cancel status."
        )
    }

    if (
        riderAction ===
            "CHANGE_RIDER" &&
        !isRiderAssignmentStatus(
            target
        )
    ) {

        throw new Error(
            "❌ इस status में rider assign नहीं किया जा सकता।"
        )
    }

    if (
        riderAction ===
        "SAME_RIDER"
    ) {

        if (
            !freshOrder.riderId ||
            !isRiderAssignmentStatus(
                target
            )
        ) {

            throw new Error(
                "❌ Same rider के साथ delivery resume नहीं हो सकती।"
            )
        }

        const ordersSnapshot =
            await getDocs(
                collection(
                    db,
                    "orders"
                )
            )

        const activeStatuses = [
            "PREPARING",
            "READY_FOR_PICKUP",
            "RIDER_ASSIGNED",
            "RIDER_ACCEPTED",
            "REACHED_RESTAURANT",
            "PICKED_UP",
            "OUT_FOR_DELIVERY"
        ]

        let activeOrderCount = 0

        ordersSnapshot.forEach(
            orderDocument => {

                if (
                    orderDocument.id ===
                    orderId
                ) return

                const otherOrder =
                    orderDocument.data()

                const otherStatus =
                    normalizeOrderStatus(
                        otherOrder
                            .deliveryStatus ||
                        otherOrder.status
                    )

                if (
                    otherOrder.riderId ===
                        freshOrder.riderId &&
                    activeStatuses.includes(
                        otherStatus
                    )
                ) {

                    activeOrderCount += 1
                }
            }
        )

        if (
            activeOrderCount >= 2
        ) {

            throw new Error(
                "❌ Same rider के पास पहले से 2 active orders हैं।"
            )
        }
    }

    const minimumReasonLength =
        getRequiredReasonLength(
            currentStatus,
            target,
            mode
        )

    if (
        minimumReasonLength &&
        reason.trim().length <
            minimumReasonLength
    ) {

        throw new Error(
            `❌ Reason must be minimum ${
                minimumReasonLength
            } characters`
        )
    }

    const now =
        Date.now()

    const statusReason =
        reason.trim() ||
        "Normal status progression"

    const updateData = {
        status:
            target,

        deliveryStatus:
            target,

        previousStatus:
            currentStatus,

        statusChangedBy:
            "ADMIN",

        statusChangedById:
            auth.currentUser
                ?.uid || "",

        adminStatusReason:
            statusReason,

        adminStatusTarget:
            target,

        adminStatusPrevious:
            currentStatus,

        statusChangeMode:
            mode,

        statusRiderAction:
            riderAction,

        statusChangedAt:
            now,

        updatedAt:
            now,

        lastUpdatedBy:
            "ADMIN",

        statusHistory:
            arrayUnion({
                fromStatus:
                    currentStatus,

                toStatus:
                    target,

                reason:
                    statusReason,

                mode,

                riderAction,

                changedBy:
                    "ADMIN",

                changedById:
                    auth.currentUser
                        ?.uid || "",

                changedAt:
                    now
            })
    }

    if (
        target === "CANCELLED"
    ) {

        updateData.statusBeforeCancel =
            currentStatus

        updateData.cancelReason =
            reason.trim()

        updateData.cancelledBy =
            "ADMIN"

        updateData.cancelledAt =
            now

        updateData.riderOperationalActive =
            false

        updateData.pendingRiderId =
            ""

        updateData.pendingRiderName =
            ""

        updateData.pendingRiderPhone =
            ""

        updateData.pendingRiderRequestStatus =
            ""

        updateData.riderChangePending =
            false
    }

    else {

        updateData.cancelReason =
            ""

        updateData.cancelledBy =
            ""

        updateData.cancelledAt =
            null
    }

    if (
        target === "DELIVERED"
    ) {

        updateData.riderOperationalActive =
            false

        updateData.pendingRiderId =
            ""

        updateData.pendingRiderName =
            ""

        updateData.pendingRiderPhone =
            ""

        updateData.pendingRiderRequestStatus =
            ""

        updateData.riderChangePending =
            false
    }

    if (
        riderAction ===
            "REMOVE_RIDER" &&
        isActiveDeliveryStatus(
            target
        )
    ) {

        updateData.riderId =
            ""

        updateData.riderName =
            ""

        updateData.riderPhone =
            ""

        updateData.riderAssigned =
            false

        updateData.riderRequestStatus =
            ""

        updateData.pendingRiderId =
            ""

        updateData.pendingRiderName =
            ""

        updateData.pendingRiderPhone =
            ""

        updateData.pendingRiderRequestStatus =
            ""

        updateData.riderChangePending =
            false

        updateData.riderOperationalActive =
            false
    }

    if (
        riderAction ===
            "SAME_RIDER" &&
        freshOrder.riderId &&
        isRiderAssignmentStatus(
            target
        )
    ) {

        updateData.riderAssigned =
            true

        updateData.riderRequestStatus =
            "ACCEPTED"

        updateData.riderOperationalActive =
            true

        updateData.pendingRiderId =
            ""

        updateData.pendingRiderName =
            ""

        updateData.pendingRiderPhone =
            ""

        updateData.pendingRiderRequestStatus =
            ""

        updateData.riderChangePending =
            false

        updateData.navigationStage =
            [
                "PICKED_UP",
                "OUT_FOR_DELIVERY"
            ].includes(target)

            ?

            "TO_CUSTOMER"

            :

            "TO_RESTAURANT"
    }

    const batch =
        writeBatch(db)

    batch.update(
        ref,
        updateData
    )

    const previousRiderId =
        freshOrder.riderId || ""

    if (previousRiderId) {

        const riderReference =
            doc(
                db,
                "riders",
                previousRiderId
            )

        const riderSnapshot =
            await getDoc(
                riderReference
            )

        if (riderSnapshot.exists()) {

            const riderData =
                riderSnapshot.data()

            const riderUpdate = {
                updatedAt:
                    now
            }

            const enteringDelivered =
                currentStatus !==
                    "DELIVERED" &&
                target ===
                    "DELIVERED"

            const leavingDelivered =
                currentStatus ===
                    "DELIVERED" &&
                target !==
                    "DELIVERED"

            if (enteringDelivered) {

                riderUpdate.totalDeliveries =
                    Number(
                        riderData
                            .totalDeliveries ||
                        0
                    ) + 1
            }

            if (leavingDelivered) {

                riderUpdate.totalDeliveries =
                    Math.max(
                        0,
                        Number(
                            riderData
                                .totalDeliveries ||
                            0
                        ) - 1
                    )
            }

            if (
                target ===
                    "DELIVERED" ||
                target ===
                    "CANCELLED" ||
                riderAction ===
                    "REMOVE_RIDER"
            ) {

                if (
                    riderData
                        .activeOrderId ===
                    orderId
                ) {

                    riderUpdate.activeOrderId =
                        ""
                }
            }

            if (
                riderAction ===
                    "SAME_RIDER" &&
                isRiderAssignmentStatus(
                    target
                )
            ) {

                riderUpdate.activeOrderId =
                    orderId
            }

            batch.update(
                riderReference,
                riderUpdate
            )
        }
    }

    await batch.commit()

    return {
        ...freshOrder,
        ...updateData,
        status:
            target,
        deliveryStatus:
            target
    }
}

function escapeStatusHtml(value) {

    return String(
        value ?? ""
    )
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        )
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

// PRINT INVOICE

function buildPrintInvoice(order) {

    const fullOrderId =
        order.orderId || orderId || "-"

    const itemTotal =
        Number(order.itemTotal || 0)

    const deliveryFee =
        Number(order.deliveryFee || 0)

    const packagingFee =
        Number(order.packagingFee || 0)

    const platformFee =
        Number(order.platformFee || 0)

    const surgeFee =
        Number(order.surgeFee || 0)

    const gstOnItems =
        Number(order.gstOnItems || 0)

    const gstOnDelivery =
        Number(order.gstOnDelivery || 0)

    const gstOnPackaging =
        Number(order.gstOnPackaging || 0)

    const gstOnPlatform =
        Number(order.gstOnPlatform || 0)

    const discount =
        Number(order.discount || 0)

    const tip =
        Number(order.tip || 0)

    const calculatedTotal =
        itemTotal +
        deliveryFee +
        packagingFee +
        platformFee +
        surgeFee +
        gstOnItems +
        gstOnDelivery +
        gstOnPackaging +
        gstOnPlatform +
        tip -
        discount

    const grandTotal =
        Number(
            order.total ??
            calculatedTotal
        )

    const paymentStatus =
        order.paymentReceived

            ? "RECEIVED"

            : order.cashCollected

                ? "RECEIVED BY RIDER"

                : "NOT RECEIVED"

    const adminTarget =
        String(
            order.adminStatusTarget || ""
        ).toUpperCase()

    const adminClass =
        adminTarget === "APPROVED"

            ? "invoice-admin-approved"

            : "invoice-admin-cancelled"

    return `

<section
id="printInvoice"
class="print-invoice"
>

<header class="invoice-header">

<div>

<div class="invoice-brand">
VeggieGo
</div>

<div class="invoice-tagline">
Pure Veg Food Delivery
</div>

</div>

<div class="invoice-heading">

<h1>
ORDER INVOICE
</h1>

<p>
Order ID:
<strong>
${fullOrderId}
</strong>
</p>

<p>
Date:
${formatDate(order.timestamp)}
</p>

</div>

</header>

<div class="invoice-status-row">

<span>
Status
</span>

<strong>
${order.status || "PENDING"}
</strong>

</div>

<div class="invoice-info-grid">

<div class="invoice-info-card">

<h3>
Restaurant Details
</h3>

<p>
<strong>
${order.restaurantName || "VeggieGo Restaurant"}
</strong>
</p>

<p>
${order.restaurantAddress || order.restaurantArea || "-"}
</p>

<p>
Phone:
${order.restaurantPhone || "-"}
</p>

<p>
Store ID:
${order.restaurantId || order.storeId || "-"}
</p>

</div>

<div class="invoice-info-card">

<h3>
Customer Details
</h3>

<p>
<strong>
${order.customerName || "-"}
</strong>
</p>

<p>
Phone:
${order.customerPhone || "-"}
</p>

<p>
${

    [
        order.house,
        order.area,
        order.landmark,
        order.city,
        order.pincode
    ]
        .filter(Boolean)
        .join(", ")

    || "-"

}
</p>

</div>

<div class="invoice-info-card">

<h3>
Rider Details
</h3>

<p>
<strong>
${order.riderName || "Not Assigned"}
</strong>
</p>

<p>
Phone:
${order.riderPhone || "-"}
</p>

<p>
Rider ID:
${order.riderId || "-"}
</p>

</div>

<div class="invoice-info-card">

<h3>
Payment Details
</h3>

<p>
Method:
<strong>
${order.paymentMethod || "COD"}
</strong>
</p>

<p>
Payment:
<strong>
${paymentStatus}
</strong>
</p>

<p>
Items:
${getTotalItems(order.items)}
</p>

</div>

</div>

${

    order.adminStatusReason

        ? `

<div
class="invoice-admin-box ${adminClass}"
>

<div>

<h3>
Admin Status Change
</h3>

<p>
Status:
<strong>
${order.adminStatusTarget || "-"}
</strong>
</p>

<p>
Reason:
${order.adminStatusReason}
</p>

</div>

<strong class="invoice-admin-badge">
ADMIN
</strong>

</div>

`

        : ""

}

<table class="invoice-items-table">

<thead>

<tr>

<th>
Item Details
</th>

<th>
Qty
</th>

<th>
Rate
</th>

<th>
Amount
</th>

</tr>

</thead>

<tbody>

${formatInvoiceItems(order.items)}

</tbody>

</table>

<div class="invoice-bottom-grid">

<div class="invoice-note">

<h3>
Order Note
</h3>

<p>
${

    order.orderNote ||
    order.customerNote ||
    "No special instruction"

}
</p>

</div>

<div class="invoice-totals">

${invoiceAmountRow(
    "Item Total",
    itemTotal
)}

${invoiceAmountRow(
    "Delivery Fee",
    deliveryFee
)}

${invoiceAmountRow(
    "Packaging Fee",
    packagingFee
)}

${invoiceAmountRow(
    "Platform Fee",
    platformFee
)}

${invoiceAmountRow(

    order.surgeReason

        ? `Surge Fee (${order.surgeReason})`

        : "Surge Fee",

    surgeFee
)}

${invoiceAmountRow(
    "GST on Items",
    gstOnItems
)}

${invoiceAmountRow(
    "GST on Delivery",
    gstOnDelivery
)}

${invoiceAmountRow(
    "GST on Packaging",
    gstOnPackaging
)}

${invoiceAmountRow(
    "GST on Platform",
    gstOnPlatform
)}

${invoiceAmountRow(
    "Tip",
    tip
)}

${invoiceAmountRow(
    "Discount",
    discount,
    true
)}

<div class="invoice-grand-total">

<span>
Grand Total
</span>

<strong>
₹${money(grandTotal)}
</strong>

</div>

</div>

</div>

<footer class="invoice-footer">

<p>
Thank you for ordering with VeggieGo.
</p>

<p>
This is a computer-generated invoice.
</p>

</footer>

</section>

`
}

function formatInvoiceItems(items) {

    if (
        !items ||
        items.length === 0
    ) {

        return `

<tr>

<td colspan="4">
No items found
</td>

</tr>

`
    }

    return items.map(item => {

        const quantity =
            Number(
                item.quantity || 1
            )

        const rate =
            Number(

                item.variantPrice ||

                item.price ||

                0
            )

        const amount =
            Number(

                item.itemTotal ??

                (
                    quantity *
                    rate
                )
            )

        const variant =
            item.variant

                ? `

<div class="invoice-item-extra">

Variant:
${item.variant}

</div>

`

                : ""

        const addons =
            Array.isArray(
                item.addons
            )

            &&

            item.addons.length > 0

                ? `

<div class="invoice-item-extra">

Add-ons:

${

    item.addons

        .map(addon =>

            `${

                addon.name ||
                "Addon"

            } (+₹${

                money(
                    addon.price || 0
                )

            })`
        )

        .join(", ")

}

</div>

`

                : ""

        return `

<tr>

<td>

<strong>
${item.name || "Item"}
</strong>

${variant}

${addons}

</td>

<td>
${quantity}
</td>

<td>
₹${money(rate)}
</td>

<td>
₹${money(amount)}
</td>

</tr>

`

    }).join("")
}

function invoiceAmountRow(
    label,
    amount,
    subtract = false
) {

    if (
        Number(amount || 0) === 0
    ) {

        return ""
    }

    return `

<div class="invoice-total-row">

<span>
${label}
</span>

<strong>
${subtract ? "- " : ""}₹${money(amount)}
</strong>

</div>

`
}

function money(value) {

    return Number(
        value || 0
    ).toFixed(2)
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
        ...ORDER_STATUS_FLOW,
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
// =====================================================
// MANUAL RIDER SELECTION
// =====================================================

async function openRiderSelectionModal(
    currentOrder
) {

    let existingModal =
        document.getElementById(
            "riderSelectionModal"
        )

    if (existingModal) {

        existingModal.remove()
    }

    const modal =
        document.createElement(
            "div"
        )

    modal.id =
        "riderSelectionModal"

    modal.className =
        "rider-selection-modal"

    modal.innerHTML = `

<div class="rider-selection-box">

<div class="rider-selection-header">

<div>

<h2>
🛵 Select Rider
</h2>

<p>
Choose an online approved rider
</p>

</div>

<button
id="closeRiderModalBtn"
class="close-rider-modal"
>
✕
</button>

</div>

<div
id="riderSelectionList"
class="rider-selection-list"
>

<div class="rider-loading">

Loading available riders...

</div>

</div>

</div>

`

    document.body.appendChild(
        modal
    )

    const closeButton =
        document.getElementById(
            "closeRiderModalBtn"
        )

    closeButton.onclick = () => {

        modal.remove()
    }

    modal.onclick = event => {

        if (
            event.target === modal
        ) {

            modal.remove()
        }
    }

    await loadRidersForSelection(
        currentOrder,
        modal
    )
}


// =====================================================
// LOAD RIDERS
// =====================================================

async function loadRidersForSelection(
    currentOrder,
    modal
) {

    const list =
        document.getElementById(
            "riderSelectionList"
        )

    try {

        const [
            ridersSnapshot,
            ordersSnapshot
        ] = await Promise.all([

            getDocs(
                collection(
                    db,
                    "riders"
                )
            ),

            getDocs(
                collection(
                    db,
                    "orders"
                )
            )
        ])

        const activeOrderStatuses = [

    "PREPARING",
    "READY_FOR_PICKUP",
    "RIDER_ASSIGNED",
    "RIDER_ACCEPTED",
    "REACHED_RESTAURANT",
    "PICKED_UP",
    "OUT_FOR_DELIVERY"
]

        const riders = []

        ridersSnapshot.forEach(
            riderDocument => {

                const rider =
                    riderDocument.data()

                const riderStatus =
                    String(
                        rider.status || ""
                    ).toUpperCase()

                if (

                    rider.online !== true ||

                    riderStatus !== "APPROVED"

                ) {

                    return
                }

                let activeOrderCount = 0

                ordersSnapshot.forEach(
                    orderDocument => {

                        const order =
                            orderDocument.data()

                        const status =
                            String(

                                order.deliveryStatus ||

                                order.status ||

                                ""

                            ).toUpperCase()

                        if (

                            order.riderId ===
                                riderDocument.id

                            &&

                            orderDocument.id !==
                                orderId

                            &&

                            activeOrderStatuses
                                .includes(
                                    status
                                )

                        ) {

                            activeOrderCount++
                        }
                    }
                )

                riders.push({

                    id:
                        riderDocument.id,

                    name:
                        rider.name ||
                        "Unnamed Rider",

                    phone:
                        rider.phone ||
                        rider.mobile ||
                        "-",

                    activeOrderId:
                        rider.activeOrderId ||
                        "",

                    activeOrderCount:
                        activeOrderCount,

                    full:
    activeOrderCount >= 2
                })
            }
        )

        riders.sort(
            (
                firstRider,
                secondRider
            ) => {

                return (

                    firstRider
                        .activeOrderCount

                    -

                    secondRider
                        .activeOrderCount
                )
            }
        )

        if (
            riders.length === 0
        ) {

            list.innerHTML = `

<div class="no-rider-found">

❌ No online approved rider available

</div>

`

            return
        }

        list.innerHTML =
            riders
                .map(
                    rider => {

                        return `

<div
class="
rider-select-card
${rider.full
    ? "rider-capacity-full"
    : ""
}
"
>

<div class="rider-select-info">

<div class="rider-select-name">

🟢 ${escapeRiderHtml(
    rider.name
)}

</div>

<div class="rider-select-phone">

📞 ${escapeRiderHtml(
    rider.phone
)}

</div>

<div class="rider-select-id">

ID:
${escapeRiderHtml(
    rider.id
)}

</div>

</div>

<div class="rider-select-capacity">

<div
class="
rider-capacity-badge
${rider.full
    ? "capacity-full"
    : ""
}
"
>

${rider.activeOrderCount}/2 Orders

</div>

<button
class="assign-rider-btn"
data-rider-id="${rider.id}"
${rider.full ? "disabled" : ""}
>

SEND ORDER REQUEST

</button>

</div>

</div>

`
                    }
                )
                .join("")

        const assignButtons =
            list.querySelectorAll(
                ".assign-rider-btn:not([disabled])"
            )

        assignButtons.forEach(
            button => {

                button.onclick =
                    async () => {

                        const selectedRiderId =
                            button.dataset
                                .riderId

                        const selectedRider =
                            riders.find(
                                rider =>
                                    rider.id ===
                                    selectedRiderId
                            )

                        if (
                            !selectedRider
                        ) {

                            return
                        }

                        await assignRiderToOrder(

                            currentOrder,

                            selectedRider,

                            button,

                            modal
                        )
                    }
            }
        )

    } catch (error) {

        console.error(
            "Rider load error:",
            error
        )

        list.innerHTML = `

<div class="no-rider-found">

❌ Unable to load riders

</div>

`
    }
}


// =====================================================
// ASSIGN RIDER
// =====================================================

async function assignRiderToOrder(

    currentOrder,

    selectedRider,

    button,

    modal

) {

    const hasCurrentRider =
        Boolean(
            currentOrder.riderId
        )

    const actionName =
        hasCurrentRider

            ? "Change rider"

            : "Assign rider"

    const confirmed =
        confirm(

`${actionName} to ${selectedRider.name}?

Current active orders: ${selectedRider.activeOrderCount}/2

${
    hasCurrentRider

        ? "Current rider will continue until the new rider accepts."

        : "The rider will receive this request in Pending Orders."
}`
        )

    if (!confirmed) {

        return
    }

    button.disabled =
        true

    button.innerText =

        hasCurrentRider

            ? "SENDING CHANGE REQUEST..."

            : "ASSIGNING..."

    try {

        const now =
            Date.now()

        // ==========================================
        // CHANGE RIDER FLOW
        // ==========================================

        if (
            hasCurrentRider
        ) {

            // Same rider ko dobara request nahi bhejni
            if (
                currentOrder.riderId ===
                selectedRider.id
            ) {

                alert(
                    "❌ This rider is already assigned to this order."
                )

                button.disabled =
                    false

                button.innerText =
                    "SEND ORDER REQUEST"

                return
            }

            await updateDoc(

                ref,

                {

                    // New rider request fields
                    pendingRiderId:
                        selectedRider.id,

                    pendingRiderName:
                        selectedRider.name,

                    pendingRiderPhone:

                        selectedRider.phone === "-"

                            ? ""

                            : selectedRider.phone,

                    pendingRiderRequestStatus:
                        "PENDING",

                    riderChangePending:
                        true,

                    riderChangeRequestedAt:
                        now,

                    riderChangeRequestedBy:
                        "ADMIN",

                    updatedAt:
                        now,

                    lastUpdatedBy:
                        "ADMIN"
                }
            )

            modal.remove()

            alert(

`✅ Rider change request sent to ${selectedRider.name}

Current rider:
${currentOrder.riderName || "Assigned Rider"}

Current rider will continue the delivery until ${selectedRider.name} accepts the request.`
            )

            return
        }

        // ==========================================
        // NORMAL FIRST RIDER ASSIGNMENT
        // ==========================================

        await updateDoc(

            ref,

            {

                riderId:
                    selectedRider.id,

                riderName:
                    selectedRider.name,

                riderPhone:

                    selectedRider.phone === "-"

                        ? ""

                        : selectedRider.phone,

                // Rider accepts tab true hoga
                riderAssigned:
                    false,

                // Rider app Pending Orders me request
                riderRequestStatus:
                    "PENDING",

                navigationStage:
                    "TO_RESTAURANT",

                riderRequestSentAt:
                    now,

                assignedAt:
                    now,

                // Purane pending-change fields clean
                pendingRiderId:
                    "",

                pendingRiderName:
                    "",

                pendingRiderPhone:
                    "",

                pendingRiderRequestStatus:
                    "",

                riderChangePending:
                    false,

                updatedAt:
                    now,

                lastUpdatedBy:
                    "ADMIN"
            }
        )

        modal.remove()

        alert(

`✅ Order request sent to ${selectedRider.name}

Rider ko Pending Orders me request dikhai degi.

Accept karne ke baad order Active Orders me aayega.`
        )

    } catch (error) {

        console.error(

            hasCurrentRider

                ? "Change rider error:"

                : "Assign rider error:",

            error
        )

        button.disabled =
            false

        button.innerText =
            "SEND ORDER REQUEST"

        alert(

            hasCurrentRider

                ? "❌ Rider change request failed"

                : "❌ Rider assignment failed"
        )
    }
}


// =====================================================
// SAFE HTML
// =====================================================

function escapeRiderHtml(
    value
) {

    return String(
        value || ""
    )

        .replaceAll(
            "&",
            "&amp;"
        )

        .replaceAll(
            "<",
            "&lt;"
        )

        .replaceAll(
            ">",
            "&gt;"
        )

        .replaceAll(
            '"',
            "&quot;"
        )

        .replaceAll(
            "'",
            "&#039;"
        )
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
}