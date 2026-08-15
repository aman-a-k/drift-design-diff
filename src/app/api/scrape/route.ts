import { NextResponse } from "next/server";

export const maxDuration = 60; // Allow more time on Vercel Pro if available

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get("url");

  if (!targetUrl) {
    return NextResponse.json({ error: "Missing target URL" }, { status: 400 });
  }

  let browser;
  try {
    const isLocal = !!process.env.NEXT_PUBLIC_IS_LOCAL || process.env.NODE_ENV === "development";

    if (isLocal) {
      // Use standard playwright for local development
      const { chromium } = require("playwright");
      browser = await chromium.launch({
        headless: true,
      });
    } else {
      // Use playwright-core and sparticuz for Vercel serverless deployment
      const { chromium: playwrightCore } = require("playwright-core");
      const sparticuz = require("@sparticuz/chromium-min");
      
      const executablePath = await sparticuz.executablePath(
        "https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar"
      );

      browser = await playwrightCore.launch({
        args: sparticuz.args,
        executablePath: executablePath,
        headless: sparticuz.headless,
      });
    }
    
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 }
    });
    const page = await context.newPage();
    
    await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 30000 });

    // Extract computed styles for a set of nodes
    const computedStyles = await page.evaluate(() => {
      const results: any[] = [];
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

  } catch (error: any) {
    if (browser) await browser.close();
    console.error("Playwright error:", error);
    return NextResponse.json({ error: error.message || "Failed to scrape live site" }, { status: 500 });
  }
}
