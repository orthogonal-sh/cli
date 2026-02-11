import { requireApiKey } from "./config.js";

const BASE_URL = "https://api.orth.sh/v1";

interface ApiResponse<T = unknown> {
  success?: boolean;
  data?: T;
  error?: string;
  price?: string;
  // Top-level response fields (some endpoints return data at root)
  results?: unknown[];
  [key: string]: unknown;
}

export async function apiRequest<T = unknown>(
  endpoint: string,
  options: {
    method?: string;
    body?: unknown;
  } = {}
): Promise<T> {
  const apiKey = requireApiKey();
  
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: options.method || "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await res.json() as ApiResponse<T>;
  
  if (!res.ok || data.success === false) {
    throw new Error(data.error || `API error: ${res.status}`);
  }
  
  // Return the whole response, not just data field
  return data as unknown as T;
}

export interface SearchResponse {
  results: Array<{
    name: string;
    slug: string;
    endpoints: Array<{
      path: string;
      method: string;
      description: string;
      price?: number;
    }>;
  }>;
  count: number;
  apisCount: number;
}

export interface DetailsResponse {
  api: string;
  path: string;
  method: string;
  description: string;
  price?: number;
  parameters?: {
    query?: Array<{ name: string; type: string; required: boolean; description?: string }>;
    body?: Array<{ name: string; type: string; required: boolean; description?: string }>;
  };
}

export interface RunResponse {
  success: boolean;
  data: unknown;
  price?: string;
  priceCents?: number;
  requestId?: string;
}

export interface IntegrateResponse {
  api: string;
  path: string;
  snippets: Record<string, string>;
}

export async function search(prompt: string, limit = 10): Promise<SearchResponse> {
  return apiRequest<SearchResponse>("/search", {
    method: "POST",
    body: { prompt, limit },
  });
}

export async function getDetails(api: string, path: string): Promise<DetailsResponse> {
  return apiRequest<DetailsResponse>("/details", {
    method: "POST",
    body: { api, path },
  });
}

export async function run(
  api: string,
  path: string,
  options: {
    method?: string;
    query?: Record<string, string>;
    body?: unknown;
  } = {}
): Promise<RunResponse> {
  return apiRequest<RunResponse>("/run", {
    method: "POST",
    body: {
      api,
      path,
      method: options.method || "GET",
      query: options.query,
      body: options.body,
    },
  });
}

export async function integrate(api: string, path: string, format = "orth-sdk"): Promise<IntegrateResponse> {
  return apiRequest<IntegrateResponse>("/integrate", {
    method: "POST",
    body: { api, path, format },
  });
}
