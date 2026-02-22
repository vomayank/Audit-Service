#!/bin/bash

# Audit Service Test Commands
# Make sure the service is running on http://localhost:3000

BASE_URL="http://localhost:3000/api/v1"

echo "====================================="
echo "Audit Service API Test Commands"
echo "====================================="

# 1. Send an Audit Log (with RBAC headers)
echo -e "\n1. Sending Audit Log with RBAC headers..."
curl -X POST "$BASE_URL/logs" \
  -H "Content-Type: application/json" \
  -H "X-User-Id: user_123" \
  -H "X-Tenant-Id: tenant_001" \
  -H "X-Correlation-Id: test-correlation-001" \
  -d '{
    "type": "audit",
    "event_id": "evt_001",
    "source_service": "auth-service",
    "status": "success",
    "action": "user_login",
    "payload": {
      "username": "john.doe",
      "login_method": "password",
      "session_id": "sess_abc123",
      "two_factor_enabled": true
    }
  }' | jq .

# 2. Send a Transaction Log (with RBAC headers)
echo -e "\n2. Sending Transaction Log with RBAC headers..."
curl -X POST "$BASE_URL/logs" \
  -H "Content-Type: application/json" \
  -H "X-User-Id: user_456" \
  -H "X-Tenant-Id: tenant_001" \
  -H "X-Correlation-Id: test-correlation-002" \
  -d '{
    "type": "transaction",
    "event_id": "evt_002",
    "transaction_id": "txn_xyz789",
    "source_service": "payment-service",
    "target_service": "stripe-api",
    "status": "success",
    "timestamp_start": "'$(date -u -d '5 seconds ago' '+%Y-%m-%dT%H:%M:%S.%3NZ')'",
    "timestamp_end": "'$(date -u '+%Y-%m-%dT%H:%M:%S.%3NZ')'",
    "duration_ms": 250,
    "payload": {
      "request_path": "/api/payments/process",
      "request_method": "POST",
      "response_status_code": 200,
      "payment_amount": 99.99,
      "currency": "USD"
    }
  }' | jq .

# 3. Send a Failed Audit Log (different tenant)
echo -e "\n3. Sending Failed Audit Log for different tenant..."
curl -X POST "$BASE_URL/logs" \
  -H "Content-Type: application/json" \
  -H "X-User-Id: user_789" \
  -H "X-Tenant-Id: tenant_002" \
  -d '{
    "type": "audit",
    "event_id": "evt_003",
    "source_service": "auth-service",
    "status": "failure",
    "action": "user_login",
    "payload": {
      "username": "jane.doe",
      "error": "Invalid credentials",
      "attempts": 3
    }
  }' | jq .

# Wait for logs to be processed
echo -e "\n⏳ Waiting 3 seconds for logs to be processed..."
sleep 3

# 4. Search All Logs for Tenant
echo -e "\n4. Searching All Logs for tenant_001..."
curl -X GET "$BASE_URL/logs" \
  -H "X-Tenant-Id: tenant_001" | jq .

# 5. Search with Filters (tenant-scoped)
echo -e "\n5. Searching Logs with Filters for tenant_001..."
curl -X GET "$BASE_URL/logs?source_service=auth-service&status=success&limit=5" \
  -H "X-User-Id: user_123" \
  -H "X-Tenant-Id: tenant_001" | jq .

# 6. Search by Actor ID (tenant-scoped)
echo -e "\n6. Searching Logs by Actor ID for tenant_001..."
curl -X GET "$BASE_URL/logs?actor_id=user_123" \
  -H "X-Tenant-Id: tenant_001" | jq .

# 7. Search with Date Range (tenant-scoped)
echo -e "\n7. Searching Logs with Date Range for tenant_001..."
START_DATE=$(date -u -d '1 hour ago' '+%Y-%m-%dT%H:%M:%S.%3NZ')
END_DATE=$(date -u '+%Y-%m-%dT%H:%M:%S.%3NZ')
curl -X GET "$BASE_URL/logs?start_date=$START_DATE&end_date=$END_DATE" \
  -H "X-Tenant-Id: tenant_001" | jq .

# 8. Advanced Search (automatically tenant-scoped)
echo -e "\n8. Performing Advanced Search for tenant_001..."
curl -X POST "$BASE_URL/logs/search" \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: tenant_001" \
  -d '{
    "filters": [
      {
        "field": "source_service",
        "operator": "eq",
        "value": "auth-service"
      },
      {
        "field": "status",
        "operator": "in",
        "value": ["success", "failure"]
      }
    ],
    "sort": {
      "timestamp": -1
    },
    "limit": 10
  }' | jq .

# 9. Search by Correlation ID (tenant-scoped)
echo -e "\n9. Searching by Correlation ID for tenant_001..."
curl -X GET "$BASE_URL/logs/correlation/test-correlation-001" \
  -H "X-Tenant-Id: tenant_001" | jq .

# 10. Get Queue Statistics
echo -e "\n10. Getting Queue Statistics..."
curl -X GET "$BASE_URL/logs/stats/queue" | jq .

# 11. Test Error Handling - Invalid Data
echo -e "\n11. Testing Error Handling with Invalid Data..."
curl -X POST "$BASE_URL/logs" \
  -H "Content-Type: application/json" \
  -H "X-User-Id: user_123" \
  -H "X-Tenant-Id: tenant_001" \
  -d '{
    "type": "invalid_type",
    "source_service": "test-service"
  }' | jq .

# 12. Test Pagination (tenant-scoped)
echo -e "\n12. Testing Pagination (Page 2) for tenant_001..."
curl -X GET "$BASE_URL/logs?page=2&limit=5" \
  -H "X-Tenant-Id: tenant_001" | jq .

# 13. Test Tenant Isolation
echo -e "\n13. Testing Tenant Isolation - Searching tenant_002 logs..."
curl -X GET "$BASE_URL/logs" \
  -H "X-Tenant-Id: tenant_002" | jq .

echo -e "\n14. Verify tenant_001 cannot see tenant_002 logs..."
curl -X GET "$BASE_URL/logs?limit=100" \
  -H "X-Tenant-Id: tenant_001" | jq '.data.items[] | select(.tenant_id == "tenant_002")' | jq -s 'if length > 0 then "ERROR: Found tenant_002 logs!" else "SUCCESS: No cross-tenant data leak" end'

echo -e "\n====================================="
echo "Test commands completed!"
echo "====================================="