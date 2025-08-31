// MongoDB initialization script
// This script runs when the MongoDB container starts

db = db.getSiblingDB('audit_db');

// Create collections with validation
db.createCollection('audit_logs', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['event_id', 'timestamp', 'source_service', 'action', 'status'],
      properties: {
        event_id: {
          bsonType: 'string',
          description: 'Unique event identifier'
        },
        timestamp: {
          bsonType: 'date',
          description: 'Event timestamp'
        },
        source_service: {
          bsonType: 'string',
          description: 'Source service name'
        },
        action: {
          bsonType: 'string',
          description: 'Action performed'
        },
        status: {
          enum: ['success', 'failure', 'partial'],
          description: 'Event status'
        }
      }
    }
  }
});

db.createCollection('transaction_logs', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['transaction_id', 'timestamp_start', 'timestamp_end', 'source_service', 'status'],
      properties: {
        transaction_id: {
          bsonType: 'string',
          description: 'Unique transaction identifier'
        },
        timestamp_start: {
          bsonType: 'date',
          description: 'Transaction start time'
        },
        timestamp_end: {
          bsonType: 'date',
          description: 'Transaction end time'
        },
        source_service: {
          bsonType: 'string',
          description: 'Source service name'
        },
        status: {
          enum: ['success', 'failure', 'timeout', 'cancelled'],
          description: 'Transaction status'
        }
      }
    }
  }
});

// Create indexes
db.audit_logs.createIndex({ timestamp: -1 });
db.audit_logs.createIndex({ event_id: 1 }, { unique: true });
db.audit_logs.createIndex({ source_service: 1, timestamp: -1 });
db.audit_logs.createIndex({ actor_id: 1, timestamp: -1 });
db.audit_logs.createIndex({ correlation_id: 1 });

db.transaction_logs.createIndex({ timestamp_start: -1 });
db.transaction_logs.createIndex({ transaction_id: 1 }, { unique: true });
db.transaction_logs.createIndex({ source_service: 1, status: 1, timestamp_start: -1 });
db.transaction_logs.createIndex({ correlation_id: 1 });

print('Database initialization completed successfully');