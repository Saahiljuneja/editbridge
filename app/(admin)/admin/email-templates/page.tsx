import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { platformSettings } from "@/lib/db/schema";
import { inArray } from "drizzle-orm";
import { EmailTemplatesClient } from "./email-templates-client";
import {
  TEMPLATE_KEYS, ENABLED_KEYS, FROM_NAME_KEYS, CC_KEYS,
  HISTORY_KEYS, HTML_MODE_KEYS, GLOBAL_KEYS,
  APPROVAL_KEYS, LANG_HI_KEYS,
  REPLY_TO_KEYS, BCC_KEYS_LIST, LOCKED_KEYS, PREHEADER_KEYS, ATTACHMENT_KEYS,
  AUDIT_LOG_KEY, BROADCASTS_KEY, PENDING_BROADCASTS_KEY,
  CUSTOM_VARS_KEY, SUPPRESSION_KEY,
  DEFAULTS,
} from "./config";

export const dynamic = "force-dynamic";

const ALL_KEYS = [
  ...TEMPLATE_KEYS, ...ENABLED_KEYS, ...FROM_NAME_KEYS, ...CC_KEYS,
  ...HISTORY_KEYS, ...HTML_MODE_KEYS, ...GLOBAL_KEYS,
  ...APPROVAL_KEYS, ...LANG_HI_KEYS,
  ...REPLY_TO_KEYS, ...BCC_KEYS_LIST, ...LOCKED_KEYS,
  ...PREHEADER_KEYS, ...ATTACHMENT_KEYS,
  AUDIT_LOG_KEY, BROADCASTS_KEY, PENDING_BROADCASTS_KEY,
  CUSTOM_VARS_KEY, SUPPRESSION_KEY,
];

export default async function AdminEmailTemplatesPage() {
  const session = await auth();
  if (!session || session.user.role !== "admin") redirect("/admin/dashboard");

  const rows = await db.select().from(platformSettings).where(inArray(platformSettings.key, ALL_KEYS));
  const saved = Object.fromEntries(rows.map(r => [r.key, r.value]));

  const templates   = Object.fromEntries(TEMPLATE_KEYS.map(k   => [k, saved[k] ?? DEFAULTS[k] ?? ""]));
  const enabled     = Object.fromEntries(ENABLED_KEYS.map(k    => [k, saved[k] !== "false"]));
  const fromNames   = Object.fromEntries(FROM_NAME_KEYS.map(k  => [k, saved[k] ?? ""]));
  const ccs         = Object.fromEntries(CC_KEYS.map(k         => [k, saved[k] ?? ""]));
  const htmlModes   = Object.fromEntries(HTML_MODE_KEYS.map(k  => [k, saved[k] === "true"]));
  const histories   = Object.fromEntries(HISTORY_KEYS.map(k    => [k, saved[k] ? JSON.parse(saved[k]) : []]));
  const globals     = Object.fromEntries(GLOBAL_KEYS.map(k     => [k, saved[k] ?? ""]));
  const approvals        = Object.fromEntries(APPROVAL_KEYS.map(k   => [k, saved[k] ?? "approved"]));
  const langHi           = Object.fromEntries(LANG_HI_KEYS.map(k    => [k, saved[k] ?? ""]));
  const replyTos         = Object.fromEntries(REPLY_TO_KEYS.map(k    => [k, saved[k] ?? ""]));
  const bccs             = Object.fromEntries(BCC_KEYS_LIST.map(k    => [k, saved[k] ?? ""]));
  const locked           = Object.fromEntries(LOCKED_KEYS.map(k      => [k, saved[k] === "true"]));
  const preheaders       = Object.fromEntries(PREHEADER_KEYS.map(k   => [k, saved[k] ?? ""]));
  const attachments      = Object.fromEntries(ATTACHMENT_KEYS.map(k  => [k, saved[k] ?? ""]));
  const auditLog         = saved[AUDIT_LOG_KEY]          ? JSON.parse(saved[AUDIT_LOG_KEY])          : [];
  const broadcasts       = saved[BROADCASTS_KEY]         ? JSON.parse(saved[BROADCASTS_KEY])         : [];
  const pendingBroadcasts= saved[PENDING_BROADCASTS_KEY] ? JSON.parse(saved[PENDING_BROADCASTS_KEY]) : [];
  const customVars       = saved[CUSTOM_VARS_KEY]        ? JSON.parse(saved[CUSTOM_VARS_KEY])        : [];
  const suppressionList  = saved[SUPPRESSION_KEY]        ? JSON.parse(saved[SUPPRESSION_KEY])        : [];

  return (
    <EmailTemplatesClient
      templates={templates} enabled={enabled} fromNames={fromNames} ccs={ccs}
      htmlModes={htmlModes} histories={histories} globals={globals}
      approvals={approvals} langHi={langHi}
      replyTos={replyTos} bccs={bccs} locked={locked}
      preheaders={preheaders} attachments={attachments}
      auditLog={auditLog} broadcasts={broadcasts}
      pendingBroadcasts={pendingBroadcasts}
      customVars={customVars} suppressionList={suppressionList}
      defaults={DEFAULTS}
    />
  );
}
