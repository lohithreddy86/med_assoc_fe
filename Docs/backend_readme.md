# Backend API Requirements for OCR Snipping & Summarization Application

## Project Overview

This document specifies the backend API requirements for a medical document OCR and summarization application. The frontend is a React application that allows medical associates to:

1. Upload PDF documents
2. Draw rectangular selections (snips) on PDF pages
3. Extract text from selected regions via OCR
4. Edit and manage extracted text
5. Generate summaries of extracted text

**Important**: This application handles sensitive medical data. Security and data handling must be carefully considered.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (React)                                │
│  - Uploads PDF to backend, receives pdf_id                                  │
│  - Renders PDF locally for viewing (PDF.js)                                 │
│  - Captures user selections as normalized coordinates                       │
│  - Sends OCR requests with pdf_id + coordinates                            │
│  - Sends summarization requests with extracted texts                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BACKEND API                                     │
│                                                                              │
│  POST /api/upload-pdf     → Store PDF, return pdf_id                        │
│  POST /api/snip-crop      → Crop PDF region, run OCR, return text           │
│  POST /api/summarize      → Summarize texts using LLM/NLP                   │
│  GET  /api/health         → Health check endpoint                           │
│  GET  /api/pdf/:id        → Check if PDF exists (optional)                  │
│  DELETE /api/pdf/:id      → Delete PDF (cleanup, optional)                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EXTERNAL SERVICES                                  │
│                                                                              │
│  - OCR Engine: Tesseract (local) or Cloud OCR (Google Vision, AWS Textract)│
│  - Summarization: OpenAI GPT, Claude, or local LLM                         │
│  - Storage: Local filesystem, Redis, S3, or in-memory                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

### 1. Upload PDF

Upload a PDF file to the backend for subsequent OCR operations.

**Endpoint**: `POST /api/upload-pdf`

**Request**:
- Content-Type: `multipart/form-data`
- Body: Form field `file` containing the PDF file

**Request Headers**:
```
Content-Type: multipart/form-data; boundary=...
X-CSRF-Token: <token>  (if CSRF protection enabled)
```

**Validation Rules**:
- File must be present
- MIME type must be `application/pdf`
- File size must be ≤ 10 MB (10,485,760 bytes)
- PDF structure should be inspected for malicious content (embedded JavaScript, external URLs, launch actions)

**Success Response** (200 OK):
```json
{
  "pdf_id": "550e8400-e29b-41d4-a716-446655440000",
  "filename": "patient_records.pdf",
  "size": 2456789,
  "page_count": 15,
  "message": "PDF uploaded successfully"
}
```

**Error Responses**:

| Status | Condition | Response |
|--------|-----------|----------|
| 400 | No file provided | `{"error": "No file provided"}` |
| 400 | Invalid file type | `{"error": "Invalid file type. Only PDF files are accepted."}` |
| 400 | File too large | `{"error": "File exceeds 10 MB limit"}` |
| 400 | Malicious content | `{"error": "File contains potentially unsafe content"}` |
| 500 | Server error | `{"error": "Failed to process upload"}` |

**Implementation Notes**:
- Generate UUID v4 for `pdf_id`
- Store PDF bytes in memory, disk, or object storage (S3/MinIO)
- Consider TTL-based cleanup (e.g., delete PDFs after 1 hour of inactivity)
- Extract page count using a PDF library (PyPDF2, pdf2image, etc.)

---

### 2. OCR Text Extraction (Snip Crop)

Extract text from a specific region of a PDF page using OCR.

**Endpoint**: `POST /api/snip-crop`

**Request**:
- Content-Type: `application/json`

**Request Body**:
```json
{
  "pdf_id": "550e8400-e29b-41d4-a716-446655440000",
  "page": 1,
  "rect": {
    "x": 0.222,
    "y": 0.708,
    "width": 0.111,
    "height": 0.042
  }
}
```

**Field Definitions**:

| Field | Type | Description |
|-------|------|-------------|
| `pdf_id` | string (UUID) | Identifier returned from upload endpoint |
| `page` | integer | 1-indexed page number |
| `rect.x` | float (0-1) | Normalized X coordinate (left edge) |
| `rect.y` | float (0-1) | Normalized Y coordinate (bottom edge, PDF coordinate system) |
| `rect.width` | float (0-1) | Normalized width as fraction of page width |
| `rect.height` | float (0-1) | Normalized height as fraction of page height |

**Coordinate System**:
- All coordinates are normalized to 0-1 range (percentage of page dimensions)
- Origin is at **bottom-left** of the page (PDF standard)
- Y increases upward (opposite of browser coordinates)

**Validation Rules**:
- `pdf_id` must exist in storage
- `page` must be between 1 and total page count
- All rect values must be numbers between 0 and 1
- `rect.x + rect.width` must be ≤ 1
- `rect.y + rect.height` must be ≤ 1

**Success Response** (200 OK):
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "text": "Patient Name: John Doe\nDate of Birth: 01/15/1980\nDiagnosis: Type 2 Diabetes",
  "image_id": "img_001"
}
```

**Response Fields**:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string (UUID) | Unique identifier for this OCR result |
| `text` | string | Extracted text (may be empty if no text detected) |
| `image_id` | string | Optional reference to cropped image (for debugging) |

**Error Responses**:

| Status | Condition | Response |
|--------|-----------|----------|
| 400 | Missing pdf_id | `{"error": "Missing required field: pdf_id"}` |
| 400 | Missing page/rect | `{"error": "Missing required fields: page and rect"}` |
| 400 | Invalid rect format | `{"error": "Invalid rect format. Expected {x, y, width, height} with numeric values"}` |
| 404 | PDF not found | `{"error": "PDF not found"}` |
| 400 | Invalid page number | `{"error": "Invalid page number. Must be between 1 and <total>"}` |
| 500 | OCR failed | `{"error": "OCR processing failed. Please try again."}` |

**Performance Requirements**:
- Target response time: < 1.5 seconds for typical text regions
- Frontend has 30-second timeout per request

---

### 3. Text Summarization

Generate a summary from multiple text strings.

**Endpoint**: `POST /api/summarize`

**Request**:
- Content-Type: `application/json`

**Request Body**:
```json
{
  "texts": [
    "Patient Name: John Doe\nDate of Birth: 01/15/1980",
    "Diagnosis: Type 2 Diabetes\nMedications: Metformin 500mg",
    "Blood Pressure: 120/80 mmHg\nHeart Rate: 72 bpm"
  ]
}
```

**Field Definitions**:

| Field | Type | Description |
|-------|------|-------------|
| `texts` | array of strings | Array of text strings to summarize |

**Validation Rules**:
- `texts` must be a non-empty array
- Each element must be a string
- Empty strings in the array should be filtered out before processing

**Summarization Length Guidelines** (Adaptive):
- **Short input** (<500 words): Summary ~100-150 words (20-30% of original)
- **Medium input** (500-2000 words): Summary ~200-400 words (20-25% of original)
- **Long input** (>2000 words): Summary ~400-600 words (15-20% of original)

**Success Response** (200 OK):
```json
{
  "summary": "Summary of Medical Documentation: Patient presents with documented diagnoses requiring ongoing management. Current medication regimen includes prescribed treatments to be taken as directed. Vital signs have been recorded and fall within expected clinical parameters. Continued monitoring and follow-up care are recommended per clinical guidelines.",
  "timestamp": "2025-11-30T12:00:00.000Z",
  "model_version": "gpt-4-turbo"
}
```

**Response Fields**:

| Field | Type | Description |
|-------|------|-------------|
| `summary` | string | Generated summary text |
| `timestamp` | string (ISO 8601) | When the summary was generated |
| `model_version` | string | Identifier of the model/service used |

**Error Responses**:

| Status | Condition | Response |
|--------|-----------|----------|
| 400 | Missing texts | `{"error": "Missing required field: texts (must be an array)"}` |
| 400 | Empty array | `{"error": "texts array cannot be empty"}` |
| 400 | Invalid format | `{"error": "Invalid request format"}` |
| 503 | Service unavailable | `{"error": "Summarization service temporarily unavailable"}` |

---

### 4. Health Check

Simple endpoint to verify the API is running.

**Endpoint**: `GET /api/health`

**Success Response** (200 OK):
```json
{
  "status": "healthy",
  "timestamp": "2025-11-30T12:00:00.000Z",
  "version": "1.0.0"
}
```

---

### 5. Get PDF Info (Optional)

Check if a PDF exists and retrieve its metadata.

**Endpoint**: `GET /api/pdf/:pdfId`

**Success Response** (200 OK):
```json
{
  "pdf_id": "550e8400-e29b-41d4-a716-446655440000",
  "filename": "patient_records.pdf",
  "size": 2456789,
  "page_count": 15,
  "uploaded_at": "2025-11-30T12:00:00.000Z"
}
```

**Error Response** (404 Not Found):
```json
{
  "error": "PDF not found"
}
```

---

### 6. Delete PDF (Optional)

Delete a PDF from storage (cleanup).

**Endpoint**: `DELETE /api/pdf/:pdfId`

**Success Response** (200 OK):
```json
{
  "message": "PDF deleted successfully"
}
```

**Error Response** (404 Not Found):
```json
{
  "error": "PDF not found"
}
```

---

## Coordinate Conversion Algorithm

The frontend sends normalized coordinates with origin at **bottom-left** (PDF standard). The backend must convert these to pixel coordinates for image cropping.

### Converting Normalized Coordinates to Pixels

```python
def normalized_to_pixels(rect: dict, page_width: int, page_height: int) -> dict:
    """
    Convert normalized PDF coordinates to pixel coordinates for image cropping.

    Args:
        rect: {x, y, width, height} - normalized 0-1 coordinates (PDF origin: bottom-left)
        page_width: Width of rendered page image in pixels
        page_height: Height of rendered page image in pixels

    Returns:
        {left, top, right, bottom} - pixel coordinates for PIL crop (origin: top-left)
    """
    # Convert normalized to pixels
    left = int(rect['x'] * page_width)
    right = int((rect['x'] + rect['width']) * page_width)

    # Invert Y-axis: PDF bottom-left → Image top-left
    # PDF y=0 is at bottom, image y=0 is at top
    bottom = int((1.0 - rect['y']) * page_height)
    top = int((1.0 - rect['y'] - rect['height']) * page_height)

    return {
        'left': left,
        'top': top,
        'right': right,
        'bottom': bottom
    }
```

### Example Conversion

Given:
- Normalized rect: `{x: 0.2, y: 0.3, width: 0.4, height: 0.2}`
- Page rendered at 612×792 pixels

Calculation:
```
left   = 0.2 × 612 = 122
right  = (0.2 + 0.4) × 612 = 367
bottom = (1.0 - 0.3) × 792 = 554
top    = (1.0 - 0.3 - 0.2) × 792 = 396
```

Result: Crop box `(122, 396, 367, 554)` for PIL

---

## Core Implementation Logic

### OCR Processing Pipeline

```python
def extract_text_from_region(pdf_bytes: bytes, page_num: int, rect: dict) -> str:
    """
    Extract text from a specific region of a PDF page.

    Pipeline:
    1. Convert PDF page to high-resolution image (300 DPI recommended for OCR)
    2. Convert normalized coordinates to pixel coordinates
    3. Crop the image to the specified region
    4. Run OCR on the cropped image
    5. Return extracted text
    """

    # Step 1: Convert PDF page to image
    from pdf2image import convert_from_bytes

    images = convert_from_bytes(
        pdf_bytes,
        first_page=page_num,
        last_page=page_num,
        dpi=300  # High DPI for better OCR accuracy
    )
    page_image = images[0]

    img_width, img_height = page_image.size

    # Step 2: Convert normalized coords to pixels
    pixel_coords = normalized_to_pixels(rect, img_width, img_height)

    # Step 3: Crop the region
    cropped = page_image.crop((
        pixel_coords['left'],
        pixel_coords['top'],
        pixel_coords['right'],
        pixel_coords['bottom']
    ))

    # Step 4: Run OCR
    import pytesseract
    text = pytesseract.image_to_string(cropped, lang='eng')

    # Step 5: Clean up and return
    return text.strip()
```

### Summarization Logic

```python
def generate_summary(texts: list[str]) -> dict:
    """
    Generate an adaptive summary from multiple text strings.

    Length guidelines:
    - Short input (<500 words): ~100-150 words (20-30%)
    - Medium input (500-2000 words): ~200-400 words (20-25%)
    - Long input (>2000 words): ~400-600 words (15-20%)
    """

    # Combine all texts
    combined = '\n\n'.join(texts)
    word_count = len(combined.split())

    # Determine target length
    if word_count < 500:
        target_words = int(word_count * 0.25)
    elif word_count < 2000:
        target_words = int(word_count * 0.22)
    else:
        target_words = int(word_count * 0.17)

    # Call summarization service (example with OpenAI)
    import openai

    response = openai.ChatCompletion.create(
        model="gpt-4-turbo",
        messages=[
            {
                "role": "system",
                "content": f"You are a medical document summarizer. Create a concise summary of approximately {target_words} words. Focus on key medical information: diagnoses, medications, vital signs, and treatment plans."
            },
            {
                "role": "user",
                "content": f"Please summarize the following medical documentation:\n\n{combined}"
            }
        ],
        max_tokens=target_words * 2,  # Tokens ≈ 0.75 words
        temperature=0.3  # Lower temperature for factual accuracy
    )

    return {
        "summary": response.choices[0].message.content,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "model_version": "gpt-4-turbo"
    }
```

---

## Data Models

### PDF Document (Storage)

```python
class PDFDocument:
    pdf_id: str          # UUID v4
    filename: str        # Original filename
    size: int            # File size in bytes
    page_count: int      # Number of pages
    uploaded_at: datetime
    content: bytes       # PDF file bytes (or path to stored file)
    expires_at: datetime # Optional TTL for cleanup
```

### OCR Request

```python
class OCRRequest:
    pdf_id: str
    page: int           # 1-indexed
    rect: NormalizedRect

class NormalizedRect:
    x: float      # 0-1, left edge
    y: float      # 0-1, bottom edge (PDF coords)
    width: float  # 0-1
    height: float # 0-1
```

### OCR Response

```python
class OCRResponse:
    id: str        # UUID for this result
    text: str      # Extracted text
    image_id: str  # Optional reference to cropped image
```

### Summary Request/Response

```python
class SummaryRequest:
    texts: list[str]

class SummaryResponse:
    summary: str
    timestamp: str    # ISO 8601
    model_version: str
```

---

## Storage Options

### Option 1: In-Memory (Development/Testing)

```python
pdf_store: dict[str, PDFDocument] = {}
```

Pros: Simple, fast
Cons: Data lost on restart, doesn't scale

### Option 2: Redis (Recommended for Production)

```python
import redis

r = redis.Redis()

def store_pdf(pdf_id: str, pdf_bytes: bytes, ttl: int = 3600):
    r.setex(f"pdf:{pdf_id}", ttl, pdf_bytes)

def get_pdf(pdf_id: str) -> bytes:
    return r.get(f"pdf:{pdf_id}")
```

Pros: Fast, TTL support, scales horizontally
Cons: Requires Redis instance

### Option 3: S3/MinIO (Large Files)

```python
import boto3

s3 = boto3.client('s3')

def store_pdf(pdf_id: str, pdf_bytes: bytes):
    s3.put_object(Bucket='pdf-uploads', Key=pdf_id, Body=pdf_bytes)

def get_pdf(pdf_id: str) -> bytes:
    response = s3.get_object(Bucket='pdf-uploads', Key=pdf_id)
    return response['Body'].read()
```

Pros: Unlimited storage, durability
Cons: Higher latency, cost

---

## Security Requirements

### Input Validation

1. **File Upload**:
   - Validate MIME type is `application/pdf`
   - Check file size ≤ 10 MB
   - Scan PDF structure for malicious content (JavaScript, external links)
   - Generate secure random UUID for pdf_id

2. **OCR Request**:
   - Validate pdf_id exists
   - Validate page number is within bounds
   - Validate rect coordinates are numbers in 0-1 range

3. **Summarization Request**:
   - Validate texts is a non-empty array
   - Sanitize text content before processing

### CSRF Protection

- Accept `X-CSRF-Token` header on all POST/DELETE requests
- Validate token against session or cookie

### CORS Configuration

```python
# For development (adjust for production)
CORS_ORIGINS = ["http://localhost:3000"]
CORS_METHODS = ["GET", "POST", "DELETE", "OPTIONS"]
CORS_HEADERS = ["Content-Type", "X-CSRF-Token"]
```

### Rate Limiting

Recommended limits:
- `/api/upload-pdf`: 10 requests/minute per IP
- `/api/snip-crop`: 60 requests/minute per IP
- `/api/summarize`: 10 requests/minute per IP

### Data Handling

- **No persistence of sensitive data**: PDFs should be deleted after session ends or TTL expires
- **No logging of PDF content**: Do not log extracted text or file contents
- **HTTPS only**: Enforce TLS in production

---

## Performance Requirements

| Endpoint | Target Response Time | Notes |
|----------|---------------------|-------|
| `/api/upload-pdf` | < 3 seconds | For 10 MB file |
| `/api/snip-crop` | < 1.5 seconds | For typical text region |
| `/api/summarize` | < 5 seconds | For medium-length input |
| `/api/health` | < 100 ms | Simple health check |

### Frontend Timeout Configuration

- Upload: No specific timeout (browser default)
- OCR: 30 seconds per request
- Summarization: No specific timeout (but should complete in reasonable time)

---

## Dependencies

### Python (Recommended)

```txt
# requirements.txt
fastapi>=0.104.0
uvicorn>=0.24.0
python-multipart>=0.0.6
pdf2image>=1.16.3
pytesseract>=0.3.10
Pillow>=10.1.0
openai>=1.3.0  # or anthropic for Claude
redis>=5.0.0  # optional, for storage
boto3>=1.33.0  # optional, for S3
pydantic>=2.5.0
```

### System Dependencies

```bash
# Ubuntu/Debian
apt-get install -y poppler-utils tesseract-ocr tesseract-ocr-eng

# macOS
brew install poppler tesseract

# Windows
# Install Poppler and Tesseract manually, add to PATH
```

---

## Example FastAPI Implementation

```python
from fastapi import FastAPI, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import uuid

app = FastAPI(title="OCR Snipping API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage (use Redis/S3 in production)
pdf_store = {}

class Rect(BaseModel):
    x: float
    y: float
    width: float
    height: float

class SnipRequest(BaseModel):
    pdf_id: str
    page: int
    rect: Rect

class SummarizeRequest(BaseModel):
    texts: List[str]

@app.post("/api/upload-pdf")
async def upload_pdf(file: UploadFile):
    # Validate
    if not file:
        raise HTTPException(400, detail="No file provided")
    if file.content_type != "application/pdf":
        raise HTTPException(400, detail="Invalid file type. Only PDF files are accepted.")

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(400, detail="File exceeds 10 MB limit")

    # Store
    pdf_id = str(uuid.uuid4())
    pdf_store[pdf_id] = {
        "content": content,
        "filename": file.filename,
        "size": len(content)
    }

    # Get page count (implement with pdf2image or PyPDF2)
    page_count = get_page_count(content)

    return {
        "pdf_id": pdf_id,
        "filename": file.filename,
        "size": len(content),
        "page_count": page_count,
        "message": "PDF uploaded successfully"
    }

@app.post("/api/snip-crop")
async def snip_crop(req: SnipRequest):
    if req.pdf_id not in pdf_store:
        raise HTTPException(404, detail="PDF not found")

    pdf_data = pdf_store[req.pdf_id]

    # Extract text (implement with pdf2image + pytesseract)
    text = extract_text_from_region(
        pdf_data["content"],
        req.page,
        req.rect.dict()
    )

    return {
        "id": str(uuid.uuid4()),
        "text": text,
        "image_id": f"img_{uuid.uuid4().hex[:8]}"
    }

@app.post("/api/summarize")
async def summarize(req: SummarizeRequest):
    if not req.texts:
        raise HTTPException(400, detail="texts array cannot be empty")

    # Generate summary (implement with OpenAI/Claude)
    result = generate_summary(req.texts)

    return result

@app.get("/api/health")
async def health():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat() + "Z"}
```

---

## Testing

### Unit Tests

```python
def test_coordinate_conversion():
    rect = {"x": 0.2, "y": 0.3, "width": 0.4, "height": 0.2}
    result = normalized_to_pixels(rect, 612, 792)

    assert result["left"] == 122
    assert result["right"] == 367
    assert result["top"] == 396
    assert result["bottom"] == 554

def test_upload_validates_file_type():
    response = client.post("/api/upload-pdf", files={"file": ("test.txt", b"hello", "text/plain")})
    assert response.status_code == 400
    assert "Invalid file type" in response.json()["detail"]
```

### Integration Tests

```python
def test_full_ocr_flow():
    # Upload PDF
    with open("test.pdf", "rb") as f:
        response = client.post("/api/upload-pdf", files={"file": f})
    pdf_id = response.json()["pdf_id"]

    # Extract text
    response = client.post("/api/snip-crop", json={
        "pdf_id": pdf_id,
        "page": 1,
        "rect": {"x": 0.1, "y": 0.5, "width": 0.8, "height": 0.1}
    })
    assert response.status_code == 200
    assert "text" in response.json()
```

---

## Deployment Checklist

- [ ] Set up HTTPS with valid SSL certificate
- [ ] Configure CORS for production domain
- [ ] Set up Redis or S3 for PDF storage
- [ ] Configure OCR engine (Tesseract or cloud service)
- [ ] Set up summarization API keys (OpenAI/Claude)
- [ ] Configure rate limiting
- [ ] Set up logging (without sensitive data)
- [ ] Configure health check monitoring
- [ ] Set up TTL-based cleanup for stored PDFs
- [ ] Load testing for expected concurrent users

---

## Environment Variables

```bash
# Required
OCR_ENGINE=tesseract  # or "google-vision", "aws-textract"
SUMMARIZATION_API_KEY=sk-...  # OpenAI/Anthropic API key
SUMMARIZATION_MODEL=gpt-4-turbo  # or claude-3-sonnet

# Storage (choose one)
STORAGE_TYPE=memory  # or "redis", "s3"
REDIS_URL=redis://localhost:6379
S3_BUCKET=pdf-uploads
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...

# Security
CORS_ORIGINS=http://localhost:3000,https://app.example.com
CSRF_SECRET=your-secret-key

# Performance
PDF_TTL_SECONDS=3600  # 1 hour
MAX_FILE_SIZE_MB=10
OCR_DPI=300
```

---

## Appendix: Frontend API Service Reference

The frontend uses these functions to call the backend (from `src/services/api.js`):

```javascript
// Upload PDF - sends multipart/form-data
export async function uploadPDF(file) {
  // POST /api/upload-pdf
  // Returns: { pdf_id, filename, size, page_count, message }
}

// OCR extraction - sends JSON
export async function extractText(snipData) {
  // POST /api/snip-crop
  // Body: { pdf_id, page, rect: {x, y, width, height} }
  // Returns: { id, text, image_id }
}

// Summarization - sends JSON
export async function summarizeTexts(texts) {
  // POST /api/summarize
  // Body: { texts: string[] }
  // Returns: { summary, timestamp, model_version }
}

// Health check
export async function healthCheck() {
  // GET /api/health
  // Returns: boolean (true if healthy)
}
```

---

## Contact & Support

For questions about frontend integration, refer to:
- Frontend repository: Current directory
- Frontend spec: `specs/001-ocr-snipping-app/spec.md`
- MSW mock handlers: `src/mocks/handlers/` (reference implementation)
