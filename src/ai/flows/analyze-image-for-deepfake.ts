'use server';
/**
 * @fileOverview This file implements a Genkit flow for analyzing an image to detect deepfakes.
 *
 * - analyzeImageForDeepfake - A function that handles the deepfake detection process for an image.
 * - AnalyzeImageForDeepfakeInput - The input type for the analyzeImageForDeepfake function.
 * - AnalyzeImageForDeepfakeOutput - The return type for the analyzeImageForDeepfake function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AnalyzeImageForDeepfakeInputSchema = z.object({
  imageDataUri: z
    .string()
    .describe(
      "The image to analyze, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type AnalyzeImageForDeepfakeInput = z.infer<typeof AnalyzeImageForDeepfakeInputSchema>;

const AnalyzeImageForDeepfakeOutputSchema = z.object({
  isDeepfake: z.boolean().describe('True if the image is detected as a deepfake, false otherwise.'),
  confidence:
    z.number()
      .min(0)
      .max(100)
      .describe('A confidence score (0-100) indicating the likelihood of the image being a deepfake.'),
  explanation:
    z.string().describe('A detailed explanation of the analysis and reasoning for the verdict.'),
  highlightedRegions:
    z.array(
      z.object({
        x: z.number().describe('The X-coordinate (0-100 percentage) of the top-left corner.'),
        y: z.number().describe('The Y-coordinate (0-100 percentage) of the top-left corner.'),
        width: z.number().describe('The width (0-100 percentage) of the region.'),
        height: z.number().describe('The height (0-100 percentage) of the region.'),
        reason:
          z.string()
            .describe('The reason why this specific region is considered suspicious.'),
      })
    )
    .optional()
    .describe('An optional array of regions in the image that show signs of manipulation.'),
});
export type AnalyzeImageForDeepfakeOutput = z.infer<typeof AnalyzeImageForDeepfakeOutputSchema>;

export async function analyzeImageForDeepfake(
  input: AnalyzeImageForDeepfakeInput
): Promise<AnalyzeImageForDeepfakeOutput> {
  return analyzeImageForDeepfakeFlow(input);
}

const deepfakeDetectionPrompt = ai.definePrompt({
  name: 'deepfakeDetectionPrompt',
  input: { schema: AnalyzeImageForDeepfakeInputSchema },
  output: { schema: AnalyzeImageForDeepfakeOutputSchema },
  prompt: `You are an objective forensic image analyst. Your goal is to accurately determine if an image is authentic or AI-generated.

Distinguish between natural digital artifacts (ISO noise, JPEG compression, motion blur) and generative AI artifacts.

Analyze for:
1. **Structural Integrity**: Check for physical impossibilities in anatomy, geometry, or environment that diffusion models often miss.
2. **Lighting Consistency**: Verify that shadows, highlights, and catchlights in eyes follow a singular, logical light source.
3. **Boundary Analysis**: Look for "seams" or unnatural blurring where subjects meet backgrounds, which often occurs in GAN-based compositing.
4. **Texture Frequency**: Search for the "checkerboard" pattern of GANs or the hyper-smooth "uncanny valley" texture of certain Diffusion models.

IMPORTANT: Do not flag an image as fake just because it is low quality. Only flag if you find specific evidence of AI generation. Use normalized PERCENTAGES (0 to 100) for highlightedRegions coordinates.

Image to analyze: {{media url=imageDataUri}}`,
});

const analyzeImageForDeepfakeFlow = ai.defineFlow(
  {
    name: 'analyzeImageForDeepfakeFlow',
    inputSchema: AnalyzeImageForDeepfakeInputSchema,
    outputSchema: AnalyzeImageForDeepfakeOutputSchema,
  },
  async (input) => {
    const { output } = await deepfakeDetectionPrompt(input);
    if (!output) {
      throw new Error('AI did not return an output for deepfake detection.');
    }
    return output;
  }
);