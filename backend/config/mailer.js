
const nodemailer = require("nodemailer");

// ==========================================
// CREATE GMAIL TRANSPORTER
// ==========================================

const transporter = nodemailer.createTransport({
  service: "gmail",

  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },

  connectionTimeout: 15000,
  greetingTimeout: 15000,
  socketTimeout: 20000,
});

// ==========================================
// VERIFY GMAIL CONNECTION
// ==========================================

async function verifyMailer() {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
      throw new Error(
        "EMAIL_USER or EMAIL_APP_PASSWORD is missing in .env file."
      );
    }

    await transporter.verify();

    console.log(
      "SmartPark Email Server Connected Successfully!"
    );

  } catch (error) {
    console.error("SmartPark Email Connection Failed:");
    console.error(error.message);
  }
}

// ==========================================
// SEND OTP EMAIL
// ==========================================

async function sendOTPEmail(email, otp) {
  try {
    if (!email || !otp) {
      throw new Error("Email and OTP are required.");
    }

    const mailOptions = {
      from: `"SmartPark" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "SmartPark - Password Reset OTP",

      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
        </head>

        <body style="font-family: Arial, sans-serif; background: #f1f5f9; padding: 20px;">

          <div style="max-width: 500px; margin: auto; background: white; padding: 25px; border-radius: 10px;">

            <h2 style="color: #2563eb;">SmartPark</h2>

            <h3>Password Reset Request</h3>

            <p>Hello,</p>

            <p>
              We received a request to reset your SmartPark account password.
            </p>

            <p>Your password reset OTP is:</p>

            <h1 style="
              letter-spacing: 8px;
              color: #2563eb;
              background: #eff6ff;
              padding: 15px;
              text-align: center;
              border-radius: 8px;
            ">
              ${otp}
            </h1>

            <p>
              This OTP is valid for <strong>5 minutes</strong>.
            </p>

            <p>
              Do not share this OTP with anyone.
            </p>

            <p>
              If you did not request a password reset,
              please ignore this email.
            </p>

            <hr />

            <p style="color: #64748b;">
              Thank you,<br>
              <strong>SmartPark Team</strong>
            </p>

          </div>

        </body>
        </html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);

    console.log("OTP email sent successfully:", info.messageId);

    return info;

  } catch (error) {
    console.error("OTP Email Sending Failed:", error.message);
    throw error;
  }
}

// ==========================================
// EXPORT FUNCTIONS
// ==========================================

module.exports = {
  transporter,
  sendOTPEmail,
  verifyMailer,
};
