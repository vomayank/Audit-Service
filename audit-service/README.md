# Audit Service Microservice

A robust, scalable, and generic audit logging microservice built with NestJS for the Prayog platform. This service provides centralized audit logging with asynchronous processing, flexible NoSQL storage, and cross-language support.

## 🏗️ Architecture Overview

The Audit Service implements an **Event-Driven Architecture (EDA)** with the following key components:

- **Ingestion API**: RESTful endpoints for receiving log events
- **Message Queue**: BullMQ/Redis for asynchronous processing
- **Worker/Processor**: Background job processor for data persistence
- **NoSQL Database**: MongoDB for flexible, schema-less storage
- **Global Exception Filter**: Centralized error handling
- **RBAC Integration**: Automatic tenant isolation via headers from RBAC service
- **Multi-tenancy Support**: Built-in tenant isolation for all operations

### Data Flow

```
Source Services → REST API → Message Queue → Worker → MongoDB → Analytics
     (Go/Node)      (NestJS)    (BullMQ)    (Processor)  (NoSQL)
```

## 🚀 Quick Start

### Using Docker Compose (Recommended)

```bash
# Clone the repository
cd audit-service

# Copy environment variables
cp .env.example .env

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f audit-service
```

### Local Development

```bash
# Install dependencies
npm install

# Start MongoDB and Redis (required)
docker-compose up -d mongodb redis

# Run in development mode
npm run start:dev

# Run in production mode
npm run build
npm run start:prod
```

## 📚 API Documentation

Once the service is running, access the interactive Swagger documentation at:
- **Swagger UI**: http://localhost:3000/api/docs
- **OpenAPI JSON**: http://localhost:3000/api-json

### Required Headers (from RBAC Service)

All API calls should include these headers, which are automatically set by the RBAC service:
- `X-User-Id`: The authenticated user's ID
- `X-Tenant-Id`: The tenant/organization ID for multi-tenancy
- `X-Correlation-Id`: (Optional) Request correlation ID for tracing

### Core Endpoints

#### 1. Ingest Log Event
```bash
POST /api/v1/logs
```

**Audit Log Example:**
```bash
curl -X POST http://localhost:3000/api/v1/logs \
  -H "Content-Type: application/json" \
  -H "X-User-Id: user_123" \
  -H "X-Tenant-Id: tenant_001" \
  -d '{
    "type": "audit",
    "event_id": "evt_001",
    "source_service": "auth-service",
    "status": "success",
    "action": "user_login",
    "payload": {
      "username": "john.doe",
      "session_id": "sess_abc123"
    }
  }'
```

Note: The `actor_id` is automatically populated from the `X-User-Id` header, and `tenant_id` from `X-Tenant-Id`.

**Transaction Log Example:**
```json
{
  "type": "transaction",
  "event_id": "evt_002",
  "transaction_id": "txn_xyz789",
  "source_service": "payment-service",
  "status": "success",
  "timestamp_start": "2024-01-01T10:00:00Z",
  "timestamp_end": "2024-01-01T10:00:00.250Z",
  "duration_ms": 250,
  "payload": {
    "request_path": "/api/payments",
    "response_status_code": 200
  }
}
```

#### 2. Search Logs
```bash
GET /api/v1/logs?source_service=auth-service&status=success&limit=20
```

Note: Results are automatically filtered by the tenant ID from the `X-Tenant-Id` header.

#### 3. Advanced Search
```bash
POST /api/v1/logs/search
```

```json
{
  "filters": [
    {
      "field": "source_service",
      "operator": "eq",
      "value": "auth-service"
    }
  ],
  "sort": { "timestamp": -1 },
  "limit": 20
}
```

#### 4. Get Logs by Correlation ID
```bash
GET /api/v1/logs/correlation/{correlationId}
```

#### 5. Queue Statistics
```bash
GET /api/v1/logs/stats/queue
```

## 🔧 Configuration

Environment variables (`.env` file):

```env
# Application
NODE_ENV=development
PORT=3000

# MongoDB
MONGODB_URI=mongodb://admin:admin123@localhost:27017/audit_db?authSource=admin

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Queue Configuration
QUEUE_NAME=audit-queue
QUEUE_CONCURRENCY=5
QUEUE_MAX_RETRIES=3
```

## 📊 Database Schema

### Audit Log Schema
- `event_id`: Unique event identifier
- `timestamp`: Event occurrence time
- `source_service`: Service that generated the event
- `tenant_id`: Tenant identifier (auto-populated from X-Tenant-Id header)
- `actor_id`: User/system that initiated the action (auto-populated from X-User-Id header)
- `correlation_id`: For tracing related events
- `action`: Action performed (create, update, delete, etc.)
- `status`: Event status (success, failure, partial)
- `payload`: Flexible JSON object for event-specific data

### Transaction Log Schema
- `transaction_id`: Unique transaction identifier
- `correlation_id`: For tracing related events
- `timestamp_start`: Transaction start time
- `timestamp_end`: Transaction end time
- `duration_ms`: Total duration in milliseconds
- `source_service`: Service that initiated the transaction
- `target_service`: Target service (optional)
- `status`: Transaction status
- `payload`: Transaction-specific data

### Indexing Strategy
- Primary indexes on `_id` and unique identifiers
- Compound indexes for common query patterns
- Time-based indexes for efficient range queries
- Sparse indexes on optional fields

## 🌐 Cross-Language Integration

### Go Client Example

```go
// See examples/go-client/main.go for complete implementation
// User ID and Tenant ID come from your RBAC service
userID := "user_123"
tenantID := "tenant_001"
client := NewAuditClient("http://localhost:3000", userID, tenantID)

auditLog := AuditLogRequest{
    Type:          LogTypeAudit,
    SourceService: "auth-service-go",
    Status:        LogStatusSuccess,
    Action:        "user_login",
    // ActorID is automatically set from X-User-Id header
    Payload: map[string]interface{}{
        "username": "john.doe",
    },
}

err := client.SendAuditLog(auditLog)
```

### Node.js Client Example

```javascript
const axios = require('axios');

const auditClient = {
  baseURL: 'http://localhost:3000/api/v1',
  
  async sendLog(logData) {
    const response = await axios.post(`${this.baseURL}/logs`, logData, {
      headers: {
        'Content-Type': 'application/json',
        'X-Correlation-Id': logData.correlation_id || uuid.v4()
      }
    });
    return response.data;
  }
};
```

## 🧪 Testing

### Run Test Commands
```bash
# Make the test script executable
chmod +x examples/test-commands.sh

# Run all test commands
./examples/test-commands.sh
```

### Unit Tests
```bash
npm run test
```

### E2E Tests
```bash
npm run test:e2e
```

## 🚨 Error Handling

The service implements a comprehensive error handling framework:

- **Business Errors**: 4xx status codes for client errors
- **System Errors**: 5xx status codes for server errors
- **Validation Errors**: 422 for invalid data
- **Not Found Errors**: 404 for missing resources

All errors follow a consistent response format:
```json
{
  "success": false,
  "message": "Error description",
  "error": {
    "code": "ERROR_CODE",
    "details": {},
    "timestamp": "2024-01-01T10:00:00Z",
    "path": "/api/v1/logs",
    "correlation_id": "uuid"
  }
}
```

## 📈 Performance Optimization

1. **Asynchronous Processing**: Queue-based architecture prevents blocking
2. **Database Indexing**: Optimized indexes for common query patterns
3. **Connection Pooling**: Efficient database connection management
4. **Batch Processing**: Worker processes multiple jobs concurrently
5. **Caching**: Redis-based caching for frequently accessed data

## 🔒 Security Considerations

1. **Multi-tenancy**: Automatic tenant isolation via RBAC headers
2. **Input Validation**: Strict DTO validation using class-validator
3. **Rate Limiting**: Configurable rate limits per endpoint
4. **CORS**: Configurable CORS policies
5. **Authentication**: Handled by upstream RBAC service
6. **Data Sanitization**: Prevention of NoSQL injection attacks
7. **Tenant Isolation**: All queries automatically scoped to tenant from X-Tenant-Id header

## 📝 API Contract (OpenAPI)

Generate client SDKs from the OpenAPI specification:

```bash
# Get OpenAPI specification
curl http://localhost:3000/api-json > openapi.json

# Generate TypeScript client
npx openapi-generator-cli generate \
  -i openapi.json \
  -g typescript-axios \
  -o ./generated/typescript-client

# Generate Go client
openapi-generator generate \
  -i openapi.json \
  -g go \
  -o ./generated/go-client
```

## 🛠️ Development Commands

```bash
# Development
npm run start:dev

# Build
npm run build

# Production
npm run start:prod

# Format code
npm run format

# Lint
npm run lint

# Test
npm run test
npm run test:watch
npm run test:cov
npm run test:e2e
```

## 📊 Monitoring

### Queue Monitoring
Access queue statistics at: `GET /api/v1/logs/stats/queue`

### Health Check
```bash
curl http://localhost:3000/health
```

### Metrics
The service exposes metrics for:
- Request count and latency
- Queue job processing times
- Database operation performance
- Error rates by type

## 🤝 Contributing

1. Follow the established coding patterns
2. Write tests for new features
3. Update documentation
4. Use conventional commits
5. Ensure all tests pass before submitting PR

## 📄 License

MIT

## 🆘 Support

For issues or questions, please contact the platform team or create an issue in the repository.