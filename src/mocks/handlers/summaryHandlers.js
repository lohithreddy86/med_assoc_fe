import { http, HttpResponse, delay } from 'msw';

export const summaryHandlers = [
  // POST /api/summarize - Text summarization endpoint
  http.post('/api/summarize', async ({ request }) => {
    try {
      const body = await request.json();
      const { texts } = body;

      // Validate request payload
      if (!texts || !Array.isArray(texts)) {
        return HttpResponse.json(
          {
            error: 'Missing required field: texts (must be an array)',
          },
          { status: 400 }
        );
      }

      if (texts.length === 0) {
        return HttpResponse.json(
          {
            error: 'texts array cannot be empty',
          },
          { status: 400 }
        );
      }

      // Simulate network delay (1500ms per spec)
      await delay(1500);

      // Simulate 5% chance of error
      if (Math.random() < 0.05) {
        return HttpResponse.json(
          {
            error: 'Summarization service temporarily unavailable',
          },
          { status: 503 }
        );
      }

      // Generate adaptive summary based on input volume
      const summary = generateAdaptiveSummary(texts);

      const response = {
        summary,
        timestamp: new Date().toISOString(),
        model_version: 'mock-v1.0',
      };

      return HttpResponse.json(response, { status: 200 });
    } catch (error) {
      return HttpResponse.json(
        {
          error: 'Invalid request format',
        },
        { status: 400 }
      );
    }
  }),
];

// Helper function to generate adaptive summary
// Per spec: Short input (<500 words): ~100-150 words (20-30%)
//            Medium input (500-2000 words): ~200-400 words (20-25%)
//            Long input (>2000 words): ~400-600 words (15-20%)
function generateAdaptiveSummary(texts) {
  const combinedText = texts.join(' ');
  const wordCount = combinedText.split(/\s+/).length;

  let summaryLength;
  if (wordCount < 500) {
    // Short input: 20-30% of original
    summaryLength = Math.floor(wordCount * 0.25);
  } else if (wordCount < 2000) {
    // Medium input: 20-25% of original
    summaryLength = Math.floor(wordCount * 0.22);
  } else {
    // Long input: 15-20% of original
    summaryLength = Math.floor(wordCount * 0.17);
  }

  // Generate mock summary
  const summaryParts = [];

  // Add opening
  summaryParts.push('Summary of Medical Documentation:');

  // Detect key medical information from texts
  const hasDiagnosis = texts.some(t => t.toLowerCase().includes('diagnosis'));
  const hasMedication = texts.some(t => t.toLowerCase().includes('medication') || t.toLowerCase().includes('prescription'));
  const hasVitals = texts.some(t => t.toLowerCase().includes('blood pressure') || t.toLowerCase().includes('heart rate'));
  const hasLabs = texts.some(t => t.toLowerCase().includes('lab') || t.toLowerCase().includes('glucose') || t.toLowerCase().includes('a1c'));

  if (hasDiagnosis) {
    summaryParts.push('Patient presents with documented diagnoses requiring ongoing management.');
  }

  if (hasMedication) {
    summaryParts.push('Current medication regimen includes prescribed treatments to be taken as directed.');
  }

  if (hasVitals) {
    summaryParts.push('Vital signs have been recorded and fall within expected clinical parameters.');
  }

  if (hasLabs) {
    summaryParts.push('Laboratory results indicate metabolic markers within reference ranges.');
  }

  summaryParts.push('Continued monitoring and follow-up care are recommended per clinical guidelines.');

  // Adjust length based on input
  if (summaryLength < 50) {
    // Short summary
    return summaryParts.slice(0, 2).join(' ');
  } else if (summaryLength < 150) {
    // Medium summary
    return summaryParts.join(' ');
  } else {
    // Long summary - add more detail
    summaryParts.push(
      'Patient demonstrates adherence to treatment protocols with documented compliance.',
      'Risk stratification and preventive care measures have been reviewed.',
      'Care coordination with specialists recommended for comprehensive management.'
    );
    return summaryParts.join(' ');
  }
}
