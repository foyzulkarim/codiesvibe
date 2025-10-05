# Docker Compose Configuration for Search API with LangGraph and Ollama

## docker-compose.search-api.yml

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:7.0
    container_name: mongodb-search
    restart: unless-stopped
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password
      MONGO_INITDB_DATABASE: toolsdb
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    networks:
      - search-network

  ollama:
    image: ollama/ollama:latest
    container_name: ollama-search
    restart: unless-stopped
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    environment:
      - OLLAMA_HOST=0.0.0.0
    networks:
      - search-network
    # Uncomment to pull models on startup
    # command: >
    #   sh -c "ollama serve & 
    #          sleep 10 && 
    #          ollama pull llama3.1 && 
    #          ollama pull mistral && 
    #          wait"

  search-api:
    build:
      context: .
      dockerfile: Dockerfile.search
    container_name: search-api
    restart: unless-stopped
    ports:
      - "4002:4002"
    environment:
      - NODE_ENV=production
      - PORT=4002
      - MONGO_URI=mongodb://admin:password@mongodb:27017/toolsdb?authSource=admin
      - DB_NAME=toolsdb
      - COLLECTION_NAME=tools
      - OLLAMA_URL=http://ollama:11434
      - OLLAMA_MODEL=llama3.1
      - TEMPERATURE=0.7
      - DEFAULT_LIMIT=20
      - MAX_ITERATIONS=10
      - CONFIDENCE_THRESHOLD=0.3
      - ENABLE_REASONING_EXPLANATION=true
    depends_on:
      - mongodb
      - ollama
    networks:
      - search-network
    volumes:
      - ./logs:/app/logs

volumes:
  mongodb_data:
  ollama_data:

networks:
  search-network:
    driver: bridge
```

## Dockerfile.search

```dockerfile
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Create logs directory
RUN mkdir -p logs

# Expose port
EXPOSE 4002

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:4002/health || exit 1

# Start the application
CMD ["npm", "start"]
```

## Environment Variables

Create a `.env` file in the search-api directory with the following variables:

```env
# Database Configuration
MONGO_URI=mongodb://admin:password@localhost:27017/toolsdb?authSource=admin
DB_NAME=toolsdb
COLLECTION_NAME=tools

# Server Configuration
PORT=4002
NODE_ENV=development

# LLM Configuration
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1
TEMPERATURE=0.7

# Search Configuration
DEFAULT_LIMIT=20
MAX_ITERATIONS=10
CONFIDENCE_THRESHOLD=0.3
ENABLE_REASONING_EXPLANATION=true
```

## Setup Instructions

1. **Install Docker and Docker Compose** if not already installed

2. **Create the necessary files**:
   - `docker-compose.search-api.yml`
   - `Dockerfile.search` (in the root directory)
   - `.env` (in the search-api directory)

3. **Build and start the services**:
   ```bash
   docker-compose -f docker-compose.search-api.yml up --build
   ```

4. **Pull Ollama models** (if not using the automatic pull in the compose file):
   ```bash
   docker exec -it ollama-search ollama pull llama3.1
   docker exec -it ollama-search ollama pull mistral
   ```

5. **Test the service**:
   ```bash
   curl http://localhost:4002/health
   ```

6. **Test a query**:
   ```bash
   curl -X POST http://localhost:4002/query \
     -H "Content-Type: application/json" \
     -d '{
       "query": "show me free AI tools for coding",
       "limit": 10
     }'
   ```

## Development Mode

For local development, you can run the services individually:

1. **Start MongoDB**:
   ```bash
   docker run -d --name mongodb-dev -p 27017:27017 -e MONGO_INITDB_ROOT_USERNAME=admin -e MONGO_INITDB_ROOT_PASSWORD=password mongo:7.0
   ```

2. **Start Ollama**:
   ```bash
   docker run -d --name ollama-dev -p 11434:11434 -v ollama_data:/root/.ollama ollama/ollama
   ```

3. **Pull models**:
   ```bash
   docker exec -it ollama-dev ollama pull llama3.1
   ```

4. **Run the search API**:
   ```bash
   cd search-api
   npm install
   npm run dev
   ```

## Monitoring and Logs

- **View logs for all services**:
  ```bash
  docker-compose -f docker-compose.search-api.yml logs -f
  ```

- **View logs for a specific service**:
  ```bash
  docker-compose -f docker-compose.search-api.yml logs -f search-api
  ```

- **Check service health**:
  ```bash
  curl http://localhost:4002/health
  ```

## Troubleshooting

1. **If Ollama is slow to respond**:
   - Ensure you have enough RAM (at least 8GB recommended)
   - Try using a smaller model like `mistral` instead of `llama3.1`

2. **If the search API fails to connect to MongoDB**:
   - Check that MongoDB is running: `docker ps | grep mongodb`
   - Verify the connection string in the environment variables

3. **If the search API fails to connect to Ollama**:
   - Check that Ollama is running: `docker ps | grep ollama`
   - Verify the Ollama URL in the environment variables
   - Test Ollama directly: `curl http://localhost:11434/api/tags`

4. **If the search API crashes**:
   - Check the logs: `docker-compose logs search-api`
   - Verify that all required environment variables are set
   - Check that the models are pulled in Ollama

## Production Considerations

1. **Security**:
   - Change default passwords
   - Use environment variables for sensitive data
   - Consider using Docker secrets for production

2. **Performance**:
   - Adjust resource limits in Docker Compose
   - Consider using a separate MongoDB instance for production
   - Monitor resource usage and scale as needed

3. **Reliability**:
   - Implement health checks and restart policies
   - Consider using a container orchestration system like Kubernetes
   - Set up monitoring and alerting

4. **Backup**:
   - Implement regular MongoDB backups
   - Consider backing up Ollama models if using custom models
