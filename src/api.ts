import { requireApiKey } from "./config.js";

const BASE_URL = process.env.ORTH_API_URL || "https://api.orthogonal.com/v1";

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
  } = {},
): Promise<T> {
  const apiKey = requireApiKey();

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: options.method || "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "x-orthogonal-source": "cli",
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  // Parse defensively: error responses (e.g. a bare 404) may return an empty
  // or non-JSON body, which would otherwise throw here and lose the status.
  const rawBody = await res.text();
  let data: ApiResponse<T>;
  let bodyParsed = false;
  try {
    data = (rawBody ? JSON.parse(rawBody) : {}) as ApiResponse<T>;
    bodyParsed = rawBody.length > 0;
  } catch {
    data = {} as ApiResponse<T>;
  }

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
    if (
      (data as any).data?.errors &&
      Array.isArray((data as any).data.errors)
    ) {
      const errors = (data as any).data.errors;
      for (const err of errors) {
        if (err.details) {
          errorMsg += `\n  → ${err.details}`;
        } else if (err.id) {
          errorMsg += `\n  → ${err.id}: ${err.code || ""}`;
        }
      }
    }
    if ((data as any).details) {
      errorMsg += `\n  Details: ${JSON.stringify((data as any).details)}`;
    }

    // Attach the HTTP status so callers can branch on it reliably instead of
    // string-matching the message (e.g. whoami treating 404 as "no /me").
    const err = new Error(errorMsg) as Error & {
      status?: number;
      orthogonal?: unknown;
      responseBody?: unknown;
    };
    err.status = res.status;
    // Surface the self-correction hint the API attaches on contract violations
    // (missing/out-of-range params, upstream 4xx). Without this the run command
    // only sees `error.message` and the expected-schema diagnostics are lost.
    if ((data as any)._orthogonal) {
      err.orthogonal = (data as any)._orthogonal;
    }
    // Keep the full parsed error body too, so callers can render structured
    // diagnostics (missing / out_of_range) and emit machine-readable JSON.
    // Only when the body actually parsed as JSON — otherwise a non-JSON body
    // would surface as `{}` and mask the real error message.
    if (bodyParsed) {
      err.responseBody = data;
    }
    throw err;
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
      hasDynamicPricing?: boolean;
      pricing_formula?: string;
      // Set when this endpoint belongs to a group member whose upstream path
      // collides with siblings (e.g. AbstractAPI's many products all on "/v1").
      // The callable identifier for that specific member, e.g. "abstractapi/avatars" —
      // distinct from the card's flat `slug` above.
      apiSlug?: string;
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
  hasDynamicPricing?: boolean;
  pricing_formula?: string;
  parameters?: {
    query?: Array<{
      name: string;
      type: string;
      required: boolean;
      description?: string;
    }>;
    body?: Array<{
      name: string;
      type: string;
      required: boolean;
      description?: string;
    }>;
  };
  endpoint?: {
    path: string;
    method: string;
    description?: string;
    price?: number | string;
    queryParams?: Array<{
      name: string;
      type: string;
      required: boolean;
      description?: string;
    }>;
    bodyParams?: Array<{
      name: string;
      type: string;
      required: boolean;
      description?: string;
    }>;
  };
  action?: {
    description?: string;
    parameters?: Array<{
      name: string;
      type: string;
      required: boolean;
      description?: string;
    }>;
  };
}

export interface RunResponse {
  success: boolean;
  data: unknown;
  price?: string;
  priceCents?: number;
  requestId?: string;
  dryRun?: boolean;
  estimatedPrice?: string;
  estimatedPriceCents?: number;
}

export interface IntegrateResponse {
  api: string;
  path: string;
  snippets: Record<string, string>;
}

export interface ListApisResponse {
  success: boolean;
  apis: Array<{
    name: string;
    slug: string;
    description?: string;
    baseUrl: string;
    verified: boolean;
    endpoints: Array<{
      path: string;
      method: string;
      description?: string;
      price?: number;
      isPayable?: boolean;
    }>;
  }>;
  count: number;
  hasMore: boolean;
}

export async function listApis(limit = 100, offset = 0): Promise<ListApisResponse> {
  return apiRequest<ListApisResponse>(`/list-endpoints?limit=${limit}&offset=${offset}`);
}

export async function search(
  prompt: string,
  limit = 10,
): Promise<SearchResponse> {
  return apiRequest<SearchResponse>("/search", {
    method: "POST",
    body: { prompt, limit },
  });
}

export interface ApiBySlugResponse {
  success: boolean;
  api: {
    name: string;
    slug: string;
    description?: string;
    baseUrl: string;
    verified: boolean;
  };
  endpoints: Array<{
    id: string;
    path: string;
    method: string;
    description?: string;
    price?: number;
    isPayable?: boolean;
    hasDynamicPricing?: boolean;
    pricing_formula?: string;
    docsUrl?: string;
    queryParams?: Array<{ name: string; type: string; required: boolean; description?: string }>;
    bodyParams?: Array<{ name: string; type: string; required: boolean; description?: string }>;
    // Set when `slug` resolved to a group: the callable identifier for the
    // specific member that owns this endpoint (e.g. "abstractapi/avatars"),
    // needed because group members commonly collide on the same upstream path.
    apiSlug?: string;
  }>;
  count: number;
}

export async function getApiBySlug(slug: string): Promise<ApiBySlugResponse> {
  return apiRequest<ApiBySlugResponse>(`/api-directory/${encodeURIComponent(slug)}`);
}

export async function getDetails(
  api: string,
  path: string,
): Promise<DetailsResponse> {
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
    dryRun?: boolean;
  } = {},
): Promise<RunResponse> {
  return apiRequest<RunResponse>("/run", {
    method: "POST",
    body: {
      api,
      path,
      method: options.method || "GET",
      query: options.query,
      body: options.body,
      dryRun: options.dryRun,
    },
  });
}


export async function integrate(
  api: string,
  path: string,
  format = "orth-sdk",
): Promise<IntegrateResponse> {
  return apiRequest<IntegrateResponse>("/integrate", {
    method: "POST",
    body: { api, path, format },
  });
}

export interface MeResponse {
  type: "user" | "organization";
  name?: string | null;
  email?: string | null;
  organizationId?: string;
  apiKeyName?: string;
}

export async function getMe(): Promise<MeResponse> {
  return apiRequest<MeResponse>("/me");
}
