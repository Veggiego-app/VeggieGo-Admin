import {
    db
}
from "./firebase.js"

import { auth } from "./firebase.js"

import {

    collection,
    query,
    onSnapshot,
    doc,
    updateDoc,
    writeBatch

}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"

import { signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"

document.getElementById("logoutBtn")?.addEventListener("click", () => {
    signOut(auth).then(() => {
        window.location.href = "login.html"
    })
})

const tbody =
    document.getElementById(
        "restaurantTable"
    )

const modal =
    document.getElementById(
        "zoneModal"
    )

const zoneSelect =
    document.getElementById(
        "zoneSelect"
    )

const approveReason =
    document.getElementById(
        "approveReason"
    )

const approveReasonCount =
    document.getElementById(
        "approveReasonCount"
    )

const rejectModal =
    document.getElementById(
        "rejectModal"
    )

const rejectReason =
    document.getElementById(
        "rejectReason"
    )

const rejectReasonCount =
    document.getElementById(
        "rejectReasonCount"
    )

let selectedRestaurantId =
    null

let selectedRejectRestaurantId =
    null

let draggedRow =
    null

let isSavingOrder =
    false

const q =
    query(

        collection(
            db,
            "restaurants"
        )
    )

onSnapshot(
    q,
    (snapshot) => {

        const restaurants =
    snapshot.docs
        .map(doc => ({

            id: doc.id,

            ...doc.data()
        }))
        .sort((a, b) => {

            const orderA =
                Number(
                    a.displayOrder
                ) || 999999

            const orderB =
                Number(
                    b.displayOrder
                ) || 999999

            if (orderA !== orderB) {

                return orderA - orderB
            }

            return (
                a.name || ""
            ).localeCompare(
                b.name || ""
            )
        })

        renderRestaurants(
            restaurants
        )

        updateCounts(
            restaurants
        )
    }
)

function renderRestaurants(
    restaurants
) {

    tbody.innerHTML = ""

    restaurants.forEach((r, index) => {

        const row =
            document.createElement(
                "tr"
            )

        row.draggable =
    false

row.dataset.restaurantId =
    r.id

row.classList.add(
    "restaurant-row"
)
            let liveStatusText =
    "CLOSED"

let liveStatusColor =
    "#dc2626"

if (
    r.temporaryClosed === true
) {

    liveStatusText =
        "TEMPORARILY CLOSED"

    liveStatusColor =
        "#f59e0b"

} else if (
    r.online !== true
) {

    liveStatusText =
        "OFFLINE"

    liveStatusColor =
        "#6b7280"

} else if (
    r.liveStatus === "OPEN"
    ||
    r.autoOpen === true
) {

    liveStatusText =
        "OPEN"

    liveStatusColor =
        "#16a34a"

} else {

    liveStatusText =
        "CLOSED"

    liveStatusColor =
        "#dc2626"
}
        row.innerHTML = `

<td
class="drag-handle"
title="Drag restaurant up or down"
>

<span class="row-number">
${index + 1}
</span>

<span class="drag-icon">
☰
</span>

</td>

<td>

<button
type="button"
class="restaurant-name-button"

onclick="
openRestaurant('${r.id}')
"
>

${r.name || "-"}

</button>

</td>

<td>
${r.restaurantPhone || "-"}
</td>

<td>
${r.ownerName || "-"}
</td>

<td>
${r.ownerPhone || "-"}
</td>

<td>
${r.email || "-"}
</td>

<td>
${r.zone || "-"}
</td>

<td>

<span
class="commission-badge ${hasCommissionPercent(r.commissionPercent) ? "commission-set" : "commission-not-set"}"
>

${formatCommissionPercent(r.commissionPercent)}

</span>

</td>

<td>

<span
class="status-badge-table"

style="
background:${getColor(r.status)}
"
>

${r.status || "PENDING"}

</span>

</td>
<td>

<span
class="status-badge-table"
style="
background:${liveStatusColor};
white-space:nowrap;
"
>

${liveStatusText}

</span>

</td>
<td>
${formatDate(r.createdAt)}
</td>

<td>

<button
class="action-btn approve-btn-table"

onclick="
openApproveModal('${r.id}')
"
>

APPROVE

</button>

<button
class="action-btn reject-btn-table"

onclick="
openRejectModal('${r.id}')
"
>

REJECT

</button>

<button
class="action-btn view-btn-table"

onclick="
openRestaurant('${r.id}')
"
>

VIEW

</button>

</td>

`

        tbody.appendChild(
            row
        )
    })
}
function updateRowNumbers() {

    const rows =
        tbody.querySelectorAll(
            ".restaurant-row"
        )

    rows.forEach(
        (row, index) => {

            const numberElement =
                row.querySelector(
                    ".row-number"
                )

            if (numberElement) {

                numberElement.innerText =
                    index + 1
            }
        }
    )
}

tbody.addEventListener(
    "mousedown",
    function(event) {

        const handle =
            event.target.closest(
                ".drag-handle"
            )

        if (!handle) {
            return
        }

        const row =
            handle.closest(
                ".restaurant-row"
            )

        if (row) {

            row.draggable =
                true
        }
    }
)
tbody.addEventListener(
    "mouseup",
    function(event) {

        const row =
            event.target.closest(
                ".restaurant-row"
            )

        if (row) {

            row.draggable =
                false
        }
    }
)
tbody.addEventListener(
    "dragstart",
    function(event) {

        const row =
            event.target.closest(
                ".restaurant-row"
            )

        if (!row) {
            return
        }

        draggedRow =
            row

        draggedRow.classList.add(
            "dragging"
        )

        event.dataTransfer.effectAllowed =
            "move"

        event.dataTransfer.setData(
            "text/plain",
            row.dataset.restaurantId
        )
    }
)
tbody.addEventListener(
    "dragover",
    function(event) {

        event.preventDefault()

        if (!draggedRow) {
            return
        }

        event.dataTransfer.dropEffect =
            "move"

        const targetRow =
            event.target.closest(
                ".restaurant-row"
            )

        if (
            !targetRow
            ||
            targetRow === draggedRow
        ) {
            return
        }

        const targetRectangle =
            targetRow.getBoundingClientRect()

        const targetMiddle =
            targetRectangle.top
            +
            targetRectangle.height / 2

        if (
            event.clientY < targetMiddle
        ) {

            tbody.insertBefore(
                draggedRow,
                targetRow
            )

        } else {

            tbody.insertBefore(
                draggedRow,
                targetRow.nextSibling
            )
        }

        updateRowNumbers()
    }
)
tbody.addEventListener(
    "dragend",
    async function() {

        if (!draggedRow) {
            return
        }

        draggedRow.classList.remove(
            "dragging"
        )

        draggedRow.draggable =
            false

        draggedRow =
            null

        updateRowNumbers()

        await saveRestaurantOrder()
    }
)
async function saveRestaurantOrder() {

    if (isSavingOrder) {
        return
    }

    const rows =
        Array.from(
            tbody.querySelectorAll(
                ".restaurant-row"
            )
        )

    if (rows.length === 0) {
        return
    }

    isSavingOrder =
        true

    try {

        const batch =
            writeBatch(db)

        rows.forEach(
            (row, index) => {

                const restaurantId =
                    row.dataset.restaurantId

                const displayOrder =
                    index + 1

                batch.update(

                    doc(
                        db,
                        "restaurants",
                        restaurantId
                    ),

                    {
                        displayOrder:
                            displayOrder
                    }
                )
            }
        )

        await batch.commit()

        console.log(
            "✅ Restaurant order saved successfully"
        )

    } catch(error) {

        console.error(
            "Restaurant order save error:",
            error
        )

        alert(
            "Restaurant order save nahi hua. Page refresh karke dobara try karein."
        )

    } finally {

        isSavingOrder =
            false
    }
}

function updateCounts(
    restaurants
) {

    const pending =
        restaurants.filter(

            r =>
                r.status ===
                "PENDING"

        ).length

    const approved =
        restaurants.filter(

            r =>
                r.status ===
                "APPROVED"

        ).length

    const rejected =
        restaurants.filter(

            r =>
                r.status ===
                "REJECTED"

        ).length

    document.getElementById(
        "pendingRestaurants"
    ).innerText = pending

    document.getElementById(
        "approvedRestaurants"
    ).innerText = approved

    document.getElementById(
        "rejectedRestaurants"
    ).innerText = rejected

    document.getElementById(
        "totalRestaurants"
    ).innerText =
        restaurants.length
}

window.openApproveModal =
function(id) {

    selectedRestaurantId =
        id

    zoneSelect.value =
        ""

    approveReason.value =
        ""

    approveReasonCount.innerText =
        "Minimum 10 characters required"

    approveReasonCount.style.color =
        "#9ca3af"

    modal.style.display =
        "flex"
}

window.closeModal =
function() {

    modal.style.display =
        "none"

    selectedRestaurantId =
        null

    zoneSelect.value =
        ""

    approveReason.value =
        ""
}

approveReason
?.addEventListener(
    "input",
    function() {

        const length =
            approveReason
                .value
                .trim()
                .length

        approveReasonCount.innerText =
            `${length}/10 characters`

        if (length >= 10) {

            approveReasonCount.style.color =
                "#16a34a"

        } else {

            approveReasonCount.style.color =
                "#dc2626"
        }
    }
)

document
.getElementById(
    "confirmApprove"
)
.onclick =
async function() {

    const zone =
        zoneSelect.value

    const reason =
        approveReason
            .value
            .trim()

    if (!selectedRestaurantId) {

        alert(
            "Restaurant not selected"
        )

        return
    }

    if (!zone) {

        alert(
            "Please select a zone"
        )

        zoneSelect.focus()

        return
    }

    if (reason.length < 10) {

        alert(
            "Approval reason must be at least 10 characters."
        )

        approveReason.focus()

        return
    }

    const button =
        document.getElementById(
            "confirmApprove"
        )

    button.disabled =
        true

    button.innerText =
        "APPROVING..."

    try {

        await updateDoc(

            doc(
                db,
                "restaurants",
                selectedRestaurantId
            ),

            {

                status:
                    "APPROVED",

                zone:
                    zone,

                approvalReason:
                    reason,

                approvedAt:
                    Date.now(),

                rejectReason:
                    "",

                rejectedAt:
                    null
            }
        )

        alert(
            "✅ Restaurant Approved Successfully"
        )

        closeModal()

    } catch(error) {

        console.error(
            "Approve error:",
            error
        )

        alert(
            "Restaurant approve nahi hua. Please try again."
        )

    } finally {

        button.disabled =
            false

        button.innerText =
            "APPROVE"
    }
}

window.openRejectModal =
function(id) {

    selectedRejectRestaurantId =
        id

    rejectReason.value =
        ""

    rejectReasonCount.innerText =
        "Minimum 10 characters required"

    rejectReasonCount.style.color =
        "#9ca3af"

    rejectModal.style.display =
        "flex"
}

window.closeRejectModal =
function() {

    rejectModal.style.display =
        "none"

    selectedRejectRestaurantId =
        null

    rejectReason.value =
        ""
}
rejectReason
?.addEventListener(
    "input",
    function() {

        const length =
            rejectReason
                .value
                .trim()
                .length

        rejectReasonCount.innerText =
            `${length}/10 characters`

        if (length >= 10) {

            rejectReasonCount.style.color =
                "#16a34a"

        } else {

            rejectReasonCount.style.color =
                "#dc2626"
        }
    }
)
document
.getElementById(
    "confirmReject"
)
.onclick =
async function() {

    const reason =
        rejectReason
            .value
            .trim()

    if (!selectedRejectRestaurantId) {

        alert(
            "Restaurant not selected"
        )

        return
    }

    if (reason.length < 10) {

        alert(
            "Reject reason must be at least 10 characters."
        )

        rejectReason.focus()

        return
    }

    const button =
        document.getElementById(
            "confirmReject"
        )

    button.disabled =
        true

    button.innerText =
        "REJECTING..."

    try {

        await updateDoc(

            doc(
                db,
                "restaurants",
                selectedRejectRestaurantId
            ),

            {

                status:
                    "REJECTED",

                rejectReason:
                    reason,

                rejectedAt:
                    Date.now(),

                approvalReason:
                    "",

                approvedAt:
                    null
            }
        )

        alert(
            "❌ Restaurant Rejected Successfully"
        )

        closeRejectModal()

    } catch(error) {

        console.error(
            "Reject error:",
            error
        )

        alert(
            "Restaurant reject nahi hua. Please try again."
        )

    } finally {

        button.disabled =
            false

        button.innerText =
            "REJECT"
    }
}

function hasCommissionPercent(value) {

    if (
        value === null
        ||
        value === undefined
        ||
        value === ""
    ) {
        return false
    }

    const commissionPercent =
        Number(value)

    return (
        Number.isFinite(commissionPercent)
        &&
        commissionPercent >= 0
        &&
        commissionPercent <= 100
    )
}

function formatCommissionPercent(value) {

    if (!hasCommissionPercent(value)) {
        return "NOT SET"
    }

    return `${Number(value)}%`
}

function getColor(status) {

    switch(status) {

        case "APPROVED":
            return "#16a34a"

        case "REJECTED":
            return "#dc2626"

        default:
            return "#f59e0b"
    }
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
window.openRestaurant =
function(id) {

    window.location.href =

        `restaurant-details.html?id=${id}`
}
document
.getElementById(
    "addRestaurantBtn"
)
?.addEventListener(
    "click",
    () => {

        window.location.href =
        "add-restaurant.html"

    }
)