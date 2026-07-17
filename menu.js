import {
    db
}
from "./firebase.js";

import {
    auth
}
from "./firebase.js";


import {

    collection,
    onSnapshot,
    query,
    orderBy,
    addDoc,
    deleteDoc,
    updateDoc,
    doc,
    getDoc,
    getDocs,
    where,
    writeBatch

}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"

import {
    signOut
}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
    getStorage,
    ref,
    uploadBytes,
    getDownloadURL,
    deleteObject
}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js"

// 🔥 URL PARAMS

const params =
    new URLSearchParams(
        window.location.search
    )

const restaurantId =
    params.get("id")
    if (!restaurantId) {

    alert(
        "Restaurant ID Missing 😎"
    )

    throw new Error(
        "Restaurant ID Missing"
    )
}
async function loadRestaurantInfo() {

    try {

        const snap = await getDoc(

            doc(

                db,

                "restaurants",

                restaurantId

            )

        );

        if (!snap.exists()) return;

        const data = snap.data();

        document.getElementById(
            "restaurantName"
        ).innerText =
            data.name || "Restaurant";

        document.getElementById(
            "restaurantOwner"
        ).innerText =
            "Owner : " +
            (data.ownerName || "-");

    }

    catch (e) {

        console.log(e);

    }

}
loadRestaurantInfo();

document
.getElementById(
    "logoutBtn"
)
?.addEventListener(
    "click",
    async () => {

        await signOut(auth);

        window.location.href =
            "login.html";

    }
);

// 🔥 STATE

let categories = []
let categorySortable = null

let subCategorySortable = null

async function updateCategorySortOrder() {

    const cards =
        document.querySelectorAll(".category-card");

    const batch =
        writeBatch(db);

    cards.forEach((card, index) => {

        batch.update(

            doc(
                db,
                "restaurants",
                restaurantId,
                "categories",
                card.dataset.id
            ),

            {
                sortOrder: (index + 1) * 1000
            }

        );

    });

    await batch.commit();

}

async function updateSubCategorySortOrder() {

    const cards =
        document.querySelectorAll(".subcategory-card");

    const batch =
        writeBatch(db);

    cards.forEach((card, index) => {

        batch.update(

            doc(
                db,
                "restaurants",
                restaurantId,
                "subcategories",
                card.dataset.id
            ),

            {

                sortOrder:
                    (index + 1) * 1000

            }

        );

    });

    await batch.commit();

}

let subCategories = []

let menuItems = []

let selectedCategory = null

let selectedSubCategory = null

// 🔥 ELEMENTS
const addCategoryBtn =
    document.getElementById(
        "addCategoryBtn"
    )

const categoryModal =
    document.getElementById(
        "categoryModal"
    )

const closeCategoryBtn =
    document.getElementById(
        "closeCategoryBtn"
    )

const saveCategoryBtn =
    document.getElementById(
        "saveCategoryBtn"
    )

const categoryName =
    document.getElementById(
        "categoryName"
    )
    const addSubCategoryBtn =
    document.getElementById(
        "addSubCategoryBtn"
    )

const subCategoryModal =
    document.getElementById(
        "subCategoryModal"
    )

const closeSubCategoryBtn =
    document.getElementById(
        "closeSubCategoryBtn"
    )

const saveSubCategoryBtn =
    document.getElementById(
        "saveSubCategoryBtn"
    )

const subCategoryName =
    document.getElementById(
        "subCategoryName"
    )
    const addItemBtn =
    document.getElementById(
        "addItemBtn"
    )

const itemModal =
    document.getElementById(
        "itemModal"
    )

const closeItemBtn =
    document.getElementById(
        "closeItemBtn"
    )

const saveItemBtn =
    document.getElementById(
        "saveItemBtn"
    )

const itemName =
    document.getElementById(
        "itemName"
    )
    const itemDescription =
    document.getElementById(
        "itemDescription"
    )

const itemPrice =
    document.getElementById(
        "itemPrice"
    )

const itemType =
    document.getElementById(
        "itemType"
    )
    const itemImage =
    document.getElementById(
        "itemImage"
    )
    const previewImage =
    document.getElementById(
        "previewImage"
    )
    const itemAvailable =
    document.getElementById(
        "itemAvailable"
    )

const itemVisible =
    document.getElementById(
        "itemVisible"
    )

const itemBestseller =
    document.getElementById(
        "itemBestseller"
    )

const itemRecommended =
    document.getElementById(
        "itemRecommended"
    )

const addVariantBtn =
    document.getElementById(
        "addVariantBtn"
    )

const variantsContainer =
    document.getElementById(
        "variantsContainer"
    )

const categoriesContainer =
    document.getElementById(
        "categoriesContainer"
    )

const subCategoriesContainer =
    document.getElementById(
        "subCategoriesContainer"
    )

const itemsContainer =
    document.getElementById(
        "itemsContainer"
    )
    const searchInput =
    document.getElementById(
        "searchInput"
    )
    const uploadExcelBtn =
    document.getElementById(
        "uploadExcelBtn"
    )

const excelFile =
    document.getElementById(
        "excelFile"
    )

if (uploadExcelBtn) {

    uploadExcelBtn.onclick =
    () => {

        excelFile.click()
    }
}
    const editItemModal =
    document.getElementById(
        "editItemModal"
    )

const editItemName =
    document.getElementById(
        "editItemName"
    )
    const editItemDescription =
    document.getElementById(
        "editItemDescription"
    )

const editItemPrice =
    document.getElementById(
        "editItemPrice"
    )

const editItemType =
    document.getElementById(
        "editItemType"
    )
    const editItemImage =
    document.getElementById(
        "editItemImage"
    )

const editPreviewImage =
    document.getElementById(
        "editPreviewImage"
    )

const editAvailable =
    document.getElementById(
        "editAvailable"
    )

const editVisible =
    document.getElementById(
        "editVisible"
    )

const editBestseller =
    document.getElementById(
        "editBestseller"
    )

const editRecommended =
    document.getElementById(
        "editRecommended"
    )


let currentEditImage = ""

let currentEditImagePath = ""

const editVariantsContainer =
    document.getElementById(
        "editVariantsContainer"
    )

const updateItemBtn =
    document.getElementById(
        "updateItemBtn"
    )

const closeEditItemBtn =
    document.getElementById(
        "closeEditItemBtn"
    )

const editAddVariantBtn =
    document.getElementById(
        "editAddVariantBtn"
    )

let editingItemId = null
const storage =
    getStorage()
    excelFile.addEventListener(
    "change",
    async (e) => {

        const file =
            e.target.files[0]

        if (!file) return

        const data =
            await file.arrayBuffer()

        const workbook =
            XLSX.read(data)

        const sheet =
            workbook.Sheets[
                workbook.SheetNames[0]
            ]

        const rows =
            XLSX.utils.sheet_to_json(
                sheet
            )

        console.log(rows)
        await uploadMenuRows(
    rows
)

alert(
    "Menu Uploaded Successfully 😎🔥"
)

        alert(
            `Rows Found: ${rows.length}`
        )
    }
)

const totalItems =
    document.getElementById(
        "totalItems"
    )

const totalCategories =
    document.getElementById(
        "totalCategories"
    )

const availableItems =
document.getElementById(
        "availableItems"
    )

const hiddenItems =
    document.getElementById(
        "hiddenItems"
    )

const categoryTimingModal =
    document.getElementById(
        "categoryTimingModal"
    )

const closeCategoryTimingBtn =
    document.getElementById(
        "closeCategoryTimingBtn"
    )

const saveCategoryTimingBtn =
    document.getElementById(
        "saveCategoryTimingBtn"
    )
const editCategoryName =
    document.getElementById(
        "editCategoryName"
    )

const categoryAutoHide =
    document.getElementById(
        "categoryAutoHide"
    )

const categoryAvailable =
    document.getElementById(
        "categoryAvailable"
    )
    const subCategoryTimingModal =
    document.getElementById(
        "subCategoryTimingModal"
    )

const closeSubCategoryTimingBtn =
    document.getElementById(
        "closeSubCategoryTimingBtn"
    )

const saveSubCategoryTimingBtn =
    document.getElementById(
        "saveSubCategoryTimingBtn"
    )

const editSubCategoryName =
    document.getElementById(
        "editSubCategoryName"
    )


const subCategoryAutoHide =
    document.getElementById(
        "subCategoryAutoHide"
    )

const subCategoryAvailable =
    document.getElementById(
        "subCategoryAvailable"
    )

    let sortableInstance = null
    itemImage.addEventListener(
    "change",
    () => {

        const file =
            itemImage.files[0]

        if (!file) return

        previewImage.src =
            URL.createObjectURL(file)

        previewImage.style.display =
            "block"
    }
    
)

// 🔥 CATEGORY REALTIME

const categoryRef =
    query(

        collection(
            db,
            "restaurants",
            restaurantId,
            "categories"
        ),

        orderBy(
    "sortOrder",
    "asc"
)
    )

onSnapshot(
    categoryRef,
    (snapshot) => {

        categories = []

        snapshot.forEach((docSnap, index) => {

    const data = docSnap.data();

    if (data.sortOrder === undefined) {

        updateDoc(

            doc(
                db,
                "restaurants",
                restaurantId,
                "categories",
                docSnap.id
            ),

            {
                sortOrder: (index + 1) * 1000
            }

        );

    }

    categories.push({

        id: docSnap.id,

        ...data

    });

});

        renderCategories()
        updateDashboard()
        initCategorySorting()
    }
)

// 🔥 SUB CATEGORY REALTIME

const subCategoryRef =
    query(

        collection(
            db,
            "restaurants",
            restaurantId,
            "subcategories"
        ),

        orderBy(
            "sortOrder",
            "asc"
        )
    )

onSnapshot(
    subCategoryRef,
    (snapshot) => {

        subCategories = []

        snapshot.forEach((docSnap, index) => {

            const data = docSnap.data()

            if (data.sortOrder === undefined) {

                updateDoc(

                    doc(
                        db,
                        "restaurants",
                        restaurantId,
                        "subcategories",
                        docSnap.id
                    ),

                    {
                        sortOrder: (index + 1) * 1000
                    }

                )

            }

            subCategories.push({

                id: docSnap.id,

                ...data

            })

        })

        renderSubCategories()

        initSubCategorySorting()

    }
)

// 🔥 MENU ITEMS REALTIME

const menuRef =
    query(

        collection(
            db,
            "restaurants",
            restaurantId,
            "menu"
        ),

        orderBy(
    "sortOrder",
    "asc"
)
    )

onSnapshot(
    menuRef,
    (snapshot) => {

        menuItems = []

        snapshot.forEach((docSnap, index) => {

    const data =
        docSnap.data()

    if (
        data.sortOrder ===
        undefined
    ) {

        updateDoc(

            doc(
                db,
                "restaurants",
                restaurantId,
                "menu",
                docSnap.id
            ),

            {

                sortOrder:
    (index + 1) * 1000
            }
        )
    }

    menuItems.push({

        id:
            docSnap.id,

        ...data
    })
})

        renderItems()
        updateDashboard()
    }
)

// 🔥 RENDER CATEGORIES

function renderCategories() {

    categoriesContainer.innerHTML = ""

    categories.forEach((category) => {
        const hiddenBadge =

    category.visible === false

    ?

    `
    <div class="
    category-status
    off-status
    ">

    🙈 Hidden From Customers

    </div>
    `

    :

    ``
        const div =
            document.createElement("div")

        div.className =
            `category-card ${
                selectedCategory === category.id
                    ? "active"
                    : ""
            }`
            div.dataset.id =
    category.id

      div.innerHTML = `

<div class="category-header">

<div>

<div class="category-title">

${category.name}

</div>

${
category.timeSlots?.map(
(slot) => `
<div class="category-time-badge">

⏰
${slot.start}
-
${slot.end}

</div>
`
).join("") || ""
}

<button

class="category-status ${
    category.stockEnabled === false
        ? "off-status"
        : "live-status"
}"

onclick="
event.stopPropagation();
toggleCategoryStock(
'${category.id}',
${category.stockEnabled !== false}
)
"

>

${
    category.stockEnabled === false
        ? "🔴 OUT OF STOCK"
        : "🟢 IN STOCK"
}

</button>
${hiddenBadge}

</div>

</div>

<div class="category-actions">
<button
class="
category-btn
${category.visible !== false
?
'delete-category-btn'
:
'edit-category-btn'
}
"
onclick="
event.stopPropagation();
toggleCategoryVisibility(
'${category.id}',
${category.visible !== false}
)
"
>

${category.visible !== false
?
'🙈 Hide'
:
'👁 Show'
}

</button>


<button
class="
category-btn
edit-category-btn
"
onclick="
event.stopPropagation();
openCategoryEdit(
'${category.id}'
)
"
>

✏️ Edit

</button>

<button
class="
category-btn
delete-category-btn
"
onclick="
event.stopPropagation();
deleteCategory(
'${category.id}'
)
"
>

❌ Delete

</button>

</div>

`

        div.onclick = () => {

    selectedCategory =
        category.id

    const firstSubCategory =
        subCategories.find(
            sub =>
                sub.categoryId === category.id
        )

    selectedSubCategory =
        firstSubCategory
            ? firstSubCategory.id
            : null

    renderCategories()
    renderSubCategories()
    renderItems()

    document
        .querySelector(".item-card")
        ?.scrollIntoView({
            behavior: "smooth",
            block: "start"
        })
}
        categoriesContainer.appendChild(div)
    })
}

// 🔥 RENDER SUB CATEGORIES

function renderSubCategories() {

    subCategoriesContainer.innerHTML = ""

    const filtered =

    selectedCategory

    ?

    subCategories.filter(
        sub =>
        sub.categoryId ===
        selectedCategory
    )

    :

    subCategories

    filtered.forEach((sub) => {

        const div =
            document.createElement("div")

            div.dataset.id =
    sub.id

        div.className =
            `subcategory-card ${
                selectedSubCategory === sub.id
                    ? "active"
                    : ""
            }`

        div.innerHTML = `

<div class="category-header">

<div>

<div
style="
font-size:12px;
color:#9ca3af;
margin-bottom:6px;
"
>

📂 ${
categories.find(
c => c.id === sub.categoryId
)?.name || ""
}

</div>

<div class="category-title">

<span style="
font-size:17px;
font-weight:800;
color:white;
">
└ ${sub.name}
</span>

</div>

<button

class="category-status ${
    sub.stockEnabled === false
        ? "off-status"
        : "live-status"
}"

onclick="
event.stopPropagation();
toggleSubCategoryStock(
'${sub.id}',
${sub.stockEnabled !== false}
)
"

>

${
    sub.stockEnabled === false
        ? "🔴 OUT OF STOCK"
        : "🟢 IN STOCK"
}

</button>

</div>

</div>

<div class="category-actions">

<button
class="
category-btn
${sub.visible !== false
?
'delete-category-btn'
:
'edit-category-btn'
}
"
onclick="
event.stopPropagation();
toggleSubCategoryVisibility(
'${sub.id}',
${sub.visible !== false}
)
"
>

${sub.visible !== false
?
'🙈 Hide'
:
'👁 Show'
}

</button>

<button
class="
category-btn
edit-category-btn
"
onclick="
event.stopPropagation();
editSubCategory(
'${sub.id}'
)
"
>

✏️ Edit

</button>

<button
class="
category-btn
delete-category-btn
"
onclick="
event.stopPropagation();
deleteSubCategory(
'${sub.id}'
)
"
>

❌ Delete

</button>

</div>

`

        div.onclick = () => {

    selectedSubCategory =
        sub.id

    renderSubCategories()
    renderItems()

    document
        .querySelector(".item-card")
        ?.scrollIntoView({
            behavior: "smooth",
            block: "start"
        })
}

        subCategoriesContainer.appendChild(div)
    })
}

// 🔥 RENDER ITEMS
function renderItems() {

    itemsContainer.innerHTML = ""

    const keyword =
    searchInput.value
        .trim()
        .toLowerCase()

if (!selectedSubCategory && keyword === "") {

    itemsContainer.innerHTML = `

        <div style="
            color:white;
            font-size:22px;
            text-align:center;
            padding:80px;
            width:100%;
        ">
            👈 Select Sub Category
        </div>

    `

    return
}

    const filtered =
    menuItems.filter((item) => {

        const matchSubCategory =

            keyword !== ""

            ?

            true

            :

            item.subCategoryId ===
            selectedSubCategory

        const matchSearch =

            item.name
                .toLowerCase()
                .includes(keyword)

        return (

            matchSubCategory &&
            matchSearch

        )

    })
    if (filtered.length === 0) {

    itemsContainer.innerHTML = `

        <div style="
            color:#9ca3af;
            font-size:24px;
            font-weight:bold;
            text-align:center;
            padding:80px;
            width:100%;
        ">

            🔍 No Item Found

        </div>

    `

    return
}

    filtered.forEach((item) => {
        const now =

    new Date()

const currentTime =

    now
    .toTimeString()
    .slice(0,5)

        const variantsHtml =
            item.variants
                ?.map(

                    (variant) => `

<div class="variant">

${variant.name}
₹${variant.price}

</div>

`
                )
                .join("")

        const div =
            document.createElement("div")

        div.className =
    "item-card"

div.dataset.id =
    item.id

       div.innerHTML = `

<img
src="${item.image || 'https://placehold.co/600x400'}"
class="item-image"
>

<div class="item-top">

<div>

<h3>
${item.name}
</h3>
<div
style="
margin-top:6px;
font-size:13px;
color:#9ca3af;
line-height:1.5;
"
>

${item.description || ""}

</div>

<div
style="
margin-top:8px;
font-size:20px;
font-weight:bold;
color:#22c55e;
"
>

₹${item.price || 0}

</div>
<div
style="
display:flex;
align-items:center;
gap:6px;
margin-top:4px;
"
>

<span class="veg-badge"></span>

<span>
Pure Veg
</span>

</div>

</div>

<div
style="
display:flex;
flex-direction:column;
gap:8px;
align-items:flex-end;
"
>

<button
class="
${item.available
?
'available-toggle'
:
'stock-toggle'
}
"
onclick="
toggleAvailability(
'${item.id}',
${item.available}
)
"
>

${item.available !== false
?
'🔴 Out Of Stock'
:
'🟢 Available'
}

</button>

<button
class="
${item.visible
?
'visible-toggle'
:
'hidden-toggle'
}
"
onclick="
toggleVisibility(
'${item.id}',
${item.visible}
)
"
>

${item.visible !== false
?
'🙈 Hide'
:
'👁 Show'
}

</button>

</div>

</div>

<div class="item-badges">

${item.bestseller
?
`<span class="best-badge">🔥 Bestseller</span>`
:
``
}

${item.recommended
?
`<span class="recommended-badge">⭐ Recommended</span>`
:
``
}

${
item.timeSlots?.length

?

item.timeSlots.map(
(slot) => `
<span class="time-badge">

⏰
${slot.start}
-
${slot.end}

</span>
`
).join("")

:

(

item.startTime &&
item.endTime

?

`
<span class="time-badge">

⏰
${item.startTime}
-
${item.endTime}

</span>
`

:

""

)

}

</div>

<div class="variant-box">

${variantsHtml}

</div>

<div class="item-actions">

<button
class="edit-btn"
onclick="
openEditItem(
'${item.id}'
)
"
>

✏️ Edit

</button>

<button
class="delete-btn"
onclick="
deleteItem(
'${item.id}'
)
"
>

❌ Delete

</button>

</div>

`

        itemsContainer.appendChild(div)
    })
    if (sortableInstance) {

    sortableInstance.destroy()
}

sortableInstance =
    new Sortable(

        itemsContainer,

        {

            animation: 200,

            ghostClass:
                "sortable-ghost",

            delay: 100,

            delayOnTouchOnly: true,

            onEnd:
            async () => {

                const cards =

                    document.querySelectorAll(
                        ".item-card"
                    )

                for (

                    let index = 0;

                    index < cards.length;

                    index++

                ) {

                    const id =

                        cards[index]
                        .dataset.id

                    await updateDoc(

                        doc(
                            db,
                            "restaurants",
                            restaurantId,
                            "menu",
                            id
                        ),

                        {

                            sortOrder:
    (index + 1) * 1000
                        }
                    )
                }
            }
        }
    )
}

// 🔥 DASHBOARD

function updateDashboard() {

    totalItems.innerText =
        menuItems.length

    totalCategories.innerText =
        categories.length

    availableItems.innerText =
    menuItems.filter(
        (item) =>
            item.available !== false
    ).length

hiddenItems.innerText =
    menuItems.filter(
        (item) =>
            item.visible === false
    ).length
}
// 🔥 OPEN CATEGORY MODAL

addCategoryBtn.onclick = () => {

    categoryModal.style.display =
        "flex"
}

// 🔥 CLOSE CATEGORY MODAL

closeCategoryBtn.onclick = () => {

    categoryModal.style.display =
        "none"
}
// 🔥 SAVE CATEGORY

saveCategoryBtn.onclick =
async () => {

    if (
        !categoryName.value
    ) {

        alert(
            "Enter category name"
        )

        return
    }
    const existingCategory =
    categories.find(
        cat =>
            cat.name
                .trim()
                .toLowerCase()
            ===
            categoryName.value
                .trim()
                .toLowerCase()
    )

if (existingCategory) {

    alert(
        "Category Already Exists"
    )

    return
}

    try {

        let nextSortOrder = 1000;

if (categories.length > 0) {

    nextSortOrder = Math.max(
        ...categories.map(c => c.sortOrder || 0)
    ) + 1000;

}

        await addDoc(

            collection(
                db,
                "restaurants",
                restaurantId,
                "categories"
            ),

            {
                name:
                    categoryName.value,

                hidden: false,
                available: true,
                visible: true,


startTime: "",

endTime: "",

autoHide: false,

                sortOrder:
    nextSortOrder,

                createdAt:
                    Date.now()
            }
        )

        categoryName.value = ""

        categoryModal.style.display =
            "none"

    } catch (error) {

        console.log(error)

        alert(
            "Failed"
        )
    }
}
// 🔥 OPEN SUB CATEGORY MODAL

addSubCategoryBtn.onclick =
() => {

    if (!selectedCategory) {

        alert(
            "Select Category First 😎"
        )

        return
    }

    subCategoryModal.style.display =
        "flex"
}

// 🔥 CLOSE SUB CATEGORY MODAL

closeSubCategoryBtn.onclick =
() => {

    subCategoryModal.style.display =
        "none"
}
// 🔥 SAVE SUB CATEGORY

saveSubCategoryBtn.onclick =
async () => {

    if (
        !subCategoryName.value
    ) {

        alert(
            "Enter sub category"
        )

        return
    }
    const existingSubCategory =
    subCategories.find(
        sub =>

            sub.categoryId ===
            selectedCategory &&

            sub.name
                .trim()
                .toLowerCase()
            ===
            subCategoryName.value
                .trim()
                .toLowerCase()
    )

if (existingSubCategory) {

    alert(
        "Sub Category Already Exists"
    )

    return
}

    try {

        let nextSubSortOrder = 1000;

const sameCategorySubs = subCategories.filter(
    sub => sub.categoryId === selectedCategory
);

if (sameCategorySubs.length > 0) {

    nextSubSortOrder = Math.max(
        ...sameCategorySubs.map(sub => sub.sortOrder || 0)
    ) + 1000;

}

        await addDoc(

            collection(
                db,
                "restaurants",
                restaurantId,
                "subcategories"
            ),

            {

                name:
                    subCategoryName.value,

                categoryId:
                    selectedCategory,

                hidden: false,

                sortOrder:
    nextSubSortOrder,

                createdAt:
                    Date.now()
            }
        )

        subCategoryName.value = ""

        subCategoryModal.style.display =
            "none"

    } catch(error) {

        console.log(error)

        alert(
            "Failed"
        )
    }
}
// 🔥 OPEN ITEM MODAL

addItemBtn.onclick =
() => {

    if (!selectedSubCategory) {

        alert(
            "Select Sub Category 😎"
        )

        return
    }

    itemModal.style.display =
    "flex"

itemName.value = ""

itemDescription.value = ""

itemPrice.value = ""

itemImage.value = ""

previewImage.src = ""

previewImage.style.display =
    "none"

itemAvailable.checked = true

itemVisible.checked = true

itemBestseller.checked = false

itemRecommended.checked = false

variantsContainer.innerHTML = ""

document
    .getElementById(
        "itemTimeSlotsContainer"
    )
    .innerHTML = ""

addVariantRow()
}

// 🔥 CLOSE ITEM MODAL

closeItemBtn.onclick =
() => {

    itemModal.style.display =
        "none"
}
// 🔥 ADD VARIANT ROW

function addVariantRow(

    name = "",
    price = ""

) {

    const row =
        document.createElement(
            "div"
        )

    row.className =
        "variant-row"

    row.innerHTML = `

<input
type="text"
placeholder="Variant Name"
class="variantName"
value="${name}"
/>

<input
type="number"
placeholder="Price"
class="variantPrice"
value="${price}"
/>

<button
type="button"
class="delete-variant-btn"
>

✕

</button>

`

    row
        .querySelector(
            ".delete-variant-btn"
        )
        .onclick = () => {

            row.remove()
        }

    variantsContainer.appendChild(
        row
    )
}

// 🔥 ADD VARIANT BUTTON

addVariantBtn.onclick =
() => {

    addVariantRow()
}
// 🔥 SAVE ITEM

saveItemBtn.onclick =
async () => {

    if (!itemName.value) {

        alert(
            "Enter item name"
        )

        return
    }

    const variantNames =
        document.querySelectorAll(
            ".variantName"
        )

    const variantPrices =
        document.querySelectorAll(
            ".variantPrice"
        )

    const variants = []
    const timeSlots = []

document
    .querySelectorAll(
        "#itemTimeSlotsContainer .time-slot-row"
    )
    .forEach((row) => {

        const start =
            row.querySelector(
                ".item-slot-start"
            ).value

        const end =
            row.querySelector(
                ".item-slot-end"
            ).value

        if (start && end) {

            timeSlots.push({

                start,
                end
            })
        }
    })

    variantNames.forEach(

        (input, index) => {

            variants.push({

                name:
                    input.value,

                price:
                    Number(
                        variantPrices[index]
                        .value
                    )
            })
        }
    )

    try {
        const selectedCategoryId =

    selectedCategory

const selectedSubCategoryId =

    selectedSubCategory

const selectedCategoryName =

    categories.find(
        c => c.id === selectedCategoryId
    )?.name || ""

const selectedSubCategoryName =

    subCategories.find(
        s => s.id === selectedSubCategoryId
    )?.name || ""
    
let imageUrl = ""

let imagePath = ""

const file =
itemImage.files[0]

if (file) {

    const imageRef =
        ref(
            storage,
            `menuItems/${Date.now()}_${file.name}`
        )

    await uploadBytes(
        imageRef,
        file
    )

    imageUrl =
        await getDownloadURL(
            imageRef
        )

        imagePath =
imageRef.fullPath

}
let nextItemSortOrder = 1000;

const sameSubItems = menuItems.filter(
    item => item.subCategoryId === selectedSubCategory
);

if (sameSubItems.length > 0) {

    nextItemSortOrder = Math.max(
        ...sameSubItems.map(item => item.sortOrder || 0)
    ) + 1000;

}
        await addDoc(

            collection(
                db,
                "restaurants",
                restaurantId,
                "menu"
            ),

            {

    name:
    itemName.value,
    description:
    itemDescription.value,

price:
    Number(
        itemPrice.value
    ),

categoryId:
    selectedCategoryId,

categoryName:
    selectedCategoryName,

subCategoryId:
    selectedSubCategoryId,

subCategoryName:
    selectedSubCategoryName,

    veg:
        itemType.value ===
        "veg",

    variants,

    image:
imageUrl,

imagePath:
imagePath,

available:
        itemAvailable.checked,

    visible:
        itemVisible.checked,

    bestseller:
        itemBestseller.checked,

    recommended:
        itemRecommended.checked,
        
        timeSlots:
    timeSlots,
    
    hidden: false,

createdAt:
    Date.now(),

sortOrder:
    nextItemSortOrder
        
}
        )

        itemName.value = ""

itemDescription.value = ""

itemPrice.value = ""

itemImage.value = ""

previewImage.src = ""

previewImage.style.display =
    "none"

itemModal.style.display =
    "none"

    } catch(error) {

        console.log(error)

        alert(
            "Failed"
        )
    }
}
// 🔥 OPEN EDIT ITEM

window.openEditItem =
async (
    itemId
) => {

    editingItemId =
        itemId

    const snap =
        await getDoc(

            doc(
                db,
                "restaurants",
                restaurantId,
                "menu",
                itemId
            )
        )

    const data =
        snap.data()

    editItemName.value =
        data.name || ""
        editItemDescription.value =
    data.description || ""

editItemPrice.value =
    data.price || ""

    editItemType.value =
        data.veg
            ? "veg"
            : "veg"

    editAvailable.checked =
        data.available !== false

    editVisible.checked =
        data.visible !== false

    editBestseller.checked =
        data.bestseller === true

    editRecommended.checked =
        data.recommended === true

    document
    .getElementById(
        "editItemTimeSlotsContainer"
    )
    .innerHTML = ""

const timeSlots =
    data.timeSlots || []
    if (

    timeSlots.length === 0 &&
    data.startTime &&
    data.endTime

) {

    timeSlots.push({

        start: data.startTime,
        end: data.endTime

    })
}

timeSlots.forEach((slot) => {

    const div =
        document.createElement("div")

    div.className =
        "time-slot-row"

    div.innerHTML = `

        <input
            type="time"
            class="edit-item-slot-start"
            value="${slot.start}"
        >

        <input
            type="time"
            class="edit-item-slot-end"
            value="${slot.end}"
        >

        <button
            class="delete-slot-btn"
            onclick="removeEditItemSlot(this)"
        >
            ✕
        </button>

    `

    document
        .getElementById(
            "editItemTimeSlotsContainer"
        )
        .appendChild(div)
})
    currentEditImage =
        data.image || ""

    currentEditImagePath =
    data.imagePath || ""

    if (data.image) {

        editPreviewImage.src =
            data.image

        editPreviewImage.style.display =
            "block"
    }

    editVariantsContainer.innerHTML =
        ""

    const variants =
        data.variants || []

    variants.forEach(

        (variant) => {

            addEditVariantRow(
                variant.name,
                variant.price
            )
        }
    )

    editItemModal.style.display =
        "flex"
}

// 🔥 ADD EDIT VARIANT ROW

function addEditVariantRow(

    name = "",
    price = ""

) {

    const row =
        document.createElement(
            "div"
        )

    row.className =
        "variant-row"

    row.innerHTML = `

<input
type="text"
class="variant-name"
placeholder="Variant"
value="${name}"
>

<input
type="number"
class="variant-price"
placeholder="Price"
value="${price}"
>

<button
class="delete-variant-btn"
type="button"
>

✕

</button>

`

    row
        .querySelector(
            ".delete-variant-btn"
        )
        .onclick =
        () => {

            row.remove()
        }

    editVariantsContainer.appendChild(
        row
    )
}

// 🔥 ADD EDIT VARIANT BUTTON

editAddVariantBtn.onclick =
() => {

    addEditVariantRow()
}

// 🔥 UPDATE ITEM

updateItemBtn.onclick =
async () => {

    try {

        const variants = []

        document

            .querySelectorAll(
                "#editVariantsContainer .variant-row"
            )

            .forEach(

                (row) => {

                    variants.push({

                        name:

                            row.querySelector(
                                ".variant-name"
                            ).value,

                        price:

                            Number(

                                row.querySelector(
                                    ".variant-price"
                                ).value
                            )
                    })
                }
            )
const editTimeSlots = []

document
    .querySelectorAll(
        "#editItemTimeSlotsContainer .time-slot-row"
    )
    .forEach((row) => {

        const start =
            row.querySelector(
                ".edit-item-slot-start"
            ).value

        const end =
            row.querySelector(
                ".edit-item-slot-end"
            ).value

        if (start && end) {

            editTimeSlots.push({

                start,
                end
            })
        }
    })
        let imageUrl =
    currentEditImage || ""

let imagePath =
    currentEditImagePath || ""

const file =
    editItemImage.files[0]

        if (file) {

    // Purani image delete karo

    if (currentEditImagePath) {

        try {

            await deleteObject(

                ref(
                    storage,
                    currentEditImagePath
                )

            );

        }

        catch (e) {

            console.log(
                "Old Image Delete Failed",
                e
            );

        }

    }

    // Nayi image upload karo

    const imageRef =
        ref(

            storage,

            `menuItems/${Date.now()}_${file.name}`

        );

    await uploadBytes(

        imageRef,

        file

    );

    imageUrl =
        await getDownloadURL(
            imageRef
        );

    imagePath =
        imageRef.fullPath;

}

        await updateDoc(

            doc(
                db,
                "restaurants",
                restaurantId,
                "menu",
                editingItemId
            ),

            {

    name:
        editItemName.value,

    description:
        editItemDescription.value,

    price:
        Number(
            editItemPrice.value
        ),

    veg:
        editItemType.value ===
        "veg",

                image:
                    imageUrl,

                imagePath:
    imagePath,

                available:
                    editAvailable.checked,

                visible:
                    editVisible.checked,

                bestseller:
                    editBestseller.checked,

                recommended:
                    editRecommended.checked,
                    timeSlots:
    editTimeSlots,

                
                variants,

                updatedAt:
                    Date.now()
            }
        )

        editItemModal.style.display =
            "none"

        alert(
            "Item Updated 😎🔥"
        )

    } catch(error) {

        console.log(error)

        alert(
            "Update Failed 😭"
        )
    }
}

// 🔥 CLOSE EDIT MODAL

closeEditItemBtn.onclick =
() => {

    editItemModal.style.display =
        "none"
}

// 🔥 DELETE ITEM

window.deleteItem = async (itemId) => {

    const ok = confirm("Delete Item ?");

    if (!ok) return;

    try {

        const itemRef = doc(
            db,
            "restaurants",
            restaurantId,
            "menu",
            itemId
        );

        const snap = await getDoc(itemRef);

        if (snap.exists()) {

            const data = snap.data();

            if (data.imagePath) {

                try {

                    await deleteObject(
                        ref(storage, data.imagePath)
                    );

                } catch (e) {

                    console.log("Image Delete Failed", e);

                }

            }

        }

        await deleteDoc(itemRef);

        alert("Item Deleted 😎");

    } catch (e) {

        console.log(e);

        alert("Delete Failed");

    }

}
window.toggleAvailability =
async (
    itemId,
    currentValue
) => {

    try {

        await updateDoc(

            doc(
                db,
                "restaurants",
                restaurantId,
                "menu",
                itemId
            ),

            {

                available: !currentValue,

manualOutOfStock: currentValue,

updatedAt: Date.now()
            }
        )

    } catch(error) {

        console.log(error)

        alert(
            "Availability Update Failed 😎"
        )
    }
}

window.toggleVisibility =
async (
    itemId,
    currentValue
) => {

    try {

        await updateDoc(

            doc(
                db,
                "restaurants",
                restaurantId,
                "menu",
                itemId
            ),

            {

                visible: !currentValue,

                manualHidden: currentValue,

                updatedAt: Date.now()

            }

        )

    } catch(error) {

        console.log(error)

        alert(
            "Toggle Failed 😎"
        )

    }

}
searchInput.addEventListener(

    "input",

    () => {

        renderItems()
    }
)
// 🚀 CATEGORY TIMING


closeCategoryTimingBtn.onclick =
() => {

    categoryTimingModal.style.display =
        "none"
}

saveCategoryTimingBtn.onclick =
async () => {

    try {

        await updateDoc(

            doc(
                db,
                "restaurants",
                restaurantId,
                "categories",
                selectedCategory
            ),

            {

    name:
        editCategoryName.value,

    timeSlots:
    Array.from(
        document.querySelectorAll(
            "#categoryTimeSlotsContainer .time-slot-row"
        )
    ).map((row) => ({

        start:
            row.querySelector(
                ".category-slot-start"
            ).value,

        end:
            row.querySelector(
                ".category-slot-end"
            ).value
    })),

    autoHide:
        categoryAutoHide.checked,

    available:
        categoryAvailable.checked,

    updatedAt:
        Date.now()
}
        )

        categoryTimingModal.style.display =
            "none"

        alert(
            "Category Timing Saved 😎🔥"
        )

    } catch(error) {

        console.log(error)

        alert(
            "Failed 😎"
        )
    }
}
// 🚀 DELETE CATEGORY

window.deleteCategory = async (categoryId) => {

    const ok = confirm(
        "Delete Category?\n\nIske andar ki saari Sub Categories aur Menu Items bhi permanently delete ho jayengi."
    );

    if (!ok) return;

    try {

        // -------------------------
        // DELETE MENU ITEMS
        // -------------------------

        const subQuery = query(
            collection(
                db,
                "restaurants",
                restaurantId,
                "subcategories"
            ),
            where("categoryId", "==", categoryId)
        );

        const subSnap = await getDocs(subQuery);

        for (const subDoc of subSnap.docs) {

            const subId = subDoc.id;

            const menuQuery = query(
                collection(
                    db,
                    "restaurants",
                    restaurantId,
                    "menu"
                ),
                where(
                    "subCategoryId",
                    "==",
                    subId
                )
            );

            const menuSnap = await getDocs(menuQuery);

            for (const menuDoc of menuSnap.docs) {

    const data = menuDoc.data();

    if (data.imagePath) {

        try {

            await deleteObject(
                ref(storage, data.imagePath)
            );

        } catch (e) {

            console.log("Image Delete Failed", e);

        }

    }

    await deleteDoc(menuDoc.ref);

}

            await deleteDoc(subDoc.ref);

        }

        // -------------------------
        // DELETE CATEGORY
        // -------------------------

        await deleteDoc(

            doc(
                db,
                "restaurants",
                restaurantId,
                "categories",
                categoryId
            )

        );

        alert("Category Deleted Successfully 😎");

    }

    catch (error) {

        console.log(error);

        alert("Delete Failed");

    }

};

// 🚀 EDIT CATEGORY

window.openCategoryEdit =
async (
    categoryId
) => {

    selectedCategory =
        categoryId

    categoryTimingModal.style.display =
        "flex"

    const category =
        categories.find(
            (c) =>
                c.id === categoryId
        )

    if (!category) return
editCategoryName.value =
    category.name || ""
    document
    .getElementById(
        "categoryTimeSlotsContainer"
    )
    .innerHTML = ""

const categorySlots =
    category.timeSlots || []

categorySlots.forEach((slot) => {

    const div =
        document.createElement("div")

    div.className =
        "time-slot-row"

    div.innerHTML = `

        <input
            type="time"
            class="category-slot-start"
            value="${slot.start}"
        >

        <input
            type="time"
            class="category-slot-end"
            value="${slot.end}"
        >

        <button
            class="delete-slot-btn"
            onclick="removeCategorySlot(this)"
        >
            ✕
        </button>

    `

    document
        .getElementById(
            "categoryTimeSlotsContainer"
        )
        .appendChild(div)
})

    categoryAvailable.checked =
        category.available !== false

    categoryAutoHide.checked =
        category.autoHide === true
}
// 🚀 CATEGORY SORTING

function initCategorySorting() {

    if (categorySortable) {

        categorySortable.destroy()
    }

    categorySortable =
        new Sortable(

            categoriesContainer,

            {

                animation: 200,

                ghostClass:
                    "sortable-ghost",

                delay: 100,

                delayOnTouchOnly: true,

                onEnd: async () => {

    await updateCategorySortOrder();

}
            }
        )
}

function initSubCategorySorting() {

    if (subCategorySortable) {

        subCategorySortable.destroy()

    }

    subCategorySortable = new Sortable(

        subCategoriesContainer,

        {

            animation: 200,

            ghostClass: "sortable-ghost",

            delay: 100,

            delayOnTouchOnly: true,

            onEnd: async () => {

                await updateSubCategorySortOrder()

            }

        }

    )

}
// 🚀 CATEGORY VISIBILITY

window.toggleCategoryVisibility =
async (
    categoryId,
    currentValue
) => {

    try {

        const newVisible =
            !currentValue

        // ✅ Category Update

        await updateDoc(

            doc(
                db,
                "restaurants",
                restaurantId,
                "categories",
                categoryId
            ),

            {

                visible:
                    newVisible,

                updatedAt:
                    Date.now()

            }

        )

        // ✅ All Sub Categories

        const subQuery =
            query(

                collection(
                    db,
                    "restaurants",
                    restaurantId,
                    "subcategories"
                ),

                where(
                    "categoryId",
                    "==",
                    categoryId
                )

            )

        const subSnap =
            await getDocs(
                subQuery
            )

        const batch =
            writeBatch(db)

        for (const subDoc of subSnap.docs) {

            batch.update(

                subDoc.ref,

                {

                    visible:
                        newVisible

                }

            )

        }

        // ✅ All Menu Items

        const menuQuery =
            query(

                collection(
                    db,
                    "restaurants",
                    restaurantId,
                    "menu"
                ),

                where(
                    "categoryId",
                    "==",
                    categoryId
                )

            )

        const menuSnap =
            await getDocs(
                menuQuery
            )

        for (const menuDoc of menuSnap.docs) {

            const data =
                menuDoc.data()

            const manualHidden =
                data.manualHidden === true

            batch.update(

                menuDoc.ref,

                {

                    visible:

                        newVisible

                        ?

                        !manualHidden

                        :

                        false

                }

            )

        }

        await batch.commit()

    } catch(error) {

        console.log(error)

        alert(
            "Category Toggle Failed 😎"
        )
    }

}
window.toggleCategoryStock = async (
    categoryId,
    currentValue
) => {

    try {

        const newStock = !currentValue;

        // =========================
        // CATEGORY UPDATE
        // =========================

        await updateDoc(

            doc(
                db,
                "restaurants",
                restaurantId,
                "categories",
                categoryId
            ),

            {

    stockEnabled: newStock,

    available: newStock,

    updatedAt: Date.now()

}

        );

        // =========================
        // GET SUB CATEGORIES
        // =========================

        const subQuery = query(

            collection(
                db,
                "restaurants",
                restaurantId,
                "subcategories"
            ),

            where(
                "categoryId",
                "==",
                categoryId
            )

        );

        const subSnap = await getDocs(subQuery);

        const batch = writeBatch(db);
                // =========================
        // UPDATE ALL SUB CATEGORIES
        // =========================

        for (const subDoc of subSnap.docs) {

            batch.update(

                subDoc.ref,

                {

    stockEnabled: newStock,

    available: newStock,

    updatedAt: Date.now()

}

            );

        }

        // =========================
        // GET ALL MENU ITEMS OF CATEGORY
        // =========================

        const menuQuery = query(

            collection(
                db,
                "restaurants",
                restaurantId,
                "menu"
            ),

            where(
                "categoryId",
                "==",
                categoryId
            )

        );

        const menuSnap = await getDocs(menuQuery);

        for (const menuDoc of menuSnap.docs) {

            const data = menuDoc.data();

            const manualOutOfStock =
                data.manualOutOfStock === true;

            batch.update(

    menuDoc.ref,

    {

        available:
            newStock
                ? !manualOutOfStock
                : false,

        stockEnabled:
            newStock
                ? !manualOutOfStock
                : false,

        updatedAt:
            Date.now()

    }

);

        }
                // =========================
        // SAVE ALL CHANGES
        // =========================

        await batch.commit();

    } catch (error) {

        console.log(error);

        alert("Category Stock Update Failed 😎");

    }

}
window.toggleSubCategoryVisibility = async (
    subCategoryId,
    currentValue
) => {

    try {

        const newVisible = !currentValue;

        // ✅ Update Sub Category
        await updateDoc(

            doc(
                db,
                "restaurants",
                restaurantId,
                "subcategories",
                subCategoryId
            ),

            {

                visible: newVisible,

                updatedAt: Date.now()

            }

        );
        // ✅ Agar Sub Category Show ho rahi hai
// to Parent Category bhi Show karo

if (newVisible) {

    const subDocSnap = await getDoc(

        doc(
            db,
            "restaurants",
            restaurantId,
            "subcategories",
            subCategoryId
        )

    );

    const categoryId =
        subDocSnap.data()?.categoryId;

    if (categoryId) {

        await updateDoc(

            doc(
                db,
                "restaurants",
                restaurantId,
                "categories",
                categoryId
            ),

            {

                visible: true,

                updatedAt: Date.now()

            }

        );

    }

}

        // ✅ Update Menu Items
        const menuQuery = query(

            collection(
                db,
                "restaurants",
                restaurantId,
                "menu"
            ),

            where(
                "subCategoryId",
                "==",
                subCategoryId
            )

        );

        const menuSnap = await getDocs(menuQuery);

        const batch = writeBatch(db);

        menuSnap.forEach((menuDoc) => {

            const data = menuDoc.data();

            const manualHidden =
                data.manualHidden === true;

            batch.update(

                menuDoc.ref,

                {

                    visible: newVisible
                        ? !manualHidden
                        : false

                }

            );

        });

        await batch.commit();

    } catch (error) {

        console.log(error);

        alert("SubCategory Toggle Failed 😎");

    }

}
window.toggleSubCategoryStock = async (
    subCategoryId,
    currentValue
) => {

    try {

        const newStock = !currentValue;

        // ✅ Update Sub Category
        await updateDoc(

    doc(
        db,
        "restaurants",
        restaurantId,
        "subcategories",
        subCategoryId
    ),

    {

        stockEnabled: newStock,

        available: newStock,

        updatedAt: Date.now()

    }

);
        // ✅ Agar Sub Category In Stock ho rahi hai
// to Parent Category bhi In Stock karo

if (newStock) {

    const subDocSnap = await getDoc(

        doc(
            db,
            "restaurants",
            restaurantId,
            "subcategories",
            subCategoryId
        )

    );

    const categoryId =
        subDocSnap.data()?.categoryId;

    if (categoryId) {

        await updateDoc(

            doc(
                db,
                "restaurants",
                restaurantId,
                "categories",
                categoryId
            ),

            {

    stockEnabled: true,

    available: true,

    updatedAt: Date.now()

}

        );

    }

}

        // ✅ Update all menu items of this Sub Category
        const menuQuery = query(

            collection(
                db,
                "restaurants",
                restaurantId,
                "menu"
            ),

            where(
                "subCategoryId",
                "==",
                subCategoryId
            )

        );

        const menuSnap = await getDocs(menuQuery);

        const batch = writeBatch(db);

        menuSnap.forEach((menuDoc) => {

    const data = menuDoc.data();

    const manualOutOfStock =
        data.manualOutOfStock === true;

    batch.update(

    menuDoc.ref,

    {

        available:
            newStock
                ? !manualOutOfStock
                : false,

        stockEnabled:
            newStock
                ? !manualOutOfStock
                : false,

        updatedAt:
            Date.now()

    }

);

});

        await batch.commit();

    } catch (error) {

        console.log(error);

        alert("Sub Category Stock Update Failed");

    }

}
window.deleteSubCategory = async (subCategoryId) => {

    const ok = confirm(
        "Delete Sub Category?\n\nIske andar ke saare Menu Items bhi delete ho jayenge."
    );

    if (!ok) return;

    try {

        const menuQuery = query(
            collection(
                db,
                "restaurants",
                restaurantId,
                "menu"
            ),
            where(
                "subCategoryId",
                "==",
                subCategoryId
            )
        );

        const menuSnap = await getDocs(menuQuery);

        for (const menuDoc of menuSnap.docs) {

    const data = menuDoc.data();

    if (data.imagePath) {

        try {

            await deleteObject(
                ref(storage, data.imagePath)
            );

        } catch (e) {

            console.log("Image Delete Failed", e);

        }

    }

    await deleteDoc(menuDoc.ref);

}

        await deleteDoc(

            doc(
                db,
                "restaurants",
                restaurantId,
                "subcategories",
                subCategoryId
            )

        );

        alert("Sub Category Deleted Successfully 😎");

    }

    catch (error) {

        console.log(error);

        alert("Delete Failed");

    }

};

window.editSubCategory =
async (
    subCategoryId
) => {

    selectedSubCategory =
        subCategoryId

    const sub =
        subCategories.find(
            s => s.id === subCategoryId
        )

    if (!sub) return

    subCategoryTimingModal.style.display =
        "flex"

    editSubCategoryName.value =
        sub.name || ""

    document
    .getElementById(
        "subCategoryTimeSlotsContainer"
    )
    .innerHTML = ""

const subSlots =
    sub.timeSlots || []

subSlots.forEach((slot) => {

    const div =
        document.createElement("div")

    div.className =
        "time-slot-row"

    div.innerHTML = `

        <input
            type="time"
            class="subcategory-slot-start"
            value="${slot.start}"
        >

        <input
            type="time"
            class="subcategory-slot-end"
            value="${slot.end}"
        >

        <button
            class="delete-slot-btn"
            onclick="removeSubCategorySlot(this)"
        >
            ✕
        </button>

    `

    document
        .getElementById(
            "subCategoryTimeSlotsContainer"
        )
        .appendChild(div)
})

    subCategoryAvailable.checked =
        sub.available !== false

    subCategoryAutoHide.checked =
        sub.autoHide === true
}
closeSubCategoryTimingBtn.onclick =
() => {

    subCategoryTimingModal.style.display =
        "none"
}

saveSubCategoryTimingBtn.onclick =
async () => {

    try {

        await updateDoc(

            doc(
                db,
                "restaurants",
                restaurantId,
                "subcategories",
                selectedSubCategory
            ),

            {

                name:
                    editSubCategoryName.value,

               timeSlots:
    Array.from(
        document.querySelectorAll(
            "#subCategoryTimeSlotsContainer .time-slot-row"
        )
    ).map((row) => ({

        start:
            row.querySelector(
                ".subcategory-slot-start"
            ).value,

        end:
            row.querySelector(
                ".subcategory-slot-end"
            ).value
    })),

                autoHide:
                    subCategoryAutoHide.checked,

                available:
                    subCategoryAvailable.checked,

                updatedAt:
                    Date.now()
            }
        )

        subCategoryTimingModal.style.display =
            "none"

        alert(
            "SubCategory Updated 😎🔥"
        )

    } catch(error) {

        console.log(error)

        alert(
            "Failed 😎"
        )
    }
}
window.addCategorySlot = () => {

    const div =
        document.createElement("div")

    div.className =
        "time-slot-row"

    div.innerHTML = `

        <input
            type="time"
            class="category-slot-start"
        >

        <input
            type="time"
            class="category-slot-end"
        >

        <button
            class="delete-slot-btn"
            onclick="removeCategorySlot(this)"
        >
            ✕
        </button>

    `

    document
        .getElementById(
            "categoryTimeSlotsContainer"
        )
        .appendChild(div)
}

window.removeCategorySlot = (btn) => {

    btn.parentElement.remove()
}

window.addSubCategorySlot = () => {

    const div =
        document.createElement("div")

    div.className =
        "time-slot-row"

    div.innerHTML = `

        <input
            type="time"
            class="subcategory-slot-start"
        >

        <input
            type="time"
            class="subcategory-slot-end"
        >

        <button
            class="delete-slot-btn"
            onclick="removeSubCategorySlot(this)"
        >
            ✕
        </button>

    `

    document
        .getElementById(
            "subCategoryTimeSlotsContainer"
        )
        .appendChild(div)
}

window.removeSubCategorySlot = (btn) => {

    btn.parentElement.remove()
}
window.addItemSlot = () => {

    const div =
        document.createElement("div")

    div.className =
        "time-slot-row"

    div.innerHTML = `

        <input
            type="time"
            class="item-slot-start"
        >

        <input
            type="time"
            class="item-slot-end"
        >

        <button
            class="delete-slot-btn"
            onclick="removeItemSlot(this)"
        >
            ✕
        </button>

    `

    document
        .getElementById(
            "itemTimeSlotsContainer"
        )
        .appendChild(div)
}

window.removeItemSlot = (btn) => {

    btn.parentElement.remove()
}

window.addEditItemSlot = () => {

    const div =
        document.createElement("div")

    div.className =
        "time-slot-row"

    div.innerHTML = `

        <input
            type="time"
            class="edit-item-slot-start"
        >

        <input
            type="time"
            class="edit-item-slot-end"
        >

        <button
            class="delete-slot-btn"
            onclick="removeEditItemSlot(this)"
        >
            ✕
        </button>

    `

    document
        .getElementById(
            "editItemTimeSlotsContainer"
        )
        .appendChild(div)
}

window.removeEditItemSlot = (btn) => {

    const container =
        document.getElementById(
            "editItemTimeSlotsContainer"
        )

    if (
        container.children.length <= 1
    ) {

        container.innerHTML = ""

        return
    }

    btn.parentElement.remove()
}
async function uploadMenuRows(rows) {

    for (const row of rows) {
        if (
    !row.Category ||
    !row["Sub Category"] ||
    !row["Item Name"]
) {

    console.log(
        "Skipped Row",
        row
    )

    continue
}

        // CATEGORY

        let categoryId = null
        console.log(
    "Category =",
    row.Category
)

console.log(
    "Sub Category =",
    row["Sub Category"]
)

console.log(
    "Item Name =",
    row["Item Name"]
)

        const categoryQuery =
            query(
                collection(
                    db,
                    "restaurants",
                    restaurantId,
                    "categories"
                ),
                
                where(
                    "name",
                    "==",
                    row.Category
                )
            )

        const categorySnap =
            await getDocs(
                categoryQuery
            )

        if (
            categorySnap.empty
        ) {
            let nextCategorySortOrder = 1000;

if (categories.length > 0) {

    nextCategorySortOrder = Math.max(
        ...categories.map(c => c.sortOrder || 0)
    ) + 1000;

}

            const categoryRef =
                await addDoc(

                    collection(
                        db,
                        "restaurants",
                        restaurantId,
                        "categories"
                    ),

                    {
                        name:
                            row.Category,

                        visible: true,
                        available: true,

                        sortOrder:
    nextCategorySortOrder,

                        createdAt:
                            Date.now()
                    }
                )

            categoryId =
                categoryRef.id

                categories.push({

    id: categoryRef.id,

    name: row.Category,

    sortOrder: nextCategorySortOrder

});

        } else {

            categoryId =
                categorySnap.docs[0].id
        }

        // SUB CATEGORY
        console.log(
    "Creating/Checking SubCategory:",
    row["Sub Category"]
)

        let subCategoryId =
            null

        const subQuery =
    query(

        collection(
            db,
            "restaurants",
            restaurantId,
            "subcategories"
        ),

        where(
            "categoryId",
            "==",
            categoryId
        )

    )

const subSnap =
    await getDocs(
        subQuery
    )
    const existingSub =
    subSnap.docs.find(

        doc =>

            doc.data().name
                .trim()
                .toLowerCase()

            ===

            row["Sub Category"]
                .trim()
                .toLowerCase()

    )

        if (
    !existingSub
) {
console.log(
    "ADDING SUBCATEGORY:",
    row["Sub Category"]
)
let nextSubSortOrder = 1000;

const sameCategorySubs = subCategories.filter(
    sub => sub.categoryId === categoryId
);

if (sameCategorySubs.length > 0) {

    nextSubSortOrder = Math.max(
        ...sameCategorySubs.map(
            sub => sub.sortOrder || 0
        )
    ) + 1000;

}
            const subRef =
                await addDoc(

                    collection(
                        db,
                        "restaurants",
                        restaurantId,
                        "subcategories"
                    ),

                    {
                        name:
                            row["Sub Category"],

                        categoryId,

                        visible: true,
                        available: true,

                        sortOrder:
    nextSubSortOrder,

                        createdAt:
                            Date.now()
                    }
                )

            subCategoryId =
                subRef.id
                subCategories.push({

    id: subRef.id,

    name: row["Sub Category"],

    categoryId,

    sortOrder: nextSubSortOrder

});

                console.log(
    "SUBCATEGORY CREATED:",
    subRef.id
)

        } else {

    subCategoryId =
        existingSub.id
}

        // VARIANTS

        const variants = []

        if (row.Small) {

            variants.push({

                name: "Small",

                price:
                    Number(
                        row.Small
                    )
            })
        }

        if (row.Medium) {

            variants.push({

                name: "Medium",

                price:
                    Number(
                        row.Medium
                    )
            })
        }

        if (row.Large) {

            variants.push({

                name: "Large",

                price:
                    Number(
                        row.Large
                    )
            })
        }

        const finalPrice =

            variants.length > 0

            ?

            variants[0].price

            :

            Number(
                row.Price || 0
            )

        // MENU ITEM
        
            let nextItemSortOrder = 1000;

const sameSubItems = menuItems.filter(
    item =>
        item.subCategoryId === subCategoryId
);

if (sameSubItems.length > 0) {

    nextItemSortOrder = Math.max(
        ...sameSubItems.map(
            item => item.sortOrder || 0
        )
    ) + 1000;

}
        await addDoc(

            collection(
                db,
                "restaurants",
                restaurantId,
                "menu"
            ),

            {

                name:
                    row["Item Name"],

                description:
                    row.Description || "",

                price:
                    finalPrice,

                categoryId,

                categoryName:
                    row.Category,

                subCategoryId,

                subCategoryName:
                    row["Sub Category"],

                veg: true,

                variants,

                available:
                    row.Available !== false,

                visible:
                    row.Visible !== false,

                image: "",

                bestseller: false,

                recommended: false,

                hidden: false,

                createdAt:
                    Date.now(),

                sortOrder:
    nextItemSortOrder
            }
        )
        menuItems.push({

    categoryId,

    subCategoryId,

    sortOrder: nextItemSortOrder

});
    }
}