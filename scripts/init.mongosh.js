// Run: mongosh "mongodb://127.0.0.1:27017/paysecure_dr" scripts/init.mongosh.js
db.transactions.createIndex({ idempotencyKey: 1 }, { unique: true });
db.transactions.createIndex({ merchantId: 1, createdAt: -1 });
db.incidents.createIndex({ createdAt: -1 });
db.runbooks.createIndex({ rbId: 1 }, { unique: true });
print('Indexes ready');
printjson(db.transactions.getIndexes());
