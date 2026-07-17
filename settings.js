import { db } from "./firebase.js"
import { auth } from "./firebase.js"
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"
import { signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"

let settingsData = {}
let freeDeliveryRules = []
window.freeDeliveryRules =
    freeDeliveryRules
    
let surgeSlots = []
window.surgeSlots =
    surgeSlots

// ======================== LOGOUT ========================
document.getElementById("logoutBtn").addEventListener("click", () => {
    signOut(auth).then(() => {
        window.location.href = "login.html"
    })
})

// ======================== LOAD SETTINGS ========================
async function loadSettings() {
    try {
        const docRef = doc(db, "settings", "app")
        const docSnap = await getDoc(docRef)
        
        if (docSnap.exists()) {

    settingsData = docSnap.data()

    freeDeliveryRules =
    settingsData.freeDeliveryRules || []

window.freeDeliveryRules =
    freeDeliveryRules
    surgeSlots =

settingsData.surgeSlots || []

window.surgeSlots =
surgeSlots

populateSettingsForm()

renderFreeDeliveryRules()

renderSurgeSlots()


}
    } catch (error) {
        console.log("Loading default settings")
    }
}

// ======================== POPULATE FORM ========================
function populateSettingsForm() {
    // General Settings
    if (settingsData.appName) document.getElementById("appName").value = settingsData.appName
    if (settingsData.companyName) document.getElementById("companyName").value = settingsData.companyName
    if (settingsData.companyAddress) document.getElementById("companyAddress").value = settingsData.companyAddress
    if (settingsData.supportNumber) document.getElementById("supportNumber").value = settingsData.supportNumber
    if (settingsData.supportEmail) document.getElementById("supportEmail").value = settingsData.supportEmail

    // Charges Settings
    if (settingsData.deliveryCharge !== undefined) document.getElementById("deliveryCharge").value = settingsData.deliveryCharge
    if (settingsData.platformFee !== undefined) document.getElementById("platformFee").value = settingsData.platformFee
    if (settingsData.packagingFee !== undefined) document.getElementById("packagingFee").value = settingsData.packagingFee
    if (settingsData.gstPercentage !== undefined) document.getElementById("gstPercentage").value = settingsData.gstPercentage
    if (settingsData.minimumOrder !== undefined) document.getElementById("minimumOrder").value = settingsData.minimumOrder

    // Commission Settings
    if (settingsData.restaurantCommission !== undefined) document.getElementById("restaurantCommission").value = settingsData.restaurantCommission
    if (settingsData.riderCommission !== undefined) document.getElementById("riderCommission").value = settingsData.riderCommission
    if (settingsData.deliveryBaseFee !== undefined)
document.getElementById("deliveryBaseFee").value =
settingsData.deliveryBaseFee

if (settingsData.deliveryPerKm !== undefined)
document.getElementById("deliveryPerKm").value =
settingsData.deliveryPerKm

if (settingsData.maxDeliveryDistance !== undefined)
document.getElementById("maxDeliveryDistance").value =
settingsData.maxDeliveryDistance

if (settingsData.riderBasePay !== undefined)
document.getElementById("riderBasePay").value =
settingsData.riderBasePay

if (settingsData.riderPerKm !== undefined)
document.getElementById("riderPerKm").value =
settingsData.riderPerKm

if (settingsData.minimumRiderPay !== undefined)
document.getElementById("minimumRiderPay").value =
settingsData.minimumRiderPay

if (settingsData.restaurantCommissionDefault !== undefined)
document.getElementById("restaurantCommissionDefault").value =
settingsData.restaurantCommissionDefault


    // Coupon Settings
    if (settingsData.enableCoupons !== undefined) document.getElementById("enableCoupons").checked = settingsData.enableCoupons
    if (settingsData.defaultCoupon) document.getElementById("defaultCoupon").value = settingsData.defaultCoupon
    if (settingsData.couponDiscount !== undefined) document.getElementById("couponDiscount").value = settingsData.couponDiscount

    // Banner Settings
    if (settingsData.homeBanner) document.getElementById("homeBanner").value = settingsData.homeBanner
    if (settingsData.offerBanner) document.getElementById("offerBanner").value = settingsData.offerBanner

    // Order Settings
    if (settingsData.autoAssignRider !== undefined) document.getElementById("autoAssignRider").checked = settingsData.autoAssignRider
    if (settingsData.restaurantApproval !== undefined) document.getElementById("restaurantApproval").checked = settingsData.restaurantApproval
    if (settingsData.allowCancellation !== undefined) document.getElementById("allowCancellation").checked = settingsData.allowCancellation

    // Notification Settings
    if (settingsData.enablePushNotifications !== undefined) document.getElementById("enablePushNotifications").checked = settingsData.enablePushNotifications
    if (settingsData.enableRiderNotifications !== undefined) document.getElementById("enableRiderNotifications").checked = settingsData.enableRiderNotifications
    if (settingsData.enableRestaurantNotifications !== undefined) document.getElementById("enableRestaurantNotifications").checked = settingsData.enableRestaurantNotifications

    // Zone Settings
    if (settingsData.zoneGandhidham !== undefined) document.getElementById("zoneGandhidham").checked = settingsData.zoneGandhidham
    if (settingsData.zoneAdlipur !== undefined) document.getElementById("zoneAdlipur").checked = settingsData.zoneAdlipur
    if (settingsData.zoneAnjar !== undefined) document.getElementById("zoneAnjar").checked = settingsData.zoneAnjar
    if (settingsData.zoneBhuj !== undefined) document.getElementById("zoneBhuj").checked = settingsData.zoneBhuj

    // Maintenance Settings
    if (settingsData.maintenanceMode !== undefined) document.getElementById("maintenanceMode").checked = settingsData.maintenanceMode
    if (settingsData.maintenanceMessage) document.getElementById("maintenanceMessage").value = settingsData.maintenanceMessage
}

// ======================== SAVE SETTINGS ========================
document.getElementById("saveSettings").addEventListener("click", async () => {
    try {
        // Validate Free Delivery Rules

const duplicate = new Set()

for (const rule of freeDeliveryRules) {

    if (rule.minOrder <= 0) {

        alert("Minimum Order must be greater than 0")

        return

    }

    if (rule.freeKm < 0) {

        alert("Free KM cannot be negative")

        return

    }

    if (duplicate.has(rule.minOrder)) {

        alert("Duplicate Minimum Order not allowed")

        return

    }

    duplicate.add(rule.minOrder)

}

freeDeliveryRules.sort(
    (a, b) => a.minOrder - b.minOrder
)
        const newSettings = {
            // General Settings
            appName: document.getElementById("appName").value,
            companyName: document.getElementById("companyName").value,
            companyAddress: document.getElementById("companyAddress").value,
            supportNumber: document.getElementById("supportNumber").value,
            supportEmail: document.getElementById("supportEmail").value,

            // Charges Settings
            deliveryCharge: parseFloat(document.getElementById("deliveryCharge").value),
            platformFee: parseFloat(document.getElementById("platformFee").value),
            packagingFee: parseFloat(document.getElementById("packagingFee").value),
            gstPercentage: parseFloat(document.getElementById("gstPercentage").value),
            minimumOrder: parseFloat(document.getElementById("minimumOrder").value),

            // Commission Settings
            restaurantCommission: parseFloat(document.getElementById("restaurantCommission").value),
            riderCommission: parseFloat(document.getElementById("riderCommission").value),
            deliveryBaseFee:
parseFloat(
document.getElementById(
"deliveryBaseFee"
).value
),

deliveryPerKm:
parseFloat(
document.getElementById(
"deliveryPerKm"
).value
),

maxDeliveryDistance:
parseFloat(
document.getElementById(
"maxDeliveryDistance"
).value
),

riderBasePay:
parseFloat(
document.getElementById(
"riderBasePay"
).value
),

riderPerKm:
parseFloat(
document.getElementById(
"riderPerKm"
).value
),

minimumRiderPay:
parseFloat(
document.getElementById(
"minimumRiderPay"
).value
),

restaurantCommissionDefault:
parseFloat(
document.getElementById(
"restaurantCommissionDefault"
).value
),

            // Coupon Settings
            enableCoupons: document.getElementById("enableCoupons").checked,
            defaultCoupon: document.getElementById("defaultCoupon").value,
            couponDiscount: parseFloat(document.getElementById("couponDiscount").value),

            // Banner Settings
            homeBanner: document.getElementById("homeBanner").value,
            offerBanner: document.getElementById("offerBanner").value,

            // Order Settings
            autoAssignRider: document.getElementById("autoAssignRider").checked,
            restaurantApproval: document.getElementById("restaurantApproval").checked,
            allowCancellation: document.getElementById("allowCancellation").checked,

            // Notification Settings
            enablePushNotifications: document.getElementById("enablePushNotifications").checked,
            enableRiderNotifications: document.getElementById("enableRiderNotifications").checked,
            enableRestaurantNotifications: document.getElementById("enableRestaurantNotifications").checked,

            // Zone Settings
            zoneGandhidham: document.getElementById("zoneGandhidham").checked,
            zoneAdlipur: document.getElementById("zoneAdlipur").checked,
            zoneAnjar: document.getElementById("zoneAnjar").checked,
            zoneBhuj: document.getElementById("zoneBhuj").checked,

            // Maintenance Settings
            maintenanceMode: document.getElementById("maintenanceMode").checked,
            maintenanceMessage: document.getElementById("maintenanceMessage").value,

            freeDeliveryRules:
freeDeliveryRules,

surgeSlots:
surgeSlots,

updatedAt:
new Date().toISOString()
        }

        await setDoc(doc(db, "settings", "app"), newSettings)
        
        settingsData = newSettings
        
        // Show success message
        const btn = document.getElementById("saveSettings")
        const originalText = btn.textContent
        btn.textContent = "✅ Settings Saved!"
        btn.style.background = "linear-gradient(135deg, #10b981, #059669)"
        
        setTimeout(() => {
            btn.textContent = originalText
        }, 3000)
    } catch (error) {
        console.error("Error saving settings:", error)
        alert("Error saving settings. Please try again.")
    }
})

// ======================== RESET SETTINGS ========================
document.getElementById("resetSettings").addEventListener("click", () => {
    if (confirm("Are you sure you want to reset all settings to default values?")) {
        populateSettingsForm()
        alert("Settings reset to saved values.")
    }
})

// ======================== MAINTENANCE MODE TOGGLE ========================
document.getElementById("maintenanceMode").addEventListener("change", (e) => {
    const messageGroup = document.getElementById("maintenanceMessageGroup")
    messageGroup.style.display = e.target.checked ? "flex" : "none"
})
function renderFreeDeliveryRules() {
    

    const container =
        document.getElementById(
            "freeDeliveryRulesContainer"
        )

    if (!container) return

    container.innerHTML = ""

    freeDeliveryRules.forEach(
        (rule, index) => {

            container.innerHTML += `

            <div style="
            display:flex;
            gap:10px;
            margin-bottom:10px;
            ">

                <input
    type="number"
    placeholder="Order Amount"
    value="${rule.minOrder || ''}"

    oninput="
window.freeDeliveryRules[${index}].minOrder =
Number(this.value)
"
>

<input
    type="number"
    placeholder="Free KM"
    value="${rule.freeKm || ''}"

    oninput="
window.freeDeliveryRules[${index}].freeKm =
Number(this.value)
"
>

<button
    onclick="
    window.freeDeliveryRules.splice(
        ${index},
        1
    );

    window.renderFreeDeliveryRules();
    "
>
❌
</button>

            </div>

            `
        }
    )

}
window.renderFreeDeliveryRules =
    renderFreeDeliveryRules
document
.getElementById(
    "addFreeDeliveryRule"
)
.addEventListener(
    "click",
    () => {

        window.freeDeliveryRules.push({

    minOrder: 0,

    freeKm: 0

})

window.renderFreeDeliveryRules()


    }
)
function renderSurgeSlots() {

    const container =
        document.getElementById(
            "surgeSlotsContainer"
        )

    if (!container) return

    container.innerHTML = ""

    surgeSlots.forEach(
        (slot, index) => {

            container.innerHTML += `

            <div style="
            display:flex;
            gap:10px;
            margin-bottom:10px;
            flex-wrap:wrap;
            ">

                <input
                    type="time"
                    value="${slot.start || ''}"

                    oninput="
window.surgeSlots[${index}].start=
this.value
"
                >

                <input
                    type="time"
                    value="${slot.end || ''}"

                    oninput="
window.surgeSlots[${index}].end=
this.value
"
                >

                <input
                    type="number"
                    placeholder="Amount"

                    value="${slot.amount || ''}"

                    oninput="
window.surgeSlots[${index}].amount=
Number(this.value)
"
                >

                <input
                    type="text"
                    placeholder="Reason"

                    value="${slot.reason || ''}"

                    oninput="
window.surgeSlots[${index}].reason=
this.value
"
                >

                <button
                    onclick="
                    window.surgeSlots.splice(
                        ${index},
                        1
                    );

                    window.renderSurgeSlots();
                    "
                >
                    ❌
                </button>

            </div>

            `
        }
    )

}
window.renderSurgeSlots =
    renderSurgeSlots

document
.getElementById(
    "addSurgeSlot"
)
.addEventListener(
    "click",
    () => {

        window.surgeSlots.push({

            start: "",

            end: "",

            amount: 0,

            reason: ""

        })

        window.renderSurgeSlots()

    }
)
renderSurgeSlots()
// Initialize
loadSettings()
