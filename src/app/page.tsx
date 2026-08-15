"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Link as LinkIcon, MonitorSmartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ConnectScreen() {
  const router = useRouter();
  const [figmaUrl, setFigmaUrl] = useState("");
  const [liveUrl, setLiveUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!figmaUrl || !liveUrl) return;
    
    setIsLoading(true);
    // In a real implementation, we might validate the URLs here
    // before pushing to the comparison screen.
    const searchParams = new URLSearchParams({
      figma: figmaUrl,
      live: liveUrl,
    });
    
    router.push(`/compare?${searchParams.toString()}`);
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-4 bg-muted/30">
      <div className="w-full max-w-xl space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Drift</h1>
          <p className="text-muted-foreground text-lg">
            Catch the drift between design and code.
          </p>
        </div>

        <Card className="rounded-none border-2 shadow-none">
          <CardHeader>
            <CardTitle>Connect Sources</CardTitle>
            <CardDescription>
              Provide your Figma design and the live implementation URL to begin the fidelity check.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="figma-url" className="text-sm font-medium flex items-center gap-2">
                    <LinkIcon className="w-4 h-4" />
                    Figma Frame URL
                  </label>
                  <Input
                    id="figma-url"
                    placeholder="https://www.figma.com/file/..."
                    value={figmaUrl}
                    onChange={(e) => setFigmaUrl(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Link to a specific frame or component for best results.
                  </p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="live-url" className="text-sm font-medium flex items-center gap-2">
                    <MonitorSmartphone className="w-4 h-4" />
                    Live URL
                  </label>
                  <Input
                    id="live-url"
                    type="url"
                    placeholder="http://localhost:3000 or https://..."
                    value={liveUrl}
                    onChange={(e) => setLiveUrl(e.target.value)}
                    required
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full text-base font-semibold h-12"
                disabled={isLoading || !figmaUrl || !liveUrl}
              >
                {isLoading ? "Connecting..." : "Run Fidelity Check"}
                {!isLoading && <ArrowRight className="w-4 h-4 ml-2" />}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
