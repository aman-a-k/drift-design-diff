import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const figmaUrl = searchParams.get("url");

  if (!figmaUrl) {
    return NextResponse.json({ error: "Missing Figma URL" }, { status: 400 });
  }

  // Parse Figma URL to extract File ID and Node ID
  // Example: https://www.figma.com/file/FILE_ID/Name?node-id=NODE_ID
  let fileId = "";
  let nodeId = "";

  try {
    const urlObj = new URL(figmaUrl);
    const pathParts = urlObj.pathname.split("/");
    const fileIndex = pathParts.findIndex(p => p === "file" || p === "design");
    if (fileIndex !== -1 && pathParts.length > fileIndex + 1) {
      fileId = pathParts[fileIndex + 1];
    }
    // Figma URLs encode the node id with hyphens (e.g. "123-456"), but the
    // REST API's `ids` param and the `nodes` response object both key on
    // colons ("123:456") — convert so lookups below actually match.
    const rawNodeId = urlObj.searchParams.get("node-id") || "";
    nodeId = rawNodeId.replace(/-/g, ":");
  } catch (e) {
    return NextResponse.json({ error: "Invalid Figma URL format" }, { status: 400 });
  }

  if (!fileId) {
    return NextResponse.json({ error: "Could not extract File ID" }, { status: 400 });
  }

  const FIGMA_TOKEN = process.env.FIGMA_TOKEN;
  if (!FIGMA_TOKEN) {
    return NextResponse.json({ error: "Figma token not configured on server" }, { status: 500 });
  }

  try {
    // Fetch file/node data from Figma API
    const apiUrl = nodeId 
      ? `https://api.figma.com/v1/files/${fileId}/nodes?ids=${nodeId}`
      : `https://api.figma.com/v1/files/${fileId}`;

    const res = await fetch(apiUrl, {
      headers: {
        "X-Figma-Token": FIGMA_TOKEN
      }
    });

    if (!res.ok) {
      throw new Error(`Figma API returned ${res.status}`);
    }

    const data = await res.json();

    // For MVP, we will try to extract a flattened tree of visual properties (width, height, color, typography)
    // The engine will do the actual parsing later, just return the raw data for now.

    if (nodeId && !data.nodes?.[nodeId]) {
      return NextResponse.json({ error: `Node ${nodeId} not found in Figma file` }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      fileId,
      nodeId,
      data: nodeId ? data.nodes[nodeId].document : data.document
    });

  } catch (error: any) {
    console.error("Figma API error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch Figma data" }, { status: 500 });
  }
}
