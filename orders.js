import {
    db
}
from "./firebase.js"

import {

    collection,
    onSnapshot,
    query,
    orderBy

}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"

const tableBody =
    document.getElementById(
        "ordersTableBody"
    )

const searchInput =
    document.getElementById(
        "searchInput"
    )

const statusFilter =
    document.getElementById(
        "statusFilter"
    )

const paymentFilter =
    document.getElementById(
        "paymentFilter"
    )

let allOrders = []

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

        allOrders = []

        snapshot.forEach(
            (doc) => {

                allOrders.push({

                    id: doc.id,
                    ...doc.data()

                })
            }
        )

        renderOrders()
    }
)

function renderOrders() {

    tableBody.innerHTML = ""

    const search =
        searchInput.value
            .toLowerCase()

    const status =
        statusFilter.value

    const payment =
        paymentFilter.value

    const filtered =
        allOrders.filter(
            (order) => {

                const matchesSearch =

                    order.customerName
                        ?.toLowerCase()
                        .includes(search)

                    ||

                    order.id
                        ?.toLowerCase()
                        .includes(search)

                const matchesStatus =

                    !status
                    ||
                    order.status === status

                const matchesPayment =

                    !payment
                    ||
                    order.paymentMethod === payment

                return (

                    matchesSearch
                    &&
                    matchesStatus
                    &&
                    matchesPayment

                )
            }
        )

    filtered.forEach(
        (order) => {

            const tr =
                document.createElement(
                    "tr"
                )

            tr.innerHTML = `

<td>
${order.id.slice(0,6)}
</td>

<td>
${order.customerName || "Customer"}
</td>

<td>
${order.restaurantName || ""}
</td>

<td>
₹${order.total || 0}
</td>

<td>
${order.paymentMethod || "COD"}
</td>

<td>

<span class="
status
${getStatusClass(order.status)}
">

${order.status}

</span>

</td>

<td>

${formatTime(order.timestamp)}

</td>

<td>

<button
class="view-btn-table"
onclick="
window.location.href=
'order-details.html?id=${order.id}'
"
>

VIEW

</button>

</td>
`

            tableBody.appendChild(
                tr
            )
        }
    )
}

function getStatusClass(
    status
) {

    switch (status) {

        case "PENDING":
            return "pending"

        case "APPROVED":
            return "approved"

        case "PREPARING":
            return "preparing"

        case "READY":
            return "ready"

        case "OUT_FOR_DELIVERY":
            return "delivery"

        case "DELIVERED":
            return "delivered"

        case "CANCELLED":
            return "cancelled"

        default:
            return ""
    }
}

function formatTime(
    timestamp
) {

    if (!timestamp)
        return ""

    const date =
        new Date(timestamp)

    return date.toLocaleString()
}

searchInput.addEventListener(
    "input",
    renderOrders
)

statusFilter.addEventListener(
    "change",
    renderOrders
)

paymentFilter.addEventListener(
    "change",
    renderOrders
)