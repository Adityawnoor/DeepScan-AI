'use server';
/**
 * @fileOverview This file implements "The Forensic Singularity Engine" for image analysis with Provenance Trace.
 * 
 * - analyzeImageForDeepfake - Performs Biometric Extraction and Neural Origin Traceback.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AnalyzeImageForDeepfakeInputSchema = z.object({
  imageDataUri: z
    .string()
    .describe("The image to analyze as a data URI."),
  learnedContext: z.string().optional().describe('MANDATORY Ground Truth context derived from previous investigations.'),
});

const AnalyzeImageForDeepfakeOutputSchema = z.object({
  isDeepfake: z.boolean(),
  fakeCategory: z.enum(['Face Swap', 'Generative', 'Style Transfer', 'Attribute Edit', 'Authentic']).describe('The specific type of image manipulation.'),
  confidence: z.number().min(0).max(100),
  explanation: z.string(),
  sourceOrigin: z.string().describe("Likely original source of the image (e.g., 'Instagram post from 2022', 'Stock photo template')."),
  originalContext: z.string().describe("Detailed notes on the provenance trace."),
  biometricVitals: z.object({
    pulseDetected: z.boolean(),
    biometricConsistency: z.number(),
    notes: z.string(),
  }),
  neuralAncestry: z.object({
    modelFamily: z.string(),
    likelyModel: z.string(),
    fingerprintConfidence: z.number(),
  }),
  highlightedRegions: z.array(z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
    reason: z.string(),
  })).optional(),
});

const forensicSingularityImage = ai.definePrompt({
  name: 'forensicSingularityImage',
  input: { schema: AnalyzeImageForDeepfakeInputSchema },
  output: { schema: AnalyzeImageForDeepfakeOutputSchema },
  prompt: `You are the Forensic Singularity Engine. 

  ### NEURAL MEMORY (CONTEXT)
  Use this context from previous cases to identify recurring tool signatures and artifacts:
  {{{learnedContext}}}

  TASK 1: PROVENANCE TRACE & CATEGORIZATION
  Identify the specific category of manipulation:
  - Face Swap: Replacing one person's face with another.
  - Generative: Entirely AI-generated image (e.g., Midjourney).
  - Style Transfer: Applying an artistic or neural filter to a real photo.
  - Attribute Edit: Modifying specific features (age, hair, expression) while keeping identity.

  Analyze the image to identify if it originates from a known event, person, or public template. 

  TASK 2: NEURAL ORIGIN TRACEBACK
  Identify the specific generative model signature (Diffusion, GAN, etc.).

  TASK 3: BIOMETRIC PULSE EXTRACTION
  Check skin textures for pulse signals (rPPG).

  TASK 4: EXPLAINABLE AI MAPPING
  Highlight suspicious regions using percentage coordinates.

  Image: {{media url=imageDataUri}}`,
});

export async function analyzeImageForDeepfake(input: z.infer<typeof AnalyzeImageForDeepfakeInputSchema>) {
  const { output } = await forensicSingularityImage(input);
  if (!output) throw new Error('AI Engine failed to return a forensic report.');
  return output;
}
