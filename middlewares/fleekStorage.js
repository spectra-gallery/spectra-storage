const { FleekSdk, PersonalAccessTokenService } = require('@fleek-platform/sdk/node');

const fs = require('fs');
const path = require('path');

const personalAccessTokenService = new PersonalAccessTokenService({
  personalAccessToken: 'pat_kCWVMFxzfWs3Z63wyDmh',
  projectId: 'cm1zy3dl40000v8kq1u5sp2bq', // Optional
});


const fleekSdk = new FleekSdk({
    accessTokenService: personalAccessTokenService,
  });


const uploadFile = async (fileName, filePath, mimeType) => {

    
    const _filePath = path.resolve(filePath);
    const blob = fs.readFileSync(_filePath);
    const file = new Blob([blob], { type: mimeType });
  

    const fileLike = {
        name: fileName,
        stream: () => file.stream(),
    };
        

      
      const onUploadProgress = ({ loadedSize, totalSize }) => {
        const startedTime = Date.now();
        if (loadedSize > 0) {
          const currentTime = Date.now();
          // Calculate elapsed time in milliseconds
          const elapsedMillis = currentTime - startedTime;
      
          const bytesPerSecond = loadedSize / (elapsedMillis / 1000);
          const remainingBytes = totalSize - loadedSize;
          const remainingSeconds = remainingBytes / bytesPerSecond;
          const remainingTime = remainingSeconds * 1000;
      
          
        }
      };

      const result = await fleekSdk.storage().uploadFile({
        file: fileLike,
        onUploadProgress,
      });

      return result;
};

const listFile = async () => {
    const result = await fleekSdk.storage().list();
    console.log(result);
};

// listFile();

module.exports = {
    uploadFile,
   // listFile
  };
