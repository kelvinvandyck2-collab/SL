# Spring Legal Consultancy - Node.js Backend

A Node.js Express backend for Spring Legal Consultancy website with PostgreSQL database and email notifications.

## Features

- **Contact Form API**: Handle contact submissions with email notifications
- **PostgreSQL Database**: Robust data storage with connection pooling
- **Email Notifications**: Automatic email sending for contact form submissions
- **Security**: CORS, rate limiting, helmet security headers
- **Validation**: Input validation for contact form data
- **Error Handling**: Comprehensive error handling and logging
- **Static File Serving**: Serve HTML, CSS, JS, and images

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Copy `.env.example` to `.env` and configure:

```env
# Database Configuration
DATABASE_URL=postgresql://postgres:Godlovesme1@localhost:5432/spring_legal_db

# Email Configuration
SMTP_SERVER=smtp.hostinger.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USERNAME=support@winningedgeinvestment.com
SMTP_PASSWORD=Brutality@54
FROM_EMAIL=support@winningedgeinvestment.com
TO_EMAIL=support@winningedgeinvestment.com

# Application Configuration
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3001,http://localhost:8000
PORT=3001
```

### 3. Database Setup

Create PostgreSQL database and user:

```sql
CREATE DATABASE spring_legal_db;
CREATE USER postgres WITH PASSWORD 'Godlovesme1';
GRANT ALL PRIVILEGES ON DATABASE spring_legal_db TO postgres;
```

### 4. Run Application

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

## API Endpoints

### Contact Form
- `POST /api/v1/contact` - Create new contact submission
- `GET /api/v1/contact` - Get all contacts (paginated)
- `GET /api/v1/contact/:id` - Get specific contact
- `PUT /api/v1/contact/:id/mark-read` - Mark contact as read
- `DELETE /api/v1/contact/:id` - Delete contact

### System
- `GET /` - API status
- `GET /health` - Health check

## Database Schema

### Contacts Table
```sql
CREATE TABLE contacts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    subject VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_read BOOLEAN DEFAULT FALSE
);
```

## Email Configuration

The backend sends email notifications through:
- **SMTP Server**: smtp.hostinger.com
- **Port**: 465
- **Secure**: true (SSL/TLS)
- **From**: support@winningedgeinvestment.com
- **To**: support@winningedgeinvestment.com

## Security Features

- **CORS**: Configured for specified origins
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Input Validation**: Email format validation
- **Security Headers**: Helmet.js for security headers
- **SQL Injection Protection**: Parameterized queries

## Development vs Production

**Development:**
- Detailed error logging
- CORS allows localhost origins
- SQLite database support (for testing)

**Production:**
- Secure SSL connections
- Restricted CORS origins
- Connection pooling
- Error logging only

## Testing

```bash
# Test contact form submission
curl -X POST http://localhost:3001/api/v1/contact \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "subject": "Legal Consultation",
    "message": "I need help with corporate law matters"
  }'
```

## Deployment Notes

1. Set `NODE_ENV=production` in production
2. Use PostgreSQL connection pooling
3. Configure reverse proxy (nginx/Apache) for SSL
4. Set up proper CORS origins
5. Use process manager (PM2) for production

## Monitoring

The application includes:
- Request logging with timestamps
- Health check endpoint
- Error handling and reporting
- Graceful shutdown handling
