import { NextResponse } from "next/server";
import { isIP } from "net";
import { lookup } from "dns/promises";

export const maxDuration = 60; // Allow more time on Vercel Pro if available

interface ScrapedElement {
  tagName: string;
  id: string;
  className: string;
  rect: { width: number; height: number; top: number; left: number };
  styles: {
    backgroundColor: string;
    color: string;
    fontSize: string;
    fontFamily: string;
    fontWeight: string;
    padding: string;
    margin: string;
    borderRadius: string;
    display: string;
  };
}

// This endpoint takes a user-supplied URL and has a real, server-side
// headless browser navigate to it — without a check, anyone hitting the
// deployed endpoint could use it as an SSRF proxy against internal
// services or cloud metadata endpoints (e.g. 169.254.169.254). Resolve
// the hostname and reject loopback/private/link-local targets.
function isPrivateOrReservedIp(ip: string): boolean {
  if (isIP(ip) === 4) {
    const parts = ip.split(".").map(Number);
    const [a, b] = parts;
    return (
      a === 127 || // loopback
      a === 10 || // private
      (a === 172 && b >= 16 && b <= 31) || // private
      (a === 192 && b === 168) || // private
      (a === 169 && b === 254) || // link-local, incl. cloud metadata
      a === 0
    );
  }
  if (isIP(ip) === 6) {
    const lower = ip.toLowerCase();
    if (lower === "::1" || lower === "::") return true; // loopback / unspecified
    if (lower.startsWith("fe80:")) return true; // link-local
    if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // unique local (fc00::/7)
    if (lower.startsWith("::ffff:")) {
      const v4 = lower.split(":").pop()!;
      return isIP(v4) === 4 ? isPrivateOrReservedIp(v4) : true;
    }
    return false;
  }
  return true; // not a resolvable IP literal — block to be safe
}

async function assertPublicHttpUrl(target: string): Promise<void> {
  let url: URL;
  try {
    url = new URL(target);
  } catch {
    throw new Error("Invalid target URL");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only http/https URLs are allowed");
  }

  const hostname = url.hostname.toLowerCase();
  if (hostname === "localhost" || hostname === "0.0.0.0" || hostname.endsWith(".localhost")) {
    throw new Error("Requests to localhost are not allowed");
  }

  const addresses = isIP(hostname)
    ? [hostname]
    : (await lookup(hostname, { all: true })).map((a) => a.address);

  if (addresses.length === 0 || addresses.some(isPrivateOrReservedIp)) {
    throw new Error("Requests to private or internal network addresses are not allowed");
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get("url");

  if (!targetUrl) {
    return NextResponse.json({ error: "Missing target URL" }, { status: 400 });
  }

  const isLocal = !!process.env.NEXT_PUBLIC_IS_LOCAL || process.env.NODE_ENV === "development";

  // Only enforce the SSRF guard against the deployed/public endpoint —
  // local dev intentionally targets a localhost implementation URL.
  if (!isLocal) {
    try {
      await assertPublicHttpUrl(targetUrl);
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Invalid target URL" },
        { status: 400 }
      );
    }
  }

  let browser;
  try {
    if (isLocal) {
      // Use standard playwright for local development
      const { chromium } = await import("playwright");
      browser = await chromium.launch({
        headless: true,
      });
    } else {
      // Use playwright-core and sparticuz for Vercel serverless deployment.
      // @sparticuz/chromium-min ships as ESM-only ("type": "module"), so it
      // must be loaded with a dynamic import — require() throws ERR_REQUIRE_ESM.
      const { chromium: playwrightCore } = await import("playwright-core");
      const sparticuz = (await import("@sparticuz/chromium-min")).default;

      const executablePath = await sparticuz.executablePath(
        "https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar"
      );

      browser = await playwrightCore.launch({
        args: sparticuz.args,
        executablePath: executablePath,
        headless: true,
      });
    }
    
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 }
    });
    const page = await context.newPage();
    
    await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 30000 });

    // Extract computed styles for a set of nodes
    const computedStyles = await page.evaluate(() => {
      const results: ScrapedElement[] = [];
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_ELEMENT,
        null
      );

      let node;
      let count = 0;
      // limit to 50 nodes for this simple MVP to avoid massive payloads
      while ((node = walker.nextNode()) && count < 50) {
        const el = node as HTMLElement;
        // Ignore scripts, styles, etc.
        if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(el.tagName)) continue;
        
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        
        if (rect.width === 0 || rect.height === 0) continue;

        results.push({
          tagName: el.tagName,
          id: el.id,
          className: el.className,
          rect: {
            width: rect.width,
            height: rect.height,
            top: rect.top,
            left: rect.left,
          },
          styles: {
            backgroundColor: style.backgroundColor,
            color: style.color,
            fontSize: style.fontSize,
            fontFamily: style.fontFamily,
            fontWeight: style.fontWeight,
            padding: style.padding,
            margin: style.margin,
            borderRadius: style.borderRadius,
            display: style.display,
          }
        });
        count++;
      }
      return results;
    });

    await browser.close();

    return NextResponse.json({
      success: true,
      url: targetUrl,
      elements: computedStyles
    });

  } catch (error) {
    if (browser) await browser.close();
    console.error("Playwright error:", error);
    const message = error instanceof Error ? error.message : "Failed to scrape live site";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
