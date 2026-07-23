"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import { toast } from "sonner";
import {
  Save, ChevronDown, ChevronUp, Mail, Search, X, Eye, Send,
  RotateCcw, ToggleLeft, ToggleRight, Download, Upload, History,
  Copy, Code, AlignLeft, Settings, Inbox, Globe, CheckCircle,
  AlertCircle, Megaphone, ClipboardList, Bold, Italic,
  Underline, Link, List, Minus, Monitor, Smartphone, Moon,
  Trash2, RefreshCw, Languages, Lock, Unlock,
  Calendar, Clock, Ban, TrendingUp, PlusCircle, BookOpen,
  Zap, Shield, Users, BarChart2, Variable, FlaskConical, FileText,
  ArrowRight, LayoutTemplate,
} from "lucide-react";
import { wrapEmailHtml, isHtmlContent } from "@/lib/email-layout";
import { EmailBuilder, parseToBlocks, blocksToHtml } from "./email-builder";
import {
  SECTIONS, DUMMY_VARS, DEFAULTS,
  enabledKey, fromNameKey, ccKey, historyKey, htmlModeKey,
  approvalKey,
  langSubjectKey, langBodyKey, replyToKey, bccKey, lockedKey, preheaderKey, attachmentKey,
  type Group, type HistoryEntry, type AuditEntry,
  type BroadcastRecord, type PendingBroadcast, type SuppressionEntry, type CustomVar, type TestHistoryEntry,
} from "./config";

// ─── helpers ─────────────────────────────────────────────────────────────────

function Skel({w,h="h-3"}:{w:string;h?:string}){return <div className={`animate-pulse bg-gray-100 rounded ${h} ${w}`}/>;}
function SkeletonRow(){return <div className="flex items-center gap-4 px-4 py-3 border-b border-gray-50 last:border-0"><Skel w="w-16" h="h-4"/><Skel w="flex-1"/><Skel w="w-24"/><Skel w="w-20"/></div>;}

const RECIPIENT_BADGE: Record<string, string> = {
  "Client":       "bg-sky-100 text-sky-700",
  "Editor":       "bg-violet-100 text-violet-700",
  "Both parties": "bg-amber-100 text-amber-700",
  "All users":    "bg-emerald-100 text-emerald-700",
};

function fillVars(text: string, extra: Record<string, string> = {}): string {
  let out = text;
  for (const [k, v] of Object.entries({ ...DUMMY_VARS, ...extra })) out = out.replaceAll(k, v);
  return out;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function detectMissingVars(body: string, declared: string[], custom: CustomVar[]): string[] {
  const all = [...declared, ...custom.map(v => v.key)];
  const found = body.match(/\{\{[^}]+\}\}/g) ?? [];
  return [...new Set(found)].filter(v => !all.includes(v));
}

function hasHtmlTags(text: string) { return /<[a-z][\s\S]*>/i.test(text); }

function wrapSelection(el: HTMLTextAreaElement, before: string, after: string, onChange: (v: string) => void) {
  const s = el.selectionStart ?? 0, e = el.selectionEnd ?? 0;
  const sel = el.value.slice(s, e);
  const updated = el.value.slice(0, s) + before + sel + after + el.value.slice(e);
  onChange(updated);
  requestAnimationFrame(() => { el.selectionStart = s + before.length; el.selectionEnd = s + before.length + sel.length; el.focus(); });
}

function lineDiff(oldText: string, newText: string) {
  const a = oldText.split("\n"), b = newText.split("\n");
  const m = a.length, n = b.length;
  const lcs: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) lcs[i][j] = a[i-1]===b[j-1] ? lcs[i-1][j-1]+1 : Math.max(lcs[i-1][j],lcs[i][j-1]);
  const ops: { type: "same"|"add"|"remove"; text: string }[] = [];
  let i = m, j = n;
  while (i>0||j>0) {
    if (i>0&&j>0&&a[i-1]===b[j-1]) { ops.push({type:"same",text:a[i-1]}); i--; j--; }
    else if (j>0&&(i===0||lcs[i][j-1]>=lcs[i-1][j])) { ops.push({type:"add",text:b[j-1]}); j--; }
    else { ops.push({type:"remove",text:a[i-1]}); i--; }
  }
  return ops.reverse();
}

// Shared input class — base without w-full so callers can override width
const ic = "border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20";

// Opens a template preview in a new browser tab as a self-contained HTML blob
function openInTab(label: string, subject: string, body: string, isHtml: boolean) {
  const filled = fillVars(body);
  const html = `<!DOCTYPE html><html><head><title>Preview — ${label}</title><style>body{font-family:sans-serif;max-width:600px;margin:40px auto;padding:0 20px;line-height:1.6;color:#111}pre{white-space:pre-wrap;font-family:inherit}</style></head><body><h3 style="color:#555;font-size:12px;text-transform:uppercase;letter-spacing:.08em">Subject</h3><p style="font-weight:600">${fillVars(subject)}</p><hr style="margin:16px 0;border:none;border-top:1px solid #e5e7eb">${isHtml ? filled : `<pre>${filled}</pre>`}</body></html>`;
  const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  window.open(url, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

function logAudit(entry: Omit<AuditEntry, "id"|"timestamp"|"adminEmail">) {
  fetch("/api/admin/email-templates/audit", {
    method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(entry),
  }).catch(() => {});
}

// ─── types ────────────────────────────────────────────────────────────────────

interface Props {
  templates:         Record<string, string>;
  enabled:           Record<string, boolean>;
  fromNames:         Record<string, string>;
  ccs:               Record<string, string>;
  htmlModes:         Record<string, boolean>;
  histories:         Record<string, HistoryEntry[]>;
  globals:           Record<string, string>;
  approvals:         Record<string, string>;
  langHi:            Record<string, string>;
  replyTos:          Record<string, string>;
  bccs:              Record<string, string>;
  locked:            Record<string, boolean>;
  preheaders:        Record<string, string>;
  attachments:       Record<string, string>;
  auditLog:          AuditEntry[];
  broadcasts:        BroadcastRecord[];
  pendingBroadcasts: PendingBroadcast[];
  customVars:        CustomVar[];
  suppressionList:   SuppressionEntry[];
  defaults:          Record<string, string>;
}

type TabId = "overview"|"templates"|"broadcast"|"builder"|"analytics"|"delivery"|"audit"|"settings";

// ─── root ─────────────────────────────────────────────────────────────────────

export function EmailTemplatesClient(props: Props) {
  const [tab, setTab] = useState<TabId>("overview");
  const [unsavedCount, setUnsavedCount] = useState(0);
  const [builderHtml, setBuilderHtml] = useState<string|null>(null);
  const [builderLoad, setBuilderLoad] = useState<{label:string;body:string}|null>(null);
  const TABS: {id:TabId;label:string;icon:React.ElementType}[] = [
    {id:"overview",  label:"Overview",   icon:BookOpen},
    {id:"templates", label:"Templates",  icon:Mail},
    {id:"broadcast", label:"Broadcast",  icon:Megaphone},
    {id:"builder",   label:"Builder",    icon:LayoutTemplate},
    {id:"analytics", label:"Analytics",  icon:BarChart2},
    {id:"delivery",  label:"Delivery",   icon:Inbox},
    {id:"audit",     label:"Audit",      icon:ClipboardList},
    {id:"settings",  label:"Settings",   icon:Settings},
  ];
  return (
    <div className="px-8 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Email Templates</h1>
        <p className="text-sm text-gray-500 mt-1">Manage every email sent by the platform.</p>
      </div>
      <div className="overflow-x-auto pb-0.5 -mx-1 px-1">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-max">
          {TABS.map(({id,label,icon:Icon})=>(
            <button key={id} onClick={()=>setTab(id)} className={`relative flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${tab===id?"bg-white text-gray-900 shadow-sm":"text-gray-500 hover:text-gray-700"}`}>
              <Icon className="w-3.5 h-3.5"/>{label}
              {id==="templates"&&unsavedCount>0&&<span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 text-white text-[9px] font-bold rounded-full flex items-center justify-center">{unsavedCount}</span>}
            </button>
          ))}
        </div>
      </div>
      {tab==="overview"  && <OverviewTab totalTemplates={Object.keys(props.templates).length/2} activeTemplates={Object.values(props.enabled).filter(Boolean).length} suppressedCount={props.suppressionList.length} broadcasts={props.broadcasts} onNavigate={setTab}/>}
      {tab==="templates" && <TemplatesTab {...props} broadcasts={props.broadcasts} onModifiedChange={setUnsavedCount} injectHtml={builderHtml} onInjectConsumed={()=>setBuilderHtml(null)} onEditInBuilder={(label,body)=>{setBuilderLoad({label,body});setTab("builder");}}/>}
      {tab==="builder"   && (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5" style={{minHeight:640}}>
          <EmailBuilder
            templates={props.templates}
            loadTemplate={builderLoad}
            onUseAsTemplate={(html,label)=>{
              setBuilderHtml(html);
              setBuilderLoad(null);
              setTab("templates");
            }}
          />
        </div>
      )}
      {tab==="broadcast" && <BroadcastTab broadcasts={props.broadcasts} pendingBroadcasts={props.pendingBroadcasts} globals={props.globals} templates={props.templates} suppressionList={props.suppressionList}/>}
      {tab==="analytics" && <AnalyticsTab broadcasts={props.broadcasts} suppressionList={props.suppressionList} onNavigate={setTab}/>}
      {tab==="delivery"  && <DeliveryTab/>}
      {tab==="audit"     && <AuditTab initialLog={props.auditLog}/>}
      {tab==="settings"  && <SettingsTab globals={props.globals} customVars={props.customVars} suppressionList={props.suppressionList}/>}
    </div>
  );
}

// ─── Overview tab ────────────────────────────────────────────────────────────

function OverviewTab({totalTemplates,activeTemplates,suppressedCount,broadcasts,onNavigate}:{totalTemplates:number;activeTemplates:number;suppressedCount:number;broadcasts:BroadcastRecord[];onNavigate:(t:TabId)=>void}) {
  const [quota,setQuota]=useState<{sentThisMonth:number}|null>(null);
  const [openRate,setOpenRate]=useState<string|null>(null);
  useEffect(()=>{
    fetch("/api/admin/email-templates/quota").then(r=>r.json()).then(d=>setQuota(d)).catch(()=>{});
    fetch("/api/admin/email-templates/analytics").then(r=>r.json()).then(d=>{ if(!d.error)setOpenRate(d.openRate); }).catch(()=>{});
  },[]);
  const lastBroadcast = broadcasts[0] ?? null;
  const lastBroadcastDays = lastBroadcast ? Math.floor((Date.now()-new Date(lastBroadcast.timestamp).getTime())/86400_000) : null;
  const SECTIONS_DATA = [
    { icon: Zap,         color: "bg-blue-50 text-blue-600",    title: "How emails are sent", body: "Every user-facing action on EditBridge — signups, order updates, KYC decisions, disputes — triggers a corresponding email template. Templates are rendered server-side, variables are substituted, and the email is dispatched via Resend. Transactional emails fire instantly; marketing broadcasts are sent manually from the Broadcast tab." },
    { icon: FileText,    color: "bg-violet-50 text-violet-600", title: "Template system", body: `There are ${totalTemplates} templates organised across 10 sections (Auth, Client, Editor, Order, Payments, Reviews, Disputes, KYC, Admin, Marketing). Each template has a subject line, body, sender name, CC, BCC, reply-to, preheader, and an optional attachment URL. Every field supports {{variables}} that are replaced at send time.` },
    { icon: Variable,    color: "bg-amber-50 text-amber-600",   title: "Variables", body: "Variables are written as {{variableName}}. Built-in variables include {{name}}, {{orderId}}, {{amount}}, {{editorName}}, {{clientName}}, and more. You can also define custom variables in Settings → Custom Variables and use them in any template. The Variables drawer in the editor lets you click to insert at the cursor." },
    { icon: FlaskConical,color: "bg-pink-50 text-pink-600",     title: "A/B testing & languages", body: "Every template supports a Variant B — an alternate subject and body you can draft and switch between. There is also a Hindi (हिंदी) variant per template. Switch variants using the toggle at the top of each template card. Broadcast always sends the currently saved Variant A body." },
    { icon: Users,       color: "bg-emerald-50 text-emerald-600",title: "Broadcasts", body: "Send a template to a whole segment — All Clients, All Editors, or Inactive Clients (no order in 90+ days). Before sending you see a recipient preview showing the first 5 eligible addresses and the total count. Broadcasts respect the suppression list, the send-window restriction, and the per-send throttle. You can also schedule a broadcast for a future time." },
    { icon: Shield,      color: "bg-red-50 text-red-600",        title: "Suppression & compliance", body: `Emails on the suppression list are silently skipped by every broadcast. Addresses are added automatically when Resend reports a hard bounce or spam complaint via webhook (POST /api/webhooks/resend). You can also add or remove addresses manually in Settings → Suppression List. Currently ${suppressedCount} address${suppressedCount!==1?"es are":"is"} suppressed.` },
    { icon: BarChart2,   color: "bg-sky-50 text-sky-600",        title: "Delivery tracking", body: "The Delivery tab shows up to 100 recent emails from Resend with their latest event status (sent, delivered, opened, clicked, bounced, failed). A 14-day sparkline shows volume trends. Bounced emails have a one-click Suppress button. Resend automatically fires the webhook on hard bounces and spam complaints to keep the suppression list current." },
    { icon: Globe,       color: "bg-gray-50 text-gray-600",       title: "Global settings", body: "Settings → Global Settings controls the default sender name, the unsubscribe footer appended to marketing emails, the broadcast throttle (ms between sends), and the send window (allowed IST hours for broadcasts). The Pause all emails kill switch immediately halts all outgoing email until toggled off. These settings take effect on the next send." },
  ];

  const FEATURES = [
    { label:"Per-template enable/disable",      tab:"templates"  as TabId },
    { label:"Lock templates against edits",     tab:"templates"  as TabId },
    { label:"Approval / draft status",          tab:"templates"  as TabId },
    { label:"Version history with diff & restore", tab:"templates" as TabId },
    { label:"HTML or plain-text mode",          tab:"templates"  as TabId },
    { label:"HTML toolbar (bold, link, list…)", tab:"templates"  as TabId },
    { label:"Preheader / inbox preview text",   tab:"templates"  as TabId },
    { label:"Attachment URL per template",      tab:"templates"  as TabId },
    { label:"Multi-address CC & BCC chips",     tab:"templates"  as TabId },
    { label:"Send test email to any address",   tab:"templates"  as TabId },
    { label:"Duplicate template to another",    tab:"templates"  as TabId },
    { label:"Import / export as JSON",          tab:"templates"  as TabId },
    { label:"Bulk enable/disable per section",  tab:"templates"  as TabId },
    { label:"Scheduled broadcasts",             tab:"broadcast"  as TabId },
    { label:"Recipient preview before send",    tab:"broadcast"  as TabId },
    { label:"Broadcast history log",            tab:"broadcast"  as TabId },
    { label:"14-day delivery sparkline",        tab:"delivery"   as TabId },
    { label:"Suppress bounced addresses",       tab:"delivery"   as TabId },
    { label:"Audit log of all admin actions",   tab:"audit"      as TabId },
    { label:"Custom variables",                 tab:"settings"   as TabId },
    { label:"Send window (IST hours)",          tab:"settings"   as TabId },
    { label:"Pause all emails kill switch",     tab:"settings"   as TabId },
  ];

  const QUICKSTART = [
    { step:"1", title:"Edit a template", desc:"Go to Templates, find the email you want to change, expand it, edit the subject and body, then press Save (or Cmd+S)." },
    { step:"2", title:"Send a test email", desc:"Click the Test button inside any expanded template to send yourself a preview with sample variable data." },
    { step:"3", title:"Send a broadcast", desc:"Go to Broadcast, pick a segment and template, check the recipient preview, confirm, and send." },
    { step:"4", title:"Monitor delivery", desc:"Go to Delivery to see recent emails and their status. Bounce an address? Click Suppress to prevent future sends." },
    { step:"5", title:"Review audit trail", desc:"Every save, enable/disable, lock, and broadcast is logged in the Audit tab with timestamp and admin email." },
  ];

  const VARS_REFERENCE = [
    ["{{name}}", "Recipient's first name"],
    ["{{clientName}}", "Client's first name"],
    ["{{editorName}}", "Editor's first name"],
    ["{{orderId}}", "Order reference, e.g. EB-A1B2C3D4"],
    ["{{amount}}", "Order value, e.g. ₹12,500"],
    ["{{packageTitle}}", "Name of the booked package"],
    ["{{days}}", "Number of days (deadlines, etc.)"],
    ["{{reason}}", "Rejection or dispute reason"],
    ["{{decision}}", "KYC or dispute decision"],
    ["{{verificationLink}}", "Email verification URL"],
    ["{{resetLink}}", "Password reset URL"],
  ];

  return (
    <div className="space-y-8">

      {/* Live stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          {label:"Active Templates", value:activeTemplates.toLocaleString(),    sub:`of ${totalTemplates} total`,          color:"text-gray-900",   onClick:()=>onNavigate("templates")},
          {label:"Emails This Month",value:quota!=null?quota.sentThisMonth.toLocaleString():"—", sub:"via Resend",         color:"text-indigo-600", onClick:()=>onNavigate("delivery")},
          {label:"Open Rate",        value:openRate!=null?`${openRate}%`:"—",    sub:"last 100 emails",                    color:"text-blue-600",   onClick:()=>onNavigate("analytics")},
          {label:"Broadcasts Sent",  value:broadcasts.length.toLocaleString(),  sub:"total campaigns",                     color:"text-violet-600", onClick:()=>onNavigate("broadcast")},
          {label:"Last Broadcast",   value:lastBroadcastDays===null?"—":lastBroadcastDays===0?"Today":lastBroadcastDays===1?"Yesterday":`${lastBroadcastDays}d ago`, sub:lastBroadcast?.templateLabel??"no broadcasts", color:"text-gray-700", onClick:()=>onNavigate("broadcast")},
          {label:"Suppressed",       value:suppressedCount.toLocaleString(),    sub:"emails excluded",                     color:suppressedCount>0?"text-red-500":"text-gray-500", onClick:()=>onNavigate("settings")},
        ].map(({label,value,sub,color,onClick})=>(
          <button key={label} onClick={onClick} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-left hover:border-gray-300 transition-colors">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</p>
            <p className={`text-xl font-bold tabular-nums leading-none ${color}`}>{value}</p>
            <p className="text-[10px] text-gray-400 mt-1 truncate">{sub}</p>
          </button>
        ))}
      </div>

      {/* Quick-start */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-6">
        <h3 className="text-sm font-bold text-gray-900 mb-5">Quick start</h3>
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-100"/>
          <div className="space-y-5">
            {QUICKSTART.map(({step,title,desc})=>(
              <div key={step} className="flex gap-4 relative">
                <div className="w-8 h-8 rounded-full bg-gray-900 text-white text-xs font-bold flex items-center justify-center shrink-0 relative z-10">{step}</div>
                <div className="pt-1 pb-1">
                  <p className="text-sm font-semibold text-gray-900">{title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* How it works sections */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">How it works</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SECTIONS_DATA.map(({icon:Icon,color,title,body})=>(
            <div key={title} className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5 flex gap-4">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                <Icon className="w-4.5 h-4.5 w-[18px] h-[18px]"/>
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900 mb-1">{title}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs reference */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-6">
        <h3 className="text-sm font-bold text-gray-900 mb-4">What each tab does</h3>
        <div className="space-y-3">
          {([
            {icon:Mail,        tab:"templates" as TabId, label:"Templates",  desc:"Edit the subject, body, sender, CC, BCC, reply-to, preheader, and attachment for every email. Manage A/B variants, Hindi translations, version history, locking, and approval status."},
            {icon:Megaphone,   tab:"broadcast" as TabId, label:"Broadcast",  desc:"Send a template to a whole user segment now or at a scheduled time. See a live recipient preview and broadcast history. Respects suppression list, send window, and throttle."},
            {icon:BarChart2,   tab:"analytics" as TabId, label:"Analytics",  desc:"Weekly email volume chart, segment breakdown, most-used templates, and a recent broadcast log — all derived from your broadcast history with no extra API calls."},
            {icon:Inbox,       tab:"delivery"  as TabId, label:"Delivery",   desc:"View up to 100 recent emails from Resend with event status. Filter by delivered, opened, bounced, etc. Suppress bounced addresses with one click."},
            {icon:ClipboardList,tab:"audit"    as TabId, label:"Audit",      desc:"Every admin action — save, enable/disable, lock, approval change — is logged here with timestamp and admin email. Searchable and clearable."},
            {icon:Settings,    tab:"settings"  as TabId, label:"Settings",   desc:"Configure global sender name, unsubscribe footer, broadcast throttle, IST send window, and the emergency pause kill switch. Manage custom variables and the suppression list."},
          ]).map(({icon:Icon,tab,label,desc})=>(
            <div key={label} className="flex items-start gap-4 p-3.5 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-colors group">
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 group-hover:bg-gray-200 transition-colors">
                <Icon className="w-4 h-4 text-gray-500"/>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{label}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{desc}</p>
              </div>
              <button onClick={()=>onNavigate(tab)} className="shrink-0 flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-gray-700 transition-colors mt-1">
                Go<ArrowRight className="w-3 h-3"/>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Feature list + variables reference side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-4">All features</h3>
          <div className="space-y-1.5">
            {FEATURES.map(({label,tab})=>(
              <button key={label} onClick={()=>onNavigate(tab)}
                className="w-full flex items-center gap-2.5 text-left text-xs text-gray-600 hover:text-gray-900 group py-0.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0"/>
                <span className="flex-1 group-hover:underline underline-offset-2">{label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-4">Built-in variables</h3>
          <p className="text-xs text-gray-400 mb-3">Use these in any template subject or body. They are replaced at send time with real data.</p>
          <div className="space-y-2">
            {VARS_REFERENCE.map(([key,desc])=>(
              <div key={key} className="flex items-baseline gap-3">
                <code className="text-[11px] font-mono text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded shrink-0 min-w-0">{key}</code>
                <span className="text-xs text-gray-500 truncate">{desc}</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-gray-400 mt-4 border-t border-gray-100 pt-3">Define additional variables in Settings → Custom Variables.</p>
        </div>
      </div>

      {/* Tips */}
      <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5">
        <p className="text-xs font-bold uppercase tracking-widest text-amber-500 mb-3">Tips</p>
        <ul className="space-y-2">
          {[
            "Press Cmd+S (or Ctrl+S) while a template is open to save it instantly.",
            "Use the Variables drawer in the toolbar to click-insert any variable at the cursor position.",
            "Subject lines over 60 characters are truncated in Gmail — watch the counter.",
            "Lock a template to prevent accidental edits; it still shows the content but blocks saving.",
            "The Resend webhook at /api/webhooks/resend auto-suppresses hard bounces and spam complaints — add it in your Resend dashboard.",
            "Send a test email before every broadcast to verify variables render correctly.",
            "Broadcasts outside the configured send window (IST) are rejected with an error — set the window in Settings.",
          ].map((tip,i)=>(
            <li key={i} className="flex items-start gap-2 text-xs text-amber-800">
              <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"/>
              {tip}
            </li>
          ))}
        </ul>
      </div>

    </div>
  );
}

// ─── Templates tab ────────────────────────────────────────────────────────────

function TemplatesTab({ templates:init, enabled:initEnabled, fromNames:initFN, ccs:initCcs, htmlModes:initHtml,
  histories:initHist, globals, approvals:initApprovals, langHi:initLangHi,
  replyTos:initRT, bccs:initBccs, locked:initLocked, preheaders:initPH, attachments:initATT,
  customVars, defaults, auditLog, broadcasts,
  onModifiedChange, injectHtml, onInjectConsumed, onEditInBuilder,
}: Props & { broadcasts: BroadcastRecord[]; onModifiedChange?: (n: number) => void; injectHtml?: string|null; onInjectConsumed?: ()=>void; onEditInBuilder?: (label:string, body:string)=>void }) {

  const [templates, setTemplates] = useState(init);
  const [enabled,   setEnabled]   = useState(initEnabled);
  const [fromNames, setFromNames] = useState(initFN);
  const [ccs,       setCcs]       = useState(initCcs);
  const [htmlModes, setHtmlModes] = useState(initHtml);
  const [histories, setHistories] = useState(initHist);
  const [approvals, setApprovals] = useState(initApprovals);
  const [langHi,    setLangHi]    = useState(initLangHi);
  const [replyTos,  setReplyTos]  = useState(initRT);
  const [bccs,      setBccs]      = useState(initBccs);
  const [locked,      setLocked]      = useState(initLocked);
  const [preheaders,  setPreheaders]  = useState(initPH);
  const [attachments, setAttachments] = useState(initATT);
  const [deliveryEmails, setDeliveryEmails] = useState<{subject:string;created_at:string}[]>([]);
  const [modified,  setModified]  = useState<Set<string>>(new Set());
  const [open,      setOpen]      = useState<Set<string>>(new Set());
  const [saving,    setSaving]    = useState(false);
  const [savingOne, setSavingOne] = useState<string|null>(null);
  const [search,    setSearch]    = useState("");
  const [varDrawer, setVarDrawer] = useState(false);
  const [allOpen,   setAllOpen]   = useState(false);
  const [preview,   setPreview]   = useState<{label:string;subject:string;body:string;recipient?:string;isHtml:boolean}|null>(null);

  const fileInputRef   = useRef<HTMLInputElement>(null);
  const activeFieldRef = useRef<{key:string;el:HTMLInputElement|HTMLTextAreaElement}|null>(null);

  const footerOn   = globals["email_footer_enabled"]==="true";
  const footerText = globals["email_footer_text"]??"";
  const allCustomVars = customVars??[];

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey||e.ctrlKey)&&e.key==="s"&&open.size>0) {
        e.preventDefault();
        const group = SECTIONS.flatMap(s=>s.groups).find(g=>open.has(g.label));
        if (group&&!locked[lockedKey(group)]) saveOne(group);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) { if (modified.size>0) { e.preventDefault(); e.returnValue=""; } }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [modified]);

  useEffect(() => { onModifiedChange?.(modified.size); }, [modified.size]);

  // When builder pushes HTML here, open the first template's body field and inject
  useEffect(() => {
    if (!injectHtml) return;
    const firstSection = SECTIONS[0];
    if (firstSection?.groups[0]) {
      const bodyKey = firstSection.groups[0].body;
      setField(bodyKey, injectHtml);
      setHtmlModes(m => ({ ...m, [bodyKey]: true }));
      setOpen(o => new Set([...o, firstSection.section]));
      toast.success("Builder HTML injected into first template — review and save");
    }
    onInjectConsumed?.();
  }, [injectHtml]);

  useEffect(() => {
    fetch("/api/admin/email-templates/delivery").then(r=>r.json()).then(d=>setDeliveryEmails(d.emails??[])).catch(()=>{});
  }, []);

  const mark   = (...keys: string[]) => setModified(m=>{const n=new Set(m);keys.forEach(k=>n.add(k));return n;});
  const unmark = (...keys: string[]) => setModified(m=>{const n=new Set(m);keys.forEach(k=>n.delete(k));return n;});

  const setField   = (k:string,v:string) => { setTemplates(t=>({...t,[k]:v})); mark(k); };
  const setHiField = (k:string,v:string) => { setLangHi(x=>({...x,[k]:v})); mark(k); };
  const setFN      = (k:string,v:string) => { setFromNames(x=>({...x,[k]:v})); mark(k); };
  const setCC      = (k:string,v:string) => { setCcs(x=>({...x,[k]:v})); mark(k); };
  const setRT      = (k:string,v:string) => { setReplyTos(x=>({...x,[k]:v})); mark(k); };
  const setBCC     = (k:string,v:string) => { setBccs(x=>({...x,[k]:v})); mark(k); };
  const setPH      = (k:string,v:string) => { setPreheaders(x=>({...x,[k]:v})); mark(k); };
  const setATT     = (k:string,v:string) => { setAttachments(x=>({...x,[k]:v})); mark(k); };

  function insertVar(varName: string) {
    if (!activeFieldRef.current) { toast.info("Click a field first"); return; }
    const {key,el} = activeFieldRef.current;
    const s=el.selectionStart??0,e2=el.selectionEnd??0;
    const cur=templates[key]??langHi[key]??fromNames[key]??ccs[key]??replyTos[key]??bccs[key]??preheaders[key]??"";
    const updated=cur.slice(0,s)+varName+cur.slice(e2);
    if (key in templates)      setField(key,updated);
    else if (key in langHi)    setHiField(key,updated);
    else if (key in fromNames) setFN(key,updated);
    else if (key in replyTos)  setRT(key,updated);
    else if (key in preheaders) { setPreheaders(x=>({...x,[key]:updated})); mark(key); }
    requestAnimationFrame(()=>{el.selectionStart=el.selectionEnd=s+varName.length;el.focus();});
  }

  async function patchSetting(payload: Record<string,string>) {
    await fetch("/api/admin/settings",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
  }

  async function toggleEnabled(group: Group) {
    const ek=enabledKey(group),val=!enabled[ek];
    setEnabled(e=>({...e,[ek]:val}));
    await patchSetting({[ek]:String(val)});
    logAudit({templateLabel:group.label,action:val?"enable":"disable"});
    toast.success(val?"Enabled":"Disabled");
  }

  async function toggleApproval(group: Group) {
    const ak=approvalKey(group),val=(approvals[ak]??"approved")==="approved"?"draft":"approved";
    setApprovals(a=>({...a,[ak]:val}));
    await patchSetting({[ak]:val});
    logAudit({templateLabel:group.label,action:val});
    toast.success(`Marked as ${val}`);
  }

  async function toggleLock(group: Group) {
    const lk=lockedKey(group),val=!locked[lk];
    setLocked(l=>({...l,[lk]:val}));
    await patchSetting({[lk]:String(val)});
    logAudit({templateLabel:group.label,action:val?"lock":"unlock"});
    toast.success(val?"Locked":"Unlocked");
  }

  async function toggleHtml(group: Group) {
    const hmK=htmlModeKey(group),val=!(htmlModes[hmK]??false);
    setHtmlModes(h=>({...h,[hmK]:val}));
    await patchSetting({[hmK]:String(val)});
  }

  async function saveAll() {
    setSaving(true);
    const payload={...templates,...fromNames,...ccs,...langHi,...replyTos,...bccs,...preheaders,...attachments,...htmlModes};
    const res=await fetch("/api/admin/settings",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
    if (res.ok){toast.success("All saved");setModified(new Set());}else toast.error("Failed");
    setSaving(false);
  }

  async function saveOne(group: Group) {
    const base=group.subject.replace("_subject","");
    setSavingOne(group.label);
    const res=await fetch(`/api/admin/email-templates/${base}/save`,{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({subject:templates[group.subject],body:templates[group.body],fromName:fromNames[fromNameKey(group)],cc:ccs[ccKey(group)],replyTo:replyTos[replyToKey(group)],bcc:bccs[bccKey(group)],preheader:preheaders[preheaderKey(group)],attachment:attachments[attachmentKey(group)],templateLabel:group.label}),
    });
    if (res.ok){
      const {history}=await res.json();
      setHistories(h=>({...h,[historyKey(group)]:history}));
      unmark(group.subject,group.body,fromNameKey(group),ccKey(group),replyToKey(group),bccKey(group),preheaderKey(group),attachmentKey(group));
      toast.success(`"${group.label}" saved`);
    }else toast.error("Failed");
    setSavingOne(null);
  }

  function resetDefault(group: Group) { setField(group.subject,defaults[group.subject]??""); setField(group.body,defaults[group.body]??""); toast.info("Reset — save to apply"); }

  async function convertAllToBuilderFormat() {
    const allGroups = SECTIONS.flatMap(s => s.groups);
    // Only convert bodies that aren't already in builder format
    const toConvert = allGroups.filter(g => {
      const body = templates[g.body] ?? "";
      return body.trim() && !body.includes("data-block-type=");
    });
    if (toConvert.length === 0) { toast.info("All templates are already in builder format"); return; }

    toast.loading(`Converting ${toConvert.length} templates…`, { id: "convert" });
    const payload: Record<string, string> = {};
    for (const g of toConvert) {
      const body = templates[g.body] ?? "";
      const blocks = parseToBlocks(body);
      payload[g.body] = blocksToHtml(blocks);
    }
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setTemplates(t => ({ ...t, ...payload }));
      toast.success(`${toConvert.length} templates converted to builder format`, { id: "convert" });
    } else {
      toast.error("Conversion failed", { id: "convert" });
    }
  }

  function exportAll() {
    const data=JSON.stringify({templates,fromNames,ccs,replyTos,bccs,langHi},null,2);
    const url=URL.createObjectURL(new Blob([data],{type:"application/json"}));
    Object.assign(document.createElement("a"),{href:url,download:"email-templates.json"}).click();
    URL.revokeObjectURL(url);
  }

  function importFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file=e.target.files?.[0];if(!file)return;
    const r=new FileReader();
    r.onload=ev=>{
      try{
        const p=JSON.parse(ev.target?.result as string);
        if(p.templates){setTemplates(t=>({...t,...p.templates}));Object.keys(p.templates).forEach(k=>mark(k));}
        if(p.fromNames){setFromNames(f=>({...f,...p.fromNames}));Object.keys(p.fromNames).forEach(k=>mark(k));}
        if(p.ccs){setCcs(c=>({...c,...p.ccs}));Object.keys(p.ccs).forEach(k=>mark(k));}
        toast.success("Imported — review and save");
      }catch{toast.error("Invalid JSON");}
    };
    r.readAsText(file);e.target.value="";
  }

  const q=search.toLowerCase();
  const filteredSections=useMemo(()=>{
    if(!q)return SECTIONS;
    return SECTIONS.map(s=>({...s,groups:s.groups.filter(g=>g.label.toLowerCase().includes(q)||(g.recipient??"").toLowerCase().includes(q)||(templates[g.subject]??"").toLowerCase().includes(q)||(templates[g.body]??"").toLowerCase().includes(q))})).filter(s=>s.groups.length>0);
  },[q,templates]);

  const allGroups=SECTIONS.flatMap(s=>s.groups);
  const enabledCount=allGroups.filter(g=>enabled[enabledKey(g)]!==false).length;

  const subjectCounts=useMemo(()=>{
    const map:Record<string,number>={};
    for(const g of allGroups){const s=templates[g.subject]??"";if(s)map[s]=(map[s]??0)+1;}
    return map;
  },[templates,allGroups]);

  const allVars=useMemo(()=>[
    ...Object.entries(DUMMY_VARS).map(([k,v])=>({key:k,label:k,sample:v})),
    ...allCustomVars,
  ],[allCustomVars]);

  const emailPaused = globals["email_paused"]==="true";

  return (
    <div className="space-y-5">
      {emailPaused&&(
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-5 py-3">
          <Ban className="w-4 h-4 text-red-500 shrink-0"/>
          <p className="text-sm font-semibold text-red-700">All emails are paused. No emails will be sent until you unpause in Settings.</p>
        </div>
      )}
      {/* toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search templates…"
            className="w-full pl-9 pr-8 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20 bg-white"/>
          {search&&<button onClick={()=>setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X className="w-3.5 h-3.5"/></button>}
        </div>
        <button onClick={()=>setVarDrawer(v=>!v)} className={`flex items-center gap-1.5 text-sm font-semibold px-3 py-2.5 rounded-xl border transition-colors ${varDrawer?"bg-blue-50 border-blue-200 text-blue-700":"border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
          <Globe className="w-4 h-4"/>Variables
        </button>
        <button onClick={()=>{if(allOpen){setOpen(new Set());setAllOpen(false);}else{setOpen(new Set(SECTIONS.flatMap(s=>s.groups).map(g=>g.label)));setAllOpen(true);}}}
          className="flex items-center gap-1.5 text-sm font-semibold px-3 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
          {allOpen?<ChevronUp className="w-4 h-4"/>:<ChevronDown className="w-4 h-4"/>}{allOpen?"Collapse all":"Expand all"}
        </button>
        <button onClick={()=>fileInputRef.current?.click()} className="flex items-center gap-1.5 text-sm font-semibold px-3 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
          <Upload className="w-4 h-4"/>Import
        </button>
        <input ref={fileInputRef} type="file" accept=".json" onChange={importFile} className="hidden"/>
        <button onClick={exportAll} className="flex items-center gap-1.5 text-sm font-semibold px-3 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
          <Download className="w-4 h-4"/>Export
        </button>
        <button onClick={convertAllToBuilderFormat} className="flex items-center gap-1.5 text-sm font-semibold px-3 py-2.5 rounded-xl border border-indigo-200 text-indigo-600 hover:bg-indigo-50 transition-colors">
          <LayoutTemplate className="w-4 h-4"/>Convert to builder
        </button>
        {modified.size>0&&<span className="text-xs text-amber-600 font-medium bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">{modified.size} unsaved</span>}
        <button onClick={saveAll} disabled={saving} className="flex items-center gap-2 bg-gray-900 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-gray-700 transition-colors disabled:opacity-50">
          <Save className="w-4 h-4"/>{saving?"Saving…":"Save all"}
        </button>
      </div>

      <div className="flex items-center gap-3 text-xs text-gray-400 px-1">
        <span>{allGroups.length} templates · {enabledCount} enabled · {allGroups.length-enabledCount} disabled</span>
        <span className="text-[10px]">· Cmd+S saves open template</span>
      </div>

      {varDrawer&&(
        <div className="rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400 mb-3">Variables — click to insert at cursor</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
            {allVars.map(({key,label,sample})=>(
              <div key={key} className="flex items-baseline gap-2 text-xs">
                <button onClick={()=>insertVar(key)} className="font-mono text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded hover:bg-blue-200 transition-colors shrink-0">{key}</button>
                <span className="text-gray-500 truncate">{label!==key?`${label} — `:""}{sample}</span>
              </div>
            ))}
          </div>
          {allCustomVars.length===0&&<p className="text-[10px] text-blue-300 mt-2">Add custom variables in Settings → Custom Variables.</p>}
        </div>
      )}

      {modified.size>0&&(
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0"/>
          <p className="text-sm text-amber-700 flex-1"><span className="font-bold">{modified.size} template{modified.size!==1?"s":""}</span> with unsaved changes. Press Save on each card or use Cmd+S.</p>
          <button onClick={saveAll} disabled={saving} className="shrink-0 text-xs font-bold px-3 py-1.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50">
            {saving?"Saving…":"Save all"}
          </button>
        </div>
      )}

      <div className="space-y-8">
        {filteredSections.map(section=>{
          const sg=section.groups;
          const allOn=sg.every(g=>enabled[enabledKey(g)]!==false);
          async function bulkToggle(){
            const val=!allOn,upd:Record<string,string>={};
            sg.forEach(g=>{const ek=enabledKey(g);setEnabled(e=>({...e,[ek]:val}));upd[ek]=String(val);});
            await patchSetting(upd);
            toast.success(val?`${section.section} enabled`:`${section.section} disabled`);
          }
          function bulkReset(){sg.forEach(g=>{setField(g.subject,defaults[g.subject]??"");setField(g.body,defaults[g.body]??"");});toast.info(`${sg.length} templates reset`);}
          return (
            <div key={section.section}>
              <div className="flex items-center gap-2 mb-3 px-1">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 flex-1">{section.section}</p>
                <button onClick={bulkReset} className="text-[10px] font-bold px-2.5 py-1 rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 transition-colors">Reset all</button>
                <button onClick={bulkToggle} className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-colors ${allOn?"bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-red-50 hover:border-red-200 hover:text-red-500":"bg-gray-50 border-gray-200 text-gray-500 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-600"}`}>
                  {allOn?"Disable all":"Enable all"}
                </button>
              </div>
              <div className="space-y-2">
                {sg.map(group=>(
                  <TemplateCard
                    key={group.label} group={group}
                    templates={templates} enabled={enabled} fromNames={fromNames} ccs={ccs}
                    htmlModes={htmlModes} histories={histories}
                    approvals={approvals} langHi={langHi} replyTos={replyTos} bccs={bccs}
                    locked={locked} preheaders={preheaders} attachments={attachments}
                    modified={modified} open={open} allGroups={allGroups}
                    globals={globals} savingOne={savingOne} subjectCounts={subjectCounts} customVars={allCustomVars}
                    deliveryEmails={deliveryEmails} auditLog={auditLog} broadcasts={broadcasts}
                    activeFieldRef={activeFieldRef}
                    onToggleEnabled={()=>toggleEnabled(group)}
                    onToggleApproval={()=>toggleApproval(group)}
                    onToggleLock={()=>toggleLock(group)}
                    onToggleHtml={()=>toggleHtml(group)}
                    onSetField={setField} onSetHiField={setHiField}
                    onSetFN={v=>setFN(fromNameKey(group),v)}
                    onSetCC={v=>setCC(ccKey(group),v)}
                    onSetRT={v=>setRT(replyToKey(group),v)}
                    onSetBCC={v=>setBCC(bccKey(group),v)}
                    onSetPH={v=>setPH(preheaderKey(group),v)}
                    onSetATT={v=>setATT(attachmentKey(group),v)}
                    onInsertVar={insertVar}
                    onOpen={()=>setOpen(o=>{const n=new Set(o);n.has(group.label)?n.delete(group.label):n.add(group.label);return n;})}
                    onReset={()=>resetDefault(group)}
                    onSaveOne={()=>saveOne(group)}
                    onHistoryUpdate={h=>setHistories(hs=>({...hs,[historyKey(group)]:h}))}
                    onPreview={()=>setPreview({label:group.label,recipient:group.recipient,isHtml:htmlModes[htmlModeKey(group)]??false,subject:templates[group.subject]??"",body:templates[group.body]??""})
                    }
                    onEditInBuilder={onEditInBuilder}
                  />
                ))}
              </div>
            </div>
          );
        })}
        {filteredSections.length===0&&(
          <div className="text-center py-14 text-gray-400">
            <Search className="w-7 h-7 mx-auto mb-3 opacity-40"/>
            <p className="text-sm font-medium">No templates match &ldquo;{search}&rdquo;</p>
            <button onClick={()=>setSearch("")} className="mt-2 text-xs underline underline-offset-2 hover:text-gray-600">Clear</button>
          </div>
        )}
      </div>
      {preview&&<PreviewModal preview={preview} footerOn={footerOn} footerText={footerText} onClose={()=>setPreview(null)}/>}
    </div>
  );
}

// ─── Template card ────────────────────────────────────────────────────────────

interface CardProps {
  group: Group; templates: Record<string,string>; enabled: Record<string,boolean>;
  fromNames: Record<string,string>; ccs: Record<string,string>; htmlModes: Record<string,boolean>;
  histories: Record<string,HistoryEntry[]>;
  approvals: Record<string,string>; langHi: Record<string,string>;
  replyTos: Record<string,string>; bccs: Record<string,string>; locked: Record<string,boolean>;
  preheaders: Record<string,string>; attachments: Record<string,string>;
  modified: Set<string>; open: Set<string>; allGroups: Group[]; globals: Record<string,string>;
  savingOne: string|null; subjectCounts: Record<string,number>; customVars: CustomVar[];
  deliveryEmails: {subject:string;created_at:string}[]; auditLog: AuditEntry[]; broadcasts: BroadcastRecord[];
  activeFieldRef: React.RefObject<{key:string;el:HTMLInputElement|HTMLTextAreaElement}|null>;
  onToggleEnabled:()=>void; onToggleApproval:()=>void; onToggleLock:()=>void; onToggleHtml:()=>void;
  onSetField:(k:string,v:string)=>void; onSetHiField:(k:string,v:string)=>void;
  onSetFN:(v:string)=>void; onSetCC:(v:string)=>void; onSetRT:(v:string)=>void; onSetBCC:(v:string)=>void;
  onSetPH:(v:string)=>void; onSetATT:(v:string)=>void;
  onInsertVar:(v:string)=>void; onOpen:()=>void; onReset:()=>void; onSaveOne:()=>void;
  onHistoryUpdate:(h:HistoryEntry[])=>void; onPreview:()=>void; onEditInBuilder?:(label:string,body:string)=>void;
}

function ChipInput({value,onChange,placeholder}:{value:string;onChange:(v:string)=>void;placeholder?:string}){
  const chips=value?value.split(",").map(e=>e.trim()).filter(Boolean):[];
  const [inp,setInp]=useState("");
  function commit(){if(!inp.trim())return;const all=[...chips,...inp.split(",").map(e=>e.trim()).filter(Boolean)];onChange(all.join(", "));setInp("");}
  function remove(i:number){const next=chips.filter((_,j)=>j!==i);onChange(next.join(", "));}
  return(
    <div className="flex flex-wrap items-center gap-1 border border-gray-200 rounded-xl px-2.5 py-1.5 min-h-[38px] focus-within:ring-2 focus-within:ring-gray-900/20 bg-white cursor-text">
      {chips.map((c,i)=>(
        <span key={i} className="flex items-center gap-1 text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
          {c}<button type="button" onClick={()=>remove(i)} className="hover:text-red-500 ml-0.5"><X className="w-2.5 h-2.5"/></button>
        </span>
      ))}
      <input value={inp} onChange={e=>setInp(e.target.value)} onBlur={commit}
        onKeyDown={e=>{if(e.key===","||e.key==="Enter"||e.key==="Tab"){e.preventDefault();commit();}if(e.key==="Backspace"&&!inp&&chips.length)remove(chips.length-1);}}
        placeholder={chips.length===0?placeholder:""} className="flex-1 min-w-[80px] text-sm outline-none bg-transparent"/>
    </div>
  );
}

type Lang="en"|"hi";

function TemplateCard({ group,templates,enabled,fromNames,ccs,htmlModes,histories,approvals,langHi,replyTos,bccs,locked,preheaders,attachments,modified,open,allGroups,savingOne,subjectCounts,customVars,deliveryEmails,auditLog,broadcasts,activeFieldRef,onToggleEnabled,onToggleApproval,onToggleLock,onToggleHtml,onSetField,onSetHiField,onSetFN,onSetCC,onSetRT,onSetBCC,onSetPH,onSetATT,onInsertVar,onOpen,onReset,onSaveOne,onHistoryUpdate,onPreview,onEditInBuilder }: CardProps) {
  const [lang,setLang]=useState<Lang>("en");
  const [histOpen,setHistOpen]=useState(false);
  const [diffEntry,setDiffEntry]=useState<(HistoryEntry&{author?:string})|null>(null);
  const [dupOpen,setDupOpen]=useState(false);
  const [testOpen,setTestOpen]=useState(false);
  const [testTo,setTestTo]=useState("");
  const [testSending,setTestSending]=useState(false);
  const [testHistory,setTestHistory]=useState<TestHistoryEntry[]|null>(null);
  const [darkPreview,setDarkPreview]=useState(false);

  // last-sent badge
  const lastBroadcast = useMemo(()=>broadcasts.filter(b=>b.templateLabel===group.label).sort((a,b)=>b.timestamp.localeCompare(a.timestamp))[0]??null,[broadcasts,group.label]);
  const lastSentDays = lastBroadcast ? Math.floor((Date.now()-new Date(lastBroadcast.timestamp).getTime())/86400_000) : null;
  const [linkInput,setLinkInput]=useState<string|null>(null);
  const bodyElRef=useRef<HTMLTextAreaElement>(null);

  const ek=enabledKey(group),fnK=fromNameKey(group),ccK=ccKey(group),hk=historyKey(group);
  const hmK=htmlModeKey(group),rtK=replyToKey(group),bK=bccKey(group),lk=lockedKey(group);
  const phK=preheaderKey(group),attK=attachmentKey(group);
  const hiSK=langSubjectKey(group,"hi"),hiBK=langBodyKey(group,"hi");
  const apK=approvalKey(group);

  const isEnabled=enabled[ek]!==false;
  const history=histories[hk]??[];
  const isApproved=(approvals[apK]??"approved")==="approved";
  const isLocked=locked[lk]??false;
  const isOpen=open.has(group.label);

  const subjectKey=lang==="hi"?hiSK:group.subject;
  const bodyKey   =lang==="hi"?hiBK:group.body;
  const setSubject=lang==="hi"?(v:string)=>onSetHiField(hiSK,v):(v:string)=>onSetField(group.subject,v);
  const setBody   =lang==="hi"?(v:string)=>onSetHiField(hiBK,v):(v:string)=>onSetField(group.body,v);

  const subjectVal=(lang==="hi"?langHi[hiSK]:templates[group.subject])??"";
  const bodyVal   =(lang==="hi"?langHi[hiBK]:templates[group.body])   ??"";
  const isHtml=(htmlModes[hmK]??false)||isHtmlContent(bodyVal);
  const fnVal=fromNames[fnK]??"",ccVal=ccs[ccK]??"",rtVal=replyTos[rtK]??"",bccVal=bccs[bK]??"";
  const phVal=preheaders[phK]??"",attVal=attachments[attK]??"";

  const isDirty=modified.has(group.subject)||modified.has(group.body)||modified.has(fnK)||modified.has(ccK)||modified.has(rtK)||modified.has(bK)||modified.has(hiSK)||modified.has(hiBK)||modified.has(phK)||modified.has(attK);

  // Usage stats from delivery data
  const subjectPrefix=(templates[group.subject]??"").slice(0,20).toLowerCase();
  const usageCount=subjectPrefix?deliveryEmails.filter(e=>e.subject.toLowerCase().startsWith(subjectPrefix)).length:0;
  const lastSent=subjectPrefix?deliveryEmails.filter(e=>e.subject.toLowerCase().startsWith(subjectPrefix)).sort((a,b)=>b.created_at.localeCompare(a.created_at))[0]?.created_at:undefined;
  const daysAgo=lastSent?Math.round((Date.now()-new Date(lastSent).getTime())/(86400000)):null;

  // Enrich history with author from audit log
  const enrichedHistory=(histories[hk]??[]).map(entry=>{
    const match=auditLog.find(a=>a.templateLabel===group.label&&a.action==="save"&&Math.abs(new Date(a.timestamp).getTime()-new Date(entry.savedAt).getTime())<5000);
    return {...entry,author:match?.adminEmail};
  });
  const subjectLen=subjectVal.length,subjectTooLong=subjectLen>60;
  const isDupSubject=(subjectCounts[templates[group.subject]??""]??0)>1&&lang==="en";
  const missingVars=detectMissingVars(bodyVal,group.vars,customVars);
  const htmlWarning=!isHtml&&hasHtmlTags(bodyVal);

  function htmlWrap(before:string,after:string){const el=bodyElRef.current;if(!el)return;wrapSelection(el,before,after,setBody);}
  function insertLink(){const el=bodyElRef.current;if(!el)return;wrapSelection(el,`<a href="${linkInput?.trim()||"https://"}">`,"</a>",setBody);setLinkInput(null);}

  async function sendTest(){
    setTestSending(true);
    const recipients=testTo.split(",").map(s=>s.trim()).filter(s=>s.includes("@"));
    const targets=recipients.length>0?recipients:[undefined as unknown as string];
    let lastSent="";
    for(const recipient of targets){
      const res=await fetch("/api/admin/email-templates/test",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({subject:subjectVal,body:bodyVal,to:recipient||undefined,preheader:phVal,templateLabel:group.label})});
      const data=await res.json().catch(()=>({}));
      if(res.ok){lastSent=data.sentTo;const entry:TestHistoryEntry={id:Math.random().toString(36).slice(2),timestamp:new Date().toISOString(),to:data.sentTo,templateLabel:group.label,adminEmail:""};setTestHistory(h=>[entry,...(h??[])].slice(0,5));}
      else{toast.error(data.error??"Failed");setTestSending(false);return;}
    }
    toast.success(targets.length>1?`Sent to ${targets.length} recipients`:`Test sent to ${lastSent}`);
    setTestSending(false);
  }

  useEffect(()=>{
    if(!testOpen||testHistory!==null)return;
    fetch("/api/admin/email-templates/test").then(r=>r.json()).then(d=>{
      const entries:TestHistoryEntry[]=d.history??[];
      setTestHistory(entries.filter(e=>e.templateLabel===group.label).slice(0,5));
    }).catch(()=>setTestHistory([]));
  },[testOpen]);

  function copy(text:string,label:string){navigator.clipboard.writeText(text).then(()=>toast.success(`${label} copied`)).catch(()=>toast.error("Copy failed"));}

  function openPreviewTab(){ openInTab(group.label, subjectVal, bodyVal, isHtml); }

  return (
    <div className={`rounded-2xl border bg-white shadow-sm overflow-hidden ${isEnabled?"border-gray-100":"border-gray-100 opacity-55"} ${isLocked?"ring-1 ring-amber-200":""}`}>
      {/* header */}
      <div className="flex items-center gap-2 px-5 py-3.5">
        <button onClick={onOpen} className="flex items-center gap-3 flex-1 min-w-0 text-left hover:opacity-75 transition-opacity">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isLocked?"bg-amber-50":isEnabled?"bg-blue-50":"bg-gray-100"}`}>
            {isLocked?<Lock className="w-4 h-4 text-amber-400"/>:<Mail className={`w-4 h-4 ${isEnabled?"text-blue-500":"text-gray-400"}`}/>}
          </div>
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="text-sm font-semibold text-gray-900 truncate">{group.label}</span>
            {group.recipient&&<span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${RECIPIENT_BADGE[group.recipient]??"bg-gray-100 text-gray-500"}`}>{group.recipient}</span>}
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${isApproved?"bg-emerald-50 text-emerald-600":"bg-gray-100 text-gray-500"}`}>{isApproved?"Approved":"Draft"}</span>
            {isLocked&&<span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 shrink-0">Locked</span>}
            {usageCount>0&&<span className="text-[10px] font-semibold text-gray-400 shrink-0 tabular-nums">{usageCount}× · {daysAgo===0?"today":daysAgo===1?"yesterday":daysAgo!==null?`${daysAgo}d ago`:""}</span>}
            {lastSentDays!==null&&<span className="text-[10px] font-semibold text-gray-300 shrink-0">{lastSentDays===0?"broadcast today":lastSentDays===1?"broadcast yesterday":`broadcast ${lastSentDays}d ago`}</span>}
            {isDirty&&<span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"/>}
            {isDupSubject&&<span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" title="Duplicate subject"/>}
            {missingVars.length>0&&<span title={`Unknown: ${missingVars.join(", ")}`}><AlertCircle className="w-3.5 h-3.5 text-orange-400 shrink-0"/></span>}
            {htmlWarning&&<span title="HTML in plain-text mode"><AlertCircle className="w-3.5 h-3.5 text-yellow-400 shrink-0"/></span>}
          </div>
        </button>
        <div className="flex items-center gap-0.5 shrink-0">
          <button onClick={onToggleLock} title={isLocked?"Unlock":"Lock"} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            {isLocked?<Unlock className="w-4 h-4 text-amber-400"/>:<Lock className="w-4 h-4 text-gray-300 hover:text-gray-500"/>}
          </button>
          <button onClick={onToggleApproval} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <CheckCircle className={`w-4 h-4 ${isApproved?"text-emerald-500":"text-gray-300"}`}/>
          </button>
          <button onClick={onToggleEnabled} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            {isEnabled?<ToggleRight className="w-4 h-4 text-emerald-500"/>:<ToggleLeft className="w-4 h-4 text-gray-400"/>}
          </button>
          <button onClick={onPreview} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <Eye className="w-4 h-4 text-gray-400"/>
          </button>
          <button onClick={onOpen} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            {isOpen?<ChevronUp className="w-4 h-4 text-gray-400"/>:<ChevronDown className="w-4 h-4 text-gray-400"/>}
          </button>
        </div>
      </div>

      {isOpen&&isLocked&&(
        <div className="px-6 py-3 border-t border-amber-100 bg-amber-50 flex items-center gap-2">
          <Lock className="w-4 h-4 text-amber-400 shrink-0"/>
          <p className="text-xs text-amber-700 font-semibold">Template is locked. Unlock to edit.</p>
          <button onClick={onToggleLock} className="ml-auto text-xs font-bold text-amber-700 underline underline-offset-2 hover:text-amber-900">Unlock</button>
        </div>
      )}

      {isOpen&&!isLocked&&(
        <div className="border-t border-gray-100 grid grid-cols-1 xl:grid-cols-2 divide-y xl:divide-y-0 xl:divide-x divide-gray-100">

          {/* ── LEFT: editor ── */}
          <div className="px-6 pb-6 space-y-4 pt-5">
          {/* language */}
          <div className="flex gap-1 bg-gray-100 p-0.5 rounded-lg w-fit">
            {([["en","English"],["hi","हिंदी"]] as [Lang,string][]).map(([l,label])=>(
              <button key={l} onClick={()=>setLang(l)} className={`px-3 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1 ${lang===l?"bg-white text-gray-900 shadow-sm":"text-gray-500 hover:text-gray-700"}`}><Languages className="w-3 h-3"/>{label}</button>
            ))}
          </div>

          {/* var chips */}
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Variables — click to insert</p>
            <div className="flex flex-wrap gap-1.5">
              {group.vars.map(v=><button key={v} onClick={()=>onInsertVar(v)} className="text-[11px] bg-gray-100 hover:bg-blue-50 hover:text-blue-700 text-gray-600 px-2 py-0.5 rounded transition-colors font-mono">{v}</button>)}
            </div>
          </div>

          {/* warnings */}
          {(isDupSubject||missingVars.length>0||subjectTooLong||htmlWarning)&&(
            <div className="space-y-1.5">
              {isDupSubject&&<p className="text-xs text-red-500 flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5"/>Duplicate subject line.</p>}
              {subjectTooLong&&<p className="text-xs text-amber-500 flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5"/>Subject is {subjectLen} chars — Gmail truncates after 60.</p>}
              {missingVars.length>0&&<p className="text-xs text-orange-500 flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5"/>Unknown variables: {missingVars.join(", ")}</p>}
              {htmlWarning&&<p className="text-xs text-yellow-600 flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5"/>HTML tags in plain-text mode — switch to HTML or remove tags.</p>}
            </div>
          )}

          {/* fields: sender, reply-to, CC (chip), BCC (chip), preheader, attachment */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Sender name</label>
              <input value={fnVal} onChange={e=>onSetFN(e.target.value)} onFocus={e=>{activeFieldRef.current={key:fnK,el:e.target};}} placeholder="EditBridge"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Reply-to</label>
              <input value={rtVal} onChange={e=>onSetRT(e.target.value)} onFocus={e=>{activeFieldRef.current={key:rtK,el:e.target};}} placeholder="hello@editbridge.com"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">CC <span className="text-[9px] font-normal normal-case text-gray-400">comma-separated</span></label>
              <ChipInput value={ccVal} onChange={onSetCC} placeholder="support@editbridge.com"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">BCC <span className="text-[9px] font-normal normal-case text-gray-400">comma-separated</span></label>
              <ChipInput value={bccVal} onChange={onSetBCC} placeholder="admin@editbridge.com"/>
            </div>
          </div>

          {/* subject */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Subject line</label>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] tabular-nums ${subjectTooLong?"text-red-400 font-bold":"text-gray-400"}`}>{subjectLen}/60</span>
                <button onClick={()=>copy(subjectVal,"Subject")} className="text-gray-400 hover:text-gray-600"><Copy className="w-3 h-3"/></button>
              </div>
            </div>
            <input value={subjectVal} onChange={e=>setSubject(e.target.value)} onFocus={e=>{activeFieldRef.current={key:subjectKey,el:e.target};}} spellCheck
              className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20 ${subjectTooLong?"border-red-200 bg-red-50":"border-gray-200"}`}/>
          </div>

          {/* preheader */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Preheader <span className="text-[9px] font-normal normal-case">Preview text shown after subject in inbox</span></label>
              <span className={`text-[10px] tabular-nums ${phVal.length>90?"text-red-400 font-bold":"text-gray-400"}`}>{phVal.length}/90</span>
            </div>
            <input value={phVal} onChange={e=>onSetPH(e.target.value)} onFocus={e=>{activeFieldRef.current={key:phK,el:e.target};}} maxLength={95} placeholder="Short preview text shown in inbox after subject…"
              className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20 ${phVal.length>90?"border-amber-200":"border-gray-200"}`}/>
          </div>

          {/* body */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Body</label>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400 tabular-nums">{bodyVal.length.toLocaleString()} chars</span>
                <button onClick={()=>copy(bodyVal,"Body")} className="text-gray-400 hover:text-gray-600"><Copy className="w-3 h-3"/></button>
                <button onClick={onToggleHtml} className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border transition-colors ${isHtml?"bg-violet-50 border-violet-200 text-violet-600":"bg-gray-50 border-gray-200 text-gray-500"}`}>
                  {isHtml?<Code className="w-2.5 h-2.5"/>:<AlignLeft className="w-2.5 h-2.5"/>}{isHtml?"HTML":"Plain"}
                </button>
              </div>
            </div>
            {isHtml&&(
              <div className="flex items-center gap-1 mb-2 p-1.5 bg-gray-50 rounded-xl border border-gray-200 flex-wrap">
                {[{icon:Bold,fn:()=>htmlWrap("<strong>","</strong>"),title:"Bold"},{icon:Italic,fn:()=>htmlWrap("<em>","</em>"),title:"Italic"},{icon:Underline,fn:()=>htmlWrap("<u>","</u>"),title:"Underline"},{icon:List,fn:()=>htmlWrap("<ul><li>","</li></ul>"),title:"List"},{icon:Minus,fn:()=>setBody(bodyVal+"\n<hr>"),title:"Divider"}].map(({icon:Icon,fn,title})=>(
                  <button key={title} onClick={fn} title={title} className="p-1.5 rounded-lg hover:bg-white hover:shadow-sm transition-all text-gray-500 hover:text-gray-800"><Icon className="w-3.5 h-3.5"/></button>
                ))}
                <div className="relative">
                  <button onClick={()=>setLinkInput(linkInput===null?"":null)} className={`p-1.5 rounded-lg hover:bg-white hover:shadow-sm transition-all text-gray-500 hover:text-gray-800 ${linkInput!==null?"bg-white shadow-sm":""}`}><Link className="w-3.5 h-3.5"/></button>
                  {linkInput!==null&&(
                    <div className="absolute top-full left-0 mt-1 z-20 flex gap-1 bg-white border border-gray-200 rounded-xl shadow-lg p-2">
                      <input autoFocus value={linkInput} onChange={e=>setLinkInput(e.target.value)} placeholder="https://" onKeyDown={e=>e.key==="Enter"&&insertLink()}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 w-48 focus:outline-none focus:ring-1 focus:ring-gray-900/20"/>
                      <button onClick={insertLink} className="text-xs font-semibold bg-gray-900 text-white px-2.5 py-1.5 rounded-lg hover:bg-gray-700">Insert</button>
                    </div>
                  )}
                </div>
              </div>
            )}
            <textarea ref={bodyElRef} rows={12} value={bodyVal} onChange={e=>setBody(e.target.value)} onFocus={e=>{activeFieldRef.current={key:bodyKey,el:e.target};}} spellCheck
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20 resize-y font-mono leading-relaxed"/>
          </div>

          {/* attachment */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Attachment URL <span className="text-[9px] font-normal normal-case text-gray-400">optional</span></label>
            <input value={attVal} onChange={e=>onSetATT(e.target.value)} onFocus={e=>{activeFieldRef.current={key:attK,el:e.target};}} placeholder="https://editbridge.com/files/invoice.pdf"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"/>
          </div>

          {/* actions */}
          <div className="flex items-center gap-2 pt-1 flex-wrap">
            <button onClick={onSaveOne} disabled={savingOne===group.label} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-50"><Save className="w-3.5 h-3.5"/>{savingOne===group.label?"Saving…":"Save"}</button>
            <button onClick={()=>setTestOpen(o=>!o)} className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${testOpen?"bg-blue-50 border-blue-200 text-blue-700":"border-gray-200 text-gray-600 hover:bg-gray-50"}`}><Send className="w-3.5 h-3.5"/>Test</button>
            <button onClick={()=>onEditInBuilder?.(group.label, bodyVal)} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-indigo-200 text-indigo-600 hover:bg-indigo-50 transition-colors"><LayoutTemplate className="w-3.5 h-3.5"/>Edit in Builder</button>
            <button onClick={openPreviewTab} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600"><Monitor className="w-3.5 h-3.5"/>Open in tab</button>
            <button onClick={()=>setHistOpen(h=>!h)} className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${histOpen?"bg-indigo-50 border-indigo-200 text-indigo-600":"border-gray-200 text-gray-600 hover:bg-gray-50"}`}><History className="w-3.5 h-3.5"/>History{enrichedHistory.length>0&&` (${enrichedHistory.length})`}</button>
            <div className="relative">
              <button onClick={()=>setDupOpen(d=>!d)} className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${dupOpen?"bg-amber-50 border-amber-200 text-amber-700":"border-gray-200 text-gray-600 hover:bg-gray-50"}`}><Copy className="w-3.5 h-3.5"/>Dup to…</button>
              {dupOpen&&<div className="absolute top-full left-0 mt-1 z-30 bg-white border border-gray-100 rounded-xl shadow-lg py-1 w-56 max-h-56 overflow-y-auto">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-3 py-1.5">Copy to…</p>
                {allGroups.filter(g=>g.label!==group.label).map(g=><button key={g.label} onClick={()=>{onSetField(g.subject,subjectVal);onSetField(g.body,bodyVal);setDupOpen(false);toast.success(`Copied to "${g.label}"`);}} className="w-full text-left text-xs px-3 py-2 hover:bg-gray-50 text-gray-700 truncate">{g.label}</button>)}
              </div>}
            </div>
            <div className="flex-1"/>
            <button onClick={onReset} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-gray-500"><RotateCcw className="w-3.5 h-3.5"/>Reset</button>
          </div>

          {testOpen&&(
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 space-y-3">
              <p className="text-xs font-bold text-blue-600">Send test email</p>
              <div className="flex gap-2">
                <input value={testTo} onChange={e=>setTestTo(e.target.value)} placeholder="Blank = your inbox · comma-separate for multiple"
                  className="flex-1 text-sm border border-blue-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/30"/>
                <button onClick={sendTest} disabled={testSending} className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50">
                  <Send className="w-3.5 h-3.5"/>{testSending?"Sending…":"Send"}
                </button>
              </div>
              {testHistory!==null&&testHistory.length>0&&(
                <div className="border-t border-blue-100 pt-2 space-y-1">
                  <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Recent test sends</p>
                  {testHistory.map(h=>(
                    <div key={h.id} className="flex items-center gap-2 text-[11px] text-blue-600">
                      <span className="text-blue-300">{fmtDate(h.timestamp)}</span>
                      <span>→</span>
                      <span className="font-medium truncate">{h.to}</span>
                    </div>
                  ))}
                </div>
              )}
              {testHistory!==null&&testHistory.length===0&&(
                <p className="text-[11px] text-blue-300 border-t border-blue-100 pt-2">No test sends yet for this template.</p>
              )}
            </div>
          )}

          {histOpen&&(
            <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Version history — last {enrichedHistory.length} save{enrichedHistory.length!==1?"s":""}</p>
              {enrichedHistory.length===0&&<p className="text-xs text-indigo-300">No versions yet.</p>}
              {enrichedHistory.map((entry,i)=>(
                <div key={i} className="rounded-lg bg-white border border-indigo-100 px-3 py-2.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-indigo-400 font-mono">{fmtDate(entry.savedAt)}</span>
                      {entry.author&&<span className="text-[10px] text-indigo-300">{entry.author}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={()=>setDiffEntry(diffEntry?.savedAt===entry.savedAt?null:entry)} className={`text-[10px] font-bold transition-colors ${diffEntry?.savedAt===entry.savedAt?"text-indigo-700":"text-indigo-400 hover:text-indigo-600"}`}>{diffEntry?.savedAt===entry.savedAt?"Hide diff":"Diff"}</button>
                      <button onClick={()=>{onSetField(group.subject,entry.subject);onSetField(group.body,entry.body);setHistOpen(false);setDiffEntry(null);toast.success("Restored — save to apply");}} className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800">Restore</button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-700 font-semibold truncate">{entry.subject||"(no subject)"}</p>
                  {diffEntry?.savedAt===entry.savedAt&&(
                    <div className="rounded-lg bg-gray-50 border border-gray-100 p-2 max-h-48 overflow-y-auto">
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Body diff vs current</p>
                      {lineDiff(entry.body,templates[group.body]??"").map((op,j)=>(
                        <div key={j} className={`text-[10px] font-mono leading-tight px-1 ${op.type==="add"?"bg-emerald-50 text-emerald-700":op.type==="remove"?"bg-red-50 text-red-600":"text-gray-400"}`}>
                          {op.type==="add"?"+ ":op.type==="remove"?"- ":"  "}{op.text||" "}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          </div>

          {/* ── RIGHT: live preview ── */}
          <div className="flex flex-col bg-gray-50">
            {/* preview toolbar */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-white">
              <Eye className="w-3.5 h-3.5 text-gray-400 shrink-0"/>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Live Preview</span>
              <span className="ml-auto flex items-center gap-2">
                <button onClick={()=>setDarkPreview(d=>!d)} title="Toggle dark mode preview" className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors ${darkPreview?"bg-gray-800 text-gray-200":"bg-gray-100 text-gray-400 hover:text-gray-600"}`}>
                  <Moon className="w-2.5 h-2.5"/>{darkPreview?"Dark":"Light"}
                </button>
                <span className="text-[10px] text-gray-300">Sample data applied</span>
              </span>
            </div>
            {/* email header meta */}
            <div className="bg-white px-4 py-2.5 border-b border-gray-100 space-y-1">
              <div className="flex gap-2 text-xs font-mono"><span className="text-gray-400 w-14 shrink-0">From:</span><span className="text-gray-600 truncate">{fnVal||"EditBridge"} &lt;noreply@editbridge.com&gt;</span></div>
              <div className="flex gap-2 text-xs font-mono"><span className="text-gray-400 w-14 shrink-0">To:</span><span className="text-gray-600">{group.recipient||"Recipient"} &lt;user@example.com&gt;</span></div>
              <div className="flex gap-2 text-xs font-mono"><span className="text-gray-400 w-14 shrink-0">Subject:</span><span className="text-gray-900 font-semibold font-sans truncate">{fillVars(subjectVal)||"(no subject)"}</span></div>
              {phVal&&<div className="flex gap-2 text-xs font-mono"><span className="text-gray-400 w-14 shrink-0">Preview:</span><span className="text-gray-400 italic truncate">{fillVars(phVal)}</span></div>}
            </div>
            {/* body render */}
            {(isHtml||isHtmlContent(bodyVal)) ? (
              <iframe
                srcDoc={wrapEmailHtml(fillVars(bodyVal||"<p style='color:#94a3b8;font-size:14px;padding:32px 0;text-align:center'>Start editing to see the preview.</p>"))}
                className="w-full border-0 flex-1"
                style={{minHeight:"520px",colorScheme:"light", filter:darkPreview?"invert(0.9) hue-rotate(180deg)":undefined, background:darkPreview?"#111":undefined}}
                title={`Preview: ${group.label}`}
                sandbox="allow-same-origin"
              />
            ) : (
              <div className={`p-6 flex-1 overflow-y-auto ${darkPreview?"bg-gray-900":"bg-white"}`}>
                <pre className={`text-sm whitespace-pre-wrap font-sans leading-relaxed ${darkPreview?"text-gray-200":"text-gray-700"}`}>{fillVars(bodyVal)||"(no content yet)"}</pre>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}

// ─── Preview modal ────────────────────────────────────────────────────────────

type PreviewMode="desktop-light"|"desktop-dark"|"mobile-light"|"mobile-dark";

function PreviewModal({preview,footerOn,footerText,onClose}:{
  preview:{label:string;subject:string;body:string;recipient?:string;isHtml:boolean};
  footerOn:boolean;footerText:string;onClose:()=>void;
}) {
  const [mode,setMode]=useState<PreviewMode>("desktop-light");
  const isDark=mode.includes("dark"),isMobile=mode.includes("mobile");
  const fullBody=footerOn&&footerText?preview.body+"\n\n---\n"+footerText:preview.body;
  const MODES=[
    {id:"desktop-light" as PreviewMode,icon:Monitor,label:"Desktop light"},
    {id:"desktop-dark"  as PreviewMode,icon:Moon,   label:"Desktop dark"},
    {id:"mobile-light"  as PreviewMode,icon:Smartphone,label:"Mobile light"},
    {id:"mobile-dark"   as PreviewMode,icon:Moon,   label:"Mobile dark"},
  ];
  function openTab(){ openInTab(preview.label, preview.subject, fullBody, preview.isHtml); }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div><p className="text-sm font-bold text-gray-900">{preview.label}</p><p className="text-xs text-gray-400 mt-0.5">Preview with sample data</p></div>
          <div className="flex items-center gap-2">
            <button onClick={openTab} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600"><Eye className="w-3.5 h-3.5"/>Open in tab</button>
            <div className="flex gap-0.5 bg-gray-100 p-0.5 rounded-lg">
              {MODES.map(({id,icon:Icon,label})=><button key={id} onClick={()=>setMode(id)} title={label} className={`p-1.5 rounded-md transition-all ${mode===id?"bg-white shadow-sm text-gray-900":"text-gray-400 hover:text-gray-600"}`}><Icon className="w-3.5 h-3.5"/></button>)}
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-500"/></button>
          </div>
        </div>
        <div className={`overflow-y-auto flex-1 p-6 ${isDark?"bg-gray-900":"bg-gray-50"}`}>
          <div className={`mx-auto transition-all ${isMobile?"max-w-[375px]":"max-w-full"}`}>
            <div className={`rounded-xl border overflow-hidden ${isDark?"border-gray-700 bg-gray-800":"border-gray-200 bg-white"}`}>
              <div className={`px-5 py-3 border-b text-xs font-mono space-y-1 ${isDark?"border-gray-700 bg-gray-900":"border-gray-100 bg-gray-50"}`}>
                {[["From","EditBridge <hello@editbridge.com>"],["To",`${preview.recipient??"User"} <recipient@example.com>`],["Subject",fillVars(preview.subject)]].map(([l,v])=>(
                  <div key={l} className="flex gap-2">
                    <span className={`${isDark?"text-gray-500":"text-gray-400"} w-14 shrink-0`}>{l}:</span>
                    <span className={`${isDark?"text-gray-200":"text-gray-700"} ${l==="Subject"?"font-semibold":""}`}>{v}</span>
                  </div>
                ))}
              </div>
              <div className={`px-5 py-4 ${isDark?"text-gray-200":"text-gray-700"}`}>
                {preview.isHtml?<div className="text-sm leading-relaxed" dangerouslySetInnerHTML={{__html:fillVars(fullBody)}}/>:<pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">{fillVars(fullBody)}</pre>}
              </div>
            </div>
            <p className={`text-[10px] text-center mt-3 ${isDark?"text-gray-600":"text-gray-400"}`}>Variables replaced with sample data</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Broadcast history card (shared) ─────────────────────────────────────────

function BroadcastHistoryCard({broadcasts,segments}:{broadcasts:BroadcastRecord[];segments:typeof SEGMENTS}) {
  const [search,setSearch]=useState("");
  const [expanded,setExpanded]=useState<string|null>(null);
  const filtered=broadcasts.filter(b=>!search||(b.templateLabel.toLowerCase().includes(search.toLowerCase())||b.segment.includes(search.toLowerCase())));
  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5 space-y-3">
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-bold text-gray-900 flex-1">Broadcast History</h2>
        {broadcasts.length>3&&(
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none"/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…"
              className="pl-7 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/20 w-36"/>
          </div>
        )}
      </div>
      {broadcasts.length===0&&<p className="text-xs text-gray-400">No broadcasts sent yet.</p>}
      {filtered.length===0&&broadcasts.length>0&&<p className="text-xs text-gray-400">No matches for &ldquo;{search}&rdquo;</p>}
      <div className="space-y-2 max-h-[360px] overflow-y-auto">
        {filtered.map(b=>(
          <div key={b.id} className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-800">{b.templateLabel}</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{b.sentCount.toLocaleString()} sent</span>
                {(b.failed??0)>0&&(
                  <button onClick={()=>setExpanded(expanded===b.id?null:b.id)} className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full hover:bg-red-100 transition-colors">
                    {b.failed} failed {expanded===b.id?"▲":"▼"}
                  </button>
                )}
              </div>
            </div>
            <p className="text-[10px] text-gray-400">{segments.find(s=>s.id===b.segment)?.label??b.segment} · {fmtDate(b.timestamp)} · {b.adminEmail}</p>
            {expanded===b.id&&b.failedEmails&&b.failedEmails.length>0&&(
              <div className="mt-2 rounded-lg bg-red-50 border border-red-100 px-3 py-2 space-y-1">
                <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Failed addresses (up to 20 shown)</p>
                {b.failedEmails.map(e=><p key={e} className="text-[11px] text-red-600 font-mono">{e}</p>)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Broadcast tab ────────────────────────────────────────────────────────────

const SEGMENTS=[
  {id:"all_clients"     as const,label:"All Clients",     desc:"Every registered client"},
  {id:"all_editors"     as const,label:"All Editors",     desc:"Every registered editor"},
  {id:"inactive_clients"as const,label:"Inactive Clients",desc:"Clients with no order in 90+ days"},
];
type SegmentId=typeof SEGMENTS[number]["id"];

// ─── Custom Mail ──────────────────────────────────────────────────────────────

type CustomRecipientMode = "email" | "segment" | "csv";

function CustomMailCard() {
  const [mode, setMode] = useState<CustomRecipientMode>("email");
  const [toEmail, setToEmail] = useState("");
  const [segment, setSegment] = useState<SegmentId>("all_clients");
  const [csvEmails, setCsvEmails] = useState<string[]>([]);
  const [csvFileName, setCsvFileName] = useState("");
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [htmlMode, setHtmlMode] = useState(false);
  const [sending, setSending] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [segCount, setSegCount] = useState<number | null>(null);

  useEffect(() => {
    if (mode === "segment") {
      setSegCount(null);
      fetch(`/api/admin/email-templates/broadcast?segment=${segment}`)
        .then(r => r.json()).then(d => setSegCount(d.count ?? 0)).catch(() => {});
    }
  }, [mode, segment]);

  const filledPreview = useMemo(() => fillVars(body), [body]);
  const bodyIsHtml = htmlMode || isHtmlContent(body);
  // Always wrap in HTML layout so header/footer are always present
  const htmlBody = useMemo(() =>
    bodyIsHtml ? filledPreview : filledPreview.split(/\n\n+/).filter(Boolean).map(p=>`<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 16px;">${p.trim().replace(/\n/g,"<br>")}</p>`).join("")
  , [filledPreview, bodyIsHtml]);

  function parseCsv(text: string): string[] {
    return text.split(/\r?\n/).flatMap(line => line.split(",").map(v => v.trim().replace(/^["']|["']$/g, ""))).filter(v => v.includes("@") && v.includes("."));
  }

  function handleCsvFile(file: File) {
    const reader = new FileReader();
    reader.onload = e => {
      const emails = parseCsv(e.target?.result as string);
      setCsvEmails(emails); setCsvFileName(file.name);
      if (emails.length === 0) toast.error("No valid emails found in CSV");
      else toast.success(`${emails.length} email${emails.length !== 1 ? "s" : ""} loaded from ${file.name}`);
    };
    reader.readAsText(file);
  }

  async function send() {
    if (!subject.trim() || !body.trim()) { toast.error("Subject and body are required"); return; }
    setSending(true); setConfirm(false);
    // Use raw body (no dummy vars) when sending — server substitutes real vars
    const sendBody = bodyIsHtml ? body : body.split(/\n\n+/).filter(Boolean).map(p=>`<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 16px;">${p.trim().replace(/\n/g,"<br>")}</p>`).join("");
    try {
      if (mode === "email") {
        if (!toEmail.includes("@")) { toast.error("Enter a valid email address"); setSending(false); return; }
        const res = await fetch("/api/admin/email-templates/test", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subject, body: sendBody, to: toEmail }),
        });
        if (res.ok) toast.success(`Sent to ${toEmail}`);
        else { const d = await res.json().catch(() => ({})); toast.error(d.error ?? "Failed"); }
      } else if (mode === "csv") {
        if (csvEmails.length === 0) { toast.error("Upload a CSV with valid emails first"); setSending(false); return; }
        let sent = 0, failed = 0;
        for (const email of csvEmails) {
          const res = await fetch("/api/admin/email-templates/test", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ subject, body: sendBody, to: email, templateLabel: "Custom Email" }),
          });
          if (res.ok) sent++; else failed++;
        }
        toast.success(`Sent to ${sent} recipients${failed > 0 ? ` (${failed} failed)` : ""}`);
      } else {
        const res = await fetch("/api/admin/email-templates/broadcast", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subject, body: sendBody, segment, templateLabel: "Custom Email" }),
        });
        if (res.ok) { const d = await res.json(); toast.success(`Sent to ${d.sent} recipients${d.failed > 0 ? ` (${d.failed} failed)` : ""}`); }
        else { const d = await res.json().catch(() => ({})); toast.error(d.error ?? "Failed"); }
      }
    } finally { setSending(false); }
  }

  return (
    <div className="rounded-2xl border border-indigo-100 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 bg-indigo-50 border-b border-indigo-100">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
          <Mail className="w-4 h-4 text-white"/>
        </div>
        <div>
          <h2 className="text-sm font-bold text-gray-900">Custom Email</h2>
          <p className="text-xs text-gray-500">Compose and send a one-off email outside of any template</p>
        </div>
      </div>
      <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── left: compose ── */}
        <div className="space-y-4">
          {/* recipient mode */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">Send to</label>
            <div className="flex gap-1 bg-gray-100 p-0.5 rounded-lg w-fit mb-3">
              {([["email","Specific Email"],["segment","Segment"],["csv","CSV Upload"]] as [CustomRecipientMode,string][]).map(([id,label])=>(
                <button key={id} onClick={()=>setMode(id)} className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${mode===id?"bg-white text-gray-900 shadow-sm":"text-gray-500 hover:text-gray-700"}`}>{label}</button>
              ))}
            </div>
            {mode === "email" ? (
              <input type="email" placeholder="recipient@example.com" value={toEmail} onChange={e=>setToEmail(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"/>
            ) : mode === "csv" ? (
              <div className="space-y-3">
                <input ref={csvInputRef} type="file" accept=".csv,.txt" className="hidden" onChange={e=>{const f=e.target.files?.[0];if(f)handleCsvFile(f);e.target.value="";}}/>
                <button onClick={()=>csvInputRef.current?.click()} className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl py-4 text-sm font-semibold text-gray-500 hover:border-indigo-300 hover:text-indigo-600 transition-colors">
                  <Upload className="w-4 h-4"/>{csvFileName||"Click to upload CSV"}
                </button>
                {csvEmails.length>0&&(
                  <div className="rounded-xl bg-indigo-50 border border-indigo-100 px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-indigo-700">{csvEmails.length} recipients loaded</p>
                      <p className="text-xs text-indigo-400 mt-0.5 truncate max-w-[220px]">{csvEmails.slice(0,3).join(", ")}{csvEmails.length>3?` +${csvEmails.length-3} more`:""}</p>
                    </div>
                    <button onClick={()=>{setCsvEmails([]);setCsvFileName("");}} className="text-indigo-300 hover:text-indigo-600"><X className="w-4 h-4"/></button>
                  </div>
                )}
                <p className="text-[10px] text-gray-400">CSV should have one email per row, or a column with email addresses. Headers are ignored.</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {SEGMENTS.map(seg=>(
                  <label key={seg.id} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${segment===seg.id?"border-indigo-500 bg-indigo-50":"border-gray-200 hover:border-gray-300"}`}>
                    <input type="radio" name="cm_segment" value={seg.id} checked={segment===seg.id} onChange={()=>setSegment(seg.id)} className="mt-0.5 accent-indigo-600"/>
                    <div className="flex-1"><p className="text-sm font-semibold text-gray-900">{seg.label}</p><p className="text-xs text-gray-400">{seg.desc}</p></div>
                    {segment===seg.id&&segCount!==null&&<span className="text-sm font-bold text-indigo-600 tabular-nums">{segCount.toLocaleString()}</span>}
                  </label>
                ))}
              </div>
            )}
          </div>
          {/* subject */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">Subject</label>
            <input type="text" placeholder="Email subject…" value={subject} onChange={e=>setSubject(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"/>
          </div>
          {/* body */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Body</label>
              <button onClick={()=>setHtmlMode(h=>!h)} className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors ${htmlMode?"bg-indigo-100 text-indigo-700":"bg-gray-100 text-gray-500 hover:text-gray-700"}`}>
                <Code className="w-3 h-3"/>{htmlMode?"HTML":"Plain"}
              </button>
            </div>
            <textarea value={body} onChange={e=>setBody(e.target.value)} rows={8}
              placeholder={htmlMode?"<p>Your message here…</p>":"Your message here…"}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"/>
          </div>
          {/* send */}
          {!confirm ? (
            <button onClick={()=>{if(!subject.trim()||!body.trim()){toast.error("Subject and body are required");return;}setConfirm(true);}}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-indigo-700">
              <Send className="w-4 h-4"/>
              {mode==="email"?"Send Email":`Send to ${segCount!==null?segCount.toLocaleString():"…"} recipients`}
            </button>
          ) : (
            <div className="rounded-xl border border-red-100 bg-red-50 p-4 space-y-3">
              <p className="text-sm font-bold text-red-700">Confirm send</p>
              <p className="text-xs text-red-600">
                {mode==="email"?`Sending to ${toEmail}.`:`Sending to ${segCount?.toLocaleString()} ${segment.replace(/_/g," ")}.`} Cannot be undone.
              </p>
              <div className="flex gap-2">
                <button onClick={send} disabled={sending} className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
                  {sending?<RefreshCw className="w-3.5 h-3.5 animate-spin"/>:<Send className="w-3.5 h-3.5"/>}{sending?"Sending…":"Yes, send"}
                </button>
                <button onClick={()=>setConfirm(false)} className="text-xs font-semibold px-4 py-2 border border-gray-200 rounded-lg hover:bg-white">Cancel</button>
              </div>
            </div>
          )}
        </div>
        {/* ── right: preview — always shows branded wrapper ── */}
        <div className="rounded-xl border border-gray-100 overflow-hidden flex flex-col">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
            <Eye className="w-3.5 h-3.5 text-gray-400"/>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Live Preview</span>
            <span className="ml-auto text-[10px] text-gray-300">Header &amp; footer applied</span>
          </div>
          <div className="bg-white px-4 py-2.5 border-b border-gray-100 space-y-1">
            <div className="flex gap-2 text-xs font-mono"><span className="text-gray-400 w-14 shrink-0">To:</span><span className="text-gray-600 truncate">{mode==="email"?(toEmail||"recipient@example.com"):`${SEGMENTS.find(s=>s.id===segment)?.label??segment} (${segCount??"…"})`}</span></div>
            <div className="flex gap-2 text-xs font-mono"><span className="text-gray-400 w-14 shrink-0">Subject:</span><span className="text-gray-900 font-semibold font-sans">{fillVars(subject)||"(no subject)"}</span></div>
          </div>
          <iframe
            srcDoc={wrapEmailHtml(htmlBody||"<p style='color:#94a3b8;font-size:14px;padding:32px 0;text-align:center'>Start typing to preview…</p>")}
            className="w-full border-0 block flex-1"
            style={{height:"460px",colorScheme:"light"}}
            title="Custom email preview"
            sandbox="allow-same-origin"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Broadcast tab ───────────────────────────────────────────────────────────

function BroadcastTab({broadcasts:initBroadcasts,pendingBroadcasts:initPending,globals,templates,suppressionList}:{
  broadcasts:BroadcastRecord[];pendingBroadcasts:PendingBroadcast[];globals:Record<string,string>;templates:Record<string,string>;suppressionList:SuppressionEntry[];
}) {
  const allGroups=SECTIONS.flatMap(s=>s.groups);
  const [segment,setSegment]=useState<SegmentId>("all_clients");
  const [selGroup,setSelGroup]=useState<Group|null>(null);
  const [count,setCount]=useState<number|null>(null);
  const [sending,setSending]=useState(false);
  const [confirm,setConfirm]=useState(false);
  const [schedMode,setSchedMode]=useState(false);
  const [schedAt,setSchedAt]=useState("");
  const [quota,setQuota]=useState<{sentThisMonth:number}|null>(null);
  const [broadcasts,setBroadcasts]=useState(initBroadcasts);
  const [pending,setPending]=useState(initPending);
  const [recipientPreview,setRecipientPreview]=useState<{preview:{email:string;name:string}[];total:number;suppressed:number;freqCapped:number}|null>(null);
  const [showEmailPreview,setShowEmailPreview]=useState(false);
  const [loadingPreview,setLoadingPreview]=useState(false);
  const [simResult,setSimResult]=useState<{total:number;suppressed:number;freqCapped:number;wouldSend:number}|null>(null);
  const [simLoading,setSimLoading]=useState(false);
  const footerOn=globals["email_footer_enabled"]==="true",footerText=globals["email_footer_text"]??"";
  const winStart=globals["email_send_window_start"]?parseInt(globals["email_send_window_start"],10):null;
  const winEnd=globals["email_send_window_end"]?parseInt(globals["email_send_window_end"],10):null;
  const freqCapHours=globals["email_freq_cap_hours"]?parseInt(globals["email_freq_cap_hours"],10):0;

  useEffect(()=>{setCount(null);fetch(`/api/admin/email-templates/broadcast?segment=${segment}`).then(r=>r.json()).then(d=>setCount(d.count??0)).catch(()=>{});},[segment]);
  useEffect(()=>{fetch("/api/admin/email-templates/quota").then(r=>r.json()).then(d=>setQuota(d)).catch(()=>{});},[]);

  async function simulate(){
    setSimLoading(true);setSimResult(null);
    try{const r=await fetch(`/api/admin/email-templates/recipient-preview?segment=${segment}${freqCapHours>0?`&freqCapHours=${freqCapHours}`:""}`);const d=await r.json();setSimResult({total:d.total+d.freqCapped,suppressed:d.suppressed,freqCapped:d.freqCapped??0,wouldSend:d.total});}
    catch{toast.error("Simulate failed");}
    setSimLoading(false);
  }

  async function sendNow(){
    if(!selGroup)return;setSending(true);setConfirm(false);
    const body=footerOn&&footerText?(templates[selGroup.body]??"")+"\n\n---\n"+footerText:(templates[selGroup.body]??"");
    const res=await fetch("/api/admin/email-templates/broadcast",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({subject:templates[selGroup.subject],body,segment,templateLabel:selGroup.label})});
    if(res.ok){const d=await res.json();toast.success(`Sent to ${d.sent} recipients${d.failed>0?` (${d.failed} failed)`:""}`);setBroadcasts(b=>[{id:Math.random().toString(36).slice(2),timestamp:new Date().toISOString(),segment,templateLabel:selGroup.label,sentCount:d.sent,failed:d.failed,adminEmail:"admin"},...b].slice(0,50));}
    else toast.error("Failed");
    setSending(false);
  }

  async function scheduleSend(){
    if(!selGroup||!schedAt){toast.error("Select template and time");return;}
    const body=footerOn&&footerText?(templates[selGroup.body]??"")+"\n\n---\n"+footerText:(templates[selGroup.body]??"");
    const res=await fetch("/api/admin/email-templates/pending-broadcast",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({segment,templateLabel:selGroup.label,subject:templates[selGroup.subject],body,scheduledAt:new Date(schedAt).toISOString()})});
    if(res.ok){const d=await res.json();toast.success("Scheduled");setPending(p=>[{id:d.id,segment,templateLabel:selGroup.label,subject:templates[selGroup.subject]??"",body,scheduledAt:new Date(schedAt).toISOString(),createdAt:new Date().toISOString(),adminEmail:"admin",status:"pending"},...p]);setSchedMode(false);setSchedAt("");}
    else toast.error("Failed to schedule");
  }

  async function cancelPending(id:string){
    await fetch("/api/admin/email-templates/pending-broadcast",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id})});
    setPending(p=>p.map(b=>b.id===id?{...b,status:"cancelled" as const}:b));
    toast.success("Cancelled");
  }

  return (
    <div className="space-y-6">
      {quota&&(
        <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3">
          <TrendingUp className="w-4 h-4 text-gray-400 shrink-0"/>
          <p className="text-xs text-gray-600"><span className="font-bold text-gray-900">{quota.sentThisMonth.toLocaleString()}</span> emails sent this month (from Resend)</p>
          {suppressionList.length>0&&<><span className="text-gray-300">·</span><Ban className="w-3.5 h-3.5 text-red-400 shrink-0"/><span className="text-xs text-gray-500">{suppressionList.length} suppressed</span></>}
        </div>
      )}
      <CustomMailCard/>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900">Send Broadcast</h2>
            <div className="flex gap-1 bg-gray-100 p-0.5 rounded-lg">
              {[{id:false,icon:Send,label:"Now"},{id:true,icon:Clock,label:"Schedule"}].map(({id,icon:Icon,label})=>(
                <button key={String(id)} onClick={()=>setSchedMode(id)} className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${schedMode===id?"bg-white text-gray-900 shadow-sm":"text-gray-500 hover:text-gray-700"}`}><Icon className="w-3 h-3"/>{label}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">Segment</label>
            <div className="space-y-1.5">
              {SEGMENTS.map(seg=>(
                <label key={seg.id} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${segment===seg.id?"border-gray-900 bg-gray-50":"border-gray-200 hover:border-gray-300"}`}>
                  <input type="radio" name="segment" value={seg.id} checked={segment===seg.id} onChange={()=>setSegment(seg.id)} className="mt-0.5 accent-gray-900"/>
                  <div><p className="text-sm font-semibold text-gray-900">{seg.label}</p><p className="text-xs text-gray-400">{seg.desc}</p></div>
                  {segment===seg.id&&count!==null&&<span className="ml-auto text-sm font-bold text-gray-700 tabular-nums">{count.toLocaleString()}</span>}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">Template</label>
            <select value={selGroup?.label??""} onChange={e=>setSelGroup(allGroups.find(g=>g.label===e.target.value)??null)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20 bg-white">
              <option value="">Select a template…</option>
              {SECTIONS.map(s=><optgroup key={s.section} label={s.section}>{s.groups.map(g=><option key={g.label} value={g.label}>{g.label}</option>)}</optgroup>)}
            </select>
          </div>
          {schedMode&&(
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">Schedule time</label>
              <input type="datetime-local" value={schedAt} onChange={e=>setSchedAt(e.target.value)} min={new Date().toISOString().slice(0,16)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"/>
            </div>
          )}
          {selGroup&&<div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-xs text-gray-600 space-y-1"><p className="font-semibold truncate">{templates[selGroup.subject]??""}</p><p className="text-gray-400 line-clamp-2">{templates[selGroup.body]??""}</p></div>}
          <button onClick={simulate} disabled={simLoading} className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-gray-500 border border-dashed border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-50">
            {simLoading?<RefreshCw className="w-3.5 h-3.5 animate-spin"/>:<FlaskConical className="w-3.5 h-3.5"/>}{simLoading?"Simulating…":"Dry run — simulate without sending"}
          </button>
          {simResult&&(
            <div className="rounded-xl border border-gray-200 bg-white p-3 space-y-1.5 text-xs">
              <p className="font-bold text-gray-700 flex items-center gap-1.5"><FlaskConical className="w-3.5 h-3.5 text-gray-400"/>Simulation result</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  {label:"Total in segment",value:simResult.total,color:"text-gray-700"},
                  {label:"Would receive",   value:simResult.wouldSend,color:"text-emerald-600"},
                  {label:"Suppressed",      value:simResult.suppressed,color:simResult.suppressed>0?"text-red-500":"text-gray-400"},
                  {label:"Freq-capped",     value:simResult.freqCapped,color:simResult.freqCapped>0?"text-amber-500":"text-gray-400"},
                ].map(({label,value,color})=>(
                  <div key={label} className="rounded-lg bg-gray-50 px-3 py-2">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</p>
                    <p className={`text-lg font-bold tabular-nums ${color}`}>{value.toLocaleString()}</p>
                  </div>
                ))}
              </div>
              <button onClick={()=>setSimResult(null)} className="text-[10px] text-gray-400 hover:text-gray-600">Dismiss</button>
            </div>
          )}
          {winStart!==null&&winEnd!==null&&(
            <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0"/>
              <p className="text-xs text-amber-700">Send window: {winStart}:00–{winEnd}:00 IST. Broadcasts outside this window will be rejected.</p>
            </div>
          )}
          {schedMode?(
            <button onClick={scheduleSend} className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-gray-700"><Calendar className="w-4 h-4"/>Schedule broadcast</button>
          ):!confirm?(
            <button onClick={async()=>{if(!selGroup){toast.info("Select a template");return;}setLoadingPreview(true);setShowEmailPreview(false);try{const r=await fetch(`/api/admin/email-templates/recipient-preview?segment=${segment}${freqCapHours>0?`&freqCapHours=${freqCapHours}`:""}`);const d=await r.json();setRecipientPreview(d);}catch{}setLoadingPreview(false);setConfirm(true);}} disabled={loadingPreview}
              className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-gray-700 disabled:opacity-60">
              {loadingPreview?<RefreshCw className="w-4 h-4 animate-spin"/>:<Megaphone className="w-4 h-4"/>}{loadingPreview?"Loading preview…":`Send to ${count!==null?count.toLocaleString():"…"} recipients`}
            </button>
          ):(
            <div className="rounded-xl border border-red-100 bg-red-50 p-4 space-y-3">
              <p className="text-sm font-bold text-red-700">Confirm broadcast</p>
              {recipientPreview&&(
                <div className="rounded-lg border border-red-100 bg-white p-2.5 space-y-1.5">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    {recipientPreview.total.toLocaleString()} will receive · {recipientPreview.suppressed} suppressed{recipientPreview.freqCapped>0?` · ${recipientPreview.freqCapped} freq-capped`:""}
                  </p>
                  {recipientPreview.preview.map(u=>(
                    <p key={u.email} className="text-xs text-gray-700">{u.name||u.email} <span className="text-gray-400">{u.name?`· ${u.email}`:""}</span></p>
                  ))}
                  {recipientPreview.total>5&&<p className="text-[10px] text-gray-400">+ {recipientPreview.total-5} more</p>}
                </div>
              )}
              {selGroup&&(
                <div>
                  <button onClick={()=>setShowEmailPreview(p=>!p)} className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 hover:text-gray-800 mb-2">
                    <Eye className="w-3 h-3"/>{showEmailPreview?"Hide email preview":"Preview email"}
                  </button>
                  {showEmailPreview&&(
                    <div className="rounded-lg overflow-hidden border border-gray-200 bg-white">
                      <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100 text-[10px] text-gray-400 font-mono">Subject: {templates[selGroup.subject]}</div>
                      <iframe
                        srcDoc={wrapEmailHtml(fillVars(templates[selGroup.body]??""))}
                        className="w-full border-0 block"
                        style={{height:"320px",colorScheme:"light"}}
                        title="Email preview"
                        sandbox="allow-same-origin"
                      />
                    </div>
                  )}
                </div>
              )}
              <p className="text-xs text-red-600">Sending &ldquo;{selGroup?.label}&rdquo; to <strong>{recipientPreview?.total.toLocaleString()??count?.toLocaleString()} {segment.replace(/_/g," ")}</strong>. Cannot be undone.</p>
              <div className="flex gap-2">
                <button onClick={sendNow} disabled={sending} className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
                  {sending?<RefreshCw className="w-3.5 h-3.5 animate-spin"/>:<Send className="w-3.5 h-3.5"/>}{sending?"Sending…":"Yes, send now"}
                </button>
                <button onClick={()=>{setConfirm(false);setRecipientPreview(null);setShowEmailPreview(false);}} className="text-xs font-semibold px-4 py-2 border border-gray-200 rounded-lg hover:bg-white">Cancel</button>
              </div>
            </div>
          )}
        </div>
        <div className="space-y-4">
          {pending.filter(b=>b.status==="pending").length>0&&(
            <div className="rounded-2xl border border-amber-100 bg-white shadow-sm p-5 space-y-3">
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2"><Clock className="w-4 h-4 text-amber-400"/>Scheduled</h2>
              {pending.filter(b=>b.status==="pending").map(b=>(
                <div key={b.id} className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 flex items-start justify-between gap-2">
                  <div><p className="text-xs font-semibold text-gray-800">{b.templateLabel}</p><p className="text-[10px] text-amber-600 mt-0.5">{SEGMENTS.find(s=>s.id===b.segment)?.label??b.segment} · {fmtDate(b.scheduledAt)}</p></div>
                  <button onClick={()=>cancelPending(b.id)} className="text-red-400 hover:text-red-600 shrink-0 p-1"><X className="w-3.5 h-3.5"/></button>
                </div>
              ))}
            </div>
          )}
          <BroadcastHistoryCard broadcasts={broadcasts} segments={SEGMENTS}/>
        </div>
      </div>
    </div>
  );
}

// ─── Analytics tab ────────────────────────────────────────────────────────────

type DailyPoint = { date:string; sent:number; opened:number; bounced:number };
type ResendStats = { total:number; delivered:number; opened:number; clicked:number; bounced:number; failed:number; deliveryRate:string|null; openRate:string|null; ctr:string|null; bounceRate:string|null; dailyBreakdown:DailyPoint[] };

function AnalyticsTab({broadcasts,suppressionList,onNavigate}:{broadcasts:BroadcastRecord[];suppressionList:SuppressionEntry[];onNavigate:(t:TabId)=>void}) {
  const [resend,setResend]=useState<ResendStats|null>(null);
  const [resendLoading,setResendLoading]=useState(true);
  useEffect(()=>{fetch("/api/admin/email-templates/analytics").then(r=>r.json()).then(d=>setResend(d.error?null:d)).catch(()=>{}).finally(()=>setResendLoading(false));},[]);

  // KPI totals
  const totalSent    = broadcasts.reduce((s,b)=>s+b.sentCount,0);
  const totalFailed  = broadcasts.reduce((s,b)=>s+(b.failed??0),0);
  const totalRuns    = broadcasts.length;
  const avgPerRun    = totalRuns ? Math.round(totalSent/totalRuns) : 0;
  const failRate     = (totalSent+totalFailed)>0 ? ((totalFailed/(totalSent+totalFailed))*100).toFixed(1) : "0.0";

  // Weekly volume — last 8 weeks
  const weeks: {label:string;count:number}[] = [];
  const now = Date.now();
  for (let i=7;i>=0;i--) {
    const wStart = now - (i+1)*7*86400_000;
    const wEnd   = now - i*7*86400_000;
    const label  = new Date(wEnd).toLocaleDateString("en-IN",{month:"short",day:"numeric"});
    const count  = broadcasts.filter(b=>{const t=new Date(b.timestamp).getTime();return t>=wStart&&t<wEnd;}).reduce((s,b)=>s+b.sentCount,0);
    weeks.push({label,count});
  }
  const maxWeek = Math.max(...weeks.map(w=>w.count),1);

  // Segment breakdown
  const segMap: Record<string,number> = {};
  for (const b of broadcasts) segMap[b.segment]=(segMap[b.segment]??0)+b.sentCount;
  const segments = Object.entries(segMap).sort((a,b)=>b[1]-a[1]);
  const maxSeg   = Math.max(...segments.map(s=>s[1]),1);

  // Top templates
  const tplMap: Record<string,number> = {};
  for (const b of broadcasts) tplMap[b.templateLabel]=(tplMap[b.templateLabel]??0)+1;
  const topTpls = Object.entries(tplMap).sort((a,b)=>b[1]-a[1]).slice(0,5);

  const SEG_LABELS: Record<string,string> = {all_clients:"All Clients",all_editors:"All Editors",inactive_clients:"Inactive Clients"};
  const SEG_COLORS: Record<string,string> = {all_clients:"bg-indigo-500",all_editors:"bg-violet-500",inactive_clients:"bg-amber-500"};

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          {label:"Total Emails Sent",   value:totalSent.toLocaleString(),   sub:"across all broadcasts",  color:"text-indigo-600"},
          {label:"Broadcasts Run",       value:totalRuns.toLocaleString(),   sub:"manual send campaigns",  color:"text-violet-600"},
          {label:"Avg Recipients",       value:avgPerRun.toLocaleString(),   sub:"per broadcast",          color:"text-blue-600"},
          {label:"Failed Deliveries",    value:totalFailed.toLocaleString(), sub:`${failRate}% failure rate`, color:totalFailed>0?"text-red-500":"text-emerald-600"},
          {label:"Suppressed Addresses", value:suppressionList.length.toLocaleString(), sub:"on suppression list", color:"text-gray-700"},
        ].map(({label,value,sub,color})=>(
          <div key={label} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</p>
            <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Resend performance */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-gray-900">Resend Email Performance</h3>
          <span className="text-[10px] text-gray-400">{resend?.total??0} most recent emails sampled</span>
        </div>
        {resendLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">{[...Array(4)].map((_,i)=><div key={i} className="rounded-lg bg-gray-50 p-3 space-y-2"><Skel w="w-20"/><Skel w="w-12" h="h-6"/><Skel w="w-24"/></div>)}</div>
        ) : !resend ? (
          <p className="text-sm text-gray-400">Could not fetch Resend stats.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              {label:"Delivery rate", value:resend.deliveryRate!=null?`${resend.deliveryRate}%`:"—", sub:`${(resend.delivered+resend.opened+resend.clicked).toLocaleString()} delivered`, color:"text-emerald-600"},
              {label:"Open rate",     value:resend.openRate!=null?`${resend.openRate}%`:"—",     sub:`${(resend.opened+resend.clicked).toLocaleString()} opened`,    color:"text-blue-600"},
              {label:"Click-through", value:resend.ctr!=null?`${resend.ctr}%`:"—",               sub:`${resend.clicked.toLocaleString()} clicked`,                   color:"text-indigo-600"},
              {label:"Bounce rate",   value:resend.bounceRate!=null?`${resend.bounceRate}%`:"—", sub:`${resend.bounced.toLocaleString()} bounced`,                   color:resend.bounced>0?"text-red-500":"text-gray-500"},
            ].map(({label,value,sub,color})=>(
              <div key={label} className="rounded-lg bg-gray-50 p-3">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</p>
                <p className={`text-xl font-bold tabular-nums ${color}`}>{value}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 7-day daily delivery chart from Resend */}
      {!resendLoading&&resend&&resend.dailyBreakdown&&resend.dailyBreakdown.some(d=>d.sent>0)&&(
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-900">7-Day Delivery Activity</h3>
            <div className="flex items-center gap-3 text-[10px] font-semibold">
              {[{label:"Sent",color:"bg-blue-400"},{label:"Opened",color:"bg-emerald-400"},{label:"Bounced",color:"bg-red-400"}].map(({label,color})=>(
                <div key={label} className="flex items-center gap-1.5"><div className={`w-2 h-2 rounded-full ${color}`}/><span className="text-gray-500">{label}</span></div>
              ))}
            </div>
          </div>
          <div className="flex items-end gap-2">
            {resend.dailyBreakdown.map(d=>{
              const max=Math.max(...resend.dailyBreakdown.map(x=>x.sent),1);
              const sentH=Math.max((d.sent/max)*80,d.sent>0?4:0);
              const openH=Math.max((d.opened/max)*80,d.opened>0?2:0);
              const bounceH=Math.max((d.bounced/max)*80,d.bounced>0?2:0);
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group">
                  <div className="w-full flex items-end justify-center gap-0.5" style={{height:84}}>
                    <div className="w-2.5 rounded-t-sm bg-blue-200 group-hover:bg-blue-400 transition-colors" style={{height:sentH}} title={`Sent: ${d.sent}`}/>
                    <div className="w-2.5 rounded-t-sm bg-emerald-200 group-hover:bg-emerald-400 transition-colors" style={{height:openH}} title={`Opened: ${d.opened}`}/>
                    {d.bounced>0&&<div className="w-2.5 rounded-t-sm bg-red-200 group-hover:bg-red-400 transition-colors" style={{height:bounceH}} title={`Bounced: ${d.bounced}`}/>}
                  </div>
                  <span className="text-[9px] text-gray-300 group-hover:text-gray-500 transition-colors">{d.date.slice(5)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly volume chart */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-4">Weekly Email Volume</h3>
          {totalSent===0 ? (
            <div className="flex items-center justify-center h-40 text-sm text-gray-400">No broadcasts yet</div>
          ) : (
            <div className="space-y-2">
              {weeks.map(w=>(
                <div key={w.label} className="flex items-center gap-3">
                  <span className="text-[11px] text-gray-400 w-16 shrink-0 text-right">{w.label}</span>
                  <div className="flex-1 h-5 bg-gray-50 rounded overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded transition-all" style={{width:`${(w.count/maxWeek)*100}%`,minWidth:w.count>0?"4px":"0"}}/>
                  </div>
                  <span className="text-[11px] font-semibold text-gray-600 tabular-nums w-10 text-right">{w.count>0?w.count.toLocaleString():"—"}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Segment breakdown */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-4">Emails by Segment</h3>
          {segments.length===0 ? (
            <div className="flex items-center justify-center h-40 text-sm text-gray-400">No broadcasts yet</div>
          ) : (
            <div className="space-y-3">
              {segments.map(([seg,count])=>(
                <div key={seg} className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-gray-700">{SEG_LABELS[seg]??seg}</span>
                    <span className="text-xs font-bold text-gray-500 tabular-nums">{count.toLocaleString()}</span>
                  </div>
                  <div className="h-2.5 bg-gray-50 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${SEG_COLORS[seg]??"bg-gray-400"}`} style={{width:`${(count/maxSeg)*100}%`}}/>
                  </div>
                </div>
              ))}
              <div className="pt-2 border-t border-gray-50 flex flex-wrap gap-3">
                {segments.map(([seg])=>(
                  <div key={seg} className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${SEG_COLORS[seg]??"bg-gray-400"}`}/>
                    <span className="text-[11px] text-gray-500">{SEG_LABELS[seg]??seg}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top templates */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-4">Most Broadcast Templates</h3>
          {topTpls.length===0 ? (
            <div className="flex items-center justify-center h-28 text-sm text-gray-400">No broadcasts yet</div>
          ) : (
            <div className="space-y-2">
              {topTpls.map(([label,count],i)=>(
                <div key={label} className="flex items-center gap-3">
                  <span className="text-[11px] font-bold text-gray-300 w-4 tabular-nums">{i+1}</span>
                  <span className="flex-1 text-sm text-gray-700 truncate">{label}</span>
                  <span className="text-xs font-bold text-indigo-600 tabular-nums">{count}×</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent broadcasts */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-900">Recent Broadcasts</h3>
            <button onClick={()=>onNavigate("broadcast")} className="flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-gray-700 transition-colors"><ArrowRight className="w-3 h-3"/>View all</button>
          </div>
          {broadcasts.length===0 ? (
            <div className="flex items-center justify-center h-28 text-sm text-gray-400">No broadcasts yet</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {broadcasts.slice(0,6).map(b=>{
                const date=new Date(b.timestamp);
                const daysAgo=Math.floor((Date.now()-date.getTime())/86400_000);
                const when=daysAgo===0?"Today":daysAgo===1?"Yesterday":`${daysAgo}d ago`;
                return (
                  <div key={b.id} className="py-2.5 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{b.templateLabel}</p>
                      <p className="text-[11px] text-gray-400">{SEG_LABELS[b.segment]??b.segment} · {when}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-gray-700 tabular-nums">{b.sentCount.toLocaleString()}</p>
                      {(b.failed??0)>0&&<p className="text-[10px] text-red-400 tabular-nums">{b.failed} failed</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Delivery tab ─────────────────────────────────────────────────────────────

type DeliveryEmail={id:string;from:string;to:string[];subject:string;created_at:string;last_event?:string};
const EVENT_BADGE:Record<string,string>={delivered:"bg-emerald-100 text-emerald-700",opened:"bg-blue-100 text-blue-700",clicked:"bg-indigo-100 text-indigo-700",bounced:"bg-red-100 text-red-700",failed:"bg-red-100 text-red-700",sent:"bg-gray-100 text-gray-600"};

function DeliveryTab(){
  const [emails,setEmails]=useState<DeliveryEmail[]>([]);
  const [loading,setLoading]=useState(true);
  const [loadingMore,setLoadingMore]=useState(false);
  const [cursor,setCursor]=useState<string|null>(null);
  const [filter,setFilter]=useState("all");
  const [search,setSearch]=useState("");
  const [dateFrom,setDateFrom]=useState("");
  const [dateTo,setDateTo]=useState("");
  const [suppressing,setSuppressing]=useState<string|null>(null);

  async function suppressEmail(email:string){
    setSuppressing(email);
    const res=await fetch("/api/admin/email-templates/suppress",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,reason:"Hard bounce (manual)"})});
    if(res.ok)toast.success(`Suppressed ${email}`);else{const d=await res.json().catch(()=>({}));toast.error(d.error??"Failed");}
    setSuppressing(null);
  }

  const trendData=useMemo(()=>{
    const counts:Record<string,number>={};
    const today=new Date();
    for(let i=13;i>=0;i--){const d=new Date(today);d.setDate(d.getDate()-i);counts[d.toISOString().slice(0,10)]=0;}
    emails.forEach(e=>{const d=e.created_at.slice(0,10);if(d in counts)counts[d]++;});
    return Object.entries(counts).map(([date,count])=>({date,count}));
  },[emails]);
  const maxCount=Math.max(...trendData.map(d=>d.count),1);

  useEffect(()=>{fetch("/api/admin/email-templates/delivery").then(r=>r.json()).then(d=>{setEmails(d.emails??[]);setCursor(d.cursor??null);}).catch(()=>{}).finally(()=>setLoading(false));},[]);
  async function loadMore(){if(!cursor)return;setLoadingMore(true);try{const r=await fetch(`/api/admin/email-templates/delivery?after=${encodeURIComponent(cursor)}`);const d=await r.json();setEmails(prev=>[...prev,...(d.emails??[])]);setCursor(d.cursor??null);}catch{}setLoadingMore(false);}
  function exportDeliveryCsv(){
    const rows=[["Status","Subject","To","Sent"],...filtered.map(e=>[e.last_event??"sent",e.subject,e.to[0]??"",fmtDate(e.created_at)])];
    const csv=rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const url=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));
    const a=document.createElement("a");a.href=url;a.download=`delivery-${new Date().toISOString().slice(0,10)}.csv`;a.click();
    setTimeout(()=>URL.revokeObjectURL(url),5000);
  }
  const events=["all","delivered","opened","clicked","bounced","failed","sent"];
  const filtered=emails.filter(e=>{
    if(filter!=="all"&&(e.last_event??"sent")!==filter)return false;
    if(search){const q=search.toLowerCase();if(!e.subject.toLowerCase().includes(q)&&!(e.to[0]??"").toLowerCase().includes(q))return false;}
    if(dateFrom&&e.created_at.slice(0,10)<dateFrom)return false;
    if(dateTo&&e.created_at.slice(0,10)>dateTo)return false;
    return true;
  });
  return (
    <div className="space-y-5">
      {!loading&&trendData.some(d=>d.count>0)&&(
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Emails sent — last 14 days</p>
          <div className="flex items-end gap-1 h-16">
            {trendData.map(({date,count})=>(
              <div key={date} className="flex-1 flex flex-col items-center gap-1 group">
                <div className="w-full bg-blue-100 rounded-sm transition-all group-hover:bg-blue-400" style={{height:`${Math.max((count/maxCount)*100,4)}%`}} title={`${date}: ${count}`}/>
                <span className="text-[8px] text-gray-300 group-hover:text-gray-500 transition-colors hidden sm:block">{date.slice(5)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by subject or recipient…"
            className="w-full pl-9 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20 bg-white"/>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} title="From date"
            className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20 bg-white"/>
          <span className="text-xs text-gray-400">–</span>
          <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} title="To date"
            className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20 bg-white"/>
          {(dateFrom||dateTo)&&<button onClick={()=>{setDateFrom("");setDateTo("");}} className="text-xs text-gray-400 hover:text-gray-700 px-2 py-1 rounded-lg hover:bg-gray-100"><X className="w-3.5 h-3.5"/></button>}
        </div>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl flex-wrap">
          {events.map(ev=><button key={ev} onClick={()=>setFilter(ev)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${filter===ev?"bg-white text-gray-900 shadow-sm":"text-gray-500 hover:text-gray-700"}`}>{ev}</button>)}
        </div>
        <button onClick={exportDeliveryCsv} disabled={filtered.length===0} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 shrink-0">
          <Download className="w-3.5 h-3.5"/>CSV
        </button>
      </div>
      {loading&&<div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">{[...Array(6)].map((_,i)=><SkeletonRow key={i}/>)}</div>}
      {!loading&&filtered.length===0&&<div className="text-center py-12 text-gray-400"><Inbox className="w-8 h-8 mx-auto mb-3 opacity-40"/><p className="text-sm">No emails match</p></div>}
      {!loading&&filtered.length>0&&(
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-100 bg-gray-50">{["Status","Subject","To","Sent",""].map(h=><th key={h} className="text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 px-4 py-3">{h}</th>)}</tr></thead>
              <tbody>
                {filtered.map(email=>{const ev=email.last_event??"sent";const isBounced=ev==="bounced";return(
                  <tr key={email.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${EVENT_BADGE[ev]??"bg-gray-100 text-gray-500"}`}>{ev}</span></td>
                    <td className="px-4 py-3 text-gray-700 max-w-[260px] truncate">{email.subject}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs truncate max-w-[180px]">{email.to[0]}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{fmtDate(email.created_at)}</td>
                    <td className="px-4 py-3">{isBounced&&email.to[0]&&<button onClick={()=>suppressEmail(email.to[0])} disabled={suppressing===email.to[0]} className="flex items-center gap-1 text-[10px] font-bold text-red-500 hover:text-red-700 disabled:opacity-40 whitespace-nowrap"><Ban className="w-3 h-3"/>{suppressing===email.to[0]?"…":"Suppress"}</button>}</td>
                  </tr>
                );})}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {cursor&&<button onClick={loadMore} disabled={loadingMore} className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-semibold text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50">{loadingMore?<RefreshCw className="w-3.5 h-3.5 animate-spin"/>:<Download className="w-3.5 h-3.5"/>}{loadingMore?"Loading…":"Load next 100"}</button>}
      <p className="text-[10px] text-gray-400 text-center">{emails.length} emails loaded from Resend{cursor?" · more available":""}</p>
    </div>
  );
}

// ─── Audit tab ────────────────────────────────────────────────────────────────

function AuditTab({initialLog}:{initialLog:AuditEntry[]}){
  const [log,setLog]=useState(initialLog);
  const [search,setSearch]=useState("");
  const [clearing,setClearing]=useState(false);
  const filtered=log.filter(e=>!search||(e.templateLabel.toLowerCase().includes(search.toLowerCase())||e.action.includes(search.toLowerCase())));
  async function clearLog(){setClearing(true);const res=await fetch("/api/admin/email-templates/audit",{method:"DELETE"});if(res.ok){setLog([]);toast.success("Cleared");}else toast.error("Failed");setClearing(false);}
  function exportCsv(){
    const rows=[["When","Admin","Template","Action","Note"],...filtered.map(e=>[fmtDate(e.timestamp),e.adminEmail,e.templateLabel,e.action,e.note??""])];
    const csv=rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const url=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));
    const a=document.createElement("a");a.href=url;a.download=`audit-log-${new Date().toISOString().slice(0,10)}.csv`;a.click();
    setTimeout(()=>URL.revokeObjectURL(url),5000);
  }
  const ACTION_STYLE:Record<string,string>={save:"bg-blue-100 text-blue-700",enable:"bg-emerald-100 text-emerald-700",disable:"bg-gray-100 text-gray-500",approved:"bg-emerald-100 text-emerald-700",draft:"bg-amber-100 text-amber-700",lock:"bg-amber-100 text-amber-600",unlock:"bg-gray-100 text-gray-500"};
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Filter by template or action…" className="w-full pl-9 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20 bg-white"/>
        </div>
        <button onClick={exportCsv} disabled={filtered.length===0} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40">
          <Download className="w-3.5 h-3.5"/>Export CSV
        </button>
        <button onClick={clearLog} disabled={clearing||log.length===0} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 disabled:opacity-40">
          <Trash2 className="w-3.5 h-3.5"/>{clearing?"Clearing…":"Clear log"}
        </button>
      </div>
      {filtered.length===0&&<div className="text-center py-14 text-gray-400"><ClipboardList className="w-8 h-8 mx-auto mb-3 opacity-40"/><p className="text-sm">{log.length===0?"No audit entries yet.":"No entries match."}</p></div>}
      {filtered.length>0&&(
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-100 bg-gray-50">{["When","Admin","Template","Action","Note"].map(h=><th key={h} className="text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 px-4 py-3">{h}</th>)}</tr></thead>
              <tbody>
                {filtered.map(entry=>(
                  <tr key={entry.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{fmtDate(entry.timestamp)}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 truncate max-w-[140px]">{entry.adminEmail}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-gray-800 truncate max-w-[180px]">{entry.templateLabel}</td>
                    <td className="px-4 py-3"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${ACTION_STYLE[entry.action]??"bg-gray-100 text-gray-500"}`}>{entry.action}</span></td>
                    <td className="px-4 py-3 text-xs text-gray-400 max-w-[200px] truncate">{entry.note??"—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <p className="text-[10px] text-gray-400 text-center">{filtered.length} of {log.length} entries (max 100)</p>
    </div>
  );
}

// ─── Settings tab ─────────────────────────────────────────────────────────────

function SettingsTab({globals,customVars:initVars,suppressionList:initSupp}:{globals:Record<string,string>;customVars:CustomVar[];suppressionList:SuppressionEntry[]}){
  const [fromName,setFromName]=useState(globals["email_global_from_name"]??"");
  const [footerOn,setFooterOn]=useState(globals["email_footer_enabled"]==="true");
  const [footerTxt,setFooterTxt]=useState(globals["email_footer_text"]??"");
  const [throttleMs,setThrottleMs]=useState(globals["email_broadcast_throttle_ms"]??"0");
  const [freqCapHoursVal,setFreqCapHoursVal]=useState(globals["email_freq_cap_hours"]??"0");
  const [emailPaused,setEmailPaused]=useState(globals["email_paused"]==="true");
  const [winStart,setWinStart]=useState(globals["email_send_window_start"]??"");
  const [winEnd,setWinEnd]=useState(globals["email_send_window_end"]??"");
  // layout
  const [logoText,setLogoText]=useState(globals["email_layout_logo_text"]||"EditBridge");
  const [logoImageUrl,setLogoImageUrl]=useState(globals["email_layout_logo_image_url"]||"");
  const [logoImageHeight,setLogoImageHeight]=useState(globals["email_layout_logo_image_height"]||"40");
  const [headerTagline,setHeaderTagline]=useState(globals["email_layout_header_tagline"]||"India's Editing Marketplace");
  const [headerBg,setHeaderBg]=useState(globals["email_layout_header_bg"]||"#0f172a");
  const [headerTextColor,setHeaderTextColor]=useState(globals["email_layout_header_text_color"]||"#ffffff");
  const [headerTaglineColor,setHeaderTaglineColor]=useState(globals["email_layout_header_tagline_color"]||"#475569");
  const [accentColor,setAccentColor]=useState(globals["email_layout_accent_color"]||"#4f46e5");
  const [bodyBg,setBodyBg]=useState(globals["email_layout_body_bg"]||"#f1f5f9");
  const [supportEmail,setSupportEmail]=useState(globals["email_layout_support_email"]||"support@editbridge.com");
  const [websiteUrl,setWebsiteUrl]=useState(globals["email_layout_website_url"]||"https://editbridge.com");
  const [helpUrl,setHelpUrl]=useState(globals["email_layout_help_url"]||"https://editbridge.com/help");
  const [unsubscribeUrl,setUnsubscribeUrl]=useState(globals["email_layout_unsubscribe_url"]||"https://editbridge.com/unsubscribe");
  const [copyright,setCopyright]=useState(globals["email_layout_copyright"]||"© 2026 EditBridge Technologies Pvt. Ltd.");
  const [savingLayout,setSavingLayout]=useState(false);
  const [saving,setSaving]=useState(false);
  const [customVars,setCustomVars]=useState<CustomVar[]>(initVars);
  const [newVarKey,setNewVarKey]=useState(""),newVarKeyRef=newVarKey;
  const [newVarLabel,setNewVarLabel]=useState("");
  const [newVarSample,setNewVarSample]=useState("");
  const [savingVars,setSavingVars]=useState(false);
  const [suppList,setSuppList]=useState<SuppressionEntry[]>(initSupp);
  const [suppSearch,setSuppSearch]=useState("");
  const [newEmail,setNewEmail]=useState(""),newEmailRef=newEmail;
  const [newReason,setNewReason]=useState("");
  const [addingSupp,setAddingSupp]=useState(false);
  const [testLayoutSending,setTestLayoutSending]=useState(false);
  const importJsonRef=useRef<HTMLInputElement>(null);
  const [importingJson,setImportingJson]=useState(false);

  async function saveGlobals(){setSaving(true);const res=await fetch("/api/admin/settings",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({email_global_from_name:fromName,email_footer_enabled:String(footerOn),email_footer_text:footerTxt,email_broadcast_throttle_ms:throttleMs,email_freq_cap_hours:freqCapHoursVal,email_paused:String(emailPaused),email_send_window_start:winStart,email_send_window_end:winEnd})});if(res.ok)toast.success("Settings saved");else toast.error("Failed");setSaving(false);}

  async function saveLayout(){
    setSavingLayout(true);
    const res=await fetch("/api/admin/settings",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({email_layout_logo_text:logoText,email_layout_logo_image_url:logoImageUrl,email_layout_logo_image_height:logoImageHeight,email_layout_header_tagline:headerTagline,email_layout_header_bg:headerBg,email_layout_header_text_color:headerTextColor,email_layout_header_tagline_color:headerTaglineColor,email_layout_accent_color:accentColor,email_layout_body_bg:bodyBg,email_layout_support_email:supportEmail,email_layout_website_url:websiteUrl,email_layout_help_url:helpUrl,email_layout_unsubscribe_url:unsubscribeUrl,email_layout_copyright:copyright})});
    if(res.ok)toast.success("Layout saved");else toast.error("Failed");
    setSavingLayout(false);
  }

  async function togglePause(){const next=!emailPaused;setEmailPaused(next);await fetch("/api/admin/settings",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({email_paused:String(next)})});toast.success(next?"All emails paused":"Emails unpaused");}

  async function addCustomVar(){
    if(!newVarKeyRef.startsWith("{{")||!newVarKeyRef.endsWith("}}")){toast.error("Key must be like {{my_var}}");return;}
    const entry:CustomVar={key:newVarKeyRef,label:newVarLabel||newVarKeyRef,sample:newVarSample||newVarKeyRef};
    const updated=[...customVars.filter(v=>v.key!==newVarKeyRef),entry];
    setSavingVars(true);
    const res=await fetch("/api/admin/settings",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({email_custom_vars:JSON.stringify(updated)})});
    if(res.ok){setCustomVars(updated);setNewVarKey("");setNewVarLabel("");setNewVarSample("");toast.success("Variable saved");}else toast.error("Failed");
    setSavingVars(false);
  }

  async function removeCustomVar(key:string){
    const updated=customVars.filter(v=>v.key!==key);
    await fetch("/api/admin/settings",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({email_custom_vars:JSON.stringify(updated)})});
    setCustomVars(updated);toast.success("Removed");
  }

  async function sendTestLayout(){
    setTestLayoutSending(true);
    const sampleHtml=`<h2>Layout Preview</h2><p>This is a test of the current email layout settings. If you can read this cleanly, your layout is working correctly.</p><p>Variables like <strong>{{name}}</strong> would be substituted at send time.</p>`;
    const res=await fetch("/api/admin/email-templates/test",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({subject:"[Layout Test] Email Layout Preview",body:sampleHtml,templateId:"__layout_test__"})});
    if(res.ok)toast.success("Layout test sent — check your inbox");else toast.error("Failed to send layout test");
    setTestLayoutSending(false);
  }

  function exportGlobalsJson(){
    const data=Object.fromEntries(Object.entries(globals).filter(([k])=>k.startsWith("email_")));
    const blob=new Blob([JSON.stringify({data},null,2)],{type:"application/json"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`email-settings-${new Date().toISOString().slice(0,10)}.json`;a.click();
  }

  async function importGlobalsJson(e:React.ChangeEvent<HTMLInputElement>){
    const file=e.target.files?.[0];if(!file)return;
    setImportingJson(true);
    try{
      const text=await file.text();
      const parsed=JSON.parse(text);
      const res=await fetch("/api/admin/email-templates/import",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({data:parsed.data??parsed})});
      if(res.ok){const d=await res.json();toast.success(`Imported ${d.imported} settings — reload to see changes`);}
      else toast.error("Import failed");
    }catch{toast.error("Invalid JSON file");}
    setImportingJson(false);
    e.target.value="";
  }

  async function addSuppression(){
    if(!newEmailRef.includes("@")){toast.error("Valid email required");return;}
    setAddingSupp(true);
    const res=await fetch("/api/admin/email-templates/suppress",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:newEmailRef,reason:newReason||undefined})});
    if(res.ok){setSuppList(l=>[{email:newEmailRef,addedAt:new Date().toISOString(),reason:newReason||undefined},...l]);setNewEmail("");setNewReason("");toast.success("Suppressed");}
    else{const d=await res.json().catch(()=>({}));toast.error(d.error??"Failed");}
    setAddingSupp(false);
  }

  async function removeSuppression(email:string){
    await fetch("/api/admin/email-templates/suppress",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({email})});
    setSuppList(l=>l.filter(e=>e.email!==email));toast.success("Removed");
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Kill switch */}
      <div className={`rounded-2xl border shadow-sm p-5 flex items-center justify-between gap-4 ${emailPaused?"border-red-200 bg-red-50":"border-gray-100 bg-white"}`}>
        <div>
          <p className={`text-sm font-bold ${emailPaused?"text-red-700":"text-gray-900"}`}>Pause all emails</p>
          <p className="text-xs text-gray-400 mt-0.5">{emailPaused?"No emails are being sent. Toggle to resume.":"All email sending is active."}</p>
        </div>
        <button onClick={togglePause} className={`shrink-0 transition-colors ${emailPaused?"text-red-500 hover:text-red-700":"text-gray-300 hover:text-gray-500"}`}>
          {emailPaused?<ToggleRight className="w-8 h-8 text-red-500"/>:<ToggleLeft className="w-8 h-8"/>}
        </button>
      </div>

      {/* Global */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-6 space-y-4">
        <h2 className="text-sm font-bold text-gray-900">Global Settings</h2>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Default sender name</label>
          <input value={fromName} onChange={e=>setFromName(e.target.value)} placeholder="EditBridge" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"/>
          <p className="text-[10px] text-gray-400 mt-1">Shown as "From: {fromName||"EditBridge"} &lt;hello@editbridge.com&gt;"</p>
        </div>
        <div className="flex items-start justify-between">
          <div><p className="text-sm font-semibold text-gray-800">Unsubscribe footer</p><p className="text-xs text-gray-400">Appended to marketing emails and shown in preview.</p></div>
          <button onClick={()=>setFooterOn(v=>!v)} className="p-1.5 rounded-lg hover:bg-gray-100 shrink-0">{footerOn?<ToggleRight className="w-5 h-5 text-emerald-500"/>:<ToggleLeft className="w-5 h-5 text-gray-400"/>}</button>
        </div>
        {footerOn&&<textarea rows={3} value={footerTxt} onChange={e=>setFooterTxt(e.target.value)} placeholder={"You're receiving this because you signed up on EditBridge.\nEditBridge · Mumbai, India\nUnsubscribe: https://editbridge.com/unsubscribe"}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20 resize-y font-mono leading-relaxed"/>}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Broadcast throttle (ms between sends)</label>
          <div className="flex items-center gap-3">
            <input type="number" value={throttleMs} onChange={e=>setThrottleMs(e.target.value)} min="0" max="5000" step="100" className="w-32 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"/>
            <span className="text-xs text-gray-400">0 = no delay · 100 = 10/sec · 1000 = 1/sec</span>
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Frequency cap (min hours between emails to same user)</label>
          <div className="flex items-center gap-3">
            <input type="number" value={freqCapHoursVal} onChange={e=>setFreqCapHoursVal(e.target.value)} min="0" max="720" step="1" className="w-32 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"/>
            <span className="text-xs text-gray-400">0 = no cap · 24 = max 1 email/day · 168 = max 1/week</span>
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Broadcast send window (IST hours, 0–23) <span className="text-[9px] font-normal normal-case text-gray-400">leave blank to allow all hours</span></label>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <input type="number" value={winStart} onChange={e=>setWinStart(e.target.value)} min="0" max="23" placeholder="9" className="w-20 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"/>
              <span className="text-xs text-gray-400">to</span>
              <input type="number" value={winEnd} onChange={e=>setWinEnd(e.target.value)} min="0" max="23" placeholder="18" className="w-20 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"/>
            </div>
            <span className="text-xs text-gray-400">e.g. 9–18 = 9am–6pm IST</span>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={saveGlobals} disabled={saving} className="flex items-center gap-2 bg-gray-900 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-gray-700 disabled:opacity-50">
            <Save className="w-4 h-4"/>{saving?"Saving…":"Save settings"}
          </button>
          <button onClick={exportGlobalsJson} className="flex items-center gap-2 border border-gray-200 text-gray-700 text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
            <Download className="w-4 h-4"/>Export JSON
          </button>
          <button onClick={()=>importJsonRef.current?.click()} disabled={importingJson} className="flex items-center gap-2 border border-gray-200 text-gray-700 text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50">
            <Upload className="w-4 h-4"/>{importingJson?"Importing…":"Import JSON"}
          </button>
          <input ref={importJsonRef} type="file" accept=".json" className="hidden" onChange={importGlobalsJson}/>
        </div>
      </div>

      {/* Webhook health */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-6 space-y-4">
        <div>
          <h2 className="text-sm font-bold text-gray-900">Resend Webhook</h2>
          <p className="text-xs text-gray-400 mt-0.5">Resend fires this URL on hard bounces and spam complaints to auto-suppress addresses.</p>
        </div>
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
          <code className="flex-1 text-xs font-mono text-gray-700 break-all">{typeof window!=="undefined"?window.location.origin:""}/api/webhooks/resend</code>
          <button onClick={()=>{navigator.clipboard.writeText(`${window.location.origin}/api/webhooks/resend`);toast.success("Copied");}} className="shrink-0 text-gray-400 hover:text-gray-700 transition-colors"><Copy className="w-4 h-4"/></button>
        </div>
        <div className="flex items-start gap-2.5 text-xs text-gray-500 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5"/>
          <span>Add this URL in your <strong>Resend Dashboard → Webhooks</strong> and select the <em>email.bounced</em> and <em>email.complained</em> events. Without it, hard bounces won't be auto-suppressed.</span>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">{suppList.length} address{suppList.length!==1?"es":"" } currently suppressed</p>
        </div>
      </div>

      {/* Test layout */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-6 space-y-4">
        <div>
          <h2 className="text-sm font-bold text-gray-900">Test Email Layout</h2>
          <p className="text-xs text-gray-400 mt-0.5">Send a sample email to your inbox to verify the current header/footer layout renders correctly.</p>
        </div>
        <button onClick={sendTestLayout} disabled={testLayoutSending} className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors">
          <Send className="w-4 h-4"/>{testLayoutSending?"Sending…":"Send layout test to my inbox"}
        </button>
        <p className="text-xs text-gray-400">Sends to your admin account email. Save layout settings first before testing.</p>
      </div>

      {/* Email Layout */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-6 space-y-5">
        <div>
          <h2 className="text-sm font-bold text-gray-900">Email Layout</h2>
          <p className="text-xs text-gray-400 mt-0.5">Customise the header and footer that wrap every email sent by the platform.</p>
        </div>

        {/* live mini-preview */}
        <div className="rounded-xl overflow-hidden border border-gray-100">
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-100">
            <Eye className="w-3 h-3 text-gray-400"/><span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Preview</span>
          </div>
          {/* header preview */}
          <div className="flex items-center justify-center px-5 py-3.5" style={{background:headerBg}}>
            {logoImageUrl ? (
              <div className="flex flex-col items-center gap-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logoImageUrl} alt={logoText} style={{height:Number(logoImageHeight)||40,maxHeight:Number(logoImageHeight)||40,display:"block"}} onError={e=>{(e.target as HTMLImageElement).style.display="none";}}/>
                {headerTagline&&<span style={{fontWeight:600,fontSize:10,color:headerTaglineColor,textTransform:"uppercase",letterSpacing:1}}>{headerTagline}</span>}
              </div>
            ) : (
              <div className="flex items-center justify-between w-full">
                <span style={{fontWeight:800,fontSize:16,color:headerTextColor,letterSpacing:-0.3}}>{logoText||"EditBridge"}</span>
                <span style={{fontWeight:600,fontSize:10,color:headerTaglineColor,textTransform:"uppercase",letterSpacing:1}}>{headerTagline}</span>
              </div>
            )}
          </div>
          {/* body stub */}
          <div className="px-5 py-4 bg-white border-x border-gray-200">
            <div className="h-2 w-40 rounded bg-gray-100 mb-2"/>
            <div className="h-2 w-56 rounded bg-gray-100 mb-2"/>
            <div className="h-2 w-32 rounded bg-gray-100"/>
          </div>
          {/* footer preview */}
          <div className="bg-gray-50 border border-gray-200 border-t-0 px-5 py-3 text-center space-y-1">
            <p className="text-[11px] text-gray-500">Questions? <span className="underline text-gray-600">{supportEmail||"support@editbridge.com"}</span></p>
            <p className="text-[10px] text-gray-400">{(websiteUrl||"editbridge.com").replace(/^https?:\/\//,"")} · Help Center · Unsubscribe</p>
            <p className="text-[10px] text-gray-300">{copyright}</p>
          </div>
        </div>

        {/* Header fields */}
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Header</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Logo image URL <span className="text-[10px] font-normal normal-case text-gray-400">— paste your logo link here; leave blank to use text logo below</span></label>
              <div className="flex items-center gap-2">
                <input value={logoImageUrl} onChange={e=>setLogoImageUrl(e.target.value)} placeholder="https://yourdomain.com/logo.png"
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"/>
                <div className="flex items-center gap-1.5 shrink-0">
                  <label className="text-xs text-gray-400 whitespace-nowrap">Height px</label>
                  <input type="number" value={logoImageHeight} onChange={e=>setLogoImageHeight(e.target.value)} min="20" max="120" step="1"
                    className="w-16 border border-gray-200 rounded-xl px-2 py-2.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-gray-900/20"/>
                </div>
                {logoImageUrl&&<button onClick={()=>setLogoImageUrl("")} className="text-gray-300 hover:text-gray-600 shrink-0"><X className="w-4 h-4"/></button>}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Text logo / brand name <span className="text-[10px] font-normal normal-case text-gray-400">fallback when no image set</span></label>
              <input value={logoText} onChange={e=>setLogoText(e.target.value)} placeholder="EditBridge"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Tagline <span className="text-[10px] font-normal normal-case text-gray-400">shown below logo image</span></label>
              <input value={headerTagline} onChange={e=>setHeaderTagline(e.target.value)} placeholder="India's Editing Marketplace"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Header background color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={headerBg} onChange={e=>setHeaderBg(e.target.value)} className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5"/>
                <input value={headerBg} onChange={e=>setHeaderBg(e.target.value)} placeholder="#0f172a"
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gray-900/20"/>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Logo text color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={headerTextColor} onChange={e=>setHeaderTextColor(e.target.value)} className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5"/>
                <input value={headerTextColor} onChange={e=>setHeaderTextColor(e.target.value)} placeholder="#ffffff"
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gray-900/20"/>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Tagline color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={headerTaglineColor} onChange={e=>setHeaderTaglineColor(e.target.value)} className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5"/>
                <input value={headerTaglineColor} onChange={e=>setHeaderTaglineColor(e.target.value)} placeholder="#475569"
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gray-900/20"/>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Accent / button color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={accentColor} onChange={e=>setAccentColor(e.target.value)} className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5"/>
                <input value={accentColor} onChange={e=>setAccentColor(e.target.value)} placeholder="#4f46e5"
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gray-900/20"/>
              </div>
              <p className="text-[10px] text-gray-400 mt-1">Used for CTA buttons in email templates</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Email background color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={bodyBg} onChange={e=>setBodyBg(e.target.value)} className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5"/>
                <input value={bodyBg} onChange={e=>setBodyBg(e.target.value)} placeholder="#f1f5f9"
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gray-900/20"/>
              </div>
              <p className="text-[10px] text-gray-400 mt-1">Outer background color visible around the email card</p>
            </div>
          </div>
        </div>

        {/* Footer fields */}
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Footer</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Support email</label>
              <input value={supportEmail} onChange={e=>setSupportEmail(e.target.value)} placeholder="support@editbridge.com"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Website URL</label>
              <input value={websiteUrl} onChange={e=>setWebsiteUrl(e.target.value)} placeholder="https://editbridge.com"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Help center URL</label>
              <input value={helpUrl} onChange={e=>setHelpUrl(e.target.value)} placeholder="https://editbridge.com/help"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Unsubscribe URL</label>
              <input value={unsubscribeUrl} onChange={e=>setUnsubscribeUrl(e.target.value)} placeholder="https://editbridge.com/unsubscribe"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"/>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Copyright line</label>
              <input value={copyright} onChange={e=>setCopyright(e.target.value)} placeholder="© 2026 EditBridge Technologies Pvt. Ltd."
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"/>
            </div>
          </div>
        </div>

        <button onClick={saveLayout} disabled={savingLayout} className="flex items-center gap-2 bg-gray-900 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-gray-700 disabled:opacity-50">
          <Save className="w-4 h-4"/>{savingLayout?"Saving…":"Save layout"}
        </button>
      </div>

      {/* Custom variables */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-6 space-y-4">
        <div><h2 className="text-sm font-bold text-gray-900">Custom Variables</h2><p className="text-xs text-gray-400 mt-0.5">Define your own {"{{variables}}"} for use in any template.</p></div>
        <div className="grid grid-cols-3 gap-2">
          <input value={newVarKey} onChange={e=>setNewVarKey(e.target.value)} placeholder="{{my_var}}" className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20 font-mono"/>
          <input value={newVarLabel} onChange={e=>setNewVarLabel(e.target.value)} placeholder="Label" className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"/>
          <input value={newVarSample} onChange={e=>setNewVarSample(e.target.value)} placeholder="Sample value" className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"/>
        </div>
        <button onClick={addCustomVar} disabled={savingVars||!newVarKey} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-40">
          <PlusCircle className="w-3.5 h-3.5"/>{savingVars?"Saving…":"Add variable"}
        </button>
        {customVars.length>0&&(
          <div className="space-y-1.5">
            {customVars.map(v=>(
              <div key={v.key} className="flex items-center gap-3 text-xs rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
                <code className="font-mono text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">{v.key}</code>
                <span className="text-gray-500">{v.label}</span>
                <span className="text-gray-400">→ {v.sample}</span>
                <button onClick={()=>removeCustomVar(v.key)} className="ml-auto text-red-400 hover:text-red-600"><Trash2 className="w-3 h-3"/></button>
              </div>
            ))}
          </div>
        )}
        {customVars.length===0&&<p className="text-xs text-gray-400">No custom variables yet.</p>}
      </div>

      {/* Suppression list */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-6 space-y-4">
        <div><h2 className="text-sm font-bold text-gray-900">Suppression List</h2><p className="text-xs text-gray-400 mt-0.5">These emails are excluded from all broadcasts.</p></div>
        <div className="grid grid-cols-2 gap-2">
          <input value={newEmail} onChange={e=>setNewEmail(e.target.value)} placeholder="email@example.com" className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"/>
          <input value={newReason} onChange={e=>setNewReason(e.target.value)} placeholder="Reason (optional)" className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"/>
        </div>
        <button onClick={addSuppression} disabled={addingSupp||!newEmail} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40">
          <Ban className="w-3.5 h-3.5"/>{addingSupp?"Adding…":"Suppress email"}
        </button>
        {suppList.length>0&&(
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none"/>
              <input value={suppSearch} onChange={e=>setSuppSearch(e.target.value)} placeholder="Search suppressed emails…"
                className="w-full pl-9 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"/>
            </div>
          </div>
        )}
        {suppList.length>0&&(
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {suppList.filter(e=>!suppSearch||e.email.toLowerCase().includes(suppSearch.toLowerCase())||(e.reason??"").toLowerCase().includes(suppSearch.toLowerCase())).map(e=>(
              <div key={e.email} className="flex items-center gap-3 text-xs rounded-xl border border-red-50 bg-red-50 px-3 py-2">
                <Ban className="w-3 h-3 text-red-300 shrink-0"/>
                <span className="font-medium text-gray-800">{e.email}</span>
                {e.reason&&<span className="text-gray-400 truncate">{e.reason}</span>}
                <span className="text-gray-300 ml-auto shrink-0">{fmtDate(e.addedAt)}</span>
                <button onClick={()=>removeSuppression(e.email)} className="text-red-400 hover:text-red-600 shrink-0"><X className="w-3 h-3"/></button>
              </div>
            ))}
          </div>
        )}
        {suppList.length===0&&<p className="text-xs text-gray-400">No suppressed emails.</p>}
        {suppList.length>0&&<p className="text-[10px] text-gray-400">{suppList.filter(e=>!suppSearch||e.email.toLowerCase().includes(suppSearch.toLowerCase())||(e.reason??"").toLowerCase().includes(suppSearch.toLowerCase())).length} of {suppList.length} entries</p>}
      </div>

    </div>
  );
}
