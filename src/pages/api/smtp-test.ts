import type { APIRoute } from 'astro';
import nodemailer from 'nodemailer';

interface SMTPConfig {
  host: string;
  user: string;
  password: string;
  port: number;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const smtpConfig: SMTPConfig = await request.json();

    // Create a transporter using the provided SMTP configuration
    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.port === 465, // true for 465, false for other ports
      auth: {
        user: smtpConfig.user,
        pass: smtpConfig.password,
      },
    });

    // Verify the connection configuration
    await transporter.verify();

    // If verification is successful, return a success response
    return new Response(JSON.stringify({ success: true, message: 'SMTP connection successful' }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('SMTP connection test failed:', error);
    
      // If an error occurs, return an error response
      //@ts-ignore
    return new Response(JSON.stringify({ success: false, message: 'SMTP connection failed', error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};
