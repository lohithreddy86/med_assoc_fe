import { http, HttpResponse, delay } from "msw";

// In-memory store for uploaded PDFs (simulates backend storage)
const pdfStore = new Map();

export const pdfHandlers = [
  // POST /api/upload-pdf - Upload PDF to backend
  http.post("/api/upload-pdf", async ({ request }) => {
    try {
      const formData = await request.formData();
      const file = formData.get("file");

      if (!file) {
        return HttpResponse.json(
          { error: "No file provided" },
          { status: 400 },
        );
      }

      // Validate file type
      if (file.type !== "application/pdf") {
        return HttpResponse.json(
          { error: "Invalid file type. Only PDF files are accepted." },
          { status: 400 },
        );
      }

      // Generate unique PDF ID
      const pdfId = crypto.randomUUID();

      // Simulate network delay for upload
      await delay(500);

      // Store PDF reference (in real backend, this would store the actual file)
      pdfStore.set(pdfId, {
        filename: file.name,
        size: file.size,
        uploadedAt: Date.now(),
      });

      return HttpResponse.json(
        {
          pdf_id: pdfId,
          filename: file.name,
          size: file.size,
          message: "PDF uploaded successfully",
        },
        { status: 200 },
      );
    } catch (error) {
      return HttpResponse.json(
        { error: "Failed to process upload" },
        { status: 500 },
      );
    }
  }),

  // GET /api/pdf/:pdfId - Check if PDF exists (optional, for validation)
  http.get("/api/pdf/:pdfId", async ({ params }) => {
    const { pdfId } = params;

    if (!pdfStore.has(pdfId)) {
      return HttpResponse.json({ error: "PDF not found" }, { status: 404 });
    }

    const pdfInfo = pdfStore.get(pdfId);
    return HttpResponse.json(pdfInfo, { status: 200 });
  }),

  // DELETE /api/pdf/:pdfId - Delete PDF from backend (cleanup)
  http.delete("/api/pdf/:pdfId", async ({ params }) => {
    const { pdfId } = params;

    if (!pdfStore.has(pdfId)) {
      return HttpResponse.json({ error: "PDF not found" }, { status: 404 });
    }

    pdfStore.delete(pdfId);
    return HttpResponse.json(
      { message: "PDF deleted successfully" },
      { status: 200 },
    );
  }),
];

// Export store for testing purposes
export { pdfStore };
