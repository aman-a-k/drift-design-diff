import { NextResponse } from "next/server";
import { chromium } from "playwright";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get("url");

  if (!targetUrl) {
    return NextResponse.json({ error: "Missing target URL" }, { status: 400 });
  }

  try {
    const browser = await chromium.launch({
      headless: true,
      // For Vercel/serverless environments, this might fail without playwright-core and external browser.
      // But for local MVP, this standard launch is fine.
    });
    
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 }
    });
    const page = await context.newPage();
    
    await page.goto(targetUrl, { waitUntil: 'networkidle' });

    // Extract computed styles for a set of nodes
    // In a real app we'd map Figma layers to DOM nodes (e.g. via attributes or AI).
    // For the MVP, we just scrape the structure of the body or main element.
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
    console.error("Playwright error:", error);
    return NextResponse.json({ error: error.message || "Failed to scrape live site" }, { status: 500 });
  }
}
