'use strict';
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || 'http://127.0.0.1:5173' }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/publications', require('./routes/publications'));
app.use('/api/subscriptions', require('./routes/subscriptions'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/university', require('./routes/university'));
app.use('/api/marketplace', require('./routes/marketplace'));
app.use('/api/requests', require('./routes/requests'));
app.use('/api', require('./routes/general'));
app.use((req, res) => res.status(404).json({ error: 'Not found', code: 'not_found' }));
app.use((err, req, res, next) => {
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({
    error: status >= 500 && !(err instanceof require('./lib/helpers').ApiError) ? 'Something went wrong' : err.message,
    code: err.code || null,
    ...(err.extra || {}),
  });
});
module.exports = app;
