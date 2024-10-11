const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs"); // For reading files

require("dotenv").config();

const projectId = process.env.INFURA_API_KEY;
const projectSecret = process.env.INFURA_API_SECRET;

const uploadFileToIPFS = async (filePath) => {
  try {
    const formData = new FormData();
    formData.append("file", fs.createReadStream(filePath));

    const response = await axios.post(
      "https://ipfs.infura.io:5001/api/v0/add",
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          Authorization: `Basic ${Buffer.from(
            `${projectId}:${projectSecret}`
          ).toString("base64")}`,
        },
      }
    );

    // Get the hash of the uploaded file
    const fileHash = response.data.Hash;
    console.log("File uploaded to IPFS with hash:", fileHash);

    // Now pin the file using its hash
    await pinFileToIPFS(fileHash);

    return fileHash;
  } catch (error) {
    console.error("Error uploading file to IPFS:", error);
  }
};

async function pinFileToIPFS(fileHash) {
  try {
    const response = await axios.post(
      `https://ipfs.infura.io:5001/api/v0/pin/add?arg=${fileHash}`,
      null,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${projectId}:${projectSecret}`
          ).toString("base64")}`,
        },
      }
    );

    console.log("File pinned successfully:", response.data);
  } catch (error) {
    console.error("Error pinning file to IPFS:", error);
  }
}

module.exports = {
  uploadFileToIPFS,
};
