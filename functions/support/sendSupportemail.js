const { sendEmail } = require("../utils/email");

    exports.sendEmailSupport = async (snap, context) => {
    const supportData = snap.after.data();
    const email = supportData.adminEmail;
    const subject = "Support Ticket Submitted ->" + supportData.subject;
    const message = `A support ticket has been submitted by ${supportData.name} with email ${supportData.email}. The message is: ${supportData.message}`;
    const mail = await sendEmail(email, subject, message);
    if(mail){
      console.log("Email sent successfully");
    }else{
      console.log("Email not sent");
    }
}