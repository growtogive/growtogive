import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();
    const { subject, message, name, email } = body;

    const senderName = session?.user?.name || name;
    const senderEmail = session?.user?.email || email;

    if (!subject || !message || !senderEmail) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    // Here you can integrate your email provider (e.g., Resend, SendGrid, Nodemailer) 
    // or log it to your database. For example:
    console.log(`Contact Form Submission from ${senderName} (${senderEmail}):`);
    console.log(`Subject: ${subject}`);
    console.log(`Message: ${message}`);

    return NextResponse.json({ success: true, message: 'Message received successfully.' });
  } catch (err: any) {
    console.error('Contact API error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}