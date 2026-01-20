module.exports = {
  apps: [{
    name: 'spectra-storage',
    exec_mode: 'cluster',
    instances: 0,
    script: 'npm',
    args: 'run start:prod',
    watch: false,
    env: {
      NODE_ENV: 'production',
      PORT: 6601,
      CLIENT_URL: 'https://spectra.gallery',
      BASE_URL: 'https://storage.spectra.gallery/',
      BACKEND_API_URL: 'https://api.spectra.gallery',
      RP_ID: 'spectra.gallery',
      WEBAUTHN_ORIGIN: 'https://storage.spectra.gallery',
      // MAIL_HOST: 'mail.infomaniak.com',
      // MAIL_PORT: '465',
      // ADMIN_EMAIL: 'ops@spectra.gallery',
      // MAIL_PASSWORD: 'REDACTED',
    },
    env_staging: {
      APP_ENV: 'staging',
      NODE_ENV: 'production'
    },
    env_development: {
      APP_ENV: 'dev',
      NODE_ENV: 'development'
    }
  }],
};
