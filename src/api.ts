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
    // Include more details in error message
    let errorMsg = data.error || `API request failed with status ${res.status}`;
    
    // Add any additional error details from the response
    if ((data as any).message) {
      errorMsg += `: ${(data as any).message}`;
    }
    if ((data as any).data?.error) {
      errorMsg += ` - ${(data as any).data.error}`;
      if ((data as any).data?.message) {
        errorMsg += `: ${(data as any).data.message}`;
      }
    }
    // Handle Hunter-style errors array
    if ((data as any).data?.errors && Array.isArray((data as any).data.errors)) {
      const errors = (data as any).data.errors;
      for (const err of errors) {
        if (err.details) {
          errorMsg += `\n  → ${err.details}`;
        } else if (err.id) {
          errorMsg += `\n  → ${err.id}: ${err.code || ''}`;
        }
      }
    }
    if ((data as any).details) {
      errorMsg += `\n  Details: ${JSON.stringify((data as any).details)}`;
    }
    
    throw new Error(errorMsg);
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
  api?: string | { name: string; slug: string; description?: string };
  path?: string;
  method?: string;
  description?: string;
  price?: number | string;
  parameters?: {
    query?: Array<{ name: string; type: string; required: boolean; description?: string }>;
    body?: Array<{ name: string; type: string; required: boolean; description?: string }>;
  };
  endpoint?: {
    path: string;
    method: string;
    description?: string;
    price?: number | string;
    queryParams?: Array<{ name: string; type: string; required: boolean; description?: string }>;
    bodyParams?: Array<{ name: string; type: string; required: boolean; description?: string }>;
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
