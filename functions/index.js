const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");

admin.initializeApp();

exports.orderStatusNotification = onDocumentUpdated(
    "orders/{orderId}",
    async (event) => {

        const before =
            event.data.before.data();

        const after =
            event.data.after.data();

        if (!before || !after)
            return;

        if (
            before.status ===
            after.status
        ) {
            return;
        }

        let token = "";
        let title = "";
        let body = "";

        // RESTAURANT

        if (
            after.status ===
            "APPROVED"
        ) {

            const restaurantDoc =
                await admin
                    .firestore()
                    .collection(
                        "restaurants"
                    )
                    .doc(
                        after.restaurantId
                    )
                    .get();

            token =
                restaurantDoc.data()
                    ?.fcmToken || "";

            title =
                "🍔 New Order";

            body =
                `${after.customerName} placed an order`;
        }
        // RIDER NOTIFICATION

if (
    after.status ===
    "READY_FOR_PICKUP"
) {

    const ridersSnapshot =

        await admin
            .firestore()
            .collection(
                "riders"
            )
            .where(
                "online",
                "==",
                true
            )
            .get();

    const tokens = [];

    ridersSnapshot.forEach(doc => {

        const rider =
            doc.data();

        if (

            rider.fcmToken &&

            !rider.activeOrderId

        ) {

            tokens.push(
                rider.fcmToken
            );
        }
    });

    if (

        tokens.length > 0

    ) {

        await admin
    .messaging()
    .sendEachForMulticast({

        tokens,

        notification: {

            title:
                "🚚 New Delivery Available",

            body:
                `${after.restaurantName} → ₹${after.deliveryFee || 0}`
        },

        android: {

            priority: "high",

            notification: {

                channelId:
                    "rider_chat",

                sound:
                    "default"
            }
        },

        data: {

            title:
                "🚚 New Delivery Available",

            body:
                `${after.restaurantName} → ₹${after.deliveryFee || 0}`,

            orderId:
                event.params.orderId
        }
    });
    }

    return;
}
        // CUSTOMER

        if (
            after.status ===
            "OUT_FOR_DELIVERY"
        ) {

            const userDoc =
                await admin
                    .firestore()
                    .collection(
                        "users"
                    )
                    .doc(
                        after.userId
                    )
                    .get();

            token =
                userDoc.data()
                    ?.fcmToken || "";

            title =
                "🛵 Order On The Way";

            body =
                "Your order is out for delivery";
        }

        if (
            after.status ===
            "DELIVERED"
        ) {

            const userDoc =
                await admin
                    .firestore()
                    .collection(
                        "users"
                    )
                    .doc(
                        after.userId
                    )
                    .get();

            token =
                userDoc.data()
                    ?.fcmToken || "";

            title =
                "✅ Order Delivered";

            body =
                "Enjoy your food 😎";
        }

        if (!token)
    return;

await admin
    .messaging()
    .send({

        token,

        data: {

    title,
    body,

    orderId:
        event.params.orderId || ""

}
    });

        console.log(
            "Notification Sent"
        );
    }
);