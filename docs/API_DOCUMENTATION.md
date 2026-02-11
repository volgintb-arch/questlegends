# QuestLegends OS 2.0 - API Documentation

## Overview

Complete REST API documentation for QuestLegends franchise management system.

**Base URL:** `https://api.questlegends.com/v2`

**Authentication:** Bearer JWT tokens

## Authentication

### Login

**Endpoint:** `POST /auth/login`

**Request:**
\`\`\`json
{
  "email": "user@example.com",
  "password": "password123"
}
\`\`\`

**Response:**
\`\`\`json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "User Name",
      "role": "franchisee"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
\`\`\`

**Access Token TTL:** 15 minutes  
**Refresh Token TTL:** 7 days

### Refresh Token

**Endpoint:** `POST /auth/refresh`

**Request:**
\`\`\`json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
\`\`\`

## Deals (CRM)

### Get All Deals

**Endpoint:** `GET /deals`

**Query Parameters:**
- `locationId` (uuid, optional) - Filter by location
- `stage` (string, optional) - Filter by stage
- `priority` (string, optional) - Filter by priority
- `page` (integer, default: 1) - Page number
- `limit` (integer, default: 50) - Items per page

**Example:**
\`\`\`bash
curl -H "Authorization: Bearer TOKEN" \
  "https://api.questlegends.com/v2/deals?locationId=xxx&stage=Переговоры&page=1"
\`\`\`

### Update Deal Stage (with Transaction Creation)

**Endpoint:** `PUT /deals/:id/stage`

**Headers:**
- `Authorization: Bearer TOKEN`
- `Idempotency-Key: unique-key` (optional, for transaction idempotency)

**Request:**
\`\`\`json
{
  "stage": "Игра проведена"
}
\`\`\`

**Response:**
\`\`\`json
{
  "success": true,
  "data": {
    "deal": { ... },
    "transaction": {
      "id": "uuid",
      "total_revenue": 50000,
      "fot_calculation": 15000,
      "royalty_amount": 3500,
      "historical_rates": { ... }
    }
  }
}
\`\`\`

**Important:** When stage is "Игра проведена", a transaction is automatically created with idempotency support.

## Transactions (ERP)

### Get All Transactions

**Endpoint:** `GET /transactions`

**Query Parameters:**
- `locationId` (uuid, required for non-UK roles)
- `startDate` (date, optional)
- `endDate` (date, optional)
- `status` (string, optional)

### Create Transaction

**Endpoint:** `POST /transactions`

**Headers:**
- `Idempotency-Key: unique-key` (recommended)

**Request:**
\`\`\`json
{
  "date": "2025-01-15",
  "deal_id": "uuid",
  "location_id": "uuid",
  "participants_count": 10,
  "check_per_person": 5000,
  "animators_count": 2,
  "animator_rate": 3000,
  "host_rate": 5000,
  "dj_rate": 4000
}
\`\`\`

**Note:** Calculations (total_revenue, royalty, FOT) are done automatically on the server.

## Analytics

### Get P&L Report

**Endpoint:** `GET /analytics/pnl`

**Query Parameters:**
- `locationId` (uuid, required for non-UK)
- `startDate` (date, required)
- `endDate` (date, required)

**Example:**
\`\`\`bash
curl -H "Authorization: Bearer TOKEN" \
  "https://api.questlegends.com/v2/analytics/pnl?locationId=xxx&startDate=2025-01-01&endDate=2025-01-31"
\`\`\`

**Response:**
\`\`\`json
{
  "success": true,
  "data": {
    "totalRevenue": 1500000,
    "totalRoyalty": 105000,
    "totalFOT": 450000,
    "totalExpenses": 300000,
    "netProfit": 645000,
    "margin": 43.0,
    "gamesCount": 120,
    "avgCheck": 12500
  }
}
\`\`\`

### Compare Franchisees (UK Only)

**Endpoint:** `GET /analytics/franchisee-comparison`

**Query Parameters:**
- `period` (string, default: month) - week, month, quarter, year

## Audit Logs

### Get Audit Logs

**Endpoint:** `GET /audit-logs`

**Query Parameters:**
- `entityType` (string, optional) - deal, transaction, expense, etc.
- `entityId` (uuid, optional) - Specific entity ID
- `action` (string, optional) - create, update, delete
- `startDate` (date, optional)
- `endDate` (date, optional)

### Export Audit Logs

**Endpoint:** `GET /audit-logs/export`

Returns CSV file with all audit logs matching filters.

## Error Handling

All errors follow standard format:

\`\`\`json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  }
}
\`\`\`

**Error Codes:**
- `VALIDATION_ERROR` (400) - Input validation failed
- `UNAUTHORIZED` (401) - Authentication required
- `FORBIDDEN` (403) - Insufficient permissions
- `NOT_FOUND` (404) - Resource not found
- `CONFLICT` (409) - Duplicate resource (idempotency)
- `INTERNAL_ERROR` (500) - Server error

## Rate Limiting

- **Rate Limit:** 100 requests per minute per IP
- **Headers:**
  - `X-RateLimit-Limit: 100`
  - `X-RateLimit-Remaining: 95`
  - `X-RateLimit-Reset: 1640000000`

## Webhooks

The system sends webhooks for key events:

- `deal.completed` - Game completed, transaction created
- `personnel.assigned` - Staff assigned to game
- `transaction.created` - New transaction
- `franchisee.created` - New franchisee activated

**Webhook Payload:**
\`\`\`json
{
  "event": "deal.completed",
  "timestamp": "2025-01-15T10:30:00Z",
  "data": {
    "dealId": "uuid",
    "transactionId": "uuid",
    "amount": 50000
  }
}
\`\`\`

**Webhook Security:**
- HMAC-SHA256 signature in `X-Webhook-Signature` header
- Verify using your `WEBHOOK_SECRET`

## Idempotency

For safety-critical operations (transaction creation), use idempotency keys:

\`\`\`bash
curl -X POST \
  -H "Authorization: Bearer TOKEN" \
  -H "Idempotency-Key: unique-key-123" \
  -d '{ ... }' \
  https://api.questlegends.com/v2/transactions
\`\`\`

Duplicate requests with same idempotency key return the original result.

## Performance

**Target Response Times:**
- Simple queries: < 100ms
- Aggregated analytics: < 200ms
- Franchisee comparison: < 300ms

**Optimization:**
- Use pagination for large result sets
- Cache analytics with 3-minute TTL
- Use indexes on location_id and date fields

## Postman Collection

Download: [QuestLegends API.postman_collection.json](./postman_collection.json)

## OpenAPI Spec

Download: [openapi.yaml](./openapi.yaml)

Import into Swagger UI or Postman for interactive documentation.
