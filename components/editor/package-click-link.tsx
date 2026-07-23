"use client";

import Link from "next/link";

interface Props {
  href: string;
  packageId: string;
  className?: string;
  children: React.ReactNode;
}

// Fires a fire-and-forget click beacon before the browser navigates away.
// keepalive lets the request survive the page unload that follows immediately.
export function PackageClickLink({ href, packageId, className, children }: Props) {
  function handleClick() {
    fetch("/api/editor/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventType: "package_click", entityId: packageId }),
      keepalive: true,
    }).catch(() => {});
  }

  return (
    <Link href={href} className={className} onClick={handleClick}>
      {children}
    </Link>
  );
}
