"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Layers, SplitSquareHorizontal, Download } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { generateReport, Mismatch } from "@/lib/compare";

function CompareContent() {
  const searchParams = useSearchParams();
  const figmaUrl = searchParams.get("figma") || "";
  const liveUrl = searchParams.get("live") || "";

  const [viewMode, setViewMode] = useState<"side-by-side" | "overlay">("side-by-side");
  const [report, setReport] = useState<Mismatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function runFidelityCheck() {
      try {
        const [figmaRes, scrapeRes] = await Promise.all([
          fetch(`/api/figma?url=${encodeURIComponent(figmaUrl)}`),
          fetch(`/api/scrape?url=${encodeURIComponent(liveUrl)}`)
        ]);

        const figmaData = await figmaRes.json();
        const scrapeData = await scrapeRes.json();

        if (!figmaData.success && !figmaData.error?.includes("token")) {
           console.warn("Figma API error:", figmaData.error);
        }

        const mismatches = generateReport(figmaData, scrapeData);
        setReport(mismatches);
      } catch (e: any) {
        setError(e.message || "An error occurred during comparison.");
      } finally {
        setIsLoading(false);
      }
    }

    if (figmaUrl && liveUrl) {
      runFidelityCheck();
    } else {
      setIsLoading(false);
      setError("Missing URLs for comparison.");
    }
  }, [figmaUrl, liveUrl]);

  const encodedFigmaUrl = encodeURIComponent(figmaUrl);
  const figmaEmbed = `https://www.figma.com/embed?embed_host=drift&url=${encodedFigmaUrl}`;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border p-4 flex items-center justify-between bg-surface z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/"><ArrowLeft className="w-4 h-4 mr-2" /> Back</Link>
          </Button>
          <h1 className="font-semibold">Fidelity Check</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-muted p-1 border border-border">
            <Button
              variant={viewMode === "side-by-side" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("side-by-side")}
            >
              <SplitSquareHorizontal className="w-4 h-4 mr-2" /> Side-by-Side
            </Button>
            <Button
              variant={viewMode === "overlay" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("overlay")}
            >
              <Layers className="w-4 h-4 mr-2" /> Overlay
            </Button>
          </div>
          <Button size="sm" asChild>
            <Link href={`/export?figma=${encodeURIComponent(figmaUrl)}&live=${encodeURIComponent(liveUrl)}`}>
              <Download className="w-4 h-4 mr-2" /> Export Report
            </Link>
          </Button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Workspace Area */}
        <div className="flex-1 bg-muted/30 p-4 overflow-auto">
          {viewMode === "side-by-side" ? (
            <div className="flex h-full gap-4">
              <div className="flex-1 border border-border bg-surface flex flex-col">
                <div className="p-2 border-b border-border text-xs font-mono text-muted-foreground flex justify-between">
                  <span>Figma Design</span>
                </div>
                <iframe src={figmaEmbed} className="w-full flex-1" allowFullScreen />
              </div>
              <div className="flex-1 border border-border bg-surface flex flex-col">
                <div className="p-2 border-b border-border text-xs font-mono text-muted-foreground flex justify-between">
                  <span>Live Implementation</span>
                </div>
                <iframe src={liveUrl} className="w-full flex-1" />
              </div>
            </div>
          ) : (
            <div className="relative h-full border border-border bg-surface overflow-hidden">
              <div className="absolute top-2 left-2 z-10 bg-background/80 backdrop-blur border border-border px-3 py-1 text-xs font-mono">
                Overlay Mode (Design ghosted over Code)
              </div>
              <iframe src={liveUrl} className="absolute inset-0 w-full h-full" />
              <iframe 
                src={figmaEmbed} 
                className="absolute inset-0 w-full h-full opacity-50 pointer-events-none mix-blend-difference" 
                allowFullScreen 
              />
            </div>
          )}
        </div>

        {/* Report Sidebar */}
        <div className="w-[400px] border-l border-border bg-surface flex flex-col overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold text-lg">Drift Report</h2>
            <p className="text-sm text-muted-foreground">Automatically detected mismatches</p>
          </div>
          <div className="flex-1 overflow-auto p-4 space-y-4">
            {isLoading ? (
              <div className="animate-pulse space-y-4">
                {[1,2,3].map(i => (
                  <div key={i} className="h-24 bg-muted border border-border" />
                ))}
              </div>
            ) : error ? (
              <div className="p-4 border border-severity-high bg-severity-high/10 text-severity-high text-sm">
                {error}
              </div>
            ) : report.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground border border-dashed border-border">
                No drifts detected! Perfect match.
              </div>
            ) : (
              report.map((mismatch, idx) => (
                <Card key={idx} className="rounded-none shadow-none">
                  <CardHeader className="p-4 pb-2">
                    <div className="flex justify-between items-start">
                      <div className="flex gap-2 items-center">
                        <span className={`w-2 h-2 rounded-full ${
                          mismatch.severity === 'high' ? 'bg-severity-high' :
                          mismatch.severity === 'med' ? 'bg-severity-med' : 'bg-severity-low'
                        }`} />
                        <CardTitle className="text-sm">{mismatch.element}</CardTitle>
                      </div>
                      <span className="text-xs uppercase font-mono bg-muted px-1 py-0.5 border border-border text-muted-foreground">
                        {mismatch.category}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 space-y-2">
                    <p className="text-sm text-foreground">{mismatch.description}</p>
                    <div className="text-xs font-mono grid grid-cols-2 gap-2 mt-2 p-2 bg-muted border border-border">
                      <div>
                        <div className="text-muted-foreground mb-1">Expected</div>
                        <div className="text-severity-low">{mismatch.expected}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground mb-1">Actual</div>
                        <div className="text-severity-high">{mismatch.actual}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function CompareScreen() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading comparison...</div>}>
      <CompareContent />
    </Suspense>
  );
}
