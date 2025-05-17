const nodemailer = require("nodemailer");

exports.sendEmail = async (email, subject, message) => {
    let transporter = nodemailer.createTransport({
        service: "gmail",
        host: "smtp.gmail.com",
        auth: {
            user: "yourEmail",
            pass: "password",
        },
    });
    const mailOptions = {
        from: "yourEmail",
        to: email,
        subject: subject,
        text: "",
        html: message,
    };
    await transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
            return true;
        } else {
            return false
        }
    });
}