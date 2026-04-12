import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

/** Convert plain text to a polished, branded HTML email */
function textToHtml(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Split into paragraphs, detect sign-off (last paragraph starting with "Best," / "- Name")
  const parts = escaped.split(/\n\n+/);
  let bodyParts = parts;
  let signOffHtml = "";

  const lastPart = parts[parts.length - 1]?.trim();
  if (lastPart && (lastPart.startsWith("Best,") || lastPart.startsWith("- "))) {
    bodyParts = parts.slice(0, -1);
    const signOffLines = lastPart.replace(/\n/g, "<br>");
    signOffHtml = `<p style="margin:28px 0 0 0;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.6;color:#2B1F17;">${signOffLines}</p>`;
  }

  const paragraphs = bodyParts
    .map((p) => `<p style="margin:0 0 18px 0;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.7;color:#3D3429;">${p.replace(/\n/g, "<br>")}</p>`)
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#F5F0EA;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F5F0EA;">
    <tr><td align="center" style="padding:48px 24px;">

      <!-- Main card -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background-color:#FFFDF9;border-radius:16px;border:1px solid #E8E0D5;">
        <!-- Warm accent bar -->
        <tr><td style="height:4px;background:linear-gradient(90deg, #A5522A 0%, #C4754A 100%);border-radius:16px 16px 0 0;" colspan="3"></td></tr>

        <!-- Content -->
        <tr><td style="padding:40px 40px 36px 40px;">
          ${paragraphs}
          ${signOffHtml}
        </td></tr>

        <!-- Divider -->
        <tr><td style="padding:0 40px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr><td style="height:1px;background-color:#E8E0D5;"></td></tr>
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 40px 24px 40px;">
          <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:11px;color:#9D8A76;letter-spacing:0.03em;">
            Sent with Keepsy
          </p>
        </td></tr>
      </table>

    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendEmail(to: string, subject: string, body: string) {
  const { data, error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || "Keepsy <noreply@keepsy.app>",
    to,
    subject,
    text: body,
    html: textToHtml(body),
  });

  if (error) throw new Error(error.message);
  return data?.id;
}
