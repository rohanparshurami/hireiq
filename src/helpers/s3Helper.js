const { PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { s3Client, S3_BUCKET } = require('../config/s3');

async function uploadFile(file, folder) {
  const s3Key = folder + '/' + Date.now() + '-' + file.originalname;

  const uploadCommand = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: s3Key,
    Body: file.buffer,
    ContentType: file.mimetype
  });

  await s3Client.send(uploadCommand);

  return {
    originalName: file.originalname,
    s3Key: s3Key,
    s3Bucket: S3_BUCKET,
    mimeType: file.mimetype,
    size: file.size
  };
}

async function getFileUrl(fileData) {
  const getCommand = new GetObjectCommand({
    Bucket: fileData.s3Bucket,
    Key: fileData.s3Key
  });

  const url = await getSignedUrl(s3Client, getCommand, { expiresIn: 900 });

  return {
    originalName: fileData.originalName,
    mimeType: fileData.mimeType,
    size: fileData.size,
    url: url
  };
}

async function getFileUrls(filesArray) {
  return await Promise.all(filesArray.map(function(file) {
    return getFileUrl(file);
  }));
}

module.exports = { uploadFile: uploadFile, getFileUrl: getFileUrl, getFileUrls: getFileUrls };