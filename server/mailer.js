"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendWelcomeEmail = exports.sendPasswordResetEmail = exports.sendVerificationEmail = void 0;
var nodemailer_1 = require("nodemailer");
var dotenv_1 = require("dotenv");
dotenv_1.default.config();
// Create reusable transporter object using SMTP transport
var transporter = nodemailer_1.default.createTransport({
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
var getEmailTemplate = function (title, message, buttonText, buttonLink) { return "\n<!DOCTYPE html>\n<html>\n<head>\n  <meta charset=\"utf-8\">\n  <style>\n    body { font-family: 'Inter', sans-serif; background-color: #f6f9fc; margin: 0; padding: 0; color: #333; }\n    .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }\n    .header { background-color: #10b981; padding: 24px; text-align: center; }\n    .header h1 { color: white; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }\n    .content { padding: 32px 24px; text-align: center; }\n    .content h2 { color: #1f2937; font-size: 20px; margin-bottom: 16px; }\n    .content p { color: #4b5563; font-size: 16px; line-height: 1.5; margin-bottom: 24px; }\n    .button { display: inline-block; background-color: #10b981; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 16px; }\n    .footer { padding: 24px; text-align: center; font-size: 14px; color: #9ca3af; border-top: 1px solid #f3f4f6; }\n  </style>\n</head>\n<body>\n  <div class=\"container\">\n    <div class=\"header\">\n      <h1>Vuttik</h1>\n    </div>\n    <div class=\"content\">\n      <h2>".concat(title, "</h2>\n      <p>").concat(message, "</p>\n      <a href=\"").concat(buttonLink, "\" class=\"button\">").concat(buttonText, "</a>\n    </div>\n    <div class=\"footer\">\n      <p>Si no solicitaste esto, puedes ignorar este correo de forma segura.</p>\n      <p>&copy; ").concat(new Date().getFullYear(), " Vuttik. Todos los derechos reservados.</p>\n    </div>\n  </div>\n</body>\n</html>\n"); };
var sendVerificationEmail = function (email, name, token) { return __awaiter(void 0, void 0, void 0, function () {
    var verificationLink, mailOptions, info, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                verificationLink = "https://vuttik.com/verificar?token=".concat(token);
                mailOptions = {
                    from: '"Vuttik" <' + process.env.SMTP_USER + '>',
                    to: email,
                    subject: 'Verifica tu cuenta en Vuttik',
                    html: getEmailTemplate("\u00A1Hola, ".concat(name, "!"), 'Gracias por registrarte en Vuttik. Para completar tu registro y asegurar tu cuenta, por favor haz clic en el siguiente botón.', 'Verificar mi cuenta', verificationLink)
                };
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, transporter.sendMail(mailOptions)];
            case 2:
                info = _a.sent();
                console.log('Verification email sent: %s', info.messageId);
                return [2 /*return*/, true];
            case 3:
                error_1 = _a.sent();
                console.error('Error sending verification email:', error_1);
                return [2 /*return*/, false];
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.sendVerificationEmail = sendVerificationEmail;
var sendPasswordResetEmail = function (email, name, token) { return __awaiter(void 0, void 0, void 0, function () {
    var resetLink, mailOptions, info, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                resetLink = "https://vuttik.com/reset-password?token=".concat(token);
                mailOptions = {
                    from: '"Vuttik" <' + process.env.SMTP_USER + '>',
                    to: email,
                    subject: 'Recuperación de contraseña en Vuttik',
                    html: getEmailTemplate("Recuperaci\u00F3n de contrase\u00F1a", "Hola ".concat(name, ", hemos recibido una solicitud para cambiar tu contrase\u00F1a. Haz clic en el bot\u00F3n de abajo para establecer una nueva contrase\u00F1a. Este enlace expirar\u00E1 en 24 horas."), 'Restablecer contraseña', resetLink)
                };
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, transporter.sendMail(mailOptions)];
            case 2:
                info = _a.sent();
                console.log('Password reset email sent: %s', info.messageId);
                return [2 /*return*/, true];
            case 3:
                error_2 = _a.sent();
                console.error('Error sending password reset email:', error_2);
                return [2 /*return*/, false];
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.sendPasswordResetEmail = sendPasswordResetEmail;
var sendWelcomeEmail = function (email, name) { return __awaiter(void 0, void 0, void 0, function () {
    var loginLink, mailOptions, info, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                loginLink = "https://vuttik.com/";
                mailOptions = {
                    from: '"Vuttik" <' + process.env.SMTP_USER + '>',
                    to: email,
                    subject: '¡Bienvenido a Vuttik!',
                    html: getEmailTemplate("\u00A1Hola, ".concat(name, "!"), 'Nos alegra mucho darte la bienvenida a Vuttik. Tu cuenta ha sido creada exitosamente mediante Google/Facebook y ya está verificada. ¡Empieza a explorar el mercado ahora!', 'Ir a Vuttik', loginLink)
                };
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, transporter.sendMail(mailOptions)];
            case 2:
                info = _a.sent();
                console.log('Welcome email sent: %s', info.messageId);
                return [2 /*return*/, true];
            case 3:
                error_3 = _a.sent();
                console.error('Error sending welcome email:', error_3);
                return [2 /*return*/, false];
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.sendWelcomeEmail = sendWelcomeEmail;
