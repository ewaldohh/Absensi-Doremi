import nodemailer from "nodemailer";
import { getSettingsMap } from "@/lib/settings";

export async function hasEmailConfig() {
  const config = await getEmailConfig();
  return Boolean(config.host && config.user && config.pass);
}

export async function sendEmail(input: { to: string; subject: string; text: string }) {
  const config = await getEmailConfig();

  if (!config.host || !config.user || !config.pass) {
    throw new Error("SMTP belum dikonfigurasi.");
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: {
      user: config.user,
      pass: config.pass
    }
  });

  await transporter.sendMail({
    from: config.from,
    to: input.to,
    subject: input.subject,
    text: input.text
  });
}

async function getEmailConfig() {
  const settings = await getSettingsMap();

  return {
    host: settings.smtpHost || process.env.SMTP_HOST || "",
    port: Number(settings.smtpPort || process.env.SMTP_PORT || 587),
    user: settings.smtpUser || process.env.SMTP_USER || "",
    pass: settings.smtpPass || process.env.SMTP_PASS || "",
    from: settings.smtpFrom || process.env.SMTP_FROM || "Bimba Payroll <payroll@bimba.local>"
  };
}
