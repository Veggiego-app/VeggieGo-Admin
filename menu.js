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

let pendingExcelRows = []
let pendingExcelPreview = null

function normalizeMenuText(value) {

    return String(
        value ?? ""
    )
    .trim()
    .replace(
        /\s+/g,
        " "
    )
}

function getMenuDuplicateKey(
    categoryName,
    subCategoryName,
    itemName
) {

    return [
        normalizeMenuText(
            categoryName
        ).toLowerCase(),

        normalizeMenuText(
            subCategoryName
        ).toLowerCase(),

        normalizeMenuText(
            itemName
        ).toLowerCase()
    ].join("|||")
}

function escapeExcelPreviewHtml(value) {

    return String(
        value ?? ""
    ).replace(
        /[&<>"']/g,
        (character) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        })[character]
    )
}

function formatExcelFileSize(bytes) {

    if (
        !Number.isFinite(bytes)
    ) return ""

    if (
        bytes < 1024
    ) {

        return `${bytes} B`
    }

    if (
        bytes < 1024 * 1024
    ) {

        return `${
            (bytes / 1024)
                .toFixed(1)
        } KB`
    }

    return `${
        (
            bytes /
            (1024 * 1024)
        ).toFixed(1)
    } MB`
}

async function loadExistingMenuIndex() {

    const [
        categorySnapshot,
        subCategorySnapshot,
        menuSnapshot
    ] = await Promise.all([

        getDocs(
            collection(
                db,
                "restaurants",
                restaurantId,
                "categories"
            )
        ),

        getDocs(
            collection(
                db,
                "restaurants",
                restaurantId,
                "subcategories"
            )
        ),

        getDocs(
            collection(
                db,
                "restaurants",
                restaurantId,
                "menu"
            )
        )
    ])

    const categoryNamesById =
        new Map()

    categorySnapshot.forEach(
        (categoryDocument) => {

            categoryNamesById.set(
                categoryDocument.id,
                normalizeMenuText(
                    categoryDocument
                        .data()
                        .name
                )
            )
        }
    )

    const subCategoryNamesById =
        new Map()

    subCategorySnapshot.forEach(
        (subCategoryDocument) => {

            subCategoryNamesById.set(
                subCategoryDocument.id,
                normalizeMenuText(
                    subCategoryDocument
                        .data()
                        .name
                )
            )
        }
    )

    const existingItemKeys =
        new Map()

    menuSnapshot.forEach(
        (menuDocument) => {

            const item =
                menuDocument.data()

            const categoryName =
                normalizeMenuText(
                    categoryNamesById.get(
                        item.categoryId
                    ) ||
                    item.categoryName
                )

            const subCategoryName =
                normalizeMenuText(
                    subCategoryNamesById.get(
                        item.subCategoryId
                    ) ||
                    item.subCategoryName
                )

            const itemName =
                normalizeMenuText(
                    item.name
                )

            if (
                !categoryName ||
                !subCategoryName ||
                !itemName
            ) return

            existingItemKeys.set(
                getMenuDuplicateKey(
                    categoryName,
                    subCategoryName,
                    itemName
                ),
                {
                    categoryName,
                    subCategoryName,
                    itemName
                }
            )
        }
    )

    return {
        categorySnapshot,
        subCategorySnapshot,
        menuSnapshot,
        categoryNamesById,
        subCategoryNamesById,
        existingItemKeys
    }
}

function ensureExcelPreviewModal() {

    if (
        document.getElementById(
            "excelPreviewModal"
        )
    ) return

    const style =
        document.createElement(
            "style"
        )

    style.id =
        "excelPreviewStyles"

    style.textContent = `
        #excelPreviewModal {
            position: fixed;
            inset: 0;
            z-index: 10000;
            display: none;
            align-items: center;
            justify-content: center;
            padding: 18px;
            background: rgba(15, 23, 42, 0.68);
        }

        #excelPreviewModal.open {
            display: flex;
        }

        .excel-preview-panel {
            width: min(980px, 100%);
            max-height: 92vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            border-radius: 18px;
            background: #ffffff;
            box-shadow: 0 24px 70px rgba(15, 23, 42, 0.28);
        }

        .excel-preview-header {
            padding: 20px 22px 16px;
            border-bottom: 1px solid #e2e8f0;
        }

        .excel-preview-title {
            margin: 0;
            color: #0f172a;
            font-size: 22px;
            font-weight: 800;
        }

        .excel-preview-file {
            margin-top: 8px;
            color: #334155;
            font-size: 14px;
            word-break: break-word;
        }

        .excel-preview-file strong {
            color: #0f172a;
        }

        .excel-preview-body {
            overflow-y: auto;
            padding: 18px 22px;
        }

        .excel-summary-grid {
            display: grid;
            grid-template-columns: repeat(6, minmax(115px, 1fr));
            gap: 10px;
        }

        .excel-summary-card {
            padding: 14px 12px;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            background: #f8fafc;
        }

        .excel-summary-card strong {
            display: block;
            color: #0f172a;
            font-size: 24px;
            line-height: 1;
        }

        .excel-summary-card span {
            display: block;
            margin-top: 7px;
            color: #64748b;
            font-size: 12px;
            font-weight: 700;
        }

        .excel-summary-card.uploadable {
            border-color: #86efac;
            background: #f0fdf4;
        }

        .excel-summary-card.duplicate {
            border-color: #fcd34d;
            background: #fffbeb;
        }

        .excel-summary-card.invalid {
            border-color: #fca5a5;
            background: #fef2f2;
        }

        .excel-preview-section {
            margin-top: 20px;
        }

        .excel-preview-section h4 {
            margin: 0 0 10px;
            color: #0f172a;
            font-size: 15px;
        }

        .excel-table-wrap {
            max-height: 245px;
            overflow: auto;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
        }

        .excel-preview-table {
            width: 100%;
            border-collapse: collapse;
            color: #334155;
            font-size: 13px;
        }

        .excel-preview-table th,
        .excel-preview-table td {
            padding: 10px 12px;
            border-bottom: 1px solid #e2e8f0;
            text-align: left;
            vertical-align: top;
        }

        .excel-preview-table th {
            position: sticky;
            top: 0;
            z-index: 1;
            color: #475569;
            background: #f8fafc;
            font-size: 12px;
        }

        .excel-preview-table tr:last-child td {
            border-bottom: 0;
        }

        #excelPreviewModal .excel-preview-table tbody tr:hover > td {
    color: #0f172a !important;
    background: #eff6ff !important;
}

#excelPreviewModal .excel-preview-table tbody tr:hover > td.excel-duplicate-source {
    color: #b45309 !important;
}

#excelPreviewModal .excel-preview-table tbody tr:hover > td.excel-invalid-reason {
    color: #dc2626 !important;
}

        .excel-duplicate-source {
            color: #b45309;
            font-weight: 700;
        }

        .excel-invalid-reason {
            color: #dc2626;
            font-weight: 700;
        }

        .excel-import-progress {
            display: none;
            margin-top: 18px;
            padding: 14px;
            border-radius: 12px;
            background: #eff6ff;
        }

        .excel-import-progress.show {
            display: block;
        }

        .excel-progress-text {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 9px;
            color: #1e3a8a;
            font-size: 13px;
            font-weight: 800;
        }

        .excel-progress-track {
            height: 9px;
            overflow: hidden;
            border-radius: 999px;
            background: #bfdbfe;
        }

        .excel-progress-bar {
            width: 0;
            height: 100%;
            border-radius: inherit;
            background: #2563eb;
            transition: width 0.2s ease;
        }

        .excel-preview-footer {
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            padding: 15px 22px;
            border-top: 1px solid #e2e8f0;
            background: #ffffff;
        }

        .excel-preview-btn {
            min-height: 42px;
            padding: 10px 16px;
            border: 0;
            border-radius: 10px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 800;
        }

        .excel-preview-btn:disabled {
            cursor: not-allowed;
            opacity: 0.55;
        }

        .excel-preview-btn.secondary {
            color: #334155;
            background: #e2e8f0;
        }

        .excel-preview-btn.cancel {
            color: #b91c1c;
            background: #fee2e2;
        }

        .excel-preview-btn.confirm {
            color: #ffffff;
            background: #16a34a;
        }

        @media (max-width: 820px) {
            .excel-summary-grid {
                grid-template-columns: repeat(2, minmax(120px, 1fr));
            }

            .excel-preview-footer {
                flex-wrap: wrap;
            }

            .excel-preview-btn {
                flex: 1 1 180px;
            }
        }
    `

    document.head.appendChild(
        style
    )

    const modal =
        document.createElement(
            "div"
        )

    modal.id =
        "excelPreviewModal"

    modal.innerHTML = `
        <div
            class="excel-preview-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="excelPreviewTitle"
        >
            <div class="excel-preview-header">
                <h3
                    id="excelPreviewTitle"
                    class="excel-preview-title"
                >
                    Excel Menu Preview
                </h3>

                <div class="excel-preview-file">
                    File:
                    <strong id="excelPreviewFileName">-</strong>
                    <span id="excelPreviewFileMeta"></span>
                </div>
            </div>

            <div class="excel-preview-body">
                <div class="excel-summary-grid">
                    <div class="excel-summary-card">
                        <strong id="excelPreviewCategories">0</strong>
                        <span>Categories</span>
                    </div>

                    <div class="excel-summary-card">
                        <strong id="excelPreviewSubCategories">0</strong>
                        <span>Sub Categories</span>
                    </div>

                    <div class="excel-summary-card">
                        <strong id="excelPreviewTotalItems">0</strong>
                        <span>Total Items</span>
                    </div>

                    <div class="excel-summary-card uploadable">
                        <strong id="excelPreviewUploadableItems">0</strong>
                        <span>Items Upload होंगे</span>
                    </div>

                    <div class="excel-summary-card duplicate">
                        <strong id="excelPreviewDuplicateItems">0</strong>
                        <span>Duplicate Items</span>
                    </div>

                    <div class="excel-summary-card invalid">
                        <strong id="excelPreviewInvalidRows">0</strong>
                        <span>Invalid Rows</span>
                    </div>
                </div>

                <div class="excel-preview-section">
                    <h4>Category-wise Summary</h4>

                    <div class="excel-table-wrap">
                        <table class="excel-preview-table">
                            <thead>
                                <tr>
                                    <th>Category</th>
                                    <th>Sub Categories</th>
                                    <th>Items</th>
                                </tr>
                            </thead>

                            <tbody id="excelCategorySummaryBody"></tbody>
                        </table>
                    </div>
                </div>

                <div
                    id="excelDuplicateSection"
                    class="excel-preview-section"
                    style="display:none"
                >
                    <h4>
                        Duplicate Items —
                        ये upload नहीं होंगे
                    </h4>

                    <div class="excel-table-wrap">
                        <table class="excel-preview-table">
                            <thead>
                                <tr>
                                    <th>Excel Row</th>
                                    <th>Category</th>
                                    <th>Sub Category</th>
                                    <th>Item Name</th>
                                    <th>Duplicate कहाँ है</th>
                                </tr>
                            </thead>

                            <tbody id="excelDuplicateBody"></tbody>
                        </table>
                    </div>
                </div>

                <div
                    id="excelInvalidSection"
                    class="excel-preview-section"
                    style="display:none"
                >
                    <h4>
                        Invalid Rows —
                        ये upload नहीं होंगी
                    </h4>

                    <div class="excel-table-wrap">
                        <table class="excel-preview-table">
                            <thead>
                                <tr>
                                    <th>Excel Row</th>
                                    <th>Category</th>
                                    <th>Sub Category</th>
                                    <th>Item Name</th>
                                    <th>Problem</th>
                                </tr>
                            </thead>

                            <tbody id="excelInvalidBody"></tbody>
                        </table>
                    </div>
                </div>

                <div
                    id="excelImportProgress"
                    class="excel-import-progress"
                >
                    <div class="excel-progress-text">
                        <span>Uploading Menu...</span>
                        <span id="excelImportProgressText">0 / 0</span>
                    </div>

                    <div class="excel-progress-track">
                        <div
                            id="excelImportProgressBar"
                            class="excel-progress-bar"
                        ></div>
                    </div>
                </div>
            </div>

            <div class="excel-preview-footer">
                <button
                    type="button"
                    id="chooseAnotherExcelBtn"
                    class="excel-preview-btn secondary"
                >
                    Choose Another File
                </button>

                <button
                    type="button"
                    id="cancelExcelUploadBtn"
                    class="excel-preview-btn cancel"
                >
                    Cancel
                </button>

                <button
                    type="button"
                    id="confirmExcelUploadBtn"
                    class="excel-preview-btn confirm"
                >
                    Confirm Upload
                </button>
            </div>
        </div>
    `

    document.body.appendChild(
        modal
    )

    document
        .getElementById(
            "chooseAnotherExcelBtn"
        )
        .addEventListener(
            "click",
            () => {

                closeExcelPreview()

                excelFile.click()
            }
        )

    document
        .getElementById(
            "cancelExcelUploadBtn"
        )
        .addEventListener(
            "click",
            () => {

                closeExcelPreview()
            }
        )

    document
        .getElementById(
            "confirmExcelUploadBtn"
        )
        .addEventListener(
            "click",
            confirmExcelMenuUpload
        )
}

function closeExcelPreview() {

    document
        .getElementById(
            "excelPreviewModal"
        )
        ?.classList
        .remove("open")

    pendingExcelRows = []
    pendingExcelPreview = null

    if (excelFile) {

        excelFile.value = ""
    }
}

function renderExcelPreview(
    preview,
    file
) {

    ensureExcelPreviewModal()

    document
        .getElementById(
            "excelPreviewFileName"
        )
        .textContent =
            file.name

    document
        .getElementById(
            "excelPreviewFileMeta"
        )
        .textContent =
            ` (${formatExcelFileSize(
                file.size
            )})`

    document
        .getElementById(
            "excelPreviewCategories"
        )
        .textContent =
            preview.categorySummary.length

    document
        .getElementById(
            "excelPreviewSubCategories"
        )
        .textContent =
            preview.totalSubCategories

    document
        .getElementById(
            "excelPreviewTotalItems"
        )
        .textContent =
            preview.totalItems

    document
        .getElementById(
            "excelPreviewUploadableItems"
        )
        .textContent =
            preview.uploadRows.length

    document
        .getElementById(
            "excelPreviewDuplicateItems"
        )
        .textContent =
            preview.duplicates.length

    document
        .getElementById(
            "excelPreviewInvalidRows"
        )
        .textContent =
            preview.invalidRows.length

    const categorySummaryBody =
        document.getElementById(
            "excelCategorySummaryBody"
        )

    categorySummaryBody.innerHTML =
        preview.categorySummary.length

        ?

        preview.categorySummary
            .map(
                (category) => `
                    <tr>
                        <td>
                            ${escapeExcelPreviewHtml(
                                category.name
                            )}
                        </td>
                        <td>
                            ${category.subCategoryCount}
                        </td>
                        <td>
                            ${category.itemCount}
                        </td>
                    </tr>
                `
            )
            .join("")

        :

        `
            <tr>
                <td colspan="3">
                    कोई valid menu data नहीं मिला।
                </td>
            </tr>
        `

    const duplicateSection =
        document.getElementById(
            "excelDuplicateSection"
        )

    duplicateSection.style.display =
        preview.duplicates.length
            ? "block"
            : "none"

    document
        .getElementById(
            "excelDuplicateBody"
        )
        .innerHTML =
            preview.duplicates
                .map(
                    (duplicate) => `
                        <tr>
                            <td>${duplicate.rowNumber}</td>
                            <td>
                                ${escapeExcelPreviewHtml(
                                    duplicate.categoryName
                                )}
                            </td>
                            <td>
                                ${escapeExcelPreviewHtml(
                                    duplicate.subCategoryName
                                )}
                            </td>
                            <td>
                                ${escapeExcelPreviewHtml(
                                    duplicate.itemName
                                )}
                            </td>
                            <td class="excel-duplicate-source">
                                ${escapeExcelPreviewHtml(
                                    duplicate.source
                                )}
                            </td>
                        </tr>
                    `
                )
                .join("")

    const invalidSection =
        document.getElementById(
            "excelInvalidSection"
        )

    invalidSection.style.display =
        preview.invalidRows.length
            ? "block"
            : "none"

    document
        .getElementById(
            "excelInvalidBody"
        )
        .innerHTML =
            preview.invalidRows
                .map(
                    (invalidRow) => `
                        <tr>
                            <td>${invalidRow.rowNumber}</td>
                            <td>
                                ${escapeExcelPreviewHtml(
                                    invalidRow.categoryName ||
                                    "-"
                                )}
                            </td>
                            <td>
                                ${escapeExcelPreviewHtml(
                                    invalidRow.subCategoryName ||
                                    "-"
                                )}
                            </td>
                            <td>
                                ${escapeExcelPreviewHtml(
                                    invalidRow.itemName ||
                                    "-"
                                )}
                            </td>
                            <td class="excel-invalid-reason">
                                ${escapeExcelPreviewHtml(
                                    invalidRow.reason
                                )}
                            </td>
                        </tr>
                    `
                )
                .join("")

    const confirmButton =
        document.getElementById(
            "confirmExcelUploadBtn"
        )

    confirmButton.disabled =
        preview.uploadRows.length === 0

    confirmButton.textContent =
        preview.uploadRows.length

        ?

        `Confirm Upload (${
            preview.uploadRows.length
        } Items)`

        :

        "No Items To Upload"

    document
        .getElementById(
            "excelImportProgress"
        )
        .classList
        .remove("show")

    document
        .getElementById(
            "excelImportProgressBar"
        )
        .style.width = "0%"

    document
        .getElementById(
            "excelPreviewModal"
        )
        .classList
        .add("open")
}

async function buildExcelPreview(
    rows
) {

    const existingIndex =
        await loadExistingMenuIndex()

    const seenExcelItems =
        new Map()

    const categorySummaryMap =
        new Map()

    const uploadRows = []
    const duplicates = []
    const invalidRows = []

    rows.forEach(
        (originalRow, index) => {

            const rowNumber =
                index + 2

            const categoryName =
                normalizeMenuText(
                    originalRow.Category
                )

            const subCategoryName =
                normalizeMenuText(
                    originalRow[
                        "Sub Category"
                    ]
                )

            const itemName =
                normalizeMenuText(
                    originalRow[
                        "Item Name"
                    ]
                )

            const missingColumns = []

            if (!categoryName) {

                missingColumns.push(
                    "Category"
                )
            }

            if (!subCategoryName) {

                missingColumns.push(
                    "Sub Category"
                )
            }

            if (!itemName) {

                missingColumns.push(
                    "Item Name"
                )
            }

            if (
                missingColumns.length
            ) {

                invalidRows.push({
                    rowNumber,
                    categoryName,
                    subCategoryName,
                    itemName,
                    reason:
                        `${
                            missingColumns.join(", ")
                        } missing है`
                })

                return
            }

            const categoryKey =
                categoryName.toLowerCase()

            if (
                !categorySummaryMap.has(
                    categoryKey
                )
            ) {

                categorySummaryMap.set(
                    categoryKey,
                    {
                        name: categoryName,
                        subCategories:
                            new Set(),
                        itemCount: 0
                    }
                )
            }

            const categorySummary =
                categorySummaryMap.get(
                    categoryKey
                )

            categorySummary
                .subCategories
                .add(
                    subCategoryName
                        .toLowerCase()
                )

            categorySummary.itemCount += 1

            const duplicateKey =
                getMenuDuplicateKey(
                    categoryName,
                    subCategoryName,
                    itemName
                )

            if (
                existingIndex
                    .existingItemKeys
                    .has(duplicateKey)
            ) {

                duplicates.push({
                    rowNumber,
                    categoryName,
                    subCategoryName,
                    itemName,
                    source:
                        "Existing menu में पहले से मौजूद"
                })

                return
            }

            if (
                seenExcelItems.has(
                    duplicateKey
                )
            ) {

                duplicates.push({
                    rowNumber,
                    categoryName,
                    subCategoryName,
                    itemName,
                    source:
                        `इसी Excel की Row ${
                            seenExcelItems.get(
                                duplicateKey
                            )
                        } में मौजूद`
                })

                return
            }

            seenExcelItems.set(
                duplicateKey,
                rowNumber
            )

            uploadRows.push({
                ...originalRow,
                Category:
                    categoryName,
                "Sub Category":
                    subCategoryName,
                "Item Name":
                    itemName
            })
        }
    )

    const categorySummary =
        Array.from(
            categorySummaryMap.values()
        )
        .map(
            (category) => ({
                name:
                    category.name,
                subCategoryCount:
                    category
                        .subCategories
                        .size,
                itemCount:
                    category.itemCount
            })
        )

    const totalSubCategories =
        categorySummary.reduce(
            (
                total,
                category
            ) =>
                total +
                category
                    .subCategoryCount,
            0
        )

    return {
        totalRows:
            rows.length,
        totalItems:
            rows.length -
            invalidRows.length,
        categorySummary,
        totalSubCategories,
        uploadRows,
        duplicates,
        invalidRows
    }
}

async function confirmExcelMenuUpload() {

    if (
        !pendingExcelRows.length ||
        !pendingExcelPreview
    ) return

    const confirmButton =
        document.getElementById(
            "confirmExcelUploadBtn"
        )

    const cancelButton =
        document.getElementById(
            "cancelExcelUploadBtn"
        )

    const chooseButton =
        document.getElementById(
            "chooseAnotherExcelBtn"
        )

    const progress =
        document.getElementById(
            "excelImportProgress"
        )

    const progressText =
        document.getElementById(
            "excelImportProgressText"
        )

    const progressBar =
        document.getElementById(
            "excelImportProgressBar"
        )

    confirmButton.disabled = true
    cancelButton.disabled = true
    chooseButton.disabled = true

    confirmButton.textContent =
        "Uploading..."

    progress
        .classList
        .add("show")

    progressText.textContent =
        `0 / ${pendingExcelRows.length}`

    progressBar.style.width = "0%"

    try {

        const uploadResult =
            await uploadMenuRows(
                pendingExcelRows,
                (completed, total) => {

                    progressText.textContent =
                        `${completed} / ${total}`

                    progressBar.style.width =
                        `${
                            total
                                ? (
                                    completed /
                                    total
                                ) * 100
                                : 0
                        }%`
                }
            )

        const duplicateCount =
            pendingExcelPreview
                .duplicates
                .length +
            uploadResult
                .skippedDuplicates
                .length

        alert(
            `Menu Uploaded Successfully!\n\n` +
            `Uploaded Items: ${
                uploadResult.uploadedCount
            }\n` +
            `Duplicate Skipped: ${
                duplicateCount
            }\n` +
            `Invalid Rows Skipped: ${
                pendingExcelPreview
                    .invalidRows
                    .length
            }`
        )

        closeExcelPreview()
    }

    catch (error) {

        console.error(
            "Excel menu upload failed:",
            error
        )

        alert(
            "Menu upload पूरा नहीं हुआ। " +
            "Internet check करके file को दोबारा select करें। " +
            "जो items upload हो चुके हैं, वे duplicate check के कारण दोबारा नहीं बनेंगे।"
        )

        confirmButton.disabled = false
        cancelButton.disabled = false
        chooseButton.disabled = false

        confirmButton.textContent =
            `Retry Upload (${
                pendingExcelRows.length
            } Items)`
    }
}

if (excelFile) {

    excelFile.addEventListener(
        "change",
        async (event) => {

            const file =
                event.target.files[0]

            if (!file) return

            if (
                !/\.(xlsx|xls)$/i
                    .test(file.name)
            ) {

                alert(
                    "Please select only .xlsx or .xls Excel file."
                )

                excelFile.value = ""

                return
            }

            if (uploadExcelBtn) {

                uploadExcelBtn.disabled =
                    true
            }

            try {

                const data =
                    await file.arrayBuffer()

                const workbook =
                    XLSX.read(data)

                if (
                    !workbook
                        .SheetNames
                        .length
                ) {

                    throw new Error(
                        "Excel sheet missing"
                    )
                }

                const sheet =
                    workbook.Sheets[
                        workbook
                            .SheetNames[0]
                    ]

                const rows =
                    XLSX.utils
                        .sheet_to_json(
                            sheet,
                            {
                                defval: ""
                            }
                        )

                if (!rows.length) {

                    throw new Error(
                        "Excel file is empty"
                    )
                }

                const preview =
                    await buildExcelPreview(
                        rows
                    )

                pendingExcelRows =
                    preview.uploadRows

                pendingExcelPreview =
                    preview

                renderExcelPreview(
                    preview,
                    file
                )
            }

            catch (error) {

                console.error(
                    "Excel preview failed:",
                    error
                )

                alert(
                    "Excel file read नहीं हुई। सही menu Excel file select करें।"
                )

                excelFile.value = ""
            }

            finally {

                if (uploadExcelBtn) {

                    uploadExcelBtn.disabled =
                        false
                }
            }
        }
    )
}

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

const categoryVisible =
    document.getElementById(
        "categoryVisible"
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

const subCategoryVisible =
    document.getElementById(
        "subCategoryVisible"
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

// 🔥 RENDER CATEGORY TREE

function renderCategories() {

    categoriesContainer.innerHTML = ""

    categories.forEach((category) => {

        const categorySubs = subCategories.filter(
            sub => sub.categoryId === category.id
        )

        const isActive = selectedCategory === category.id

        const categoryHasOwnTimeSlot =
    Array.isArray(category.timeSlots) &&
    category.timeSlots.some(
        slot => slot?.start && slot?.end
    )

const categoryHasSubTimeSlot =
    categorySubs.some(
        sub =>
            Array.isArray(sub.timeSlots) &&
            sub.timeSlots.some(
                slot => slot?.start && slot?.end
            )
    )

const categoryHasSchedule =
    categoryHasOwnTimeSlot ||
    categoryHasSubTimeSlot

        const wrapper = document.createElement("div")
        wrapper.className = `category-tree-group ${isActive ? "active" : ""}`
        wrapper.dataset.id = category.id

        wrapper.innerHTML = `
            <div class="category-tree-row" data-category-id="${category.id}">
                <button class="tree-chevron" type="button" aria-label="Expand category">
                    ${isActive ? "▼" : "▶"}
                </button>

                <div class="tree-category-main">
                    <strong class="tree-name-with-schedule">
    ${escapeMenuHtml(category.name)}

    ${
        categoryHasSchedule
            ? `
                <span
                    class="tree-clock-icon"
                    title="${
                        categoryHasOwnTimeSlot
                            ? "Time slot added in this category"
                            : "Time slot added in a subcategory"
                    }"
                >
                    🕒
                </span>
            `
            : ""
    }
</strong>
                    <span>${categorySubs.length} subcategories</span>
                </div>

                <button
                    class="tree-mini-status ${category.stockEnabled === false ? "off" : "on"}"
                    type="button"
                    onclick="event.stopPropagation();toggleCategoryStock('${category.id}', ${category.stockEnabled !== false})"
                    title="Change stock"
                >
                    ${category.stockEnabled === false ? "Out" : "In"}
                </button>

                <button
                    class="tree-icon-btn visibility ${category.visible === false ? "is-hidden" : ""}"
                    type="button"
                    onclick="event.stopPropagation();toggleCategoryVisibility('${category.id}', ${category.visible !== false})"
                    title="${category.visible === false ? "Show" : "Hide"} category"
                >${category.visible === false ? "👁" : "🙈"}</button>

                <button
                    class="tree-icon-btn edit"
                    type="button"
                    onclick="event.stopPropagation();openCategoryEdit('${category.id}')"
                    title="Edit category"
                >✏️</button>

                <button
                    class="tree-icon-btn delete"
                    type="button"
                    onclick="event.stopPropagation();deleteCategory('${category.id}')"
                    title="Delete category"
                >🗑️</button>
            </div>

            <div class="tree-subcategory-list ${isActive ? "open" : ""}" data-category-id="${category.id}">
                ${categorySubs.length ? categorySubs.map(sub => `
                    <div
                        class="subcategory-tree-row subcategory-card ${selectedSubCategory === sub.id ? "active" : ""}"
                        data-id="${sub.id}"
                        data-category-id="${category.id}"
                    >
                        <span class="tree-branch">└</span>

                        <div class="tree-sub-main">
                            <strong class="tree-name-with-schedule">
    ${escapeMenuHtml(sub.name)}

    ${
        Array.isArray(sub.timeSlots) &&
        sub.timeSlots.some(
            slot => slot?.start && slot?.end
        )
            ? `
                <span
                    class="tree-clock-icon"
                    title="Time slot added in this subcategory"
                >
                    🕒
                </span>
            `
            : ""
    }
</strong>
                            <span>${sub.timeSlots?.length ? "Scheduled" : "Always"}</span>
                        </div>

                        <button
                            class="tree-mini-status ${sub.stockEnabled === false ? "off" : "on"}"
                            type="button"
                            onclick="event.stopPropagation();toggleSubCategoryStock('${sub.id}', ${sub.stockEnabled !== false})"
                            title="Change stock"
                        >${sub.stockEnabled === false ? "Out" : "In"}</button>

                        <button
                            class="tree-icon-btn visibility ${sub.visible === false ? "is-hidden" : ""}"
                            type="button"
                            onclick="event.stopPropagation();toggleSubCategoryVisibility('${sub.id}', ${sub.visible !== false})"
                            title="${sub.visible === false ? "Show" : "Hide"} subcategory"
                        >${sub.visible === false ? "👁" : "🙈"}</button>

                        <button
                            class="tree-icon-btn edit"
                            type="button"
                            onclick="event.stopPropagation();editSubCategory('${sub.id}')"
                            title="Edit subcategory"
                        >✏️</button>

                        <button
                            class="tree-icon-btn delete"
                            type="button"
                            onclick="event.stopPropagation();deleteSubCategory('${sub.id}')"
                            title="Delete subcategory"
                        >🗑️</button>
                    </div>
                `).join("") : `
                    <div class="tree-empty-sub">No subcategory</div>
                `}
            </div>
        `

        const categoryRow = wrapper.querySelector(".category-tree-row")
        categoryRow.onclick = () => {
            if (selectedCategory === category.id) {
                selectedCategory = null
                selectedSubCategory = null
            } else {
                selectedCategory = category.id
                selectedSubCategory = categorySubs[0]?.id || null
            }

            renderCategories()
            renderItems()
            initSubCategorySorting()
        }

        wrapper.querySelectorAll(".subcategory-tree-row").forEach(row => {
            row.onclick = () => {
                selectedCategory = category.id
                selectedSubCategory = row.dataset.id
                renderCategories()
                renderItems()
                initSubCategorySorting()
            }
        })

        categoriesContainer.appendChild(wrapper)
    })
}

// Subcategories are rendered inside the category tree.
function renderSubCategories() {
    renderCategories()
}

// 🔥 RENDER ITEMS
let expandedMenuItemId = null

function escapeMenuHtml(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;")
}

function getItemTimeSlots(item) {

    if (Array.isArray(item.timeSlots) && item.timeSlots.length) {

        return item.timeSlots.filter(
            slot => slot?.start && slot?.end
        )
    }

    if (item.startTime && item.endTime) {

        return [{
            start: item.startTime,
            end: item.endTime
        }]
    }

    return []
}

function getItemAddons(item) {

    const possibleAddons =
        item.addons ||
        item.addOns ||
        item.addon ||
        []

    return Array.isArray(possibleAddons)
        ? possibleAddons
        : []
}

window.toggleMenuItemDetails = (itemId) => {

    expandedMenuItemId =
        expandedMenuItemId === itemId
            ? null
            : itemId

    renderItems()
}

// 🔥 RENDER ITEMS — COMPACT ROW + EXPAND DETAILS
function renderItems() {

    itemsContainer.innerHTML = ""

    const keyword =
        searchInput.value
            .trim()
            .toLowerCase()

    if (!selectedSubCategory && keyword === "") {

        itemsContainer.innerHTML = `
            <div class="menu-empty-state">
                👈 Select Sub Category
            </div>
        `

        return
    }

    const filtered =
        menuItems.filter((item) => {

            const matchSubCategory =
                keyword !== ""
                    ? true
                    : item.subCategoryId === selectedSubCategory

            const matchSearch =
                String(item.name || "")
                    .toLowerCase()
                    .includes(keyword)

            return matchSubCategory && matchSearch
        })

    if (filtered.length === 0) {

        itemsContainer.innerHTML = `
            <div class="menu-empty-state muted">
                🔍 No Item Found
            </div>
        `

        return
    }

    const tableHeader =
        document.createElement("div")

    tableHeader.className =
        "menu-items-table-header"

    tableHeader.innerHTML = `
        <div>Photo</div>
        <div>Item</div>
        <div>Price</div>
        <div>Variants</div>
        <div>Stock</div>
        <div>Visibility</div>
        <div>Time</div>
        <div>Tags</div>
        <div>Actions</div>
    `

    itemsContainer.appendChild(tableHeader)

    const rowsContainer =
        document.createElement("div")

    rowsContainer.className =
        "menu-items-rows"

    itemsContainer.appendChild(rowsContainer)

    filtered.forEach((item) => {

        const isExpanded =
            expandedMenuItemId === item.id

        const variants =
            Array.isArray(item.variants)
                ? item.variants
                : []

        const addons =
            getItemAddons(item)

        const timeSlots =
            getItemTimeSlots(item)

        const variantsDetails =
            variants.length
                ? variants.map((variant) => `
                    <div class="expanded-detail-line">
                        <span>${escapeMenuHtml(variant.name || "Variant")}</span>
                        <strong>₹${Number(variant.price || 0)}</strong>
                    </div>
                `).join("")
                : `<div class="expanded-empty">No variants</div>`

        const addonsDetails =
            addons.length
                ? addons.map((addon) => `
                    <div class="expanded-detail-line">
                        <span>${escapeMenuHtml(addon.name || addon.title || "Addon")}</span>
                        <strong>+₹${Number(addon.price || addon.amount || 0)}</strong>
                    </div>
                `).join("")
                : `<div class="expanded-empty">No addons</div>`

        const timeDetails =
            timeSlots.length
                ? timeSlots.map((slot) => `
                    <div class="expanded-time-pill">
                        ${escapeMenuHtml(slot.start)} - ${escapeMenuHtml(slot.end)}
                    </div>
                `).join("")
                : `<div class="expanded-empty">Always Available</div>`

        const timeLabel =
            timeSlots.length
                ? "Scheduled"
                : "Always"

        const tagsHtml = `
            ${item.bestseller
                ? '<span class="row-tag bestseller">🔥 Best</span>'
                : ''}
            ${item.recommended
                ? '<span class="row-tag recommended">⭐ Rec</span>'
                : ''}
            ${!item.bestseller && !item.recommended
                ? '<span class="row-no-tag">—</span>'
                : ''}
        `

        const group =
            document.createElement("div")

        group.className =
            `menu-item-group ${isExpanded ? "expanded" : ""}`

        group.dataset.id = item.id

        group.innerHTML = `
            <div
                class="menu-item-row"
                role="button"
                tabindex="0"
                aria-expanded="${isExpanded}"
                onclick="toggleMenuItemDetails('${item.id}')"
                onkeydown="if(event.key === 'Enter' || event.key === ' '){event.preventDefault();toggleMenuItemDetails('${item.id}')}"
            >
                <div class="row-photo-cell">
                    <span class="row-expand-arrow">${isExpanded ? "▼" : "▶"}</span>
                    <img
                        src="${escapeMenuHtml(item.image || 'https://placehold.co/96x96?text=Veg') }"
                        alt="${escapeMenuHtml(item.name || 'Menu item')}"
                        class="row-item-image"
                    >
                </div>

                <div class="row-item-name-cell">
                    <strong>${escapeMenuHtml(item.name || "Unnamed Item")}</strong>
                    <span>Pure Veg</span>
                </div>

                <div class="row-price-cell">
                    ₹${Number(item.price || 0)}
                </div>

                <div class="row-variant-cell">
                    ${variants.length}
                </div>

                <div class="row-control-cell">
                    <button
                        type="button"
                        class="row-status-btn ${item.available !== false ? 'in-stock' : 'out-stock'}"
                        onclick="event.stopPropagation(); toggleAvailability('${item.id}', ${item.available !== false})"
                    >
                        ${item.available !== false ? '🟢 In Stock' : '🔴 Out Stock'}
                    </button>
                </div>

                <div class="row-control-cell">
                    <button
                        type="button"
                        class="row-status-btn ${item.visible !== false ? 'visible' : 'hidden'}"
                        onclick="event.stopPropagation(); toggleVisibility('${item.id}', ${item.visible !== false})"
                    >
                        ${item.visible !== false ? '👁 Visible' : '🙈 Hidden'}
                    </button>
                </div>

                <div class="row-time-cell">
                    <span class="row-time-label ${timeSlots.length ? 'scheduled' : ''}">
                        ${timeLabel}
                    </span>
                </div>

                <div class="row-tags-cell">
                    ${tagsHtml}
                </div>

                <div class="row-actions-cell">
                    <button
                        type="button"
                        class="row-icon-btn edit"
                        title="Edit Item"
                        onclick="event.stopPropagation(); openEditItem('${item.id}')"
                    >✏️</button>

                    <button
                        type="button"
                        class="row-icon-btn delete"
                        title="Delete Item"
                        onclick="event.stopPropagation(); deleteItem('${item.id}')"
                    >🗑️</button>
                </div>
            </div>

            <div class="menu-item-expanded-details">
                <div class="expanded-title-row">
                    <div>
                        <strong>${escapeMenuHtml(item.name || "Unnamed Item")}</strong>
                        <span>₹${Number(item.price || 0)}</span>
                    </div>

                    <button
                        type="button"
                        class="collapse-details-btn"
                        onclick="event.stopPropagation(); toggleMenuItemDetails('${item.id}')"
                    >✕ Collapse</button>
                </div>

                <div class="expanded-divider"></div>

                <div class="expanded-description-block">
                    <h4>Description</h4>
                    <p>${escapeMenuHtml(item.description || "No description")}</p>
                </div>

                <div class="expanded-details-grid">
                    <section>
                        <h4>Variants</h4>
                        ${variantsDetails}
                    </section>

                    <section>
                        <h4>Addons</h4>
                        ${addonsDetails}
                    </section>

                    <section>
                        <h4>Time Slot</h4>
                        ${timeDetails}
                    </section>
                </div>
            </div>
        `

        rowsContainer.appendChild(group)
    })

    if (sortableInstance) {
        sortableInstance.destroy()
    }

    sortableInstance =
        new Sortable(
            rowsContainer,
            {
                animation: 200,
                draggable: ".menu-item-group",
                handle: ".row-photo-cell, .row-item-name-cell",
                ghostClass: "sortable-ghost",
                delay: 100,
                delayOnTouchOnly: true,

                onEnd: async () => {

                    const rows =
                        rowsContainer.querySelectorAll(
                            ".menu-item-group"
                        )

                    const batch =
                        writeBatch(db)

                    rows.forEach((row, index) => {

                        batch.update(
                            doc(
                                db,
                                "restaurants",
                                restaurantId,
                                "menu",
                                row.dataset.id
                            ),
                            {
                                sortOrder: (index + 1) * 1000
                            }
                        )
                    })

                    await batch.commit()
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
        // Purane item ki selected photo reset
editItemImage.value = ""

editPreviewImage.src = ""

editPreviewImage.style.display =
    "none"

currentEditImage = ""

currentEditImagePath = ""

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

editItemImage.value = ""

editPreviewImage.src = ""

editPreviewImage.style.display =
    "none"

currentEditImage = ""

currentEditImagePath = ""

editingItemId = null

alert(
    "Item Updated 😎🔥"
)

    } catch(error) {

    console.error(
        "ITEM UPDATE FULL ERROR:",
        error 
    )

    alert(
        "Update Failed: " +
        (
            error.message ||
            "Unknown Error"
        )
    )
}
}

// 🔥 CLOSE EDIT MODAL

closeEditItemBtn.onclick =
() => {

    editItemImage.value = ""

    editPreviewImage.src = ""

    editPreviewImage.style.display =
        "none"

    currentEditImage = ""

    currentEditImagePath = ""

    editingItemId = null

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
        false,

    available:
        categoryAvailable.checked,

    visible:
        categoryVisible.checked,

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

    categoryAutoHide.checked = false

    categoryVisible.checked =
        category.visible !== false
}
// 🚀 CATEGORY SORTING

function initCategorySorting() {

    if (categorySortable) {
        categorySortable.destroy()
    }

    categorySortable = new Sortable(
        categoriesContainer,
        {
            animation: 200,
            ghostClass: "sortable-ghost",
            handle: ".category-tree-row",
            draggable: ".category-tree-group",
            delay: 100,
            delayOnTouchOnly: true,
            onEnd: async () => {
                const groups = document.querySelectorAll(".category-tree-group")
                const batch = writeBatch(db)

                groups.forEach((group, index) => {
                    batch.update(
                        doc(db, "restaurants", restaurantId, "categories", group.dataset.id),
                        { sortOrder: (index + 1) * 1000 }
                    )
                })

                await batch.commit()
            }
        }
    )
}

let subCategorySortables = []

function initSubCategorySorting() {

    subCategorySortables.forEach(instance => instance.destroy())
    subCategorySortables = []

    document.querySelectorAll(".tree-subcategory-list").forEach(list => {
        const sortable = new Sortable(list, {
            animation: 200,
            ghostClass: "sortable-ghost",
            draggable: ".subcategory-tree-row",
            handle: ".tree-sub-main",
            delay: 100,
            delayOnTouchOnly: true,
            onEnd: async () => {
                const rows = list.querySelectorAll(".subcategory-tree-row")
                const batch = writeBatch(db)

                rows.forEach((row, index) => {
                    batch.update(
                        doc(db, "restaurants", restaurantId, "subcategories", row.dataset.id),
                        { sortOrder: (index + 1) * 1000 }
                    )
                })

                await batch.commit()
            }
        })

        subCategorySortables.push(sortable)
    })
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

        // CATEGORY UPDATE
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

        // CATEGORY KI SUBCATEGORIES
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

        const subVisibilityMap =
            new Map()

        /*
        Category Show hone par manually Hidden
        Subcategory Hidden hi rahegi.
        */
        for (
            const subDoc
            of subSnap.docs
        ) {

            const subData =
                subDoc.data()

            const manualHidden =
                subData.manualHidden === true

            const finalSubVisible =
                newVisible
                    ? !manualHidden
                    : false

            subVisibilityMap.set(
                subDoc.id,
                finalSubVisible
            )

            batch.update(

                subDoc.ref,

                {
                    visible:
                        finalSubVisible,

                    updatedAt:
                        Date.now()
                }

            )

        }

        // CATEGORY KE SABHI ITEMS
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

        /*
        Item tabhi Visible hoga jab:

        Category Visible ho
        Subcategory Visible ho
        Item manually Hidden na ho
        */
        for (
            const menuDoc
            of menuSnap.docs
        ) {

            const data =
                menuDoc.data()

            const manualHidden =
                data.manualHidden === true

            const parentSubVisible =
                subVisibilityMap.get(
                    data.subCategoryId
                ) !== false

            const finalItemVisible =
                newVisible &&
                parentSubVisible &&
                !manualHidden

            batch.update(

                menuDoc.ref,

                {
                    visible:
                        finalItemVisible,

                    updatedAt:
                        Date.now()
                }

            )

        }

        await batch.commit()

    }

    catch (error) {

        console.error(
            "CATEGORY VISIBILITY ERROR:",
            error
        )

        alert(
            "Category Toggle Failed 😎"
        )

    }

}
window.toggleCategoryStock =
async (
    categoryId,
    currentValue
) => {

    try {

        const newStock =
            !currentValue

        // CATEGORY UPDATE
        await updateDoc(

            doc(
                db,
                "restaurants",
                restaurantId,
                "categories",
                categoryId
            ),

            {
                stockEnabled:
                    newStock,

                available:
                    newStock,

                updatedAt:
                    Date.now()
            }

        )

        // CATEGORY KI SUBCATEGORIES
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

        const subStockMap =
            new Map()

        /*
        Category In Stock hone par manually
        Out of Stock Subcategory Out of Stock hi rahegi.
        */
        for (
            const subDoc
            of subSnap.docs
        ) {

            const subData =
                subDoc.data()

            const manualOutOfStock =
                subData.manualOutOfStock === true

            const finalSubStock =
                newStock
                    ? !manualOutOfStock
                    : false

            subStockMap.set(
                subDoc.id,
                finalSubStock
            )

            batch.update(

                subDoc.ref,

                {
                    available:
                        finalSubStock,

                    stockEnabled:
                        finalSubStock,

                    updatedAt:
                        Date.now()
                }

            )

        }

        // CATEGORY KE SABHI ITEMS
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

        /*
        Item tabhi In Stock hoga jab:

        Category In Stock ho
        Subcategory In Stock ho
        Item manually Out of Stock na ho
        */
        for (
            const menuDoc
            of menuSnap.docs
        ) {

            const data =
                menuDoc.data()

            const manualOutOfStock =
                data.manualOutOfStock === true

            const parentSubStock =
                subStockMap.get(
                    data.subCategoryId
                ) !== false

            const finalItemStock =
                newStock &&
                parentSubStock &&
                !manualOutOfStock

            batch.update(

                menuDoc.ref,

                {
                    available:
                        finalItemStock,

                    stockEnabled:
                        finalItemStock,

                    updatedAt:
                        Date.now()
                }

            )

        }

        await batch.commit()

    }

    catch (error) {

        console.error(
            "CATEGORY STOCK ERROR:",
            error
        )

        alert(
            "Category Stock Update Failed 😎"
        )

    }

}
window.toggleSubCategoryVisibility =
async (
    subCategoryId,
    currentValue
) => {

    try {

        const newVisible =
            !currentValue

        const subCategoryRef =
            doc(
                db,
                "restaurants",
                restaurantId,
                "subcategories",
                subCategoryId
            )

        /*
        Admin ne Subcategory ko manually Hide kiya hai,
        isliye manualHidden field me setting save hogi.
        */
        await updateDoc(

            subCategoryRef,

            {
                visible:
                    newVisible,

                manualHidden:
                    !newVisible,

                updatedAt:
                    Date.now()
            }

        )

        /*
        Subcategory ko Show karne par
        parent Category bhi Show hogi.
        */
        if (newVisible) {

            const subDocSnap =
                await getDoc(
                    subCategoryRef
                )

            const categoryId =
                subDocSnap
                    .data()
                    ?.categoryId

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
                        visible:
                            true,

                        updatedAt:
                            Date.now()
                    }

                )

            }

        }

        // SUBCATEGORY KE ITEMS
        const menuQuery =
            query(

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

            )

        const menuSnap =
            await getDocs(
                menuQuery
            )

        const batch =
            writeBatch(db)

        /*
        Subcategory Show hone par manually
        Hidden items Hidden hi rahenge.
        */
        for (
            const menuDoc
            of menuSnap.docs
        ) {

            const data =
                menuDoc.data()

            const manualHidden =
                data.manualHidden === true

            const finalItemVisible =
                newVisible &&
                !manualHidden

            batch.update(

                menuDoc.ref,

                {
                    visible:
                        finalItemVisible,

                    updatedAt:
                        Date.now()
                }

            )

        }

        await batch.commit()

    }

    catch (error) {

        console.error(
            "SUBCATEGORY VISIBILITY ERROR:",
            error
        )

        alert(
            "SubCategory Toggle Failed 😎"
        )

    }

}
window.toggleSubCategoryStock =
async (
    subCategoryId,
    currentValue
) => {

    try {

        const newStock =
            !currentValue

        const subCategoryRef =
            doc(
                db,
                "restaurants",
                restaurantId,
                "subcategories",
                subCategoryId
            )

        /*
        Admin ne Subcategory ko manually Out of Stock kiya,
        to manualOutOfStock field us setting ko yaad rakhegi.
        */
        await updateDoc(

            subCategoryRef,

            {
                stockEnabled:
                    newStock,

                available:
                    newStock,

                manualOutOfStock:
                    !newStock,

                updatedAt:
                    Date.now()
            }

        )

        /*
        Subcategory ko In Stock karne par
        parent Category bhi In Stock hogi.
        */
        if (newStock) {

            const subDocSnap =
                await getDoc(
                    subCategoryRef
                )

            const categoryId =
                subDocSnap
                    .data()
                    ?.categoryId

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
                        stockEnabled:
                            true,

                        available:
                            true,

                        updatedAt:
                            Date.now()
                    }

                )

            }

        }

        // SUBCATEGORY KE ITEMS
        const menuQuery =
            query(

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

            )

        const menuSnap =
            await getDocs(
                menuQuery
            )

        const batch =
            writeBatch(db)

        /*
        Subcategory In Stock hone par manually
        Out of Stock items Out of Stock hi rahenge.
        */
        for (
            const menuDoc
            of menuSnap.docs
        ) {

            const data =
                menuDoc.data()

            const manualOutOfStock =
                data.manualOutOfStock === true

            const finalItemStock =
                newStock &&
                !manualOutOfStock

            batch.update(

                menuDoc.ref,

                {
                    available:
                        finalItemStock,

                    stockEnabled:
                        finalItemStock,

                    updatedAt:
                        Date.now()
                }

            )

        }

        await batch.commit()

    }

    catch (error) {

        console.error(
            "SUBCATEGORY STOCK ERROR:",
            error
        )

        alert(
            "Sub Category Stock Update Failed"
        )

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

    subCategoryAutoHide.checked = false

    subCategoryVisible.checked =
        sub.visible !== false
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
                    false,

                available:
                    subCategoryAvailable.checked,

                visible:
                    subCategoryVisible.checked,

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
async function uploadMenuRows(
    rows,
    onProgress = null
) {

    const existingIndex =
        await loadExistingMenuIndex()

    const categoryByName =
        new Map()

    let maximumCategorySortOrder = 0

    existingIndex
        .categorySnapshot
        .forEach(
            (categoryDocument) => {

                const category =
                    categoryDocument.data()

                const categoryName =
                    normalizeMenuText(
                        category.name
                    )

                const sortOrder =
                    Number(
                        category.sortOrder ||
                        0
                    )

                maximumCategorySortOrder =
                    Math.max(
                        maximumCategorySortOrder,
                        sortOrder
                    )

                if (categoryName) {

                    categoryByName.set(
                        categoryName
                            .toLowerCase(),
                        {
                            id:
                                categoryDocument.id,
                            name:
                                categoryName,
                            sortOrder
                        }
                    )
                }
            }
        )

    const subCategoryByName =
        new Map()

    const maximumSubSortOrder =
        new Map()

    existingIndex
        .subCategorySnapshot
        .forEach(
            (subCategoryDocument) => {

                const subCategory =
                    subCategoryDocument.data()

                const subCategoryName =
                    normalizeMenuText(
                        subCategory.name
                    )

                const sortOrder =
                    Number(
                        subCategory.sortOrder ||
                        0
                    )

                const categoryId =
                    subCategory.categoryId

                maximumSubSortOrder.set(
                    categoryId,
                    Math.max(
                        maximumSubSortOrder.get(
                            categoryId
                        ) || 0,
                        sortOrder
                    )
                )

                if (
                    categoryId &&
                    subCategoryName
                ) {

                    subCategoryByName.set(
                        `${
                            categoryId
                        }|||${
                            subCategoryName
                                .toLowerCase()
                        }`,
                        {
                            id:
                                subCategoryDocument.id,
                            name:
                                subCategoryName,
                            categoryId,
                            sortOrder
                        }
                    )
                }
            }
        )

    const maximumItemSortOrder =
        new Map()

    existingIndex
        .menuSnapshot
        .forEach(
            (menuDocument) => {

                const item =
                    menuDocument.data()

                const subCategoryId =
                    item.subCategoryId

                const sortOrder =
                    Number(
                        item.sortOrder ||
                        0
                    )

                if (subCategoryId) {

                    maximumItemSortOrder.set(
                        subCategoryId,
                        Math.max(
                            maximumItemSortOrder.get(
                                subCategoryId
                            ) || 0,
                            sortOrder
                        )
                    )
                }
            }
        )

    const uploadedItemKeys =
        new Set(
            existingIndex
                .existingItemKeys
                .keys()
        )

    const skippedDuplicates = []

    let uploadedCount = 0
    let completedCount = 0

    const reportProgress = () => {

        completedCount += 1

        if (
            typeof onProgress ===
            "function"
        ) {

            onProgress(
                completedCount,
                rows.length
            )
        }
    }

    for (const row of rows) {

        const categoryName =
            normalizeMenuText(
                row.Category
            )

        const subCategoryName =
            normalizeMenuText(
                row["Sub Category"]
            )

        const itemName =
            normalizeMenuText(
                row["Item Name"]
            )

        if (
            !categoryName ||
            !subCategoryName ||
            !itemName
        ) {

            reportProgress()

            continue
        }

        const duplicateKey =
            getMenuDuplicateKey(
                categoryName,
                subCategoryName,
                itemName
            )

        if (
            uploadedItemKeys.has(
                duplicateKey
            )
        ) {

            skippedDuplicates.push({
                categoryName,
                subCategoryName,
                itemName
            })

            reportProgress()

            continue
        }

        // CATEGORY

        const categoryKey =
            categoryName.toLowerCase()

        let category =
            categoryByName.get(
                categoryKey
            )

        if (!category) {

            maximumCategorySortOrder +=
                1000

            const categoryData = {
                name:
                    categoryName,
                visible:
                    true,
                available:
                    true,
                sortOrder:
                    maximumCategorySortOrder,
                createdAt:
                    Date.now()
            }

            const categoryReference =
                await addDoc(
                    collection(
                        db,
                        "restaurants",
                        restaurantId,
                        "categories"
                    ),
                    categoryData
                )

            category = {
                id:
                    categoryReference.id,
                ...categoryData
            }

            categoryByName.set(
                categoryKey,
                category
            )

            categories.push(
                category
            )
        }

        const categoryId =
            category.id

        // SUB CATEGORY

        const subCategoryKey =
            `${
                categoryId
            }|||${
                subCategoryName
                    .toLowerCase()
            }`

        let subCategory =
            subCategoryByName.get(
                subCategoryKey
            )

        if (!subCategory) {

            const nextSubSortOrder =
                (
                    maximumSubSortOrder.get(
                        categoryId
                    ) || 0
                ) + 1000

            maximumSubSortOrder.set(
                categoryId,
                nextSubSortOrder
            )

            const subCategoryData = {
                name:
                    subCategoryName,
                categoryId,
                visible:
                    true,
                available:
                    true,
                sortOrder:
                    nextSubSortOrder,
                createdAt:
                    Date.now()
            }

            const subCategoryReference =
                await addDoc(
                    collection(
                        db,
                        "restaurants",
                        restaurantId,
                        "subcategories"
                    ),
                    subCategoryData
                )

            subCategory = {
                id:
                    subCategoryReference.id,
                ...subCategoryData
            }

            subCategoryByName.set(
                subCategoryKey,
                subCategory
            )

            subCategories.push(
                subCategory
            )
        }

        const subCategoryId =
            subCategory.id

        // VARIANTS

        const variants = []

        if (row.Small) {

            variants.push({
                name:
                    "Small",
                price:
                    Number(row.Small)
            })
        }

        if (row.Medium) {

            variants.push({
                name:
                    "Medium",
                price:
                    Number(row.Medium)
            })
        }

        if (row.Large) {

            variants.push({
                name:
                    "Large",
                price:
                    Number(row.Large)
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

        const nextItemSortOrder =
            (
                maximumItemSortOrder.get(
                    subCategoryId
                ) || 0
            ) + 1000

        maximumItemSortOrder.set(
            subCategoryId,
            nextItemSortOrder
        )

        const menuItemData = {
            name:
                itemName,
            description:
                row.Description || "",
            price:
                finalPrice,
            categoryId,
            categoryName:
                category.name,
            subCategoryId,
            subCategoryName:
                subCategory.name,
            veg:
                true,
            variants,
            available:
                row.Available !== false,
            visible:
                row.Visible !== false,
            image:
                "",
            bestseller:
                false,
            recommended:
                false,
            hidden:
                false,
            createdAt:
                Date.now(),
            sortOrder:
                nextItemSortOrder
        }

        const menuItemReference =
            await addDoc(
                collection(
                    db,
                    "restaurants",
                    restaurantId,
                    "menu"
                ),
                menuItemData
            )

        menuItems.push({
            id:
                menuItemReference.id,
            ...menuItemData
        })

        uploadedItemKeys.add(
            duplicateKey
        )

        uploadedCount += 1

        reportProgress()
    }

    return {
        uploadedCount,
        skippedDuplicates
    }
}