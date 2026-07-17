import {
db
}
from "./firebase.js"

import {

collection,
getDocs

}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"

const params =
new URLSearchParams(
window.location.search
)

const riderId =
params.get("id")

const riderName =
document.getElementById(
"riderName"
)
const riderPhone =
document.getElementById(
"riderPhone"
)

const collectedEl =
document.getElementById(
"collected"
)

const depositedEl =
document.getElementById(
"deposited"
)

const balanceEl =
document.getElementById(
"balance"
)

const ledgerTable =
document.getElementById(
"ledgerTable"
)

loadLedger()

async function loadLedger(){

let collected = 0

let deposited = 0
const ridersSnapshot =
await getDocs(
collection(
db,
"riders"
)
)

let riderDisplayName =
riderId

let riderDisplayPhone =
"-"

ridersSnapshot.forEach(doc=>{

if(
doc.id === riderId
){

const rider =
doc.data()

riderDisplayName =
rider.name ||
riderId

riderDisplayPhone =
rider.phone ||
"-"

}

})

const ordersSnapshot =
await getDocs(
collection(
db,
"orders"
)
)

ordersSnapshot.forEach(doc=>{

const order =
doc.data()

if(

order.cashCollected &&

order.cashCollectedBy ===
riderId

){

collected +=
order.total || 0

}

})

const settlementSnapshot =
await getDocs(
collection(
db,
"cod_settlements"
)
)

let rows = ""

settlementSnapshot.forEach(doc=>{

const settlement =
doc.data()

if(

settlement.riderId ===
riderId

){

deposited +=
settlement.amount || 0

const date =

settlement.createdAt
?

settlement.createdAt
.toDate()
.toLocaleDateString()

:

"-"

rows += `

<tr>

<td>
${date}
</td>

<td>
₹${settlement.amount}
</td>

</tr>

`

}

})

const balance =

collected -
deposited

riderName.innerText =
riderDisplayName
riderPhone.innerText =
"📱 " +
riderDisplayPhone

collectedEl.innerText =
"₹" + collected

depositedEl.innerText =
"₹" + deposited

balanceEl.innerText =
"₹" + balance

ledgerTable.innerHTML =
rows

}