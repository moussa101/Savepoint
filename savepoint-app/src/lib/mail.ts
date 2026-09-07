import nodemailer from 'nodemailer';
import { escapeHtml } from '@/lib/security';
import { getAppBaseUrl } from '@/lib/app-url';

function createTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;

  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });
}

function fromAddress() {
  return `"Savepoint" <${process.env.GMAIL_USER}>`;
}

export async function sendVerificationEmail(email: string, token: string) {
  const transporter = createTransporter();
  if (!transporter) {
    console.error('Gmail is not configured (GMAIL_USER / GMAIL_APP_PASSWORD)');
    return null;
  }

  const verifyUrl = `${getAppBaseUrl()}/verify?token=${encodeURIComponent(token)}`;

  try {
    return await transporter.sendMail({
      from: fromAddress(),
      to: email,
      subject: 'Verify your email for Savepoint',
      text: `Verify your Savepoint email:\n\n${verifyUrl}\n\nIf you didn't create an account, ignore this email.`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background-color: #0a0a0f; color: #fff; padding: 40px; border-radius: 10px;">
          <h1 style="color: #00e5a0; text-align: center;">Savepoint</h1>
          <h2 style="text-align: center; margin-bottom: 30px;">Verify your email address</h2>
          <p style="font-size: 16px; line-height: 1.5; color: #ccc;">
            Welcome to Savepoint! To complete your registration and start building your gaming profile, please verify your email address by clicking the button below.
          </p>
          <div style="text-align: center; margin: 40px 0;">
            <a href="${verifyUrl}" style="background-color: #00e5a0; color: #0a0a0f; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
              Verify Email Address
            </a>
          </div>
          <p style="font-size: 13px; color: #666; text-align: center; word-break: break-all;">
            Or paste this link into your browser:<br />${escapeHtml(verifyUrl)}
          </p>
          <p style="font-size: 14px; color: #888; text-align: center;">
            If you didn't create an account, you can safely ignore this email.
          </p>
        </div>
      `,
    });
  } catch (error) {
    console.error('Failed to send verification email with Gmail', error);
    return null;
  }
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const transporter = createTransporter();
  if (!transporter) {
    console.error('Gmail is not configured (GMAIL_USER / GMAIL_APP_PASSWORD)');
    return null;
  }

  const resetUrl = `${getAppBaseUrl()}/reset-password?token=${encodeURIComponent(token)}`;

  try {
    return await transporter.sendMail({
      from: fromAddress(),
      to: email,
      subject: 'Reset your Savepoint password',
      text: `Reset your Savepoint password (link expires in 1 hour):\n\n${resetUrl}\n\nIf you didn't request this, ignore this email.`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background-color: #0a0a0f; color: #fff; padding: 40px; border-radius: 10px;">
          <h1 style="color: #00e5a0; text-align: center;">Savepoint</h1>
          <h2 style="text-align: center; margin-bottom: 30px;">Reset your password</h2>
          <p style="font-size: 16px; line-height: 1.5; color: #ccc;">
            We received a request to reset your password. Click the button below to create a new password. This link will expire in 1 hour.
          </p>
          <div style="text-align: center; margin: 40px 0;">
            <a href="${resetUrl}" style="background-color: #00e5a0; color: #0a0a0f; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
              Reset Password
            </a>
          </div>
          <p style="font-size: 13px; color: #666; text-align: center; word-break: break-all;">
            Or paste this link into your browser:<br />${escapeHtml(resetUrl)}
          </p>
          <p style="font-size: 14px; color: #888; text-align: center;">
            If you didn't request a password reset, you can safely ignore this email.
          </p>
        </div>
      `,
    });
  } catch (error) {
    console.error('Failed to send reset email with Gmail', error);
    return null;
  }
}

export async function sendReviewRemovalEmail(email: string, username: string, gameName: string, reason: string) {
  const transporter = createTransporter();
  if (!transporter) {
    console.error('Gmail is not configured (GMAIL_USER / GMAIL_APP_PASSWORD)');
    return null;
  }

  const safeUsername = escapeHtml(username);
  const safeGame = escapeHtml(gameName);

  try {
    return await transporter.sendMail({
      from: `"Savepoint Moderation" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: `Your review for ${gameName.replace(/[\r\n]/g, ' ')} has been removed`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background-color: #0a0a0f; color: #fff; padding: 40px; border-radius: 10px;">
          <h1 style="color: #eb5757; text-align: center;">Savepoint Moderation</h1>
          <h2 style="text-align: center; margin-bottom: 30px;">Review Removed</h2>
          <p style="font-size: 16px; line-height: 1.5; color: #ccc;">
            Hello ${safeUsername},<br><br>
            Your recent review for the game <strong>${safeGame}</strong> has been removed by our moderation team for violating our community guidelines.
          </p>
          <div style="background-color: rgba(255,255,255,0.05); border-left: 4px solid #eb5757; padding: 16px; margin: 30px 0;">
            <p style="margin: 0; font-size: 15px; color: #ddd;">
              <strong>Reason for removal:</strong><br><br>
              ${reason}
            </p>
          </div>
          <p style="font-size: 14px; color: #888;">
            Repeated violations may result in a permanent ban from Savepoint. Please ensure all future contributions follow our community standards.
          </p>
        </div>
      `,
    });
  } catch (error) {
    console.error('Failed to send moderation email with Gmail', error);
    return null;
  }
}

/** Alert that a friend sent an encrypted DM (no plaintext in the email). */
export async function sendDirectMessageEmail(
  email: string,
  senderDisplayName: string,
  senderUsername: string,
  conversationId: string
) {
  const transporter = createTransporter();
  if (!transporter) {
    console.error('Gmail is not configured (GMAIL_USER / GMAIL_APP_PASSWORD)');
    return null;
  }

  const safeName = escapeHtml(senderDisplayName);
  const safeUser = escapeHtml(senderUsername);
  const inboxUrl = `${getAppBaseUrl()}/messages/${encodeURIComponent(conversationId)}`;

  try {
    return await transporter.sendMail({
      from: fromAddress(),
      to: email,
      subject: `New message from ${senderDisplayName.replace(/[\r\n]/g, ' ')}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background-color: #0a0a0f; color: #fff; padding: 40px; border-radius: 10px;">
          <h1 style="color: #00e5a0; text-align: center;">Savepoint</h1>
          <h2 style="text-align: center; margin-bottom: 24px;">New encrypted message</h2>
          <p style="font-size: 16px; line-height: 1.5; color: #ccc;">
            <strong>${safeName}</strong> (@${safeUser}) sent you a private message.
            Messages are end-to-end encrypted — we can’t read them, so open Savepoint to decrypt on your device.
          </p>
          <div style="text-align: center; margin: 36px 0;">
            <a href="${inboxUrl}" style="background-color: #00e5a0; color: #0a0a0f; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
              Open conversation
            </a>
          </div>
        </div>
      `,
    });
  } catch (error) {
    console.error('Failed to send DM email with Gmail', error);
    return null;
  }
}
