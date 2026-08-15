export interface Mismatch {
  category: "color" | "typography" | "spacing";
  severity: "high" | "med" | "low";
  expected: string;
  actual: string;
  element?: string;
  description: string;
}

export function generateReport(figmaData: any, domData: any): Mismatch[] {
  // Mock comparison engine for MVP.
  // In a real scenario, this would recursively compare Figma's node tree with DOM styles.
  const mismatches: Mismatch[] = [];

  // If no data, return empty
  if (!figmaData || !domData) return mismatches;

  // Fake mismatch generation to demonstrate the UI
  mismatches.push({
    category: "color",
    severity: "high",
    expected: "var(--color-surface) or #ffffff",
    actual: "rgb(250, 250, 250)",
    element: "Main Background",
    description: "The primary background color deviates significantly from the design system."
  });

  mismatches.push({
    category: "typography",
    severity: "med",
    expected: "16px Inter",
    actual: "15px Arial",
    element: "Body Text",
    description: "Font size and family mismatch on primary body text."
  });

  mismatches.push({
    category: "spacing",
    severity: "low",
    expected: "24px padding",
    actual: "20px padding",
    element: "Card Container",
    description: "Padding is slightly smaller than designed."
  });

  return mismatches;
}
