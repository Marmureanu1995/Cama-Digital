/* eslint-disable no-unused-vars */
const functions = require("firebase-functions");
const { Storage } = require("@google-cloud/storage");
const path = require("path");
const os = require("os");
const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");
const ffmpeg_static = require("ffmpeg-static");
const ffprobe_static = require("ffprobe-static");
const axios = require("axios");
const parseString = require("xml2js").parseString;
const nodemailer = require("nodemailer");
const admin = require("firebase-admin");
const schedule = require("node-schedule");
const moment = require("moment");
const { db } = require("./utils/firebaseService");
const { companyExpireCronJobHandler } = require("./companyExpiring/companyExpireCronJob");
const { sendEmailSupport } = require("./support/sendSupportemail");
const { getMediaForAppByHex } = require("./getMediaByHex");
const { deviceStatusUpdate } = require("./deviceStatus/deviceStatus");
const cors = require("cors")({
  origin: true,
});


const gcs = new Storage({
  projectId: "mrm1-48e31",
});

const regionalFunctions = functions.region("europe-west1");

/** Compress Firebase Video */

exports.compressVideos = regionalFunctions
  .runWith({
    memory: "256MB",
  })
  .https.onRequest(async (req, res) => {
    try {
      const companiesCollection = db.collection("restaurants");
      const companiesSnapshot = await companiesCollection.get();
      const mediaPromises = [];
      const mediaFiles = [];

      companiesSnapshot.forEach((companyDoc) => {
        const mediaCollection = companyDoc.ref.collection("media");
        const mediaPromise = mediaCollection.get().then((mediaSnapshot) => {
          mediaSnapshot.forEach(async (mediaDoc, index) => {
            const mediaData = mediaDoc.data();
            const MBS = mediaData.size / 1024 / 1024;
            if (
              mediaData.url &&
              mediaData.type.includes("video") &&
              (MBS >= 99 || (mediaData.width > 1920 && mediaData.height > 1080))
            ) {
              mediaFiles.push({
                url: mediaData.url,
                height: mediaData.height,
                width: mediaData.width,
              });
            }
          });
        });
        mediaPromises.push(mediaPromise);
      });

      await Promise.all(mediaPromises);

      res.status(200).send(mediaFiles);
    } catch (error) {
      console.error("Error:", error);
      res.status(500).send("An error occurred.");
    }
  });

/**
 * FUNCTION FOR EXTRACTING VIDEO INFORMATION
 */

exports.getVideoInformation = regionalFunctions.storage
  .object()
  .onFinalize(async (object) => {
    const fileBucket = object.bucket; // The Storage bucket that contains the file.
    const filePath = object.name; // File path in the bucket.
    const contentType = object.contentType; // File content type.
    console.log(filePath);
    if (!filePath.includes("mediafiles")) {
      console.log("File is not media");
      return;
    }

    const companyID = object.metadata.companyID.trim();
    const mediaID = object.metadata.mediaID.trim();
    console.log(companyID, mediaID);

    // Exit if this is triggered on a file that is not an audio.
    if (!contentType.startsWith("video/")) {
      console.log("This is not a video.");
      return null;
    }

    let loop = true;
    while (loop) {
      await db
        .collection("restaurants")
        .doc(companyID)
        .collection("media")
        .doc(mediaID)
        .get()
        .then(async (QueryDocumentSnapshot) => {
          if (QueryDocumentSnapshot.exists) {
            loop = false;
            const doc = QueryDocumentSnapshot.data();
            console.log("DOC DATA IS ", doc.url);
            let baseURL =
              "http://88.222.220.21:3000/v1/compression/getCompressedURL";
            let apiUrl = `${baseURL}`;
            let body = {
              url: doc.url,
              height: doc.height,
              width: doc.width,
            };

            return new Promise((resolve, reject) => {
              axios
                .post(apiUrl, body)
                .then((response) => {
                  console.log(response.status);
                  if (response.status == 200) {
                    console.log("RESOLVED...");
                    resolve();
                  }
                })
                .catch((error) => {
                  reject(error);
                });
            });
          } else {
            console.error("Does not exist");
          }
        })
        .catch((error) => {
          console.log(error.message);
        });
    }
  });

exports.setVideoInformation = regionalFunctions
  .runWith({
    memory: "256MB",
  })
  .https.onRequest((req, res) => {
    try {
      const mediaObj = req.body;

      const companyID = mediaObj.companyID;
      const length = mediaObj.length;
      const mediaID = mediaObj.mediaID;
      const height = mediaObj.height;
      const width = mediaObj.width;

      var mediaRef = db
        .collection("restaurants")
        .doc(companyID)
        .collection("media")
        .doc(mediaID);

      console.log({
        mediaObj,
      });

      mediaRef
        .update(
          {
            length: length,
            width: width,
            height: height,
          },
          {
            merge: true,
          }
        )
        .then(() => {
          res.send({
            message: "updated",
          });
        });
    } catch (err) {
      console.log("Error", err);
      res.send(err);
      return err;
    }
  });

exports.getImageInformation = regionalFunctions.storage
  .object()
  .onFinalize(async (object) => {
    const fileBucket = object.bucket; // The Storage bucket that contains the file.
    const filePath = object.name; // File path in the bucket.
    const contentType = object.contentType; // File content type.
    console.log(filePath);
    if (!filePath.includes("mediafiles")) {
      console.log("File is not media");
      return;
    }
    const companyID = object.metadata.companyID;
    var mediaRef = db
      .collection("restaurants")
      .doc(companyID)
      .collection("media")
      .doc(object.metadata.mediaID);

    // Exit if this is triggered on a file that is not an audio.
    if (!contentType.startsWith("image/")) {
      console.log("This is not a image.");
      return null;
    }

    console.log(ffprobe_static.path);

    // Get the file name.
    const fileName = filePath.split("/").pop();

    // Download file from bucket.
    const bucket = gcs.bucket(fileBucket);
    const tempFilePath = path.join(os.tmpdir(), fileName);

    await bucket.file(filePath).download({
      destination: tempFilePath,
    });
    console.log("image downloaded locally to", tempFilePath);

    ffmpeg.setFfmpegPath(ffmpeg_static.path);
    ffmpeg.setFfprobePath(ffprobe_static.path);

    // Makes an ffmpeg command return a promise.
    function promisifyCommand() {
      return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(tempFilePath, function (err, metadata) {
          if (err) {
            reject(err);
          } else {
            console.log(
              "fileName includes _thumbnail:",
              fileName.includes("_thumbnail")
            );
            if (!fileName.includes("_thumbnail") && metadata) {
              var duration = metadata.format.duration;
              console.log(duration);
              // console.log(metadata.streams[0].width);
              // console.log(metadata.streams[0].height);
              var setWithOptions = mediaRef.set(
                {
                  length: "" + 10,
                  width: metadata.streams[0].width,
                  height: metadata.streams[0].height,
                },
                {
                  merge: true,
                }
              );
              // console.log(metadata);
              resolve();
            } else {
              reject();
            }
          }
        });
      });
    }

    await promisifyCommand().then(() => {
      fs.unlinkSync(tempFilePath);
    });
    //console.log(command);

    // Once the information of video has been stored delete the local file to free up disk space.

    return console.log("Temporary files removed.", tempFilePath);
  });

/**
 * FUNCTION TO GET MULTIPLE PLAYLIST BY ID's
 */

// CORS Express middleware to enable CORS Requests.

exports.getchannelplaylists = regionalFunctions
  .runWith({
    memory: "256MB",
  })
  .https.onRequest((req, res) => {
    // Forbidding PUT requests.
    if (req.method === "PUT") {
      return res.status(403).send("Forbidden!");
    }
    let channelID = req.query.channelID;
    let companyID = req.query.companyID;
    // Reading id from request body query parameter
    if (!channelID) {
      console.log("hello");
      channelID = req.body.channelID;
      companyID = req.body.companyID;
    }

    // Enable CORS using the `cors` express middleware.
    return cors(req, res, () => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      var channelRef = db
        .collection("restaurants")
        .doc(companyID)
        .collection("channel")
        .doc(channelID);
      return new Promise((resolve, reject) => {
        channelRef
          .get()
          .then((doc) => {
            if (!doc.exists) {
              console.log("No such document!");
            } else {
              console.log("Document data:", doc.data());

              let ids = [];
              let path = "playlist";

              for (let playlist of doc.data().playlist) {
                /*var item = {
                                id : playlist.playlist_id
                            };*/

                ids.push(playlist.playlist_id);
              }

              console.log(ids);

              getPlaylists(path, ids);
            }
            resolve();
          })
          .catch((err) => {
            console.log("Error getting document", err);
            reject(err);
          });
      });
      async function getPlaylists(path, playlistIds) {
        // console.log(playlistIds);
        var playlists;
        const refs = playlistIds.map((id) =>
          db.collection("restaurants").doc(companyID).collection("playlist").doc(id)
        );
        // console.log(`${JSON.stringify(refs)}`);
        await db.getAll(...refs).then((docs) => {
          console.log(`${JSON.stringify(docs[0])}`);
          playlists = docs;
          res.status(200).json(playlists);
        });
      }
    });
  });


exports.addUser = regionalFunctions
  .runWith({
    memory: "256MB",
  })
  .https.onRequest((req, res) => {
    // Enable CORS
    cors(req, res, () => {
      // Forbidding PUT requests.
      if (req.method === "PUT") {
        return res.status(403).send("Forbidden!");
      }

      let email = req.query.email;
      let pass = req.query.pass;
      let name = req.query.name;
      console.log(email + " " + pass);

      // Reading id from request body query parameter
      if (!email) {
        console.log("helllo");
        email = req.body.email;
        pass = req.body.pass;
        name = req.body.name;
        console.log(email + " " + pass + " " + name);
      }

      return new Promise((resolve, reject) => {
        admin
          .auth()
          .createUser({
            email: email,
            password: pass,
            displayName: name,
            disabled: false,
          })
          .then(function (userRecord) {
            // See the UserRecord reference doc for the contents of userRecord.
            console.log("Successfully created new user:", userRecord.uid);
            res.status(200).json(userRecord);
          })
          .catch(function (error) {
            console.log("Error creating new user:", error);
            res.status(400).json(error);
          });
      });
    });
  });
exports.deleteAuthentication = regionalFunctions
  .runWith({
    memory: "256MB",
  })
  .https.onRequest((req, res) => {
    // Forbidding PUT requests.
    if (req.method === "PUT") {
      return res.status(403).send("Forbidden!");
    }

    let email = req.query.email;
    console.log(email);

    // Reading id from request body query parameter
    if (!email) {
      console.log("helllo");
      email = req.body.email;
      console.log(email);
    }

    // Enable CORS using the `cors` express middleware.
    return cors(req, res, () => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      return new Promise((resolve, reject) => {
        admin
          .auth()
          .getUserByEmail(email)
          .then(async function (userRecord) {
            // See the UserRecord reference doc for the contents of userRecord.
            console.log(
              "Successfully fetched user data using email:",
              userRecord.toJSON()
            );

            await admin
              .auth()
              .deleteUser(userRecord.uid)
              .then(() => {
                console.log("Successfully deleted user");
                res.status(200).json("delete success");
              })
              .catch(function (error) {
                console.log("Error fetching user data:", error);
                res.status(400).json("delete failure");
              });
          })
          .catch(function (error) {
            console.log("Error fetching user data:", error);
            res.status(400).json("data fetch failure");
          });
      });
    });
  });

exports.changePass = regionalFunctions
  .runWith({
    memory: "256MB",
  })
  .https.onRequest((req, res) => {
    // Forbidding PUT requests.
    if (req.method === "PUT") {
      return res.status(403).send("Forbidden!");
    }

    let email = req.query.email;
    let pass = req.query.pass;
    console.log(email);
    console.log(pass);

    // Reading id from request body query parameter
    if (!email) {
      console.log("helllo");
      email = req.body.email;
      pass = req.body.pass;
      console.log(email);
      console.log(pass);
    }

    // Enable CORS using the `cors` express middleware.
    return cors(req, res, () => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      return new Promise((resolve, reject) => {
        admin
          .auth()
          .getUserByEmail(email)
          .then(async function (userRecord) {
            // See the UserRecord reference doc for the contents of userRecord.
            console.log(
              "Successfully fetched user data using email:",
              userRecord.toJSON()
            );

            await admin
              .auth()
              .updateUser(userRecord.uid, {
                password: pass,
              })
              .then(function (userRecord) {
                // See the UserRecord reference doc for the contents of userRecord.
                console.log("Successfully updated user", userRecord.toJSON());
                res.status(200).json("pass change success");
              })
              .catch(function (error) {
                res.status(400).json("pass change failure");
                console.log("Error updating user:", error);
              });
          })
          .catch(function (error) {
            console.log("Error fetching user data:", error);
            res.status(400).json("data fetch failure");
          });
      });
    });
  });

exports.getWeather = regionalFunctions
  .runWith({
    memory: "256MB",
  })
  .https.onRequest(async (req, res) => {
    if (req.method === "PUT") {
      return res.status(403).send("Forbidden!");
    }
    console.log("query", req.query);
    var requestParams = req.query;
    return cors(req, res, () => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      return new Promise(async (resolve, reject) => {
        await db
          .collection("weather")
          .where("region", "==", requestParams.region)
          .where("units", "==", requestParams.units)
          .limit(1)
          .get()
          .then(async (r) => {
            if (r.empty) {
              await getWeatherAPI(requestParams, "Add", 0).then((result) => {
                console.log("result", result);
                res.setHeader("Access-Control-Allow-Origin", "*");
                res.status(200).json(result);
                resolve();
              });
            } else {
              r.forEach((doc) => {
                var hours =
                  Math.abs(
                    new Date(Date.now()) - new Date(doc.data().createdDate)
                  ) / 36e5;
                if (hours < 1) {
                  res.status(200).json(doc.data().apiResponse);
                  resolve();
                } else {
                  console.log("resetting the weather");
                  console.log(requestParams);
                  getWeatherAPI(requestParams, "update", doc.id).then(
                    (data) => {
                      res.setHeader("Access-Control-Allow-Origin", "*");
                      res.status(200).json(data);
                      resolve();
                    }
                  );
                }
              });
            }
          });
      });
    });
  });




function getWeatherAPI(requestParams, requestType, id) {
  return new Promise((resolve, reject) => {
    console.log(requestParams);
    var params = {
      access_key: "3cb35003ebe53b4c4f54ea5f86409a79",
      query: requestParams.region,
      forecast_days: 5,
      hourly: 1,
      units: requestParams.units,
    };
    axios
      .get("https://api.weatherstack.com/forecast", {
        params,
      })
      .then((response) => {
        var apiResponseData = response.data;
        var dbStore = {
          apiResponse: apiResponseData,
          region: requestParams.region,
          createdDate: Date.now(),
          units: requestParams.units,
        };
        if (requestType == "Add") {
          db.collection("weather").doc().create(dbStore);
        } else {
          db.collection("weather").doc(id).update(dbStore);
        }
        console.log("getWeatherAPI, apiResponseData", apiResponseData);
        resolve(apiResponseData);
      })
      .catch((error) => {
        reject(error);
      });
  });
}

function updateSyncTime(channelID) {
  db.collection("syncDevices")
    .doc(channelID)
    .get()
    .then((QueryDocumentSnapshot) => {
      if (QueryDocumentSnapshot.exists) {
        db.collection("syncDevices").doc(channelID).update({
          channelID: channelID,
          lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        });
      } else {
        db.collection("syncDevices").doc(channelID).set({
          channelID: channelID,
          lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    })
    .catch((error) => {
      console.log(error.message);
    });
}

exports.resetUserPassword = regionalFunctions
  .runWith({
    memory: "256MB",
  })
  .https.onRequest(async (req, res) => {
    if (Object.keys(req.query).length == 0) {
      res.status(400).json("Please provide Email and Password");
      return;
    } else if (
      req.query.email == undefined ||
      req.query.password == undefined
    ) {
      res.status(400).json("Please provide Email and Password");
      return;
    }

    let email, password;
    email = req.query.email;
    password = req.query.password;

    return cors(req, res, async () => {
      await db
        .collection("users")
        .where("email", "==", email)
        .get()
        .then((userDoc) => {
          if (userDoc.size > 0) {
            db.collection("users")
              .doc(userDoc.docs[0].data().id)
              .update({
                pass: password,
                confirmPass: password,
              })
              .then(() => {
                return cors(req, res, () => {
                  res.setHeader("Access-Control-Allow-Origin", "*");

                  admin
                    .auth()
                    .getUserByEmail(email)
                    .then(async (userRecord) => {
                      await admin
                        .auth()
                        .updateUser(userRecord.uid, {
                          password: password,
                        })
                        .then(async (userRecord) => {
                          await db
                            .collection("restaurants")
                            .where("email", "==", email)
                            .get()
                            .then((companyDoc) => {
                              if (companyDoc.size > 0) {
                                db.collection("restaurants")
                                  .doc(companyDoc.docs[0].data().id)
                                  .update({
                                    pass: password,
                                    confirmPass: password,
                                  });
                              }
                            })
                            .catch((err) => {
                              res.status(400).json("Password change failure");
                            });
                          res.status(200).json("Password Updated Successfully");
                        })
                        .catch((error) => {
                          res.status(400).json("Password change failure");
                        });
                    })
                    .catch(function (error) {
                      res
                        .status(400)
                        .json(
                          "Error getting user against the corresponding email"
                        );
                    });
                });
              });
          } else {
            res.status(400).json("No User Record Found");
          }
        })
        .catch((err) => {
          res.status(400).json("No User Record Found");
          res.end();
        });
    });
  });

exports.sendChangePasswordEmail = regionalFunctions
  .runWith({
    memory: "256MB",
  })
  .https.onRequest(async (req, res) => {
    if (Object.keys(req.query).length == 0) {
      res.status(200).json("Please provide Email");
      return;
    } else if (req.query.email == undefined) {
      res.status(200).json("Please provide Email");
      return;
    }

    let email = req.query.email;

    return cors(req, res, async () => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      let html = `<!doctype html><html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office"><head><meta charset="UTF-8"><meta http-equiv="X-UA-Compatible" content="IE=edge"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Reset Your Invixible Password</title><link href='https://fonts.googleapis.com/css?family=Asap:400,400italic,700,700italic' rel='stylesheet' type='text/css'><style type="text/css">@media only screen and (min-width:768px){.templateContainer{width: 600px !important;}}@media only screen and (max-width: 480px){body,table,td,p,a,li,blockquote{-webkit-text-size-adjust: none !important;}}@media only screen and (max-width: 480px){body{width: 100% !important;min-width: 100% !important;}}@media only screen and (max-width: 480px){#bodyCell{padding-top: 10px !important;}}@media only screen and (max-width: 480px){.mcnImage{width: 100% !important;}}@media only screen and (max-width: 480px){.mcnCaptionTopContent,.mcnCaptionBottomContent,.mcnTextContentContainer,.mcnBoxedTextContentContainer,.mcnImageGroupContentContainer,.mcnCaptionLeftTextContentContainer,.mcnCaptionRightTextContentContainer,.mcnCaptionLeftImageContentContainer,.mcnCaptionRightImageContentContainer,.mcnImageCardLeftTextContentContainer,.mcnImageCardRightTextContentContainer{max-width: 100% !important;width: 100% !important;}}@media only screen and (max-width: 480px){.mcnBoxedTextContentContainer{min-width: 100% !important;}}@media only screen and (max-width: 480px){.mcnImageGroupContent{padding: 9px !important;}}@media only screen and (max-width: 480px){.mcnCaptionLeftContentOuter .mcnTextContent,.mcnCaptionRightContentOuter .mcnTextContent{padding-top: 9px !important;}}@media only screen and (max-width: 480px){.mcnImageCardTopImageContent,.mcnCaptionBlockInner .mcnCaptionTopContent:last-child .mcnTextContent{padding-top: 18px !important;}}@media only screen and (max-width: 480px){.mcnImageCardBottomImageContent{padding-bottom: 9px !important;}}@media only screen and (max-width: 480px){.mcnImageGroupBlockInner{padding-top: 0 !important;padding-bottom: 0 !important;}}@media only screen and (max-width: 480px){.mcnImageGroupBlockOuter{padding-top: 9px !important;padding-bottom: 9px !important;}}@media only screen and (max-width: 480px){.mcnTextContent,.mcnBoxedTextContentColumn{padding-right: 18px !important;padding-left: 18px !important;}}@media only screen and (max-width: 480px){.mcnImageCardLeftImageContent,.mcnImageCardRightImageContent{padding-right: 18px !important;padding-bottom: 0 !important;padding-left: 18px !important;}}@media only screen and (max-width: 480px){.mcpreview-image-uploader{display: none !important;width: 100% !important;}}@media only screen and (max-width: 480px){/* @tab Mobile Styles @section Heading 1 @tip Make the first-level headings larger in size for better readability on small screens. */h1{/*@editable*/font-size: 20px !important;/*@editable*/line-height: 150% !important;}}@media only screen and (max-width: 480px){/* @tab Mobile Styles @section Heading 2 @tip Make the second-level headings larger in size for better readability on small screens. */h2{/*@editable*/font-size: 20px !important;/*@editable*/line-height: 150% !important;}}@media only screen and (max-width: 480px){/* @tab Mobile Styles @section Heading 3 @tip Make the third-level headings larger in size for better readability on small screens. */h3{/*@editable*/font-size: 18px !important;/*@editable*/line-height: 150% !important;}}@media only screen and (max-width: 480px){/* @tab Mobile Styles @section Heading 4 @tip Make the fourth-level headings larger in size for better readability on small screens. */h4{/*@editable*/font-size: 16px !important;/*@editable*/line-height: 150% !important;}}@media only screen and (max-width: 480px){/* @tab Mobile Styles @section Boxed Text @tip Make the boxed text larger in size for better readability on small screens. We recommend a font size of at least 16px. */.mcnBoxedTextContentContainer .mcnTextContent,.mcnBoxedTextContentContainer .mcnTextContent p{/*@editable*/font-size: 16px !important;/*@editable*/line-height: 150% !important;}}@media only screen and (max-width: 480px){/* @tab Mobile Styles @section Preheader Visibility @tip Set the visibility of the email's preheader on small screens. You can hide it to save space. */#templatePreheader{/*@editable*/display: block !important;}}@media only screen and (max-width: 480px){/* @tab Mobile Styles @section Preheader Text @tip Make the preheader text larger in size for better readability on small screens. */#templatePreheader .mcnTextContent,#templatePreheader .mcnTextContent p{/*@editable*/font-size: 12px !important;/*@editable*/line-height: 150% !important;}}@media only screen and (max-width: 480px){/* @tab Mobile Styles @section Header Text @tip Make the header text larger in size for better readability on small screens. */#templateHeader .mcnTextContent,#templateHeader .mcnTextContent p{/*@editable*/font-size: 16px !important;/*@editable*/line-height: 150% !important;}}@media only screen and (max-width: 480px){/* @tab Mobile Styles @section Body Text @tip Make the body text larger in size for better readability on small screens. We recommend a font size of at least 16px. */#templateBody .mcnTextContent,#templateBody .mcnTextContent p{/*@editable*/font-size: 16px !important;/*@editable*/line-height: 150% !important;}}@media only screen and (max-width: 480px){/* @tab Mobile Styles @section Footer Text @tip Make the footer content text larger in size for better readability on small screens. */#templateFooter .mcnTextContent,#templateFooter .mcnTextContent p{/*@editable*/font-size: 12px !important;/*@editable*/line-height: 150% !important;}}</style></head><body style="-ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; background-color: #ffffff; height: 100%; margin: 0; padding: 0; width: 100%"><center><table align="center" border="0" cellpadding="0" cellspacing="0" height="100%" id="bodyTable" style="border-collapse: collapse; mso-table-lspace: 0; mso-table-rspace: 0; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; background-color: #F2F2F2; height: 100%; margin: 0; padding: 0; width: 100%" width="100%"><tr><td align="center" id="bodyCell" style="mso-line-height-rule: exactly; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; border-top: 0; height: 100%; margin: 0; padding: 0; width: 100%" valign="top"><table border="0" cellpadding="0" cellspacing="0" class="templateContainer" style="border-collapse: collapse; mso-table-lspace: 0; mso-table-rspace: 0; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; max-width: 600px; border: 0" width="100%"><tr><td id="templatePreheader" style="border-top-left-radius:25px; border-top-right-radius:25px; mso-line-height-rule: exactly; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; background-color: #595CA9; border-top: 0; border-bottom: 0; padding-top: 16px; padding-bottom: 8px" valign="top"><table border="0" cellpadding="0" cellspacing="0" class="mcnTextBlock" style="border-collapse: collapse; mso-table-lspace: 0; mso-table-rspace: 0; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; min-width:100%;" width="100%"><tbody class="mcnTextBlockOuter"><tr><td class="mcnTextBlockInner" style="mso-line-height-rule: exactly; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%" valign="top"><table align="left" border="0" cellpadding="0" cellspacing="0" class="mcnTextContentContainer" style="border-collapse: collapse; mso-table-lspace: 0; mso-table-rspace: 0; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; min-width:100%;" width="100%"><tbody><tr><td class="mcnTextContent" style='mso-line-height-rule: exactly; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; word-break: break-word; color: #2a2a2a; bcakground: #e3e3e3 ; font-family: "Asap", Helvetica, sans-serif; font-size: 12px; line-height: 150%; text-align: left; padding-top:9px; padding-right: 18px; padding-bottom: 9px; padding-left: 18px;' valign="top"><a href="" style="mso-line-height-rule: exactly; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; color: #2a2a2a; font-weight: normal; text-decoration: none" target="_blank"><h2 style="color: #ffffff; font-size: 2.5vw; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; text-align: center;">Invixible</h2></a></td></tr></tbody></table></td></tr></tbody></table></td></tr><tr><td id="templateHeader" style="mso-line-height-rule: exactly; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; background-color: #e3e3e3; border-top: 0; border-bottom: 0; padding-top: 16px; padding-bottom: 0" valign="top"><table border="0" cellpadding="0" cellspacing="0" class="mcnImageBlock" style="border-collapse: collapse; mso-table-lspace: 0; mso-table-rspace: 0; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; min-width:100%;" width="100%"><tbody class="mcnImageBlockOuter"><tr><td class="mcnImageBlockInner" style="mso-line-height-rule: exactly; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; padding:0px" valign="top"><table align="left" border="0" cellpadding="0" cellspacing="0" class="mcnImageContentContainer" style="border-collapse: collapse; mso-table-lspace: 0; mso-table-rspace: 0; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; min-width:100%;" width="100%"><tbody><tr><td class="mcnImageContent" style="mso-line-height-rule: exactly; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; padding-right: 0px; padding-left: 0px; padding-top: 0; padding-bottom: 0; text-align:center;" valign="top"><a class="" href="" style="mso-line-height-rule: exactly; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; color: #595CA9; font-weight: normal; text-decoration: none" target="_blank" title=""><a class="" href="" style="mso-line-height-rule: exactly; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; color: #595CA9; font-weight: normal; text-decoration: none" target="_blank" title=""> <img align="center" alt="Forgot your password?" class="mcnImage" src="https://socialapi.solissol.com/api/v1/en/media-upload/mediaFiles/123/123/59e92e8d18c26e7c31767a10f056e63c.png" style="-ms-interpolation-mode: bicubic; border: 0; height: auto; outline: none; text-decoration: none; vertical-align: bottom; max-width:1200px; padding-bottom: 0; display: inline !important; vertical-align: bottom;" width="600"></img></a></a></td></tr></tbody></table></td></tr></tbody></table></td></tr><tr><td id="templateBody" style="mso-line-height-rule: exactly; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; background-color: #f7f7ff; border-top: 0; border-bottom: 0; padding-top: 0; padding-bottom: 0" valign="top"><table border="0" cellpadding="0" cellspacing="0" class="mcnTextBlock" style="border-collapse: collapse; mso-table-lspace: 0; mso-table-rspace: 0; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; min-width:100%;" width="100%"><tbody class="mcnTextBlockOuter"><tr><td class="mcnTextBlockInner" style="mso-line-height-rule: exactly; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%" valign="top"><table align="left" border="0" cellpadding="0" cellspacing="0" class="mcnTextContentContainer" style="border-collapse: collapse; mso-table-lspace: 0; mso-table-rspace: 0; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; min-width:100%;" width="100%"><tbody><tr><td class="mcnTextContent" style='mso-line-height-rule: exactly; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; background-color:#e3e3e3; word-break: break-word; color: #2a2a2a; font-family: "Asap", Helvetica, sans-serif; font-size: 16px; line-height: 150%; text-align: center; padding-top:9px; padding-right: 18px; padding-bottom: 9px; padding-left: 18px;' valign="top"><h1 class="null" style='color: #2a2a2a; font-family: "Asap", Helvetica, sans-serif; font-size: 32px; font-style: normal; font-weight: bold; line-height: 125%; letter-spacing: 2px; text-align: center; display: block; margin: 0; padding: 0'><span style="text-transform:uppercase">Forgot</span></h1><h2 class="null" style='color: #2a2a2a; font-family: "Asap", Helvetica, sans-serif; font-size: 24px; font-style: normal; font-weight: bold; line-height: 125%; letter-spacing: 1px; text-align: center; display: block; margin: 0; padding: 0'><span style="text-transform:uppercase">your password?</span></h2> </td></tr></tbody></table></td></tr></tbody></table><table border="0" cellpadding="0" cellspacing="0" class="mcnTextBlock" style="border-collapse: collapse; mso-table-lspace: 0; mso-table-rspace: 0; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; min-width:100%;" width="100%"><tbody class="mcnTextBlockOuter"><tr><td class="mcnTextBlockInner" style="mso-line-height-rule: exactly; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%" valign="top"><table align="left" border="0" cellpadding="0" cellspacing="0" class="mcnTextContentContainer" style="border-collapse: collapse; mso-table-lspace: 0; mso-table-rspace: 0; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; min-width:100%;" width="100%"><tbody><tr><td class="mcnTextContent" style='mso-line-height-rule: exactly; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; word-break: break-word; background: #e3e3e3; color: #2a2a2a; font-family: "Asap", Helvetica, sans-serif; font-size: 16px; line-height: 150%; text-align: center; padding-top:9px; padding-right: 18px; padding-bottom: 9px; padding-left: 18px;' valign="top">Not to worry, we got you! Let’s get you a new password.<br></br></td></tr></tbody></table></td></tr></tbody></table><table border="0" cellpadding="0" cellspacing="0" class="mcnButtonBlock" style="border-collapse: collapse; mso-table-lspace: 0; mso-table-rspace: 0; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; min-width:100%;" width="100%"><tbody class="mcnButtonBlockOuter"><tr><td align="center" class="mcnButtonBlockInner" style="mso-line-height-rule: exactly; background: #e3e3e3; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; padding-top:18px; padding-right:18px; padding-bottom:18px; padding-left:18px;" valign="top"><table border="0" cellpadding="0" cellspacing="0" class="mcnButtonBlock" style="border-collapse: collapse; mso-table-lspace: 0; mso-table-rspace: 0; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; min-width:100%;" width="100%"><tbody class="mcnButtonBlockOuter"><tr><td align="center" class="mcnButtonBlockInner" style="mso-line-height-rule: exactly; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; padding-top:0; padding-right:18px; padding-bottom:18px; padding-left:18px;" valign="top"><table border="0" cellpadding="0" cellspacing="0" class="mcnButtonContentContainer" style="border-collapse: collapse; mso-table-lspace: 0; mso-table-rspace: 0; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; border-collapse: separate !important;border-radius: 48px;background-color: #595CA9;"><tbody><tr><td align="center" class="mcnButtonContent" style="mso-line-height-rule: exactly; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; font-family: 'Asap', Helvetica, sans-serif; font-size: 16px; padding-top:24px; padding-right:48px; padding-bottom:24px; padding-left:48px;" valign="middle"> <a class="mcnButton" href= "https://beta.exposportmedia.net/auth/reset-password?email=${email}"  style="mso-line-height-rule: exactly; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; display: block; color: #595CA9; font-weight: normal; text-decoration: none; font-weight: normal;letter-spacing: 1px;line-height: 100%;text-align: center;text-decoration: none;color: #FFFFFF; text-transform:uppercase;" target="_blank" title="Review Lingo kit invitation">Reset password</a> </td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table><table border="0" cellpadding="0" cellspacing="0" class="mcnImageBlock" style="border-collapse: collapse; mso-table-lspace: 0; mso-table-rspace: 0; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; min-width:100%;" width="100%"><tbody class="mcnImageBlockOuter"><tr><td class="mcnImageBlockInner" style="mso-line-height-rule: exactly; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; padding:0px" valign="top"><table align="left" border="0" cellpadding="0" cellspacing="0" class="mcnImageContentContainer" style="border-collapse: collapse; mso-table-lspace: 0; mso-table-rspace: 0; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; min-width:100%;" width="100%"><tbody><tr><td class="mcnImageContent" style="mso-line-height-rule: exactly; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; padding-right: 0px; padding-left: 0px; padding-top: 0; padding-bottom: 0; text-align:center;" valign="top"></td></tr></tbody></table></td></tr></tbody></table></td></tr></table></td></tr></table></center></body></html>`;

      let reqBaseUrl = req.protocol + "://" + req.get("host") + req.originalUrl;
      reqBaseUrl += `auth/reset-password?email=${email}`;
      // let html = `<!doctype html><html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office"><head><meta charset="UTF-8"><meta http-equiv="X-UA-Compatible" content="IE=edge"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Reset Your Invixible Password</title><link href='https://fonts.googleapis.com/css?family=Asap:400,400italic,700,700italic' rel='stylesheet' type='text/css'><style type="text/css">@media only screen and (min-width:768px){.templateContainer{width: 600px !important;}}@media only screen and (max-width: 480px){body,table,td,p,a,li,blockquote{-webkit-text-size-adjust: none !important;}}@media only screen and (max-width: 480px){body{width: 100% !important;min-width: 100% !important;}}@media only screen and (max-width: 480px){#bodyCell{padding-top: 10px !important;}}@media only screen and (max-width: 480px){.mcnImage{width: 100% !important;}}@media only screen and (max-width: 480px){.mcnCaptionTopContent,.mcnCaptionBottomContent,.mcnTextContentContainer,.mcnBoxedTextContentContainer,.mcnImageGroupContentContainer,.mcnCaptionLeftTextContentContainer,.mcnCaptionRightTextContentContainer,.mcnCaptionLeftImageContentContainer,.mcnCaptionRightImageContentContainer,.mcnImageCardLeftTextContentContainer,.mcnImageCardRightTextContentContainer{max-width: 100% !important;width: 100% !important;}}@media only screen and (max-width: 480px){.mcnBoxedTextContentContainer{min-width: 100% !important;}}@media only screen and (max-width: 480px){.mcnImageGroupContent{padding: 9px !important;}}@media only screen and (max-width: 480px){.mcnCaptionLeftContentOuter .mcnTextContent,.mcnCaptionRightContentOuter .mcnTextContent{padding-top: 9px !important;}}@media only screen and (max-width: 480px){.mcnImageCardTopImageContent,.mcnCaptionBlockInner .mcnCaptionTopContent:last-child .mcnTextContent{padding-top: 18px !important;}}@media only screen and (max-width: 480px){.mcnImageCardBottomImageContent{padding-bottom: 9px !important;}}@media only screen and (max-width: 480px){.mcnImageGroupBlockInner{padding-top: 0 !important;padding-bottom: 0 !important;}}@media only screen and (max-width: 480px){.mcnImageGroupBlockOuter{padding-top: 9px !important;padding-bottom: 9px !important;}}@media only screen and (max-width: 480px){.mcnTextContent,.mcnBoxedTextContentColumn{padding-right: 18px !important;padding-left: 18px !important;}}@media only screen and (max-width: 480px){.mcnImageCardLeftImageContent,.mcnImageCardRightImageContent{padding-right: 18px !important;padding-bottom: 0 !important;padding-left: 18px !important;}}@media only screen and (max-width: 480px){.mcpreview-image-uploader{display: none !important;width: 100% !important;}}@media only screen and (max-width: 480px){/* @tab Mobile Styles @section Heading 1 @tip Make the first-level headings larger in size for better readability on small screens. */h1{/*@editable*/font-size: 20px !important;/*@editable*/line-height: 150% !important;}}@media only screen and (max-width: 480px){/* @tab Mobile Styles @section Heading 2 @tip Make the second-level headings larger in size for better readability on small screens. */h2{/*@editable*/font-size: 20px !important;/*@editable*/line-height: 150% !important;}}@media only screen and (max-width: 480px){/* @tab Mobile Styles @section Heading 3 @tip Make the third-level headings larger in size for better readability on small screens. */h3{/*@editable*/font-size: 18px !important;/*@editable*/line-height: 150% !important;}}@media only screen and (max-width: 480px){/* @tab Mobile Styles @section Heading 4 @tip Make the fourth-level headings larger in size for better readability on small screens. */h4{/*@editable*/font-size: 16px !important;/*@editable*/line-height: 150% !important;}}@media only screen and (max-width: 480px){/* @tab Mobile Styles @section Boxed Text @tip Make the boxed text larger in size for better readability on small screens. We recommend a font size of at least 16px. */.mcnBoxedTextContentContainer .mcnTextContent,.mcnBoxedTextContentContainer .mcnTextContent p{/*@editable*/font-size: 16px !important;/*@editable*/line-height: 150% !important;}}@media only screen and (max-width: 480px){/* @tab Mobile Styles @section Preheader Visibility @tip Set the visibility of the email's preheader on small screens. You can hide it to save space. */#templatePreheader{/*@editable*/display: block !important;}}@media only screen and (max-width: 480px){/* @tab Mobile Styles @section Preheader Text @tip Make the preheader text larger in size for better readability on small screens. */#templatePreheader .mcnTextContent,#templatePreheader .mcnTextContent p{/*@editable*/font-size: 12px !important;/*@editable*/line-height: 150% !important;}}@media only screen and (max-width: 480px){/* @tab Mobile Styles @section Header Text @tip Make the header text larger in size for better readability on small screens. */#templateHeader .mcnTextContent,#templateHeader .mcnTextContent p{/*@editable*/font-size: 16px !important;/*@editable*/line-height: 150% !important;}}@media only screen and (max-width: 480px){/* @tab Mobile Styles @section Body Text @tip Make the body text larger in size for better readability on small screens. We recommend a font size of at least 16px. */#templateBody .mcnTextContent,#templateBody .mcnTextContent p{/*@editable*/font-size: 16px !important;/*@editable*/line-height: 150% !important;}}@media only screen and (max-width: 480px){/* @tab Mobile Styles @section Footer Text @tip Make the footer content text larger in size for better readability on small screens. */#templateFooter .mcnTextContent,#templateFooter .mcnTextContent p{/*@editable*/font-size: 12px !important;/*@editable*/line-height: 150% !important;}}</style></head><body style="-ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; background-color: #ffffff; height: 100%; margin: 0; padding: 0; width: 100%"><center><table align="center" border="0" cellpadding="0" cellspacing="0" height="100%" id="bodyTable" style="border-collapse: collapse; mso-table-lspace: 0; mso-table-rspace: 0; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; background-color: #F2F2F2; height: 100%; margin: 0; padding: 0; width: 100%" width="100%"><tr><td align="center" id="bodyCell" style="mso-line-height-rule: exactly; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; border-top: 0; height: 100%; margin: 0; padding: 0; width: 100%" valign="top"><table border="0" cellpadding="0" cellspacing="0" class="templateContainer" style="border-collapse: collapse; mso-table-lspace: 0; mso-table-rspace: 0; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; max-width: 600px; border: 0" width="100%"><tr><td id="templatePreheader" style="border-top-left-radius:25px; border-top-right-radius:25px; mso-line-height-rule: exactly; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; background-color: #595CA9; border-top: 0; border-bottom: 0; padding-top: 16px; padding-bottom: 8px" valign="top"><table border="0" cellpadding="0" cellspacing="0" class="mcnTextBlock" style="border-collapse: collapse; mso-table-lspace: 0; mso-table-rspace: 0; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; min-width:100%;" width="100%"><tbody class="mcnTextBlockOuter"><tr><td class="mcnTextBlockInner" style="mso-line-height-rule: exactly; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%" valign="top"><table align="left" border="0" cellpadding="0" cellspacing="0" class="mcnTextContentContainer" style="border-collapse: collapse; mso-table-lspace: 0; mso-table-rspace: 0; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; min-width:100%;" width="100%"><tbody><tr><td class="mcnTextContent" style='mso-line-height-rule: exactly; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; word-break: break-word; color: #2a2a2a; bcakground: #e3e3e3 ; font-family: "Asap", Helvetica, sans-serif; font-size: 12px; line-height: 150%; text-align: left; padding-top:9px; padding-right: 18px; padding-bottom: 9px; padding-left: 18px;' valign="top"><a style="mso-line-height-rule: exactly; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; color: #2a2a2a; font-weight: normal; text-decoration: none" target="_blank"><h2 style="color: #ffffff; font-size: 2.5vw; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; text-align: center;"?Invixible</h2></a></td></tr></tbody></table></td></tr></tbody></table></td></tr><tr><td id="templateHeader" style="mso-line-height-rule: exactly; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; background-color: #e3e3e3; border-top: 0; border-bottom: 0; padding-top: 16px; padding-bottom: 0" valign="top"><table border="0" cellpadding="0" cellspacing="0" class="mcnImageBlock" style="border-collapse: collapse; mso-table-lspace: 0; mso-table-rspace: 0; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; min-width:100%;" width="100%"><tbody class="mcnImageBlockOuter"><tr><td class="mcnImageBlockInner" style="mso-line-height-rule: exactly; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; padding:0px" valign="top"><table align="left" border="0" cellpadding="0" cellspacing="0" class="mcnImageContentContainer" style="border-collapse: collapse; mso-table-lspace: 0; mso-table-rspace: 0; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; min-width:100%;" width="100%"><tbody><tr><td class="mcnImageContent" style="mso-line-height-rule: exactly; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; padding-right: 0px; padding-left: 0px; padding-top: 0; padding-bottom: 0; text-align:center;" valign="top"><a class=" style="mso-line-height-rule: exactly; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; color: #595CA9; font-weight: normal; text-decoration: none" target="_blank" title=""><a class=""  style="mso-line-height-rule: exactly; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; color: #595CA9; font-weight: normal; text-decoration: none" target="_blank" title=""> <img align="center" alt="Forgot your password?" class="mcnImage" src="https://socialapi.solissol.com/api/v1/en/media-upload/mediaFiles/123/123/59e92e8d18c26e7c31767a10f056e63c.png" style="-ms-interpolation-mode: bicubic; border: 0; height: auto; outline: none; text-decoration: none; vertical-align: bottom; max-width:1200px; padding-bottom: 0; display: inline !important; vertical-align: bottom;" width="600"></img></a></a></td></tr></tbody></table></td></tr></tbody></table></td></tr><tr><td id="templateBody" style="mso-line-height-rule: exactly; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; background-color: #f7f7ff; border-top: 0; border-bottom: 0; padding-top: 0; padding-bottom: 0" valign="top"><table border="0" cellpadding="0" cellspacing="0" class="mcnTextBlock" style="border-collapse: collapse; mso-table-lspace: 0; mso-table-rspace: 0; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; min-width:100%;" width="100%"><tbody class="mcnTextBlockOuter"><tr><td class="mcnTextBlockInner" style="mso-line-height-rule: exactly; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%" valign="top"><table align="left" border="0" cellpadding="0" cellspacing="0" class="mcnTextContentContainer" style="border-collapse: collapse; mso-table-lspace: 0; mso-table-rspace: 0; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; min-width:100%;" width="100%"><tbody><tr><td class="mcnTextContent" style='mso-line-height-rule: exactly; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; background-color:#e3e3e3; word-break: break-word; color: #2a2a2a; font-family: "Asap", Helvetica, sans-serif; font-size: 16px; line-height: 150%; text-align: center; padding-top:9px; padding-right: 18px; padding-bottom: 9px; padding-left: 18px;' valign="top"><h1 class="null" style='color: #2a2a2a; font-family: "Asap", Helvetica, sans-serif; font-size: 32px; font-style: normal; font-weight: bold; line-height: 125%; letter-spacing: 2px; text-align: center; display: block; margin: 0; padding: 0'><span style="text-transform:uppercase">Forgot</span></h1><h2 class="null" style='color: #2a2a2a; font-family: "Asap", Helvetica, sans-serif; font-size: 24px; font-style: normal; font-weight: bold; line-height: 125%; letter-spacing: 1px; text-align: center; display: block; margin: 0; padding: 0'><span style="text-transform:uppercase">your password?</span></h2> </td></tr></tbody></table></td></tr></tbody></table><table border="0" cellpadding="0" cellspacing="0" class="mcnTextBlock" style="border-collapse: collapse; mso-table-lspace: 0; mso-table-rspace: 0; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; min-width:100%;" width="100%"><tbody class="mcnTextBlockOuter"><tr><td class="mcnTextBlockInner" style="mso-line-height-rule: exactly; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%" valign="top"><table align="left" border="0" cellpadding="0" cellspacing="0" class="mcnTextContentContainer" style="border-collapse: collapse; mso-table-lspace: 0; mso-table-rspace: 0; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; min-width:100%;" width="100%"><tbody><tr><td class="mcnTextContent" style='mso-line-height-rule: exactly; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; word-break: break-word; background: #e3e3e3; color: #2a2a2a; font-family: "Asap", Helvetica, sans-serif; font-size: 16px; line-height: 150%; text-align: center; padding-top:9px; padding-right: 18px; padding-bottom: 9px; padding-left: 18px;' valign="top">Not to worry, we got you! Let’s get you a new password.<br></br></td></tr></tbody></table></td></tr></tbody></table><table border="0" cellpadding="0" cellspacing="0" class="mcnButtonBlock" style="border-collapse: collapse; mso-table-lspace: 0; mso-table-rspace: 0; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; min-width:100%;" width="100%"><tbody class="mcnButtonBlockOuter"><tr><td align="center" class="mcnButtonBlockInner" style="mso-line-height-rule: exactly; background: #e3e3e3; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; padding-top:18px; padding-right:18px; padding-bottom:18px; padding-left:18px;" valign="top"><table border="0" cellpadding="0" cellspacing="0" class="mcnButtonBlock" style="border-collapse: collapse; mso-table-lspace: 0; mso-table-rspace: 0; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; min-width:100%;" width="100%"><tbody class="mcnButtonBlockOuter"><tr><td align="center" class="mcnButtonBlockInner" style="mso-line-height-rule: exactly; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; padding-top:0; padding-right:18px; padding-bottom:18px; padding-left:18px;" valign="top"><table border="0" cellpadding="0" cellspacing="0" class="mcnButtonContentContainer" style="border-collapse: collapse; mso-table-lspace: 0; mso-table-rspace: 0; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; border-collapse: separate !important;border-radius: 48px;background-color: #595CA9;"><tbody><tr><td align="center" class="mcnButtonContent" style="mso-line-height-rule: exactly; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; font-family: 'Asap', Helvetica, sans-serif; font-size: 16px; padding-top:24px; padding-right:48px; padding-bottom:24px; padding-left:48px;" valign="middle"> <a class="mcnButton" href= "https://beta.exposportmedia.net/auth/reset-password?email=${email}"  style="mso-line-height-rule: exactly; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; display: block; color: #595CA9; font-weight: normal; text-decoration: none; font-weight: normal;letter-spacing: 1px;line-height: 100%;text-align: center;text-decoration: none;color: #FFFFFF; text-transform:uppercase;" target="_blank" title="Review Lingo kit invitation">Reset password</a> </td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table><table border="0" cellpadding="0" cellspacing="0" class="mcnImageBlock" style="border-collapse: collapse; mso-table-lspace: 0; mso-table-rspace: 0; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; min-width:100%;" width="100%"><tbody class="mcnImageBlockOuter"><tr><td class="mcnImageBlockInner" style="mso-line-height-rule: exactly; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; padding:0px" valign="top"><table align="left" border="0" cellpadding="0" cellspacing="0" class="mcnImageContentContainer" style="border-collapse: collapse; mso-table-lspace: 0; mso-table-rspace: 0; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; min-width:100%;" width="100%"><tbody><tr><td class="mcnImageContent" style="mso-line-height-rule: exactly; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; padding-right: 0px; padding-left: 0px; padding-top: 0; padding-bottom: 0; text-align:center;" valign="top"></td></tr></tbody></table></td></tr></tbody></table></td></tr></table></td></tr></table></center></body></html>`;

      html = html.replace(/#595CA9/g, "#FF0000");

      let transporter = nodemailer.createTransport({
        service: "gmail",
        host: "smtp.gmail.com",

        // secure: false,
        // requireTLS: true,
        // port: 587,
        auth: {
          user: "noreply.dev@complete3tech.com",
          pass: "stiveishere2024!!",
        },
      });
      const mailOptions = {
        from: "noreply.dev@complete3tech.com",
        to: email,
        subject: "Reset Password",
        text: "",
        html: html,
      };
      await transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
          return res.status(400).json(err);
        } else {
          res.status(200).json("Mail Sent Successfully");
        }
      });
    });
  });

function isValidDate(d) {
  return d instanceof Date && !isNaN(d);
}

exports.getMediaByHex = regionalFunctions
  .runWith({
    memory: "256MB",
    timeoutSeconds: 150,
  })
  .https.onRequest(getMediaForAppByHex);




exports.updateNetworkUserStatistics = regionalFunctions
  .runWith({
    memory: "256MB",
    timeoutSeconds: 150,
  })
  .https.onRequest(async (req, res) => {
    try {
      const body = req.body;
      const hexCode = req.body.hexCode;
      let querySnapShot = await db
        .collection("networkDevices")
        .where("hexCode", "==", hexCode)
        .get();
      if (querySnapShot.empty) {
        return res.status(500).send("WRONG HEX CODE NO DOC FOUND");
      }
      let networkID = querySnapShot.docs[0].id;
      delete body.networkDeviceID;
      const networkDevice = await db
        .collection("networkDevices")
        .doc(networkID)
        .collection("userstatistics")
        .doc(networkID)
        .get();
      if (networkDevice) {
        const networkDeviceData = networkDevice.data();

        if (!body.hexCode) {
          body.hexCode = networkDeviceData.hexCode;
        }
        if (!body.lastContacted) {
          body.lastContacted = networkDeviceData.lastContacted;
        }
        if (typeof body.isOnline === "undefined") {
          body.isOnline = networkDeviceData.isOnline;
        }
        if (!body.playerVersion) {
          body.playerVersion = networkDeviceData.playerVersion;
        }
      }

      console.log(body);
      db.collection("networkDevices")
        .doc(networkID)
        .collection("userstatistics")
        .doc(networkID)
        .set(body);

      res.status(200).json("Network device updated successfully");
    } catch (err) {
      console.log(err);
      res.status(400).json(err.message);
    }
  });

exports.updateChannelTimeOnUpdateChannel = regionalFunctions
  .runWith({
    memory: "256MB",
  })
  .firestore.document("restaurants/{companyID}/channel/{channelID}")
  .onUpdate(async (snap, context) => {
    console.log("uupdateChannel event triggered");

    const companyID = context.params.companyID;
    const channelID = context.params.channelID;

    console.log("companyID: ", companyID);
    console.log("channelID: ", channelID);
    updateSyncTime(channelID);
    return;
  });

exports.updateChannelTime = regionalFunctions
  .runWith({
    memory: "256MB",
  })
  .firestore.document("restaurants/{companyID}/playlist/{playlistID}")
  .onUpdate(async (snap, context) => {
    console.log("updateChannelTime event triggered");

    const companyID = context.params.companyID;
    const playlistID = context.params.playlistID;

    console.log("companyID: ", companyID);
    console.log("playlistID: ", playlistID);
    let channels = await db
      .collection("restaurants")
      .doc(companyID)
      .collection("channel")
      .get();
    if (channels.empty) {
      console.log("No matching documents.");
      channels = [];
    }
    channels.forEach((doc) => {
      let data = doc.data();
      if (doc.exists) {
        doc.data().playlist.forEach((singlePlaylist) => {
          if (singlePlaylist.playlist_id === playlistID) {
            console.log("matched: ", data.id);

            updateSyncTime(data.id);
          }
        });
      }
    });
    return;
  });

exports.updateChannelTimeOnBannerWrite = regionalFunctions
  .runWith({
    memory: "256MB",
  })
  .firestore.document("banners/{bannerID}")
  .onWrite(async (snap, context) => {
    console.log("updateChannelTimeOnPlaylistWrite event triggered");

    let restaurants = await db.collection("restaurants").get();
    if (restaurants.empty) {
      console.log("THERE ARE NO CLUBS...");
    }

    restaurants.forEach(async (restaurant) => {
      let companyData = restaurant.data();
      if (restaurant.exists) {
        let channels = await db
          .collection("restaurants")
          .doc(companyData.id)
          .collection("channel")
          .get();
        if (channels.empty) {
          console.log("No Channels for", companyData.name);
          channels = [];
        }
        channels.forEach((doc) => {
          let data = doc.data();
          if (doc.exists) {
            data.playlist.forEach(async (singlePlaylist) => {
              const playlistFound = await db
                .collection("restaurants")
                .doc(companyData.id)
                .collection("playlist")
                .doc(singlePlaylist.playlist_id)
                .get();
              let playlistFoundData = playlistFound.data();
              if (playlistFound.exists) {
                console.log("PLAYLIST FOUND ", playlistFoundData);
                playlistFoundData.media.forEach((media) => {
                  if (media.type == "RANKING" || media.type == "AGENDA") {
                    console.log("SYNCING CHANNEL", data.id);
                    updateSyncTime(data.id);
                  }
                });
              }
            });
          }
        });
      }
    });
    return;
  });

exports.scheduledFunction = regionalFunctions
  .runWith({
    memory: "256MB",
  })
  .pubsub.schedule("every 6 minutes")
  .timeZone("Etc/UTC")
  .onRun(async (context) => {
    // This function will run every 6 minutes.
    var now = moment();
    console.log("FUNCTION TIME AT", now.utc());
    const networkDevices = await db.collection("networkDevices").get();
    if (networkDevices.empty) {
      console.log("THERE ARE NO NETWORK DEVICES");
    }

    networkDevices.forEach(async (networkDevice) => {
      const networkDeviceData = networkDevice.data();
      const userstatsDocs = await admin
        .firestore()
        .collection("networkDevices")
        .doc(networkDeviceData.id)
        .collection("userstatistics")
        .get();

      userstatsDocs.forEach(async (userstats) => {
        const userstatsData = userstats.data();
        const cutofftime = moment().subtract(6, "minutes").utc(); // 6 minutes before the current time
        let lastSync;
        if (networkDeviceData.timeZone == "(UTC+05:00) Pakistan") {
          lastSync = moment(userstatsData.lastContacted).subtract(5, "hours");
        } else {
          lastSync = moment(userstatsData.lastContacted).subtract(2, "hours");
        }
        console.log("Last sync with iso  is ", lastSync);
        console.log("cut off is ", cutofftime);
        console.log(lastSync.isBefore(cutofftime));
        if (lastSync.isBefore(cutofftime) && userstatsData.isOnline == true) {
          console.log("syncing", userstatsData.hexCode, lastSync, cutofftime);
          await admin
            .firestore()
            .collection("networkDevices")
            .doc(networkDeviceData.id)
            .collection("userstatistics")
            .doc(userstats.id)
            .update({ isOnline: false });
        } else {
          console.log("SKIPPING", userstatsData.hexCode, lastSync, cutofftime);
        }
      });
    });
  });

exports.updateChannelTimeOnPlaylistDeletion = regionalFunctions
  .runWith({
    memory: "256MB",
  })
  .firestore.document("restaurants/{companyID}/playlist/{playlistID}")
  .onDelete(async (snap, context) => {
    console.log("updateChannelTimeOnPlaylistDeletion event triggered");

    const companyID = context.params.companyID;
    const playlistID = context.params.playlistID;

    console.log("companyID: ", companyID);
    console.log("playlistID: ", playlistID);
    let channels = await db
      .collection("restaurants")
      .doc(companyID)
      .collection("channel")
      .get();
    if (channels.empty) {
      console.log("No matching documents.");
      channels = [];
    }
    channels.forEach((doc) => {
      let data = doc.data();
      if (doc.exists) {
        doc.data().playlist.forEach((singlePlaylist) => {
          if (singlePlaylist.playlist_id === playlistID) {
            console.log("matched: ", data.id);

            updateSyncTime(data.id);
          }
        });
      }
    });
    return;
  });

exports.updateChannelTimeOnScheduleCreation = regionalFunctions
  .runWith({
    memory: "256MB",
  })
  .firestore.document(
    "restaurants/{companyID}/playlist/{playlistID}/schedule/{scheduleID}"
  )
  .onCreate(async (snap, context) => {
    console.log("updateChannelTimeOnScheduleCreation event triggered");

    const companyID = context.params.companyID;
    const playlistID = context.params.playlistID;

    console.log("companyID: ", companyID);
    console.log("playlistID: ", playlistID);
    let channels = await db
      .collection("restaurants")
      .doc(companyID)
      .collection("channel")
      .get();
    if (channels.empty) {
      console.log("No matching documents.");
      channels = [];
    }
    channels.forEach((doc) => {
      let data = doc.data();
      if (doc.exists) {
        doc.data().playlist.forEach((singlePlaylist) => {
          if (singlePlaylist.playlist_id === playlistID) {
            console.log("matched: ", data.id);

            updateSyncTime(data.id);
          }
        });
      }
    });
    return;
  });

exports.updateChannelTimeOnScheduleUpdation = regionalFunctions
  .runWith({
    memory: "256MB",
  })
  .firestore.document(
    "restaurants/{companyID}/playlist/{playlistID}/schedule/{scheduleID}"
  )
  .onUpdate(async (snap, context) => {
    console.log("updateChannelTimeOnScheduleUpdation event triggered");

    const companyID = context.params.companyID;
    const playlistID = context.params.playlistID;

    console.log("companyID: ", companyID);
    console.log("playlistID: ", playlistID);
    let channels = await db
      .collection("restaurants")
      .doc(companyID)
      .collection("channel")
      .get();
    if (channels.empty) {
      console.log("No matching documents.");
      channels = [];
    }
    channels.forEach((doc) => {
      let data = doc.data();
      if (doc.exists) {
        doc.data().playlist.forEach((singlePlaylist) => {
          if (singlePlaylist.playlist_id === playlistID) {
            console.log("matched: ", data.id);

            updateSyncTime(data.id);
          }
        });
      }
    });
    return;
  });

exports.updateChannelTimeOnChannelScheduleUpdation = regionalFunctions
  .runWith({
    memory: "256MB",
  })
  .firestore.document(
    "restaurants/{companyID}/channel/{channelID}/schedule/{scheduleID}"
  )
  .onUpdate(async (snap, context) => {
    console.log("updateChannelTimeOnChannelScheduleUpdation event triggered");

    const companyID = context.params.companyID;
    const channelID = context.params.channelID;

    console.log("companyID: ", companyID);
    console.log("channelID: ", channelID);

    updateSyncTime(channelID);
  });


exports.compressionDelete = regionalFunctions
  .runWith({
    memory: "256MB",
  })
  .https.onRequest(async (req, res) => {
    console.log("compressionDelete Called");
    const { url } = req.body;
    return cors(req, res, () => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      return new Promise((resolve, reject) => {
        axios
          .post("http://88.222.220.21:3000/v1/compression/delete", {
            url,
          })
          .then((response) => {
            console.log("then", response.data);
            if (response.data) {
              parseString(response.data, function (err, result) {
                res.status(response.status).json(response.data);
                resolve();
              });
            } else {
              res.status(response.status).send(response.data);
            }
          })
          .catch((error) => {
            reject(error);
          });
      });
    });
  });

exports.getInfo = regionalFunctions
  .runWith({
    memory: "256MB",
  })
  .https.onRequest(async (req, res) => {
    console.log("GetInfo Called");
    const { url } = req.body;
    return cors(req, res, () => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      return new Promise((resolve, reject) => {
        axios
          .post("http://88.222.220.21:3000/v1/compression/getInfo", {
            url,
          })
          .then((response) => {
            console.log("then", response.data);
            if (response.data) {
              parseString(response.data, function (err, result) {
                res.status(response.status).json(response.data);
                resolve();
              });
            } else {
              res.status(response.status).send(response.data);
            }
          })
          .catch((error) => {
            reject(error);
          });
      });
    });
  });

exports.getFirebaseImageUrl = regionalFunctions
  .runWith({
    memory: "256MB",
  })
  .https.onRequest(async (req, res) => {
    console.log("GetInfo Called");
    const { url } = req.body;
    return cors(req, res, () => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      return new Promise((resolve, reject) => {
        axios
          .get(url)
          .then((response) => {
            console.log("then", response.data);
            if (response.data) {
              // const imageData = Buffer.from(response.data, 'binary').toString('base64');
              // const contentType = response.headers['content-type'];
              // const imageBase64 = `data:${contentType};base64,${imageData}`;

              res.set("Content-Type", contentType);
              return res.status(200).sendFile(response.data);
            } else {
              res.status(response.status).send(response.data);
            }
          })
          .catch((error) => {
            reject(error);
          });
      });
    });
  });


exports.getDataForNativeAppByHex = regionalFunctions
  .runWith({
    memory: "256MB",
  })
  .https.onRequest(async (req, res) => {
    if (Object.keys(req.query).length == 0) {
      res.status(200).json("Please provide hexCode");
      return;
    }
    let hexCode = req.query.hexCode;
    let networkDevices = db
      .collection("networkDevices")
      .where("hexCode", "==", hexCode)
      .get();
    let companyID, channelID;
    if (!hexCode) {
      res.status(200).json("Please provide hexCode");
      return;
    }
    const snapshot = await networkDevices;
    if (snapshot.empty) {
      console.log("No matching networkDevices document.");
      res.status(200).json("No network device found");
      return;
    }
    snapshot.forEach((doc) => {
      companyID = doc.data().companyID;
      channelID = doc.data().channelID;
    });
    let companyData = db.collection("restaurants").doc(companyID).get();
    const companySnapShot = await companyData;
    let companyValue;
    if (companySnapShot.empty) {
      console.log("No matching restaurant document.");
      res.status(200).json("Restaurant not found");
      return;
    } else {
      companyValue = companySnapShot.data();
      delete companyValue.playerLimit;
      delete companyValue.superAdmin;
      delete companyValue.path;
      delete companyValue.pass;
      delete companyValue.picURL;
      delete companyValue.confirmPass;
    }

    let channelData = db
      .collection("restaurants")
      .doc(companyID)
      .collection("channel")
      .doc(channelID)
      .get();
    const channelSnapShot = await channelData;

    if (channelSnapShot.empty) {
      console.log("No matching channel document.");
      res.status(200).json("Channel not found");
      return;
    }

    let playListSchedule = await db
      .collection("restaurants")
      .doc(companyID)
      .collection("channel")
      .doc(channelID)
      .collection("schedule")
      .get();
    if (playListSchedule.empty) {
      console.log("No matching playlist schedule document.");
      playListSchedule = [];
    }
    let playListScheduleData = [];
    playListSchedule.forEach((doc) => {
      let data = doc.data();
      if (data.timeFrom && data.timeFrom._seconds) {
        data.timeFrom = new Date(data.timeFrom._seconds * 1000);
      }
      if (data.timeTo && data.timeTo._seconds) {
        data.timeTo = new Date(data.timeTo._seconds * 1000);
      }
      playListScheduleData.push(data);
    });

    let allPlayListIds = [];
    let channelValue = channelSnapShot.data();
    if (channelValue.creationDate && channelValue.creationDate._seconds) {
      channelValue.creationDate = new Date(
        channelValue.creationDate._seconds * 1000
      );
    }
    delete channelValue.playersList;
    delete channelValue.lastUpdated;
    channelValue.playlist.forEach((x) => {
      allPlayListIds.push(x.playlist_id);
    });

    let mediaQueries = [];
    allPlayListIds.forEach((x) => {
      mediaQueries.push(
        db.collection("restaurants").doc(companyID).collection("playlist").doc(x).get()
      );
    });
    let allMediaData = [];
    Promise.all(mediaQueries)
      .then((values) => {
        values.forEach((data) => {
          if (
            typeof data == "undefined" ||
            data == null ||
            !data.exists ||
            data.empty
          ) {
            console.log("No matching playlist mediaQueries documents.");
          } else {
            let mediaValues = data.data();
            if (mediaValues.creationDate && mediaValues.creationDate._seconds) {
              mediaValues.creationDate = new Date(
                mediaValues.creationDate._seconds * 1000
              );
            }
            if (mediaValues.ExpiryDate && mediaValues.ExpiryDate._seconds) {
              mediaValues.ExpiryDate = new Date(
                mediaValues.ExpiryDate._seconds * 1000
              );
            }
            mediaValues.media.forEach((x) => {
              if (x.creationDate && x.creationDate._seconds) {
                x.creationDate = new Date(x.creationDate._seconds * 1000);
              }
            });
            mediaValues["mediaList"] = mediaValues.media;
            delete mediaValues.media;
            allMediaData.push(mediaValues);
          }
        });
      })
      .then(() => {
        let allSchedule = [];
        allPlayListIds.forEach((x) => {
          allSchedule.push(
            db
              .collection("restaurants")
              .doc(companyID)
              .collection("playlist")
              .doc(x)
              .collection("schedule")
              .get()
          );
        });
        let allPlayListScheduleData = [];
        Promise.all(allSchedule).then((values) => {
          values.forEach((data) => {
            if (data.empty) {
              console.log("No matching media schedule documents.");
            } else {
              data.forEach((doc) => {
                const data = doc.data();
                if (data.timeFrom && data.timeFrom._seconds) {
                  data.timeFrom = new Date(data.timeFrom._seconds * 1000);
                }
                if (data.timeTo && data.timeTo._seconds) {
                  data.timeTo = new Date(data.timeTo._seconds * 1000);
                }
                allPlayListScheduleData.push(data);
              });
            }
          });

          channelValue["infoPlaylist_List"] = channelValue.playlist;
          delete channelValue.playlist;
          channelValue["scheduleList"] = playListScheduleData;
          allMediaData.forEach((x) => {
            x["scheduleList"] = allPlayListScheduleData;
          });

          const obj = {
            restaurant: companyValue,
            channel: channelValue,
            playlist: allMediaData,
          };
          res.status(200).json(obj);
          return;
        });
      });
  });

exports.getProxy = regionalFunctions
  .runWith({
    memory: "256MB",
  })
  .https.onRequest(async (req, res) => {
    const url = req.query.url;
    return cors(req, res, () => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      return new Promise(async (resolve, reject) => {
        try {
          const response = await axios.get(url, {
            responseType: "arraybuffer",
          });
          res.set("Content-Type", response.headers["content-type"]);
          res.send(response.data);
        } catch (error) {
          res.status(500).send(error.toString());
        }
      });
    });
  });


//restaurants expire cron job daily runs
// exports.companyExpireCronJob = functions.pubsub
//   .schedule("every 24 hours")
//   .onRun(companyExpireCronJobHandler);



exports.sendEmailOnSupportTicketSubmitted = regionalFunctions
  .runWith({
    memory: "256MB",
  })
  .firestore.document("support/{supportID}")
  .onWrite(sendEmailSupport);




exports.getDeviceSetting = regionalFunctions
  .runWith({
    memory: "256MB",
  })
  .https.onRequest(async (req, res) => {
    if (req.method != "GET") {
      return res.status(403).send("Forbidden: This HTTP method is not allowed");
    }

    const hexCode = req.query.hexCode;
    const device = await db
      .collection("networkDevices")
      .where("hexCode", "==", hexCode)
      .get();

    return cors(req, res, () => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      if (device.empty) {
        res.status(404).send("No device found with the provided hexCode");
        return;
      }
      const data = device.docs[0].data();
      if (!data) {
        data = {
          playerSetting: {
            offset: {
              x: 0,
              y: 0
            },
            resolution: {
              width: 0,
              height: 0
            }
          }
        };
      } else {
        if (!data.playerSetting) {
          data.playerSetting = {
            offset: {
              x: 0,
              y: 0
            },
            resolution: {
              width: 0,
              height: 0
            }
          };
        } else {
          if (!data.playerSetting.offset) {
            data.playerSetting.offset = {
              x: 0,
              y: 0
            };
          } else {
            if (!data.playerSetting.offset.x) {
              data.playerSetting.offset.x = 0;
            }
            if (!data.playerSetting.offset.y) {
              data.playerSetting.offset.y = 0;
            }
          }

          if (!data.playerSetting.resolution) {
            data.playerSetting.resolution = {
              width: 0,
              height: 0
            };
          } else {
            if (!data.playerSetting.resolution.width) {
              data.playerSetting.resolution.width = 0;
            }
            if (!data.playerSetting.resolution.height) {
              data.playerSetting.resolution.height = 0;
            }
          }
        }
      }
      res.status(200).json(data.playerSetting);
    });
  });

exports.updateStatusDevice = regionalFunctions
  .runWith({
    memory: "256MB",
  })
  .https.onRequest(deviceStatusUpdate);