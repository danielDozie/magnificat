import type { APIRoute } from 'astro';
import nodemailer from 'nodemailer';
import { kv } from '@vercel/kv';

interface FormData {
  from: string;
  subject: string;
    message: string;
    name: string;
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
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const { formData, emailLists, smtpConfigs } = await request.json();
    const { from, subject, message, name }: FormData = formData;
    const smtps: SMTPConfig[] = smtpConfigs;
    
    const mailList = emailLists;
    // Load unsent emails
    let unsentEmails: string[] = await kv.get('unsent_emails') || [];

    if (!from || !subject || !message || !mailList || smtps.length === 0) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
    }

    // Clean up and format the email list
    const cleanedEmailList: [] = mailList.map((item: string) => {
      if (typeof item === 'string') {
        return item;
      }
        return;
    });


    const emailsPerSMTPPerDay = 100;
    const emailChunks = chunkArray(cleanedEmailList, emailsPerSMTPPerDay);
    
    console.log('Chunk: ', emailChunks)

    const results: EmailResult[] = [];
    //const unsentEmails: string[] = [];

    for (let i = 0; i < emailChunks.length; i++) {
      const chunk = emailChunks[i];
      if (!chunk || chunk.length === 0) {
        console.log(`Skipping empty chunk at index ${i}`);
        continue;
      }

    
    function isValidEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
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
          from: {
              name: `${name} <${from}>`,//use any email to cloak sender
              address: isValidEmail(smtp.user) ? smtp.user : (isValidEmail(from) ? from : from),
          },
          subject: subject,
          html: message,
          replyTo: from,// specify reply-to email
      };

      for (const email of chunk) {
        try {
          await transporter.sendMail({ ...mailOptions, to: email,  });
          results.push({ email, status: 'sent' });
        } catch (error) {
          console.error(`Failed to send email to ${email}:`, error);
          results.push({ email, status: 'failed', error: error as string });
            if (unsentEmails.find((x) => x !== email)) {
                unsentEmails.push(email);
            };
        }
      }
    }

    // Add remaining emails to unsent list
    if (emailChunks.length > smtps.length) {
      unsentEmails.push(...emailChunks.slice(smtps.length).flat());
    }

    // Save unsent emails for future processing
    await kv.set('unsent_emails', unsentEmails);

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