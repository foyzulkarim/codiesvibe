import * as dotenv from 'dotenv';

dotenv.config();

interface AgenticConfig {
  PORT: number;
  DEFAULT_LIMIT: number;
  MAX_ITERATIONS: number;
  MONGO_URI: string;
  DB_NAME: string;
  COLLECTION_NAME: string;
  OLLAMA_URL: string;
  OLLAMA_MODEL: string;
  TEMPERATURE: number;
  CONFIDENCE_THRESHOLD: number;
  ENABLE_REASONING_EXPLANATION: boolean;
}

const config: AgenticConfig = {
  PORT: parseInt(process.env.PORT || '4002', 10),
  DEFAULT_LIMIT: parseInt(process.env.DEFAULT_LIMIT || '20', 10),
  MAX_ITERATIONS: parseInt(process.env.MAX_ITERATIONS || '3', 3),
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017',
  DB_NAME: process.env.DB_NAME || 'toolsdb',
  COLLECTION_NAME: process.env.COLLECTION_NAME || 'tools',
  OLLAMA_URL: process.env.OLLAMA_URL || 'http://localhost:11434',
  OLLAMA_MODEL: process.env.OLLAMA_MODEL || 'llama2',
  TEMPERATURE: parseFloat(process.env.TEMPERATURE || '0.7'),
  CONFIDENCE_THRESHOLD: parseFloat(process.env.CONFIDENCE_THRESHOLD || '0.3'),
  ENABLE_REASONING_EXPLANATION: process.env.ENABLE_REASONING_EXPLANATION === 'true' || true,
};

export default config;