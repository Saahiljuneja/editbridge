"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, X } from "lucide-react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

async function registerAndSubscribe(): Promise<PushSubscription | null> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return null;

  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  const existing = await reg.pushManager.getSubscription();
  if (existing) return existing;

  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
  return reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey),
  });
}

export function PushPermissionPrompt() {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [granted, setGranted] = useState(false);

  useEffect(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return;
    // Show prompt if not yet decided
    if (Notification.permission === "default") {
      // Small delay so page loads first
      const t = setTimeout(() => setShow(true), 3000);
      return () => clearTimeout(t);
    }
    if (Notification.permission === "granted") {
      // Silently re-register in case sub expired
      registerAndSubscribe().then(sub => {
        if (sub) sendSubToServer(sub);
      }).catch(() => {});
    }
  }, []);

  async function sendSubToServer(sub: PushSubscription) {
    const json = sub.toJSON();
    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: sub.endpoint, keys: json.keys }),
    }).catch(() => {});
  }

  async function handleAllow() {
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        const sub = await registerAndSubscribe();
        if (sub) await sendSubToServer(sub);
        setGranted(true);
        setTimeout(() => setShow(false), 1500);
      } else {
        setShow(false);
      }
    } catch {
      setShow(false);
    } finally {
      setLoading(false);
    }
  }

  if (!show) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[300] w-[calc(100vw-2rem)] max-w-sm animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-gray-900 rounded-2xl shadow-2xl p-4 flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-[var(--brand-client)] flex items-center justify-center shrink-0 mt-0.5">
          <Bell className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          {granted ? (
            <p className="text-sm font-semibold text-white">Notifications enabled ✓</p>
          ) : (
            <>
              <p className="text-sm font-semibold text-white mb-0.5">Stay in the loop</p>
              <p className="text-xs text-gray-400 mb-3 leading-snug">
                Get instant alerts for new orders, messages, and deliveries — even when you&apos;re not on the site.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleAllow}
                  disabled={loading}
                  className="flex-1 py-2 rounded-xl bg-[var(--brand-client)] hover:bg-[var(--brand-editor-hover)] text-white text-xs font-semibold transition-colors disabled:opacity-60"
                >
                  {loading ? "Enabling…" : "Allow notifications"}
                </button>
                <button
                  onClick={() => setShow(false)}
                  className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 text-xs font-medium transition-colors"
                >
                  Later
                </button>
              </div>
            </>
          )}
        </div>
        <button onClick={() => setShow(false)} className="text-gray-500 hover:text-gray-300 transition-colors mt-0.5 shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
