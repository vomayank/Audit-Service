package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/google/uuid"
)

// LogType represents the type of log
type LogType string

const (
	LogTypeAudit       LogType = "audit"
	LogTypeTransaction LogType = "transaction"
)

// LogStatus represents the status of a log event
type LogStatus string

const (
	LogStatusSuccess   LogStatus = "success"
	LogStatusFailure   LogStatus = "failure"
	LogStatusPartial   LogStatus = "partial"
	LogStatusTimeout   LogStatus = "timeout"
	LogStatusCancelled LogStatus = "cancelled"
)

// AuditLogRequest represents an audit log request
type AuditLogRequest struct {
	Type           LogType                `json:"type"`
	EventID        string                 `json:"event_id"`
	SourceService  string                 `json:"source_service"`
	CorrelationID  string                 `json:"correlation_id,omitempty"`
	Status         LogStatus              `json:"status"`
	Action         string                 `json:"action"`
	ActorID        string                 `json:"actor_id,omitempty"`
	IPAddress      string                 `json:"ip_address,omitempty"`
	UserAgent      string                 `json:"user_agent,omitempty"`
	Timestamp      string                 `json:"timestamp,omitempty"`
	Payload        map[string]interface{} `json:"payload"`
}

// TransactionLogRequest represents a transaction log request
type TransactionLogRequest struct {
	Type           LogType                `json:"type"`
	EventID        string                 `json:"event_id"`
	TransactionID  string                 `json:"transaction_id"`
	SourceService  string                 `json:"source_service"`
	TargetService  string                 `json:"target_service,omitempty"`
	CorrelationID  string                 `json:"correlation_id,omitempty"`
	Status         LogStatus              `json:"status"`
	TimestampStart string                 `json:"timestamp_start"`
	TimestampEnd   string                 `json:"timestamp_end"`
	DurationMs     int64                  `json:"duration_ms"`
	Payload        map[string]interface{} `json:"payload"`
}

// AuditClient represents the audit service client
type AuditClient struct {
	BaseURL string
	Client  *http.Client
}

// NewAuditClient creates a new audit service client
func NewAuditClient(baseURL string) *AuditClient {
	return &AuditClient{
		BaseURL: baseURL,
		Client: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

// SendAuditLog sends an audit log to the service
func (c *AuditClient) SendAuditLog(log AuditLogRequest) error {
	// Set defaults
	if log.EventID == "" {
		log.EventID = uuid.New().String()
	}
	if log.Timestamp == "" {
		log.Timestamp = time.Now().Format(time.RFC3339)
	}
	if log.CorrelationID == "" {
		log.CorrelationID = uuid.New().String()
	}

	jsonData, err := json.Marshal(log)
	if err != nil {
		return fmt.Errorf("failed to marshal log: %w", err)
	}

	req, err := http.NewRequest("POST", c.BaseURL+"/api/v1/logs", bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Correlation-Id", log.CorrelationID)

	resp, err := c.Client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusAccepted {
		return fmt.Errorf("unexpected status code: %d, body: %s", resp.StatusCode, string(body))
	}

	fmt.Printf("Log sent successfully. Response: %s\n", string(body))
	return nil
}

// SendTransactionLog sends a transaction log to the service
func (c *AuditClient) SendTransactionLog(log TransactionLogRequest) error {
	// Set defaults
	if log.EventID == "" {
		log.EventID = uuid.New().String()
	}
	if log.TransactionID == "" {
		log.TransactionID = uuid.New().String()
	}
	if log.CorrelationID == "" {
		log.CorrelationID = uuid.New().String()
	}

	jsonData, err := json.Marshal(log)
	if err != nil {
		return fmt.Errorf("failed to marshal log: %w", err)
	}

	req, err := http.NewRequest("POST", c.BaseURL+"/api/v1/logs", bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Correlation-Id", log.CorrelationID)

	resp, err := c.Client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusAccepted {
		return fmt.Errorf("unexpected status code: %d, body: %s", resp.StatusCode, string(body))
	}

	fmt.Printf("Transaction log sent successfully. Response: %s\n", string(body))
	return nil
}

// SearchLogs searches for logs
func (c *AuditClient) SearchLogs(params map[string]string) ([]byte, error) {
	req, err := http.NewRequest("GET", c.BaseURL+"/api/v1/logs", nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	q := req.URL.Query()
	for key, value := range params {
		q.Add(key, value)
	}
	req.URL.RawQuery = q.Encode()

	resp, err := c.Client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status code: %d, body: %s", resp.StatusCode, string(body))
	}

	return body, nil
}

func main() {
	// Create audit client
	client := NewAuditClient("http://localhost:3000")

	// Example 1: Send an audit log for user login
	auditLog := AuditLogRequest{
		Type:          LogTypeAudit,
		SourceService: "auth-service-go",
		Status:        LogStatusSuccess,
		Action:        "user_login",
		ActorID:       "user123",
		IPAddress:     "192.168.1.100",
		UserAgent:     "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
		Payload: map[string]interface{}{
			"username":      "john.doe",
			"login_method":  "password",
			"session_id":    uuid.New().String(),
			"two_factor":    true,
		},
	}

	if err := client.SendAuditLog(auditLog); err != nil {
		fmt.Printf("Error sending audit log: %v\n", err)
	}

	// Example 2: Send a transaction log
	startTime := time.Now()
	endTime := startTime.Add(250 * time.Millisecond)
	
	transactionLog := TransactionLogRequest{
		Type:           LogTypeTransaction,
		SourceService:  "payment-service-go",
		TargetService:  "stripe-api",
		Status:         LogStatusSuccess,
		TimestampStart: startTime.Format(time.RFC3339),
		TimestampEnd:   endTime.Format(time.RFC3339),
		DurationMs:     250,
		Payload: map[string]interface{}{
			"request_path":        "/api/payments/process",
			"request_method":      "POST",
			"response_status_code": 200,
			"payment_amount":      99.99,
			"currency":            "USD",
			"customer_id":         "cust_123",
		},
	}

	if err := client.SendTransactionLog(transactionLog); err != nil {
		fmt.Printf("Error sending transaction log: %v\n", err)
	}

	// Example 3: Search for logs
	time.Sleep(2 * time.Second) // Wait for logs to be processed

	searchParams := map[string]string{
		"source_service": "auth-service-go",
		"status":         "success",
		"limit":          "10",
	}

	results, err := client.SearchLogs(searchParams)
	if err != nil {
		fmt.Printf("Error searching logs: %v\n", err)
	} else {
		fmt.Printf("Search results: %s\n", string(results))
	}
}