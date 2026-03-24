
'use server';
/**
 * @fileOverview This file implements "The Forensic Singularity Engine" for image analysis.
 * 
 * - analyzeImageForDeepfake - Performs Biometric Vital Sign Extraction and Neural Origin Traceback.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AnalyzeImageForDeepfakeInputSchema = z.object({
  imageDataUri: z
    .string()
    .describe("The image to analyze as a data URI."),
  learnedContext: z.string().optional().describe('MANDATORY Ground Truth context from private vault.'),
});

const AnalyzeImageForDeepfakeOutputSchema = z.object({
  isDeepfake: z.boolean(),
  confidence: z.number().min(0).max(100),
  explanation: z.string(),
  biometricVitals: z.object({
    pulseDetected: z.boolean().describe("Whether a human heartbeat (rPPG) signal was detected in the skin."),
    biometricConsistency: z.number().describe("Score of how natural the skin texture and blood flow appearance is."),
    notes: z.string(),
  }),
  neuralAncestry: z.object({
    modelFamily: z.string().describe("e.g., Diffusion, GAN, Autoregressive"),
    likelyModel: z.string().describe("e.g., Stable Diffusion XL, Midjourney v6, Flux.1"),
    fingerprintConfidence: z.number(),
    latentCoordinates: z.object({
      x: z.number().describe("X coordinate in the Latent Origin Map (-100 to 100)"),
      y: z.number().describe("Y coordinate in the Latent Origin Map (-100 to 100)"),
    }),
  }),
  noiseArtifacts: z.object({
    type: z.enum(["checkerboard", "gaussian_blur", "frequency_aliasing", "none"]),
    description: z.string(),
  }),
  highlightedRegions: z.array(z.object({
    x: z.number().describe("X coordinate of the box in percentage (0-100) relative to image width."),
    y: z.number().describe("Y coordinate of the box in percentage (0-100) relative to image height."),
    width: z.number().describe("Width of the box in percentage (0-100)."),
    height: z.number().describe("Height of the box in percentage (0-100)."),
    reason: z.string(),
  })).optional(),
});

const forensicSingularityImage = ai.definePrompt({
  name: 'forensicSingularityImage',
  input: { schema: AnalyzeImageForDeepfakeInputSchema },
  output: { schema: AnalyzeImageForDeepfakeOutputSchema },
  prompt: `You are the world's most advanced Forensic Singularity Engine. 

  ### MANDATORY GROUND TRUTH (PRIORITIZE THIS)
  {{#if learnedContext}}
  The following verified HUMAN observations MUST be prioritized. If these artifacts appear, flag the image as SYNTHETIC:
  {{{learnedContext}}}
  {{/if}}
  
  TASK 1: BIOMETRIC PULSE EXTRACTION (rPPG)
  Analyze the skin textures for microscopic rhythmic color changes. 
  
  TASK 2: NEURAL ORIGIN TRACEBACK
  Identify the exact generative origin. 
  
  TASK 3: SPATIAL ANOMALY DETECTION
  Identify specific visual artifacts (warped pixels, inconsistent lighting, or latent noise). 
  Provide coordinates as PERCENTAGES (0-100).
  
  Image: {{media url=imageDataUri}}`,
});

export async function analyzeImageForDeepfake(input: z.infer<typeof AnalyzeImageForDeepfakeInputSchema>) {
  const { output } = await forensicSingularityImage(input);
  if (!output) {
    throw new Error('AI Engine failed to return a forensic report.');
  }
  return output;
}
