import {
    db,
    storage
} from "./firebase.js"

import {
    collection,
    addDoc,
    getDocs,
    query,
    where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"

import {
    createUserWithEmailAndPassword,
    deleteUser,
    getAuth
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"

import {
    ref,
    uploadBytes,
    getDownloadURL,
    deleteObject
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js"

import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js"

const secondaryApp = initializeApp(
    {
        apiKey: "AIzaSyCGxua4ApZbRdYP1wA6e8b4AwvqdKxrZVc",
        authDomain: "veggie-go-98215.firebaseapp.com",
        projectId: "veggie-go-98215",
        storageBucket: "veggie-go-98215.firebasestorage.app",
        messagingSenderId: "472084397101",
        appId: "1:472084397101:web:297e14252e111e597b0ca4"
    },
    "RestaurantCreator"
)

const secondaryAuth = getAuth(secondaryApp)

const DAYS = [
    { key: "monday", label: "Monday" },
    { key: "tuesday", label: "Tuesday" },
    { key: "wednesday", label: "Wednesday" },
    { key: "thursday", label: "Thursday" },
    { key: "friday", label: "Friday" },
    { key: "saturday", label: "Saturday" },
    { key: "sunday", label: "Sunday" }
]

const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i
const PINCODE_REGEX = /^\d{6}$/
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/
const UPI_REGEX = /^[a-zA-Z0-9._-]{2,}@[a-zA-Z]{2,}$/
const IMAGE_MAX_BYTES = 5 * 1024 * 1024
const DOCUMENT_MAX_BYTES = 10 * 1024 * 1024

let map
let marker
let geocoder
let locationConfirmed = false
let isSubmitting = false
let createdLoginDetails = ""

class FormValidationError extends Error {
    constructor(message, element = null) {
        super(message)
        this.name = "FormValidationError"
        this.element = element
    }
}

document.addEventListener("DOMContentLoaded", () => {
    setupLivePreview()
    setupFileInputs()
    setupInputSanitizers()
    setupWebPanelAccess()
    setupPasswordControls()
    renderTimingRows()
    setupTimingControls()
    setupFormSubmit()
    setupSuccessActions()
})

window.addEventListener("load", initMap)

function getElement(id) {
    return document.getElementById(id)
}

function valueOf(id) {
    return getElement(id).value.trim()
}

function setupInputSanitizers() {
    ;["restaurantPhone", "ownerPhone"].forEach(id => {
        getElement(id).addEventListener("input", event => {
            event.target.value = event.target.value.replace(/\D/g, "").slice(0, 10)
            clearInputError(event.target)
        })
    })

    getElement("pincode").addEventListener("input", event => {
        event.target.value = event.target.value.replace(/\D/g, "").slice(0, 6)
        clearInputError(event.target)
    })

    getElement("fssaiNumber").addEventListener("input", event => {
        event.target.value = event.target.value.replace(/\D/g, "").slice(0, 14)
    })

    getElement("accountNumber").addEventListener("input", event => {
        event.target.value = event.target.value.replace(/\D/g, "").slice(0, 24)
    })

    getElement("ifscCode").addEventListener("input", event => {
        event.target.value = event.target.value.replace(/\s/g, "").toUpperCase().slice(0, 11)
    })

    getElement("gstNumber").addEventListener("input", event => {
        event.target.value = event.target.value.replace(/\s/g, "").toUpperCase().slice(0, 15)
    })

    ;["email", "loginEmail"].forEach(id => {
        getElement(id).addEventListener("input", event => clearInputError(event.target))
    })
}

function initMap() {
    if (!window.google?.maps) {
        showFormMessage("Google Map could not load. Please refresh the page.")
        return
    }

    const center = {
        lat: 23.0753,
        lng: 70.1337
    }

    geocoder = new google.maps.Geocoder()

    map = new google.maps.Map(getElement("map"), {
        zoom: 13,
        center,
        mapTypeControl: false,
        streetViewControl: true
    })

    marker = new google.maps.Marker({
        position: center,
        map,
        draggable: true
    })

    updateLatLng(center)

    const autocomplete = new google.maps.places.Autocomplete(
        getElement("searchAddress"),
        {
            componentRestrictions: { country: "in" },
            fields: ["geometry", "formatted_address", "address_components", "name"]
        }
    )

    autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace()

        if (!place.geometry?.location) {
            showFormMessage("Please select a valid location from the search suggestions.")
            return
        }

        const location = {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng()
        }

        map.setCenter(location)
        map.setZoom(16)
        marker.setPosition(location)
        updateLatLng(location)
        applyPlaceAddress(place)
        setLocationConfirmed(true)
    })

    marker.addListener("dragend", () => {
        const position = marker.getPosition()
        const location = {
            lat: position.lat(),
            lng: position.lng()
        }

        updateLatLng(location)
        fillAddress(location)
        setLocationConfirmed(true)
    })

    map.addListener("click", event => {
        const location = {
            lat: event.latLng.lat(),
            lng: event.latLng.lng()
        }

        marker.setPosition(location)
        updateLatLng(location)
        fillAddress(location)
        setLocationConfirmed(true)
    })
}

function setLocationConfirmed(confirmed) {
    locationConfirmed = confirmed
    const status = getElement("locationStatus")

    if (confirmed) {
        status.textContent = "✓ Restaurant map location confirmed"
        status.classList.add("success-helper")
    } else {
        status.textContent = "Search a location, click the map, or move the pin to confirm."
        status.classList.remove("success-helper")
    }
}

function updateLatLng(location) {
    getElement("latitude").value = Number(location.lat).toFixed(7)
    getElement("longitude").value = Number(location.lng).toFixed(7)
}

function fillAddress(location) {
    geocoder.geocode({ location }, (results, status) => {
        if (status !== "OK" || !results?.[0]) {
            showFormMessage("Location selected, but the address could not be filled automatically. Please enter it manually.")
            return
        }

        applyPlaceAddress(results[0])
    })
}

function applyPlaceAddress(place) {
    const components = place.address_components || []
    const findComponent = (...types) => {
        const component = components.find(item => types.some(type => item.types.includes(type)))
        return component?.long_name || ""
    }

    const area = findComponent(
        "sublocality_level_1",
        "sublocality",
        "neighborhood",
        "administrative_area_level_3"
    )

    const city = findComponent(
        "locality",
        "postal_town",
        "administrative_area_level_2"
    )

    getElement("addressLine1").value = place.formatted_address || place.name || ""
    getElement("area").value = area
    getElement("city").value = city
    getElement("state").value = findComponent("administrative_area_level_1")
    getElement("pincode").value = findComponent("postal_code")
    getElement("liveCity").textContent = city || "City"
}

function setupLivePreview() {
    getElement("restaurantName").addEventListener("input", event => {
        getElement("liveName").textContent = event.target.value.trim() || "Restaurant Name"
    })

    getElement("city").addEventListener("input", event => {
        getElement("liveCity").textContent = event.target.value.trim() || "City"
    })
}

function setupFileInputs() {
    setupImagePreview({
        inputId: "restaurantLogo",
        imageId: "logoPreview",
        placeholderId: "logoPlaceholder",
        fileNameId: "logoFileName",
        maxBytes: IMAGE_MAX_BYTES,
        label: "Restaurant logo"
    })

    setupImagePreview({
        inputId: "restaurantBanner",
        imageId: "bannerPreview",
        placeholderId: "bannerPlaceholder",
        fileNameId: "bannerFileName",
        maxBytes: IMAGE_MAX_BYTES,
        label: "Restaurant banner"
    })

    setupDocumentInput("gstDocument", "gstFileName", "GST certificate")
    setupDocumentInput("fssaiDocument", "fssaiFileName", "FSSAI certificate")
}

function setupImagePreview({ inputId, imageId, placeholderId, fileNameId, maxBytes, label }) {
    getElement(inputId).addEventListener("change", event => {
        const file = event.target.files[0]
        const image = getElement(imageId)
        const placeholder = getElement(placeholderId)
        const fileName = getElement(fileNameId)

        if (!file) {
            image.removeAttribute("src")
            image.style.display = "none"
            placeholder.style.display = "flex"
            fileName.textContent = ""
            return
        }

        try {
            validateFile(file, ["image/jpeg", "image/png", "image/webp"], maxBytes, label)
        } catch (error) {
            event.target.value = ""
            showFormMessage(error.message)
            return
        }

        const reader = new FileReader()
        reader.onload = () => {
            image.src = reader.result
            image.style.display = "block"
            placeholder.style.display = "none"
            fileName.textContent = file.name
        }
        reader.readAsDataURL(file)
    })
}

function setupDocumentInput(inputId, fileNameId, label) {
    getElement(inputId).addEventListener("change", event => {
        const file = event.target.files[0]
        const fileName = getElement(fileNameId)

        if (!file) {
            fileName.textContent = "PDF or image · Max 10 MB"
            return
        }

        try {
            validateFile(
                file,
                ["application/pdf", "image/jpeg", "image/png", "image/webp"],
                DOCUMENT_MAX_BYTES,
                label
            )
            fileName.textContent = file.name
        } catch (error) {
            event.target.value = ""
            fileName.textContent = "PDF or image · Max 10 MB"
            showFormMessage(error.message)
        }
    })
}

function validateFile(file, allowedTypes, maxBytes, label) {
    if (!allowedTypes.includes(file.type)) {
        throw new FormValidationError(`${label} file type is not supported.`)
    }

    if (file.size > maxBytes) {
        const maxMb = Math.round(maxBytes / (1024 * 1024))
        throw new FormValidationError(`${label} must be smaller than ${maxMb} MB.`)
    }
}

function setupWebPanelAccess() {
    const toggle = getElement("webPanelEnabled")
    toggle.addEventListener("change", updateWebPanelAccessState)
    updateWebPanelAccessState()
}

function updateWebPanelAccessState() {
    const enabled = getElement("webPanelEnabled").checked
    const fields = ["loginEmail", "loginPassword", "confirmPassword"]

    getElement("webLoginFields").classList.toggle("is-disabled", !enabled)
    fields.forEach(id => {
        getElement(id).disabled = !enabled
        if (!enabled) clearInputError(getElement(id))
    })

    getElement("generatePasswordBtn").disabled = !enabled
    document.querySelectorAll(".password-toggle").forEach(button => {
        button.disabled = !enabled
    })
}

function setupPasswordControls() {
    document.querySelectorAll(".password-toggle").forEach(button => {
        button.addEventListener("click", () => {
            const input = getElement(button.dataset.target)
            const showPassword = input.type === "password"
            input.type = showPassword ? "text" : "password"
            button.textContent = showPassword ? "🙈" : "👁"
            button.setAttribute("aria-label", showPassword ? "Hide password" : "Show password")
        })
    })

    getElement("generatePasswordBtn").addEventListener("click", () => {
        const password = generateStrongPassword()
        getElement("loginPassword").value = password
        getElement("confirmPassword").value = password
        getElement("loginPassword").type = "text"
        getElement("confirmPassword").type = "text"
        clearInputError(getElement("loginPassword"))
        clearInputError(getElement("confirmPassword"))
    })
}

function generateStrongPassword() {
    const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ"
    const lower = "abcdefghijkmnopqrstuvwxyz"
    const numbers = "23456789"
    const symbols = "@#$!"
    const all = upper + lower + numbers + symbols
    const required = [
        randomCharacter(upper),
        randomCharacter(lower),
        randomCharacter(numbers),
        randomCharacter(symbols)
    ]

    while (required.length < 12) required.push(randomCharacter(all))

    for (let index = required.length - 1; index > 0; index -= 1) {
        const randomIndex = secureRandomIndex(index + 1)
        ;[required[index], required[randomIndex]] = [required[randomIndex], required[index]]
    }

    return required.join("")
}

function randomCharacter(characters) {
    return characters[secureRandomIndex(characters.length)]
}

function secureRandomIndex(max) {
    const values = new Uint32Array(1)
    crypto.getRandomValues(values)
    return values[0] % max
}

function renderTimingRows() {
    const container = getElement("timingDaysContainer")
    container.innerHTML = DAYS.map((day, index) => {
        const isMonday = index === 0
        return `
            <div class="timing-day-row ${isMonday ? "" : "day-closed"}" data-day="${day.key}">
                <span class="timing-day-name">${day.label}</span>
                <div class="day-status">
                    <label class="switch" aria-label="${day.label} open status">
                        <input type="checkbox" class="day-open-toggle" ${isMonday ? "checked" : ""}>
                        <span class="switch-slider"></span>
                    </label>
                    <span class="day-status-text">${isMonday ? "Open" : "Closed"}</span>
                </div>
                <div class="day-slots">
                    <span class="closed-label">Closed</span>
                    ${createTimeSlotMarkup("", "")}
                </div>
                <button type="button" class="add-day-slot-btn" ${isMonday ? "" : "disabled"}>+ Slot</button>
            </div>
        `
    }).join("")
}

function createTimeSlotMarkup(start, end) {
    return `
        <div class="time-slot">
            <input type="time" class="slot-start" value="${start}" aria-label="Opening time">
            <span class="time-slot-arrow">→</span>
            <input type="time" class="slot-end" value="${end}" aria-label="Closing time">
            <button type="button" class="delete-time-slot" aria-label="Delete time slot">🗑</button>
        </div>
    `
}

function setupTimingControls() {
    const container = getElement("timingDaysContainer")

    container.addEventListener("change", event => {
        if (!event.target.classList.contains("day-open-toggle")) return

        const row = event.target.closest(".timing-day-row")
        setDayOpenState(row, event.target.checked)
    })

    container.addEventListener("click", event => {
        const addButton = event.target.closest(".add-day-slot-btn")
        if (addButton) {
            const row = addButton.closest(".timing-day-row")
            row.querySelector(".day-slots").insertAdjacentHTML("beforeend", createTimeSlotMarkup("", ""))
            return
        }

        const deleteButton = event.target.closest(".delete-time-slot")
        if (!deleteButton) return

        const row = deleteButton.closest(".timing-day-row")
        const slots = row.querySelectorAll(".time-slot")

        if (slots.length === 1) {
            slots[0].querySelector(".slot-start").value = ""
            slots[0].querySelector(".slot-end").value = ""
            return
        }

        deleteButton.closest(".time-slot").remove()
    })

    getElement("copyMondayBtn").addEventListener("click", copyMondayToAllDays)
}

function setDayOpenState(row, isOpen) {
    row.classList.toggle("day-closed", !isOpen)
    row.querySelector(".day-status-text").textContent = isOpen ? "Open" : "Closed"
    row.querySelector(".add-day-slot-btn").disabled = !isOpen
    row.querySelectorAll(".time-slot input").forEach(input => {
        input.disabled = !isOpen
    })
}

function copyMondayToAllDays() {
    const mondayRow = getElement("timingDaysContainer").querySelector('[data-day="monday"]')
    const mondayOpen = mondayRow.querySelector(".day-open-toggle").checked
    const mondaySlots = [...mondayRow.querySelectorAll(".time-slot")].map(slot => ({
        start: slot.querySelector(".slot-start").value,
        end: slot.querySelector(".slot-end").value
    }))

    DAYS.slice(1).forEach(day => {
        const row = getElement("timingDaysContainer").querySelector(`[data-day="${day.key}"]`)
        row.querySelector(".day-open-toggle").checked = mondayOpen
        row.querySelector(".day-slots").innerHTML = `
            <span class="closed-label">Closed</span>
            ${mondaySlots.map(slot => createTimeSlotMarkup(slot.start, slot.end)).join("")}
        `
        setDayOpenState(row, mondayOpen)
    })

    showFormMessage("Monday timing copied to all days.", "success")
}

function collectAndValidateTimings() {
    const weeklySlots = {}
    let openDayCount = 0

    DAYS.forEach(day => {
        const row = getElement("timingDaysContainer").querySelector(`[data-day="${day.key}"]`)
        const isOpen = row.querySelector(".day-open-toggle").checked
        const slots = []

        if (isOpen) {
            openDayCount += 1

            row.querySelectorAll(".time-slot").forEach(slotElement => {
                const startInput = slotElement.querySelector(".slot-start")
                const endInput = slotElement.querySelector(".slot-end")
                const start = startInput.value
                const end = endInput.value

                if (!start || !end) {
                    throw new FormValidationError(`Enter both start and end time for ${day.label}.`, !start ? startInput : endInput)
                }

                if (timeToMinutes(end) <= timeToMinutes(start)) {
                    throw new FormValidationError(`${day.label} closing time must be after opening time.`, endInput)
                }

                slots.push({ start, end })
            })

            if (slots.length === 0) {
                throw new FormValidationError(`Add at least one time slot for ${day.label}.`, row)
            }

            const sortedSlots = [...slots].sort((first, second) => timeToMinutes(first.start) - timeToMinutes(second.start))
            for (let index = 1; index < sortedSlots.length; index += 1) {
                if (timeToMinutes(sortedSlots[index].start) < timeToMinutes(sortedSlots[index - 1].end)) {
                    throw new FormValidationError(`${day.label} time slots cannot overlap.`, row)
                }
            }
        }

        weeklySlots[day.label] = isOpen ? slots : []
    })

    if (openDayCount === 0) {
        throw new FormValidationError("Keep at least one restaurant day open.", getElement("timingDaysContainer"))
    }

    return weeklySlots
}

function timeToMinutes(time) {
    const [hours, minutes] = time.split(":").map(Number)
    return (hours * 60) + minutes
}

function setupFormSubmit() {
    getElement("addRestaurantForm").addEventListener("submit", handleCreateRestaurant)
}

async function handleCreateRestaurant(event) {
    event.preventDefault()

    if (isSubmitting) return

    clearAllInputErrors()
    hideFormMessage()

    let formData

    try {
        formData = validateForm()
    } catch (error) {
        handleFormError(error)
        return
    }

    isSubmitting = true
    setLoading(true, "Checking restaurant details...")

    let createdAuthUser = null
    const uploadedRefs = []
    let restaurantCreated = false

    try {
        await ensureRestaurantPhoneIsUnique(formData.restaurantPhone)

        const restaurantCode = createRestaurantCode()
        setLoading(true, "Uploading restaurant files...")

        const logo = await uploadOptionalFile(
            formData.logoFile,
            `restaurant-logos/${restaurantCode}_logo`,
            uploadedRefs
        )

        const banner = await uploadOptionalFile(
            formData.bannerFile,
            `restaurant-banners/${restaurantCode}_banner`,
            uploadedRefs
        )

        const gstDocument = await uploadOptionalFile(
            formData.gstFile,
            `restaurant-gst/${restaurantCode}_gst`,
            uploadedRefs
        )

        const fssaiDocument = await uploadOptionalFile(
            formData.fssaiFile,
            `restaurant-fssai/${restaurantCode}_fssai`,
            uploadedRefs
        )

        let userId = ""

        if (formData.webPanelEnabled) {
            setLoading(true, "Creating Web Panel login...")
            const credential = await createUserWithEmailAndPassword(
                secondaryAuth,
                formData.loginEmail,
                formData.loginPassword
            )
            createdAuthUser = credential.user
            userId = credential.user.uid
        }

        setLoading(true, "Saving restaurant details...")

        await addDoc(collection(db, "restaurants"), {
            userId,
            restaurantCode,

            name: formData.restaurantName,
            restaurantName: formData.restaurantName,
            ownerName: formData.ownerName,
            ownerPhone: formData.ownerPhone,
            restaurantPhone: formData.restaurantPhone,
            email: formData.email,

            webPanelEnabled: formData.webPanelEnabled,
            loginEmail: formData.webPanelEnabled ? formData.loginEmail : "",

            logoUrl: logo.url,
            logoPath: logo.path,
            bannerUrl: banner.url,
            bannerPath: banner.path,

            gstDocumentUrl: gstDocument.url,
            gstDocumentPath: gstDocument.path,
            fssaiDocumentUrl: fssaiDocument.url,
            fssaiDocumentPath: fssaiDocument.path,

            addressLine1: formData.addressLine1,
            addressLine2: formData.addressLine2,
            area: formData.area,
            city: formData.city,
            state: formData.state,
            pincode: formData.pincode,
            lat: formData.latitude,
            lng: formData.longitude,

            commissionPercent: formData.commissionPercent,
            packagingFee: formData.packagingFee,
            minimumOrder: formData.minimumOrder,
            maxDeliveryDistance: formData.maxDeliveryDistance,
            zone: formData.zone,

            gstNumber: formData.gstNumber,
            fssaiNumber: formData.fssaiNumber,

            bankName: formData.bankName,
            accountHolder: formData.accountHolder,
            accountNumber: formData.accountNumber,
            ifscCode: formData.ifscCode,
            upiId: formData.upiId,

            weeklySlots: formData.weeklySlots,
            timingTimezone: "Asia/Kolkata",

            status: "APPROVED",
            online: false,
            temporaryClosed: false,
            createdAt: Date.now(),
            updatedAt: Date.now()
        })

        restaurantCreated = true
        createdLoginDetails = buildLoginDetailsText(formData, restaurantCode)
        showSuccessModal(formData, restaurantCode)
    } catch (error) {
        if (!restaurantCreated) {
            await cleanupFailedCreation(createdAuthUser, uploadedRefs)
        }
        handleFormError(normalizeFirebaseError(error))
    } finally {
        setLoading(false)
        isSubmitting = false
    }
}

function validateForm() {
    const restaurantName = requireText("restaurantName", "Enter the restaurant name.")
    const ownerName = requireText("ownerName", "Enter the owner name.")
    const restaurantPhone = requireText("restaurantPhone", "Enter the restaurant mobile number.")
    const ownerPhone = valueOf("ownerPhone")
    const email = valueOf("email").toLowerCase()

    if (!INDIAN_MOBILE_REGEX.test(restaurantPhone)) {
        throw new FormValidationError(
            "Enter a valid 10-digit Indian restaurant mobile number starting with 6, 7, 8 or 9.",
            getElement("restaurantPhone")
        )
    }

    if (ownerPhone && !INDIAN_MOBILE_REGEX.test(ownerPhone)) {
        throw new FormValidationError(
            "Enter a valid 10-digit Indian owner mobile number starting with 6, 7, 8 or 9.",
            getElement("ownerPhone")
        )
    }

    if (email && !EMAIL_REGEX.test(email)) {
        throw new FormValidationError("Enter a valid contact email address.", getElement("email"))
    }

    const addressLine1 = requireText("addressLine1", "Enter Address Line 1.")
    const addressLine2 = valueOf("addressLine2")
    const area = requireText("area", "Enter the restaurant area.")
    const city = requireText("city", "Enter the city.")
    const state = requireText("state", "Enter the state.")
    const pincode = requireText("pincode", "Enter the pincode.")

    if (!PINCODE_REGEX.test(pincode)) {
        throw new FormValidationError("Enter a valid 6-digit pincode.", getElement("pincode"))
    }

    if (!locationConfirmed) {
        throw new FormValidationError(
            "Confirm the restaurant location by searching, clicking the map, or moving the pin.",
            getElement("searchAddress")
        )
    }

    const latitude = Number(valueOf("latitude"))
    const longitude = Number(valueOf("longitude"))

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        throw new FormValidationError("Restaurant map coordinates are invalid.", getElement("searchAddress"))
    }

    const commissionPercent = requireNumber("commissionPercent", "Enter commission percentage.", 0, 100)
    const packagingFee = optionalNumber("packagingFee", 0, 0)
    const minimumOrder = requireNumber("minimumOrder", "Enter the minimum order amount.", 0)
    const maxDeliveryDistance = requireNumber(
        "maxDeliveryDistance",
        "Enter the maximum delivery distance.",
        0.1
    )
    const zone = requireText("zone", "Select a restaurant zone.")

    const webPanelEnabled = getElement("webPanelEnabled").checked
    let loginEmail = ""
    let loginPassword = ""

    if (webPanelEnabled) {
        loginEmail = requireText("loginEmail", "Enter the Web Panel login email.").toLowerCase()
        loginPassword = requireText("loginPassword", "Enter the Web Panel password.")
        const confirmPassword = requireText("confirmPassword", "Confirm the Web Panel password.")

        if (!EMAIL_REGEX.test(loginEmail)) {
            throw new FormValidationError("Enter a valid Web Panel login email address.", getElement("loginEmail"))
        }

        if (loginPassword.length < 8) {
            throw new FormValidationError("Web Panel password must contain at least 8 characters.", getElement("loginPassword"))
        }

        if (loginPassword !== confirmPassword) {
            throw new FormValidationError("Password and Confirm Password do not match.", getElement("confirmPassword"))
        }
    }

    validateOptionalBankDetails()
    const weeklySlots = collectAndValidateTimings()

    if (!getElement("detailsVerified").checked) {
        throw new FormValidationError(
            "Confirm that you have verified the restaurant details and map location.",
            getElement("detailsVerified")
        )
    }

    const logoFile = getElement("restaurantLogo").files[0] || null
    const bannerFile = getElement("restaurantBanner").files[0] || null
    const gstFile = getElement("gstDocument").files[0] || null
    const fssaiFile = getElement("fssaiDocument").files[0] || null

    if (logoFile) validateFile(logoFile, ["image/jpeg", "image/png", "image/webp"], IMAGE_MAX_BYTES, "Restaurant logo")
    if (bannerFile) validateFile(bannerFile, ["image/jpeg", "image/png", "image/webp"], IMAGE_MAX_BYTES, "Restaurant banner")
    if (gstFile) validateFile(gstFile, ["application/pdf", "image/jpeg", "image/png", "image/webp"], DOCUMENT_MAX_BYTES, "GST certificate")
    if (fssaiFile) validateFile(fssaiFile, ["application/pdf", "image/jpeg", "image/png", "image/webp"], DOCUMENT_MAX_BYTES, "FSSAI certificate")

    return {
        restaurantName,
        ownerName,
        restaurantPhone,
        ownerPhone,
        email,
        addressLine1,
        addressLine2,
        area,
        city,
        state,
        pincode,
        latitude,
        longitude,
        commissionPercent,
        packagingFee,
        minimumOrder,
        maxDeliveryDistance,
        zone,
        gstNumber: valueOf("gstNumber"),
        fssaiNumber: valueOf("fssaiNumber"),
        bankName: valueOf("bankName"),
        accountHolder: valueOf("accountHolder"),
        accountNumber: valueOf("accountNumber"),
        ifscCode: valueOf("ifscCode").toUpperCase(),
        upiId: valueOf("upiId"),
        webPanelEnabled,
        loginEmail,
        loginPassword,
        weeklySlots,
        logoFile,
        bannerFile,
        gstFile,
        fssaiFile
    }
}

function validateOptionalBankDetails() {
    const bankName = valueOf("bankName")
    const accountHolder = valueOf("accountHolder")
    const accountNumber = valueOf("accountNumber")
    const ifscCode = valueOf("ifscCode").toUpperCase()
    const upiId = valueOf("upiId")
    const anyBankField = bankName || accountHolder || accountNumber || ifscCode

    if (anyBankField) {
        if (!bankName) throw new FormValidationError("Enter the bank name.", getElement("bankName"))
        if (!accountHolder) throw new FormValidationError("Enter the account holder name.", getElement("accountHolder"))
        if (!/^\d{6,24}$/.test(accountNumber)) {
            throw new FormValidationError("Enter a valid bank account number.", getElement("accountNumber"))
        }
        if (!IFSC_REGEX.test(ifscCode)) {
            throw new FormValidationError("Enter a valid 11-character IFSC code.", getElement("ifscCode"))
        }
    }

    if (upiId && !UPI_REGEX.test(upiId)) {
        throw new FormValidationError("Enter a valid UPI ID, for example name@bank.", getElement("upiId"))
    }
}

function requireText(id, message) {
    const value = valueOf(id)
    if (!value) throw new FormValidationError(message, getElement(id))
    return value
}

function requireNumber(id, message, minimum, maximum = Number.POSITIVE_INFINITY) {
    const raw = valueOf(id)
    const number = Number(raw)

    if (raw === "" || !Number.isFinite(number) || number < minimum || number > maximum) {
        throw new FormValidationError(message, getElement(id))
    }

    return number
}

function optionalNumber(id, fallback, minimum) {
    const raw = valueOf(id)
    if (raw === "") return fallback

    const number = Number(raw)
    if (!Number.isFinite(number) || number < minimum) {
        throw new FormValidationError("Enter a valid non-negative amount.", getElement(id))
    }

    return number
}

async function ensureRestaurantPhoneIsUnique(phone) {
    setLoading(true, "Checking restaurant mobile number...")
    const phoneQuery = query(
        collection(db, "restaurants"),
        where("restaurantPhone", "==", phone)
    )
    const snapshot = await getDocs(phoneQuery)

    if (!snapshot.empty) {
        throw new FormValidationError(
            "This restaurant mobile number is already registered with another restaurant.",
            getElement("restaurantPhone")
        )
    }
}

function createRestaurantCode() {
    const timePart = Date.now().toString().slice(-5)
    const randomPart = Math.floor(Math.random() * 10)
    return `VG${timePart}${randomPart}`
}

async function uploadOptionalFile(file, basePath, uploadedRefs) {
    if (!file) return { url: "", path: "" }

    const extension = getSafeExtension(file)
    const path = `${basePath}.${extension}`
    const storageRef = ref(storage, path)

    await uploadBytes(storageRef, file, { contentType: file.type })
    uploadedRefs.push(storageRef)

    return {
        path,
        url: await getDownloadURL(storageRef)
    }
}

function getSafeExtension(file) {
    const mimeExtensions = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
        "application/pdf": "pdf"
    }
    return mimeExtensions[file.type] || "bin"
}

async function cleanupFailedCreation(authUser, uploadedRefs) {
    const cleanupTasks = uploadedRefs.map(storageRef => deleteObject(storageRef).catch(() => null))
    if (authUser) cleanupTasks.push(deleteUser(authUser).catch(() => null))
    await Promise.all(cleanupTasks)
}

function normalizeFirebaseError(error) {
    const errorMessages = {
        "auth/email-already-in-use": "This Web Panel login email is already registered. Use another valid email.",
        "auth/invalid-email": "Enter a valid Web Panel login email address.",
        "auth/weak-password": "Web Panel password is too weak. Use at least 8 characters.",
        "auth/network-request-failed": "Network error. Check your internet connection and try again.",
        "permission-denied": "You do not have permission to create this restaurant."
    }

    const message = errorMessages[error.code] || error.message || "Restaurant could not be created. Please try again."
    let element = error.element || null

    if (error.code === "auth/email-already-in-use" || error.code === "auth/invalid-email") {
        element = getElement("loginEmail")
    }

    return new FormValidationError(message, element)
}

function handleFormError(error) {
    const message = error?.message || "Something went wrong. Please try again."
    showFormMessage(message)

    if (error?.element) {
        if (error.element.matches?.("input, select")) {
            error.element.classList.add("input-error")
            error.element.focus({ preventScroll: true })
        }

        error.element.scrollIntoView({ behavior: "smooth", block: "center" })
    } else {
        window.scrollTo({ top: 0, behavior: "smooth" })
    }
}

function showFormMessage(message, type = "error") {
    const messageBox = getElement("formMessage")
    messageBox.textContent = message
    messageBox.className = `form-message show ${type}`
}

function hideFormMessage() {
    const messageBox = getElement("formMessage")
    messageBox.textContent = ""
    messageBox.className = "form-message"
}

function clearInputError(element) {
    element.classList.remove("input-error")
}

function clearAllInputErrors() {
    document.querySelectorAll(".input-error").forEach(clearInputError)
}

function setLoading(show, text = "Creating Restaurant...") {
    const overlay = getElement("loadingOverlay")
    const submitButton = getElement("createRestaurantBtn")

    getElement("loadingText").textContent = text
    overlay.style.display = show ? "flex" : "none"
    overlay.setAttribute("aria-hidden", show ? "false" : "true")
    submitButton.disabled = show
}

function buildLoginDetailsText(formData, restaurantCode) {
    const lines = [
        `Restaurant: ${formData.restaurantName}`,
        `Restaurant Code: ${restaurantCode}`,
        `App Login Mobile: ${formData.restaurantPhone}`,
        `Web Panel Login: ${formData.webPanelEnabled ? "Enabled" : "Not Enabled"}`
    ]

    if (formData.webPanelEnabled) {
        lines.push(`Web Panel Email: ${formData.loginEmail}`)
        lines.push(`Web Panel Password: ${formData.loginPassword}`)
    }

    lines.push("Initial Status: Approved and Offline")
    return lines.join("\n")
}

function showSuccessModal(formData, restaurantCode) {
    getElement("successRestaurantName").textContent = formData.restaurantName

    const summary = getElement("successSummary")
    summary.replaceChildren()

    addSummaryLine(summary, "Restaurant Code", restaurantCode)
    addSummaryLine(summary, "App Login Mobile", formData.restaurantPhone)
    addSummaryLine(summary, "Web Panel Login", formData.webPanelEnabled ? "Enabled" : "Not Enabled")

    if (formData.webPanelEnabled) {
        addSummaryLine(summary, "Login Email", formData.loginEmail)
        addSummaryLine(summary, "Password", formData.loginPassword)
    }

    addSummaryLine(summary, "Initial Status", "Approved and Offline")

    const modal = getElement("successModal")
    modal.style.display = "flex"
    modal.setAttribute("aria-hidden", "false")
}

function addSummaryLine(container, label, value) {
    const line = document.createElement("div")
    const labelElement = document.createElement("strong")
    labelElement.textContent = `${label}: `
    line.append(labelElement, document.createTextNode(value))
    container.appendChild(line)
}

function setupSuccessActions() {
    getElement("copyLoginDetailsBtn").addEventListener("click", async () => {
        try {
            await navigator.clipboard.writeText(createdLoginDetails)
            getElement("copyLoginDetailsBtn").textContent = "✓ Copied"
        } catch {
            showFormMessage("Could not copy automatically. Please copy the details from the success box.")
        }
    })

    getElement("goToRestaurantsBtn").addEventListener("click", () => {
        window.location.href = "restaurants.html"
    })
}