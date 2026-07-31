import { db, auth } from "./firebase.js";
import {
    collection,
    doc,
    onSnapshot,
    addDoc,
    runTransaction,
    serverTimestamp,
    deleteField
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

/*
 * VeggieGo Finance & Settlement Dashboard
 *
 * Commission rule:
 *   commissionBase = Item Total + Packaging
 *   commission = commissionBase × configured commission %
 *   restaurantBasePayout = commissionBase − commission
 *
 * Commission source (no hard-coded percentage):
 *   1. Order snapshot
 *   2. Restaurant configuration
 *   3. App setting
 *   4. Missing -> settlement is blocked
 *
 * GST is intentionally not calculated or displayed yet.
 */

const COLLECTIONS = {
    orders: "orders",
    restaurants: "restaurants",
    riders: "riders",
    adjustments: "financialAdjustments",
    settlements: "settlements",
    settings: "settings"
};

const FINAL_DELIVERED = new Set(["DELIVERED", "COMPLETED"]);
const FINAL_CANCELLED = new Set(["CANCELLED", "CANCELED"]);
const FINAL_SETTLEMENT_STATUSES = new Set(["FINALIZED", "PAID"]);
const PAGE_SIZES = new Set([25, 50, 100, 200]);

const state = {
    user: null,
    orders: [],
    restaurants: [],
    riders: [],
    adjustments: [],
    settlements: [],
    settings: [],
    collectionAccess: {
        adjustments: true,
        settlements: true,
        settings: true
    },
    coreLoaded: new Set(),
    filters: {
        preset: "ALL",
        from: null,
        to: null,
        restaurantId: "",
        riderId: "",
        payment: ""
    },
    orderSearch: "",
    orderPage: 1,
    orderPageSize: 50,
    mainTab: "RESTAURANT",
    settlementSubTab: "DELIVERED",
    settlementEntries: [],
    selectedSettlementKeys: new Set(),
    settlementLoaded: false,
    editingDraftId: ""
};

const $ = (id) => document.getElementById(id);
const all = (selector, root = document) => Array.from(root.querySelectorAll(selector));

function numberValue(value) {
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    if (value === null || value === undefined || value === "") return 0;
    const parsed = Number(String(value).replace(/[₹,%\s,]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
}

function firstValue(source, keys, fallback = undefined) {
    for (const key of keys) {
        if (source && source[key] !== undefined && source[key] !== null && source[key] !== "") {
            return source[key];
        }
    }
    return fallback;
}

function normalizedText(value) {
    return String(value ?? "").trim().toUpperCase();
}

function safeText(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function money(value, signed = false) {
    const amount = numberValue(value);
    const absolute = Math.abs(amount).toLocaleString("en-IN", {
        minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
        maximumFractionDigits: 2
    });
    if (signed && amount > 0) return `+₹${absolute}`;
    if (amount < 0) return `−₹${absolute}`;
    return `₹${absolute}`;
}

function roundMoney(value) {
    return Math.round((numberValue(value) + Number.EPSILON) * 100) / 100;
}

function toDate(value) {
    if (!value) return null;
    if (typeof value.toDate === "function") return value.toDate();
    if (typeof value.seconds === "number") return new Date(value.seconds * 1000);
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
    if (typeof value === "number") {
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? null : date;
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function dateOfOrder(order) {
    return toDate(firstValue(order, [
        "timestamp", "createdAt", "orderDate", "date", "updatedAt"
    ]));
}

function formatDate(value, withTime = false) {
    const date = toDate(value);
    if (!date) return "—";
    return new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {})
    }).format(date);
}

function dateInputValue(date = new Date()) {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
}

function startOfDay(date) {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
}

function endOfDay(date) {
    const result = new Date(date);
    result.setHours(23, 59, 59, 999);
    return result;
}

function orderStatus(order) {
    return normalizedText(firstValue(order, ["status", "orderStatus", "deliveryStatus"], ""));
}

function isDelivered(order) {
    return FINAL_DELIVERED.has(orderStatus(order));
}

function isCancelled(order) {
    return FINAL_CANCELLED.has(orderStatus(order));
}

function isFinalOrder(order) {
    return isDelivered(order) || isCancelled(order);
}

function displayOrderId(order) {
    return String(firstValue(order, ["orderId", "orderNumber", "displayId"], order.id));
}

function rawRestaurantId(order) {
    return String(firstValue(order, [
        "restaurantId", "restaurantID", "restaurant_id", "vendorId", "storeId"
    ], ""));
}

function rawRiderId(order) {
    return String(firstValue(order, [
        "riderId", "riderID", "rider_id", "deliveryPartnerId", "assignedRiderId"
    ], ""));
}

function entityAliases(entity, type) {
    if (!entity) return [];
    const keys = type === "RESTAURANT"
        ? ["id", "restaurantId", "restaurantID", "uid"]
        : ["id", "riderId", "riderID", "uid"];
    return keys.map((key) => String(entity[key] ?? "")).filter(Boolean);
}

function findRestaurant(orderOrId) {
    const raw = typeof orderOrId === "object" ? rawRestaurantId(orderOrId) : String(orderOrId ?? "");
    return state.restaurants.find((restaurant) => entityAliases(restaurant, "RESTAURANT").includes(raw)) || null;
}

function findRider(orderOrId) {
    const raw = typeof orderOrId === "object" ? rawRiderId(orderOrId) : String(orderOrId ?? "");
    return state.riders.find((rider) => entityAliases(rider, "RIDER").includes(raw)) || null;
}

function restaurantName(order) {
    const restaurant = findRestaurant(order);
    return String(firstValue(order, ["restaurantName", "storeName"],
        firstValue(restaurant, ["name", "restaurantName", "businessName"], "Unknown restaurant")));
}

function riderName(order) {
    const rider = findRider(order);
    return String(firstValue(order, ["riderName", "deliveryPartnerName"],
        firstValue(rider, ["name", "riderName", "fullName"], rawRiderId(order) ? "Unknown rider" : "Unassigned")));
}

function canonicalBeneficiary(order, type) {
    const entity = type === "RESTAURANT" ? findRestaurant(order) : findRider(order);
    const rawId = type === "RESTAURANT" ? rawRestaurantId(order) : rawRiderId(order);
    return {
        entity,
        id: entity?.id || rawId,
        name: type === "RESTAURANT" ? restaurantName(order) : riderName(order)
    };
}

function itemTotal(order) {
    return numberValue(firstValue(order, ["itemTotal", "subtotal", "itemsTotal", "foodTotal"], 0));
}

function packagingAmount(order) {
    return numberValue(firstValue(order, ["packagingFee", "packagingAmount", "packaging", "packingCharge"], 0));
}

function deliveryAmount(order) {
    return numberValue(firstValue(order, ["deliveryFee", "deliveryCharge", "deliveryCharges"], 0));
}

function platformAmount(order) {
    return numberValue(firstValue(order, ["platformFee", "platformCharge", "handlingFee"], 0));
}

function tipAmount(order) {
    return numberValue(firstValue(order, ["tip", "tipAmount", "riderTip"], 0));
}

function surgeAmount(order) {
    return numberValue(firstValue(order, ["surgeAmount", "surgeFee", "surgeCharge"], 0));
}

function riderBaseAmount(order) {
    return numberValue(firstValue(order, [
        "riderPay", "riderEarning", "riderEarnings", "riderPayout",
        "deliveryPartnerPay", "riderBasePay"
    ], 0));
}

function riderOrderPayout(order) {
    const baseAlreadyIncludesTip = Boolean(firstValue(order, ["riderPayIncludesTip", "riderPayoutIncludesTip"], false));
    const baseAlreadyIncludesSurge = Boolean(firstValue(order, ["riderPayIncludesSurge", "riderPayoutIncludesSurge"], false));
    return roundMoney(
        riderBaseAmount(order)
        + (baseAlreadyIncludesSurge ? 0 : surgeAmount(order))
        + (baseAlreadyIncludesTip ? 0 : tipAmount(order))
    );
}

function companyDiscount(order) {
    return numberValue(firstValue(order, [
        "veggiegoDiscount", "companyDiscount", "platformDiscount",
        "adminDiscountAmount", "companyDiscountAmount"
    ], 0));
}

function paymentMethod(order) {
    const method = normalizedText(firstValue(order, [
        "paymentMethod", "paymentMode", "paymentType", "payment"
    ], ""));
    if (method.includes("COD") || method.includes("CASH")) return "COD";
    if (method) return "ONLINE";
    return "UNKNOWN";
}

function configuredPercent(source, keys) {
    for (const key of keys) {
        const raw = source?.[key];
        if (raw === undefined || raw === null || raw === "") continue;
        const value = numberValue(raw);
        if (value >= 0 && value <= 100) return value;
    }
    return null;
}

function commissionInfo(order, restaurantOverride = null) {
    const orderRate = configuredPercent(order, [
        "commissionPercent", "restaurantCommissionPercent",
        "commissionRate", "commissionPercentage"
    ]);
    if (orderRate !== null) return { percent: orderRate, source: "ORDER_SNAPSHOT" };

    const restaurant = restaurantOverride || findRestaurant(order);
    const restaurantRate = configuredPercent(restaurant, [
        "commissionPercent", "commission", "commissionRate",
        "commissionPercentage", "platformCommissionPercent"
    ]);
    if (restaurantRate !== null) return { percent: restaurantRate, source: "RESTAURANT" };

    for (const setting of state.settings) {
        const settingRate = configuredPercent(setting, [
            "defaultCommissionPercent", "restaurantCommissionPercent",
            "commissionPercent", "defaultRestaurantCommission"
        ]);
        if (settingRate !== null) return { percent: settingRate, source: "APP_SETTING" };
    }
    return { percent: null, source: "MISSING" };
}

function configuredAmount(source, keys) {
    for (const key of keys) {
        const raw = source?.[key];
        if (raw === undefined || raw === null || raw === "") continue;
        const value = Number(String(raw).replace(/[₹,\s]/g, ""));
        if (Number.isFinite(value)) return roundMoney(value);
    }
    return null;
}

function restaurantCalculation(order, restaurantOverride = null) {
    const commissionBase = roundMoney(itemTotal(order) + packagingAmount(order));

    const snapshotPercent = configuredPercent(order, [
        "commissionPercent", "restaurantCommissionPercent",
        "commissionRate", "commissionPercentage"
    ]);

    const snapshotCommission = configuredAmount(order, [
        "commissionAmount", "restaurantCommissionAmount",
        "platformCommissionAmount"
    ]);

    const snapshotPayout = configuredAmount(order, [
        "restaurantPayout", "restaurantPayable",
        "restaurantNetPayout", "restaurantEarning"
    ]);

    if (snapshotCommission !== null || snapshotPayout !== null) {
        const commissionAmount = snapshotCommission !== null
            ? snapshotCommission
            : roundMoney(commissionBase - snapshotPayout);

        const basePayout = snapshotPayout !== null
            ? snapshotPayout
            : roundMoney(commissionBase - snapshotCommission);

        return {
            commissionBase,
            commissionPercent: snapshotPercent,
            commissionAmount,
            basePayout,
            source: "ORDER_SNAPSHOT"
        };
    }

    const commission = commissionInfo(order, restaurantOverride);

    if (commission.percent === null) {
        return {
            commissionBase,
            commissionPercent: null,
            commissionAmount: null,
            basePayout: null,
            source: commission.source
        };
    }

    const commissionAmount = roundMoney(
        commissionBase * commission.percent / 100
    );

    return {
        commissionBase,
        commissionPercent: commission.percent,
        commissionAmount,
        basePayout: roundMoney(commissionBase - commissionAmount),
        source: commission.source
    };
}

function actualGrandTotal(order) {
    const raw = firstValue(order, [
        "grandTotal", "totalAmount", "orderTotal", "finalTotal", "payableAmount"
    ]);
    return raw === undefined ? null : numberValue(raw);
}

function calculatedCustomerTotal(order) {
    const generalDiscount = numberValue(firstValue(order, [
        "discount", "discountAmount", "couponDiscount", "totalDiscount"
    ], 0));
    return roundMoney(
        itemTotal(order)
        + packagingAmount(order)
        + deliveryAmount(order)
        + platformAmount(order)
        + tipAmount(order)
        - generalDiscount
    );
}

function isAmountMismatch(order) {
    const actual = actualGrandTotal(order);
    if (actual === null) return false;
    return Math.abs(actual - calculatedCustomerTotal(order)) > 1;
}

function adjustmentMatchesOrder(adjustment, order) {
    const candidates = new Set([
        String(order.id),
        displayOrderId(order),
        String(firstValue(order, ["orderId", "orderNumber"], ""))
    ]);
    return candidates.has(String(firstValue(adjustment, ["orderDocId", "orderId"], "")))
        || candidates.has(String(adjustment.orderId ?? ""));
}

function orderAdjustments(order, type = null) {
    return state.adjustments
        .filter((adjustment) => adjustmentMatchesOrder(adjustment, order))
        .filter((adjustment) => !type || normalizedText(adjustment.beneficiaryType) === type)
        .sort((a, b) => (toDate(b.createdAt)?.getTime() || 0) - (toDate(a.createdAt)?.getTime() || 0));
}

function adjustmentTotals(adjustments) {
    return adjustments.reduce((totals, adjustment) => {
        const amount = numberValue(adjustment.amount);
        if (normalizedText(adjustment.direction) === "CREDIT") totals.credits += amount;
        else if (normalizedText(adjustment.direction) === "DEBIT") totals.debits += amount;
        return totals;
    }, { credits: 0, debits: 0 });
}

function pendingAdjustments(order, type) {
    return orderAdjustments(order, type).filter((adjustment) =>
        normalizedText(adjustment.settlementStatus || "PENDING") === "PENDING"
    );
}

function settlementField(type, suffix) {
    const prefix = type === "RESTAURANT" ? "restaurant" : "rider";
    return `${prefix}${suffix}`;
}

function baseAlreadySettled(order, type) {
    const status = normalizedText(order[settlementField(type, "SettlementStatus")]);
    const id = order[settlementField(type, "SettlementId")];
    return FINAL_SETTLEMENT_STATUSES.has(status) || Boolean(id);
}

function draftSettlementId(order, type) {
    return String(order[settlementField(type, "DraftSettlementId")] || "");
}

function reservedByAnotherDraft(order, type) {
    const draftId = draftSettlementId(order, type);
    return Boolean(draftId && draftId !== state.editingDraftId);
}

function resetDraftEditing() {
    state.editingDraftId = "";
    const saveButton = $("saveDraftBtn");
    const finalizeButton = $("finalizeSettlementBtn");
    if (saveButton) saveButton.textContent = "Save draft";
    if (finalizeButton) finalizeButton.textContent = "Finalize settlement";
    $("draftEditNotice")?.classList.add("hidden");
    setText("draftEditNoticeText", "");
}

function findOrder(queryValue) {
    const needle = String(queryValue ?? "").trim().toLowerCase();
    if (!needle) return null;
    return state.orders.find((order) =>
        String(order.id).toLowerCase() === needle
        || displayOrderId(order).toLowerCase() === needle
    ) || null;
}

function filtersForPreset(preset, customFrom = "", customTo = "") {
    const now = new Date();
    let from = null;
    let to = null;
    if (preset === "TODAY") from = to = now;
    if (preset === "YESTERDAY") {
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        from = to = yesterday;
    }
    if (preset === "LAST_7") {
        from = new Date(now);
        from.setDate(now.getDate() - 6);
        to = now;
    }
    if (preset === "THIS_MONTH") {
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        to = now;
    }
    if (preset === "LAST_MONTH") {
        from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        to = new Date(now.getFullYear(), now.getMonth(), 0);
    }
    if (preset === "CUSTOM") {
        from = customFrom ? new Date(`${customFrom}T00:00:00`) : null;
        to = customTo ? new Date(`${customTo}T23:59:59.999`) : null;
    }
    return {
        from: from ? startOfDay(from) : null,
        to: to ? endOfDay(to) : null
    };
}

function inDateRange(order, from = state.filters.from, to = state.filters.to) {
    if (!from && !to) return true;
    const date = dateOfOrder(order);
    if (!date) return false;
    if (from && date < from) return false;
    if (to && date > to) return false;
    return true;
}

function matchesEntityFilter(order) {
    if (state.filters.restaurantId) {
        const restaurant = findRestaurant(order);
        if ((restaurant?.id || rawRestaurantId(order)) !== state.filters.restaurantId) return false;
    }
    if (state.filters.riderId) {
        const rider = findRider(order);
        if ((rider?.id || rawRiderId(order)) !== state.filters.riderId) return false;
    }
    if (state.filters.payment && paymentMethod(order) !== state.filters.payment) return false;
    return true;
}

function filteredOrders() {
    return state.orders.filter(inDateRange).filter(matchesEntityFilter);
}

function emptyRow(colspan, text) {
    return `<tr class="empty-row"><td colspan="${colspan}">${safeText(text)}</td></tr>`;
}

function statusBadge(status) {
    const normalized = normalizedText(status);
    const className = normalized === "PAID" || normalized === "DELIVERED" || normalized === "COMPLETED"
        ? "badge-success"
        : normalized === "FINALIZED" || normalized === "READY"
            ? "badge-info"
            : normalized === "CANCELLED" || normalized === "CANCELED" || normalized === "MISSING"
                ? "badge-danger"
                : normalized === "DRAFT" || normalized === "PENDING"
                    ? "badge-warning"
                    : "badge-neutral";
    return `<span class="badge ${className}">${safeText(normalized || "UNKNOWN")}</span>`;
}

function setText(id, value) {
    const element = $(id);
    if (element) element.textContent = value;
}

function toast(message, type = "info", duration = 4200) {
    const container = $("toastContainer");
    if (!container) return;
    const item = document.createElement("div");
    item.className = `toast ${type}`;
    item.textContent = message;
    container.appendChild(item);
    window.setTimeout(() => item.remove(), duration);
}

function showLoader(show) {
    $("pageLoader")?.classList.toggle("hidden", !show);
}

function openModal(id) {
    $(id)?.classList.remove("hidden");
    document.body.classList.add("modal-open");
}

function closeModal(id) {
    $(id)?.classList.add("hidden");
    if (!document.querySelector(".modal:not(.hidden)")) document.body.classList.remove("modal-open");
}

function populateEntitySelects() {
    const currentRestaurant = $("restaurantFilter")?.value || state.filters.restaurantId;
    const currentRider = $("riderFilter")?.value || state.filters.riderId;
    const restaurants = [...state.restaurants].sort((a, b) =>
        String(firstValue(a, ["name", "restaurantName"], "")).localeCompare(String(firstValue(b, ["name", "restaurantName"], "")))
    );
    const riders = [...state.riders].sort((a, b) =>
        String(firstValue(a, ["name", "riderName"], "")).localeCompare(String(firstValue(b, ["name", "riderName"], "")))
    );

    $("restaurantFilter").innerHTML = `<option value="">All restaurants</option>${restaurants.map((restaurant) =>
        `<option value="${safeText(restaurant.id)}">${safeText(firstValue(restaurant, ["name", "restaurantName", "businessName"], restaurant.id))}</option>`
    ).join("")}`;
    $("riderFilter").innerHTML = `<option value="">All riders</option>${riders.map((rider) =>
        `<option value="${safeText(rider.id)}">${safeText(firstValue(rider, ["name", "riderName", "fullName"], rider.id))}</option>`
    ).join("")}`;
    $("restaurantFilter").value = currentRestaurant;
    $("riderFilter").value = currentRider;
    populateSettlementBeneficiary();
}

function populateSettlementBeneficiary() {
    const select = $("settlementBeneficiary");
    if (!select) return;
    const previous = select.value;
    const isRestaurant = state.mainTab === "RESTAURANT";
    const list = isRestaurant ? state.restaurants : state.riders;
    const nameKeys = isRestaurant
        ? ["name", "restaurantName", "businessName"]
        : ["name", "riderName", "fullName"];
    select.innerHTML = `<option value="">Select ${isRestaurant ? "restaurant" : "rider"}</option>${[...list]
        .sort((a, b) => String(firstValue(a, nameKeys, "")).localeCompare(String(firstValue(b, nameKeys, ""))))
        .map((item) => `<option value="${safeText(item.id)}">${safeText(firstValue(item, nameKeys, item.id))}</option>`)
        .join("")}`;
    if (list.some((item) => item.id === previous)) select.value = previous;
    setText("beneficiaryLabel", isRestaurant ? "Restaurant" : "Rider");
    setText("settlementBaseLabel", isRestaurant ? "Restaurant base payout" : "Rider order pay");
    setText("settlementComponentColumn", isRestaurant ? "Item + Packaging" : "Base + Surge");
    setText("settlementDeductionColumn", isRestaurant ? "Commission" : "Tip");
    setText("basePayoutColumn", isRestaurant ? "Base payout" : "Order pay");
}

function renderHealth() {
    const orders = filteredOrders();
    const delivered = orders.filter(isDelivered);
    const missingCommission = delivered.filter((order) => commissionInfo(order).percent === null);
    const missingRider = delivered.filter((order) => !findRider(order));
    const mismatches = orders.filter(isFinalOrder).filter(isAmountMismatch);
    const pendingSettlements = orders.filter(isFinalOrder).filter((order) => {
        if (isDelivered(order) && (!baseAlreadySettled(order, "RESTAURANT") || !baseAlreadySettled(order, "RIDER"))) return true;
        return pendingAdjustments(order, "RESTAURANT").length > 0 || pendingAdjustments(order, "RIDER").length > 0;
    });

    setText("missingCommissionCount", String(missingCommission.length));
    setText("missingRiderCount", String(missingRider.length));
    setText("amountMismatchCount", String(mismatches.length));
    setText("pendingSettlementCount", String(pendingSettlements.length));
    const totalIssues = missingCommission.length + missingRider.length + mismatches.length;
    const badge = $("healthStatus");
    badge.textContent = totalIssues ? `${totalIssues} issue${totalIssues === 1 ? "" : "s"}` : "All clear";
    badge.className = `badge ${totalIssues ? "badge-warning" : "badge-success"}`;
}

function allAdjustmentsForOrders(orders, type) {
    const orderIds = new Set(orders.flatMap((order) => [String(order.id), displayOrderId(order)]));
    return state.adjustments.filter((adjustment) => {
        if (normalizedText(adjustment.beneficiaryType) !== type) return false;
        return orderIds.has(String(adjustment.orderDocId || "")) || orderIds.has(String(adjustment.orderId || ""));
    });
}

function renderFinancialSummary() {
    const orders = filteredOrders();
    const delivered = orders.filter(isDelivered);
    const finalOrders = orders.filter(isFinalOrder);
    const restaurantAdjustments = allAdjustmentsForOrders(finalOrders, "RESTAURANT");
    const riderAdjustments = allAdjustmentsForOrders(finalOrders, "RIDER");
    const restaurantAdjustmentTotal = adjustmentTotals(restaurantAdjustments);
    const riderAdjustmentTotal = adjustmentTotals(riderAdjustments);

    let grossSales = 0;
    let commission = 0;
    let restaurantBase = 0;
    let deliveryFees = 0;
    let platformFees = 0;
    let riderBase = 0;
    let companyDiscounts = 0;

    delivered.forEach((order) => {
        const restaurant = restaurantCalculation(order);
        grossSales += restaurant.commissionBase;
        commission += restaurant.commissionAmount || 0;
        restaurantBase += restaurant.basePayout || 0;
        deliveryFees += deliveryAmount(order);
        platformFees += platformAmount(order);
        riderBase += riderOrderPayout(order);
        companyDiscounts += companyDiscount(order);
    });

    const restaurantPayable = restaurantBase + restaurantAdjustmentTotal.credits - restaurantAdjustmentTotal.debits;
    const riderPayable = riderBase + riderAdjustmentTotal.credits - riderAdjustmentTotal.debits;
    const companyEarning = commission + deliveryFees + platformFees - companyDiscounts - riderBase;

    setText("summaryDeliveredOrders", String(delivered.length));
    setText("summaryGrossSales", money(grossSales));
    setText("summaryCommission", money(commission));
    setText("summaryRestaurantPayable", money(restaurantPayable));
    setText("summaryDeliveryFees", money(deliveryFees));
    setText("summaryPlatformFees", money(platformFees));
    setText("summaryRiderPayable", money(riderPayable));
    setText("summaryCompanyEarning", money(companyEarning));
}

function renderPaymentSummary() {
    const delivered = filteredOrders().filter(isDelivered);
    const cod = delivered.filter((order) => paymentMethod(order) === "COD");
    const online = delivered.filter((order) => paymentMethod(order) === "ONLINE");
    const totalOf = (orders) => orders.reduce((sum, order) =>
        sum + (actualGrandTotal(order) ?? calculatedCustomerTotal(order)), 0
    );
    setText("paymentCodOrders", String(cod.length));
    setText("paymentCodAmount", money(totalOf(cod)));
    setText("paymentOnlineOrders", String(online.length));
    setText("paymentOnlineAmount", money(totalOf(online)));
}

function orderSettlementLabel(order) {
    const restaurant = normalizedText(order.restaurantSettlementStatus || (order.restaurantSettlementId ? "FINALIZED" : "PENDING"));
    const rider = normalizedText(order.riderSettlementStatus || (order.riderSettlementId ? "FINALIZED" : "PENDING"));
    if (restaurant === "PAID" && (rider === "PAID" || !rawRiderId(order))) return "PAID";
    if (FINAL_SETTLEMENT_STATUSES.has(restaurant) || FINAL_SETTLEMENT_STATUSES.has(rider)) return "PARTIAL";
    return "PENDING";
}

function renderOrderReport() {
    const queryText = state.orderSearch.toLowerCase();
    const delivered = filteredOrders()
        .filter(isDelivered)
        .filter((order) => {
            if (!queryText) return true;
            return [
                order.id, displayOrderId(order), restaurantName(order), riderName(order)
            ].some((value) => String(value).toLowerCase().includes(queryText));
        })
        .sort((a, b) => (dateOfOrder(b)?.getTime() || 0) - (dateOfOrder(a)?.getTime() || 0));

    const totalPages = Math.max(1, Math.ceil(delivered.length / state.orderPageSize));
    state.orderPage = Math.min(Math.max(1, state.orderPage), totalPages);
    const start = (state.orderPage - 1) * state.orderPageSize;
    const page = delivered.slice(start, start + state.orderPageSize);

    $("orderReportBody").innerHTML = page.length ? page.map((order) => {
        const restaurant = restaurantCalculation(order);
        const rAdjust = adjustmentTotals(orderAdjustments(order, "RESTAURANT"));
        const riderAdjust = adjustmentTotals(orderAdjustments(order, "RIDER"));
        const restaurantPayout = restaurant.basePayout === null
            ? null
            : restaurant.basePayout + rAdjust.credits - rAdjust.debits;
        const riderPayout = riderOrderPayout(order) + riderAdjust.credits - riderAdjust.debits;
        const adjustments = orderAdjustments(order);
        const commissionDisplay = restaurant.commissionPercent === null
            ? `<span class="missing">MISSING</span>`
            : `<span class="cell-main">${money(restaurant.commissionAmount)}</span><span class="cell-sub">${restaurant.commissionPercent}% · ${safeText(restaurant.source)}</span>`;
        return `<tr>
            <td><button class="order-link" data-order-detail="${safeText(order.id)}" type="button">#${safeText(displayOrderId(order))}</button></td>
            <td>${safeText(formatDate(dateOfOrder(order), true))}</td>
            <td><span class="cell-main">${safeText(restaurantName(order))}</span><span class="cell-sub">${safeText(rawRestaurantId(order) || "No ID")}</span></td>
            <td><span class="cell-main">${safeText(riderName(order))}</span><span class="cell-sub">${safeText(rawRiderId(order) || "No rider")}</span></td>
            <td>${money(itemTotal(order))}</td>
            <td>${money(packagingAmount(order))}</td>
            <td>${commissionDisplay}</td>
            <td>${restaurantPayout === null ? `<span class="missing">BLOCKED</span>` : money(restaurantPayout)}</td>
            <td>${money(riderPayout)}</td>
            <td>${statusBadge(paymentMethod(order))}</td>
            <td><span class="cell-main">${adjustments.length}</span><span class="cell-sub">${money(rAdjust.credits + riderAdjust.credits, true)} / ${money(-(rAdjust.debits + riderAdjust.debits))}</span></td>
            <td>${statusBadge(orderSettlementLabel(order))}</td>
            <td><button class="btn btn-secondary btn-order-adjust" data-order-adjust="${safeText(order.id)}" type="button">Adjust</button></td>
        </tr>`;
    }).join("") : emptyRow(13, "No delivered orders match these filters.");

    setText("orderPageLabel", `${state.orderPage} / ${totalPages}`);
    setText("orderReportRange", delivered.length
        ? `Showing ${start + 1}–${Math.min(start + state.orderPageSize, delivered.length)} of ${delivered.length}`
        : "0 records");
    $("orderPrevBtn").disabled = state.orderPage <= 1;
    $("orderNextBtn").disabled = state.orderPage >= totalPages;
}

function restaurantSummaryRows() {
    const map = new Map();
    const orders = filteredOrders().filter(isFinalOrder);
    orders.forEach((order) => {
        const beneficiary = canonicalBeneficiary(order, "RESTAURANT");
        const key = beneficiary.id || `missing:${restaurantName(order)}`;
        if (!map.has(key)) {
            map.set(key, { id: beneficiary.id, name: beneficiary.name, orders: 0, sales: 0, commission: 0, base: 0, credits: 0, debits: 0, missingCommission: false });
        }
        const row = map.get(key);
        const adjustments = adjustmentTotals(orderAdjustments(order, "RESTAURANT"));
        row.credits += adjustments.credits;
        row.debits += adjustments.debits;
        if (isDelivered(order)) {
            const calculation = restaurantCalculation(order);
            row.orders += 1;
            row.sales += calculation.commissionBase;
            row.commission += calculation.commissionAmount || 0;
            row.base += calculation.basePayout || 0;
            row.missingCommission ||= calculation.commissionPercent === null;
        }
    });
    return [...map.values()].sort((a, b) => (b.base + b.credits - b.debits) - (a.base + a.credits - a.debits));
}

function riderSummaryRows() {
    const map = new Map();
    const orders = filteredOrders().filter(isFinalOrder);
    orders.forEach((order) => {
        const beneficiary = canonicalBeneficiary(order, "RIDER");
        if (!beneficiary.id && orderAdjustments(order, "RIDER").length === 0) return;
        const key = beneficiary.id || `missing:${riderName(order)}`;
        if (!map.has(key)) {
            map.set(key, { id: beneficiary.id, name: beneficiary.name, orders: 0, baseSurge: 0, tip: 0, credits: 0, debits: 0 });
        }
        const row = map.get(key);
        const adjustments = adjustmentTotals(orderAdjustments(order, "RIDER"));
        row.credits += adjustments.credits;
        row.debits += adjustments.debits;
        if (isDelivered(order)) {
            const baseIncludesSurge = Boolean(firstValue(order, ["riderPayIncludesSurge", "riderPayoutIncludesSurge"], false));
            row.orders += 1;
            row.baseSurge += riderBaseAmount(order) + (baseIncludesSurge ? 0 : surgeAmount(order));
            row.tip += Boolean(firstValue(order, ["riderPayIncludesTip", "riderPayoutIncludesTip"], false)) ? 0 : tipAmount(order);
        }
    });
    return [...map.values()].sort((a, b) => (b.baseSurge + b.tip + b.credits - b.debits) - (a.baseSurge + a.tip + a.credits - a.debits));
}

function renderPartnerSummaries() {
    const restaurants = restaurantSummaryRows();
    $("restaurantSummaryBody").innerHTML = restaurants.length ? restaurants.map((row) => `<tr>
        <td><span class="cell-main">${safeText(row.name)}</span><span class="cell-sub">${safeText(row.id || "Missing ID")}</span></td>
        <td>${row.orders}</td><td>${money(row.sales)}</td>
        <td>${row.missingCommission ? `<span class="missing">INCOMPLETE</span>` : money(row.commission)}</td>
        <td><span class="positive">${money(row.credits, true)}</span> <span class="negative">${money(-row.debits)}</span></td>
        <td>${row.missingCommission ? `<span class="missing">BLOCKED</span>` : money(row.base + row.credits - row.debits)}</td>
    </tr>`).join("") : emptyRow(6, "No restaurant payable data.");

    const riders = riderSummaryRows();
    $("riderSummaryBody").innerHTML = riders.length ? riders.map((row) => `<tr>
        <td><span class="cell-main">${safeText(row.name)}</span><span class="cell-sub">${safeText(row.id || "Missing ID")}</span></td>
        <td>${row.orders}</td><td>${money(row.baseSurge)}</td><td>${money(row.tip)}</td>
        <td><span class="positive">${money(row.credits, true)}</span> <span class="negative">${money(-row.debits)}</span></td>
        <td>${money(row.baseSurge + row.tip + row.credits - row.debits)}</td>
    </tr>`).join("") : emptyRow(6, "No rider earning data.");
}

function currentBeneficiary() {
    const id = $("settlementBeneficiary")?.value || "";
    if (!id) return null;
    const list = state.mainTab === "RESTAURANT" ? state.restaurants : state.riders;
    return list.find((item) => item.id === id) || null;
}

function beneficiaryCarryForward() {
    return numberValue(currentBeneficiary()?.settlementCarryForward);
}

function settlementDateBounds() {
    const fromValue = $("settlementFromDate")?.value;
    const toValue = $("settlementToDate")?.value;
    return {
        from: fromValue ? startOfDay(new Date(`${fromValue}T00:00:00`)) : null,
        to: toValue ? endOfDay(new Date(`${toValue}T23:59:59`)) : null
    };
}

function belongsToSelectedBeneficiary(order, type, beneficiaryId) {
    const beneficiary = canonicalBeneficiary(order, type);
    return beneficiary.id === beneficiaryId;
}

function settlementEntryForOrder(order, type, category) {
    const pending = pendingAdjustments(order, type);
    const totals = adjustmentTotals(pending);
    const restaurant = restaurantCalculation(order);
    const riderIncludesSurge = Boolean(firstValue(order, ["riderPayIncludesSurge", "riderPayoutIncludesSurge"], false));
    const riderIncludesTip = Boolean(firstValue(order, ["riderPayIncludesTip", "riderPayoutIncludesTip"], false));
    const componentAmount = type === "RESTAURANT"
        ? restaurant.commissionBase
        : riderBaseAmount(order) + (riderIncludesSurge ? 0 : surgeAmount(order));
    const deductionAmount = type === "RESTAURANT"
        ? (isCancelled(order) ? 0 : restaurant.commissionAmount)
        : (riderIncludesTip ? 0 : tipAmount(order));
    let base = 0;
    let missingReason = "";
    if (category === "DELIVERED") {
        if (type === "RESTAURANT") {
            if (restaurant.basePayout === null) missingReason = "Commission rate is missing";
            else base = restaurant.basePayout;
        } else {
            if (!canonicalBeneficiary(order, "RIDER").id) missingReason = "Rider mapping is missing";
            base = riderOrderPayout(order);
        }
    }
    return {
        key: `${order.id}:${type}:${category}`,
        order,
        orderDocId: order.id,
        orderId: displayOrderId(order),
        category,
        componentAmount: roundMoney(componentAmount),
        deductionAmount: deductionAmount === null ? null : roundMoney(deductionAmount),
        commissionPercent: type === "RESTAURANT" ? restaurant.commissionPercent : null,
        base: roundMoney(base),
        credits: roundMoney(totals.credits),
        debits: roundMoney(totals.debits),
        final: roundMoney(base + totals.credits - totals.debits),
        adjustmentIds: pending.map((adjustment) => adjustment.id),
        latestRemark: pending[0]?.remark || "",
        missingReason
    };
}

function eligibleSettlementEntries(type, beneficiaryId, category) {
    const bounds = settlementDateBounds();
    const search = String($("settlementOrderSearch")?.value || "").trim().toLowerCase();
    return state.orders
        .filter((order) => belongsToSelectedBeneficiary(order, type, beneficiaryId))
        .filter((order) => inDateRange(order, bounds.from, bounds.to))
        .filter((order) => !search || displayOrderId(order).toLowerCase().includes(search) || order.id.toLowerCase().includes(search))
        .filter((order) => {
            const pending = pendingAdjustments(order, type);
            const settled = baseAlreadySettled(order, type);
            const reserved = reservedByAnotherDraft(order, type);
            if (category === "DELIVERED") return isDelivered(order) && !settled && !reserved;
            if (category === "CANCELLED") return isCancelled(order) && pending.length > 0 && !reserved;
            if (category === "POST") return isFinalOrder(order) && settled && pending.length > 0 && !reserved;
            return false;
        })
        .map((order) => settlementEntryForOrder(order, type, category))
        .sort((a, b) => (dateOfOrder(a.order)?.getTime() || 0) - (dateOfOrder(b.order)?.getTime() || 0));
}

function allEligibleCounts(type, beneficiaryId) {
    return {
        delivered: eligibleSettlementEntries(type, beneficiaryId, "DELIVERED").length,
        cancelled: eligibleSettlementEntries(type, beneficiaryId, "CANCELLED").length,
        post: eligibleSettlementEntries(type, beneficiaryId, "POST").length
    };
}

function loadSettlementEntries({ preserveSelection = false } = {}) {
    const beneficiary = currentBeneficiary();
    if (!beneficiary) {
        state.settlementEntries = [];
        state.selectedSettlementKeys.clear();
        state.settlementLoaded = false;
        renderSettlementEntries();
        toast(`Select a ${state.mainTab === "RESTAURANT" ? "restaurant" : "rider"} first.`, "warning");
        return;
    }
    const counts = allEligibleCounts(state.mainTab, beneficiary.id);
    setText("deliveredEligibleCount", String(counts.delivered));
    setText("cancelledEligibleCount", String(counts.cancelled));
    setText("postEligibleCount", String(counts.post));

    const next = eligibleSettlementEntries(state.mainTab, beneficiary.id, state.settlementSubTab);
    state.settlementEntries = next;
    if (preserveSelection) {
        state.selectedSettlementKeys = new Set(next.filter((entry) => state.selectedSettlementKeys.has(entry.key)).map((entry) => entry.key));
    } else {
        state.selectedSettlementKeys.clear();
    }
    state.settlementLoaded = true;
    renderSettlementEntries();
}

function selectedEntries() {
    return state.settlementEntries.filter((entry) => state.selectedSettlementKeys.has(entry.key));
}

function selectedSettlementTotals() {
    const entries = selectedEntries();
    const totals = entries.reduce((sum, entry) => {
        sum.base += entry.base;
        sum.credits += entry.credits;
        sum.debits += entry.debits;
        return sum;
    }, { base: 0, credits: 0, debits: 0 });
    const carryBefore = beneficiaryCarryForward();
    const net = roundMoney(totals.base + totals.credits - totals.debits - carryBefore);
    return {
        ...totals,
        carryBefore,
        net,
        payout: Math.max(0, net),
        carryAfter: Math.max(0, -net)
    };
}

function renderSettlementTotals() {
    const totals = selectedSettlementTotals();
    setText("settlementBaseTotal", money(totals.base));
    setText("settlementCreditTotal", money(totals.credits, true));
    setText("settlementDebitTotal", money(-totals.debits));
    setText("settlementFinalTotal", money(totals.payout));
    setText("settlementCarryForward", totals.carryBefore || totals.carryAfter
        ? `${money(-totals.carryBefore)} → ${money(totals.carryAfter)}`
        : "₹0");
    setText("settlementSelectedCount", String(selectedEntries().length));
}

function renderSettlementEntries() {
    const body = $("settlementEntriesBody");
    if (!state.settlementLoaded) {
        body.innerHTML = emptyRow(12, "Select a partner and load eligible orders.");
    } else if (!state.settlementEntries.length) {
        body.innerHTML = emptyRow(12, "No eligible entries in this category.");
    } else {
        body.innerHTML = state.settlementEntries.map((entry) => {
            const checked = state.selectedSettlementKeys.has(entry.key);
            return `<tr>
                <td><input class="settlement-checkbox" data-entry-key="${safeText(entry.key)}" type="checkbox" ${checked ? "checked" : ""}></td>
                <td><button class="order-link" data-order-detail="${safeText(entry.orderDocId)}" type="button">#${safeText(entry.orderId)}</button></td>
                <td>${statusBadge(orderStatus(entry.order))}<span class="cell-sub">${safeText(entry.category)}</span></td>
                <td>${safeText(formatDate(dateOfOrder(entry.order)))}</td>
                <td>${money(entry.componentAmount)}</td>
                <td>${entry.deductionAmount === null ? `<span class="missing">MISSING</span>` : `${money(entry.deductionAmount)}${entry.commissionPercent === null ? "" : `<span class="cell-sub">${entry.commissionPercent}%</span>`}`}</td>
                <td>${entry.missingReason ? `<span class="missing" title="${safeText(entry.missingReason)}">BLOCKED</span>` : money(entry.base)}</td>
                <td class="positive">${money(entry.credits, true)}</td>
                <td class="negative">${money(-entry.debits)}</td>
                <td>${entry.missingReason ? "—" : money(Math.max(0, entry.final))}</td>
                <td><span class="cell-main">${safeText(entry.latestRemark || "—")}</span><span class="cell-sub">${entry.adjustmentIds.length} adjustment(s)</span></td>
                <td><button class="btn btn-secondary btn-order-adjust" data-order-adjust="${safeText(entry.orderDocId)}" data-beneficiary-type="${safeText(state.mainTab)}" type="button">Adjust</button></td>
            </tr>`;
        }).join("");
    }
    const selectAll = $("selectAllSettlement");
    selectAll.checked = state.settlementEntries.length > 0
        && state.settlementEntries.every((entry) => state.selectedSettlementKeys.has(entry.key));
    selectAll.indeterminate = state.selectedSettlementKeys.size > 0 && !selectAll.checked;
    renderSettlementTotals();
}

function renderSettlementHistory() {
    const search = String($("historySearch")?.value || "").trim().toLowerCase();
    const statusFilter = normalizedText($("historyStatusFilter")?.value || "");
    const settlements = [...state.settlements]
        .filter((settlement) => !search || [
            settlement.displayId, settlement.id, settlement.beneficiaryName,
            settlement.paymentReference
        ].some((value) => String(value || "").toLowerCase().includes(search)))
        .filter((settlement) => !statusFilter || normalizedText(settlement.status) === statusFilter)
        .sort((a, b) => (toDate(b.createdAt)?.getTime() || 0) - (toDate(a.createdAt)?.getTime() || 0));

    $("settlementHistoryBody").innerHTML = settlements.length ? settlements.map((settlement) => {
        const period = settlement.dateFrom || settlement.dateTo
            ? `${safeText(settlement.dateFrom || "—")} – ${safeText(settlement.dateTo || "—")}`
            : "All dates";
        const status = normalizedText(settlement.status || "DRAFT");
        const actions = status === "DRAFT"
            ? `<button class="btn btn-secondary" data-view-settlement="${safeText(settlement.id)}" type="button">View</button>
               <button class="btn btn-primary" data-edit-draft="${safeText(settlement.id)}" type="button">Edit</button>
               <button class="btn btn-danger" data-delete-draft="${safeText(settlement.id)}" type="button">Delete</button>`
            : `<button class="btn btn-secondary" data-view-settlement="${safeText(settlement.id)}" type="button">View</button>
               ${status === "FINALIZED" ? `<button class="btn btn-success" data-mark-paid="${safeText(settlement.id)}" type="button">Mark paid</button>` : ""}`;
        return `<tr>
            <td><span class="cell-main">${safeText(settlement.displayId || settlement.id)}</span><span class="cell-sub">${safeText(formatDate(settlement.createdAt, true))}</span></td>
            <td>${safeText(settlement.beneficiaryName || settlement.beneficiaryId || "—")}</td>
            <td>${safeText(settlement.beneficiaryType || "—")}</td>
            <td>${period}</td>
            <td>${Number(settlement.entryCount || settlement.entries?.length || 0)}</td>
            <td>${money(settlement.payoutAmount ?? settlement.totalPayout ?? 0)}${numberValue(settlement.carryForwardAmount) ? `<span class="cell-sub">Carry ${money(settlement.carryForwardAmount)}</span>` : ""}</td>
            <td>${statusBadge(status)}</td>
            <td>
                <span class="cell-main">${safeText(settlement.paymentMode || "—")}</span>
                <span class="cell-sub">${
                    settlement.paymentReference
                        ? `${safeText(settlement.paymentReference)} · ${safeText(settlement.paymentDate || "")}`
                        : "No payment record"
                }</span>
            </td>
            <td><div class="section-actions">${actions}</div></td>
        </tr>`;
    }).join("") : emptyRow(9, "No settlement history found.");
}

function renderAll() {
    renderHealth();
    renderFinancialSummary();
    renderPaymentSummary();
    renderOrderReport();
    renderPartnerSummaries();
    renderSettlementHistory();
    if (state.settlementLoaded && currentBeneficiary()) loadSettlementEntries({ preserveSelection: true });
    setText("lastUpdated", `Updated ${new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date())}`);
}

function applyFilters() {
    const preset = $("datePreset").value;
    const range = filtersForPreset(preset, $("filterFromDate").value, $("filterToDate").value);
    if (preset === "CUSTOM" && (!range.from || !range.to)) {
        toast("Select both From and To dates.", "warning");
        return;
    }
    if (range.from && range.to && range.from > range.to) {
        toast("From date cannot be after To date.", "warning");
        return;
    }
    state.filters = {
        preset,
        from: range.from,
        to: range.to,
        restaurantId: $("restaurantFilter").value,
        riderId: $("riderFilter").value,
        payment: $("paymentFilter").value
    };
    state.orderPage = 1;
    renderAll();
}

function resetFilters() {
    $("datePreset").value = "ALL";
    $("filterFromDate").value = "";
    $("filterToDate").value = "";
    $("restaurantFilter").value = "";
    $("riderFilter").value = "";
    $("paymentFilter").value = "";
    $("orderReportSearch").value = "";
    state.orderSearch = "";
    toggleCustomDates();
    applyFilters();
}

function toggleCustomDates() {
    const custom = $("datePreset").value === "CUSTOM";
    $("fromDateWrap").classList.toggle("hidden", !custom);
    $("toDateWrap").classList.toggle("hidden", !custom);
}

function displayIdForSettlement(type) {
    const date = new Date();
    const stamp = [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0")
    ].join("") + "-" + [
        String(date.getHours()).padStart(2, "0"),
        String(date.getMinutes()).padStart(2, "0"),
        String(date.getSeconds()).padStart(2, "0")
    ].join("");
    return `ST-${type === "RESTAURANT" ? "R" : "D"}-${stamp}`;
}

function settlementPayload(status, existingSettlement = null) {
    const beneficiary = currentBeneficiary();
    const entries = selectedEntries();
    const totals = selectedSettlementTotals();
    const nameKeys = state.mainTab === "RESTAURANT"
        ? ["name", "restaurantName", "businessName"]
        : ["name", "riderName", "fullName"];
    return {
        displayId: existingSettlement?.displayId || displayIdForSettlement(state.mainTab),
        beneficiaryType: state.mainTab,
        beneficiaryId: beneficiary.id,
        beneficiaryName: String(firstValue(beneficiary, nameKeys, beneficiary.id)),
        dateFrom: $("settlementFromDate").value || "",
        dateTo: $("settlementToDate").value || "",
        category: state.settlementSubTab,
        entries: entries.map((entry) => ({
            orderDocId: entry.orderDocId,
            orderId: entry.orderId,
            entryType: entry.category,
            componentAmount: roundMoney(entry.componentAmount),
            deductionAmount: entry.deductionAmount === null ? null : roundMoney(entry.deductionAmount),
            commissionPercent: entry.commissionPercent,
            baseAmount: roundMoney(entry.base),
            creditAmount: roundMoney(entry.credits),
            debitAmount: roundMoney(entry.debits),
            netAmount: roundMoney(entry.final),
            adjustmentIds: [...entry.adjustmentIds],
            latestRemark: entry.latestRemark || ""
        })),
        entryCount: entries.length,
        baseAmount: roundMoney(totals.base),
        creditAmount: roundMoney(totals.credits),
        debitAmount: roundMoney(totals.debits),
        carryForwardBefore: roundMoney(totals.carryBefore),
        netAmount: roundMoney(totals.net),
        payoutAmount: roundMoney(totals.payout),
        carryForwardAmount: roundMoney(totals.carryAfter),
        overallRemark: $("settlementOverallRemark").value.trim(),
        status,
        createdByUid: state.user?.uid || "",
        createdByEmail: state.user?.email || "",
        createdAt: existingSettlement?.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp()
    };
}

function validateSettlementSelection() {
    if (!currentBeneficiary()) return "Select a beneficiary.";
    const entries = selectedEntries();
    if (!entries.length) return "Select at least one eligible entry.";
    const blocked = entries.find((entry) => entry.missingReason);
    if (blocked) return `${blocked.orderId}: ${blocked.missingReason}.`;
    if (entries.some((entry) => !isFinalOrder(entry.order))) return "Active orders cannot be settled.";
    if (!state.collectionAccess.adjustments || !state.collectionAccess.settlements) {
        return "Firestore access is missing for settlement collections.";
    }
    return "";
}

async function saveDraft() {
    const error = validateSettlementSelection();
    if (error) {
        toast(error, "error");
        return;
    }

    const button = $("saveDraftBtn");
    button.disabled = true;

    try {
        const selected = selectedEntries();
        const type = state.mainTab;
        const existingDraft = state.editingDraftId
            ? state.settlements.find((item) => item.id === state.editingDraftId)
            : null;
        const settlementRef = state.editingDraftId
            ? doc(db, COLLECTIONS.settlements, state.editingDraftId)
            : doc(collection(db, COLLECTIONS.settlements));
        const payload = settlementPayload("DRAFT", existingDraft);

        await runTransaction(db, async (transaction) => {
            let oldEntries = [];

            /*
             * IMPORTANT:
             * Firestore transaction me pehle saare reads hote hain.
             * Uske baad hi updates / set / delete writes kiye jaate hain.
             */

            if (state.editingDraftId) {
                const draftSnapshot = await transaction.get(settlementRef);

                if (!draftSnapshot.exists()) {
                    throw new Error("Draft no longer exists.");
                }

                const draftData = draftSnapshot.data();

                if (normalizedText(draftData.status) !== "DRAFT") {
                    throw new Error("Only a draft settlement can be edited.");
                }

                oldEntries = draftData.entries || [];
            }

            const selectedOrderIds =
                new Set(
                    selected.map(
                        (entry) => entry.orderDocId
                    )
                );

            const oldOrdersToRelease = [];
            const selectedOrdersToReserve = [];

            /*
             * READ PHASE 1:
             * Edited draft se remove hue purane orders read karo.
             */
            for (const oldEntry of oldEntries) {

                if (
                    selectedOrderIds.has(
                        oldEntry.orderDocId
                    )
                ) {
                    continue;
                }

                const oldOrderRef =
                    doc(
                        db,
                        COLLECTIONS.orders,
                        oldEntry.orderDocId
                    );

                const oldOrderSnapshot =
                    await transaction.get(
                        oldOrderRef
                    );

                if (!oldOrderSnapshot.exists()) {
                    continue;
                }

                const oldOrder =
                    oldOrderSnapshot.data();

                if (
                    String(
                        oldOrder[
                            settlementField(
                                type,
                                "DraftSettlementId"
                            )
                        ] || ""
                    ) === settlementRef.id
                ) {

                    oldOrdersToRelease.push({
                        ref: oldOrderRef
                    });
                }
            }

            /*
             * READ PHASE 2:
             * Naye selected orders read aur validate karo.
             */
            for (const entry of selected) {

                const orderRef =
                    doc(
                        db,
                        COLLECTIONS.orders,
                        entry.orderDocId
                    );

                const orderSnapshot =
                    await transaction.get(
                        orderRef
                    );

                if (!orderSnapshot.exists()) {
                    throw new Error(
                        `Order ${entry.orderId} no longer exists.`
                    );
                }

                const order = {
                    id: orderSnapshot.id,
                    ...orderSnapshot.data()
                };

                if (!isFinalOrder(order)) {
                    throw new Error(
                        `Order ${entry.orderId} is not final.`
                    );
                }

                if (
                    baseAlreadySettled(
                        order,
                        type
                    )
                ) {
                    throw new Error(
                        `Order ${entry.orderId} is already finalized in another settlement.`
                    );
                }

                const otherDraftId =
                    draftSettlementId(
                        order,
                        type
                    );

                if (
                    otherDraftId &&
                    otherDraftId !== settlementRef.id
                ) {
                    throw new Error(
                        `Order ${entry.orderId} is already reserved in another draft.`
                    );
                }

                selectedOrdersToReserve.push({
                    ref: orderRef
                });
            }

            /*
             * WRITE PHASE:
             * Ab saare reads complete ho chuke hain.
             */

            for (
                const oldOrder
                of oldOrdersToRelease
            ) {

                transaction.update(
                    oldOrder.ref,
                    {
                        [settlementField(
                            type,
                            "DraftSettlementId"
                        )]: deleteField(),

                        [settlementField(
                            type,
                            "DraftSettlementStatus"
                        )]: deleteField(),

                        [settlementField(
                            type,
                            "DraftReservedAt"
                        )]: deleteField()
                    }
                );
            }

            for (
                const selectedOrder
                of selectedOrdersToReserve
            ) {

                transaction.update(
                    selectedOrder.ref,
                    {
                        [settlementField(
                            type,
                            "DraftSettlementId"
                        )]: settlementRef.id,

                        [settlementField(
                            type,
                            "DraftSettlementStatus"
                        )]: "DRAFT",

                        [settlementField(
                            type,
                            "DraftReservedAt"
                        )]: serverTimestamp()
                    }
                );
            }

            transaction.set(
                settlementRef,
                payload
            );
        });

        const wasEditing = Boolean(state.editingDraftId);
        state.selectedSettlementKeys.clear();
        $("settlementOverallRemark").value = "";
        resetDraftEditing();
        state.settlementLoaded = false;
        state.settlementEntries = [];
        renderSettlementEntries();
        toast(
            wasEditing
                ? "Draft updated. Selected orders remain reserved."
                : "Draft saved. Selected orders are now reserved and cannot be settled twice.",
            "success",
            6000
        );
    } catch (errorObject) {
        console.error(errorObject);
        toast(`Draft could not be saved: ${errorObject.message}`, "error", 7000);
    } finally {
        button.disabled = false;
    }
}

async function finalizeSettlement() {
    const validation = validateSettlementSelection();
    if (validation) {
        toast(validation, "error");
        return;
    }
    const beneficiary = currentBeneficiary();
    const clientEntries = selectedEntries();
    const type = state.mainTab;
    const existingDraft = state.editingDraftId
        ? state.settlements.find((item) => item.id === state.editingDraftId)
        : null;
    const payload = settlementPayload("FINALIZED", existingDraft);
    const settlementRef = state.editingDraftId
        ? doc(db, COLLECTIONS.settlements, state.editingDraftId)
        : doc(collection(db, COLLECTIONS.settlements));
    const beneficiaryCollection = type === "RESTAURANT" ? COLLECTIONS.restaurants : COLLECTIONS.riders;
    const beneficiaryRef = doc(db, beneficiaryCollection, beneficiary.id);
    const button = $("finalizeSettlementBtn");
    button.disabled = true;

    try {
        await runTransaction(db, async (transaction) => {
            let oldDraftEntries = [];
            if (state.editingDraftId) {
                const draftSnapshot = await transaction.get(settlementRef);
                if (!draftSnapshot.exists()) throw new Error("Draft no longer exists.");
                const draftData = draftSnapshot.data();
                if (normalizedText(draftData.status) !== "DRAFT") throw new Error("Only a draft can be finalized from edit mode.");
                oldDraftEntries = draftData.entries || [];
                payload.displayId = draftData.displayId || payload.displayId;
                payload.createdAt = draftData.createdAt || payload.createdAt;
            }

            const beneficiarySnapshot = await transaction.get(beneficiaryRef);
            if (!beneficiarySnapshot.exists()) throw new Error("Beneficiary no longer exists.");
            const freshBeneficiary = { id: beneficiarySnapshot.id, ...beneficiarySnapshot.data() };
            const carryBefore = numberValue(freshBeneficiary.settlementCarryForward);

            const freshEntries = [];
            for (const clientEntry of clientEntries) {
                const orderRef = doc(db, COLLECTIONS.orders, clientEntry.orderDocId);
                const orderSnapshot = await transaction.get(orderRef);
                if (!orderSnapshot.exists()) throw new Error(`Order ${clientEntry.orderId} no longer exists.`);
                const order = { id: orderSnapshot.id, ...orderSnapshot.data() };
                if (!isFinalOrder(order)) throw new Error(`Order ${clientEntry.orderId} is not final.`);

                if (clientEntry.category === "DELIVERED" && baseAlreadySettled(order, type)) {
                    throw new Error(`Order ${clientEntry.orderId} base payout is already settled.`);
                }
                const lockedDraftId = draftSettlementId(order, type);
                if (lockedDraftId && lockedDraftId !== settlementRef.id) {
                    throw new Error(`Order ${clientEntry.orderId} is reserved in another draft.`);
                }
                if (clientEntry.category === "CANCELLED" && !isCancelled(order)) {
                    throw new Error(`Order ${clientEntry.orderId} is no longer cancelled.`);
                }

                let base = 0;
                let componentAmount = 0;
                let deductionAmount = 0;
                let commissionPercent = null;
                if (type === "RESTAURANT") {
                    const calculation = restaurantCalculation(order, freshBeneficiary);
                    componentAmount = calculation.commissionBase;
                    deductionAmount = isCancelled(order) ? 0 : calculation.commissionAmount;
                    commissionPercent = calculation.commissionPercent;
                } else {
                    const includesSurge = Boolean(firstValue(order, ["riderPayIncludesSurge", "riderPayoutIncludesSurge"], false));
                    const includesTip = Boolean(firstValue(order, ["riderPayIncludesTip", "riderPayoutIncludesTip"], false));
                    componentAmount = riderBaseAmount(order) + (includesSurge ? 0 : surgeAmount(order));
                    deductionAmount = includesTip ? 0 : tipAmount(order);
                }
                if (clientEntry.category === "DELIVERED") {
                    if (type === "RESTAURANT") {
                        const calculation = restaurantCalculation(order, freshBeneficiary);
                        if (calculation.basePayout === null) throw new Error(`Order ${clientEntry.orderId} has no commission rate.`);
                        base = calculation.basePayout;
                    } else {
                        if (!canonicalBeneficiary(order, "RIDER").id) throw new Error(`Order ${clientEntry.orderId} has no rider mapping.`);
                        base = riderOrderPayout(order);
                    }
                }

                const freshAdjustments = [];
                for (const adjustmentId of clientEntry.adjustmentIds) {
                    const adjustmentRef = doc(db, COLLECTIONS.adjustments, adjustmentId);
                    const adjustmentSnapshot = await transaction.get(adjustmentRef);
                    if (!adjustmentSnapshot.exists()) throw new Error(`Adjustment ${adjustmentId} no longer exists.`);
                    const adjustment = { id: adjustmentSnapshot.id, ...adjustmentSnapshot.data() };
                    if (normalizedText(adjustment.settlementStatus || "PENDING") !== "PENDING") {
                        throw new Error(`An adjustment for order ${clientEntry.orderId} is no longer pending.`);
                    }
                    if (normalizedText(adjustment.beneficiaryType) !== type) {
                        throw new Error(`Adjustment beneficiary mismatch on order ${clientEntry.orderId}.`);
                    }
                    freshAdjustments.push({ ref: adjustmentRef, data: adjustment });
                }
                const adjustmentAmounts = adjustmentTotals(freshAdjustments.map((item) => item.data));
                freshEntries.push({
                    order,
                    orderRef,
                    category: clientEntry.category,
                    componentAmount: roundMoney(componentAmount),
                    deductionAmount: deductionAmount === null ? null : roundMoney(deductionAmount),
                    commissionPercent,
                    base: roundMoney(base),
                    credits: roundMoney(adjustmentAmounts.credits),
                    debits: roundMoney(adjustmentAmounts.debits),
                    adjustments: freshAdjustments
                });
            }

            const totals = freshEntries.reduce((sum, entry) => {
                sum.base += entry.base;
                sum.credits += entry.credits;
                sum.debits += entry.debits;
                return sum;
            }, { base: 0, credits: 0, debits: 0 });
            const net = roundMoney(totals.base + totals.credits - totals.debits - carryBefore);
            const payout = Math.max(0, net);
            const carryAfter = Math.max(0, -net);

            payload.entries = freshEntries.map((entry) => ({
                orderDocId: entry.order.id,
                orderId: displayOrderId(entry.order),
                entryType: entry.category,
                componentAmount: entry.componentAmount,
                deductionAmount: entry.deductionAmount,
                commissionPercent: entry.commissionPercent,
                baseAmount: entry.base,
                creditAmount: entry.credits,
                debitAmount: entry.debits,
                netAmount: roundMoney(entry.base + entry.credits - entry.debits),
                adjustmentIds: entry.adjustments.map((item) => item.data.id),
                latestRemark: entry.adjustments[0]?.data.remark || ""
            }));
            payload.entryCount = payload.entries.length;
            payload.baseAmount = roundMoney(totals.base);
            payload.creditAmount = roundMoney(totals.credits);
            payload.debitAmount = roundMoney(totals.debits);
            payload.carryForwardBefore = roundMoney(carryBefore);
            payload.netAmount = net;
            payload.payoutAmount = roundMoney(payout);
            payload.carryForwardAmount = roundMoney(carryAfter);

            const finalizedOrderIds = new Set(freshEntries.map((entry) => entry.order.id));
            for (const oldEntry of oldDraftEntries) {
                if (finalizedOrderIds.has(oldEntry.orderDocId)) continue;
                const oldOrderRef = doc(db, COLLECTIONS.orders, oldEntry.orderDocId);
                const oldOrderSnapshot = await transaction.get(oldOrderRef);
                if (!oldOrderSnapshot.exists()) continue;
                const oldOrder = oldOrderSnapshot.data();
                if (String(oldOrder[settlementField(type, "DraftSettlementId")] || "") === settlementRef.id) {
                    transaction.update(oldOrderRef, {
                        [settlementField(type, "DraftSettlementId")]: deleteField(),
                        [settlementField(type, "DraftSettlementStatus")]: deleteField(),
                        [settlementField(type, "DraftReservedAt")]: deleteField()
                    });
                }
            }

            transaction.set(settlementRef, payload);
            transaction.update(beneficiaryRef, {
                settlementCarryForward: roundMoney(carryAfter),
                lastSettlementId: settlementRef.id,
                lastSettlementAt: serverTimestamp()
            });

            for (const entry of freshEntries) {
                const orderUpdate = {
                    [settlementField(type, "LastSettlementId")]: settlementRef.id,
                    [settlementField(type, "LastSettledAt")]: serverTimestamp(),
                    [settlementField(type, "DraftSettlementId")]: deleteField(),
                    [settlementField(type, "DraftSettlementStatus")]: deleteField(),
                    [settlementField(type, "DraftReservedAt")]: deleteField()
                };
                if (entry.category === "DELIVERED") {
                    orderUpdate[settlementField(type, "SettlementId")] = settlementRef.id;
                    orderUpdate[settlementField(type, "SettlementStatus")] = "FINALIZED";
                    orderUpdate[settlementField(type, "SettledAmount")] = roundMoney(entry.base);
                    orderUpdate[settlementField(type, "SettledAt")] = serverTimestamp();
                }
                transaction.update(entry.orderRef, orderUpdate);
                entry.adjustments.forEach(({ ref }) => {
                    transaction.update(ref, {
                        settlementStatus: "FINALIZED",
                        settlementId: settlementRef.id,
                        finalizedAt: serverTimestamp(),
                        finalizedByUid: state.user?.uid || "",
                        finalizedByEmail: state.user?.email || ""
                    });
                });
            }
        });

        state.selectedSettlementKeys.clear();
        $("settlementOverallRemark").value = "";
        resetDraftEditing();
        toast(`Settlement ${payload.displayId} finalized for ${money(payload.payoutAmount)}.`, "success", 6000);
        loadSettlementEntries();
    } catch (errorObject) {
        console.error(errorObject);
        toast(`Settlement blocked: ${errorObject.message}`, "error", 7500);
    } finally {
        button.disabled = false;
    }
}

function resetAdjustmentForm() {
    $("adjustmentForm").reset();
    $("adjustmentReverseId").value = "";
    $("adjustmentBeneficiaryType").value = state.mainTab === "RIDER" ? "RIDER" : "RESTAURANT";
    $("adjustmentDirection").value = "CREDIT";
    $("adjustmentType").value = "CANCELLED_COMPENSATION";
    $("adjustmentAmount").readOnly = false;
    $("adjustmentBeneficiaryType").disabled = false;
    $("adjustmentOrderId").readOnly = false;
    $("adjustmentOrderPreview").classList.add("hidden");
    setText("adjustmentModalTitle", "Add order adjustment");
}

function openAdjustmentForOrder(orderId, beneficiaryType = "") {
    closeModal("detailModal");
    resetAdjustmentForm();
    const order = state.orders.find((item) => item.id === orderId) || findOrder(orderId);
    if (order) {
        $("adjustmentOrderId").value = displayOrderId(order);
        $("adjustmentOrderId").readOnly = true;
        if (beneficiaryType) $("adjustmentBeneficiaryType").value = beneficiaryType;
        updateAdjustmentPreview();
    }
    openModal("adjustmentModal");
}

function updateAdjustmentPreview() {
    const preview = $("adjustmentOrderPreview");
    const order = findOrder($("adjustmentOrderId").value);
    if (!order) {
        preview.classList.add("hidden");
        return;
    }
    const type = $("adjustmentBeneficiaryType").value;
    const beneficiary = canonicalBeneficiary(order, type);
    preview.innerHTML = `<strong>#${safeText(displayOrderId(order))}</strong> · ${safeText(orderStatus(order))}
        · ${safeText(beneficiary.name)}${!isFinalOrder(order) ? " · Adjustment will remain on hold until Delivered/Cancelled." : ""}`;
    preview.classList.remove("hidden");
}

async function saveAdjustment(event) {
    event.preventDefault();
    const order = findOrder($("adjustmentOrderId").value);
    if (!order) {
        toast("Exact order ID was not found.", "error");
        return;
    }
    const type = normalizedText($("adjustmentBeneficiaryType").value);
    const beneficiary = canonicalBeneficiary(order, type);
    if (!beneficiary.id) {
        toast(`${type === "RESTAURANT" ? "Restaurant" : "Rider"} mapping is missing on this order.`, "error");
        return;
    }
    const amount = roundMoney($("adjustmentAmount").value);
    const remark = $("adjustmentRemark").value.trim();
    if (amount <= 0) {
        toast("Adjustment amount must be greater than zero.", "error");
        return;
    }
    if (remark.length < 3) {
        toast("A clear remark is mandatory.", "error");
        return;
    }

    const reverseId = $("adjustmentReverseId").value;
    const payload = {
        orderDocId: order.id,
        orderId: displayOrderId(order),
        beneficiaryType: type,
        beneficiaryId: beneficiary.id,
        beneficiaryName: beneficiary.name,
        direction: normalizedText($("adjustmentDirection").value),
        amount,
        adjustmentType: normalizedText($("adjustmentType").value),
        remark,
        orderStatusAtCreation: orderStatus(order),
        settlementStatus: "PENDING",
        onHold: !isFinalOrder(order),
        isReversal: Boolean(reverseId),
        reversesAdjustmentId: reverseId || "",
        createdAt: serverTimestamp(),
        createdByUid: state.user?.uid || "",
        createdByEmail: state.user?.email || ""
    };

    const button = $("saveAdjustmentBtn");
    button.disabled = true;
    try {
        if (reverseId) {
            const originalRef = doc(db, COLLECTIONS.adjustments, reverseId);
            const reversalRef = doc(collection(db, COLLECTIONS.adjustments));
            await runTransaction(db, async (transaction) => {
                const originalSnapshot = await transaction.get(originalRef);
                if (!originalSnapshot.exists()) throw new Error("Original adjustment no longer exists.");
                if (originalSnapshot.data().reversedByAdjustmentId) throw new Error("This adjustment has already been reversed.");
                transaction.set(reversalRef, payload);
                transaction.update(originalRef, {
                    reversedByAdjustmentId: reversalRef.id,
                    reversedAt: serverTimestamp(),
                    reversedByUid: state.user?.uid || "",
                    reversedByEmail: state.user?.email || ""
                });
            });
            toast("Reversal ledger entry created. Original record was preserved.", "success");
        } else {
            await addDoc(collection(db, COLLECTIONS.adjustments), payload);
            toast(payload.onHold
                ? "Adjustment saved on hold until the order becomes Delivered or Cancelled."
                : "Adjustment ledger entry added.", "success", 6000);
        }
        closeModal("adjustmentModal");
        resetAdjustmentForm();
    } catch (errorObject) {
        console.error(errorObject);
        toast(`Adjustment could not be saved: ${errorObject.message}`, "error", 7000);
    } finally {
        button.disabled = false;
    }
}

function reverseAdjustment(adjustmentId) {
    const adjustment = state.adjustments.find((item) => item.id === adjustmentId);
    if (!adjustment) return;
    resetAdjustmentForm();
    $("adjustmentReverseId").value = adjustment.id;
    $("adjustmentOrderId").value = adjustment.orderId || adjustment.orderDocId;
    $("adjustmentOrderId").readOnly = true;
    $("adjustmentBeneficiaryType").value = normalizedText(adjustment.beneficiaryType);
    $("adjustmentBeneficiaryType").disabled = true;
    $("adjustmentDirection").value = normalizedText(adjustment.direction) === "CREDIT" ? "DEBIT" : "CREDIT";
    $("adjustmentType").value = "REVERSAL";
    $("adjustmentAmount").value = numberValue(adjustment.amount);
    $("adjustmentAmount").readOnly = true;
    $("adjustmentRemark").value = "";
    setText("adjustmentModalTitle", "Create reversal entry");
    updateAdjustmentPreview();
    closeModal("detailModal");
    openModal("adjustmentModal");
}

function showOrderDetails(orderId) {
    const order = state.orders.find((item) => item.id === orderId) || findOrder(orderId);
    if (!order) return;
    const restaurant = restaurantCalculation(order);
    const adjustments = orderAdjustments(order);
    const relatedSettlements = state.settlements.filter((settlement) =>
        (settlement.entries || []).some((entry) => entry.orderDocId === order.id || entry.orderId === displayOrderId(order))
    );
    setText("detailModalTitle", `Order #${displayOrderId(order)}`);
    $("detailModalContent").innerHTML = `
        <div class="detail-summary">
            <article><small>Status</small><strong>${safeText(orderStatus(order))}</strong></article>
            <article><small>Item + Packaging</small><strong>${money(itemTotal(order) + packagingAmount(order))}</strong></article>
            <article><small>Commission</small><strong>${restaurant.commissionPercent === null ? "MISSING" : `${money(restaurant.commissionAmount)} (${restaurant.commissionPercent}%)`}</strong></article>
            <article><small>Restaurant base</small><strong>${restaurant.basePayout === null ? "BLOCKED" : money(restaurant.basePayout)}</strong></article>
            <article><small>Restaurant</small><strong>${safeText(restaurantName(order))}</strong></article>
            <article><small>Rider</small><strong>${safeText(riderName(order))}</strong></article>
            <article><small>Rider order pay</small><strong>${money(riderOrderPayout(order))}</strong></article>
            <article><small>Payment</small><strong>${safeText(paymentMethod(order))}</strong></article>
        </div>
        <div class="section-heading"><div><p class="section-kicker">ADJUSTMENTS</p><h2>Credit / debit audit trail</h2></div>
            <button class="btn btn-secondary btn-order-adjust" data-order-adjust="${safeText(order.id)}" type="button">+ Add adjustment</button>
        </div>
        <div class="table-wrap">
            ${adjustments.length ? adjustments.map((adjustment) => `<div class="audit-entry">
                <div class="audit-entry-head">
                    <span>${statusBadge(adjustment.direction)} <strong class="${normalizedText(adjustment.direction) === "CREDIT" ? "positive" : "negative"}">${normalizedText(adjustment.direction) === "CREDIT" ? money(adjustment.amount, true) : money(-numberValue(adjustment.amount))}</strong></span>
                    <span class="muted">${safeText(formatDate(adjustment.createdAt, true))}</span>
                </div>
                <p><strong>${safeText(adjustment.adjustmentType || "OTHER")}</strong> · ${safeText(adjustment.remark || "No remark")}</p>
                <p>By ${safeText(adjustment.createdByEmail || adjustment.createdByUid || "Unknown admin")} · ${safeText(adjustment.settlementStatus || "PENDING")}
                    ${adjustment.settlementId ? ` · Settlement ${safeText(adjustment.settlementId)}` : ""}
                    ${adjustment.reversesAdjustmentId ? ` · Reverses ${safeText(adjustment.reversesAdjustmentId)}` : ""}
                    ${adjustment.reversedByAdjustmentId ? ` · Reversed by ${safeText(adjustment.reversedByAdjustmentId)}` : ""}
                </p>
                ${adjustment.reversedByAdjustmentId ? "" : `<button class="btn btn-danger" data-reverse-adjustment="${safeText(adjustment.id)}" type="button">Create reversal</button>`}
            </div>`).join("") : `<div class="audit-entry muted">No adjustment entries.</div>`}
        </div>
        <div class="section-heading" style="margin-top:16px"><div><p class="section-kicker">SETTLEMENTS</p><h2>Related settlements</h2></div></div>
        <div class="table-wrap">
            ${relatedSettlements.length ? relatedSettlements.map((settlement) => `<div class="audit-entry">
                <div class="audit-entry-head"><strong>${safeText(settlement.displayId || settlement.id)}</strong>${statusBadge(settlement.status)}</div>
                <p>${safeText(settlement.beneficiaryType)} · ${safeText(settlement.beneficiaryName || "")} · ${money(settlement.payoutAmount || 0)}</p>
            </div>`).join("") : `<div class="audit-entry muted">Not included in any settlement yet.</div>`}
        </div>`;
    openModal("detailModal");
}

async function editDraftSettlement(settlementId) {
    const settlement = state.settlements.find((item) => item.id === settlementId);
    if (!settlement || normalizedText(settlement.status) !== "DRAFT") {
        toast("Only draft settlements can be edited.", "warning");
        return;
    }

    const type = normalizedText(settlement.beneficiaryType);
    handleMainTab(type);
    state.editingDraftId = settlement.id;
    populateSettlementBeneficiary();
    $("settlementBeneficiary").value = settlement.beneficiaryId || "";
    $("settlementFromDate").value = settlement.dateFrom || "";
    $("settlementToDate").value = settlement.dateTo || "";
    $("settlementOrderSearch").value = "";
    $("settlementOverallRemark").value = settlement.overallRemark || "";
    state.settlementSubTab = settlement.category || settlement.entries?.[0]?.entryType || "DELIVERED";
    all("[data-sub-tab]").forEach((button) => {
        button.classList.toggle("active", button.dataset.subTab === state.settlementSubTab);
    });
    $("saveDraftBtn").textContent = "Update draft";
    $("finalizeSettlementBtn").textContent = "Finalize this draft";
    $("draftEditNotice")?.classList.remove("hidden");
    setText("draftEditNoticeText", `Editing ${settlement.displayId || settlement.id}. Its orders remain reserved until this draft is deleted or finalized.`);

    loadSettlementEntries();
    const draftOrderIds = new Set((settlement.entries || []).map((entry) => String(entry.orderDocId)));
    state.selectedSettlementKeys.clear();
    state.settlementEntries.forEach((entry) => {
        if (draftOrderIds.has(String(entry.orderDocId))) state.selectedSettlementKeys.add(entry.key);
    });
    renderSettlementEntries();
    document.getElementById("settlementWorkspace")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function deleteDraftSettlement(settlementId) {
    const settlement = state.settlements.find((item) => item.id === settlementId);
    if (!settlement || normalizedText(settlement.status) !== "DRAFT") {
        toast("Only draft settlements can be deleted.", "warning");
        return;
    }

    const confirmed = window.confirm(
        `Delete draft ${settlement.displayId || settlement.id}?\n\nIts ${settlement.entryCount || settlement.entries?.length || 0} reserved order(s) will become eligible for settlement again.`
    );
    if (!confirmed) return;

    const settlementRef = doc(db, COLLECTIONS.settlements, settlement.id);
    const type = normalizedText(settlement.beneficiaryType);

    try {
        await runTransaction(db, async (transaction) => {
            const snapshot = await transaction.get(settlementRef);
            if (!snapshot.exists()) throw new Error("Draft no longer exists.");
            const fresh = snapshot.data();
            if (normalizedText(fresh.status) !== "DRAFT") throw new Error("Only a draft can be deleted.");

            const ordersToRelease = [];

// -------- READS --------

for (const entry of fresh.entries || []) {

    const orderRef = doc(db, COLLECTIONS.orders, entry.orderDocId);

    const orderSnapshot = await transaction.get(orderRef);

    if (!orderSnapshot.exists()) continue;

    const order = orderSnapshot.data();

    if (
        String(order[settlementField(type, "DraftSettlementId")] || "") === settlement.id
    ) {
        ordersToRelease.push(orderRef);
    }
}

// -------- WRITES --------

for (const orderRef of ordersToRelease) {

    transaction.update(orderRef, {
        [settlementField(type, "DraftSettlementId")]: deleteField(),
        [settlementField(type, "DraftSettlementStatus")]: deleteField(),
        [settlementField(type, "DraftReservedAt")]: deleteField()
    });

}

transaction.delete(settlementRef);
        });

        if (state.editingDraftId === settlement.id) {
            resetDraftEditing();
            state.selectedSettlementKeys.clear();
            state.settlementLoaded = false;
            state.settlementEntries = [];
            renderSettlementEntries();
        }
        toast("Draft deleted. Its reserved orders are eligible again.", "success", 6000);
    } catch (errorObject) {
        console.error(errorObject);
        toast(`Draft could not be deleted: ${errorObject.message}`, "error", 7000);
    }
}

function settlementPrintableHtml(settlement) {
    const entries = settlement.entries || [];
    const paymentLine = normalizedText(settlement.status) === "PAID"
        ? `
            <div class="print-payment">
                <strong>Payment:</strong>
                ${safeText(settlement.paymentMode || "—")}
                · ${safeText(settlement.paymentDate || "—")}
                · Ref: ${safeText(settlement.paymentReference || "—")}
                ${settlement.paymentRemark ? `· ${safeText(settlement.paymentRemark)}` : ""}
            </div>
        `
        : "";

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>${safeText(settlement.displayId || settlement.id)}</title>
            <style>
                body { font-family: Arial, sans-serif; color:#111827; padding:24px; }
                h1 { margin:0 0 4px; color:#15803d; }
                .sub { color:#64748b; margin-bottom:18px; }
                .summary { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin:16px 0; }
                .summary div { border:1px solid #cbd5e1; border-radius:8px; padding:10px; }
                .summary small { display:block; color:#64748b; margin-bottom:5px; }
                table { width:100%; border-collapse:collapse; margin-top:16px; font-size:12px; }
                th { background:#15803d; color:white; padding:8px; text-align:left; }
                td { border:1px solid #dbe3eb; padding:8px; vertical-align:top; }
                .num { text-align:right; white-space:nowrap; }
                .remark, .print-payment { margin-top:14px; padding:10px; background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; }
                .footer { margin-top:20px; color:#64748b; text-align:center; font-size:11px; }
                @media print { button { display:none!important; } }
            </style>
        </head>
        <body>
            <h1>VeggieGo Settlement</h1>
            <div class="sub">
                ${safeText(settlement.displayId || settlement.id)}
                · ${safeText(settlement.beneficiaryType || "")}
                · ${safeText(settlement.beneficiaryName || settlement.beneficiaryId || "")}
            </div>

            <div class="summary">
                <div><small>Status</small><strong>${safeText(settlement.status || "DRAFT")}</strong></div>
                <div><small>Period</small><strong>${safeText(settlement.dateFrom || "—")} – ${safeText(settlement.dateTo || "—")}</strong></div>
                <div><small>Orders</small><strong>${Number(settlement.entryCount || entries.length || 0)}</strong></div>
                <div><small>Final Payout</small><strong>${money(settlement.payoutAmount || 0)}</strong></div>
                <div><small>Base</small><strong>${money(settlement.baseAmount || 0)}</strong></div>
                <div><small>Credits</small><strong>${money(settlement.creditAmount || 0, true)}</strong></div>
                <div><small>Debits</small><strong>${money(-numberValue(settlement.debitAmount))}</strong></div>
                <div><small>Carry Forward</small><strong>${money(settlement.carryForwardAmount || 0)}</strong></div>
            </div>

            <div class="remark">
                <strong>Overall Remark:</strong>
                ${safeText(settlement.overallRemark || "No remark")}
            </div>

            ${paymentLine}

            <table>
                <thead>
                    <tr>
                        <th>Order</th>
                        <th>Entry</th>
                        <th class="num">Item + Packaging / Base + Surge</th>
                        <th class="num">Commission / Tip</th>
                        <th class="num">Base Payout</th>
                        <th class="num">Credit</th>
                        <th class="num">Debit</th>
                        <th class="num">Net</th>
                        <th>Remark</th>
                    </tr>
                </thead>
                <tbody>
                    ${entries.length ? entries.map((entry) => `
                        <tr>
                            <td>#${safeText(entry.orderId || entry.orderDocId)}</td>
                            <td>${safeText(entry.entryType || "—")}</td>
                            <td class="num">${money(entry.componentAmount || 0)}</td>
                            <td class="num">${entry.deductionAmount === null ? "—" : money(entry.deductionAmount || 0)}</td>
                            <td class="num">${money(entry.baseAmount || 0)}</td>
                            <td class="num">${money(entry.creditAmount || 0, true)}</td>
                            <td class="num">${money(-numberValue(entry.debitAmount))}</td>
                            <td class="num">${money(entry.netAmount || 0)}</td>
                            <td>${safeText(entry.latestRemark || "—")}</td>
                        </tr>
                    `).join("") : `<tr><td colspan="9">No entries.</td></tr>`}
                </tbody>
            </table>

            <div class="footer">
                Generated from VeggieGo Admin Finance & Settlement
            </div>
        </body>
        </html>
    `;
}

function printSettlement(settlementId) {
    const settlement = state.settlements.find((item) => item.id === settlementId);
    if (!settlement) {
        toast("Settlement not found.", "error");
        return;
    }

    const printWindow = window.open("", "_blank", "width=1100,height=800");
    if (!printWindow) {
        toast("Popup was blocked. Allow popups and try again.", "error");
        return;
    }

    printWindow.document.open();
    printWindow.document.write(settlementPrintableHtml(settlement));
    printWindow.document.close();

    printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
    };
}

function saveSettlementPdf(settlementId) {
    toast("Print dialog me Destination → Save as PDF select karein.", "info", 6000);
    printSettlement(settlementId);
}

function showSettlementDetails(settlementId) {
    const settlement = state.settlements.find((item) => item.id === settlementId);
    if (!settlement) return;

    setText("detailModalTitle", settlement.displayId || settlement.id);

    const entries = settlement.entries || [];
    const status = normalizedText(settlement.status || "DRAFT");

    $("detailModalContent").innerHTML = `
        <div class="section-actions" style="justify-content:flex-end;margin-bottom:14px">
            <button
                class="btn btn-secondary"
                data-print-settlement="${safeText(settlement.id)}"
                type="button"
            >
                Print
            </button>

            <button
                class="btn btn-primary"
                data-pdf-settlement="${safeText(settlement.id)}"
                type="button"
            >
                Save PDF
            </button>

            ${
                status === "FINALIZED"
                    ? `
                        <button
                            class="btn btn-success"
                            data-mark-paid="${safeText(settlement.id)}"
                            type="button"
                        >
                            Mark Paid
                        </button>
                    `
                    : ""
            }
        </div>

        <div class="detail-summary">
            <article><small>Partner</small><strong>${safeText(settlement.beneficiaryName || settlement.beneficiaryId)}</strong></article>
            <article><small>Type</small><strong>${safeText(settlement.beneficiaryType || "—")}</strong></article>
            <article><small>Status</small><strong>${safeText(settlement.status || "DRAFT")}</strong></article>
            <article><small>Period</small><strong>${safeText(settlement.dateFrom || "—")} – ${safeText(settlement.dateTo || "—")}</strong></article>
            <article><small>Orders</small><strong>${Number(settlement.entryCount || entries.length || 0)}</strong></article>
            <article><small>Base</small><strong>${money(settlement.baseAmount || 0)}</strong></article>
            <article><small>Credits</small><strong class="positive">${money(settlement.creditAmount || 0, true)}</strong></article>
            <article><small>Debits</small><strong class="negative">${money(-numberValue(settlement.debitAmount))}</strong></article>
            <article><small>Previous carry</small><strong>${money(settlement.carryForwardBefore || 0)}</strong></article>
            <article><small>Final payout</small><strong>${money(settlement.payoutAmount || 0)}</strong></article>
            <article><small>New carry</small><strong>${money(settlement.carryForwardAmount || 0)}</strong></article>
            <article><small>Created</small><strong>${safeText(formatDate(settlement.createdAt, true))}</strong></article>
        </div>

        <p class="inline-alert">
            <strong>Overall remark:</strong>
            ${safeText(settlement.overallRemark || "No remark")}
        </p>

        ${
            status === "PAID"
                ? `
                    <div class="inline-alert">
                        <strong>Payment Record</strong><br>
                        Mode: ${safeText(settlement.paymentMode || "—")}<br>
                        Date: ${safeText(settlement.paymentDate || "—")}<br>
                        Reference: ${safeText(settlement.paymentReference || "—")}<br>
                        Remark: ${safeText(settlement.paymentRemark || "—")}<br>
                        Paid By: ${safeText(settlement.paidByEmail || settlement.paidByUid || "—")}
                    </div>
                `
                : ""
        }

        <div class="table-wrap">
            <table>
                <thead>
                    <tr>
                        <th>Order</th>
                        <th>Entry type</th>
                        <th>Sales / Base+Surge</th>
                        <th>Commission / Tip</th>
                        <th>Base payout</th>
                        <th>Credit</th>
                        <th>Debit</th>
                        <th>Net</th>
                        <th>Remark</th>
                    </tr>
                </thead>

                <tbody>
                    ${
                        entries.length
                            ? entries.map((entry) => `
                                <tr>
                                    <td>
                                        <button
                                            class="order-link"
                                            data-order-detail="${safeText(entry.orderDocId)}"
                                            type="button"
                                        >
                                            #${safeText(entry.orderId)}
                                        </button>
                                    </td>
                                    <td>${safeText(entry.entryType)}</td>
                                    <td>${money(entry.componentAmount || 0)}</td>
                                    <td>${entry.deductionAmount === null ? "—" : money(entry.deductionAmount || 0)}</td>
                                    <td>${money(entry.baseAmount)}</td>
                                    <td class="positive">${money(entry.creditAmount, true)}</td>
                                    <td class="negative">${money(-numberValue(entry.debitAmount))}</td>
                                    <td>${money(entry.netAmount)}</td>
                                    <td>${safeText(entry.latestRemark || "—")}</td>
                                </tr>
                            `).join("")
                            : emptyRow(9, "No entries.")
                    }
                </tbody>
            </table>
        </div>
    `;

    openModal("detailModal");
}
function openPaymentModal(settlementId) {
    const settlement = state.settlements.find((item) => item.id === settlementId);

    if (
        !settlement ||
        normalizedText(settlement.status) !== "FINALIZED"
    ) {
        return;
    }

    $("paymentForm").reset();
    $("paymentSettlementId").value = settlement.id;
    $("paymentDate").value = dateInputValue();

    const referenceInput = $("paymentReference");

    if (
        referenceInput &&
        !$("paymentMode")
    ) {
        const wrapper = document.createElement("label");

        wrapper.className = "field";
        wrapper.innerHTML = `
            <span>Payment Mode *</span>

            <select id="paymentMode" required>
                <option value="">Select payment mode</option>
                <option value="CASH">Cash</option>
                <option value="UPI">UPI / QR</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CHEQUE">Cheque</option>
            </select>
        `;

        referenceInput
            .closest("label, .field")
            ?.before(wrapper);
    }

    setText(
        "paymentModalTitle",
        `Mark ${settlement.displayId || settlement.id} paid`
    );

    closeModal("detailModal");
    openModal("paymentModal");
}

async function markSettlementPaid(event) {
    event.preventDefault();

    const settlementId =
        $("paymentSettlementId").value;

    const paymentMode =
        normalizedText(
            $("paymentMode")?.value || ""
        );

    const reference =
        $("paymentReference").value.trim();

    const paymentDate =
        $("paymentDate").value;

    const paymentRemark =
        $("paymentRemark").value.trim();

    if (!paymentMode) {
        toast(
            "Select payment mode.",
            "error"
        );
        return;
    }

    if (!paymentDate) {
        toast(
            "Payment date is required.",
            "error"
        );
        return;
    }

    const referenceRequired =
        paymentMode !== "CASH";

    if (
        referenceRequired &&
        reference.length < 3
    ) {
        toast(
            "UPI, Bank Transfer aur Cheque ke liye reference/UTR minimum 3 characters ka hona chahiye.",
            "error",
            6500
        );
        return;
    }

    const finalReference =
        referenceRequired
            ? reference
            : (reference || "CASH");

    const settlementRef =
        doc(
            db,
            COLLECTIONS.settlements,
            settlementId
        );

    try {
        await runTransaction(
            db,
            async (transaction) => {

                const snapshot =
                    await transaction.get(
                        settlementRef
                    );

                if (!snapshot.exists()) {
                    throw new Error(
                        "Settlement no longer exists."
                    );
                }

                const settlement =
                    snapshot.data();

                if (
                    normalizedText(
                        settlement.status
                    ) !== "FINALIZED"
                ) {
                    throw new Error(
                        "Only a finalized settlement can be marked paid."
                    );
                }

                transaction.update(
                    settlementRef,
                    {
                        status: "PAID",
                        paymentMode,
                        paymentDate,
                        paymentReference:
                            finalReference,
                        paymentRemark,
                        paidAt:
                            serverTimestamp(),
                        paidByUid:
                            state.user?.uid || "",
                        paidByEmail:
                            state.user?.email || "",
                        updatedAt:
                            serverTimestamp()
                    }
                );

                for (
                    const entry
                    of settlement.entries || []
                ) {

                    if (
                        entry.entryType ===
                        "DELIVERED"
                    ) {
                        const orderRef =
                            doc(
                                db,
                                COLLECTIONS.orders,
                                entry.orderDocId
                            );

                        transaction.update(
                            orderRef,
                            {
                                [settlementField(
                                    settlement.beneficiaryType,
                                    "SettlementStatus"
                                )]: "PAID",

                                [settlementField(
                                    settlement.beneficiaryType,
                                    "PaidAt"
                                )]: serverTimestamp(),

                                [settlementField(
                                    settlement.beneficiaryType,
                                    "SettlementPaymentMode"
                                )]: paymentMode,

                                [settlementField(
                                    settlement.beneficiaryType,
                                    "SettlementPaymentDate"
                                )]: paymentDate,

                                [settlementField(
                                    settlement.beneficiaryType,
                                    "SettlementPaymentReference"
                                )]: finalReference,

                                [settlementField(
                                    settlement.beneficiaryType,
                                    "SettlementPaymentRemark"
                                )]: paymentRemark
                            }
                        );
                    }

                    for (
                        const adjustmentId
                        of entry.adjustmentIds || []
                    ) {
                        transaction.update(
                            doc(
                                db,
                                COLLECTIONS.adjustments,
                                adjustmentId
                            ),
                            {
                                settlementStatus:
                                    "PAID",
                                paidAt:
                                    serverTimestamp()
                            }
                        );
                    }
                }
            }
        );

        closeModal("paymentModal");

        toast(
            `Settlement marked paid via ${paymentMode.replaceAll("_", " ")}.`,
            "success",
            6000
        );

    } catch (errorObject) {
        console.error(errorObject);

        toast(
            `Payment update failed: ${errorObject.message}`,
            "error",
            7000
        );
    }
}

function exportWorkbook(rows, sheetName, fileName) {
    if (!window.XLSX) {
        toast("Excel library has not loaded. Please refresh and try again.", "error");
        return;
    }
    if (!rows.length) {
        toast("There is no filtered data to export.", "warning");
        return;
    }
    const sheet = window.XLSX.utils.json_to_sheet(rows);
    const workbook = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(workbook, sheet, sheetName.slice(0, 31));
    window.XLSX.writeFile(workbook, `${fileName}-${dateInputValue()}.xlsx`);
}

function exportOrders() {
    const rows = filteredOrders().filter(isDelivered).map((order) => {
        const calculation = restaurantCalculation(order);
        const restaurantAdjust = adjustmentTotals(orderAdjustments(order, "RESTAURANT"));
        const riderAdjust = adjustmentTotals(orderAdjustments(order, "RIDER"));
        return {
            "Order ID": displayOrderId(order),
            Date: formatDate(dateOfOrder(order), true),
            Restaurant: restaurantName(order),
            Rider: riderName(order),
            Status: orderStatus(order),
            "Item Total": itemTotal(order),
            Packaging: packagingAmount(order),
            "Commission Base": calculation.commissionBase,
            "Commission %": calculation.commissionPercent ?? "MISSING",
            "Commission Amount": calculation.commissionAmount ?? "",
            "Restaurant Credits": restaurantAdjust.credits,
            "Restaurant Debits": restaurantAdjust.debits,
            "Restaurant Payable": calculation.basePayout === null ? "BLOCKED" : calculation.basePayout + restaurantAdjust.credits - restaurantAdjust.debits,
            "Rider Credits": riderAdjust.credits,
            "Rider Debits": riderAdjust.debits,
            "Rider Payable": riderOrderPayout(order) + riderAdjust.credits - riderAdjust.debits,
            Payment: paymentMethod(order),
            "Restaurant Settlement": order.restaurantSettlementStatus || "PENDING",
            "Rider Settlement": order.riderSettlementStatus || "PENDING"
        };
    });
    exportWorkbook(rows, "Order Finance", "veggiego-order-finance");
}

function exportRestaurantSummary() {
    exportWorkbook(restaurantSummaryRows().map((row) => ({
        Restaurant: row.name,
        "Restaurant ID": row.id || "",
        Orders: row.orders,
        Sales: row.sales,
        Commission: row.missingCommission ? "INCOMPLETE" : row.commission,
        Credits: row.credits,
        Debits: row.debits,
        Payable: row.missingCommission ? "BLOCKED" : row.base + row.credits - row.debits
    })), "Restaurant Summary", "veggiego-restaurant-payable");
}

function exportRiderSummary() {
    exportWorkbook(riderSummaryRows().map((row) => ({
        Rider: row.name,
        "Rider ID": row.id || "",
        Deliveries: row.orders,
        "Base + Surge": row.baseSurge,
        Tip: row.tip,
        Credits: row.credits,
        Debits: row.debits,
        Payable: row.baseSurge + row.tip + row.credits - row.debits
    })), "Rider Summary", "veggiego-rider-earnings");
}

function exportHistory() {
    exportWorkbook(state.settlements.map((settlement) => ({
        "Settlement ID": settlement.displayId || settlement.id,
        Partner: settlement.beneficiaryName || settlement.beneficiaryId,
        Type: settlement.beneficiaryType,
        From: settlement.dateFrom || "",
        To: settlement.dateTo || "",
        Entries: settlement.entryCount || settlement.entries?.length || 0,
        Base: settlement.baseAmount || 0,
        Credits: settlement.creditAmount || 0,
        Debits: settlement.debitAmount || 0,
        "Previous Carry": settlement.carryForwardBefore || 0,
        "Final Payout": settlement.payoutAmount || 0,
        "New Carry": settlement.carryForwardAmount || 0,
        Status: settlement.status,
        "Payment Mode": settlement.paymentMode || "",
        "Payment Reference": settlement.paymentReference || "",
        "Payment Date": settlement.paymentDate || "",
        Remark: settlement.overallRemark || ""
    })), "Settlement History", "veggiego-settlements");
}

function handleMainTab(tab) {
    state.mainTab = tab;
    all("[data-main-tab]").forEach((button) => button.classList.toggle("active", button.dataset.mainTab === tab));
    const history = tab === "HISTORY";
    $("settlementBuilder").classList.toggle("hidden", history);
    $("settlementHistoryView").classList.toggle("hidden", !history);
    if (history) {
        renderSettlementHistory();
        return;
    }
    state.settlementLoaded = false;
    state.settlementEntries = [];
    state.selectedSettlementKeys.clear();
    populateSettlementBeneficiary();
    renderSettlementEntries();
}

function bindEvents() {
    $("logoutBtn")?.addEventListener("click", async () => {
        await signOut(auth);
        window.location.href = "login.html";
    });
    $("datePreset").addEventListener("change", toggleCustomDates);
    $("applyFiltersBtn").addEventListener("click", applyFilters);
    $("resetFiltersBtn").addEventListener("click", resetFilters);
    $("orderReportSearch").addEventListener("input", (event) => {
        state.orderSearch = event.target.value.trim();
        state.orderPage = 1;
        renderOrderReport();
    });
    $("orderPageSize").addEventListener("change", (event) => {
        const value = Number(event.target.value);
        state.orderPageSize = PAGE_SIZES.has(value) ? value : 50;
        state.orderPage = 1;
        renderOrderReport();
    });
    $("orderPrevBtn").addEventListener("click", () => { state.orderPage -= 1; renderOrderReport(); });
    $("orderNextBtn").addEventListener("click", () => { state.orderPage += 1; renderOrderReport(); });

    $("exportOrdersBtn").addEventListener("click", exportOrders);
    $("exportRestaurantsBtn").addEventListener("click", exportRestaurantSummary);
    $("exportRidersBtn").addEventListener("click", exportRiderSummary);
    $("exportHistoryBtn").addEventListener("click", exportHistory);

    all("[data-main-tab]").forEach((button) => button.addEventListener("click", () => handleMainTab(button.dataset.mainTab)));
    all("[data-sub-tab]").forEach((button) => button.addEventListener("click", () => {
        state.settlementSubTab = button.dataset.subTab;
        all("[data-sub-tab]").forEach((item) => item.classList.toggle("active", item === button));
        if (currentBeneficiary()) loadSettlementEntries();
        else renderSettlementEntries();
    }));
    $("settlementBeneficiary").addEventListener("change", () => {
        if (state.editingDraftId) resetDraftEditing();
        state.settlementLoaded = false;
        state.selectedSettlementKeys.clear();
        renderSettlementEntries();
    });
    $("loadSettlementBtn").addEventListener("click", () => loadSettlementEntries());
    $("openAdjustmentBtn").addEventListener("click", () => {
        resetAdjustmentForm();
        openModal("adjustmentModal");
    });
    $("selectAllSettlement").addEventListener("change", (event) => {
        if (event.target.checked) state.settlementEntries.forEach((entry) => state.selectedSettlementKeys.add(entry.key));
        else state.selectedSettlementKeys.clear();
        renderSettlementEntries();
    });
    $("saveDraftBtn").addEventListener("click", saveDraft);
    $("finalizeSettlementBtn").addEventListener("click", finalizeSettlement);

    $("adjustmentOrderId").addEventListener("input", updateAdjustmentPreview);
    $("adjustmentBeneficiaryType").addEventListener("change", updateAdjustmentPreview);
    $("adjustmentForm").addEventListener("submit", saveAdjustment);
    $("paymentForm").addEventListener("submit", markSettlementPaid);
    $("historySearch").addEventListener("input", renderSettlementHistory);
    $("historyStatusFilter").addEventListener("change", renderSettlementHistory);

    all("[data-close-modal]").forEach((button) => button.addEventListener("click", () => closeModal(button.dataset.closeModal)));
    all(".modal").forEach((modal) => modal.addEventListener("click", (event) => {
        if (event.target === modal) closeModal(modal.id);
    }));
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") all(".modal:not(.hidden)").forEach((modal) => closeModal(modal.id));
    });

    document.addEventListener("change", (event) => {
        const checkbox = event.target.closest(".settlement-checkbox");
        if (!checkbox) return;
        if (checkbox.checked) state.selectedSettlementKeys.add(checkbox.dataset.entryKey);
        else state.selectedSettlementKeys.delete(checkbox.dataset.entryKey);
        renderSettlementEntries();
    });

    document.addEventListener("click", (event) => {
        const detailButton = event.target.closest("[data-order-detail]");
        if (detailButton) showOrderDetails(detailButton.dataset.orderDetail);
        const adjustButton = event.target.closest("[data-order-adjust]");
        if (adjustButton) openAdjustmentForOrder(adjustButton.dataset.orderAdjust, adjustButton.dataset.beneficiaryType || "");
        const reverseButton = event.target.closest("[data-reverse-adjustment]");
        if (reverseButton) reverseAdjustment(reverseButton.dataset.reverseAdjustment);
        const viewSettlement = event.target.closest("[data-view-settlement]");
        if (viewSettlement) showSettlementDetails(viewSettlement.dataset.viewSettlement);

        const printSettlementButton = event.target.closest("[data-print-settlement]");
        if (printSettlementButton) printSettlement(printSettlementButton.dataset.printSettlement);

        const pdfSettlementButton = event.target.closest("[data-pdf-settlement]");
        if (pdfSettlementButton) saveSettlementPdf(pdfSettlementButton.dataset.pdfSettlement);

        const editDraft = event.target.closest("[data-edit-draft]");
        if (editDraft) editDraftSettlement(editDraft.dataset.editDraft);
        const deleteDraft = event.target.closest("[data-delete-draft]");
        if (deleteDraft) deleteDraftSettlement(deleteDraft.dataset.deleteDraft);
        const markPaid = event.target.closest("[data-mark-paid]");
        if (markPaid) openPaymentModal(markPaid.dataset.markPaid);
    });
}

function subscribeCollection(key, collectionName, { core = false, optional = false } = {}) {
    return onSnapshot(collection(db, collectionName), (snapshot) => {
        state[key] = snapshot.docs.map((snapshotDoc) => ({ id: snapshotDoc.id, ...snapshotDoc.data() }));
        if (core) {
            state.coreLoaded.add(key);
            if (state.coreLoaded.size >= 3) showLoader(false);
        }
        if (key === "restaurants" || key === "riders") populateEntitySelects();
        renderAll();
    }, (errorObject) => {
        console.error(`${collectionName} subscription failed`, errorObject);
        if (core) {
            state.coreLoaded.add(key);
            if (state.coreLoaded.size >= 3) showLoader(false);
        }
        if (optional) {
            state.collectionAccess[key] = false;
            toast(`Firestore access missing for ${collectionName}. Add admin read/write rules before using this feature.`, "warning", 9000);
        } else {
            toast(`Could not load ${collectionName}: ${errorObject.message}`, "error", 8000);
        }
    });
}

function startRealtimeData() {
    subscribeCollection("orders", COLLECTIONS.orders, { core: true });
    subscribeCollection("restaurants", COLLECTIONS.restaurants, { core: true });
    subscribeCollection("riders", COLLECTIONS.riders, { core: true });
    subscribeCollection("adjustments", COLLECTIONS.adjustments, { optional: true });
    subscribeCollection("settlements", COLLECTIONS.settlements, { optional: true });
    subscribeCollection("settings", COLLECTIONS.settings, { optional: true });
}

function initializeDates() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);
    $("settlementFromDate").value = dateInputValue(thirtyDaysAgo);
    $("settlementToDate").value = dateInputValue(now);
    $("paymentDate").value = dateInputValue(now);
}

function initialize() {
    bindEvents();
    initializeDates();
    toggleCustomDates();
    renderSettlementEntries();
    onAuthStateChanged(auth, (user) => {
        if (!user) return;
        state.user = user;
        startRealtimeData();
    });
}

initialize();