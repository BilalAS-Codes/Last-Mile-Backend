const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: process.env.MAIL_SERVICE || 'gmail',
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
    },
});

const sendMail = async ({ to, subject, text, html }) => {
    try {
        const info = await transporter.sendMail({
            from: `"Last Mile" <${process.env.MAIL_USER}>`,
            to,
            subject,
            text,
            html,
        });
        console.log('Message sent: %s', info.messageId);
        return info;
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
};

const sendOTP = async (email, otp) => {
    const subject = 'Your Password Reset OTP';
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
            <h2 style="color: #2c3e50; text-align: center;">Last Mile Logistics</h2>
            <p>Hello,</p>
            <p>You requested a password reset. Please use the following OTP to reset your password. This OTP is valid for 10 minutes.</p>
            <div style="text-align: center; margin: 30px 0;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #3498db; padding: 10px 20px; border: 2px dashed #3498db; border-radius: 5px;">${otp}</span>
            </div>
            <p>If you did not request this, please ignore this email.</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #7f8c8d; text-align: center;">This is an automated message, please do not reply.</p>
        </div>
    `;
    return await sendMail({ to: email, subject, html });
};

module.exports = {
    sendMail,
    sendOTP,
};
