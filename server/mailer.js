"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendWelcomeEmail = exports.sendPasswordResetEmail = exports.sendVerificationEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Create reusable transporter object using SMTP transport
const transporter = nodemailer_1.default.createTransport({
    host: process.env.SMTP_HOST || 'mail.vuttik.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
    tls: {
        // Do not fail on invalid certs in development or strictly-controlled shared hosts
        rejectUnauthorized: false
    }
});
// HTML template for standard emails
const getEmailTemplate = (title, message, buttonText, buttonLink) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Inter', sans-serif; background-color: #f6f9fc; margin: 0; padding: 0; color: #333; }
    .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
    .header { background-color: #10b981; padding: 24px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
    .content { padding: 32px 24px; text-align: center; }
    .content h2 { color: #1f2937; font-size: 20px; margin-bottom: 16px; }
    .content p { color: #4b5563; font-size: 16px; line-height: 1.5; margin-bottom: 24px; }
    .button { display: inline-block; background-color: #10b981; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 16px; }
    .footer { padding: 24px; text-align: center; font-size: 14px; color: #9ca3af; border-top: 1px solid #f3f4f6; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Vuttik</h1>
    </div>
    <div class="content">
      <h2>${title}</h2>
      <p>${message}</p>
      <a href="${buttonLink}" class="button">${buttonText}</a>
    </div>
    <div class="footer">
      <p>Si no solicitaste esto, puedes ignorar este correo de forma segura.</p>
      <p>&copy; ${new Date().getFullYear()} Vuttik. Todos los derechos reservados.</p>
    </div>
  </div>
</body>
</html>
`;
const sendVerificationEmail = async (email, name, token) => {
    const verificationLink = `https://vuttik.com/verificar?token=${token}`;
    const mailOptions = {
        from: '"Vuttik" <' + process.env.SMTP_USER + '>',
        to: email,
        subject: 'Verifica tu cuenta en Vuttik',
        html: getEmailTemplate(`¡Hola, ${name}!`, 'Gracias por registrarte en Vuttik. Para completar tu registro y asegurar tu cuenta, por favor haz clic en el siguiente botón.', 'Verificar mi cuenta', verificationLink)
    };
    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Verification email sent: %s', info.messageId);
        return true;
    }
    catch (error) {
        console.error('Error sending verification email:', error);
        return false;
    }
};
exports.sendVerificationEmail = sendVerificationEmail;
const sendPasswordResetEmail = async (email, name, token) => {
    const resetLink = `https://vuttik.com/reset-password?token=${token}`;
    const mailOptions = {
        from: '"Vuttik" <' + process.env.SMTP_USER + '>',
        to: email,
        subject: 'Recuperación de contraseña en Vuttik',
        html: getEmailTemplate(`Recuperación de contraseña`, `Hola ${name}, hemos recibido una solicitud para cambiar tu contraseña. Haz clic en el botón de abajo para establecer una nueva contraseña. Este enlace expirará en 24 horas.`, 'Restablecer contraseña', resetLink)
    };
    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Password reset email sent: %s', info.messageId);
        return true;
    }
    catch (error) {
        console.error('Error sending password reset email:', error);
        return false;
    }
};
exports.sendPasswordResetEmail = sendPasswordResetEmail;
const sendWelcomeEmail = async (email, name) => {
    const loginLink = `https://vuttik.com/`;
    const mailOptions = {
        from: '"Vuttik" <' + process.env.SMTP_USER + '>',
        to: email,
        subject: '¡Bienvenido a Vuttik!',
        html: getEmailTemplate(`¡Hola, ${name}!`, 'Nos alegra mucho darte la bienvenida a Vuttik. Tu cuenta ha sido creada exitosamente mediante Google/Facebook y ya está verificada. ¡Empieza a explorar el mercado ahora!', 'Ir a Vuttik', loginLink)
    };
    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Welcome email sent: %s', info.messageId);
        return true;
    }
    catch (error) {
        console.error('Error sending welcome email:', error);
        return false;
    }
};
exports.sendWelcomeEmail = sendWelcomeEmail;
