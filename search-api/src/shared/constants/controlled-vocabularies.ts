export const CONTROLLED_VOCABULARIES = {
  categories: [
    // Core Technology
    'AI',
    'Machine Learning',
    'Development',
    'Productivity',
    'Analytics',
    'Chatbot',
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

  interface: ['Web', 'Desktop', 'Mobile', 'CLI', 'API', 'IDE', 'IDE Extension'],

  functionality: [
    // Code-related
    'Code Generation',
    'Code Completion',
    'Debugging',
    'Refactoring',
    'Documentation',
    // AI Features
    'AI Chat',
    'AI Assistant',
    'Text Generation',
    'Translation',
    'Image Generation',
    'Video Generation',
    // Development
    'Deployment',
    'Database Setup',
    'Authentication',
    'Collaboration',
    'UI Prototyping',
    // Management
    'Model Management',
    'Local Inference',
    'API Server',
    'Model Customization',
    // Interface
    'Chat Interface',
    'Document RAG',
    'App Generation',

    // niche
    'AWS Support',
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
    'Enterprise',
    'Consulting',
    'Privacy-Focused',
    'Edge Computing',
    'Business',
    'Non-Profit',
    'Venture Capital',
    'Incubators',
    'Content Creation',
  ],

  userTypes: [
    // Technical
    'Developers',
    'Software Engineers',
    'Full-Stack Developers',
    'AI Engineers',
    'Researchers',
    'Privacy Advocates',
    'UX Designers',
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
    'General Users',
    'Professionals',
  ],

  pricingModels: ['Free', 'Freemium', 'Paid'],
  billingPeriods: ['Monthly', 'Yearly'],
};

export const VOCABULARY_MAPPINGS = {
  // Synonym mappings for LLM context
  categories: {
    'Artificial Intelligence': 'AI',
    'Dev Tools': 'Development',
    'Developer Tools': 'Development',
    'Development Platform': 'Development',
  },

  functionality: {
    'Database Management': 'Database Setup',
  },

  deployment: {
    'On-Premise': 'Self-Hosted',
    'On-Premises': 'Self-Hosted',
    Remote: 'Cloud',
  },
};
