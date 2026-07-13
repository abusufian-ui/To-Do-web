const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const path = require('path');

// Load env variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const fromEmail = process.env.BREVO_SMTP_HOST || 'security@myportalucp.online';
const targetEmail = 'ranasuffyan9@gmail.com';

console.log("Using SMTP Settings:");
console.log("- Sender (fromEmail):", fromEmail);
console.log("- Recipient (targetEmail):", targetEmail);
console.log("- SMTP User:", process.env.BREVO_SMTP_USER);
console.log("- SMTP Port:", process.env.BREVO_SMTP_PORT);

const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: parseInt(process.env.BREVO_SMTP_PORT, 10) || 587,
  secure: false,
  auth: {
    user: process.env.BREVO_SMTP_USER,
    pass: process.env.BREVO_SMTP_KEY
  }
});

async function run() {
  try {
    console.log("Sending test email...");
    const info = await transporter.sendMail({
      from: `"MyPortal Security Test" <${fromEmail}>`,
      to: targetEmail,
      subject: 'MyPortal SMTP Connection Test',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2>Brevo SMTP Test Successful!</h2>
          <p>This is a test email from your MyPortal server verifying that Brevo SMTP is correctly configured.</p>
          <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
        </div>
      `
    });
    console.log("✅ Email sent successfully!");
    console.log("Message ID:", info.messageId);
  } catch (err) {
    console.error("❌ Failed to send email:", err);
  }
}

run();
