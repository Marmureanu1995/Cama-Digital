const { db } = require("../utils/firebaseService");
const moment = require("moment");
const cors = require("cors")({
    origin: true,
});

exports.deviceStatusUpdate = async (req, res) => {
    if (req.method !== "POST") {
        return res.status(403).send("Forbidden: This HTTP method is not allowed");
    }

    return cors(req, res, async () => {
        res.setHeader("Access-Control-Allow-Origin", "*");
        try {
            const data = await saveDataDB(req.body); // Await if deviceStatusUpdate is async
            res.send(data);
        } catch (error) {
            console.log(error);
            res.status(500).send("Internal Server Error");
        }
    });
};


const saveDataDB = async (data) => {
    const { status, hexcode } = data;
    const devicesRef = await db.collection("networkDevices").where("hexCode", "==", hexcode).get();
    if (devicesRef.empty || !devicesRef.docs[0].data()) {
        return { error: "Device not found" };
    }
    const device = devicesRef.docs[0].data();

    if (status === "online") {
        await db.collection("networkDevices").doc(device.id).collection("userstatistics").doc(device.id).set({
            isOnline: true,
            lastOnline: moment().format()
        })
    } else {
        await db.collection("networkDevices").doc(device.id).collection("userstatistics").doc(device.id).set({
            isOnline: false,
            lastOnline: moment().format()
        })
    }
    return { message: "Device status updated" };
};
