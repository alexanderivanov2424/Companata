// Adapted from https://stackoverflow.com/a/61698382

const createProxyMiddleware = require('http-proxy-middleware');

module.exports = (app) => {
  app.use(
    createProxyMiddleware('/socket', {
      target: 'http://localhost:8000',
      changeOrigin: true,
      ws: true, 
      logLevel: 'debug',
    })
  );
};
