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
    updateDoc

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

let selectedRestaurantId =
    null

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
            snapshot.docs.map(doc => ({

                id: doc.id,

                ...doc.data()
            }))

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

    restaurants.forEach(r => {

        const row =
            document.createElement(
                "tr"
            )

        row.innerHTML = `

<td>
${r.name || "-"}
</td>

<td>
${r.ownerName || "-"}
</td>

<td>
${r.phone || "-"}
</td>

<td>
${r.email || "-"}
</td>

<td>
${r.zone || "-"}
</td>

<td>
${r.type || "Veg"}
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
background:
${r.online ? '#16a34a' : '#dc2626'}
"
>

${r.online ? 'ONLINE' : 'OFFLINE'}

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
rejectRestaurant('${r.id}')
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

    modal.style.display =
        "flex"
}

window.closeModal =
function() {

    modal.style.display =
        "none"
}

document
.getElementById(
    "confirmApprove"
)
.onclick =
async () => {

    const zone =
        zoneSelect.value

    if (!zone) {

        alert(
            "Select Zone"
        )

        return
    }

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

            approvedAt:
                Date.now()
        }
    )

    alert(
        "✅ Restaurant Approved"
    )

    closeModal()
}

window.rejectRestaurant =
async function(id) {

    const reason =
        prompt(
            "Reject Reason"
        )

    if (!reason)
        return

    await updateDoc(

        doc(
            db,
            "restaurants",
            id
        ),

        {

            status:
                "REJECTED",

            rejectReason:
                reason
        }
    )

    alert(
        "❌ Restaurant Rejected"
    )
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