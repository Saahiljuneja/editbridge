import dns from "dns";
import https from "https";
import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// On some networks (e.g. mobile hotspots) the local DNS server refuses to
// resolve *.neon.tech. We bypass the OS resolver by using https.request()
// with a custom lookup function that queries Google Public DNS directly.
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

function googleDnsLookup(
  hostname: string,
  _opts: dns.LookupOptions,
  callback: (err: NodeJS.ErrnoException | null, addr: string, family: number) => void
) {
  dns.resolve4(hostname, (err, addrs) => {
    if (!err && addrs?.length) {
      callback(null, addrs[0], 4);
    } else {
      dns.lookup(hostname, { family: 4 }, callback);
    }
  });
}

neonConfig.fetch = async function customFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const urlStr = typeof input === "string" ? input : input.toString();
  const url = new URL(urlStr);

  const headers: Record<string, string> = {};
  if (init?.headers) {
    new Headers(init.headers).forEach((v, k) => {
      headers[k] = v;
    });
  }

  return new Promise<Response>((resolve, reject) => {
    const req = https.request(
      {
        method: (init?.method as string) || "POST",
        hostname: url.hostname,
        port: 443,
        path: url.pathname + url.search,
        headers,
        lookup: googleDnsLookup,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => {
          const body = Buffer.concat(chunks);
          const responseHeaders: Record<string, string> = {};
          for (const [k, v] of Object.entries(res.headers)) {
            if (typeof v === "string") responseHeaders[k] = v;
            else if (Array.isArray(v)) responseHeaders[k] = v.join(", ");
          }
          resolve(
            new Response(body, {
              status: res.statusCode ?? 200,
              headers: new Headers(responseHeaders),
            })
          );
        });
        res.on("error", reject);
      }
    );

    req.on("error", reject);

    if (init?.body) {
      const b = init.body;
      if (typeof b === "string") req.write(b);
      else if (b instanceof ArrayBuffer) req.write(Buffer.from(b));
      else if (b instanceof Uint8Array) req.write(Buffer.from(b));
    }

    req.end();
  });
};

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
