// API Client Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api"

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: any,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  })

  const data = await response.json()

  if (!response.ok) {
    throw new ApiError(
      data.error?.code || "UNKNOWN_ERROR",
      data.error?.message || "An error occurred",
      data.error?.details,
    )
  }

  return data.data
}

export const api = {
  get: (endpoint: string, options?: RequestInit) => fetchApi(endpoint, { ...options, method: "GET" }),

  post: (endpoint: string, body?: any, options?: RequestInit) =>
    fetchApi(endpoint, {
      ...options,
      method: "POST",
      body: JSON.stringify(body),
    }),

  put: (endpoint: string, body?: any, options?: RequestInit) =>
    fetchApi(endpoint, {
      ...options,
      method: "PUT",
      body: JSON.stringify(body),
    }),

  delete: (endpoint: string, options?: RequestInit) => fetchApi(endpoint, { ...options, method: "DELETE" }),

  patch: (endpoint: string, body?: any, options?: RequestInit) =>
    fetchApi(endpoint, {
      ...options,
      method: "PATCH",
      body: JSON.stringify(body),
    }),
}

export const apiClient = api
