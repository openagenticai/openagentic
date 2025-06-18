import { tool } from 'ai';
import { z } from 'zod';
import * as QRCode from 'qrcode';
import type { ToolDetails } from '../types';
import { toOpenAgenticTool } from './utils';

// Error correction levels for QR codes
const ERROR_CORRECTION_LEVELS = ['L', 'M', 'Q', 'H'] as const;

const rawQRCodeTool = tool({
  description: 'Generate QR codes with customizable appearance and error correction levels for various use cases',
  parameters: z.object({
    text: z.string()
      .min(1)
      .max(4000)
      .describe('The text to encode in the QR code (required, max 4000 characters)'),
    
    size: z.number()
      .optional()
      .default(512)
      .min(100)
      .max(2000)
      .describe('The size of the QR code in pixels (default: 512, min: 100, max: 2000)'),
      
    errorCorrectionLevel: z.enum(['L', 'M', 'Q', 'H'])
      .optional()
      .default('M')
      .describe('Error correction level (L=Low ~7%, M=Medium ~15%, Q=Quartile ~25%, H=High ~30%, default: M)'),
      
    darkColor: z.string()
      .optional()
      .default('#000000')
      .describe('Color of dark modules in hex format (default: #000000)'),
      
    lightColor: z.string()
      .optional()
      .default('#FFFFFF')
      .describe('Color of light modules in hex format (default: #FFFFFF)')
  }),
  
  execute: async ({ 
    text,
    size = 512,
    errorCorrectionLevel = 'M',
    darkColor = '#000000',
    lightColor = '#FFFFFF'
  }) => {
    // Validate text input
    if (!text || text.trim().length === 0) {
      throw new Error('Text cannot be empty');
    }

    if (text.length > 4000) {
      throw new Error('Text exceeds maximum length of 4000 characters');
    }

    // Validate size
    if (size < 100) {
      throw new Error('Size must be at least 100 pixels');
    }

    if (size > 2000) {
      throw new Error('Size cannot exceed 2000 pixels');
    }

    // Validate colors (basic hex validation)
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    
    if (!hexColorRegex.test(darkColor)) {
      throw new Error(`Invalid dark color format: ${darkColor}. Please use hex format like #000000`);
    }

    if (!hexColorRegex.test(lightColor)) {
      throw new Error(`Invalid light color format: ${lightColor}. Please use hex format like #FFFFFF`);
    }

    // Validate error correction level
    if (!ERROR_CORRECTION_LEVELS.includes(errorCorrectionLevel)) {
      throw new Error(`Invalid error correction level: ${errorCorrectionLevel}. Must be one of: L, M, Q, H`);
    }

    // Start logging
    console.log('📱 QR Code Tool - Generation started:', {
      textLength: text.length,
      text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      size,
      errorCorrectionLevel,
      darkColor,
      lightColor,
    });

    try {
      // Generate QR code buffer
      const qrCodeBuffer = await QRCode.toBuffer(text, {
        type: 'png',
        width: size,
        errorCorrectionLevel,
        color: {
          dark: darkColor,
          light: lightColor,
        },
        margin: 2, // Add small margin around QR code
      });

      // Convert buffer to base64 data URL
      const qrCodeDataUrl = `data:image/png;base64,${qrCodeBuffer.toString('base64')}`;

      // Log completion
      console.log('✅ QR Code Tool - Generation completed:', {
        textLength: text.length,
        size,
        errorCorrectionLevel,
        bufferSize: qrCodeBuffer.length,
        hasCustomColors: darkColor !== '#000000' || lightColor !== '#FFFFFF',
        dataUrlLength: qrCodeDataUrl.length,
      });

      // Return structured result
      return {
        success: true,
        qrCodeDataUrl,
        encodedText: text,
        size,
        errorCorrectionLevel,
        darkColor,
        lightColor,
        metadata: {
          generatedAt: new Date().toISOString(),
          textLength: text.length,
          bufferSize: qrCodeBuffer.length,
          dimensions: `${size}x${size}`,
          hasCustomColors: darkColor !== '#000000' || lightColor !== '#FFFFFF',
        },
      };

    } catch (error) {
      console.error('❌ QR Code Tool - Generation failed:', {
        textLength: text.length,
        size,
        errorCorrectionLevel,
        darkColor,
        lightColor,
        error: error instanceof Error ? error.message : String(error),
      });

      // Handle specific error types
      if (error instanceof Error) {
        // Text too complex for error correction level
        if (error.message.includes('too big') || error.message.includes('capacity')) {
          throw new Error(`Text is too complex for error correction level ${errorCorrectionLevel}. Try using a higher error correction level (Q or H) or reduce the text length.`);
        }
        
        // Invalid data errors
        if (error.message.includes('invalid') || error.message.includes('malformed')) {
          throw new Error('Text contains invalid characters for QR code generation. Please check your input.');
        }
        
        // Buffer generation errors
        if (error.message.includes('buffer') || error.message.includes('memory')) {
          throw new Error('Failed to generate QR code buffer. The requested size may be too large.');
        }
        
        // Color format errors
        if (error.message.includes('color') || error.message.includes('hex')) {
          throw new Error('Invalid color format. Please use hex colors like #000000 or #FFFFFF.');
        }
        
        // Size errors
        if (error.message.includes('size') || error.message.includes('width')) {
          throw new Error(`Invalid size parameter: ${size}. Size must be between 100 and 2000 pixels.`);
        }
        
        // Encoding errors
        if (error.message.includes('encoding') || error.message.includes('base64')) {
          throw new Error('Failed to encode QR code image. Please try again.');
        }
      }

      // Generic error fallback
      throw new Error(`QR code generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
});

const toolDetails: ToolDetails = {
  toolId: 'qr_code_generator',
  name: 'QR Code Generator',
  useCases: [
    'Generate QR codes for website URLs',
    'Create QR codes for contact information (vCard)',
    'Generate WiFi network sharing QR codes',
    'Create QR codes for text messages',
    'Generate QR codes for social media profiles',
    'Create custom-colored QR codes for branding',
    'Generate QR codes for app download links',
    'Create QR codes for payment information',
    'Generate QR codes for event tickets',
    'Create QR codes for location coordinates',
  ],
  logo: 'https://www.openagentic.org/tools/qrcode.svg',
};

export const qrcodeTool = toOpenAgenticTool(rawQRCodeTool, toolDetails);