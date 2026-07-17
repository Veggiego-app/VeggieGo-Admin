import {
    db
}
from "./firebase.js"

import {
    collection,
    getDocs,
    addDoc,
    serverTimestamp
}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"

const totalCollected =
document.getElementById(
    "totalCollected"
)

const totalDeposited =
document.getElementById(
    "totalDeposited"
)

const cashWithRiders =
document.getElementById(
    "cashWithRiders"
)

const ridersWithBalance =
document.getElementById(
    "ridersWithBalance"
)

const riderTable =
document.getElementById(
    "riderTable"
)

loadData()

async function loadData(){

    let totalCash = 0

let depositedTotal = 0

let riderMap = {}

let pendingRiders = 0

    const ordersSnapshot =
    await getDocs(
        collection(
            db,
            "orders"
        )
    )
    const settlementSnapshot =
await getDocs(
    collection(
        db,
        "cod_settlements"
    )
)
const ridersSnapshot =
await getDocs(
    collection(
        db,
        "riders"
    )
)

const riderNames = {}

ridersSnapshot.forEach(doc=>{

    const rider =
    doc.data()

    riderNames[doc.id] = {

        name:
        rider.name || "Unknown Rider",

        phone:
        rider.phone || ""

    }

})

    ordersSnapshot.forEach(doc=>{

        const order =
        doc.data()

        if(
            order.cashCollected
        ){

            const amount =
            order.total || 0

            totalCash += amount

            const riderId =
            order.cashCollectedBy ||
            "UNKNOWN"

            if(
                !riderMap[riderId]
            ){

                riderMap[riderId] = {

    collected:0,

    deposited:0,

    riderName:riderId

}

            }

            riderMap[riderId]
            .collected += amount

        }
        
    })
    settlementSnapshot.forEach(doc=>{

    const settlement =
    doc.data()
    const settlementDate =
settlement.createdAt
?
settlement.createdAt.toDate()
:
null

    const riderId =
    settlement.riderId

    if(
        !riderMap[riderId]
    ){

        riderMap[riderId] = {

    collected:0,

    deposited:0,

    riderName:
    settlement.riderName,

    lastSettlement:null

}

    }

    riderMap[riderId]
    .deposited +=
    settlement.amount || 0
    if(

settlementDate &&

(
!riderMap[riderId]
.lastSettlement ||

settlementDate >
riderMap[riderId]
.lastSettlement

)

){

riderMap[riderId]
.lastSettlement =
settlementDate

}

})

    riderTable.innerHTML = ""

    Object.keys(
        riderMap
    ).forEach(riderId=>{

        const rider =
riderMap[riderId]

const balance =

rider.collected -
rider.deposited

if(
    balance > 0
){
    pendingRiders++
}

depositedTotal +=
rider.deposited

        riderTable.innerHTML += `

        <tr>

<td>
${riderNames[riderId]
?
riderNames[riderId].name
:
riderId}
</td>

<td>
${riderNames[riderId]
?
riderNames[riderId].phone
:
"-"}
</td>

<td>
₹${rider.collected.toFixed(0)}
</td>

<td>
₹${rider.deposited.toFixed(0)}
</td>

<td
class="${
balance > 0
?
'balance-positive'
:
'balance-zero'
}"
>
₹${balance.toFixed(0)}
</td>

<td>

${
rider.lastSettlement
?

rider.lastSettlement
.toLocaleDateString()

:

"-"

}

</td>

<td>

<button
class="approve-btn"
onclick="
openSettlement(
'${riderId}',
'${rider.riderName}',
${balance}
)
"
>
Settle
</button>

<button
class="view-btn"
onclick="
openLedger(
'${riderId}'
)
"
>
Ledger
</button>

</td>

</tr>

        `

    })
    ridersWithBalance.innerText =
pendingRiders

    totalCollected.innerText =
    "₹" +
    totalCash.toFixed(0)

    totalDeposited.innerText =
"₹" +
depositedTotal.toFixed(0)

    cashWithRiders.innerText =
"₹" +
(
totalCash -
depositedTotal
).toFixed(0)


}
window.addSettlement =
async function(
    riderId,
    riderName,
    amount
){

    await addDoc(

        collection(
            db,
            "cod_settlements"
        ),

        {

            riderId,
            riderName,

            amount:
            Number(amount),

            createdAt:
            serverTimestamp()

        }

    )

    alert(
        "✅ Settlement Added"
    )

    loadData()

}
window.openSettlement =
function(

    riderId,

    riderName,

    balance

){

    const amount =
    prompt(

        `${riderName}

Current Balance ₹${balance}

Enter Settlement Amount`

    )

    if(
        !amount
    ) return

    window.addSettlement(

    riderId,

    riderName,

    amount

)

}
window.openLedger =
function(riderId){

window.location.href =
`ledger.html?id=${riderId}`

}