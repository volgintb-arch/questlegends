// API Client Configuration

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

async function getAuthToken(): Promise<string | null> {
  if (typeof window === "undefined") return null
  return localStorage.getItem("auth_token")
}

async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `/api${endpoint}`
  const token = await getAuthToken()

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  const response = await fetch(url, {
    ...options,
    headers,
  })

  const contentType = response.headers.get("content-type")
  if (!contentType || !contentType.includes("application/json")) {
    throw new ApiError("INVALID_RESPONSE", `Expected JSON response but got ${contentType}`, { status: response.status })
  }

  const data = await response.json()

  if (!response.ok) {
    throw new ApiError(
      data.error?.code || data.error || "UNKNOWN_ERROR",
      data.error?.message || data.message || "An error occurred",
      data.error?.details,
    )
  }

  return data.data !== undefined ? data.data : data
}

export const api = {
  get: <T,>(endpoint: string, options?: RequestInit) => fetchApi<T>(endpoint, { ...options, method: "GET" }),

  post: <T,>(endpoint: string, body?: unknown, options?: RequestInit) =>
    fetchApi<T>(endpoint, {
      ...options,
      method: "POST",
      body: JSON.stringify(body),
    }),

  put: <T,>(endpoint: string, body?: unknown, options?: RequestInit) =>
    fetchApi<T>(endpoint, {
      ...options,
      method: "PUT",
      body: JSON.stringify(body),
    }),

  delete: <T,>(endpoint: string, options?: RequestInit) => fetchApi<T>(endpoint, { ...options, method: "DELETE" }),

  patch: <T,>(endpoint: string, body?: unknown, options?: RequestInit) =>
    fetchApi<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: JSON.stringify(body),
    }),
}

export const apiClient = api
