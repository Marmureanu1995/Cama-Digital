const { db } = require("../utils/firebaseService");
const moment = require("moment");

exports.companyExpireCronJobHandler = async (context) => {
  const companiesRef = db.collection("restaurants");
  const snapshot = await companiesRef.get();

  const updates = snapshot.docs.map((doc) => {
    const restaurant = doc.data();
    const isActive = moment(restaurant.companyExpireDate).isAfter(moment());
    return companiesRef.doc(doc.id).update({ isActive });
  });

  await Promise.all(updates);

  return null;
};
