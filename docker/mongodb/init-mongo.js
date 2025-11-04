// Switch to the application database
db = db.getSiblingDB('ai_service_logs');

// Create collections
db.createCollection('api_logs');
db.createCollection('error_logs');
db.createCollection('audit_logs');

// Create indexes for api_logs
db.api_logs.createIndex({ timestamp: 1 }, { expireAfterSeconds: 2592000 }); // 30 days TTL
db.api_logs.createIndex({ projectId: 1, timestamp: -1 });
db.api_logs.createIndex({ endpoint: 1, timestamp: -1 });

// Create indexes for error_logs
db.error_logs.createIndex({ timestamp: 1 }, { expireAfterSeconds: 7776000 }); // 90 days TTL
db.error_logs.createIndex({ level: 1, timestamp: -1 });

// Create indexes for audit_logs
db.audit_logs.createIndex({ timestamp: 1 });
db.audit_logs.createIndex({ userId: 1, timestamp: -1 });

// Create application user with readWrite role
db.createUser({
  user: 'ai_service_app',
  pwd: 'app_password_123',
  roles: [
    {
      role: 'readWrite',
      db: 'ai_service_logs'
    }
  ]
});

print('MongoDB initialization complete!');
