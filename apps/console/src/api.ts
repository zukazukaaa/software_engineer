import type { OmegaOutput } from '@omega/core';

export interface ReasonRequest {
  query: string;
  domain: string;
  layers?: Record<string, unknown>;
  nexus?: Record<string, unknown>;
}

export const reason = async (req: ReasonRequest): Promise<OmegaOutput> => {
  const res = await fetch('/api/omega/reason', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error(`reason failed: ${res.status}`);
  return (await res.json()) as OmegaOutput;
};

export const listDomains = async (): Promise<Array<{ name: string; version: string }>> => {
  const res = await fetch('/api/domains');
  if (!res.ok) throw new Error(`domains failed: ${res.status}`);
  return res.json();
};
