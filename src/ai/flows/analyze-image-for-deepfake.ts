
'use server';
/**
 * @fileOverview This file implements "The Forensic Singularity Engine" for image analysis with Explainable AI.
 * 
 * - analyzeImageForDeepfake - Performs Biometric Vital Sign Extraction and Neural Origin Traceback.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AnalyzeImageForDeepfakeInputSchema = z.object({
  imageDataUri: z
    .string()
    .describe("The image to analyze as a data URI."),
  learnedContext: z.string().optional().describe('MANDATORY Ground Truth context from private vault and cloud base.'),
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
    x: z.number().describe("X coordinate of the top-left corner as a percentage (0-100)."),
    y: z.number().describe("Y coordinate of the top-left corner as a percentage (0-100)."),
    width: z.number().describe("Width of the region as a percentage (0-100)."),
    height: z.number().describe("Height of the region as a percentage (0-100)."),
    reason: z.string().describe("The specific reason this region is suspicious (e.g., 'Lighting mismatch', 'Neural artifacts in eyes')."),
  })).optional(),
});

const forensicSingularityImage = ai.definePrompt({
  name: 'forensicSingularityImage',
  input: { schema: AnalyzeImageForDeepfakeInputSchema },
  output: { schema: AnalyzeImageForDeepfakeOutputSchema },
  prompt: `You are the world's most advanced Forensic Singularity Engine. 

  ### MANDATORY GROUND TRUTH (NEURAL MEMORY)
  {{#if learnedContext}}
  The following verified HUMAN observations MUST be prioritized. If any patterns described here appear in the current sample, you MUST flag it as a deepfake.
  {{{learnedContext}}}
  {{/if}}
  
  TASK 1: BIOMETRIC PULSE EXTRACTION (rPPG)
  Analyze the skin textures for microscopic rhythmic color changes.
  
  TASK 2: NEURAL ORIGIN TRACEBACK
  Identify exact generative origin. Look for diffusion-specific noise patterns or GAN checkerboard artifacts.
  
  TASK 3: EXPLAINABLE AI MAPPING
  Identify specific visual artifacts (warped pixels, inconsistent lighting, or latent noise). 
  Provide coordinates as PERCENTAGES (0-100) relative to the image dimensions.
  Be precise with "reason" labels like "Lip sync mismatch", "Lighting mismatch", "Neural artifact".
  
  Image: {{media url=imageDataUri}}`,
});

export async function analyzeImageForDeepfake(input: z.infer<typeof AnalyzeImageForDeepfakeInputSchema>) {
  const { output } = await forensicSingularityImage(input);
  if (!output) {
    throw new Error('AI Engine failed to return a forensic report.');
  }
  return output;
}
