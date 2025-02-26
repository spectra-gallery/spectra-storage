const axiosInstance = require('./axiosInstance');

const ecosystemKeyManager = require('./ecosystemKeyManager');

// generate a new key pair to autenticate the application (storage api) with the backend
// the public key will be stored in the backend and the private key will be stored in the application
// a key is generated and send t

function storageRegister (data) {
  return axiosInstance.post('/api/storage/request-token', data);
}