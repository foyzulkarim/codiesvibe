export const CONTROLLED_VOCABULARIES = {
  categories: [
    // Core Technology
    'AI',
    'Machine Learning',
    'Development',
    'Productivity',
    'Analytics',
    // Tool Types
    'Code Editor',
    'IDE',
    'App Builder',
    'No-Code',
    'Cloud IDE',
    'Desktop App',
    // Domains
    'Local LLM',
    'Privacy',
    'Open Source',
    'Collaboration',
    'Deployment',
    // Specializations
    'Full-Stack',
    'Rapid Prototyping',
    'GUI',
    'Offline',
  ],
  
  interface: ['Web', 'Desktop', 'Mobile', 'CLI', 'API', 'IDE'],
  
  functionality: [
    // Code-related
    'Code Generation',
    'Code Completion',
    'Debugging',
    'Refactoring',
    // AI Features
    'AI Chat',
    'AI Assistant',
    'Text Generation',
    'Translation',
    // Development
    'Deployment',
    'Database Setup',
    'Authentication',
    'Collaboration',
    // Management
    'Model Management',
    'Local Inference',
    'API Server',
    'Model Customization',
    // Interface
    'Chat Interface',
    'Document RAG',
    'App Generation',
  ],
  
  deployment: ['Cloud', 'Local', 'Self-Hosted'],
  
  industries: [
    'Technology',
    'Software Development',
    'Startups',
    'Education',
    'Research',
    'Remote Work',
    'Innovation',
    'Small Business',
    'Consulting',
    'Privacy-Focused',
    'Edge Computing',
    'Business',
    'Non-Profit',
    'Venture Capital',
    'Incubators',
  ],
  
  userTypes: [
    // Technical
    'Developers',
    'Software Engineers',
    'Full-Stack Developers',
    'AI Engineers',
    'Researchers',
    'Privacy Advocates',
    // Business
    'Entrepreneurs',
    'Product Managers',
    'Non-Technical Founders',
    'Rapid Prototypers',
    'Business Owners',
    'Startup Teams',
    // General
    'Students',
    'Teachers',
    'Remote Teams',
    'Non-Technical Users',
    'Freelancers',
    'Consultants',
  ],
};

export const VOCABULARY_MAPPINGS = {
  // Synonym mappings for LLM context
  categories: {
    'Artificial Intelligence': 'AI',
    'Dev Tools': 'Development',
    'Developer Tools': 'Development',
  },
  
  deployment: {
    'On-Premise': 'Self-Hosted',
    'On-Premises': 'Self-Hosted',
    Remote: 'Cloud',
  },
};
