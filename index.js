const express = require('express');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');
const nodemailer = require('nodemailer');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');
const session = require('express-session');
const svgCaptcha = require('svg-captcha');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Database configuration
const dbConfig = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'spring_legal_db',
      password: process.env.DB_PASSWORD || 'Godlovesme1@',
      port: process.env.DB_PORT || 5432,
    };
const pool = new Pool(dbConfig);

// Initialize database table
pool.query(`
  CREATE TABLE IF NOT EXISTS contacts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    subject VARCHAR(255),
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`).then(() => console.log('Database initialized'))
  .catch(err => console.error('Database initialization error:', err));

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://maps.google.com", "https://maps.googleapis.com"],
      scriptSrcAttr: ["'unsafe-inline'"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      frameSrc: ["'self'", "https://maps.google.com", "https://www.google.com"],
      connectSrc: ["'self'", "https://maps.google.com", "https://maps.googleapis.com"]
    },
  },
}));
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3001'],
  credentials: true
}));

// Rate limiting (disabled for development)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased limit for development
  message: 'Too many requests from this IP, please try again later.',
  skip: (req) => {
    // Skip rate limiting for development
    return process.env.NODE_ENV !== 'production';
  }
});
app.use(limiter);

// Session middleware for captcha
app.use(session({
  secret: process.env.SECRET_KEY || 'your-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { 
    secure: process.env.NODE_ENV === 'production', // Set to true if using https
    maxAge: 60000 * 10 // 10 minutes
  }
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Email configuration (using nodemailer v8+)
let transporter;
try {
  if (nodemailer.createTransport) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_SERVER,
      port: parseInt(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USERNAME,
        pass: process.env.SMTP_PASSWORD
      }
    });
  } else {
    // Fallback for older versions
    transporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USERNAME,
        pass: process.env.SMTP_PASSWORD
      }
    });
  }
} catch (error) {
  console.log('Email configuration error:', error.message);
  transporter = null;
}

// Verify email connection on startup
if (transporter) {
  transporter.verify((error) => {
    if (error) {
      console.warn('⚠️  Email server connection failed:', error.message);
      console.warn('   (Emails will not be sent. Check your .env file)');
      transporter = null;
    }
  });
}

// Middleware for requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// API Routes
app.get('/api', (req, res) => {
  res.json({ 
    message: 'Spring Legal Consultancy API', 
    version: '1.0.0',
    status: 'running'
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Captcha route
app.get('/api/v1/captcha', (req, res) => {
  const captcha = svgCaptcha.create({
    size: 5,
    noise: 2,
    color: true,
    background: '#f0f0f0'
  });
  req.session.captcha = captcha.text;
  res.type('svg');
  res.status(200).send(captcha.data);
});

// Contact form submission
app.post('/api/v1/contact', async (req, res) => {
  try {
    const { name, email, phone, subject, message, type_the_word } = req.body;

    // Validation
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: 'Name, email, subject, and message are required' });
    }

    // Captcha Validation
    if (!req.session.captcha || req.session.captcha.toLowerCase() !== type_the_word?.toLowerCase()) {
      return res.status(400).json({ error: 'Invalid captcha code. Please try again.' });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    // Send email notification
    if (transporter) {
      const mailOptions = {
        from: process.env.FROM_EMAIL,
        to: process.env.TO_EMAIL,
        subject: `New Contact Form Submission: ${subject}`,
        html: `
          <h2>New Contact Form Submission</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
          <p><strong>Subject:</strong> ${subject}</p>
          <p><strong>Message:</strong></p>
          <p>${message.replace(/\n/g, '<br>')}</p>
          <hr>
          <p><em>This message was sent from the Spring Legal Consultancy website contact form.</em></p>
        `
      };

      await transporter.sendMail(mailOptions);
    }

    // Store in database
    const insertQuery = `
      INSERT INTO contacts (name, email, phone, subject, message)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const result = await pool.query(insertQuery, [name, email, phone, subject, message]);

    res.status(201).json({ 
      success: true, 
      message: 'Contact form submitted successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Static file serving with clean URLs
app.use(express.static('.', {
  setHeaders: (res, filePath) => {
    // Prevent caching during development
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  }
}));

// Clean URL routes (without .html extension)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/about', (req, res) => {
  res.sendFile(path.join(__dirname, 'about.html'));
});

app.get('/contact', (req, res) => {
  res.sendFile(path.join(__dirname, 'contact.html'));
});

app.get('/attorney-details', (req, res) => {
  res.sendFile(path.join(__dirname, 'attorney-details.html'));
});

app.get('/our-attorneys', (req, res) => {
  res.sendFile(path.join(__dirname, 'our-attorneys.html'));
});

app.get('/our-history', (req, res) => {
  res.sendFile(path.join(__dirname, 'our-history.html'));
});

app.get('/our-pricing', (req, res) => {
  res.sendFile(path.join(__dirname, 'our-pricing.html'));
});

app.get('/testimonial', (req, res) => {
  res.sendFile(path.join(__dirname, 'testimonial.html'));
});

app.get('/faq', (req, res) => {
  res.sendFile(path.join(__dirname, 'faq.html'));
});

app.get('/accordion', (req, res) => {
  res.sendFile(path.join(__dirname, 'accordion.html'));
});

app.get('/achievements', (req, res) => {
  res.sendFile(path.join(__dirname, 'achievements.html'));
});

app.get('/corporate-commercial-law', (req, res) => {
  res.sendFile(path.join(__dirname, 'corporate-commercial-law.html'));
});

app.get('/dispute-resolution-litigation', (req, res) => {
  res.sendFile(path.join(__dirname, 'dispute-resolution-litigation.html'));
});

app.get('/private-client-family', (req, res) => {
  res.sendFile(path.join(__dirname, 'private-client-family.html'));
});

app.get('/property-real-estate', (req, res) => {
  res.sendFile(path.join(__dirname, 'property-real-estate.html'));
});

app.get('/specialist-advisory-compliance', (req, res) => {
  res.sendFile(path.join(__dirname, 'specialist-advisory-compliance.html'));
});

app.get('/case-study-details', (req, res) => {
  res.sendFile(path.join(__dirname, 'case-study-details.html'));
});

app.get('/404-page', (req, res) => {
  res.sendFile(path.join(__dirname, '404-page.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Spring Legal Consultancy Full-Stack Server running on port ${PORT}`);
  console.log(`📊 API: http://localhost:${PORT}/api/v1/contact`);
  console.log(`🌐 Website: http://localhost:${PORT}`);
  console.log(`📝 Clean URLs (no .html extension)`);
  console.log(`📧 Email: ${transporter ? 'Configured' : 'Not configured'}`);
  console.log(`\n✅ Ready to serve both frontend and API!`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});
