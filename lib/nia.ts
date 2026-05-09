const NIA_BASE = "https://apigcp.trynia.ai/v2";

export interface NiaSearchResult {
  contextId: string;
  content: string;
  score: number;
  metadata: Record<string, unknown>;
  sourcePath?: string;
  sourceSection?: string;
}

function authHeaders(): HeadersInit {
  return {
    Authorization: `Bearer ${process.env.NIA_API_KEY}`,
    "Content-Type": "application/json",
  };
}

export async function indexDocument(
  content: string,
  metadata: Record<string, unknown>
): Promise<{ contextId: string }> {
  const res = await fetch(`${NIA_BASE}/contexts`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ content, metadata }),
  });
  if (!res.ok) {
    throw new Error(`Nia index failed [${res.status}]: ${await res.text()}`);
  }
  return res.json();
}

export async function searchContext(
  query: string,
  filters?: Record<string, unknown>
): Promise<NiaSearchResult[]> {
  const params = new URLSearchParams({ query });
  if (filters) params.set("filters", JSON.stringify(filters));

  const res = await fetch(`${NIA_BASE}/contexts/search?${params}`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Nia search failed [${res.status}]: ${await res.text()}`);
  }
  const data = await res.json();
  return (data.results ?? data ?? []) as NiaSearchResult[];
}
