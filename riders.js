import {
    db
}
from "./firebase.js"

import { auth } from "./firebase.js"

import {
    collection,
    onSnapshot,
    updateDoc,
    doc

}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"

import { signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"

document.getElementById("logoutBtn")?.addEventListener("click", () => {
    signOut(auth).then(() => {
        window.location.href = "login.html"
    })
})

const ridersTable =
    document.getElementById(
        "ridersTable"
    )

const totalRiders =
    document.getElementById(
        "totalRiders"
    )

const onlineRiders =
    document.getElementById(
        "onlineRiders"
    )

const activeDeliveries =
    document.getElementById(
        "activeDeliveries"
    )

let onlineCount = 0
let activeCount = 0

onSnapshot(

    collection(db, "riders"),

    (snapshot) => {

        ridersTable.innerHTML = ""

        totalRiders.innerHTML =
            snapshot.size

        onlineCount = 0
        activeCount = 0

        snapshot.forEach((docSnap) => {

            const rider =
                docSnap.data()

            if (rider.online) {

                onlineCount++

            }

            if (rider.activeOrderId) {

                activeCount++

            }

            ridersTable.innerHTML += `

<tr>

<td>
    ${rider.name || "No Name"}
</td>

<td>
    ${rider.phone || "No Phone"}
</td>

<td>
    ${rider.zone || "No Zone"}
</td>

<td>

<span
class="status-badge-table"
style="
background:
${
    rider.status === "APPROVED"
    ?
    '#16a34a'
    :
    rider.status === "REJECTED"
    ?
    '#dc2626'
    :
    '#f59e0b'
};
"
>

${rider.status || "PENDING"}

</span>

</td>

<td>

${
    rider.online
    ?
    "🟢 ONLINE"
    :
    "🔴 OFFLINE"
}

</td>

<td>
    ${rider.totalDeliveries || 0}
</td>

<td>
    ₹${rider.earnings || 0}
</td>

<td>

<button

class="
action-btn
approve-btn-table
"

onclick="
approveRider(
'${docSnap.id}'
)
"

>

Approve

</button>

<button

class="
action-btn
reject-btn-table
"

onclick="
rejectRider(
'${docSnap.id}'
)
"

>

Reject

</button>

<button

class="
action-btn
view-btn-table
"

onclick="
viewRider(
'${docSnap.id}'
)
"

>

View

</button>

</td>

</tr>

`
        })

        onlineRiders.innerHTML =
            onlineCount

        activeDeliveries.innerHTML =
            activeCount
    }
)

window.approveRider =
async(id) => {

    await updateDoc(

        doc(
            db,
            "riders",
            id
        ),

        {
            status: "APPROVED"
        }
    )

    alert(
        "Rider Approved 😎"
    )
}

window.rejectRider =
async(id) => {

    await updateDoc(

        doc(
            db,
            "riders",
            id
        ),

        {
            status: "REJECTED"
        }
    )

    alert(
        "Rider Rejected 😎"
    )
}

window.viewRider =
(id) => {

    window.location.href =
        `rider-details.html?id=${id}`
}