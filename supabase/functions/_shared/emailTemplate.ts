export function brandedEmail({
  preheader,
  heading,
  body,
  ctaText,
  ctaUrl,
}: {
  preheader: string;
  heading: string;
  body: string;
  ctaText: string;
  ctaUrl: string;
}): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${heading}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #FDF8F0; font-family: 'DM Sans', Arial, sans-serif; }
    .preheader { display: none !important; max-height: 0; overflow: hidden; mso-hide: all; }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#FDF8F0;">
  <span class="preheader">${preheader}</span>
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#FDF8F0;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border:1px solid #e5e7eb;">
          <!-- Header -->
          <tr>
            <td style="background-color:#0F2B3C;padding:24px 32px;text-align:center;">
              <img src="https://www.coatcalc.com/coatcalc-logo-final.png" alt="CoatCalc" height="40" style="height:40px;" />
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 16px;font-family:'DM Sans',Arial,sans-serif;font-size:22px;font-weight:700;color:#0F2B3C;">
                ${heading}
              </h1>
              <p style="margin:0 0 24px;font-family:'DM Sans',Arial,sans-serif;font-size:15px;line-height:1.6;color:#4b5563;">
                ${body}
              </p>
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="${ctaUrl}"
                       style="display:inline-block;background-color:#0D9488;color:#ffffff;font-family:'DM Sans',Arial,sans-serif;font-size:15px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;text-decoration:none;padding:12px 32px;">
                      ${ctaText}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="margin:0;font-family:'DM Sans',Arial,sans-serif;font-size:12px;color:#9ca3af;">
                CoatCalc — Professional Painting Estimates
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
