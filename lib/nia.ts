const NIA_BASE = "https://apigcp.trynia.ai/v2";

export interface NiaSearchResult {
  relevance_score?: number;
  highlight?: string;
  source?: string;
  content?: string;
  title?: string;
  summary?: string;
}

function authHeaders(): HeadersInit {
  return {
    Authorization: `Bearer ${process.env.NIA_API_KEY}`,
    "Content-Type": "application/json",
  };
}

export async function indexDocument(
  title: string,
  summary: string,
  content: string,
  tags: string[] = []
): Promise<{ id: string }> {
  const res = await fetch(`${NIA_BASE}/contexts`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      title,
      summary,
      content,
      agent_source: "sentinelops",
      tags,
      memory_type: "procedural",
    }),
  });
  if (!res.ok) {
    throw new Error(`Nia index failed [${res.status}]: ${await res.text()}`);
  }
  return res.json();
}

export async function searchContext(
  query: string,
  limit = 3
): Promise<NiaSearchResult[]> {
  const params = new URLSearchParams({ q: query, limit: String(limit) });

  const res = await fetch(`${NIA_BASE}/contexts/semantic-search?${params}`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Nia search failed [${res.status}]: ${await res.text()}`);
  }
  const data = await res.json();
  return (data.results ?? []) as NiaSearchResult[];
}
