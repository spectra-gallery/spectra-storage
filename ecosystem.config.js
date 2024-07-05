module.exports = {
  apps: [{
    name: 'function-storage',
    exec_mode: 'cluster',
    instances: 0,
    script: './server.js',
    watch: '.',
  }],
};
