# QuestLegends OS 2.0 - Sequence Diagrams

This document contains sequence diagrams for all critical business scenarios in the system.

## 1. Game Completion Flow (B2C Deal → Transaction)

This diagram shows the complete flow when a game is completed, including transaction creation, activity logging, and notifications.

```mermaid
sequenceDiagram
    actor User
    participant Frontend
    participant DealsController
    participant DealsService
    participant TransactionService
    participant DB
    participant ActivityService
    participant WebhookQueue
    participant SocketService
    participant AuditService
    
    User->>Frontend: Change deal stage to "Игра проведена"
    Frontend->>DealsController: PUT /api/deals/:id/stage
    DealsController->>DealsService: updateDealStage(dealId, stage)
    
    DealsService->>DB: BEGIN TRANSACTION
    DealsService->>DB: UPDATE deals SET stage = 'Игра проведена'
    
    alt Stage is "Игра проведена"
        DealsService->>TransactionService: createFromDeal(deal)
        TransactionService->>TransactionService: calculateAll(deal inputs)
        TransactionService->>TransactionService: createHistoricalRates(deal)
        TransactionService->>DB: INSERT INTO transactions (idempotency check)
        
        alt Transaction already exists (idempotency)
            DB-->>TransactionService: UNIQUE CONSTRAINT VIOLATION
            TransactionService-->>DealsService: Return existing transaction
        else New transaction
            DB-->>TransactionService: Transaction created
            TransactionService->>AuditService: logCreate('transaction', data)
            AuditService->>DB: INSERT INTO audit_logs
        end
        
        DealsService->>ActivityService: createActivity(deal, 'Игра проведена')
        ActivityService->>DB: INSERT INTO deal_activities
        
        DealsService->>DB: COMMIT TRANSACTION
        
        DealsService->>WebhookQueue: enqueue('deal.completed', data)
        Note over WebhookQueue: Async webhook delivery with retry
        
        DealsService->>SocketService: emit('transaction:created', data)
        SocketService->>Frontend: Real-time update
        
        DealsService-->>DealsController: { deal, transaction }
    else Other stage
        DealsService->>DB: COMMIT TRANSACTION
        DealsService-->>DealsController: { deal }
    end
    
    DealsController-->>Frontend: 200 OK { deal, transaction? }
    Frontend-->>User: Success notification
    
    par Async webhook delivery
        WebhookQueue->>WebhookService: Process job
        WebhookService->>ExternalAPI: POST webhook
        
        alt Success
            ExternalAPI-->>WebhookService: 200 OK
            WebhookService->>DB: INSERT webhook_logs (success)
        else Failure
            ExternalAPI-->>WebhookService: Error
            WebhookService->>DB: INSERT webhook_logs (error)
            WebhookService->>WebhookQueue: Retry with backoff
            
            alt Max retries exceeded
                WebhookQueue->>DLQ: Move to dead letter queue
            end
        end
    end
```

**Key Points:**
- Database transaction ensures atomicity of deal update and transaction creation
- Idempotency key prevents duplicate transactions on concurrent requests
- Webhooks sent asynchronously with retry mechanism
- Socket events for real-time UI updates
- All changes logged in audit_logs

---

## 2. Personnel Assignment with Telegram Notification

This diagram shows how personnel is assigned to a game and notified via Telegram.

```mermaid
sequenceDiagram
    actor Admin
    participant Frontend
    participant AssignmentsController
    participant AssignmentsService
    participant DB
    participant PersonnelService
    participant DealsService
    participant TelegramQueue
    participant TelegramBot
    participant NotificationService
    participant SocketService
    participant WebhookQueue
    
    Admin->>Frontend: Assign personnel to game
    Frontend->>AssignmentsController: POST /api/assignments
    AssignmentsController->>AssignmentsService: createAssignment(data)
    
    AssignmentsService->>DB: BEGIN TRANSACTION
    AssignmentsService->>DB: INSERT INTO game_assignments
    
    alt Duplicate assignment
        DB-->>AssignmentsService: UNIQUE CONSTRAINT VIOLATION
        AssignmentsService-->>AssignmentsController: 409 Conflict
    else Success
        DB-->>AssignmentsService: Assignment created
        
        AssignmentsService->>PersonnelService: getById(personnelId)
        PersonnelService->>DB: SELECT * FROM personnel
        DB-->>PersonnelService: Personnel data
        
        AssignmentsService->>DealsService: getById(dealId)
        DealsService->>DB: SELECT * FROM deals
        DB-->>DealsService: Deal data
        
        AssignmentsService->>DB: COMMIT TRANSACTION
        
        par Async notifications
            alt Personnel has telegram_id
                AssignmentsService->>TelegramQueue: enqueue(telegram message)
                TelegramQueue->>TelegramBot: sendMessage(telegram_id, message)
                
                alt Telegram success
                    TelegramBot-->>TelegramQueue: Message sent
                else Telegram failure
                    TelegramBot-->>TelegramQueue: Error
                    TelegramQueue->>TelegramQueue: Retry with backoff
                end
            end
            
            alt Personnel has user_id
                AssignmentsService->>NotificationService: create(notification)
                NotificationService->>DB: INSERT INTO notifications
                NotificationService->>SocketService: emit('notification:new')
                SocketService->>Frontend: Real-time notification
            end
            
            AssignmentsService->>WebhookQueue: enqueue('personnel.assigned')
        end
        
        AssignmentsService-->>AssignmentsController: Assignment created
    end
    
    AssignmentsController-->>Frontend: 201 Created
    Frontend-->>Admin: Success + real-time update
```

**Key Points:**
- Telegram notifications sent asynchronously via queue
- System notification created even if telegram_id missing
- Unique constraint prevents duplicate assignments
- Real-time updates via Socket.io
- Webhook fired for external integrations

---

## 3. Historical Rates & Calculation Integrity

This diagram shows how historical rates are preserved when rates change.

```mermaid
sequenceDiagram
    actor UK
    participant Frontend
    participant TransactionService
    participant DB
    participant AnalyticsService
    
    Note over UK,DB: Day 1: Create transaction with current rates
    
    UK->>Frontend: Complete deal (animator_rate=3000)
    Frontend->>TransactionService: createFromDeal(deal)
    
    TransactionService->>TransactionService: Calculate totals
    Note over TransactionService: Revenue=50000, FOT=15000
    
    TransactionService->>TransactionService: createHistoricalRates()
    Note over TransactionService: Snapshot: animator_rate=3000
    
    TransactionService->>DB: INSERT INTO transactions<br/>(historical_rates JSONB)
    DB-->>TransactionService: Transaction #1 created
    
    Note over UK,DB: Day 5: Rates change in system
    
    UK->>Frontend: Update animator rate to 3500
    Frontend->>DB: UPDATE deals SET animator_rate=3500
    
    Note over UK,DB: Day 10: Another game completed
    
    UK->>Frontend: Complete deal (animator_rate=3500)
    Frontend->>TransactionService: createFromDeal(deal)
    
    TransactionService->>TransactionService: Calculate with NEW rates
    Note over TransactionService: Revenue=50000, FOT=16000
    
    TransactionService->>TransactionService: createHistoricalRates()
    Note over TransactionService: Snapshot: animator_rate=3500
    
    TransactionService->>DB: INSERT INTO transactions<br/>(historical_rates JSONB)
    DB-->>TransactionService: Transaction #2 created
    
    Note over UK,DB: Day 15: Generate historical report
    
    UK->>Frontend: Request P&L report for all time
    Frontend->>AnalyticsService: getPnL(startDate, endDate)
    
    AnalyticsService->>DB: SELECT * FROM transactions<br/>WHERE date BETWEEN dates
    DB-->>AnalyticsService: [Transaction #1, Transaction #2]
    
    Note over AnalyticsService: Transaction #1: FOT=15000 (from historical_rates)<br/>Transaction #2: FOT=16000 (from historical_rates)
    
    AnalyticsService->>AnalyticsService: Calculate totals from stored values
    AnalyticsService-->>Frontend: Accurate historical report
    Frontend-->>UK: Report shows correct FOT for each period
```

**Key Points:**
- Historical rates snapshot saved on transaction creation
- Future rate changes don't affect past transactions
- Reports use stored calculated values, not recalculation
- Data integrity maintained for accounting

---

## 4. B2B Franchise Sale (Lead → Franchisee)

This diagram shows the conversion from B2B lead to active franchisee.

```mermaid
sequenceDiagram
    actor UK
    participant Frontend
    participant DealsController
    participant DealsService
    participant FranchiseeService
    participant UserService
    participant DB
    participant EmailQueue
    participant NotificationService
    participant WebhookQueue
    
    UK->>Frontend: Change B2B deal to "Франшиза открыта"
    Frontend->>DealsController: PUT /api/deals/:id/stage
    DealsController->>DealsService: updateDealStage(dealId, stage)
    
    DealsService->>DB: BEGIN TRANSACTION
    DealsService->>DB: UPDATE deals SET stage='Франшиза открыта'
    
    alt Stage is "Франшиза открыта"
        DealsService->>FranchiseeService: createFromDeal(deal)
        
        FranchiseeService->>DB: INSERT INTO franchisees
        DB-->>FranchiseeService: Franchisee created
        
        FranchiseeService->>UserService: createFranchiseeOwner(contact info)
        UserService->>UserService: hashPassword()
        UserService->>DB: INSERT INTO users (role='franchisee')
        DB-->>UserService: User created
        
        UserService->>DB: INSERT INTO user_franchisee_access
        
        FranchiseeService->>DB: UPDATE franchisees<br/>SET owner_user_id = new_user.id
        
        DealsService->>DB: COMMIT TRANSACTION
        
        par Async onboarding
            DealsService->>EmailQueue: enqueue(welcome email)
            EmailQueue->>EmailService: Send credentials and onboarding
            
            DealsService->>NotificationService: createForUser(welcome notification)
            NotificationService->>DB: INSERT INTO notifications
            
            DealsService->>WebhookQueue: enqueue('franchisee.created')
        end
        
        DealsService-->>DealsController: { deal, franchisee, user }
    else Other stage
        DealsService->>DB: COMMIT TRANSACTION
        DealsService-->>DealsController: { deal }
    end
    
    DealsController-->>Frontend: 200 OK
    Frontend-->>UK: Franchisee created successfully
```

**Key Points:**
- Atomic creation of franchisee, user, and access rights
- Automatic credential generation and secure password hashing
- Welcome email sent asynchronously
- User immediately has access to their dashboard

---

## 5. Net Profit Calculation with Expenses

This diagram shows optimized P&L calculation using SQL aggregations.

```mermaid
sequenceDiagram
    actor Franchisee
    participant Frontend
    participant AnalyticsController
    participant AnalyticsService
    participant DB
    participant CacheService
    
    Franchisee->>Frontend: Request P&L report for Q1
    Frontend->>AnalyticsController: GET /api/analytics/pnl?<br/>locationId=xxx&startDate=2025-01-01&endDate=2025-03-31
    
    AnalyticsController->>AnalyticsService: calculatePnL(filters)
    
    AnalyticsService->>CacheService: getCached(cacheKey)
    
    alt Cache hit
        CacheService-->>AnalyticsService: Cached data
        AnalyticsService-->>AnalyticsController: Cached results
    else Cache miss
        AnalyticsService->>DB: Execute optimized SQL query
        
        Note over DB: SELECT<br/>  SUM(total_revenue),<br/>  SUM(royalty_amount),<br/>  SUM(fot_calculation),<br/>  (SELECT SUM(amount)<br/>   FROM expenses<br/>   WHERE ...),<br/>  COUNT(*)<br/>FROM transactions<br/>WHERE location_id = xxx<br/>  AND date BETWEEN dates
        
        DB-->>AnalyticsService: Aggregated data
        
        Note over AnalyticsService: Total Revenue: 1,500,000<br/>Total Royalty: 105,000<br/>Total FOT: 450,000<br/>Total Expenses: 300,000<br/>Games Count: 100
        
        AnalyticsService->>AnalyticsService: Calculate Net Profit
        Note over AnalyticsService: Net Profit = 1,500,000 - 105,000<br/>           - 450,000 - 300,000<br/>           = 645,000
        
        AnalyticsService->>AnalyticsService: Calculate Margin
        Note over AnalyticsService: Margin = (645,000 / 1,500,000) * 100<br/>       = 43%
        
        AnalyticsService->>CacheService: cache(cacheKey, results, TTL=180s)
        
        AnalyticsService-->>AnalyticsController: P&L results
    end
    
    AnalyticsController-->>Frontend: 200 OK { pnl data }
    Frontend-->>Franchisee: Display P&L dashboard
```

**Key Points:**
- Single SQL query with aggregations (no N+1 problem)
- All calculations done in database for performance
- Results cached for 3 minutes to reduce DB load
- Scales to 100k+ transactions with proper indexes

---

## 6. Webhook Reliability with Retry & DLQ

This diagram shows the robust webhook delivery system.

```mermaid
sequenceDiagram
    participant EventSource
    participant WebhookQueue
    participant WebhookWorker
    participant ExternalAPI
    participant DB
    participant DLQ
    participant MonitoringService
    
    EventSource->>WebhookQueue: enqueue('deal.completed', payload)
    Note over WebhookQueue: Job metadata:<br/>attempt=1, maxRetries=5
    
    WebhookQueue->>WebhookWorker: Process job
    
    WebhookWorker->>WebhookWorker: Generate HMAC signature
    Note over WebhookWorker: HMAC-SHA256(payload, secret)
    
    WebhookWorker->>ExternalAPI: POST /webhook<br/>Headers:<br/>  X-Webhook-Signature: hmac<br/>  X-Event-Type: deal.completed
    
    alt Success (2xx response)
        ExternalAPI-->>WebhookWorker: 200 OK
        
        WebhookWorker->>DB: INSERT INTO webhook_logs<br/>(status=success, status_code=200)
        WebhookWorker->>WebhookQueue: Mark job as completed
        
    else Temporary failure (5xx, network error)
        ExternalAPI-->>WebhookWorker: 503 Service Unavailable
        
        WebhookWorker->>DB: INSERT INTO webhook_logs<br/>(status=error, status_code=503)
        
        alt Attempt < maxRetries
            WebhookWorker->>WebhookQueue: Retry with exponential backoff
            Note over WebhookQueue: Backoff: 2^attempt seconds<br/>Attempt 1: 2s<br/>Attempt 2: 4s<br/>Attempt 3: 8s<br/>Attempt 4: 16s<br/>Attempt 5: 32s
            
            loop Retry attempts
                WebhookQueue->>WebhookWorker: Process retry
                WebhookWorker->>ExternalAPI: POST /webhook (retry)
                
                alt Retry succeeds
                    ExternalAPI-->>WebhookWorker: 200 OK
                    WebhookWorker->>DB: UPDATE webhook_logs (success)
                    WebhookWorker->>WebhookQueue: Mark completed
                else Retry fails
                    ExternalAPI-->>WebhookWorker: Error
                    WebhookWorker->>DB: INSERT webhook_logs (retry failed)
                end
            end
        else Max retries exceeded
            WebhookWorker->>DLQ: Move job to dead letter queue
            WebhookWorker->>DB: INSERT webhook_logs<br/>(status=failed, attempts=5)
            WebhookWorker->>MonitoringService: Alert: Webhook permanently failed
            
            MonitoringService->>MonitoringService: Send alert to ops team
        end
        
    else Client error (4xx)
        ExternalAPI-->>WebhookWorker: 400 Bad Request
        
        WebhookWorker->>DB: INSERT webhook_logs<br/>(status=client_error, status_code=400)
        WebhookWorker->>DLQ: Move to DLQ (no retry on 4xx)
        Note over WebhookWorker: Client errors are not retried
    end
```

**Key Points:**
- HMAC signature for webhook authentication
- Exponential backoff retry strategy
- Dead letter queue for failed webhooks
- Different handling for 4xx vs 5xx errors
- Complete audit trail in webhook_logs

---

## 7. Audit Log System

This diagram shows how all data changes are automatically logged.

```mermaid
sequenceDiagram
    actor User
    participant Frontend
    participant Controller
    participant Service
    participant DB
    participant AuditMiddleware
    participant AuditService
    
    User->>Frontend: Update deal amount
    Frontend->>Controller: PUT /api/deals/:id
    
    Controller->>AuditMiddleware: Process request
    AuditMiddleware->>AuditMiddleware: Extract user info from JWT
    AuditMiddleware->>Controller: Continue
    
    Controller->>Service: updateDeal(dealId, data)
    
    Service->>DB: SELECT * FROM deals WHERE id = dealId
    DB-->>Service: Old deal data
    Note over Service: oldValues = { amount: 50000, ... }
    
    Service->>DB: UPDATE deals SET amount = 60000
    DB-->>Service: Updated
    
    Service->>DB: SELECT * FROM deals WHERE id = dealId
    DB-->>Service: New deal data
    Note over Service: newValues = { amount: 60000, ... }
    
    Service->>AuditService: log({<br/>  userId,<br/>  userEmail,<br/>  entityType: 'deal',<br/>  entityId: dealId,<br/>  action: 'update',<br/>  oldValues,<br/>  newValues,<br/>  ipAddress,<br/>  userAgent<br/>})
    
    AuditService->>AuditService: Calculate diff
    Note over AuditService: Changed fields:<br/>- amount: 50000 → 60000
    
    AuditService->>DB: INSERT INTO audit_logs
    DB-->>AuditService: Log created
    
    Service-->>Controller: Updated deal
    Controller-->>Frontend: 200 OK
    Frontend-->>User: Success
    
    Note over User,DB: Later: View audit history
    
    User->>Frontend: View deal history
    Frontend->>Controller: GET /api/audit-logs?<br/>entityType=deal&entityId=xxx
    
    Controller->>AuditService: getAuditLogs(filters)
    AuditService->>DB: SELECT * FROM audit_logs<br/>WHERE entity_type='deal'<br/>  AND entity_id = xxx<br/>ORDER BY created_at DESC
    
    DB-->>AuditService: Audit log entries
    AuditService-->>Controller: Formatted history
    Controller-->>Frontend: 200 OK [audit logs]
    Frontend-->>User: Display timeline of all changes
```

**Key Points:**
- Automatic logging via middleware
- Old and new values stored for complete history
- User identity, IP, and user agent tracked
- Immutable audit trail for compliance
- Easy to query and display change history

```
