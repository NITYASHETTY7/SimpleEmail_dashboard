import nodemailer from 'nodemailer';
import { env } from './env';

interface TransporterCache {
  [email: string]: nodemailer.Transporter;
}

const transporters: TransporterCache = {};
let defaultTransporter: nodemailer.Transporter | null = null;
let defaultAccount: { user: string; pass: string } | null = null;

export async function getOrCreateDefaultTransporter(): Promise<nodemailer.Transporter> {
  if (defaultTransporter) {
    return defaultTransporter;
  }

  if (env.ETHEREAL_USER && env.ETHEREAL_PASS) {
    defaultTransporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: env.ETHEREAL_USER,
        pass: env.ETHEREAL_PASS,
      },
    });
    console.log(`✅ [Mailer] Configured Ethereal SMTP with user: ${env.ETHEREAL_USER}`);
    return defaultTransporter;
  }

  // Automatically generate a test account if no credentials are in env
  try {
    const testAccount = await nodemailer.createTestAccount();
    defaultAccount = {
      user: testAccount.user,
      pass: testAccount.pass,
    };

    defaultTransporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });

    console.log(`✅ [Mailer] Generated new Ethereal test account:`);
    console.log(`   User: ${testAccount.user}`);
    console.log(`   Pass: ${testAccount.pass}`);
    return defaultTransporter;
  } catch (error) {
    console.error('❌ [Mailer] Failed to create Ethereal test account:', error);
    throw error;
  }
}

export async function getTransporterForSender(
  senderEmail: string,
  credentials?: { host?: string; port?: number; user?: string; pass?: string }
): Promise<nodemailer.Transporter> {
  if (transporters[senderEmail]) {
    return transporters[senderEmail];
  }

  if (credentials && credentials.user && credentials.pass) {
    const transporter = nodemailer.createTransport({
      host: credentials.host || 'smtp.ethereal.email',
      port: credentials.port || 587,
      secure: false,
      auth: {
        user: credentials.user,
        pass: credentials.pass,
      },
    });
    transporters[senderEmail] = transporter;
    return transporter;
  }

  // Fallback to default transporter
  const defTransporter = await getOrCreateDefaultTransporter();
  transporters[senderEmail] = defTransporter;
  return defTransporter;
}

export function getPreviewUrl(info: nodemailer.SentMessageInfo): string | false {
  return nodemailer.getTestMessageUrl(info);
}

export function getDefaultEtherealAccount() {
  return defaultAccount;
}
