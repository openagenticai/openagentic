import { S3Client, PutObjectCommand, type PutObjectCommandInput } from '@aws-sdk/client-s3';

// =============================================================================
// TYPES AND INTERFACES
// =============================================================================

export interface S3Config {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucketName: string;
}

export interface UploadResult {
  success: boolean;
  url: string;
  key: string;
  bucket: string;
  contentType: string;
  size: number;
  uploadedAt: string;
  error?: string;
}

export interface UploadOptions {
  directory?: S3Directory;
  description?: string;
  metadata?: Record<string, string>;
  cacheControl?: string;
  contentEncoding?: string;
}

export enum FileType {
  IMAGE = 'image',
  AUDIO = 'audio',
  VIDEO = 'video',
  DOCUMENT = 'document',
  WEBSITE = 'website',
  GENERIC = 'upload'
}

const DIRECTORY_PREFIX = 'openagentic/';
export enum S3Directory {
  IMAGES = DIRECTORY_PREFIX + 'images',
  AUDIO = DIRECTORY_PREFIX + 'audio', 
  VIDEOS = DIRECTORY_PREFIX + 'videos',
  DOCUMENTS = DIRECTORY_PREFIX + 'documents',
  WEBSITES = DIRECTORY_PREFIX + 'websites',
  UPLOADS = DIRECTORY_PREFIX + 'uploads'
}

// =============================================================================
// CONFIGURATION AND VALIDATION
// =============================================================================

let s3Client: S3Client | null = null;
let s3Config: S3Config | null = null;

/**
 * Validate S3 configuration from environment variables
 * @throws {Error} If required environment variables are missing
 */
export function validateS3Config(): void {
  const requiredVars = [
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY', 
    'AWS_REGION',
    'S3_BUCKET_NAME'
  ];

  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please ensure all AWS S3 configuration variables are set:\n' +
      '- AWS_ACCESS_KEY_ID\n' +
      '- AWS_SECRET_ACCESS_KEY\n' +
      '- AWS_REGION\n' +
      '- S3_BUCKET_NAME'
    );
  }

  s3Config = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    region: process.env.AWS_REGION!,
    bucketName: process.env.S3_BUCKET_NAME!,
  };

  // Initialize S3 client
  s3Client = new S3Client({
    region: s3Config.region,
    credentials: {
      accessKeyId: s3Config.accessKeyId,
      secretAccessKey: s3Config.secretAccessKey,
    },
  });
}

/**
 * Get S3 client instance, initializing if necessary
 * @returns {S3Client} Configured S3 client
 */
function getS3Client(): S3Client {
  if (!s3Client || !s3Config) {
    validateS3Config();
  }
  return s3Client!;
}

/**
 * Get S3 configuration, validating if necessary
 * @returns {S3Config} S3 configuration object
 */
function getS3Config(): S3Config {
  if (!s3Config) {
    validateS3Config();
  }
  return s3Config!;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Sanitize filename by removing or replacing invalid characters
 * @param {string} input - Input filename
 * @returns {string} Sanitized filename
 */
export function sanitizeFilename(input: string): string {
  if (!input || typeof input !== 'string') {
    throw new Error('Filename must be a non-empty string');
  }

  return input
    .trim()
    // Remove or replace invalid characters
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
    // Replace spaces with underscores
    .replace(/\s+/g, '_')
    // Remove multiple consecutive underscores
    .replace(/_+/g, '_')
    // Remove leading/trailing underscores
    .replace(/^_+|_+$/g, '')
    // Limit length
    .substring(0, 200)
    // Ensure it's not empty after sanitization
    || 'unnamed_file';
}

/**
 * Generate a unique filename with timestamp and optional prefix
 * @param {string} prompt - Description or base name
 * @param {string} extension - File extension (with or without dot)
 * @param {string} prefix - Optional prefix for the filename
 * @returns {string} Generated filename
 */
export function generateFileName(
  prompt: string,
  extension: string,
  prefix?: string
): string {
  if (!prompt || !extension) {
    throw new Error('Prompt and extension are required');
  }

  const timestamp = new Date().toISOString()
    .replace(/[:.]/g, '-')
    .replace(/T/, '_')
    .replace(/Z/, '');
  
  const sanitizedPrompt = sanitizeFilename(prompt)
    .toLowerCase()
    .substring(0, 50); // Limit prompt length
  
  const cleanExtension = extension.startsWith('.') ? extension : `.${extension}`;
  const prefixPart = prefix ? `${sanitizeFilename(prefix)}_` : '';
  
  // Generate random suffix for uniqueness
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  
  return `${prefixPart}${sanitizedPrompt}_${timestamp}_${randomSuffix}${cleanExtension}`;
}

/**
 * Generate filename specifically for images
 * @param {string} prompt - Image description
 * @param {string} extension - Image extension (default: 'png')
 * @returns {string} Generated image filename
 */
export function generateImageFileName(prompt: string, extension = 'png'): string {
  return generateFileName(prompt, extension, 'img');
}

/**
 * Generate filename specifically for audio files
 * @param {string} prompt - Audio description
 * @param {string} extension - Audio extension (default: 'mp3')
 * @returns {string} Generated audio filename
 */
export function generateAudioFileName(prompt: string, extension = 'mp3'): string {
  return generateFileName(prompt, extension, 'audio');
}

/**
 * Generate filename specifically for video files
 * @param {string} prompt - Video description
 * @param {string} extension - Video extension (default: 'mp4')
 * @returns {string} Generated video filename
 */
export function generateVideoFileName(prompt: string, extension = 'mp4'): string {
  return generateFileName(prompt, extension, 'video');
}

/**
 * Generate filename specifically for HTML files
 * @param {string} prompt - HTML description
 * @param {string} extension - HTML extension (default: 'html')
 * @returns {string} Generated HTML filename
 */
export function generateHtmlFileName(prompt: string, extension = 'html'): string {
  return generateFileName(prompt, extension, 'page');
}

/**
 * Determine content type from file extension
 * @param {string} extension - File extension
 * @returns {string} MIME content type
 */
export function getContentTypeFromExtension(extension: string): string {
  const cleanExt = extension.toLowerCase().replace('.', '');
  
  const contentTypes: Record<string, string> = {
    // Images
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'bmp': 'image/bmp',
    'ico': 'image/x-icon',
    
    // Audio
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'ogg': 'audio/ogg',
    'flac': 'audio/flac',
    'aac': 'audio/aac',
    'm4a': 'audio/mp4',
    
    // Video
    'mp4': 'video/mp4',
    'avi': 'video/x-msvideo',
    'mov': 'video/quicktime',
    'wmv': 'video/x-ms-wmv',
    'flv': 'video/x-flv',
    'webm': 'video/webm',
    'mkv': 'video/x-matroska',
    
    // Documents
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'ppt': 'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'txt': 'text/plain',
    'rtf': 'application/rtf',
    
    // Web
    'html': 'text/html',
    'htm': 'text/html',
    'css': 'text/css',
    'js': 'application/javascript',
    'json': 'application/json',
    'xml': 'application/xml',
    
    // Archives
    'zip': 'application/zip',
    'tar': 'application/x-tar',
    'gz': 'application/gzip',
    'rar': 'application/vnd.rar',
    '7z': 'application/x-7z-compressed',
    
    // Other
    'bin': 'application/octet-stream',
  };
  
  return contentTypes[cleanExt] || 'application/octet-stream';
}

/**
 * Validate file size against reasonable limits
 * @param {number} size - File size in bytes
 * @param {FileType} fileType - Type of file being uploaded
 * @throws {Error} If file size exceeds limits
 */
function validateFileSize(size: number, fileType: FileType): void {
  const sizeLimits: Record<FileType, number> = {
    [FileType.IMAGE]: 50 * 1024 * 1024,     // 50MB
    [FileType.AUDIO]: 100 * 1024 * 1024,    // 100MB
    [FileType.VIDEO]: 500 * 1024 * 1024,    // 500MB
    [FileType.DOCUMENT]: 25 * 1024 * 1024,  // 25MB
    [FileType.WEBSITE]: 10 * 1024 * 1024,   // 10MB
    [FileType.GENERIC]: 100 * 1024 * 1024,  // 100MB
  };

  const limit = sizeLimits[fileType];
  if (size > limit) {
    const limitMB = Math.round(limit / (1024 * 1024));
    const sizeMB = Math.round(size / (1024 * 1024));
    throw new Error(
      `File size (${sizeMB}MB) exceeds limit for ${fileType} files (${limitMB}MB)`
    );
  }
}

// =============================================================================
// CORE UPLOAD FUNCTIONS
// =============================================================================

/**
 * Generic file upload function to S3
 * @param {Buffer} buffer - File buffer
 * @param {string} fileName - Name of the file
 * @param {string} contentType - MIME content type
 * @param {string} directory - S3 directory/folder
 * @param {string} description - Optional description for metadata
 * @returns {Promise<string>} Public URL of uploaded file
 */
export async function uploadFileToS3(
  buffer: Buffer,
  fileName: string,
  contentType: string,
  directory = S3Directory.UPLOADS,
  description?: string
): Promise<string> {
  try {
    // Validate inputs
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
      throw new Error('Invalid or empty buffer provided');
    }

    if (!fileName || typeof fileName !== 'string') {
      throw new Error('Valid filename is required');
    }

    if (!contentType || typeof contentType !== 'string') {
      throw new Error('Valid content type is required');
    }

    // Validate file size (generic limit)
    validateFileSize(buffer.length, FileType.GENERIC);

    // Sanitize filename
    const sanitizedFileName = sanitizeFilename(fileName);
    
    // Construct S3 key (path)
    const key = `${directory}/${sanitizedFileName}`;
    
    // Get S3 configuration
    const config = getS3Config();
    const client = getS3Client();

    // Prepare upload parameters
    const uploadParams: PutObjectCommandInput = {
      Bucket: config.bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000', // 1 year cache
      Metadata: {
        'upload-timestamp': new Date().toISOString(),
        'original-name': fileName,
        'file-size': buffer.length.toString(),
        ...(description && { description }),
      },
    };

    // Execute upload
    console.log(`Uploading file to S3: ${key} (${buffer.length} bytes)`);
    const command = new PutObjectCommand(uploadParams);
    await client.send(command);

    // Construct public URL
    const publicUrl = `https://${config.bucketName}.s3.${config.region}.amazonaws.com/${key}`;
    
    console.log(`✅ File uploaded successfully: ${publicUrl}`);
    return publicUrl;

  } catch (error) {
    console.error('❌ S3 upload failed:', error);
    throw new Error(
      `S3 upload failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Upload image to S3 with image-specific handling
 * @param {Buffer} imageBuffer - Image file buffer
 * @param {string} fileName - Image filename
 * @param {string} contentType - Image content type (auto-detected if not provided)
 * @param {string} description - Optional description
 * @returns {Promise<string>} Public URL of uploaded image
 */
export async function uploadImageToS3(
  imageBuffer: Buffer,
  fileName: string,
  contentType?: string,
  description?: string
): Promise<string> {
  try {
    // Validate image buffer
    if (!Buffer.isBuffer(imageBuffer) || imageBuffer.length === 0) {
      throw new Error('Invalid or empty image buffer');
    }

    // Validate file size for images
    validateFileSize(imageBuffer.length, FileType.IMAGE);

    // Auto-detect content type if not provided
    let finalContentType = contentType;
    if (!finalContentType) {
      const extension = fileName.split('.').pop()?.toLowerCase() || '';
      finalContentType = getContentTypeFromExtension(extension);
      
      // Ensure it's an image content type
      if (!finalContentType.startsWith('image/')) {
        finalContentType = 'image/jpeg'; // Default fallback
      }
    }

    console.log(`Uploading image: ${fileName} (${imageBuffer.length} bytes)`);
    
    return await uploadFileToS3(
      imageBuffer,
      fileName,
      finalContentType,
      S3Directory.IMAGES,
      description || 'Image upload'
    );

  } catch (error) {
    console.error('❌ Image upload failed:', error);
    throw new Error(
      `Image upload failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Upload audio file to S3 with audio-specific handling
 * @param {Buffer} audioBuffer - Audio file buffer
 * @param {string} fileName - Audio filename
 * @param {string} contentType - Audio content type (auto-detected if not provided)
 * @param {string} description - Optional description
 * @returns {Promise<string>} Public URL of uploaded audio
 */
export async function uploadAudioToS3(
  audioBuffer: Buffer,
  fileName: string,
  contentType?: string,
  description?: string
): Promise<string> {
  try {
    // Validate audio buffer
    if (!Buffer.isBuffer(audioBuffer) || audioBuffer.length === 0) {
      throw new Error('Invalid or empty audio buffer');
    }

    // Validate file size for audio
    validateFileSize(audioBuffer.length, FileType.AUDIO);

    // Auto-detect content type if not provided
    let finalContentType = contentType;
    if (!finalContentType) {
      const extension = fileName.split('.').pop()?.toLowerCase() || '';
      finalContentType = getContentTypeFromExtension(extension);
      
      // Ensure it's an audio content type
      if (!finalContentType.startsWith('audio/')) {
        finalContentType = 'audio/mpeg'; // Default fallback
      }
    }

    console.log(`Uploading audio: ${fileName} (${audioBuffer.length} bytes)`);
    
    return await uploadFileToS3(
      audioBuffer,
      fileName,
      finalContentType,
      S3Directory.AUDIO,
      description || 'Audio upload'
    );

  } catch (error) {
    console.error('❌ Audio upload failed:', error);
    throw new Error(
      `Audio upload failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Upload video file to S3 with video-specific handling
 * @param {Buffer} videoBuffer - Video file buffer
 * @param {string} fileName - Video filename
 * @param {string} contentType - Video content type (auto-detected if not provided)
 * @param {string} description - Optional description
 * @returns {Promise<string>} Public URL of uploaded video
 */
export async function uploadVideoToS3(
  videoBuffer: Buffer,
  fileName: string,
  contentType?: string,
  description?: string
): Promise<string> {
  try {
    // Validate video buffer
    if (!Buffer.isBuffer(videoBuffer) || videoBuffer.length === 0) {
      throw new Error('Invalid or empty video buffer');
    }

    // Validate file size for videos
    validateFileSize(videoBuffer.length, FileType.VIDEO);

    // Auto-detect content type if not provided
    let finalContentType = contentType;
    if (!finalContentType) {
      const extension = fileName.split('.').pop()?.toLowerCase() || '';
      finalContentType = getContentTypeFromExtension(extension);
      
      // Ensure it's a video content type
      if (!finalContentType.startsWith('video/')) {
        finalContentType = 'video/mp4'; // Default fallback
      }
    }

    console.log(`Uploading video: ${fileName} (${videoBuffer.length} bytes)`);
    
    return await uploadFileToS3(
      videoBuffer,
      fileName,
      finalContentType,
      S3Directory.VIDEOS,
      description || 'Video upload'
    );

  } catch (error) {
    console.error('❌ Video upload failed:', error);
    throw new Error(
      `Video upload failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Upload HTML content to S3 as a website file
 * @param {string} htmlContent - HTML content as string
 * @param {string} fileName - HTML filename
 * @param {string} contentType - Content type (default: 'text/html')
 * @param {string} description - Optional description
 * @returns {Promise<string>} Public URL of uploaded HTML
 */
export async function uploadHtmlToS3(
  htmlContent: string,
  fileName: string,
  contentType = 'text/html',
  description?: string
): Promise<string> {
  try {
    // Validate HTML content
    if (!htmlContent || typeof htmlContent !== 'string') {
      throw new Error('Valid HTML content is required');
    }

    if (htmlContent.trim().length === 0) {
      throw new Error('HTML content cannot be empty');
    }

    // Convert string to buffer
    const htmlBuffer = Buffer.from(htmlContent, 'utf-8');

    // Validate file size for HTML
    validateFileSize(htmlBuffer.length, FileType.WEBSITE);

    // Ensure proper HTML extension
    let finalFileName = fileName;
    if (!fileName.toLowerCase().endsWith('.html') && !fileName.toLowerCase().endsWith('.htm')) {
      finalFileName = `${fileName}.html`;
    }

    console.log(`Uploading HTML: ${finalFileName} (${htmlBuffer.length} bytes)`);
    
    return await uploadFileToS3(
      htmlBuffer,
      finalFileName,
      contentType,
      S3Directory.WEBSITES,
      description || 'HTML website upload'
    );

  } catch (error) {
    console.error('❌ HTML upload failed:', error);
    throw new Error(
      `HTML upload failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

// =============================================================================
// ADVANCED UPLOAD FUNCTIONS
// =============================================================================

/**
 * Upload file with detailed result information
 * @param {Buffer} buffer - File buffer
 * @param {string} fileName - Filename
 * @param {UploadOptions} options - Upload options
 * @returns {Promise<UploadResult>} Detailed upload result
 */
export async function uploadFileWithDetails(
  buffer: Buffer,
  fileName: string,
  options: UploadOptions = {}
): Promise<UploadResult> {
  const startTime = Date.now();
  
  try {
    // Auto-detect content type
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    const contentType = getContentTypeFromExtension(extension);
    
    // Determine directory
    const directory = options.directory || S3Directory.UPLOADS;
    
    // Upload file
    const url = await uploadFileToS3(
      buffer,
      fileName,
      contentType,
      directory,
      options.description
    );
    
    // Extract key from URL
    const config = getS3Config();
    const key = url.replace(`https://${config.bucketName}.s3.${config.region}.amazonaws.com/`, '');
    
    const result: UploadResult = {
      success: true,
      url,
      key,
      bucket: config.bucketName,
      contentType,
      size: buffer.length,
      uploadedAt: new Date().toISOString(),
    };
    
    console.log(`✅ Upload completed in ${Date.now() - startTime}ms`);
    return result;
    
  } catch (error) {
    const result: UploadResult = {
      success: false,
      url: '',
      key: '',
      bucket: '',
      contentType: '',
      size: 0,
      uploadedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
    };
    
    console.error(`❌ Upload failed after ${Date.now() - startTime}ms:`, error);
    return result;
  }
}

/**
 * Batch upload multiple files
 * @param {Array<{buffer: Buffer, fileName: string, options?: UploadOptions}>} files - Files to upload
 * @returns {Promise<UploadResult[]>} Array of upload results
 */
export async function batchUploadToS3(
  files: Array<{
    buffer: Buffer;
    fileName: string;
    options?: UploadOptions;
  }>
): Promise<UploadResult[]> {
  console.log(`Starting batch upload of ${files.length} files...`);
  
  const results = await Promise.allSettled(
    files.map(async (file, index) => {
      console.log(`Uploading file ${index + 1}/${files.length}: ${file.fileName}`);
      return uploadFileWithDetails(file.buffer, file.fileName, file.options);
    })
  );
  
  const uploadResults = results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        success: false,
        url: '',
        key: '',
        bucket: '',
        contentType: '',
        size: 0,
        uploadedAt: new Date().toISOString(),
        error: `Batch upload failed for file ${index}: ${result.reason}`,
      } as UploadResult;
    }
  });
  
  const successful = uploadResults.filter(r => r.success).length;
  const failed = uploadResults.length - successful;
  
  console.log(`✅ Batch upload completed: ${successful} successful, ${failed} failed`);
  
  return uploadResults;
}

// =============================================================================
// INITIALIZATION AND HEALTH CHECK
// =============================================================================

/**
 * Initialize S3 utility and verify configuration
 * @returns {Promise<boolean>} True if initialization successful
 */
export async function initializeS3(): Promise<boolean> {
  try {
    console.log('🔧 Initializing S3 utility...');
    
    // Validate configuration
    validateS3Config();
    
    console.log('✅ S3 utility initialized successfully');
    console.log(`📦 Bucket: ${s3Config!.bucketName}`);
    console.log(`🌍 Region: ${s3Config!.region}`);
    
    return true;
  } catch (error) {
    console.error('❌ S3 initialization failed:', error);
    return false;
  }
}

/**
 * Test S3 connection by attempting a simple operation
 * @returns {Promise<boolean>} True if connection test successful
 */
export async function testS3Connection(): Promise<boolean> {
  try {
    const testContent = 'S3 connection test';
    const testFileName = `test-connection-${Date.now()}.txt`;
    
    await uploadFileToS3(
      Buffer.from(testContent),
      testFileName,
      'text/plain',
      S3Directory.UPLOADS
    );
    
    console.log('✅ S3 connection test successful');
    return true;
  } catch (error) {
    console.error('❌ S3 connection test failed:', error);
    return false;
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  // Configuration
  validateS3Config,
  initializeS3,
  testS3Connection,
  
  // Upload functions
  uploadFileToS3,
  uploadImageToS3,
  uploadAudioToS3,
  uploadVideoToS3,
  uploadHtmlToS3,
  uploadFileWithDetails,
  batchUploadToS3,
  
  // Utility functions
  generateFileName,
  generateImageFileName,
  generateAudioFileName,
  generateVideoFileName,
  generateHtmlFileName,
  sanitizeFilename,
  getContentTypeFromExtension,
  
  // Constants
  FileType,
  S3Directory,
};