// MongoDB initialization script for development
// This script runs when the MongoDB container starts for the first time

// Switch to the codiesvibe database
db = db.getSiblingDB('codiesvibe');

// Create a user for the application
db.createUser({
  user: 'codiesvibe_user',
  pwd: 'codiesvibe_password',
  roles: [
    {
      role: 'readWrite',
      db: 'codiesvibe'
    }
  ]
});

// Create initial collections with some sample data
db.createCollection('tools');
db.createCollection('users');
db.createCollection('sessions');

// Insert some sample tools data for development
db.tools.insertMany([
  {
    name: 'GitHub Copilot',
    description: 'AI-powered code completion and generation',
    category: 'Code Completion',
    tags: ['AI', 'Code Generation', 'IDE Extension'],
    pricing: 'Subscription',
    url: 'https://github.com/features/copilot',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'Cursor',
    description: 'AI-first code editor built for productivity',
    category: 'IDE',
    tags: ['AI', 'Code Editor', 'Productivity'],
    pricing: 'Freemium',
    url: 'https://cursor.sh',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'Tabnine',
    description: 'AI assistant for software developers',
    category: 'Code Completion',
    tags: ['AI', 'Code Completion', 'Multi-Language'],
    pricing: 'Freemium',
    url: 'https://www.tabnine.com',
    createdAt: new Date(),
    updatedAt: new Date()
  }
]);

print('Database initialized successfully with sample data');