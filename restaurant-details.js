import {
db,
auth,
storage
}
from "./firebase.js"

import {

    doc,
    getDoc,
    updateDoc

}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"

import {

ref as storageRef,

uploadBytes,

getDownloadURL,

deleteObject

}

from

"https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js"

// URL PARAMS

const params =
    new URLSearchParams(
        window.location.search
    )

const id =
    params.get("id")

// DIV

const container =
    document.getElementById(
        "restaurantDetails"
    )

// FIREBASE REF

const ref =
    doc(
        db,
        "restaurants",
        id
    )
    let map

let marker

let geocoder

// MODAL

const timingModal =
    document.getElementById(
        "timingModal"
    )

const openingHour =
    document.getElementById(
        "openingHour"
    )

const openingMinute =
    document.getElementById(
        "openingMinute"
    )

const openingAmPm =
    document.getElementById(
        "openingAmPm"
    )

const closingHour =
    document.getElementById(
        "closingHour"
    )

const closingMinute =
    document.getElementById(
        "closingMinute"
    )

const closingAmPm =
    document.getElementById(
        "closingAmPm"
    )

// LOAD DATA

async function loadRestaurant() {

    const snap =
        await getDoc(ref)

    if (!snap.exists()) {

        container.innerHTML = `

<h2>
❌ Restaurant Not Found
</h2>

`

        return
    }

    const r =
        snap.data()
        window.currentOpeningTime =
    r.openingTime
    || "10:00 AM"

window.currentClosingTime =
    r.closingTime
    || "11:00 PM"
       
    container.innerHTML = `

<div class="details-top">

<div>

<h1>
${r.name || ""}
</h1>

<p>
👨 ${r.ownerName || "-"}
</p>

</div>

<div>

<span
class="status-badge-table"

style="
background:
${r.status === "APPROVED"
? "#16a34a"
: "#dc2626"}
"
>

${r.status || "-"}

</span>

</div>

</div>

<br>

<div class="dashboard-grid">

<div class="dashboard-card">

<h2>
${r.online ? "🟢" : "🔴"}
</h2>

<p>
${r.online ? "ONLINE" : "OFFLINE"}
</p>

</div>

<div class="dashboard-card">

<h2>
${r.status || "-"}
</h2>

<p>
Status
</p>

</div>

<div class="dashboard-card">

<h2>
${r.zone || "-"}
</h2>

<p>
Zone
</p>

</div>

<div class="dashboard-card">

<h2>
${r.commissionPercent || 30}%
</h2>

<p>
Commission
</p>

</div>

</div>
<br>

<div class="details-card">

<h2>
🍽 Restaurant Information
</h2>

<br>

<label>
Restaurant Name
</label>

<input
type="text"
id="restaurantName"
value="${r.name || ""}"
>

<br><br>

<label>
Owner Name
</label>

<input
type="text"
id="ownerName"
value="${r.ownerName || ""}"
>

<br><br>

<label>
Restaurant Phone
</label>

<input
type="text"
id="restaurantPhone"
value="${r.phone || ""}"
>

<br><br>

<label>
Owner Phone
</label>

<input
type="text"
id="ownerPhone"
value="${r.ownerPhone || ""}"
>

<br><br>

<label>
Email
</label>

<input
type="text"
id="restaurantEmail"
value="${r.email || ""}"
>

<br><br>

<label>
Zone
</label>

<select id="restaurantZone">

<option
${r.zone==="Gandhidham"?"selected":""}
>
Gandhidham
</option>

<option
${r.zone==="Adipur"?"selected":""}
>
Adipur
</option>

<option
${r.zone==="Anjar"?"selected":""}
>
Anjar
</option>

<option
${r.zone==="Bhuj"?"selected":""}
>
Bhuj
</option>

</select>

<br><br>

<button
id="saveRestaurantInfoBtn"
class="approve-btn-table"
>

💾 SAVE DETAILS

</button>
<br><br>

<button
id="manageMenuBtn"
class="approve-btn-table"
>

🍔 MANAGE MENU

</button>

<br><br>

<button
id="editTimingBtn"
class="approve-btn-table"
>

🕒 EDIT TIMING

</button>

<br><br>

<button
id="toggleOnlineBtn"
class="
${r.online
? "reject-btn"
: "approve-btn"}
"
>

${r.online
? "🔴 GO OFFLINE"
: "🟢 GO ONLINE"}

</button>
<br>

<br><br>
<hr style="margin:35px 0;border-color:#374151;">

<h2>
🖼 Restaurant Images
</h2>

<br>

<div class="restaurant-image-grid">

<div class="restaurant-image-card">

<h3>
Restaurant Logo
</h3>

<img
id="logoPreview"
class="restaurant-preview-image"
src="${r.logoUrl || 'https://placehold.co/250x250?text=No+Logo'}"
>

<br><br>

<input
type="file"
id="logoFile"
accept="image/*"
>

<br><br>

<button
id="saveLogoBtn"
class="approve-btn-table"
>

📤 CHANGE LOGO

</button>

</div>

<div class="restaurant-image-card">

<h3>
Restaurant Banner
</h3>

<img
id="bannerPreview"
class="restaurant-banner-image"
src="${r.bannerUrl || 'https://placehold.co/600x250?text=No+Banner'}"
>

<br><br>

<input
type="file"
id="bannerFile"
accept="image/*"
>

<br><br>

<button
id="saveBannerBtn"
class="approve-btn-table"
>

📤 CHANGE BANNER

</button>

</div>

</div>

<br><br>

<h2>
💰 Business Settings
</h2>

<br>

<label>
Commission %
</label>

<input
type="number"
id="businessCommission"
value="${r.commissionPercent || 25}"
>

<br><br>

<label>
Packaging Fee
</label>

<input
type="number"
id="packagingFee"
value="${r.packagingFee || 0}"
>

<br><br>

<button
id="saveBusinessBtn"
class="approve-btn-table"
>

💾 SAVE SETTINGS

</button>
<br><br>

<h2>
📍 Location
</h2>

<br>

<h3 style="margin-bottom:15px;">
🗺 Restaurant Location
</h3>

<input
type="text"
id="locationSearch"
placeholder="Search Location..."
>

<div
id="restaurantMap"
style="
width:100%;
height:380px;
margin-top:15px;
border-radius:15px;
overflow:hidden;
border:1px solid #374151;
">
</div>

<br>
<label>
Address Line 1
</label>

<input
type="text"
id="addressLine1"
value="${r.addressLine1 || ""}"
>

<br><br>

<label>
Address Line 2
</label>

<input
type="text"
id="addressLine2"
value="${r.addressLine2 || ""}"
>

<br><br>

<label>
Area
</label>

<input
type="text"
id="area"
value="${r.area || ""}"
>

<br><br>

<label>
City
</label>

<input
type="text"
id="city"
value="${r.city || ""}"
>

<br><br>

<label>
State
</label>

<input
type="text"
id="state"
value="${r.state || ""}"
>

<br><br>

<label>
Pincode
</label>

<input
type="text"
id="pincode"
value="${r.pincode || ""}"
>

<br><br>

<button
id="saveLocationBtn"
class="approve-btn-table"
>

💾 SAVE LOCATION

</button>
<br><br>

<h2>
🏦 Bank Details
</h2>

<br>

<label>
Bank Name
</label>

<input
type="text"
id="bankName"
value="${r.bankName || ""}"
>

<br><br>

<label>
Account Holder
</label>

<input
type="text"
id="accountHolder"
value="${r.accountHolder || ""}"
>

<br><br>

<label>
Account Number
</label>

<input
type="text"
id="accountNumber"
value="${r.accountNumber || ""}"
>

<br><br>

<label>
IFSC Code
</label>

<input
type="text"
id="ifscCode"
value="${r.ifscCode || ""}"
>

<br><br>

<label>
UPI ID
</label>

<input
type="text"
id="upiId"
value="${r.upiId || ""}"
>

<br><br>

<button
id="saveBankBtn"
class="approve-btn-table"
>

💾 SAVE BANK DETAILS

</button>
<br><br>

<h2>
🧾 GST / FSSAI
</h2>

<br>

<label>
GST Number
</label>

<input
type="text"
id="gstNumber"
value="${r.gstNumber || ""}"
>

<br><br>

<label>
GST Document
</label>

<br>

<a
href="${r.gstDocumentUrl || '#'}"
target="_blank"
id="gstPreviewLink"
class="document-link"
>

📄 View GST Document

</a>

<br><br>

<input
type="file"
id="gstFile"
accept=".pdf,image/*"
>

<br><br>

<button
id="saveGstFileBtn"
class="approve-btn-table"
>

📤 CHANGE GST

</button>

<br><br>

<label>
FSSAI Number
</label>

<input
type="text"
id="fssaiNumber"
value="${r.fssaiNumber || ""}"
>

<br><br>

<label>
FSSAI Document
</label>

<br>

<a
href="${r.fssaiDocumentUrl || '#'}"
target="_blank"
id="fssaiPreviewLink"
class="document-link"
>

📄 View FSSAI Document

</a>

<br><br>

<input
type="file"
id="fssaiFile"
accept=".pdf,image/*"
>

<br><br>

<button
id="saveFssaiFileBtn"
class="approve-btn-table"
>

📤 CHANGE FSSAI

</button>

<br><br>

<button
id="saveLegalBtn"
class="approve-btn-table"
>

💾 SAVE GST/FSSAI

</button>
<br><br>

<div
class="timing-dropdown-header"
onclick="toggleTimingDropdown()"
>

🕒 Weekly Restaurant Slots

<span id="timingArrow">
▼
</span>

</div>

<div
class="weekly-timing-box"
id="weeklyTimingBox"

style="display:none;"
>

<div id="weeklySlotsContainer">

</div>

<br>

<button
id="saveWeeklySlotsBtn"
class="approve-btn-table"
>

💾 SAVE ALL SLOTS

</button>

</div>
</div>

`
setTimeout(()=>{

initRestaurantMap(r)

},300)
}

// TOGGLE ONLINE OFFLINE

// TOGGLE ONLINE OFFLINE

window.toggleRestaurant =
async function(id, current) {

    await updateDoc(

        doc(
            db,
            "restaurants",
            id
        ),

        {
            online: !current
        }
    )

    loadRestaurant()
}
// EDIT BUTTON CLICK


// BUTTON EVENT

window.openTimingModal =
function(opening, closing) {

    const openParts =
        opening.split(" ")

    const openTime =
        openParts[0]

    const openAmPm =
        openParts[1]

    const [openHour, openMinute] =
        openTime.split(":")

    openingHour.value =
        openHour

    openingMinute.value =
        openMinute

    openingAmPm.value =
        openAmPm

    // CLOSING

    const closeParts =
        closing.split(" ")

    const closeTime =
        closeParts[0]

    const closeAmPm =
        closeParts[1]

    const [closeHour, closeMinute] =
        closeTime.split(":")

    closingHour.value =
        closeHour

    closingMinute.value =
        closeMinute

    closingAmPm.value =
        closeAmPm

    // OPEN MODAL

    timingModal.style.display =
        "flex"
}

// CLOSE MODAL

window.closeTimingModal =
function() {

    timingModal.style.display =
        "none"
}
function convertTo24Hour(time) {

    if (!time)
        return "10:00"

    const parts =
        time.split(" ")

    const timePart =
        parts[0]

    const modifier =
        parts[1]

    let [hours, minutes] =
        timePart.split(":")

    hours =
        parseInt(hours)

    if (

        modifier === "PM"

        &&

        hours < 12

    ) {

        hours += 12
    }

    if (

        modifier === "AM"

        &&

        hours === 12

    ) {

        hours = 0
    }

   return String(hours)
    .padStart(2,"0")
    +
    ":" +
    minutes
}

function convertTo12Hour(time) {

    const [hours, minutes] =
        time.split(":")

    let h =
        parseInt(hours)

    const ampm =

        h >= 12
        ? "PM"
        : "AM"

    h =
        h % 12

    h =
        h
        ? h
        : 12

    return String(h)
    .padStart(2,"0")
    +
    ":" +
    minutes
    +
    " " +
    ampm
}

// SAVE TIMING

// SAVE BUTTON

const saveBtn =
    document.getElementById(
        "saveTimingBtn"
    )

// SAVE CLICK

if (saveBtn) {

    saveBtn.onclick =
    async function() {

        await updateDoc(

            doc(
                db,
                "restaurants",
                id
            ),

            {

               
    openingTime:

`${openingHour.value}:${openingMinute.value} ${openingAmPm.value}`,

closingTime:

`${closingHour.value}:${closingMinute.value} ${closingAmPm.value}`,
            }
        )

        closeTimingModal()

        loadRestaurant()
    }
}

// START
document.addEventListener(
    "click",
    function(e) {

        if (
            e.target.id ===
            "editTimingBtn"
        ) {

            openTimingModal(
                currentOpeningTime,
                currentClosingTime
            )
        }
    }
)
document.addEventListener(

"click",

async function(e){

if(

e.target.id ===

"saveCommissionBtn"

){

const commissionPercent =

parseFloat(

document.getElementById(
"commissionPercent"
).value

)

||

30

await updateDoc(

ref,

{

commissionPercent

}

)

alert(

"✅ Commission Saved"

)

}

}

)
document.addEventListener(

"click",

async function(e){

if(

e.target.id ===
"saveRestaurantInfoBtn"

){

await updateDoc(

ref,

{

name:

document.getElementById(
"restaurantName"
).value,

ownerName:

document.getElementById(
"ownerName"
).value,

phone:

document.getElementById(
"restaurantPhone"
).value,

ownerPhone:

document.getElementById(
"ownerPhone"
).value,

email:

document.getElementById(
"restaurantEmail"
).value,

zone:

document.getElementById(
"restaurantZone"
).value

}

)

e.target.innerHTML =
"✅ SAVED"

setTimeout(()=>{

e.target.innerHTML =
"💾 SAVE DETAILS"

},2000)

}

}
)
document.addEventListener(

"click",

async function(e){

if(

e.target.id ===
"saveBusinessBtn"

){

await updateDoc(

ref,

{

commissionPercent:

parseFloat(
document.getElementById(
"businessCommission"
).value
) || 25,

packagingFee:

parseFloat(
document.getElementById(
"packagingFee"
).value
) || 0

}

)

e.target.innerHTML =
"✅ SAVED"

setTimeout(()=>{

e.target.innerHTML =
"💾 SAVE SETTINGS"

},2000)

}

}
)
document.addEventListener(

"click",

async function(e){

if(

e.target.id ===
"saveLocationBtn"

){

await updateDoc(

ref,

{

addressLine1:
document.getElementById("addressLine1").value,

addressLine2:
document.getElementById("addressLine2").value,

area:
document.getElementById("area").value,

city:
document.getElementById("city").value,

state:
document.getElementById("state").value,

pincode:
document.getElementById("pincode").value,

lat:
marker.getPosition().lat(),

lng:
marker.getPosition().lng()

}

)

e.target.innerHTML =
"✅ SAVED"

setTimeout(()=>{

e.target.innerHTML =
"💾 SAVE LOCATION"

},2000)

}

}
)
document.addEventListener(

"click",

async function(e){

if(

e.target.id ===
"saveBankBtn"

){

await updateDoc(

ref,

{

bankName:
document.getElementById(
"bankName"
).value,

accountHolder:
document.getElementById(
"accountHolder"
).value,

accountNumber:
document.getElementById(
"accountNumber"
).value,

ifscCode:
document.getElementById(
"ifscCode"
).value,

upiId:
document.getElementById(
"upiId"
).value

}

)

e.target.innerHTML =
"✅ SAVED"

setTimeout(()=>{

e.target.innerHTML =
"💾 SAVE BANK DETAILS"

},2000)

}

}
)
document.addEventListener(

"click",

async function(e){

if(

e.target.id ===
"saveLegalBtn"

){

await updateDoc(

ref,

{

gstNumber:

document.getElementById(
"gstNumber"
).value,

fssaiNumber:

document.getElementById(
"fssaiNumber"
).value

}

)

e.target.innerHTML =
"✅ SAVED"

setTimeout(()=>{

e.target.innerHTML =
"💾 SAVE GST/FSSAI"

},2000)

}

}
)
loadRestaurant()

/* ========================= */
/* WEEKLY TIMING SYSTEM */
/* ========================= */
document.addEventListener(
    "click",
    function(e){

        if(
            e.target.id ===
            "saveWeeklySlotsBtn"
        ){

            saveWeeklySlots()

        }

    }
)

/* ========================= */
/* WEEKLY SLOT SYSTEM */
/* ========================= */

let weeklySlotsLoaded =
false

function getWeeklySlotsContainer(){

    return document.getElementById(
        "weeklySlotsContainer"
    )

}

function getSaveWeeklyBtn(){

    return document.getElementById(
        "saveWeeklySlotsBtn"
    )

}

const weeklyDays = [

    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday"
]

function createSlotRow(start="", end="") {

    return `

<div class="weekly-slot-row">

<div class="time-box">

<label>
START
</label>

<input
type="time"
class="slot-start"
value="${start}"
>

</div>

<div class="slot-arrow">

→

</div>

<div class="time-box">

<label>
END
</label>

<input
type="time"
class="slot-end"
value="${end}"
>

</div>

<button
class="delete-slot-btn"

onclick="
this.parentElement.remove()
"
>

DELETE

</button>

</div>

`
}

function renderWeeklySlots(data = {}) {

    const weeklySlotsContainer =
    getWeeklySlotsContainer()

if(!weeklySlotsContainer)
    return

weeklySlotsContainer.innerHTML = ""

    weeklyDays.forEach(day => {

        const slots =
            data[day] || []

        const card =
            document.createElement("div")

        card.className =
            "weekly-day-card"

        card.innerHTML = `

<h3>
${day}
</h3>

<div
id="weekly-${day}"
>

</div>

<button
class="add-slot-btn"

onclick="
addWeeklySlot('${day}')
"
>

+ Add Slot

</button>

`

        weeklySlotsContainer
            .appendChild(card)

        const box =
            document.getElementById(
                `weekly-${day}`
            )

        
        slots.forEach(slot => {

            box.innerHTML +=
                createSlotRow(
                    slot.start,
                    slot.end
                )
        })
    })
}

window.addWeeklySlot =
function(day) {

    const box =
        document.getElementById(
            `weekly-${day}`
        )

    box.innerHTML +=
        createSlotRow()
}

/* ========================= */
/* LOAD */
/* ========================= */

async function loadWeeklySlots() {

    try {

        const snap =
            await getDoc(ref)

        if (!snap.exists())
            return

        const data =
            snap.data()

        renderWeeklySlots(
            data.weeklySlots || {}
        )

    } catch(error) {

        console.log(error)

        alert(
            "Failed to load slots"
        )
    }
}

/* ========================= */
/* SAVE */
/* ========================= */

async function saveWeeklySlots() {

    try {

        const finalData = {}

        weeklyDays.forEach(day => {

            const rows =
                document.querySelectorAll(
                    `#weekly-${day} .weekly-slot-row`
                )

            finalData[day] = []

            rows.forEach(row => {

                const start =
                    row.querySelector(
                        ".slot-start"
                    ).value

                const end =
                    row.querySelector(
                        ".slot-end"
                    ).value

                if (start && end) {

                    finalData[day].push({

                        start,
                        end
                    })
                }
            })
        })

        await updateDoc(ref, {

            weeklySlots:
                finalData
        })

        alert(
            "✅ Weekly slots saved"
        )

    } catch(error) {

        console.log(error)

        alert(
            "Failed to save slots"
        )
    }
}

/* ========================= */
/* AUTO OPEN CLOSE */
/* ========================= */

function getTodayName() {

    const days = [

        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday"
    ]

    return days[
        new Date().getDay()
    ]
}

function checkRestaurantOpen(slots) {

    const now =
        new Date()

    const currentMinutes =

        now.getHours() * 60
        +
        now.getMinutes()

    for (const slot of slots) {

        const startParts =
            slot.start.split(":")

        const endParts =
            slot.end.split(":")

        const startMinutes =

            parseInt(startParts[0]) * 60
            +
            parseInt(startParts[1])

        const endMinutes =

            parseInt(endParts[0]) * 60
            +
            parseInt(endParts[1])

        if (

            currentMinutes >= startMinutes

            &&

            currentMinutes <= endMinutes

        ) {

            return true
        }
    }

    return false
}

/* ========================= */
/* UPDATE STATUS */
/* ========================= */

async function updateLiveRestaurantStatus() {

    try {

        const snap =
            await getDoc(ref)

        if (!snap.exists())
            return

        const data =
            snap.data()

        if (data.isHoliday) {

            await updateDoc(ref, {

                autoOpen: false,

                liveStatus:
                    "HOLIDAY"
            })

            return
        }

        const today =
            getTodayName()

        const slots =
            data.weeklySlots?.[today]
            || []

        const isOpen =
            checkRestaurantOpen(
                slots
            )
            let openingText = ""

// ✅ TODAY SLOT

if (!isOpen) {

    const now =
        new Date()

    const currentMinutes =

        now.getHours() * 60
        +
        now.getMinutes()

    let foundTodaySlot =
        false

    // ✅ CHECK TODAY FUTURE SLOT

    for (const slot of slots) {

        const startParts =
            slot.start.split(":")

        const startMinutes =

            parseInt(startParts[0]) * 60
            +
            parseInt(startParts[1])

        // ✅ FUTURE SLOT FOUND

        if (

            startMinutes >
            currentMinutes

        ) {

            foundTodaySlot =
                true

            const diff =
                startMinutes -
                currentMinutes

            if (

                diff <= 60

            ) {

                openingText =

                    `Opening in ${diff} mins`
            }

            else {

                const openHour =
                    parseInt(startParts[0])

                const openMinute =
                    startParts[1]

                const ampm =

                    openHour >= 12
                        ? "PM"
                        : "AM"

                const finalHour =

                    openHour > 12
                        ? openHour - 12
                        : openHour

                openingText =

                    `Opens at ${finalHour}:${openMinute} ${ampm}`
            }

            break
        }
    }

    // ✅ NO SLOT TODAY
    // CHECK NEXT DAYS

    if (!foundTodaySlot) {

        const allDays = [

            "Sunday",
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday"
        ]

        const todayIndex =

            allDays.indexOf(today)

        for (

            let i = 1;

            i <= 7;

            i++

        ) {

            const nextDay =

                allDays[
                    (todayIndex + i) % 7
                ]

            const nextSlots =

                data.weeklySlots?.[
                    nextDay
                ] || []

            if (

                nextSlots.length > 0

            ) {

                const firstSlot =
                    nextSlots[0]

                const startParts =
                    firstSlot.start.split(":")

                const openHour =
                    parseInt(startParts[0])

                const openMinute =
                    startParts[1]

                const ampm =

                    openHour >= 12
                        ? "PM"
                        : "AM"

                const finalHour =

                    openHour > 12
                        ? openHour - 12
                        : openHour

                openingText =

                    `Opens ${nextDay} ${finalHour}:${openMinute} ${ampm}`

                break
            }
        }
    }
}

        await updateDoc(ref, {

    autoOpen: isOpen,

    liveStatus:

        isOpen
            ? "OPEN"
            : "CLOSED",

    openingText
})

        console.log(
            "✅ Auto status updated"
        )

    } catch(error) {

        console.log(error)
    }
}

/* ========================= */
/* AUTO START */
/* ========================= */

updateLiveRestaurantStatus()

setInterval(

    updateLiveRestaurantStatus,

    60000
)
window.toggleTimingDropdown =
async function(){

const box =
document.getElementById(
"weeklyTimingBox"
)

const arrow =
document.getElementById(
"timingArrow"
)

if(

box.style.display ===
"none"

){

box.style.display =
"block"

arrow.innerHTML =
"▲"
if(
!weeklySlotsLoaded
){

await loadWeeklySlots()

weeklySlotsLoaded =
true

}

}

else{

box.style.display =
"none"

arrow.innerHTML =
"▼"

}

}
/* ========================= */
/* MANAGE MENU */
/* ========================= */

document.addEventListener(
    "click",
    function(e){

        if(
            e.target.id ===
            "manageMenuBtn"
        ){

            window.location.href =
            `menu.html?id=${id}`

        }

    }
)

/* ========================= */
/* ONLINE OFFLINE */
/* ========================= */

document.addEventListener(
    "click",
    async function(e){

        if(
            e.target.id ===
            "toggleOnlineBtn"
        ){

            const snap =
                await getDoc(ref)

            const data =
                snap.data()

            await updateDoc(
                ref,
                {
                    online:
                    !data.online
                }
            )

            loadRestaurant()

        }

    }
)
import {
signOut
}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"

document
.getElementById("logoutBtn")
?.addEventListener(
"click",
async ()=>{

await signOut(auth)

window.location.href =
"login.html"

})
/* ===========================
LOGO PREVIEW
=========================== */

document.addEventListener("change", function (e) {

    if (e.target.id === "logoFile") {

        const file = e.target.files[0];

        if (!file) return;

        document.getElementById("logoPreview").src =
            URL.createObjectURL(file);
    }

});

/* ===========================
BANNER PREVIEW
=========================== */

document.addEventListener("change", function (e) {

    if (e.target.id === "bannerFile") {

        const file = e.target.files[0];

        if (!file) return;

        document.getElementById("bannerPreview").src =
            URL.createObjectURL(file);
    }

});
/* ==========================================
REPLACE STORAGE FILE
========================================== */

async function replaceStorageFile({

file,

oldPath,

newPath,

urlField,

pathField

}){

if(!file) return null

const newRef = storageRef(

storage,

newPath

)

await uploadBytes(

newRef,

file

)

const newUrl =

await getDownloadURL(

newRef

)

await updateDoc(

ref,

{

[urlField]:newUrl,

[pathField]:newPath

}

)

if(oldPath && oldPath!==newPath){

try{

await deleteObject(

storageRef(

storage,

oldPath

)

)

}catch(err){

console.log(

"Old file delete skipped",

err

)

}

}

return newUrl

}
/* ==========================================
CHANGE LOGO
========================================== */

document.addEventListener(

"click",

async function(e){

if(e.target.id!=="saveLogoBtn") return

const file =

document.getElementById(

"logoFile"

).files[0]

if(!file){

alert("Select Logo")

return

}

const snap =

await getDoc(ref)

const data =

snap.data()

e.target.disabled=true

e.target.innerHTML="Uploading..."

try{

const newUrl=

await replaceStorageFile({

file,

oldPath:data.logoPath||"",

newPath:`restaurant-logos/${data.restaurantCode}_logo.webp`,

urlField:"logoUrl",

pathField:"logoPath"

})

document.getElementById(

"logoPreview"

).src=newUrl

document.getElementById(

"logoFile"

).value=""

e.target.innerHTML="✅ Logo Updated"

}catch(err){

console.error(err)

alert(err.message)

e.target.innerHTML="📤 CHANGE LOGO"

}

e.target.disabled=false

setTimeout(()=>{

e.target.innerHTML="📤 CHANGE LOGO"

},2000)

})
/* ==========================================
CHANGE BANNER
========================================== */

document.addEventListener(

"click",

async function(e){

if(e.target.id!=="saveBannerBtn") return

const file =

document.getElementById(

"bannerFile"

).files[0]

if(!file){

alert("Select Banner")

return

}

const snap =

await getDoc(ref)

const data =

snap.data()

e.target.disabled=true

e.target.innerHTML="Uploading..."

try{

const newUrl=

await replaceStorageFile({

file,

oldPath:data.bannerPath||"",

newPath:`restaurant-banners/${data.restaurantCode}_banner.webp`,

urlField:"bannerUrl",

pathField:"bannerPath"

})

document.getElementById(

"bannerPreview"

).src=newUrl

document.getElementById(

"bannerFile"

).value=""

e.target.innerHTML="✅ Banner Updated"

}catch(err){

console.error(err)

alert(err.message)

e.target.innerHTML="📤 CHANGE BANNER"

}

e.target.disabled=false

setTimeout(()=>{

e.target.innerHTML="📤 CHANGE BANNER"

},2000)

})
/* ==========================================
CHANGE GST DOCUMENT
========================================== */

document.addEventListener(

"click",

async function(e){

if(e.target.id!=="saveGstFileBtn") return

const file=
document.getElementById("gstFile").files[0]

if(!file){

alert("Select GST Document")

return

}

const snap=
await getDoc(ref)

const data=
snap.data()

e.target.disabled=true

e.target.innerHTML="Uploading..."

try{

const ext=file.name.split(".").pop()

const newPath=
`restaurant-gst/${data.restaurantCode}_gst.${ext}`

const newUrl=

await replaceStorageFile({

file,

oldPath:data.gstDocumentPath||"",

newPath,

urlField:"gstDocumentUrl",

pathField:"gstDocumentPath"

})

document.getElementById(
"gstPreviewLink"
).href=newUrl

document.getElementById(
"gstFile"
).value=""

e.target.innerHTML="✅ GST Updated"

}catch(err){

console.error(err)

alert(err.message)

e.target.innerHTML="📤 CHANGE GST"

}

e.target.disabled=false

setTimeout(()=>{

e.target.innerHTML="📤 CHANGE GST"

},2000)

})
/* ==========================================
CHANGE FSSAI DOCUMENT
========================================== */

document.addEventListener(

"click",

async function(e){

if(e.target.id!=="saveFssaiFileBtn") return

const file=
document.getElementById("fssaiFile").files[0]

if(!file){

alert("Select FSSAI Document")

return

}

const snap=
await getDoc(ref)

const data=
snap.data()

e.target.disabled=true

e.target.innerHTML="Uploading..."

try{

const ext=file.name.split(".").pop()

const newPath=
`restaurant-fssai/${data.restaurantCode}_fssai.${ext}`

const newUrl=

await replaceStorageFile({

file,

oldPath:data.fssaiDocumentPath||"",

newPath,

urlField:"fssaiDocumentUrl",

pathField:"fssaiDocumentPath"

})

document.getElementById(
"fssaiPreviewLink"
).href=newUrl

document.getElementById(
"fssaiFile"
).value=""

e.target.innerHTML="✅ FSSAI Updated"

}catch(err){

console.error(err)

alert(err.message)

e.target.innerHTML="📤 CHANGE FSSAI"

}

e.target.disabled=false

setTimeout(()=>{

e.target.innerHTML="📤 CHANGE FSSAI"

},2000)

})

/* ==========================================
GOOGLE MAP
========================================== */

function initRestaurantMap(r){

    const center = {
        lat: Number(r.lat) || 23.0753,
        lng: Number(r.lng) || 70.1337
    };

    geocoder = new google.maps.Geocoder();

    map = new google.maps.Map(
        document.getElementById("restaurantMap"),
        {
            zoom: 16,
            center: center,
            mapTypeControl:false,
            streetViewControl:false,
            fullscreenControl:true
        }
    );

    marker = new google.maps.Marker({
        position:center,
        map:map,
        draggable:true
    });

    const searchInput =
document.getElementById("locationSearch");

const autocomplete =
new google.maps.places.Autocomplete(searchInput);

autocomplete.addListener("place_changed",()=>{

const place=autocomplete.getPlace();

if(!place.geometry)return;

const location={

lat:place.geometry.location.lat(),

lng:place.geometry.location.lng()

};

map.setCenter(location);

marker.setPosition(location);

});
marker.addListener("dragend",()=>{

    const pos = marker.getPosition();

    document.getElementById("addressLine1").value = "";

    document.getElementById("area").value = "";

    document.getElementById("city").value = "";

    document.getElementById("state").value = "";

    document.getElementById("pincode").value = "";

    geocoder.geocode(
        {
            location:{
                lat:pos.lat(),
                lng:pos.lng()
            }
        },
        (results,status)=>{

            if(status==="OK" && results[0]){

                document.getElementById("addressLine1").value =
                results[0].formatted_address;

            }

        }
    );

});

}
