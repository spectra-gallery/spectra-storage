module.exports = {
  apps: [
    {
      name: 'spectra-storage',
      script: 'npm',
      args: 'run start:prod',
      env: Object.assign(
        { APP_ENV: 'production', NODE_ENV: 'production' },
        require('fs').existsSync('.env.prod') ? require('dotenv').config({ path: '.env.prod' }).parsed : {}
      ),
      instances: 0,
      exec_mode: 'cluster',
      watch: false
    }
  ]
};
