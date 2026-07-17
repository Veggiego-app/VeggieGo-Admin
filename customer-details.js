//=====================================
// customer-details.js
// PART 1
//=====================================

import { db, auth } from "./firebase.js";

import {
doc,
getDoc,
collection,
getDocs,
updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

//--------------------------------

const params =
new URLSearchParams(
location.search
);

const uid =
params.get("uid");

//--------------------------------

const customerName =
document.getElementById("customerName");

const customerPhone =
document.getElementById("customerPhone");

const customerUid =
document.getElementById("customerUid");

const customerCode =
document.getElementById("customerCode");

const customerStatus =
document.getElementById("customerStatus");

const joinedDate =
document.getElementById("joinedDate");

const lastLogin =
document.getElementById("lastLogin");

const totalOrders =
document.getElementById("totalOrders");

const completedOrders =
document.getElementById("completedOrders");

const cancelledOrders =
document.getElementById("cancelledOrders");

const totalSpend =
document.getElementById("totalSpend");

const addressesContainer =
document.getElementById(
"addressesContainer"
);

const recentOrdersTable =
document.getElementById(
"recentOrdersTable"
);

const blockBtn =
document.getElementById(
"blockBtn"
);

const logoutBtn =
document.getElementById(
"logoutBtn"
);

//--------------------------------

logoutBtn.onclick =
async()=>{

await signOut(auth);

location.href="login.html";

}

//--------------------------------

function money(v){

return "₹"+

Number(v||0)

.toLocaleString("en-IN");

}

//--------------------------------

function date(v){

if(!v) return "-";

try{

if(v.seconds){

return new Date(

v.seconds*1000

).toLocaleString();

}

return new Date(v)

.toLocaleString();

}

catch{

return "-";

}

}

//--------------------------------

let customer={};

let orders=[];

let addresses=[];

let blocked=false;

let spend=0;

//-------------------------------------
// LOAD CUSTOMER
//-------------------------------------

async function loadCustomer(){

const snap=
await getDoc(
doc(db,"users",uid)
);

if(!snap.exists()){

alert("Customer not found");

location.href="customers.html";

return;

}

customer=snap.data();

blocked=
customer.status==="BLOCKED";

customerName.textContent=
customer.name||
customer.fullName||
"-";

customerPhone.textContent=
customer.phone||
customer.mobile||
"-";

customerUid.textContent=uid;

customerCode.textContent=
customer.customerCode||
("VGC"+
uid.substring(0,6).toUpperCase());

customerStatus.textContent=
blocked
?
"Blocked"
:
"Active";

joinedDate.textContent=
date(customer.createdAt);

lastLogin.textContent=
date(
customer.lastLogin||
customer.updatedAt
);

blockBtn.textContent=
blocked
?
"✅ Unblock Customer"
:
"🚫 Block Customer";

}

//-------------------------------------
// LOAD ADDRESSES
//-------------------------------------

async function loadAddresses(){

const snap=
await getDocs(
collection(
db,
"users",
uid,
"addresses"
)
);

addresses=[];

snap.forEach(doc=>{

addresses.push(doc.data());

});

if(!addresses.length){

addressesContainer.innerHTML=`
<div class="empty-row">

No Saved Addresses

</div>
`;

return;

}

addressesContainer.innerHTML="";

addresses.forEach(address=>{

const div=
document.createElement("div");

div.className="details-card";

div.style.marginBottom="15px";

const lat = address.latitude;
const lng = address.longitude;

let mapButton = "";

if (lat && lng) {

    mapButton = `

    <br><br>

    <a
        href="https://www.google.com/maps?q=${lat},${lng}"
        target="_blank"
        class="view-btn"
        style="display:inline-block;text-decoration:none;">

        📍 Open in Google Maps

    </a>

    `;

}

div.innerHTML = `

<b>

${address.fullName || "-"}

</b>

<br><br>

${address.house || ""}

${address.area || ""}

<br>

${address.city || ""}

${address.state || ""}

${address.pincode || ""}

<br><br>

📞 ${address.phone || "-"}

${mapButton}

`;

addressesContainer.appendChild(div);

});

}

//-------------------------------------
// LOAD ORDERS
//-------------------------------------

async function loadOrders(){

const snap=
await getDocs(
collection(db,"orders")
);

orders=[];

let completed=0;

let cancelled=0;

spend=0;

recentOrdersTable.innerHTML="";

snap.forEach(doc=>{

const order={

id:doc.id,

...doc.data()

};

if(

order.userId===uid||

order.customerUid===uid

){

orders.push(order);

spend+=Number(
order.total||0
);

if(

order.status==="DELIVERED"

){

completed++;

}

if(

order.status==="CANCELLED"

){

cancelled++;

}

}

});

totalOrders.textContent=
orders.length;

completedOrders.textContent=
completed;

cancelledOrders.textContent=
cancelled;

totalSpend.textContent=
money(spend);
//-------------------------------------
// RECENT ORDERS TABLE
//-------------------------------------

if(!orders.length){

recentOrdersTable.innerHTML=`
<tr>

<td
colspan="8"
class="empty-row">

No Orders Found

</td>

</tr>
`;

}else{

orders.sort((a,b)=>{

const ta=
a.timestamp?.seconds||0;

const tb=
b.timestamp?.seconds||0;

return tb-ta;

});

orders.slice(0,10).forEach(order=>{

const tr=
document.createElement("tr");

tr.innerHTML=`

<td>

${order.id}

</td>

<td>

${date(order.timestamp)}

</td>

<td>

${order.restaurantName||"-"}

</td>

<td>

${order.items?.length||0}

</td>

<td>

${money(order.total)}

</td>

<td>

${order.paymentMethod||"-"}

</td>

<td>

<span class="customer-status active">

${order.status||"-"}

</span>

</td>

<td>

<button
class="view-btn"

onclick="location.href='order-details.html?id=${order.id}'">

View

</button>

</td>

`;

recentOrdersTable.appendChild(tr);

});

}

//-------------------------------------
// SUMMARY
//-------------------------------------

const avgValue=
document.getElementById(
"averageOrderValue"
);

const lastOrderDate=
document.getElementById(
"lastOrderDate"
);

const favoriteRestaurant=
document.getElementById(
"favoriteRestaurant"
);

const lastOrderStatus=
document.getElementById(
"lastOrderStatus"
);

avgValue.textContent=

orders.length

?

money(
spend/orders.length
)

:

"₹0";

lastOrderDate.textContent=

orders.length

?

date(
orders[0].timestamp
)

:

"-";

lastOrderStatus.textContent=

orders.length

?

orders[0].status

:

"-";

//-------------------------------------
// FAVORITE RESTAURANT
//-------------------------------------

const restaurantCount={};

orders.forEach(order=>{

const name=
order.restaurantName||"-";

restaurantCount[name]=
(restaurantCount[name]||0)+1;

});

let max=0;

let fav="-";

Object.keys(restaurantCount).forEach(name=>{

if(

restaurantCount[name]>max

){

max=
restaurantCount[name];

fav=name;

}

});

favoriteRestaurant.textContent=fav;

}

//-------------------------------------
// BLOCK / UNBLOCK
//-------------------------------------

blockBtn.onclick=
async()=>{

const status=

blocked

?

"ACTIVE"

:

"BLOCKED";

await updateDoc(

doc(db,"users",uid),

{

status

}

);

alert(

blocked

?

"Customer Unblocked"

:

"Customer Blocked"

);

location.reload();

};

//-------------------------------------
// INIT
//-------------------------------------

async function init(){

await loadCustomer();

await loadAddresses();

await loadOrders();

}

init();