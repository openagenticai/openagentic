import { tool } from 'ai';
import { z } from 'zod';
import type { ToolDetails } from '../types';
import { toOpenAgenticTool } from './utils';

const rawCalculatorTool = tool({
  description: 'Perform mathematical calculations and evaluations',
  parameters: z.object({
    expression: z.string().describe('Mathematical expression to evaluate (e.g., "2 + 2", "Math.sqrt(16)", "Math.PI * 2")'),
  }),
  execute: async ({ expression }) => {
    // Enhanced safety check - allow more mathematical operations
    const safeExpression = expression.replace(
      /[^0-9+\-*/.()Math.sqrtpowabsfloorceilminmaxsincostandelogPIE ]/g, 
      ''
    );
    
    // Additional safety - prevent infinite loops and dangerous operations
    if (safeExpression.includes('while') || safeExpression.includes('for') || 
        safeExpression.includes('function') || safeExpression.includes('eval')) {
      throw new Error('Unsafe expression detected');
    }
    
    try {
      // Create a safe evaluation context
      const mathContext = {
        Math: {
          PI: Math.PI,
          E: Math.E,
          abs: Math.abs,
          acos: Math.acos,
          asin: Math.asin,
          atan: Math.atan,
          ceil: Math.ceil,
          cos: Math.cos,
          exp: Math.exp,
          floor: Math.floor,
          log: Math.log,
          max: Math.max,
          min: Math.min,
          pow: Math.pow,
          random: Math.random,
          round: Math.round,
          sin: Math.sin,
          sqrt: Math.sqrt,
          tan: Math.tan,
        }
      };
      
      const result = new Function('Math', `"use strict"; return ${safeExpression}`)(mathContext.Math);
      
      // Validate result
      if (typeof result !== 'number' || !isFinite(result)) {
        throw new Error('Invalid mathematical result');
      }
      
      return { 
        result, 
        expression: safeExpression,
        originalExpression: expression,
        type: 'number'
      };
    } catch (error) {
      throw new Error(`Invalid mathematical expression: ${expression}. ${error instanceof Error ? error.message : ''}`);
    }
  },
});

const toolDetails: ToolDetails = {
    toolId: 'calculator',
    name: 'Calculator',
    useCases: [],
    parameters: {},
    logo: '',
};

export const timestampTool = toOpenAgenticTool(rawCalculatorTool, toolDetails);
