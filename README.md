# RAG-Powered News Chatbot - Backend

A Node.js backend service that implements a Retrieval-Augmented Generation (RAG) pipeline for answering questions about recent news articles scraped from The Guardian.


## 📋 Features

- **RAG Pipeline**: Complete implementation with news ingestion, embeddings, and response generation
- **News Scraping**: Automated scraping from The Guardian across multiple categories
- **Vector Search**: Semantic search using Qdrant vector database
- **Session Management**: Redis-based session handling with TTL
- **LLM Integration**: Google Gemini API for response generation
- **Production Ready**: Comprehensive error handling, logging, and monitoring

## 🛠 Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js 5.1.0
- **Vector Database**: Qdrant Cloud
- **Cache**: Redis (Upstash)
- **Database**: MySQL (optional)
- **Embeddings**: Jina AI (v3)
- **LLM**: Google Gemini
- **Deployment**: Render

## 📁 Project Structure

```
src/
├── config/          # Database and service configurations
│   ├── database.js
│   ├── redis.js
│   ├── qdrant.js
│   └── environment.js
├── controllers/     # Request handlers
│   └── chatController.js
├── services/        # Business logic
│   ├── ragService.js
│   ├── embeddingService.js
│   ├── vectorStoreService.js
│   ├── geminiService.js
│   ├── sessionService.js
│   └── guardianNewsService.js
├── middleware/      # Express middleware
│   ├── sessionMiddleware.js
│   ├── rateLimitMiddleware.js
│   └── errorMiddleware.js
├── routes/          # API routes
│   ├── chatRoutes.js
│   ├── sessionRoutes.js
│   └── healthRoutes.js
├── utils/           # Utilities
│   ├── logger.js
│   ├── textProcessor.js
│   └── validators.js
├── scripts/         # Setup scripts
│   ├── setupQdrant.js
│   └── ingestNews.js
└── app.js           # Main application
```

## 🔧 Installation & Setup

### Prerequisites

- Node.js 18+
- Redis server (or Upstash account)
- Qdrant instance (or Qdrant Cloud account)
- Jina AI API key
- Google Gemini API key

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/rag-chatbot-backend.git
   cd rag-chatbot-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   cp .env.example .env
   ```
   
   Update `.env` with your credentials:
   ```env
   NODE_ENV=development
   PORT=5000
   
   # External APIs
   JINA_API_KEY=jina_your_api_key_here
   GEMINI_API_KEY=AIza_your_api_key_here
   
   # Databases
   REDIS_URL=redis://localhost:6379
   QDRANT_URL=http://localhost:6333
   QDRANT_API_KEY=your_qdrant_api_key
   
   # Optional MySQL
   MYSQL_HOST=localhost
   MYSQL_PORT=3306
   MYSQL_DATABASE=your_db_name
   MYSQL_USER=username
   MYSQL_PASSWORD=password
   
   # Frontend URL
   FRONTEND_URL=http://localhost:3000
   ```

4. **Start services**
   ```bash
   # Redis (if running locally)
   redis-server
   
   # Qdrant (if running locally)
   docker run -p 6333:6333 qdrant/qdrant
   ```

5. **Initialize database**
   ```bash
   npm run setup-qdrant
   npm run setup-db  # Optional for MySQL
   ```

6. **Ingest news articles**
   ```bash
   npm run ingest-guardian
   ```

7. **Start development server**
   ```bash
   npm run dev
   ```

## 📊 API Endpoints

### Chat Endpoints
- `POST /api/chat/message` - Send a chat message
- `GET /api/chat/history/:sessionId` - Get chat history
- `DELETE /api/chat/session/:sessionId` - Clear session

### Session Endpoints
- `GET /api/session/current` - Get current session info
- `POST /api/session/reset` - Reset current session

### Health & Monitoring
- `GET /api/health` - Basic health check
- `GET /api/health/detailed` - Detailed system status

### Example Request
```bash
curl -X POST http://localhost:5000/api/chat/message \
  -H "Content-Type: application/json" \
  -H "x-session-id: your-session-id" \
  -d '{"message": "What is the latest technology news?"}'
```

## 🔄 RAG Pipeline Flow

1. **News Ingestion**
   ```
   Guardian Articles → Text Processing → Chunking → Jina Embeddings → Qdrant Storage
   ```

2. **Query Processing**
   ```
   User Query → Embedding → Vector Search → Context Retrieval → Gemini LLM → Response
   ```

3. **Session Management**
   ```
   Request → Session Validation → Redis Storage → Response → Session Update
   ```

## 📚 Scripts

```bash
npm start          # Start production server
npm run dev        # Start development server with nodemon
npm run ingest-guardian   # Scrape and ingest Guardian articles
npm run setup-qdrant     # Initialize Qdrant collection
npm run setup-db         # Setup MySQL tables (optional)
npm run test             # Run tests
```

## 🌐 Deployment

### Render Deployment

1. **Connect GitHub repository** to Render
2. **Configure build settings**:
   - Build Command: `npm install`
   - Start Command: `npm start`

3. **Set environment variables** in Render dashboard:
   ```
   NODE_ENV=production
   JINA_API_KEY=your_jina_key
   GEMINI_API_KEY=your_gemini_key
   REDIS_URL=your_redis_url
   QDRANT_URL=your_qdrant_url
   QDRANT_API_KEY=your_qdrant_key
   FRONTEND_URL=your_frontend_url
   ```

4. **Deploy and run ingestion**:
   ```bash
   # Access Render shell and run:
   npm run ingest-guardian
   ```

## 🔍 Monitoring & Debugging

### Health Checks
- Basic: `GET /api/health`
- Detailed: `GET /api/health/detailed` (includes service status)

### Logging
- Production logs available in Render dashboard
- Local development logs to console
- Error logs include stack traces and request context

### Common Issues
- **Cold starts**: Free tier services sleep after 15 minutes
- **Rate limits**: Gemini API may return 503 errors during high demand
- **Memory**: Large news ingestion may require increased memory limits

## 📄 Environment Variables Reference

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `NODE_ENV` | Environment | No | development |
| `PORT` | Server port | No | 5000 |
| `JINA_API_KEY` | Jina embeddings API key | Yes | - |
| `GEMINI_API_KEY` | Google Gemini API key | Yes | - |
| `REDIS_URL` | Redis connection URL | Yes | - |
| `QDRANT_URL` | Qdrant server URL | Yes | - |
| `QDRANT_API_KEY` | Qdrant API key | No | - |
| `FRONTEND_URL` | Frontend URL for CORS | Yes | - |
| `MYSQL_*` | MySQL connection details | No | - |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with proper tests
4. Update documentation
5. Submit a pull request

## 📞 Support

- Create an issue for bugs or feature requests
- Check health endpoint for service status
- Review logs for debugging information

