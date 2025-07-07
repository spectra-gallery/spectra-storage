module.exports = {
  apps: [{
    name: 'spectra-storage',
    exec_mode: 'cluster',
    instances: 0,
    script: './server.js',
    watch: '.',
  }],
};
