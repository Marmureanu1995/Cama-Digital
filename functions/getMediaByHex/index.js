const { db } = require("../utils/firebaseService");
const axios = require("axios");

exports.getMediaForAppByHex = async (req, res) => {
    try {
        const { hexCode, sendAllureType } = req.query;

        if (!hexCode) {
            return res.status(400).json({ message: "Please provide hexCode" });
        }

        const networkDevicesSnapshot = await db
            .collection("networkDevices")
            .where("hexCode", "==", hexCode)
            .get();

        if (networkDevicesSnapshot.empty) {
            return res.status(404).json({ message: "No network device found" });
        }

        let companyID, playlistID;
        networkDevicesSnapshot.forEach((doc) => {
            companyID = doc.data().companyID;
            playlistID = doc.data().playlistId;
        });

        const companySnapshot = await db.collection("restaurants").doc(companyID).get();

        if (!companySnapshot.exists) {
            return res.status(404).json({ message: "Restaurant not found" });
        }

        const companyData = companySnapshot.data();
        const sanitizedCompanyData = sanitizeCompanyData(companyData);

        const playlistSnapshot = await db
            .collection("restaurants")
            .doc(companyID)
            .collection("playlist")
            .doc(playlistID)
            .get();

        if (!playlistSnapshot.exists) {
            return res.status(404).json({ message: "Playlist not found" });
        }

        const playlistData = playlistSnapshot.data();
        const mediaData = await processMediaData(playlistData.media, sendAllureType, companyID);

        const scheduleSnapshot = await db
            .collection("restaurants")
            .doc(companyID)
            .collection("playlist")
            .doc(playlistID)
            .collection("schedule")
            .get();

        const scheduleData = processScheduleData(scheduleSnapshot);

        const responseObj = {
            playListSchedule: [],
            channel: {
                name: playlistData.name,
                id: playlistID,
                previewTime: playlistData.previewTime,
                playlist: [{ index: "0", playlist_id: playlistID }],
            },
            restaurant: sanitizedCompanyData,
            playlist: [{ index: "0", playlist_id: playlistID, name: playlistData.name, media: mediaData }],
            mediaSchedule: scheduleData,
        };

        return res.status(200).json(responseObj);
    } catch (error) {
        console.error("Error in getMediaByHex:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}
// Helper functions
function sanitizeCompanyData(data) {
    const fieldsToRemove = ["playerLimit", "superAdmin", "path", "pass", "picURL", "confirmPass"];
    fieldsToRemove.forEach((field) => delete data[field]);
    return data;
}

async function processMediaData(media, sendAllureType, companyID) {
    const baseURL = "http://88.222.220.21:3000/v1/compression";
    const processedMedia = [];

    for (const item of media) {
        if (sendAllureType === "true" && item.type === "html" && item.url.includes("allurerealestate.web.app")) {
            try {
                const mediaDoc = await db
                    .collection("restaurants")
                    .doc(companyID)
                    .collection("media")
                    .doc(item.name.split("_")[1])
                    .get();

                if (mediaDoc.exists) {
                    const mediaData = mediaDoc.data();
                    Object.assign(item, {
                        epcValue: mediaData.epcValue,
                        description: mediaData.description,
                        O_Level_Sensitivity: mediaData.O_Level_Sensitivity,
                        epc: mediaData.epc,
                        totalBedRooms: mediaData.totalBedRooms,
                        price: mediaData.price,
                        type: "allure",
                        url: item.pictures[0],
                    });
                    delete item.pictures;
                }
            } catch (error) {
                console.error("Error processing allure media:", error);
            }
        }

        delete item.creationDate;
        delete item.size;
        delete item.path;
        item.duration = item.length;
        delete item.length;

        if (item.type.includes("video")) {
            try {
                const response = await axios.post(`${baseURL}/getInfo`, { url: item.url });
                if (response.status === 200 && !response.data.compressionInProgess) {
                    Object.assign(item, {
                        url: response.data.newUrl,
                        height: 1080,
                        width: 1920,
                    });
                }
            } catch (error) {
                console.error("Error processing video media:", error);
            }
        }

        processedMedia.push(item);
    }

    return processedMedia;
}

function processScheduleData(scheduleSnapshot) {
    const scheduleData = [];

    scheduleSnapshot.forEach((doc) => {
        const data = doc.data();

        if (data.timeFrom && data.timeFrom._seconds) {
            data.timeFrom = new Date(data.timeFrom._seconds * 1000);
        }
        if (data.timeTo && data.timeTo._seconds) {
            data.timeTo = new Date(data.timeTo._seconds * 1000);
        }

        if (data.dateFrom && data.dateFrom._seconds) {
            data.dateFrom = new Date(data.dateFrom._seconds * 1000).toISOString().split("T")[0];
        }
        if (data.dateTo && data.dateTo._seconds) {
            data.dateTo = new Date(data.dateTo._seconds * 1000).toISOString().split("T")[0];
        }

        scheduleData.push(data);
    });

    return scheduleData;
}