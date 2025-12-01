import { http, HttpResponse, delay } from "msw";

// Simulated OCR responses for different scenarios
const mockOCRResponses = {
  success: {
    id: "123e4567-e89b-12d3-a456-426614174000",
    text: "Patient Name: John Doe\nDate of Birth: 01/15/1980\nDiagnosis: Type 2 Diabetes",
    image_id: "img_001",
  },
  empty: {
    id: "123e4567-e89b-12d3-a456-426614174001",
    text: "",
    image_id: "img_002",
  },
  error: null,
};

export const ocrHandlers = [
  // POST /api/snip-crop - OCR text extraction endpoint
  http.post("/api/snip-crop", async ({ request }) => {
    try {
      const body = await request.json();
      const { pdf_id, page, rect } = body;

      // Validate request payload
      if (!pdf_id) {
        return HttpResponse.json(
          {
            error: "Missing required field: pdf_id",
          },
          { status: 400 },
        );
      }

      if (!page || !rect) {
        return HttpResponse.json(
          {
            error: "Missing required fields: page and rect",
          },
          { status: 400 },
        );
      }

      // Validate rect structure
      if (
        typeof rect.x !== "number" ||
        typeof rect.y !== "number" ||
        typeof rect.width !== "number" ||
        typeof rect.height !== "number"
      ) {
        return HttpResponse.json(
          {
            error:
              "Invalid rect format. Expected {x, y, width, height} with numeric values",
          },
          { status: 400 },
        );
      }

      // Simulate network delay (1200ms per spec)
      await delay(1200);

      // Simulate random scenarios
      const scenario = Math.random();

      // 10% chance of empty text
      if (scenario < 0.1) {
        return HttpResponse.json(mockOCRResponses.empty, { status: 200 });
      }

      // 5% chance of error
      if (scenario < 0.15) {
        return HttpResponse.json(
          {
            error: "OCR processing failed. Please try again.",
          },
          { status: 500 },
        );
      }

      // 85% success with realistic OCR text
      const successResponse = {
        id: crypto.randomUUID(),
        text: generateMockOCRText(page, rect),
        image_id: `img_${Date.now()}`,
      };

      return HttpResponse.json(successResponse, { status: 200 });
    } catch (error) {
      return HttpResponse.json(
        {
          error: "Invalid request format",
        },
        { status: 400 },
      );
    }
  }),
];

// Helper function to generate realistic mock OCR text
function generateMockOCRText(page, rect) {
  const templates = [
    "Patient Name: Jane Smith\nMRN: 123456789\nDate: 03/15/2024",
    "Blood Pressure: 120/80 mmHg\nHeart Rate: 72 bpm\nTemperature: 98.6°F",
    "Diagnosis: Hypertension, controlled\nMedications: Lisinopril 10mg daily",
    "Lab Results:\nGlucose: 95 mg/dL\nA1C: 5.8%\nCreatinine: 0.9 mg/dL",
    "Chief Complaint: Chest pain, duration 2 hours\nOnset: Sudden",
    "Allergies: Penicillin (rash)\nNKDA: Sulfa drugs",
    "Vitals:\nSystolic: 118\nDiastolic: 76\nO2 Sat: 98%",
    "Prescription:\nMetformin 500mg\nTake twice daily with meals",
  ];

  // Select template based on position to make it somewhat deterministic
  const index =
    Math.floor((rect.x + rect.y) * templates.length) % templates.length;
  return templates[index];
}
