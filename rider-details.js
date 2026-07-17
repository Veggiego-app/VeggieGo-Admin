import {
    db,
    auth
}
from "./firebase.js"

import {
    signOut
}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"

import {

    doc,
    onSnapshot,
    updateDoc,
    getDoc

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

const riderOnline =
    document.getElementById(
        "riderOnline"
    )

const riderDeliveries =
    document.getElementById(
        "riderDeliveries"
    )

const riderEarnings =
    document.getElementById(
        "riderEarnings"
    )

const activeOrder =
    document.getElementById(
        "activeOrder"
    )

const riderStatus =
    document.getElementById(
        "riderStatus"
    )

    const riderCode =
    document.getElementById(
        "riderCode"
    )

const editZone =
    document.getElementById(
        "editZone"
    )

    const editName =
    document.getElementById(
        "editName"
    )

const editVehicleNumber =
    document.getElementById(
        "editVehicleNumber"
    )

const editLicenseNumber =
    document.getElementById(
        "editLicenseNumber"
    )
    let map
let riderMarker
let restaurantMarker
let customerMarker
let routeLine

let detailsLoaded = false

onSnapshot(

    doc(db, "riders", riderId),

    (docSnap) => {

        const rider =
    docSnap.data()

if (!rider) return
    const lat =
    rider.lat || 23.0753

const lng =
    rider.lng || 70.1337
    
 riderName.innerHTML =
    rider.name || "-"

riderPhone.innerHTML =
    rider.phone || "-"

riderOnline.innerHTML =
    rider.online
    ?
    "ONLINE"
    :
    "OFFLINE"

riderDeliveries.innerHTML =
    rider.totalDeliveries || 0

riderEarnings.innerHTML =
    rider.earnings || 0

activeOrder.innerHTML =
    rider.activeOrderId || "None"

riderStatus.innerHTML =
    rider.status || "PENDING"

riderCode.innerHTML =
    rider.riderCode || "Not Generated"

if (!detailsLoaded) {

    editName.value =
        rider.name || ""

    editZone.value =
        rider.zone || "Gandhidham"

    editVehicleNumber.value =
        rider.vehicleNumber || ""

    editLicenseNumber.value =
        rider.licenseNumber || ""

    detailsLoaded = true
}

            if (!map) {

    map =
        L.map('map').setView(
            [lat, lng],
            15
        )

    L.tileLayer(

        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',

        {
            attribution:
                'VeggieGo Map'
        }

    ).addTo(map)

    const bikeIcon =
    L.icon({

        iconUrl:
            'bike.png',

        iconSize:
            [45, 45],

        iconAnchor:
            [22, 22]

    })

riderMarker =
    L.marker(

        [lat, lng],

        {
            icon: bikeIcon
        }

    )

.addTo(map)

.bindPopup(
    "🚚 Rider Live Location"
)

.openPopup()
    

} else {

    const currentPosition =
    riderMarker.getLatLng()

const newLat =
    currentPosition.lat +
    (
        lat -
        currentPosition.lat
    ) * 0.1

const newLng =
    currentPosition.lng +
    (
        lng -
        currentPosition.lng
    ) * 0.1


riderMarker.setLatLng(

    [
        newLat,
        newLng
    ]

)
}
    }
)

window.approveRider =
async() => {

    await updateDoc(

        doc(
            db,
            "riders",
            riderId
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
async() => {

    await updateDoc(

        doc(
            db,
            "riders",
            riderId
        ),

        {
            status: "REJECTED"
        }
    )

    alert(
        "Rider Rejected 😎"
    )
}

window.forceOffline =
async() => {

    await updateDoc(

        doc(
            db,
            "riders",
            riderId
        ),

        {
            online: false
        }
    )

    alert(
        "Rider Forced Offline 😎"
    )
}
window.saveProfile =
async () => {

    let riderCodeValue = ""

const riderRef =
    doc(
        db,
        "riders",
        riderId
    )

const riderSnap =
    await getDoc(
        riderRef
    )

if (riderSnap.exists()) {

    riderCodeValue =
        riderSnap.data().riderCode || ""

}

if (riderCodeValue === "") {

    riderCodeValue =
    "VGR-" +
    riderId.substring(0, 6).toUpperCase()

}

    await updateDoc(

        doc(db, "riders", riderId),

        {

            name:
                editName.value.trim(),

            zone:
    editZone.value,

            vehicleNumber:
                editVehicleNumber.value.trim(),

            licenseNumber:
                editLicenseNumber.value.trim(),

            riderCode:
    riderCodeValue

        }

    )
    

    alert(
    "✅ Rider Profile Updated Successfully"
)

}
const logoutBtn =
document.getElementById(
"logoutBtn"
)

if(logoutBtn){

logoutBtn.onclick =
async ()=>{

await signOut(auth)

window.location.href =
"login.html"

}

}