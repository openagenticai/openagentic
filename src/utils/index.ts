// =============================================================================
// UTILITY EXPORTS
// =============================================================================

// S3 Upload Utility
export * from './s3';

// Re-export commonly used functions with shorter names
export { 
  uploadFileToS3 as uploadFile,
  uploadImageToS3 as uploadImage,
  uploadAudioToS3 as uploadAudio,
  uploadVideoToS3 as uploadVideo,
  uploadHtmlToS3 as uploadHtml,
  initializeS3 as initS3,
  testS3Connection as testS3,
} from './s3';