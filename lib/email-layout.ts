const F = `-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif`;

export interface EmailLayoutOptions {
  logoText?: string;
  logoImageUrl?: string;
  logoImageHeight?: string;
  headerTagline?: string;
  headerBg?: string;
  headerTextColor?: string;
  headerTaglineColor?: string;
  accentColor?: string;
  bodyBg?: string;
  supportEmail?: string;
  websiteUrl?: string;
  helpUrl?: string;
  unsubscribeUrl?: string;
  copyright?: string;
}

export const EMAIL_LAYOUT_DEFAULTS: Required<EmailLayoutOptions> = {
  logoText: "EditBridge",
  logoImageUrl: "",
  logoImageHeight: "40",
  headerTagline: "India's Editing Marketplace",
  headerBg: "#0f172a",
  headerTextColor: "#ffffff",
  headerTaglineColor: "#94a3b8",
  accentColor: "#4f46e5",
  bodyBg: "#f1f5f9",
  supportEmail: "support@editbridge.com",
  websiteUrl: "https://editbridge.com",
  helpUrl: "https://editbridge.com/help",
  unsubscribeUrl: "https://editbridge.com/unsubscribe",
  copyright: "© 2026 EditBridge Technologies Pvt. Ltd.",
};

export function wrapEmailHtml(content: string, preheader = "", opts: EmailLayoutOptions = {}): string {
  const o = { ...EMAIL_LAYOUT_DEFAULTS, ...Object.fromEntries(Object.entries(opts).filter(([,v]) => v)) };
  const pre = preheader
    ? `<span style="display:none;max-height:0;overflow:hidden;font-size:1px;color:${o.bodyBg};">${preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</span>`
    : "";

  const logoCell = o.logoImageUrl
    ? `<a href="${o.websiteUrl}" style="text-decoration:none;display:inline-block;"><img src="${o.logoImageUrl}" alt="${o.logoText}" height="${o.logoImageHeight}" style="display:block;height:${o.logoImageHeight}px;max-height:${o.logoImageHeight}px;border:0;outline:none;" border="0"/></a>${o.headerTagline ? `<p style="margin:8px 0 0;font-family:${F};font-size:11px;font-weight:600;color:${o.headerTaglineColor};text-transform:uppercase;letter-spacing:1.5px;">${o.headerTagline}</p>` : ""}`
    : `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="vertical-align:middle;"><a href="${o.websiteUrl}" style="text-decoration:none;font-family:${F};font-size:20px;font-weight:800;color:${o.headerTextColor};letter-spacing:-0.5px;">${o.logoText}</a></td><td align="right" style="vertical-align:middle;font-family:${F};font-size:10px;font-weight:700;color:${o.headerTaglineColor};text-transform:uppercase;letter-spacing:2px;">${o.headerTagline}</td></tr></table>`;

  return `<!DOCTYPE html>
<html lang="en" style="color-scheme:light;background-color:${o.bodyBg};" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${o.logoText}</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
<style>
  :root { color-scheme: light only; }
  body { margin:0!important; padding:0!important; background-color:${o.bodyBg}!important; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
  table { border-collapse:collapse!important; }
  img { border:0; height:auto; line-height:100%; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic; }
  a[x-apple-data-detectors] { color:inherit!important; text-decoration:none!important; }
  @media only screen and (max-width:600px) {
    .email-container { width:100%!important; }
    .content-pad { padding:28px 20px!important; }
    .header-pad { padding:20px 20px!important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:${o.bodyBg};word-spacing:normal;">${pre}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${o.bodyBg}" style="background-color:${o.bodyBg};">
<tr><td align="center" style="padding:48px 16px 48px;">
<table role="presentation" class="email-container" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

<!-- HEADER -->
<tr><td class="header-pad" align="${o.logoImageUrl ? "center" : "left"}" bgcolor="${o.headerBg}" style="background-color:${o.headerBg};padding:24px 40px;">
${logoCell}
</td></tr>

<!-- DIVIDER LINE accent -->
<tr><td height="3" bgcolor="${o.accentColor}" style="background-color:${o.accentColor};height:3px;line-height:3px;font-size:0;">&nbsp;</td></tr>

<!-- BODY -->
<tr><td class="content-pad" bgcolor="#ffffff" style="background-color:#ffffff;padding:44px 40px 40px;border-left:1px solid #e8ecf0;border-right:1px solid #e8ecf0;font-family:${F};font-size:15px;line-height:1.75;color:#1e293b;">
${content}
</td></tr>

<!-- FOOTER -->
<tr><td align="center" bgcolor="#f8fafc" style="background-color:#f8fafc;padding:28px 40px 32px;border:1px solid #e8ecf0;border-top:none;border-radius:0 0 16px 16px;font-family:${F};">
<p style="margin:0 0 12px;font-size:13px;color:#64748b;line-height:1.5;">Questions? <a href="mailto:${o.supportEmail}" style="color:${o.accentColor};text-decoration:none;font-weight:600;">${o.supportEmail}</a></p>
<p style="margin:0 0 10px;font-size:12px;color:#94a3b8;line-height:1.6;">
  <a href="${o.websiteUrl}" style="color:#94a3b8;text-decoration:none;">${o.websiteUrl.replace(/^https?:\/\//,"")}</a>
  &nbsp;<span style="color:#cbd5e1;">&middot;</span>&nbsp;
  <a href="${o.helpUrl}" style="color:#94a3b8;text-decoration:none;">Help Center</a>
  &nbsp;<span style="color:#cbd5e1;">&middot;</span>&nbsp;
  <a href="${o.unsubscribeUrl}" style="color:#94a3b8;text-decoration:none;">Unsubscribe</a>
</p>
<p style="margin:0;font-size:11px;color:#cbd5e1;letter-spacing:0.2px;">${o.copyright}</p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

export function isHtmlContent(text: string): boolean {
  return /<(?:p|div|h[1-6]|a|strong|em|table|tr|td|br|ul|ol|li|span)\b/i.test(text);
}

export function textToHtml(text: string): string {
  return text
    .split(/\n\n+/)
    .filter(Boolean)
    .map(para => `<p style="font-size:15px;color:#374151;line-height:1.75;margin:0 0 18px;">${para.trim().replace(/\n/g, "<br>")}</p>`)
    .join("");
}
