const AWS = require('aws-sdk');
const fs = require("fs");


const s3 = new AWS.S3({
    apiVersion: '2006-03-01',
    accessKeyId: process.env.FLEEK_API_KEY,
    secretAccessKey: process.env.FLEEK_API_SECRET,
    endpoint: 'https://storage.philmo.ch/932ea030-a381-40ac-9448-aa48ff5baa09-bucket/',
    region: 'us-east-1',
    s3ForcePathStyle: true
});

const uploadFile = async (req, res) => {
    const file = req.file;
    const fileName = req.file.originalname;
    const timestamp = Date.now();

    // get file path from file object
    const filePath = file.path;
    const fileStream = fs.createReadStream(filePath);

    const params = {
        Bucket: 'spectra',
        Key: `${timestamp}-${fileName}`,
        Body: fileStream,
        ContentType: file.mimetype,
        ACL: 'public-read'
    };

    const request = s3.putObject(params);
    request.send();


    request.on('httpHeaders', (statusCode, headers) => {
       
        const ipfsHash = headers['x-fleek-ipfs-hash'];
        res.status(200).send({
            imageUrl: `${timestamp}-${fileName}`,
            ipfsHash: ipfsHash
        });
        //const ipfsHashV0 = headers['x-fleek-ipfs-hash-v0'];    
    }).send();
};

module.exports = {
    uploadFile
}