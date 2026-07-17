import {
db,
auth,
storage,
app
}
from "./firebase.js"

import {
    collection,
    addDoc
}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"

import {
    createUserWithEmailAndPassword
}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"

import {
    ref,
    uploadBytes,
    getDownloadURL
}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js"

import {
initializeApp
}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js"

import {
getAuth
}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"

const secondaryApp =
initializeApp(

{

apiKey:
"AIzaSyCGxua4ApZbRdYP1wA6e8b4AwvqdKxrZVc",

authDomain:
"veggie-go-98215.firebaseapp.com",

projectId:
"veggie-go-98215",

storageBucket:
"veggie-go-98215.firebasestorage.app",

messagingSenderId:
"472084397101",

appId:
"1:472084397101:web:297e14252e111e597b0ca4"

},

"RestaurantCreator"

)

const secondaryAuth =
getAuth(
secondaryApp
)

let map
let marker
let geocoder

window.addEventListener(
    "load",
    initMap
)

function initMap() {

    const center = {

        lat: 23.0753,
        lng: 70.1337

    }

    geocoder =
        new google.maps.Geocoder()

    map =
        new google.maps.Map(

            document.getElementById(
                "map"
            ),

            {

                zoom: 13,

                center

            }

        )

    marker =
        new google.maps.Marker({

            position: center,

            map,

            draggable: true

        })

    updateLatLng(center)
    const autocomplete =

new google.maps.places.Autocomplete(

document.getElementById(
"searchAddress"
)

)

autocomplete.addListener(

"place_changed",

()=>{

const place =
autocomplete.getPlace()

if(
!place.geometry
)
return

const location = {

lat:
place.geometry.location.lat(),

lng:
place.geometry.location.lng()

}

map.setCenter(location)

marker.setPosition(location)

updateLatLng(location)

fillAddress(location)

}

)

    marker.addListener(

"dragend",

() => {

const pos =
marker.getPosition()

const location = {

lat: pos.lat(),

lng: pos.lng()

}

updateLatLng(location)

fillAddress(location)

}

)
}
function updateLatLng(
    location
) {

    document.getElementById(
        "latitude"
    ).value =
        location.lat

    document.getElementById(
        "longitude"
    ).value =
        location.lng

}
function fillAddress(
location
){

geocoder.geocode(

{
location
},

(
results,
status
)=>{

if(
status !== "OK"
||
!results[0]
)
return

document
.getElementById(
"addressLine1"
)
.value =
results[0]
.formatted_address

const components =
results[0]
.address_components

components.forEach(c=>{

if(
c.types.includes(
"locality"
)
){

document
.getElementById(
"city"
)
.value =
c.long_name

document
.getElementById(
"liveCity"
)
.innerText =
c.long_name

}

if(
c.types.includes(
"administrative_area_level_1"
)
){

document
.getElementById(
"state"
)
.value =
c.long_name

}

if(
c.types.includes(
"postal_code"
)
){

document
.getElementById(
"pincode"
)
.value =
c.long_name

}

})

}

)

}
document
.getElementById(
"restaurantLogo"
)
.addEventListener(
"change",
(e)=>{

const file =
e.target.files[0]

if(!file) return

const reader =
new FileReader()

reader.onload =
function(){

const img =
document.getElementById(
"logoPreview"
)

img.src =
reader.result
document
.getElementById(
"liveLogo"
)
.src =
reader.result

img.style.display =
"block"

}

reader.readAsDataURL(
file
)

}
)
document
.getElementById(
"restaurantBanner"
)
.addEventListener(
"change",
(e)=>{

const file =
e.target.files[0]

if(!file) return

const reader =
new FileReader()

reader.onload =
function(){

const img =
document.getElementById(
"bannerPreview"
)

img.src =
reader.result

img.style.display =
"block"

}

reader.readAsDataURL(
file
)

}
)
document
.getElementById(
"gstDocument"
)
.addEventListener(
"change",
(e)=>{

const file =
e.target.files[0]

if(!file) return

const reader =
new FileReader()

reader.onload =
function(){

const img =
document.getElementById(
"gstPreview"
)

img.src =
reader.result

img.style.display =
"block"

}

reader.readAsDataURL(file)

}
)
document
.getElementById(
"fssaiDocument"
)
.addEventListener(
"change",
(e)=>{

const file =
e.target.files[0]

if(!file) return

const reader =
new FileReader()

reader.onload =
function(){

const img =
document.getElementById(
"fssaiPreview"
)

img.src =
reader.result

img.style.display =
"block"

}

reader.readAsDataURL(file)

}
)
document
.getElementById(
"createRestaurantBtn"
)
.addEventListener(
"click",
async ()=>{

const loadingOverlay =
document.getElementById(
"loadingOverlay"
)

const successModal =
document.getElementById(
"successModal"
)

loadingOverlay.style.display =
"flex"

try{

const restaurantName =
document.getElementById(
"restaurantName"
).value

const ownerName =
document.getElementById(
"ownerName"
).value

const ownerPhone =
document.getElementById(
"ownerPhone"
).value

const restaurantPhone =
document.getElementById(
"restaurantPhone"
).value

const email =
document.getElementById(
"email"
).value

const loginEmail =
document.getElementById(
"loginEmail"
).value

const loginPassword =
document.getElementById(
"loginPassword"
).value

const logoFile =
document.getElementById(
"restaurantLogo"
).files[0]

const bannerFile =
document.getElementById(
"restaurantBanner"
).files[0]

const gstFile =
document.getElementById(
"gstDocument"
).files[0]

const fssaiFile =
document.getElementById(
"fssaiDocument"
).files[0]

let logoUrl = ""
let logoPath = ""

let bannerUrl = ""
let bannerPath = ""

let gstDocumentUrl = ""
let gstDocumentPath = ""

let fssaiDocumentUrl = ""
let fssaiDocumentPath = ""

const restaurantCode =

"VG" +

Date.now()
.toString()
.slice(-5)

const userCredential =

await createUserWithEmailAndPassword(

secondaryAuth,

loginEmail,

loginPassword

)
// LOGO

if(logoFile){

logoPath =
`restaurant-logos/${restaurantCode}_logo.webp`

const logoRef =
ref(
storage,
logoPath
)

await uploadBytes(
logoRef,
logoFile
)

logoUrl =
await getDownloadURL(
logoRef
)

}

// BANNER

if(bannerFile){

bannerPath =
`restaurant-banners/${restaurantCode}_banner.webp`

const bannerRef =
ref(
storage,
bannerPath
)

await uploadBytes(
bannerRef,
bannerFile
)

bannerUrl =
await getDownloadURL(
bannerRef
)

}

// GST

if(gstFile){

gstDocumentPath =
`restaurant-gst/${restaurantCode}_gst.pdf`

const gstRef =
ref(
storage,
gstDocumentPath
)

await uploadBytes(
gstRef,
gstFile
)

gstDocumentUrl =
await getDownloadURL(
gstRef
)

}

// FSSAI

if(fssaiFile){

fssaiDocumentPath =
`restaurant-fssai/${restaurantCode}_fssai.pdf`

const fssaiRef =
ref(
storage,
fssaiDocumentPath
)

await uploadBytes(
fssaiRef,
fssaiFile
)

fssaiDocumentUrl =
await getDownloadURL(
fssaiRef
)

}

const userId =
userCredential.user.uid

const addressLine1 =
document.getElementById(
"addressLine1"
).value

const addressLine2 =
document.getElementById(
"addressLine2"
).value

const area =
document.getElementById(
"area"
).value

const city =
document.getElementById(
"city"
).value

const state =
document.getElementById(
"state"
).value

const pincode =
document.getElementById(
"pincode"
).value

const latitude =
Number(
document.getElementById(
"latitude"
).value
)

const longitude =
Number(
document.getElementById(
"longitude"
).value
)

const commissionPercent =
Number(
document.getElementById(
"commissionPercent"
).value
)

const packagingFee =
Number(
document.getElementById(
"packagingFee"
).value
)

const minimumOrder =
Number(
document.getElementById(
"minimumOrder"
).value
)

const maxDeliveryDistance =
Number(
document.getElementById(
"maxDeliveryDistance"
).value
)

const zone =
document.getElementById(
"zone"
).value

const gstNumber =
document.getElementById(
"gstNumber"
).value

const fssaiNumber =
document.getElementById(
"fssaiNumber"
).value

const bankName =
document.getElementById(
"bankName"
).value

const accountHolder =
document.getElementById(
"accountHolder"
).value

const accountNumber =
document.getElementById(
"accountNumber"
).value

const ifscCode =
document.getElementById(
"ifscCode"
).value

const upiId =
document.getElementById(
"upiId"
).value

await addDoc(

collection(
db,
"restaurants"
),

{

userId,
restaurantCode,

name:
restaurantName,

logoUrl,
logoPath,

bannerUrl,
bannerPath,

gstDocumentUrl,
gstDocumentPath,

fssaiDocumentUrl,
fssaiDocumentPath,

restaurantName,

ownerName,

ownerPhone,

restaurantPhone,

email,

addressLine1,
addressLine2,
area,
city,
state,
pincode,

lat:
latitude,

lng:
longitude,

commissionPercent,
packagingFee,
minimumOrder,
maxDeliveryDistance,

gstNumber,
fssaiNumber,

bankName,
accountHolder,
accountNumber,
ifscCode,
upiId,

zone,

status:
"APPROVED",

online:
true,

temporaryClosed:
false,

createdAt:
Date.now()

}

)

loadingOverlay.style.display =
"none"

successModal.style.display =
"flex"

}
catch(error){

loadingOverlay.style.display =
"none"

alert(
error.message
)

}

}
)
document
.getElementById(
"restaurantName"
)
.addEventListener(
"input",
e=>{

document
.getElementById(
"liveName"
)
.innerText =
e.target.value

}
)
document
.getElementById(
"city"
)
.addEventListener(
"input",
e=>{

document
.getElementById(
"liveCity"
)
.innerText =
e.target.value

}
)