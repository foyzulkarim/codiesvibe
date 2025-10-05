# Agentic Search API

A standalone Fastify-based API service for AI-powered tool discovery.

## Features

- Natural language query processing with AI reasoning
- In-memory dataset loading from MongoDB
- Comprehensive tool filtering, sorting, and search capabilities
- Confidence scoring and ambiguity resolution
- RESTful API with OpenAPI documentation

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Build and run
npm run build
npm start

# Development mode
npm run dev
```

## API Endpoints

- `GET /health` - Health check
- `POST /query` - Natural language tool search
- `GET /metrics` - Service metrics (optional)

## Configuration

See `.env.example` for all available configuration options.

## Port

This service runs on port 4002.