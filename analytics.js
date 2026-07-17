import { db } from "./firebase.js"
import { auth } from "./firebase.js"
import { collection, query, onSnapshot, orderBy, where } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"
import { signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"

let allOrders = []
let allRestaurants = []
let allRiders = []
let selectedRestaurant = "ALL"
let selectedRider = "ALL"
let selectedDateFilter = "ALL"

let fromDate = null

let toDate = null
let revenueChart
let ordersChart
let profitCurrentPage = 1

const profitPerPage = 50

// ======================== LOGOUT ========================
document.getElementById("logoutBtn").addEventListener("click", () => {
    signOut(auth).then(() => {
        window.location.href = "login.html"
    })
})

// ======================== REAL-TIME DATA ========================

// Listen to Orders
const ordersRef = collection(db, "orders")
const ordersQuery = query(ordersRef, orderBy("timestamp", "desc"))

onSnapshot(ordersQuery, (snapshot) => {
    allOrders = []
    snapshot.forEach((doc) => {
        allOrders.push({
            id: doc.id,
            ...doc.data()
        })
    })
    updateAnalytics()
})

// Listen to Restaurants
const restaurantsRef = collection(db, "restaurants")

const restaurantsQuery = query(
    restaurantsRef
)

onSnapshot(restaurantsQuery, (snapshot) => {
    allRestaurants = []
    snapshot.forEach((doc) => {
        allRestaurants.push({
            id: doc.id,
            ...doc.data()
        })
    })
    loadFilters()
    updateAnalytics()
})

// Listen to Riders
const ridersRef = collection(db, "riders")

const ridersQuery = query(
    ridersRef
)

onSnapshot(ridersQuery, (snapshot) => {
    allRiders = []
    snapshot.forEach((doc) => {
        allRiders.push({
            id: doc.id,
            ...doc.data()
        })
    })
    loadFilters()
    updateAnalytics()
})
function loadFilters() {

const restaurantFilter =
document.getElementById(
"restaurantFilter"
)

const riderFilter =
document.getElementById(
"riderFilter"
)

if (
!restaurantFilter ||
!riderFilter
) return

restaurantFilter.innerHTML =
`
<option value="ALL">
All Restaurants
</option>
`

allRestaurants.forEach(r => {

restaurantFilter.innerHTML +=
`
<option value="${r.id}">
${r.name}
</option>
`

})

riderFilter.innerHTML =
`
<option value="ALL">
All Riders
</option>
`

allRiders.forEach(r => {

riderFilter.innerHTML +=
`
<option value="${r.id}">
${r.name || r.phone}
</option>
`

})
const savedRestaurant =
localStorage.getItem(
"selectedRestaurant"
)

if (savedRestaurant) {

restaurantFilter.value =
savedRestaurant

selectedRestaurant =
savedRestaurant

updateProfitTable()

}

const savedRider =
localStorage.getItem(
"selectedRider"
)

if (savedRider) {

riderFilter.value =
savedRider

selectedRider =
savedRider

updateProfitTable()

}

}

// ======================== ANALYTICS FUNCTIONS ========================

function updateAnalytics() {
    updateTopStatistics()
    updateOrderStatusBreakdown()
    updateRestaurantAndRiderStats()
    updatePaymentAnalytics()
    updateZoneAnalytics()
    updateTopRestaurants()
    updateTopRiders()
    updateCouponAnalytics()
    updateCommissionAnalytics()
    updateProfitAnalytics()
    updateProfitTable()
    updateRestaurantProfitTable()
    updateRiderSettlementTable()
    updateRecentActivity()
    updateCharts()
}

function updateTopStatistics() {
    const totalOrders = allOrders.length
    const totalRevenue = allOrders.reduce((sum, order) => sum + (order.total || 0), 0)

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayOrders = allOrders.filter(order => {
        const orderDate = order.timestamp?.toDate?.() || new Date(order.timestamp)
        orderDate.setHours(0, 0, 0, 0)
        return orderDate.getTime() === today.getTime()
    })
    const todaysOrdersCount = todayOrders.length
    const todaysRevenue = todayOrders.reduce((sum, order) => sum + (order.total || 0), 0)

    document.getElementById("totalOrders").textContent = totalOrders
    document.getElementById("totalRevenue").textContent = "₹" + totalRevenue.toFixed(0)
    document.getElementById("todaysOrders").textContent = todaysOrdersCount
    document.getElementById("todaysRevenue").textContent = "₹" + todaysRevenue.toFixed(0)
}

function updateOrderStatusBreakdown() {
    const statuses = {
        PENDING: 0,
        APPROVED: 0,
        PREPARING: 0,
        READY: 0,
        RIDER_ASSIGNED: 0,
        OUT_FOR_DELIVERY: 0,
        DELIVERED: 0,
        CANCELLED: 0
    }

    allOrders.forEach(order => {
        const status = order.status || "PENDING"
        if (status in statuses) {
            statuses[status]++
        }
    })

    document.getElementById("pendingOrders").textContent = statuses.PENDING
    document.getElementById("approvedOrders").textContent = statuses.APPROVED
    document.getElementById("preparingOrders").textContent = statuses.PREPARING
    document.getElementById("readyOrders").textContent = statuses.READY
    document.getElementById("riderAssignedOrders").textContent = statuses.RIDER_ASSIGNED
    document.getElementById("onWayOrders").textContent = statuses.OUT_FOR_DELIVERY
    document.getElementById("completedOrders").textContent = statuses.DELIVERED
    document.getElementById("cancelledOrders").textContent = statuses.CANCELLED
}

function updateRestaurantAndRiderStats() {
    const activeRestaurants =
allRestaurants.filter(
r => r.online === true
).length

const onlineRiders =
allRiders.filter(
r => r.online === true
).length

    document.getElementById("totalRestaurants").textContent = allRestaurants.length
    document.getElementById("activeRestaurants").textContent = activeRestaurants
    document.getElementById("totalRiders").textContent = allRiders.length
    document.getElementById("onlineRiders").textContent = onlineRiders
}

function updatePaymentAnalytics() {
    let codOrders = 0, onlineOrders = 0, codRevenue = 0, onlineRevenue = 0

    allOrders.forEach(order => {
        if (order.paymentMethod === "COD" || order.paymentMethod === "cod") {
            codOrders++
            codRevenue += order.total || 0
        } else if (order.paymentMethod === "ONLINE" || order.paymentMethod === "online") {
            onlineOrders++
            onlineRevenue += order.total || 0
        }
    })

    document.getElementById("codOrders").textContent = codOrders
    document.getElementById("onlineOrders").textContent = onlineOrders
    document.getElementById("codRevenue").textContent = "₹" + codRevenue.toFixed(0)
    document.getElementById("onlineRevenue").textContent = "₹" + onlineRevenue.toFixed(0)
}

function updateZoneAnalytics() {
    const zones = {
        gandhidham: 0,
        adipur: 0,
        anjar: 0,
        bhuj: 0
    }

    allOrders.forEach(order => {
        const zone = order.zone?.toLowerCase() || ""
        if (zone.includes("gandhi")) zones.gandhidham++
        else if (zone.includes("adipur")) zones.adipur++
        else if (zone.includes("anjar")) zones.anjar++
        else if (zone.includes("bhuj")) zones.bhuj++
    })

    document.getElementById("gandhidhamOrders").textContent = zones.gandhidham + " Orders"
    document.getElementById("adipurOrders").textContent = zones.adipur + " Orders"
    document.getElementById("anjarOrders").textContent = zones.anjar + " Orders"
    document.getElementById("bhujOrders").textContent = zones.bhuj + " Orders"
}

function updateTopRestaurants() {
    const restaurantStats = {}

    allOrders.forEach(order => {
        const restaurantName = order.restaurantName || order.storeId || "Unknown"
        if (!restaurantStats[restaurantName]) {
            restaurantStats[restaurantName] = {
                name: restaurantName,
                orders: 0,
                revenue: 0,
                rating: 4.5
            }
        }
        restaurantStats[restaurantName].orders++
        restaurantStats[restaurantName].revenue += order.total || 0
    })

    let restaurantArray = Object.values(restaurantStats)
    restaurantArray.sort((a, b) => b.orders - a.orders)
    restaurantArray = restaurantArray.slice(0, 5)

    const tbody = document.getElementById("topRestaurantsBody")
    tbody.innerHTML = ""
    restaurantArray.forEach((r, index) => {
        const row = document.createElement("tr")
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${r.name}</td>
            <td>${r.orders}</td>
            <td>₹${r.revenue.toFixed(0)}</td>
            <td>${r.rating.toFixed(1)} ⭐</td>
        `
        tbody.appendChild(row)
    })
}

function updateTopRiders() {
    const riderStats = {}

    allOrders.filter(o => o.status === "DELIVERED" || o.status === "delivered").forEach(order => {
        const riderName = order.riderName || "Unassigned"
        if (!riderStats[riderName]) {
            riderStats[riderName] = {
                name: riderName,
                deliveries: 0,
                earnings: 0,
                rating: 4.7
            }
        }
        riderStats[riderName].deliveries++
        riderStats[riderName].earnings +=
(order.riderPay || 0)
    })

    let riderArray = Object.values(riderStats).sort((a, b) => b.deliveries - a.deliveries).slice(0, 5)

    const tbody = document.getElementById("topRidersBody")
    tbody.innerHTML = ""
    riderArray.forEach((r, index) => {
        const row = document.createElement("tr")
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${r.name}</td>
            <td>${r.deliveries}</td>
            <td>₹${r.earnings.toFixed(0)}</td>
            <td>${r.rating.toFixed(1)} ⭐</td>
        `
        tbody.appendChild(row)
    })
}

function updateCouponAnalytics() {
    let couponsUsed = 0, totalDiscount = 0

    allOrders.forEach(order => {
        if (order.couponCode) {
            couponsUsed++
            totalDiscount += order.discountAmount || 0
        }
    })

    document.getElementById("totalCouponsUsed").textContent = couponsUsed
    document.getElementById("totalDiscountGiven").textContent = "₹" + totalDiscount.toFixed(0)
    document.getElementById("mostUsedCoupon").textContent = "WELCOME50"
}

function updateCommissionAnalytics() {

    let restaurantCommission = 0

    let deliveryFees = 0

    let platformFees = 0

    allOrders.forEach(order => {

        const itemTotal =
            order.itemTotal || 0

        const deliveryFee =
            order.deliveryFee || 0

        const platformFee =
            order.platformFee || 0

        const commissionPercent =
order.commissionPercent
||
30

const commission =
    itemTotal *
    (
        commissionPercent / 100
    )

        restaurantCommission +=
            commission

        deliveryFees +=
            deliveryFee

        platformFees +=
            platformFee

    })

    document.getElementById(
        "restaurantCommission"
    ).textContent =
        "₹" +
        restaurantCommission.toFixed(0)

    document.getElementById(
        "deliveryFees"
    ).textContent =
        "₹" +
        deliveryFees.toFixed(0)

    document.getElementById(
        "platformFees"
    ).textContent =
        "₹" +
        platformFees.toFixed(0)

}
function updateProfitAnalytics() {

    let totalProfit = 0

    let todayProfit = 0

    let riderExpense = 0

    let restaurantPayout = 0

    const today = new Date()

    today.setHours(
        0,
        0,
        0,
        0
    )

    allOrders.forEach(order => {

        if (
            order.status !== "DELIVERED"
        ) return

        const itemTotal =
            order.itemTotal || 0

        const deliveryFee =
            order.deliveryFee || 0

        const platformFee =
            order.platformFee || 0

        const commissionPercent =
order.commissionPercent
||
30

        const commissionAmount =
            itemTotal *
            (
                commissionPercent / 100
            )

        const riderPay =
            order.riderPay || 0

        const payout =
            itemTotal -
            commissionAmount

        const profit =
            commissionAmount +
            deliveryFee +
            platformFee -
            riderPay

        totalProfit += profit

        riderExpense += riderPay

        restaurantPayout += payout

        const orderDate =
            order.timestamp?.toDate?.()
            ||
            new Date(
                order.timestamp
            )

        const temp =
            new Date(
                orderDate
            )

        temp.setHours(
            0,
            0,
            0,
            0
        )

        if (
            temp.getTime()
            ===
            today.getTime()
        ) {

            todayProfit +=
                profit

        }

    })

    document.getElementById(
        "totalProfit"
    ).textContent =
    "₹" +
    totalProfit.toFixed(0)

    document.getElementById(
        "todayProfit"
    ).textContent =
    "₹" +
    todayProfit.toFixed(0)

    document.getElementById(
        "restaurantPayout"
    ).textContent =
    "₹" +
    restaurantPayout.toFixed(0)

    document.getElementById(
        "riderExpense"
    ).textContent =
    "₹" +
    riderExpense.toFixed(0)

}
function updateProfitTable() {

    const tbody =
        document.getElementById(
            "profitTableBody"
        )

    if (!tbody) return

    tbody.innerHTML = ""
    let totalItem = 0
let totalPackaging = 0
let totalDelivery = 0
let totalPlatform = 0
let totalGST = 0
let totalDiscount = 0
let totalTip = 0
let totalGrand = 0
let totalCommission = 0
let totalPayout = 0
let totalProfit = 0
const filteredOrders = allOrders.filter(order => {

if (
order.status !== "DELIVERED"
)
return false

if (
selectedRestaurant !== "ALL"
&&
order.restaurantId !== selectedRestaurant
)
return false

if (
selectedRider !== "ALL"
&&
order.riderId !== selectedRider
)
return false
const orderDate =

order.timestamp?.toDate?.()
||
new Date(
order.timestamp
)

const today =
new Date()

// TODAY

if(
selectedDateFilter ===
"TODAY"
){

const t1 =
new Date(today)

t1.setHours(0,0,0,0)

const t2 =
new Date(orderDate)

t2.setHours(0,0,0,0)

if(
t1.getTime()
!== 
t2.getTime()
)
return false

}

// YESTERDAY

if(
selectedDateFilter ===
"YESTERDAY"
){

const yesterday =
new Date()

yesterday.setDate(
yesterday.getDate() - 1
)

yesterday.setHours(
0,0,0,0
)

const temp =
new Date(orderDate)

temp.setHours(
0,0,0,0
)

if(
temp.getTime()
!==
yesterday.getTime()
)
return false

}

// LAST 7 DAYS

if(
selectedDateFilter ===
"LAST7"
){

const last7 =
new Date()

last7.setDate(
last7.getDate() - 7
)

if(
orderDate < last7
)
return false

}

// THIS MONTH

if(
selectedDateFilter ===
"MONTH"
){

if(
orderDate.getMonth()
!== today.getMonth()
||
orderDate.getFullYear()
!== today.getFullYear()
)
return false

}

// CUSTOM

if(
selectedDateFilter ===
"CUSTOM"
&&
fromDate
&&
toDate
){

if(
orderDate < fromDate
||
orderDate > toDate
)
return false

}

return true

})
const paginatedOrders = filteredOrders.slice(

(profitCurrentPage - 1) * profitPerPage,

profitCurrentPage * profitPerPage

)

  paginatedOrders.forEach(order => {

        const itemTotal =
            order.itemTotal || 0

        const deliveryFee =
            order.deliveryFee || 0

        const platformFee =
            order.platformFee || 0

        const packagingFee =
    order.packagingFee || 0

const gst =
    order.gst || 0

const discount =
    order.discount || 0

const tip =
    order.tip || 0

const grandTotal =
    order.total || 0

        const commissionPercent =
order.commissionPercent
||
30

        const commissionAmount =
            itemTotal *
            (
                commissionPercent / 100
            )

        const riderPay =
            order.riderPay || 0

        const payout =
            itemTotal -
            commissionAmount

        const profit =
            commissionAmount +
            deliveryFee +
            platformFee -
            riderPay
            totalItem += itemTotal

totalPackaging +=
packagingFee

totalDelivery +=
deliveryFee

totalPlatform +=
platformFee

totalGST +=
gst

totalDiscount +=
discount

totalTip +=
tip

totalGrand +=
grandTotal

totalCommission +=
commissionAmount

totalPayout +=
payout

totalProfit +=
profit
        const row =
            document.createElement(
                "tr"
            )

        row.innerHTML = `

<td>
${order.id}
</td>

<td>
${new Date(
Number(order.timestamp || 0)
).toLocaleString(
"en-IN",
{
day:"2-digit",
month:"short",
hour:"2-digit",
minute:"2-digit",
hour12:true
}
)}
</td>

<td>
${order.restaurantId || "-"}
</td>

<td>
${order.restaurantName || "-"}
</td>

<td>
₹${itemTotal}
</td>

<td>
₹${packagingFee}
</td>

<td>
₹${deliveryFee}
</td>

<td>
₹${platformFee}
</td>

<td>
₹${gst.toFixed(2)}
</td>

<td>
₹${discount}
</td>

<td>
₹${tip}
</td>

<td>
₹${grandTotal}
</td>

<td>
${commissionPercent}%
</td>

<td>
₹${commissionAmount.toFixed(0)}
</td>

<td>
₹${payout.toFixed(0)}
</td>

<td>
₹${profit.toFixed(0)}
</td>

`

        tbody.appendChild(
            row
        )

    })
    const totalDeliveredOrders =
filteredOrders.length

window.filteredOrdersCount =
filteredOrders.length

const totalPages =

Math.ceil(

totalDeliveredOrders
/
profitPerPage

)

const pageInfo =

document.getElementById(
"profitPageInfo"
)

if(pageInfo){

const startOrder =

((profitCurrentPage - 1)
*
profitPerPage)
+
1

const endOrder =

Math.min(

profitCurrentPage
*
profitPerPage,

totalDeliveredOrders

)

pageInfo.textContent =

`Showing
${startOrder}
-
${endOrder}
of
${totalDeliveredOrders}
Orders`

}
    const totalRow =
document.createElement(
"tr"
)

totalRow.innerHTML = `

<td colspan="4">
<b>GRAND TOTAL</b>
</td>

<td>
<b>₹${totalItem.toFixed(0)}</b>
</td>

<td>
<b>₹${totalPackaging.toFixed(0)}</b>
</td>

<td>
<b>₹${totalDelivery.toFixed(0)}</b>
</td>

<td>
<b>₹${totalPlatform.toFixed(0)}</b>
</td>

<td>
<b>₹${totalGST.toFixed(2)}</b>
</td>

<td>
<b>₹${totalDiscount.toFixed(0)}</b>
</td>

<td>
<b>₹${totalTip.toFixed(0)}</b>
</td>

<td>
<b>₹${totalGrand.toFixed(0)}</b>
</td>

<td></td>

<td>
<b>₹${totalCommission.toFixed(0)}</b>
</td>

<td>
<b>₹${totalPayout.toFixed(0)}</b>
</td>

<td>
<b>₹${totalProfit.toFixed(0)}</b>
</td>

`

tbody.appendChild(
totalRow
)

}
function updateRestaurantProfitTable() {

    const tbody =
        document.getElementById(
            "restaurantProfitBody"
        )

    if (!tbody) return

    tbody.innerHTML = ""
    let totalOrders = 0

let totalSales = 0

let totalCommission = 0

let totalPayout = 0

    const restaurants = {}

    allOrders.forEach(order => {

        if (
            order.status !==
            "DELIVERED"
        ) return

        const restaurantName =
            order.restaurantName ||
            "Unknown"

        if (
            !restaurants[
                restaurantName
            ]
        ) {

            restaurants[
restaurantName
] = {

id:
order.restaurantId,

orders:0,

sales:0,

commission:0,

payout:0

}

        }

        const itemTotal =
            order.itemTotal || 0

        const commissionPercent =
order.commissionPercent
||
30

const commission =
    itemTotal *
    (
        commissionPercent / 100
    )

        restaurants[
            restaurantName
        ].orders++

        restaurants[
            restaurantName
        ].sales += itemTotal

        restaurants[
            restaurantName
        ].commission += commission

        restaurants[
            restaurantName
        ].payout +=
            (
                itemTotal -
                commission
            )
            totalOrders++

totalSales += itemTotal

totalCommission += commission

totalPayout +=
(
    itemTotal -
    commission
)

    })

    Object.entries(
        restaurants
    )
    .forEach(
        ([name,data]) => {

            const row =
                document.createElement(
                    "tr"
                )

            row.innerHTML = `

<td>
${name}
</td>

<td>
${data.orders}
</td>

<td>
₹${data.sales.toFixed(0)}
</td>

<td>
₹${data.commission.toFixed(0)}
</td>

<td>
₹${data.payout.toFixed(0)}
</td>

`

            tbody.appendChild(
                row
            )

        }
    )
    const totalRow =
document.createElement(
    "tr"
)

totalRow.innerHTML = `

<td>
<b>GRAND TOTAL</b>
</td>

<td>
<b>${totalOrders}</b>
</td>

<td>
<b>₹${totalSales.toFixed(0)}</b>
</td>

<td>
<b>₹${totalCommission.toFixed(0)}</b>
</td>

<td>
<b>₹${totalPayout.toFixed(0)}</b>
</td>

`

tbody.appendChild(
    totalRow
)

}
function updateRiderSettlementTable() {

    const tbody =
    document.getElementById(
        "riderSettlementBody"
    )

    if (!tbody) return

    tbody.innerHTML = ""

    const riders = {}

    allOrders.forEach(order => {

        if (
            order.status !== "DELIVERED"
        ) return

        const riderName =
            order.riderName ||
            "Unassigned"

        if (
            !riders[riderName]
        ) {

            riders[riderName] = {

                deliveries: 0,

                earnings: 0

            }

        }

        const riderPay =
            order.riderPay || 0

        riders[riderName]
        .deliveries++

        riders[riderName]
        .earnings += riderPay

    })

    Object.entries(riders)
    .forEach(([name,data]) => {

        const avg =
            data.deliveries > 0
            ?
            (
                data.earnings /
                data.deliveries
            )
            :
            0

        const row =
            document.createElement(
                "tr"
            )

        row.innerHTML = `

<td>
${name}
</td>

<td>
${data.deliveries}
</td>

<td>
₹${data.earnings.toFixed(0)}
</td>

<td>
₹${avg.toFixed(0)}
</td>

`

        tbody.appendChild(row)

    })

}

function updateRecentActivity() {
    const activityList = document.getElementById("activityList")
    const recentOrders = allOrders.slice(0, 5)

    activityList.innerHTML = ""
    recentOrders.forEach(order => {
        const orderDate = order.timestamp?.toDate?.() || new Date(order.timestamp)
        const timeAgo = formatTimeAgo(orderDate)
        const item = document.createElement("div")
        item.className = "activity-item"
        item.innerHTML = `
            <div class="activity-icon">📦</div>
            <div class="activity-content">
                <div class="activity-title">Order #${order.id?.slice(0, 8)} - ${order.customerName}</div>
                <div class="activity-time">${timeAgo}</div>
            </div>
        `
        activityList.appendChild(item)
    })
}

function formatTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000)
    if (seconds < 60) return "Just now"
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
}

function updateCharts() {
    updateRevenueChart()
    updateOrdersChart()
}

function updateRevenueChart() {
    const labels = getLast7Days()
    const data = labels.map(date => {
        return allOrders.filter(order => {
            const orderDate = order.timestamp?.toDate?.() || new Date(order.timestamp)
            return orderDate.toLocaleDateString() === new Date(date).toLocaleDateString()
        }).reduce((sum, order) => sum + (order.total || 0), 0)
    })

    if (revenueChart) {
        revenueChart.data.labels = labels.map(d => new Date(d).toLocaleDateString("en-IN", { month: "short", day: "numeric" }))
        revenueChart.data.datasets[0].data = data
        revenueChart.update()
    } else {
        const ctx = document.getElementById("revenueChart").getContext("2d")
        revenueChart = new Chart(ctx, {
            type: "line",
            data: {
                labels: labels.map(d => new Date(d).toLocaleDateString("en-IN", { month: "short", day: "numeric" })),
                datasets: [{
                    label: "Revenue (₹)",
                    data: data,
                    borderColor: "#a78bfa",
                    backgroundColor: "rgba(167, 139, 250, 0.1)",
                    fill: true,
                    tension: 0.4,
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { color: "#cbd5e1" },
                        grid: { color: "rgba(255, 255, 255, 0.05)" }
                    },
                    x: {
                        ticks: { color: "#cbd5e1" },
                        grid: { color: "rgba(255, 255, 255, 0.05)" }
                    }
                }
            }
        })
    }
}

function updateOrdersChart() {
    const labels = getLast7Days()
    const data = labels.map(date => {
        return allOrders.filter(order => {
            const orderDate = order.timestamp?.toDate?.() || new Date(order.timestamp)
            return orderDate.toLocaleDateString() === new Date(date).toLocaleDateString()
        }).length
    })

    if (ordersChart) {
        ordersChart.data.labels = labels.map(d => new Date(d).toLocaleDateString("en-IN", { month: "short", day: "numeric" }))
        ordersChart.data.datasets[0].data = data
        ordersChart.update()
    } else {
        const ctx = document.getElementById("ordersChart").getContext("2d")
        ordersChart = new Chart(ctx, {
            type: "bar",
            data: {
                labels: labels.map(d => new Date(d).toLocaleDateString("en-IN", { month: "short", day: "numeric" })),
                datasets: [{
                    label: "Orders",
                    data: data,
                    backgroundColor: "#7c3aed",
                    borderColor: "#a855f7",
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { color: "#cbd5e1" },
                        grid: { color: "rgba(255, 255, 255, 0.05)" }
                    },
                    x: {
                        ticks: { color: "#cbd5e1" },
                        grid: { color: "rgba(255, 255, 255, 0.05)" }
                    }
                }
            }
        })
    }
}

function getLast7Days() {
    const days = []
    for (let i = 6; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        days.push(date)
    }
    return days
}
document
.getElementById(
    "exportExcelBtn"
)
.addEventListener(
    "click",
    exportProfitExcel
)

function exportProfitExcel() {

let totalItem = 0
let totalPackaging = 0
let totalDelivery = 0
let totalPlatform = 0
let totalGST = 0
let totalDiscount = 0
let totalTip = 0
let totalGrand = 0
let totalCommission = 0
let totalPayout = 0
let totalProfit = 0

const data = []

const exportOrders = allOrders.filter(order => {

if(order.status !== "DELIVERED")
return false

if(
selectedRestaurant !== "ALL"
&&
order.restaurantId !== selectedRestaurant
)
return false

if(
selectedRider !== "ALL"
&&
order.riderId !== selectedRider
)
return false

const orderDate =
new Date(order.timestamp)

const today =
new Date()

if(selectedDateFilter === "TODAY"){

const d1 = new Date(today)
d1.setHours(0,0,0,0)

const d2 = new Date(orderDate)
d2.setHours(0,0,0,0)

if(d1.getTime() !== d2.getTime())
return false

}

if(selectedDateFilter === "YESTERDAY"){

const yesterday = new Date()

yesterday.setDate(
yesterday.getDate() - 1
)

yesterday.setHours(
0,0,0,0
)

const temp = new Date(orderDate)

temp.setHours(
0,0,0,0
)

if(
temp.getTime()
!== yesterday.getTime()
)
return false

}

if(selectedDateFilter === "LAST7"){

const last7 = new Date()

last7.setDate(
last7.getDate() - 7
)

if(orderDate < last7)
return false

}

if(selectedDateFilter === "MONTH"){

if(
orderDate.getMonth() !== today.getMonth()
||
orderDate.getFullYear() !== today.getFullYear()
)
return false

}

if(
selectedDateFilter === "CUSTOM"
&&
fromDate
&&
toDate
){

if(
orderDate < fromDate
||
orderDate > toDate
)
return false

}

return true

})

exportOrders.forEach(order => {

const itemTotal =
order.itemTotal || 0

const deliveryFee =
order.deliveryFee || 0

const platformFee =
order.platformFee || 0

const packagingFee =
order.packagingFee || 0

const gst =
order.gst || 0

const discount =
order.discount || 0

const tip =
order.tip || 0

const grandTotal =
order.total || 0

const commissionPercent =
order.commissionPercent || 30

const commissionAmount =
itemTotal *
(
commissionPercent / 100
)

const payout =
itemTotal -
commissionAmount

const profit =
commissionAmount +
deliveryFee +
platformFee

totalItem += itemTotal
totalPackaging += packagingFee
totalDelivery += deliveryFee
totalPlatform += platformFee
totalGST += gst
totalDiscount += discount
totalTip += tip
totalGrand += grandTotal
totalCommission += commissionAmount
totalPayout += payout
totalProfit += profit

data.push({

"Order ID":
order.id,

"Date":
new Date(
Number(order.timestamp || 0)
).toLocaleString(
"en-IN"
),

"Restaurant ID":
order.restaurantId || "",

"Restaurant Name":
order.restaurantName || "",

"Item Total":
itemTotal,

"Packaging Fee":
packagingFee,

"Delivery Fee":
deliveryFee,

"Platform Fee":
platformFee,

"GST":
gst,

"Discount":
discount,

"Tip":
tip,

"Grand Total":
grandTotal,

"Commission %":
commissionPercent,

"Commission Amount":
commissionAmount,

"Rider Pay":
order.riderPay || 0,

"Restaurant Payout":
payout,

"Company Profit":
profit

})

})

data.push({

"Order ID":"GRAND TOTAL",

"Date":"",

"Restaurant ID":"",

"Restaurant Name":"",

"Item Total":totalItem,

"Packaging Fee":totalPackaging,

"Delivery Fee":totalDelivery,

"Platform Fee":totalPlatform,

"GST":totalGST,

"Discount":totalDiscount,

"Tip":totalTip,

"Grand Total":totalGrand,

"Commission %":"",

"Commission Amount":totalCommission,

"Rider Pay":"",

"Restaurant Payout":totalPayout,

"Company Profit":totalProfit

})

const worksheet =
XLSX.utils.json_to_sheet(data)

const workbook =
XLSX.utils.book_new()

XLSX.utils.book_append_sheet(
workbook,
worksheet,
"Profit Report"
)

XLSX.writeFile(
workbook,
"VeggieGo_Profit_Report.xlsx"
)

}
// ======================== CHART BUTTON LISTENERS ========================

document.querySelectorAll(".chart-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
        const parent = e.target.parentElement
        parent.querySelectorAll(".chart-btn").forEach(b => b.classList.remove("active"))
        e.target.classList.add("active")
    })
})

document.querySelectorAll(".restaurant-tab").forEach(btn => {
    btn.addEventListener("click", (e) => {
        const parent = e.target.parentElement
        parent.querySelectorAll(".restaurant-tab").forEach(b => b.classList.remove("active"))
        e.target.classList.add("active")
    })
})

document.querySelectorAll(".activity-tab").forEach(btn => {
    btn.addEventListener("click", (e) => {
        const parent = e.target.parentElement
        parent.querySelectorAll(".activity-tab").forEach(b => b.classList.remove("active"))
        e.target.classList.add("active")
    })
})
const restaurantFilter =
document.getElementById(
"restaurantFilter"
)

if (restaurantFilter) {

restaurantFilter.addEventListener(
"change",
(e)=>{

selectedRestaurant =
e.target.value

localStorage.setItem(
"selectedRestaurant",
selectedRestaurant
)

updateProfitTable()

}
)

}

const riderFilter =
document.getElementById(
"riderFilter"
)
const dateFilter =
document.getElementById(
"dateFilter"
)

dateFilter?.addEventListener(
"change",
(e)=>{

selectedDateFilter =
e.target.value
profitCurrentPage = 1

const fromInput =
document.getElementById(
"fromDate"
)

const toInput =
document.getElementById(
"toDate"
)

const applyBtn =
document.getElementById(
"applyDateBtn"
)

if (
selectedDateFilter ===
"CUSTOM"
){

fromInput.style.display =
"inline-block"

toInput.style.display =
"inline-block"

applyBtn.style.display =
"inline-block"

}else{

fromInput.style.display =
"none"

toInput.style.display =
"none"

applyBtn.style.display =
"none"

profitCurrentPage = 1

updateProfitTable()

updateProfitAnalytics()

updateRestaurantProfitTable()

updateRiderSettlementTable()

}

}
)

if (riderFilter) {

riderFilter.addEventListener(
"change",
(e)=>{

selectedRider =
e.target.value

localStorage.setItem(
"selectedRider",
selectedRider
)

updateProfitTable()

}
)

}
// Initial load
updateAnalytics()
document
.getElementById(
"profitPrevBtn"
)
?.addEventListener(
"click",
() => {

if (

profitCurrentPage > 1

) {

profitCurrentPage--

updateProfitTable()

document
.getElementById(
"profitPageInfo"
)
?.scrollIntoView({

behavior:"smooth",
block:"center"

})

}

}
)

document
.getElementById(
"profitNextBtn"
)
?.addEventListener(
"click",
() => {

const totalPages =
Math.ceil(
window.filteredOrdersCount
/
profitPerPage
)

if(
profitCurrentPage <
totalPages
){
profitCurrentPage++
}

updateProfitTable()

document
.getElementById(
"profitPageInfo"
)
?.scrollIntoView({

behavior:"smooth",
block:"center"

})

}
)
document
.getElementById(
"applyDateBtn"
)
?.addEventListener(
"click",
()=>{

fromDate =
new Date(
document
.getElementById(
"fromDate"
).value
)

toDate =
new Date(
document
.getElementById(
"toDate"
).value
)

toDate.setHours(
23,59,59,999
)

profitCurrentPage = 1

updateProfitTable()

updateProfitAnalytics()

updateRestaurantProfitTable()

updateRiderSettlementTable()

}
)