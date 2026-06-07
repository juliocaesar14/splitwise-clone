import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function sendWelcomeEmail(name: string, email: string) {
  try {
    await resend.emails.send({
      from: "Splitwise Clone <onboarding@resend.dev>",
      to: email,
      subject: "Welcome to Splitwise Clone!",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2>Hey ${name}, welcome! 👋</h2>
          <p>Your account is ready. Start splitting expenses with friends and groups.</p>
          <a href="${process.env.NEXTAUTH_URL}/dashboard" 
             style="background:#c8f560;color:#000;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">
            Go to Dashboard
          </a>
        </div>
      `,
    });
  } catch (error) {
    // Don't block registration if email fails
    console.error("Welcome email failed:", error);
  }
}

export async function sendGroupInviteEmail(
  inviteeName: string,
  inviteeEmail: string,
  groupName: string,
  inviterName: string
) {
  try {
    await resend.emails.send({
      from: "Splitwise Clone <onboarding@resend.dev>",
      to: inviteeEmail,
      subject: `${inviterName} added you to "${groupName}"`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2>You've been added to a group! 🎉</h2>
          <p>Hi ${inviteeName},</p>
          <p><strong>${inviterName}</strong> added you to the group <strong>"${groupName}"</strong> on Splitwise Clone.</p>
          <a href="${process.env.NEXTAUTH_URL}/groups" 
             style="background:#c8f560;color:#000;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">
            View Group
          </a>
        </div>
      `,
    });
  } catch (error) {
    console.error("Invite email failed:", error);
  }
}

