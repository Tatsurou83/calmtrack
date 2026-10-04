import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { childName, actionType, entry, recipients } = await request.json();

// Lowercase all recipient emails to satisfy Resend's sandbox validator
const cleanRecipients = (recipients || []).map((email: string) =>
  email.trim().toLowerCase()
);

    if (!recipients || !recipients.length) {
      return NextResponse.json({ error: 'No recipients provided' }, { status: 400 });
    }

    const isWin = entry.type === 'win';
    const isDelete = actionType === 'Deleted';
    const icon = isDelete ? '🗑️' : (isWin ? '🌟' : '⚠️');
    const subject = `${icon} [CalmTrack] ${actionType}: ${isWin ? 'Milestone' : (entry.intensity || 'Behavior')} by ${entry.loggedBy || 'Parent'}`;

    const { data, error } = await resend.emails.send({
  from: 'CalmTrack <onboarding@resend.dev>', // Switch to alerts@calmtrack.app once domain DNS is added
  to: cleanRecipients,
  subject: subject,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
          <div style="background-color: ${isDelete ? '#475569' : (isWin ? '#0d9488' : '#e11d48')}; padding: 18px 22px; color: #fff;">
            <h2 style="margin: 0; font-size: 18px;">${childName || 'Child'}'s Journey</h2>
            <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.9;">Action: ${actionType}</p>
          </div>
          <div style="padding: 20px; background: #fff;">
            <p style="margin: 4px 0;"><strong>When:</strong> ${entry.timestamp}</p>
            <p style="margin: 4px 0;"><strong>Logged By:</strong> ${entry.loggedBy || 'Parent'}</p>
            <p style="margin: 4px 0;"><strong>Intensity:</strong> ${entry.intensity || 'Moderate'}</p>
            <p style="margin: 4px 0;"><strong>Duration:</strong> ${entry.duration || '0m'}</p>
            <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 12px 0;" />
            <p style="margin: 4px 0;"><strong>Triggers:</strong> ${(entry.triggers || []).join(', ') || 'None'}</p>
            <p style="margin: 4px 0;"><strong>Behaviors:</strong> ${(entry.behaviors || []).join(', ') || 'None'}</p>
            <p style="margin: 4px 0;"><strong>What Helped:</strong> ${(entry.interventions || []).join(', ') || 'None'}</p>
            ${entry.notes ? `<div style="background: #f8fafc; border-left: 3px solid #0d9488; padding: 10px 14px; margin-top: 12px; font-style: italic; white-space: pre-wrap;">"${entry.notes}"</div>` : ''}
          </div>
        </div>
      `
    });

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}