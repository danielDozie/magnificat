import type { APIRoute } from 'astro';
import nodemailer from 'nodemailer';
import fs from 'fs/promises';
import path from 'path';

interface FormData {
  from: string;
  subject: string;
  message: string;
}

interface SMTPConfig {
  host: string;
  user: string;
  password: string;
  port: number;
}

interface EmailResult {
  email: string;
  status: 'sent' | 'failed';
  error?: string;
  label: string;
}

interface EmailList {
  label: string;
  emails: string[];
}


export const POST: APIRoute = async ({ request }) => {
  try {
    const { formData, emailLists, smtpConfigs } = await request.json();
    const { from, subject, message }: FormData = formData;
    const smtps: SMTPConfig[] = smtpConfigs;
    
    const UNSENT_EMAILS_FILE = path.join(process.cwd(), `unsent_emails.json`);

    // Label the entire emailLists array
    const label = `List_${Date.now()}`;
    let labeledEmails: { list: []; label: string } = {list: emailLists, label}

    // Load unsent emails from previous attempts
    try {
      const unsentEmails = JSON.parse(await fs.readFile(UNSENT_EMAILS_FILE, 'utf-8'));
      labeledEmails.list = [...unsentEmails, ...labeledEmails.list] as any;
    } catch (error) {
      console.log('No unsent emails found or error reading file:', error);
    }

    if (!from || !subject || !message || !labeledEmails.list || smtps.length === 0) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
    }

    // Clean up and format the email list
    const cleanedEmailList = labeledEmails.list.flatMap((item: any) => {
      if (typeof item === 'string') {
        return { email: item, label: labeledEmails.label };
      } else if (item && typeof item === 'object' && 'email' in item && 'label' in item) {
        return item;
      }
      return [];
    });

    const emailsPerSMTPPerDay = 2;
    const emailChunks = chunkArray(cleanedEmailList, emailsPerSMTPPerDay);
    
    console.log('Chunk: ', emailChunks)

    const results: EmailResult[] = [];
    const unsentEmails: string[] = [];

    for (let i = 0; i < emailChunks.length; i++) {
      const chunk = emailChunks[i];
      if (!chunk || chunk.length === 0) {
        console.log(`Skipping empty chunk at index ${i}`);
        continue;
      }

      const smtp = smtps[i % smtps.length];
      const transporter = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.port === 465,
        auth: {
          user: smtp.user,
          pass: smtp.password,
        },
      });

      const mailOptions = {
        from: from,
        subject: subject,
        html: message,
      };

      for (const { email, label } of chunk) {
        try {
          await transporter.sendMail({ ...mailOptions, to: email });
          results.push({ email, status: 'sent', label });
        } catch (error) {
            console.error(`Failed to send email to ${email}:`, error);
            //@ts-ignore
          results.push({ email, status: 'failed', error: error.message, label });
          unsentEmails.push(email);
        }
      }
    }

    // Add remaining emails to unsent list
    if (emailChunks.length > smtps.length) {
      unsentEmails.push(...emailChunks.slice(smtps.length).flat());
    }

    // Save unsent emails for future processing
    await fs.writeFile(UNSENT_EMAILS_FILE, JSON.stringify(unsentEmails));

    const successCount = results.filter(result => result.status === 'sent').length;
    const failureCount = results.filter(result => result.status === 'failed').length;

    return new Response(JSON.stringify({
      message: 'Emails processed',
      totalSent: successCount,
      totalFailed: failureCount,
      totalUnsent: unsentEmails.length,
      details: results
    }), { status: 200 });

  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
};

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}