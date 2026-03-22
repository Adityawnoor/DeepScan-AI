'use server';
/**
 * @fileOverview This file implements a Genkit flow for advanced image forensic analysis.
 * 
 * - analyzeImageForDeepfake - Handles deepfake detection with model fingerprinting.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AnalyzeImageForDeepfakeInputSchema = z.object({
  imageDataUri: z
    .string()
    .describe("The image to analyze as a data URI."),
  learnedContext: z.string().optional().describe('Contextual knowledge from private PC vault.'),
});

const AnalyzeImageForDeepfakeOutputSchema = z.object({
  isDeepfake: z.boolean(),
  confidence: z.number().min(0).max(100),
  explanation: z.string(),
  neuralAncestry: z.object({
    modelFamily: z.string().describe("e.g., Diffusion, GAN, Autoregressive"),
    likelyModel: z.string().describe("e.g., Stable Diffusion XL, Midjourney v6, Flux.1"),
    fingerprintConfidence: z.number(),
  }),
  noiseArtifacts: z.object({
    type: z.enum(["checkerboard", "gaussian_blur", "frequency_aliasing", "none"]),
    description: z.string(),
  }),
  highlightedRegions: z.array(z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
    reason: z.string(),
  })).optional(),
});

export async function analyzeImageForDeepfake(input: z.infer<typeof AnalyzeImageForDeepfakeInputSchema>) {
  const prompt = ai.definePrompt({
    name: 'advancedImageForensics',
    input: { schema: AnalyzeImageForDeepfakeInputSchema },
    output: { schema: AnalyzeImageForDeepfakeOutputSchema },
    prompt: `You are an elite forensic neural analyst. 
    
    TASK: Perform 'Neural Ancestry' tracking and 'Noise Floor' analysis.
    
    1. Identify the 'Neural DNA': Does this image have the specific noise patterns of Stable Diffusion (Diffusion-based) or GANs (Checkerboard artifacts)?
    2. Analyze 'Latent Space' inconsistencies: Look for areas where the AI struggled to maintain global coherence.
    
    {{#if learnedContext}}
    KNOWLEDGE BASE: {{{learnedContext}}}
    {{/if}}
    
    Image: {{media url=imageDataUri}}`,
  });

  const { output } = await prompt(input);
  return output!;
}
