# Feature Specification: OCR Snipping & Summarization Application

**Feature Branch**: `001-ocr-snipping-app`
**Created**: 2025-10-29
**Status**: Draft
**Input**: User description: "Build OCR Snipping and Summarization application for medical associates"

## Clarifications

### Session 2025-10-29

- Q: How do users select one or more text boxes before performing operations on them? → A: Single click selects one box; focus moves to that box; operations apply to focused box only
- Q: What operations should be included in the undo/redo history? → A: All user actions including snip creation/deletion and text box operations
- Q: What should be the default summary length and can users adjust it? → A: Adaptive length based on input text volume, no fixed limit
- Q: Can users create a new snip while OCR is still processing a previous one? → A: Non-blocking: Users can draw new snips immediately; OCR requests queued and processed in order
- Q: Should the application implement any client-side state persistence for recovery from crashes or accidental closures? → A: No persistence: All state lost on browser close/refresh (aligns with session-based assumption)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Upload and View PDF Document (Priority: P1) 🎯 MVP

As a medical associate, I need to upload a scanned PDF document and view it page by page so that I can identify regions of interest for text extraction.

**Why this priority**: This is the foundation of the entire workflow. Without the ability to upload and view PDFs, no other functionality is possible. This story delivers immediate value by allowing users to access their documents digitally.

**Independent Test**: Can be fully tested by uploading a valid PDF file, verifying it displays correctly with multiple pages, and navigating through pages using thumbnails and controls. Success means the document is viewable and navigable without any text extraction features.

**Acceptance Scenarios**:

1. **Given** I am on the application home screen, **When** I drag and drop a valid PDF file (under 10 MB), **Then** the file is validated and the PDF viewer displays the first page with thumbnails visible
2. **Given** a PDF document is loaded, **When** I click on page 3 thumbnail, **Then** the viewer navigates to page 3 and highlights the selected thumbnail
3. **Given** a PDF is displayed, **When** I use zoom controls to enlarge the page, **Then** the page scales appropriately and I can pan to view different areas
4. **Given** I am on the home screen, **When** I attempt to upload a file larger than 10 MB, **Then** I see an error message "File exceeds 10 MB limit" and the file is rejected
5. **Given** I am on the home screen, **When** I attempt to upload a non-PDF file (e.g., DOCX, JPG), **Then** I see an error message "Unsupported file type. Please upload a PDF" and the file is rejected

---

### User Story 2 - Select and Extract Text from PDF Regions (Priority: P2)

As a medical associate, I need to draw rectangular selections on specific regions of the PDF and extract text via OCR so that I can capture relevant medical information without manual retyping.

**Why this priority**: This is the core value proposition of the application. Text extraction eliminates manual transcription errors and saves significant time. This story builds on the PDF viewing foundation and delivers the primary business value.

**Independent Test**: Can be fully tested by loading a PDF, drawing multiple rectangular selections on different pages, verifying that each selection triggers text extraction, and confirming that extracted text appears in editable text boxes. Success means accurate text extraction from user-selected regions.

**Acceptance Scenarios**:

1. **Given** a PDF page is displayed, **When** I click and drag to draw a rectangle around a text region, **Then** a semi-transparent selection box appears with resize handles
2. **Given** I have drawn a selection rectangle, **When** I release the mouse button, **Then** the system sends the region coordinates for OCR processing, displays a loading indicator, and allows me to immediately draw another snip (non-blocking)
3. **Given** OCR processing completes, **When** the text is extracted, **Then** a new editable text box appears in the side panel containing the extracted text (results appear in order of snip creation)
4. **Given** I have created multiple snips on different pages, **When** I view the text box list, **Then** each text box is labeled with its page number and displays in order of creation
5. **Given** I am using keyboard navigation, **When** I press keyboard shortcuts to resize or move the selection rectangle, **Then** the rectangle adjusts accordingly and remains accessible without a mouse

---

### User Story 3 - Edit and Manage Extracted Text (Priority: P3)

As a medical associate, I need to edit, reorder, merge, and delete extracted text boxes so that I can correct OCR errors and organize information before summarization.

**Why this priority**: OCR is not 100% accurate, especially with medical terminology and handwritten notes. The ability to edit and manage text boxes ensures data accuracy and gives users control over their content organization before final summarization.

**Independent Test**: Can be fully tested by creating multiple text boxes with sample content, editing text within boxes, inserting new empty boxes, deleting unwanted boxes, merging adjacent boxes, and using undo/redo functionality. Success means full CRUD operations on text boxes with keyboard shortcuts functional.

**Acceptance Scenarios**:

1. **Given** I have extracted text in a text box, **When** I click inside the text box and edit the content, **Then** my changes are saved in real-time
2. **Given** I have multiple text boxes with text box #3 focused, **When** I press Ctrl+N, **Then** a new empty text box is inserted immediately after text box #3 (becoming the new text box #4)
3. **Given** I have a text box focused (clicked/selected), **When** I press the Delete key, **Then** the focused text box is removed from the list
4. **Given** I have a text box focused, **When** I press Shift+M, **Then** the focused text box content is merged with the next adjacent text box
5. **Given** I have made changes (snip creation, text box edits, insertions, deletions, merges), **When** I press Ctrl+Z, **Then** the last action is undone
6. **Given** I have undone an action, **When** I press Ctrl+Y, **Then** the action is redone (supports undo/redo for all user actions including snips and text box operations)
7. **Given** I am using keyboard navigation, **When** I press Tab/Shift+Tab, **Then** focus moves sequentially between text boxes

---

### User Story 4 - Summarize Extracted Text (Priority: P4)

As a medical associate, I need to request a concise summary of all extracted text so that I can quickly understand key information without reading through lengthy documents.

**Why this priority**: After text extraction and editing, users need a synthesized view of the information. Summarization provides the final deliverable that can be used in medical reports, patient communications, or documentation. This is the completion of the workflow.

**Independent Test**: Can be fully tested by creating multiple text boxes with sample medical text, clicking the Summarize button, verifying a loading state appears, confirming the summary is displayed, and testing copy/export functionality. Success means users receive a coherent summary of their extracted text that can be saved or shared.

**Acceptance Scenarios**:

1. **Given** I have one or more text boxes with content, **When** I click the "Summarize" button, **Then** the button is disabled, a loading spinner appears, and a request is sent for summarization
2. **Given** summarization is in progress, **When** the system receives the summary, **Then** the summary text is displayed below the text boxes with formatting preserved
3. **Given** a summary is displayed, **When** I click the "Copy" button, **Then** the summary text is copied to my clipboard
4. **Given** a summary is displayed, **When** I click the "Export" button, **Then** I can download the summary as a plain text or JSON file
5. **Given** I am using keyboard navigation, **When** I press Ctrl+Enter while focused on text boxes, **Then** the summarization process is triggered
6. **Given** I have deleted unwanted text boxes before summarizing, **When** I click "Summarize", **Then** only the remaining text boxes are included in the summary request

---

### Edge Cases

- **What happens when a PDF has 100+ pages?** The thumbnail panel should remain scrollable and performant, with virtualization if necessary to avoid rendering all thumbnails at once
- **What happens when OCR returns empty or garbled text?** The text box should display a message indicating "No text detected" or show the raw output, allowing users to manually enter correct text
- **What happens when the network connection fails during summarization?** The system should display an error message "Unable to connect. Please check your connection and try again" with a retry button, preserving the user's text box content
- **What happens when a user attempts to summarize with no text boxes?** The Summarize button should be disabled, and a tooltip should explain "Add at least one text box before summarizing"
- **What happens when a user zooms to 400% and draws a selection?** The coordinate conversion system must accurately normalize pixel coordinates regardless of zoom level, ensuring correct region extraction
- **What happens when a user tries to merge the last text box with a non-existent next box?** The Shift+M keyboard shortcut has no effect (no-op), and if a merge button exists in UI, it displays a disabled state with tooltip "Cannot merge: no adjacent box available"
- **What happens when undo/redo history is exhausted?** The Ctrl+Z and Ctrl+Y shortcuts should have no effect, and UI buttons (if present) should be disabled. The undo history includes all user actions: snip creation/deletion, text box operations (insert, delete, merge), and text edits
- **What happens when a user closes the browser during an upload or summarization?** The application does not persist any state; all data (uploaded PDF, text boxes, summaries) is lost. Upon returning, the user starts fresh and must re-upload the document. This design avoids storing sensitive medical data in browser storage
- **What happens when a user uses a screen reader?** All interactive elements must announce their purpose and state via ARIA labels, and status messages must be announced via live regions
- **What happens when a user creates more than 50 snips rapidly?** The 51st snip displays an error message "Too many pending OCR requests. Please wait for earlier snips to complete." The snip remains selectable but queuing is blocked until queue drops below 50.
- **What happens when an OCR request exceeds 30 seconds?** The request times out, the snip is marked as failed with error message "OCR request timed out. Click retry to try again." User can manually retry or delete the snip.

## Requirements *(mandatory)*

### Functional Requirements

#### File Upload & Validation

- **FR-001**: System MUST accept PDF files via drag-and-drop or file input selection
- **FR-002**: System MUST validate uploaded files to ensure MIME type is `application/pdf`
- **FR-003**: System MUST enforce a maximum file size of 10 MB
- **FR-004**: System MUST display clear error messages for invalid file types (e.g., "Unsupported file type. Please upload a PDF")
- **FR-005**: System MUST display clear error messages for oversized files (e.g., "File exceeds 10 MB limit")
- **FR-006**: System MUST inspect uploaded PDF structure using pdf-lib to detect embedded JavaScript, external URLs, or launch actions before processing; files with suspicious content MUST be rejected with error message "File contains potentially unsafe content"

#### PDF Display & Navigation

- **FR-007**: System MUST render multi-page PDF documents with navigation via thumbnail clicks, next/previous buttons, and keyboard shortcuts (Page Up/Down, arrow keys)
- **FR-008**: System MUST display thumbnail previews of all pages in a scrollable sidebar
- **FR-009**: System MUST provide zoom controls with levels: 50%, 75%, 100%, 125%, 150%, 200%, 300%, 400%, plus "fit to width" and "fit to page" modes; zoom in/out buttons increment/decrement by one level
- **FR-010**: System MUST support panning within zoomed pages via mouse drag or keyboard arrow keys
- **FR-011**: *[MERGED INTO FR-007]* ~~System MUST allow users to navigate between pages by clicking thumbnails or using next/previous buttons~~
- **FR-012**: System MUST display the current page number and total page count (e.g., "Page 3 of 15")

#### Region Selection (Snipping)

- **FR-013**: System MUST allow users to draw rectangular selections on any page by clicking and dragging
- **FR-014**: System MUST display a semi-transparent overlay with visible border during selection
- **FR-015**: System MUST provide resize handles on completed selections for adjustment
- **FR-016**: System MUST support keyboard-based selection resizing and movement for accessibility
- **FR-017**: System MUST convert pixel coordinates to normalized coordinates (0-1 range) relative to page dimensions
- **FR-018**: System MUST invert the y-axis when converting browser coordinates to PDF coordinate system (PDF origin is bottom-left)
- **FR-019**: System MUST allow multiple snips on the same page or across different pages

#### Coordinate Conversion Algorithm

The coordinate conversion from browser pixel coordinates to normalized PDF coordinates MUST follow this algorithm:

**Given**:
- Browser coordinates: `(browserX, browserY, browserWidth, browserHeight)` - rectangle in pixels from top-left origin
- Canvas scale factor: `scale` - rendering scale (e.g., 1.5 for high-DPI displays)
- Page dimensions: `(pageWidth, pageHeight)` - original PDF page size in points

**Step 1 - Convert to unscaled canvas coordinates**:
```
canvasX = browserX / scale
canvasY = browserY / scale
canvasWidth = browserWidth / scale
canvasHeight = browserHeight / scale
```

**Step 2 - Normalize to 0-1 range**:
```
normalizedX = canvasX / pageWidth
normalizedY = canvasY / pageHeight
normalizedWidth = canvasWidth / pageWidth
normalizedHeight = canvasHeight / pageHeight
```

**Step 3 - Invert Y-axis (browser top-left → PDF bottom-left)**:
```
pdfNormalizedY = 1.0 - (normalizedY + normalizedHeight)
```

**Final normalized PDF rectangle**: `{x: normalizedX, y: pdfNormalizedY, width: normalizedWidth, height: normalizedHeight}`

**Example**: For a 100×50px selection at (200, 300) on a 600×800px page with scale=1.5:
- Unscaled: (133.33, 200, 66.67, 33.33)
- Normalized: (0.222, 0.250, 0.111, 0.042)
- Y-inverted: y = 1.0 - (0.250 + 0.042) = 0.708
- **Result**: `{x: 0.222, y: 0.708, width: 0.111, height: 0.042}`

#### Text Extraction (OCR)

- **FR-020**: System MUST send normalized coordinates and page number to the OCR service for text extraction
- **FR-021**: System MUST display a loading indicator while OCR processing is in progress
- **FR-022**: System MUST create a new text box with extracted text upon successful OCR completion
- **FR-023**: System MUST handle OCR failures gracefully with user-friendly error messages
- **FR-024**: System MUST associate each text box with its source page number for reference
- **FR-025**: System MUST allow users to create new snips immediately without waiting for previous OCR requests to complete (non-blocking UI); OCR queue maximum size is 50 pending requests
- **FR-026**: System MUST queue multiple OCR requests and process them in FIFO order, displaying results as they arrive; each request has a 30-second timeout, after which the snip is marked as failed with retry option

#### Text Box Management

- **FR-027**: System MUST display extracted text in editable text boxes in an ordered list
- **FR-028**: Users MUST be able to edit text within any text box in real-time
- **FR-029**: Users MUST be able to insert new empty text boxes immediately after the currently focused text box (or at the end of the list if no box is focused)
- **FR-030**: Users MUST be able to delete the currently focused/selected text box
- **FR-031**: Users MUST be able to merge the focused text box with the next adjacent text box
- **FR-032**: System MUST provide undo (Ctrl+Z) and redo (Ctrl+Y) functionality for all user actions including snip creation/deletion, text box operations (insert, delete, merge), and text edits; undo history maintains last 50 actions in a FIFO circular buffer (oldest action is dropped when 51st action is added)
- **FR-033**: System MUST maintain text box order and numbering automatically

#### Keyboard Shortcuts & Accessibility

- **FR-034**: System MUST support Ctrl+N to insert a new text box
- **FR-035**: System MUST support Delete key to remove the currently focused text box
- **FR-036**: System MUST support Shift+M to merge the currently focused text box with the next one
- **FR-037**: System MUST support Ctrl+Z for undo and Ctrl+Y for redo
- **FR-038**: System MUST support Ctrl+Enter to trigger summarization
- **FR-039**: System MUST support Tab/Shift+Tab for sequential keyboard navigation between all interactive elements
- **FR-040**: System MUST provide ARIA roles and labels for all interactive components
- **FR-041**: System MUST meet WCAG 2.1 AA color contrast standards (minimum 4.5:1 ratio)
- **FR-042**: System MUST provide a high-contrast mode toggle for users with visual impairments
- **FR-043**: System MUST announce dynamic status messages (loading, success, errors) via ARIA live regions for screen readers

#### Summarization

- **FR-044**: System MUST provide a "Summarize" button that collects text from all existing text boxes (users delete unwanted boxes beforehand)
- **FR-045**: System MUST send text content to the summarization service; summary length is adaptive based on input text volume (backend determines appropriate length)
- **FR-046**: System MUST disable the Summarize button and show a loading spinner during processing
- **FR-047**: System MUST display the returned summary below the text boxes or in a dedicated panel
- **FR-048**: System MUST provide a "Copy" button to copy the summary to the clipboard
- **FR-049**: System MUST provide an "Export" button to download the summary as plain text or JSON
- **FR-050**: System MUST allow users to trigger summarization via Ctrl+Enter keyboard shortcut

#### Error Handling & Security

- **FR-051**: System MUST validate all user input to prevent XSS attacks (sanitize text content)
- **FR-052**: System MUST include CSRF tokens in all state-changing API requests
- **FR-053**: System MUST assume HTTPS connections and use SameSite=Strict cookies
- **FR-054**: System MUST display non-technical error messages to users (e.g., "Something went wrong" instead of stack traces)
- **FR-055**: System MUST allow users to retry failed operations (upload, OCR, summarization) without losing existing work
- **FR-056**: System MUST log technical error details for debugging purposes (not visible to end users)

#### Performance & Usability

- **FR-057**: System MUST load and render the initial page of a PDF within 3 seconds of upload
- **FR-058**: System MUST process OCR requests within 1.5 seconds for typical text regions
- **FR-059**: System MUST remain responsive during OCR and summarization operations (non-blocking UI allows creating new snips while OCR processes)
- **FR-060**: System MUST preserve user state (text boxes, edits) in memory during the current session if a background operation fails
- **FR-061**: System MUST NOT persist any user data (PDFs, text boxes, summaries) to browser storage (localStorage/sessionStorage) to avoid storing sensitive medical information client-side

### Key Entities

- **PDF Document**: Represents the uploaded scanned PDF file; attributes include file name, file size, total page count, upload timestamp
- **Page**: Represents a single page within the PDF document; attributes include page number, dimensions (width, height), rendered image/canvas
- **Snip (Selection)**: Represents a rectangular region selected by the user on a specific page; attributes include page number, normalized coordinates (x, y, width, height), creation timestamp, associated text box ID
- **Text Box**: Represents extracted or manually entered text; attributes include unique ID, source page number, text content (editable), creation order, modification timestamp, focus state (boolean indicating if currently selected)
- **Summary**: Represents the synthesized summary of multiple text boxes; attributes include summary text, source text box IDs, generation timestamp, character count (derived client-side via `summary.length`, not returned by API)

### Assumptions

- **Target Users**: Medical associates working with scanned medical documents (patient records, lab reports, prescriptions, insurance forms)
- **Document Types**: Primarily scanned PDFs with printed or handwritten text; documents may be multi-page (typically 1-50 pages)
- **OCR Accuracy**: OCR service is expected to have 80-95% accuracy depending on document quality; users will need to manually correct errors
- **Summarization Service**: Backend summarization service uses natural language processing to generate concise summaries with adaptive length:
  - **Short input** (<500 words): Summary ~100-150 words (20-30% of original)
  - **Medium input** (500-2000 words): Summary ~200-400 words (20-25% of original)
  - **Long input** (>2000 words): Summary ~400-600 words (15-20% of original)

  Length is determined by backend model based on content complexity and information density. Frontend sends raw text without length constraints per clarification #3.
- **Network Environment**: Users have stable internet connections; occasional network failures should be handled gracefully with retry mechanisms
- **Browser Support**: Modern browsers (Chrome, Firefox, Safari, Edge) with JavaScript enabled; no Internet Explorer support required
- **Concurrent Users**: System is designed for individual use; no real-time collaboration or multi-user editing required
- **Data Retention**: User data (uploaded PDFs, text boxes, summaries) is session-based and exists only in browser memory during the active session. No data is persisted to browser storage (localStorage/sessionStorage) or backend. All data is lost on browser close/refresh. This approach avoids storing sensitive medical information client-side and keeps the MVP simple
- **Authentication**: No user authentication or login required for MVP; anyone with access to the URL can use the application. **SECURITY WARNING**: This is suitable only for internal tools behind network-level access controls (VPN, firewall, etc.). Public deployment requires authentication implementation. Application will display a dismissible warning banner on startup. Future authentication integration points are documented in README.md (App.jsx route protection, api.js request interceptors).
- **Mobile Support**: Primary focus is desktop/laptop use; mobile responsiveness is a nice-to-have but not critical for MVP
- **Internationalization**: English language only for MVP; UI strings and summarization assume English text

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Medical associates can upload a 5-page PDF document and view all pages with thumbnails within 5 seconds
- **SC-002**: Users can draw a selection rectangle and receive extracted text within 2 seconds for 90% of typical text regions
- **SC-003**: 85% of users successfully complete the full workflow (upload → snip → edit → summarize) on their first attempt without assistance
- **SC-004**: Users can edit extracted text and correct OCR errors within an average of 30 seconds per text box
- **SC-005**: The Summarize feature generates an appropriately-sized summary of 5 text boxes within 3 seconds (length adapts to input volume)
- **SC-006**: Users can copy a generated summary to their clipboard in one click
- **SC-007**: 100% of interactive elements are keyboard-accessible and navigable via Tab/Shift+Tab
- **SC-008**: All color contrast ratios meet or exceed 4.5:1 for WCAG 2.1 AA compliance
- **SC-009**: Users receive clear, actionable error messages for all failure scenarios (invalid file, network error, OCR failure) within 1 second of the error occurring
- **SC-010**: The application supports PDFs up to 50 pages with smooth scrolling and page navigation without performance degradation
- **SC-011**: Users can perform undo/redo operations on text box edits with immediate visual feedback (<100ms)
- **SC-012**: Screen reader users can complete the entire workflow using only keyboard navigation and audio feedback
- **SC-013**: The application remains responsive during all operations (no UI freezing) with loading indicators for operations exceeding 500ms
- **SC-014**: 90% of medical associates report reduced time spent on manual transcription compared to their previous workflow
