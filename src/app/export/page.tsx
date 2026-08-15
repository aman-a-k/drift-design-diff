"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { generateReport, Mismatch } from "@/lib/compare";

function ExportContent() {
  const searchParams = useSearchParams();
  const figmaUrl = searchParams.get("figma") || "";
  const liveUrl = searchParams.get("live") || "";
  const [report, setReport] = useState<Mismatch[]>([]);

  useEffect(() => {
    setReport(generateReport({}, {})); 
  }, []);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-surface p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex justify-between items-center print:hidden">
          <Button variant="outline" asChild>
            <Link href={`/compare?figma=${encodeURIComponent(figmaUrl)}&live=${encodeURIComponent(liveUrl)}`}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Compare
            </Link>
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" /> Print Checklist
          </Button>
        </div>

        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Fidelity Drift Checklist</h1>
            <p className="text-muted-foreground mt-2">
              Generated for developers to fix UI mismatches between design and implementation.
            </p>
          </div>
          
          <div className="text-sm font-mono bg-muted p-4 border border-border">
            <div className="mb-2"><span className="text-muted-foreground">Figma:</span> {figmaUrl || 'N/A'}</div>
            <div><span className="text-muted-foreground">Live:</span> {liveUrl || 'N/A'}</div>
          </div>

          <div className="space-y-4 pt-4">
            {report.map((item, idx) => (
              <div key={idx} className="flex gap-4 items-start border-b border-border pb-4 last:border-0">
                <div className="mt-1 w-5 h-5 rounded border border-border bg-background flex-shrink-0 print:border-black" />
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 text-xs uppercase font-semibold ${
                      item.severity === 'high' ? 'bg-severity-high/20 text-severity-high' :
                      item.severity === 'med' ? 'bg-severity-med/20 text-severity-med' :
                      'bg-severity-low/20 text-severity-low'
                    }`}>
                      {item.severity} severity
                    </span>
                    <span className="font-medium text-lg">{item.element}</span>
                  </div>
                  <p className="text-foreground">{item.description}</p>
                  <div className="text-sm font-mono mt-2 grid grid-cols-2 gap-4 text-muted-foreground">
                    <div><span className="font-semibold text-foreground">Expected:</span> {item.expected}</div>
                    <div><span className="font-semibold text-foreground">Actual:</span> {item.actual}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ExportScreen() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-surface p-8">Loading checklist...</div>}>
      <ExportContent />
    </Suspense>
  );
}
