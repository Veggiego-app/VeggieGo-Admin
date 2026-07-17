//==============================
// VeggieGo Customers
// customers.js
// PART 1
//==============================

import { db, auth } from "./firebase.js";

import {
    collection,
    getDocs,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

//-------------------------------------
// ELEMENTS
//-------------------------------------

const tbody = document.getElementById("customersTable");

const searchInput = document.getElementById("searchInput");

const totalCustomers = document.getElementById("totalCustomers");

const activeCustomers = document.getElementById("activeCustomers");

const blockedCustomers = document.getElementById("blockedCustomers");

const todayCustomers = document.getElementById("todayCustomers");

const logoutBtn = document.getElementById("logoutBtn");

//-------------------------------------
// DATA
//-------------------------------------

let customers = [];

let filteredCustomers = [];

let orders = [];

//-------------------------------------
// PAGINATION
//-------------------------------------

let currentPage = 1;

let rowsPerPage = 100;

const rowsPerPageSelect =
document.getElementById("rowsPerPage");

const sortBySelect =
document.getElementById("sortBy");

const paginationInfo =
document.getElementById("paginationInfo");

const pageNumbers =
document.getElementById("pageNumbers");

const firstPageBtn =
document.getElementById("firstPage");

const prevPageBtn =
document.getElementById("prevPage");

const nextPageBtn =
document.getElementById("nextPage");

const lastPageBtn =
document.getElementById("lastPage");

//-------------------------------------
// LOGOUT
//-------------------------------------

logoutBtn.onclick = async () => {

    if (!confirm("Logout Admin ?")) return;

    await signOut(auth);

    location.href = "login.html";

};

//-------------------------------------
// FORMAT DATE
//-------------------------------------

function formatDate(value) {

    if (!value) return "-";

    try {

        let date;

        if (value.seconds) {

            date = new Date(value.seconds * 1000);

        } else {

            date = new Date(value);

        }

        const day =
            String(date.getDate()).padStart(2, "0");

        const month =
            String(date.getMonth() + 1).padStart(2, "0");

        const year =
            date.getFullYear();

        return `${day}/${month}/${year}`;

    }

    catch {

        return "-";

    }

}

//-------------------------------------
// FORMAT MONEY
//-------------------------------------

function money(v) {

    return "₹" + Number(v || 0).toLocaleString(
        "en-IN"
    );

}

//-------------------------------------
// TODAY CHECK
//-------------------------------------

function isToday(value) {

    if (!value) return false;

    let d;

    if (value.seconds) {

        d = new Date(
            value.seconds * 1000
        );

    } else {

        d = new Date(value);

    }

    const now = new Date();

    return (

        d.getDate() === now.getDate() &&

        d.getMonth() === now.getMonth() &&

        d.getFullYear() === now.getFullYear()

    );

}

//-------------------------------------
// CUSTOMER CODE
//-------------------------------------

function customerCode(customer) {
    return customer.customerCode || "-";
}
//-------------------------------------
// SORT CUSTOMERS
//-------------------------------------

function sortCustomers() {

    const type = sortBySelect.value;

    filteredCustomers.sort((a, b) => {

        switch (type) {

            case "joined_desc": {

    const bTime =
        b.createdAt?.seconds
            ? b.createdAt.seconds * 1000
            : (b.createdAt || 0);

    const aTime =
        a.createdAt?.seconds
            ? a.createdAt.seconds * 1000
            : (a.createdAt || 0);

    return bTime - aTime;

}

case "joined_asc": {

    const aTime =
        a.createdAt?.seconds
            ? a.createdAt.seconds * 1000
            : (a.createdAt || 0);

    const bTime =
        b.createdAt?.seconds
            ? b.createdAt.seconds * 1000
            : (b.createdAt || 0);

    return aTime - bTime;

}

            case "code_asc":
                return customerCode(a)
                    .localeCompare(customerCode(b));

            case "code_desc":
                return customerCode(b)
                    .localeCompare(customerCode(a));

            case "name_asc":
                return String(
                    a.name ||
                    a.fullName ||
                    ""
                ).localeCompare(
                    String(
                        b.name ||
                        b.fullName ||
                        ""
                    )
                );

            case "name_desc":
                return String(
                    b.name ||
                    b.fullName ||
                    ""
                ).localeCompare(
                    String(
                        a.name ||
                        a.fullName ||
                        ""
                    )
                );

            case "orders_desc":
                return (
                    totalOrders(b.uid) -
                    totalOrders(a.uid)
                );

            case "spend_desc":
                return (
                    totalSpend(b.uid) -
                    totalSpend(a.uid)
                );

            default:
                return 0;

        }

    });

}
//-------------------------------------
// LOAD ORDERS
//-------------------------------------

async function loadOrders() {

    const snap = await getDocs(

        query(

            collection(db, "orders"),

            orderBy("timestamp", "desc")

        )

    );

    orders = [];

    snap.forEach(doc => {

        orders.push({

            id: doc.id,

            ...doc.data()

        });

    });

}

//-------------------------------------
// ORDER COUNT
//-------------------------------------

function totalOrders(uid) {

    return orders.filter(

        o =>

            o.userId === uid ||

            o.customerUid === uid

    ).length;

}

//-------------------------------------
// TOTAL SPEND
//-------------------------------------

function totalSpend(uid) {

    let total = 0;

    orders.forEach(order => {

        if (

            order.userId === uid ||

            order.customerUid === uid

        ) {

            total += Number(

                order.total ||

                order.grandTotal ||

                0

            );

        }

    });

    return total;

}
//-------------------------------------
// LOAD CUSTOMERS
//-------------------------------------

async function loadCustomers() {

    tbody.innerHTML = `
        <tr>
            <td colspan="8" class="empty-row">
                Loading Customers...
            </td>
        </tr>
    `;

    const snap = await getDocs(
    collection(db, "users")
);

    customers = [];

    snap.forEach(doc => {

        customers.push({

            uid: doc.id,

            ...doc.data()

        });

    });

    filteredCustomers = [...customers];

    sortCustomers();

    updateDashboard();

    renderTable();

}

//-------------------------------------
// DASHBOARD
//-------------------------------------

function updateDashboard() {

    totalCustomers.textContent =
        customers.length;

    activeCustomers.textContent =
        customers.filter(c =>
            c.status !== "BLOCKED"
        ).length;

    blockedCustomers.textContent =
        customers.filter(c =>
            c.status === "BLOCKED"
        ).length;

    todayCustomers.textContent =
        customers.filter(c =>
            isToday(c.createdAt)
        ).length;

}

//-------------------------------------
// TABLE
//-------------------------------------

function renderTable() {

    if (!filteredCustomers.length) {

        tbody.innerHTML = `
        <tr>
            <td colspan="8"
            class="empty-row">

            No Customers Found

            </td>
        </tr>
        `;

        return;

    }

    tbody.innerHTML = "";

const start =
(currentPage - 1) * rowsPerPage;

const end =
start + rowsPerPage;

const pageData =
filteredCustomers.slice(
start,
end
);

pageData.forEach((customer,index)=>{

        const tr =
        document.createElement("tr");

        const status =
        customer.status === "BLOCKED"
        ? "blocked"
        : "active";

        const statusText =
        customer.status === "BLOCKED"
        ? "Blocked"
        : "Active";

        tr.innerHTML = `

<td>

${customer.name
||
customer.fullName
||
"-"}

</td>

<td>

${customer.phone
||
customer.mobile
||
"-"}

</td>

<td>

${customerCode(customer)}

</td>

<td>

${totalOrders(
customer.uid
)}

</td>

<td>

${money(
totalSpend(
customer.uid
)
)}

</td>

<td>

${formatDate(
customer.createdAt
)}

</td>

<td>

<span
class="customer-status ${status}"
>

${statusText}

</span>

</td>

<td>

<button
class="view-btn"
data-id="${customer.uid}"
>

View Details

</button>

</td>

`;

        tbody.appendChild(tr);

    });

    updatePagination();

}

//-------------------------------------
// UPDATE PAGINATION
//-------------------------------------

function updatePagination(){

const total =
filteredCustomers.length;

const totalPages =
Math.max(
1,
Math.ceil(
total / rowsPerPage
)
);

if(currentPage>totalPages){

currentPage=totalPages;

}

const start =
total===0
?0
:((currentPage-1)*rowsPerPage)+1;

const end =
Math.min(
currentPage*rowsPerPage,
total
);

paginationInfo.textContent=

`Showing ${start}-${end} of ${total} Customers`;

pageNumbers.textContent=

`${currentPage} / ${totalPages}`;

}

//-------------------------------------
// SEARCH
//-------------------------------------

searchInput.addEventListener(
"input",
()=>{

const text =
searchInput.value
.toLowerCase()
.trim();

filteredCustomers =
customers.filter(c=>{

const name =
String(
c.name
||
c.fullName
||
""
)
.toLowerCase();

const phone =
String(
c.phone
||
c.mobile
||
""
)
.toLowerCase();

const uid =
String(
c.uid
||
""
)
.toLowerCase();

const code =
customerCode(c).toLowerCase();

return(

name.includes(text)

||

phone.includes(text)

||

uid.includes(text)

||

code.includes(text)

);

});

sortCustomers();

currentPage = 1;

renderTable();

});

//-------------------------------------
// VIEW DETAILS
//-------------------------------------

document.addEventListener(
"click",
e=>{

if(

e.target.classList.contains(
"view-btn"
)

){

const uid =
e.target.dataset.id;

location.href =
`customer-details.html?uid=${uid}`;

}

});
//-------------------------------------
// NOTIFICATION (READY FOR FUTURE)
//-------------------------------------

function initializeNotifications() {

    const bell =
        document.getElementById("notificationBell");

    const dropdown =
        document.getElementById("notificationDropdown");

    if (!bell || !dropdown) return;

    bell.addEventListener("click", (e) => {

        e.stopPropagation();

        dropdown.classList.toggle("show");

    });

    document.addEventListener("click", (e) => {

        if (
            !dropdown.contains(e.target) &&
            !bell.contains(e.target)
        ) {

            dropdown.classList.remove("show");

        }

    });

}

//-------------------------------------
// INIT
//-------------------------------------

async function init() {

    try {

        await loadOrders();

        await loadCustomers();

        initializeNotifications();

        rowsPerPageSelect.onchange=()=>{

rowsPerPage=
Number(
rowsPerPageSelect.value
);

currentPage=1;

renderTable();

};

sortBySelect.onchange = () => {

    sortCustomers();

    currentPage = 1;

    renderTable();

};

firstPageBtn.onclick=()=>{

currentPage=1;

renderTable();

};

prevPageBtn.onclick=()=>{

if(currentPage>1){

currentPage--;

renderTable();

}

};

nextPageBtn.onclick=()=>{

const totalPages=

Math.ceil(

filteredCustomers.length/

rowsPerPage

);

if(currentPage<totalPages){

currentPage++;

renderTable();

}

};

lastPageBtn.onclick=()=>{

currentPage=

Math.ceil(

filteredCustomers.length/

rowsPerPage

);

renderTable();

};

        console.log(
            "Customers Loaded:",
            customers.length
        );

    }

    catch (e) {

        console.error(e);

        tbody.innerHTML = `
        <tr>
            <td colspan="8" class="empty-row">
                Failed to load customers.
            </td>
        </tr>
        `;

    }

}

//-------------------------------------
// START
//-------------------------------------

init();