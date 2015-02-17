'use strict';

// Production specific configuration
// =================================
module.exports = {
  // Server IP
  ip: process.env.OPENSHIFT_NODEJS_IP || process.env.IP || undefined,
  // Server port
  port: process.env.OPENSHIFT_NODEJS_PORT || process.env.PORT || 8080,
  firebase: {
    url: process.env.SCALPER_CHECKER_FIREBASE_URL || 'https://scalpchecker.firebaseio.com/'
  },
  redis: {
    url: process.env.REDISTOGO_URL || 'redis://127.0.0.1:6379/'
  },
  ebay: {
    devId: process.env.SCALPER_CHECKER_EBAY_DEV_ID,
    appId: process.env.SCALPER_CHECKER_EBAY_APP_ID,
    certId: process.env.SCALPER_CHECKER_EBAY_CERT_ID
  }
};