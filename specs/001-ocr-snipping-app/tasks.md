# Tasks: OCR Snipping & Summarization Application

**Input**: Design documents from `/specs/001-ocr-snipping-app/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅

**Tests**: Tests are MANDATED by Constitution Principle V (NON-NEGOTIABLE). Test tasks are included in Phase 8 per constitution requirements for unit tests (Jest), E2E tests (Cypress/Playwright), and accessibility tests (axe-core).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: Frontend-only React application at repository root
- Paths: `src/`, `public/`, `config/` per plan.md structure

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Create project structure per plan.md (src/components/, src/services/, src/utils/, src/mocks/, src/contexts/, src/hooks/, public/, config/)
- [X] T002 Initialize React 18 project with Create React App and install core dependencies (react@18.2.0, react-dom@18.2.0)
- [X] T003 [P] Install PDF rendering dependencies (@react-pdf-viewer/core@3.12.0, @react-pdf-viewer/default-layout@3.12.0, @react-pdf-viewer/thumbnail@3.12.0, @react-pdf-viewer/zoom@3.12.0, pdfjs-dist@3.4.120)
- [X] T004 [P] Install Material UI dependencies (@mui/material@5.14.0, @mui/icons-material@5.14.0, @emotion/react@11.11.0, @emotion/styled@11.11.0)
- [X] T005 [P] Install development dependencies (msw@2.0.0, eslint with React and accessibility plugins, prettier)
- [X] T005a [P] Install security dependencies (dompurify@3.0.0, isomorphic-dompurify for SSR compatibility)
- [X] T006 [P] Configure ESLint with React and jsx-a11y plugins per constitution quality gates in config/eslintrc.js
- [X] T007 [P] Configure Prettier with standard formatting rules in config/.prettierrc.js
- [X] T008 Initialize MSW service worker with `npx msw init ./public`
- [X] T008a [P] Install performance testing dependencies (lighthouse@10.4.0, @lhci/cli@0.12.0) and create performance profiling script in package.json (npm run perf)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T009 Create accessible MUI theme with WCAG 2.1 AA compliance (contrastThreshold: 4.5, high-contrast mode toggle) in src/theme.js
- [X] T010 [P] Setup MSW browser worker configuration in src/mocks/browser.js per research.md findings
- [X] T011 [P] Create OCR mock handlers in src/mocks/handlers/ocrHandlers.js with delay simulation (1200ms) and error scenarios
- [X] T012 [P] Create summarization mock handlers in src/mocks/handlers/summaryHandlers.js with delay simulation (1500ms) and error scenarios
- [X] T013 Consolidate all MSW handlers in src/mocks/handlers.js (imports ocrHandlers and summaryHandlers)
- [X] T014 Create coordinate conversion utility functions in src/utils/coordinates.js (convertToNormalizedPDFCoords, extractPageDimensions) per research.md
- [X] T015 Create comprehensive undo/redo hook in src/hooks/useUndo.js using command pattern with 50-action FIFO circular buffer (oldest action dropped on overflow) per research.md
- [X] T016 Create OCR queue manager in src/services/ocrQueue.js for non-blocking sequential FIFO processing with max queue size of 50 requests and 30-second timeout per request per FR-025, FR-026
- [X] T017 Create centralized API service wrapper in src/services/api.js (fetch wrappers for /api/snip-crop and /api/summarize)
- [X] T018 Create AppContext provider in src/contexts/AppContext.jsx with useUndo integration (state: snips, textBoxes, focusedBoxId, summary, pdfDocument)
- [X] T019 Create root App component in src/App.jsx with MUI ThemeProvider, AppContext provider, aria-live regions (pre-rendered), and keyboard shortcut handlers
- [X] T020 Update src/index.js to initialize MSW before rendering React root per research.md (async enableMocking with conditional NODE_ENV check)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Upload and View PDF Document (Priority: P1) 🎯 MVP

**Goal**: Enable medical associates to upload scanned PDF documents via drag-and-drop or file input, validate file type and size, and render the PDF with page-by-page navigation, thumbnails, and zoom controls

**Independent Test**: Upload a valid PDF file (under 10 MB), verify it displays correctly with multiple pages visible in thumbnails, navigate through pages using thumbnails and controls, zoom in/out and pan, attempt invalid file uploads (oversized, wrong type) and verify error messages

### Implementation for User Story 1

- [X] T021 [P] [US1] Create PDFUploader component in src/components/PDFUploader/PDFUploader.jsx with drag-and-drop support, file input fallback, and MIME type validation (application/pdf, max 10 MB per FR-002, FR-003)
- [X] T021a [P] [US1] Implement PDF structure validation in PDFUploader to detect embedded JavaScript or malicious content using pdf-lib inspection before upload (FR-006)
- [X] T022 [P] [US1] Add ARIA roles and keyboard accessibility to PDFUploader component (aria-label on drop zone, tabindex="0", Enter/Space to activate file dialog per FR-040)
- [X] T023 [P] [US1] Style PDFUploader component in src/components/PDFUploader/PDFUploader.module.css with high-contrast mode support and WCAG 2.1 AA compliant colors
- [X] T024 [US1] Integrate PDFUploader with AppContext to store uploaded PDF document metadata (file name, size, page count, upload timestamp per Key Entities in spec.md)
- [X] T025 [US1] Add error handling and user-friendly messages to PDFUploader for invalid file types, oversized files, and upload failures (FR-004, FR-005, FR-054)
- [X] T026 [P] [US1] Create PDFViewerPane component in src/components/PDFViewerPane/PDFViewerPane.jsx using @react-pdf-viewer/default-layout with thumbnailPlugin and zoomPlugin per research.md
- [X] T027 [P] [US1] Configure PDF.js Worker in PDFViewerPane using CDN URL (https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js) per research.md
- [X] T028 [P] [US1] Style PDFViewerPane component in src/components/PDFViewerPane/PDFViewerPane.module.css for responsive layout and high-contrast mode
- [X] T029 [US1] Implement page navigation controls in PDFViewerPane (next/previous buttons, current page indicator "Page X of Y" per FR-012)
- [X] T030 [US1] Add zoom controls to PDFViewerPane with 8 preset levels (50%, 75%, 100%, 125%, 150%, 200%, 300%, 400%) plus fit-to-width and fit-to-page modes per FR-009
- [X] T031 [US1] Add keyboard navigation support to PDFViewerPane (arrow keys for panning, Page Up/Down for page navigation per FR-010)
- [X] T032 [US1] Implement thumbnail sidebar in PDFViewerPane with scrollable virtualized list for 50+ page PDFs per edge case in spec.md
- [X] T033 [US1] Extract page dimensions using onDocumentLoad callback and store in AppContext (width, height per research.md extractPageDimensions function)
- [X] T034 [US1] Add ARIA announcements for page navigation and zoom changes via pre-rendered aria-live regions (FR-043)
- [X] T035 [US1] Integrate PDFViewerPane with App.jsx layout (display after successful upload)
- [X] T036 [US1] Add performance optimization to ensure PDF initial page renders within 3 seconds (FR-057, SC-001)

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently. Users can upload PDFs, view all pages with thumbnails, navigate, and zoom without any text extraction features.

---

## Phase 4: User Story 2 - Select and Extract Text from PDF Regions (Priority: P2)

**Goal**: Enable medical associates to draw rectangular selections (snips) on specific PDF regions, trigger OCR text extraction, and see extracted text appear in editable text boxes in order of snip creation (non-blocking UI with queued processing)

**Independent Test**: Load a PDF, draw multiple rectangular selections on different pages, verify each selection triggers text extraction with loading indicators, confirm extracted text appears in editable text boxes in creation order, verify non-blocking behavior (can draw new snips while OCR processes previous requests)

### Implementation for User Story 2

- [X] T037 [P] [US2] Create SnipOverlay component in src/components/SnipOverlay/SnipOverlay.jsx with transparent canvas overlay positioned absolutely over PDFViewerPane canvas
- [X] T038 [P] [US2] Implement mouse event handlers in SnipOverlay (mousedown, mousemove, mouseup) to draw rectangular selections with semi-transparent fill and colored stroke (FR-013, FR-014)
- [X] T039 [P] [US2] Style SnipOverlay component in src/components/SnipOverlay/SnipOverlay.module.css for overlay positioning and selection rectangle appearance
- [X] T040 [US2] Integrate SnipOverlay with onCanvasLayerRender plugin from React PDF Viewer to access canvas element and scale factor per research.md
- [X] T041 [US2] Add resize handles to completed selections in SnipOverlay for adjustment after initial draw (FR-015)
- [X] T042 [US2] Implement keyboard-based selection resizing and movement in SnipOverlay using arrow keys for accessibility (FR-016)
- [X] T043 [US2] Integrate coordinate conversion utility in SnipOverlay onMouseUp handler to convert pixel coordinates to normalized PDF coordinates using algorithm specified in spec.md (3-step: unscale → normalize → invert Y-axis) via convertToNormalizedPDFCoords from src/utils/coordinates.js per research.md
- [X] T044 [US2] Add snip to AppContext state immediately on mouseup (non-blocking UI per clarification #4, FR-025)
- [X] T045 [US2] Enqueue OCR request to ocrQueue.enqueue with snip data (page number, normalized rect) per research.md OCRQueue pattern
- [X] T046 [US2] Add loading indicator overlay per snip while OCR processes (status: 'pending' → 'processing' → 'success'/'error' per FR-021)
- [X] T047 [US2] Handle OCR success callback to create new TextBox entity in AppContext with extracted text, source page number, creation order, unique ID (FR-022, FR-024, Key Entities in spec.md)
- [X] T048 [US2] Handle OCR failure callback to display user-friendly error message and mark snip as failed (FR-023, FR-054)
- [X] T049 [US2] Add ARIA announcements for OCR status changes (loading, success, error) via aria-live regions (FR-043)
- [X] T050 [P] [US2] Create SnipList component in src/components/SnipList/SnipList.jsx to display ordered list of editable TextBox entities
- [X] T051 [P] [US2] Render each TextBox as MUI TextField (multiline) with source page number label and editable text content in SnipList (FR-027, FR-028)
- [X] T052 [P] [US2] Style SnipList component in src/components/SnipList/SnipList.module.css for scrollable side panel layout and high-contrast mode
- [X] T053 [US2] Implement single-click focus model in SnipList: clicking a text box sets focusedBoxId in AppContext (clarification #1)
- [X] T054 [US2] Add visual focus indicator to currently focused text box with WCAG 2.1 AA compliant focus ring (FR-041)
- [X] T055 [US2] Implement Tab/Shift+Tab navigation between text boxes in SnipList (FR-039)
- [X] T056 [US2] Add ARIA roles to SnipList container (role="region", aria-label="Extracted text boxes") and each text box (aria-labelledby with page number) per FR-040
- [ ] T057 [US2] Verify OCR requests process sequentially in order of snip creation (FIFO queue, FR-026)
- [X] T058 [US2] Add edge case handling for "No text detected" scenario when OCR returns empty result per edge case in spec.md
- [ ] T059 [US2] Add edge case handling for accurate coordinate conversion at 400% zoom per edge case in spec.md
- [ ] T060 [US2] Verify OCR processing completes within 1.5 seconds for 90% of requests (FR-058, SC-002)

**Checkpoint**: At this point, User Story 2 should be fully functional and testable independently. Users can draw snips, see loading indicators, and receive extracted text in editable text boxes without blocking UI interactions.

---

## Phase 5: User Story 3 - Edit and Manage Extracted Text (Priority: P3)

**Goal**: Enable medical associates to edit text within text boxes, insert new empty text boxes, delete focused text boxes, merge adjacent text boxes, and undo/redo all operations (snips, text box operations, text edits) using keyboard shortcuts

**Independent Test**: Create multiple text boxes with sample content, edit text within boxes, insert new empty boxes with Ctrl+N, delete focused boxes with Delete key, merge adjacent boxes with Shift+M, use Ctrl+Z/Y to undo/redo operations, verify Tab/Shift+Tab navigation works correctly

### Implementation for User Story 3

- [x] T061 [US3] Add real-time text editing capability to SnipList TextFields with onChange handler that updates AppContext state via setState (pushes to undo history per FR-028)
- [x] T062 [US3] Implement Ctrl+N keyboard shortcut handler in App.jsx to insert new empty text box immediately after currently focused text box (or at list end if no focus) in SnipList (FR-029, FR-034)
- [x] T063 [US3] Implement Delete key handler in SnipList to remove currently focused text box from AppContext state (FR-035)
- [x] T064 [US3] Implement Shift+M keyboard shortcut handler in SnipList to merge focused text box with next adjacent text box (FR-036)
- [x] T065 [US3] Add edge case handling for merge operation when no adjacent box available: Shift+M keyboard shortcut performs no-op (silent failure) when focused box is last in list per edge case in spec.md
- [x] T066 [US3] Integrate useUndo hook with AppContext to enable comprehensive undo/redo for all user actions: snip creation/deletion, text box operations (insert, delete, merge), and text edits (clarification #2, FR-032)
- [x] T067 [US3] Implement Ctrl+Z keyboard shortcut in App.jsx to trigger undo() from useUndo hook (FR-037)
- [x] T068 [US3] Implement Ctrl+Y keyboard shortcut in App.jsx to trigger redo() from useUndo hook (FR-037)
- [x] T069 [US3] Add visual feedback for undo/redo operations with immediate state updates (<100ms per SC-011)
- [x] T070 [US3] Add ARIA announcements for undo/redo operations via aria-live regions (e.g., "Undone: deleted text box") per FR-043
- [x] T071 [US3] Add edge case handling for exhausted undo/redo history (disable shortcuts when canUndo/canRedo is false) per edge case in spec.md
- [x] T072 [US3] Verify automatic text box order and numbering maintenance after insertions, deletions, and merges (FR-033)
- [x] T073 [US3] Add keyboard shortcut documentation tooltip or help overlay for Ctrl+N, Delete, Shift+M, Ctrl+Z/Y shortcuts
- [ ] T074 [US3] Verify all keyboard shortcuts work correctly with screen readers (announce actions via aria-live) per SC-012

**Checkpoint**: At this point, User Story 3 should be fully functional and testable independently. Users can perform full CRUD operations on text boxes with keyboard shortcuts and undo/redo all actions.

---

## Phase 6: User Story 4 - Summarize Extracted Text (Priority: P4)

**Goal**: Enable medical associates to generate concise AI-powered summaries of all text boxes with adaptive length, copy summaries to clipboard, and export summaries as plain text or JSON files

**Independent Test**: Create multiple text boxes with sample medical text, click Summarize button (or press Ctrl+Enter), verify loading state appears, confirm summary displays with appropriate length based on input volume, test Copy button copies to clipboard, test Export button downloads file

### Implementation for User Story 4

- [ ] T075 [P] [US4] Create SummarizePanel component in src/components/SummarizePanel/SummarizePanel.jsx with Summarize button, loading spinner, and summary display area
- [ ] T076 [P] [US4] Style SummarizePanel component in src/components/SummarizePanel/SummarizePanel.module.css for bottom panel layout and high-contrast mode
- [ ] T077 [US4] Add ARIA attributes to SummarizePanel (button role, aria-label="Summarize all text boxes", aria-live region for summary result) per FR-040
- [ ] T078 [US4] Implement Summarize button click handler to collect text from all TextBox entities in AppContext state (FR-044)
- [ ] T079 [US4] Add validation to disable Summarize button when no text boxes exist with tooltip explanation per edge case in spec.md
- [ ] T080 [US4] Call summarization API via api.js service with collected texts (adaptive length determined by backend per clarification #3, FR-045)
- [ ] T081 [US4] Disable Summarize button and show loading spinner during API request (FR-046)
- [ ] T082 [US4] Display returned summary in SummarizePanel with formatted text (FR-047)
- [ ] T083 [US4] Implement Copy button to copy summary text to clipboard using navigator.clipboard.writeText() API (FR-048)
- [ ] T084 [US4] Add success toast/message after copying to clipboard with ARIA announcement
- [ ] T085 [US4] Implement Export button with dropdown menu for plain text (.txt) and JSON (.json) export formats (FR-049)
- [ ] T086 [US4] Create export utility function to generate downloadable files (Blob with MIME types text/plain and application/json)
- [ ] T087 [US4] Implement Ctrl+Enter keyboard shortcut in App.jsx to trigger summarization (FR-050)
- [ ] T088 [US4] Add error handling for summarization failures with user-friendly message and retry button (FR-055)
- [ ] T089 [US4] Add ARIA announcements for summarization status (processing, success, error) via aria-live regions (FR-043)
- [ ] T090 [US4] Verify summarization completes within 3 seconds for 5 text boxes (SC-005)
- [ ] T091 [US4] Add edge case handling for network connection failure during summarization per edge case in spec.md
- [ ] T092 [US4] Integrate SummarizePanel with App.jsx layout (display at bottom of screen)

**Checkpoint**: At this point, User Story 4 should be fully functional and testable independently. Users receive coherent summaries with adaptive length that can be copied or exported.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and final quality assurance

- [ ] T093 [P] Install and integrate DOMPurify library (^3.0.0) for HTML sanitization; apply to all user-editable text (TextBox content, summary display) to prevent XSS attacks per FR-051
- [ ] T094 [P] Add CSRF token inclusion in all API requests (snip-crop, summarize endpoints per FR-052)
- [ ] T095 [P] Verify HTTPS assumption and SameSite=Strict cookie configuration in API service per FR-053
- [ ] T096 [P] Add high-contrast mode toggle button in App.jsx that switches between light and accessible themes (FR-042)
- [ ] T097 [P] Verify all color contrast ratios meet WCAG 2.1 AA standards (minimum 4.5:1) using automated contrast checker (FR-041, SC-008)
- [ ] T098 [P] Add loading indicators for all operations exceeding 500ms (PDF upload, OCR, summarization per SC-013)
- [ ] T099 [P] Add comprehensive error logging for debugging purposes (log technical details without exposing to users per FR-056)
- [ ] T100 [P] Verify application remains responsive during all operations with non-blocking UI (FR-059, SC-013)
- [ ] T101 [P] Test application with 50-page and 100+ page PDFs to verify performance and scrolling smoothness (SC-010, edge case in spec.md)
- [ ] T102 [P] Add "no persistence" warning message on app load informing users that all data is lost on browser close/refresh per clarification #5 and edge case in spec.md
- [ ] T102a [P] Add authentication assumption warning to app startup: display dismissible banner on first load stating "This application has no authentication. Do not use with sensitive data without proper access controls" per spec.md assumption
- [ ] T103 [P] Verify screen reader compatibility (NVDA, JAWS, or VoiceOver) for complete workflow per SC-012
- [ ] T104 [P] Manual keyboard navigation testing: complete full workflow using only keyboard (Tab, Enter, Space, arrow keys, shortcuts) per SC-007
- [ ] T105 Code cleanup: remove console.log statements, debugger statements, and unused imports per constitution pre-commit gates
- [ ] T106 Run ESLint with zero warnings across all source files per constitution pre-commit gates
- [ ] T106a [P] Add ESLint rule to detect localStorage/sessionStorage/IndexedDB usage (eslint-plugin-no-storage) and verify zero violations per FR-061
- [ ] T107 Run Prettier formatting across all source files per constitution pre-commit gates
- [ ] T108 Create README.md with quickstart instructions (npm install, npm start, MSW initialization) based on research.md installation commands
- [ ] T108a Add authentication integration hooks to README.md: document where to add auth (App.jsx, api.js interceptors, protected route wrapper) and reference spec.md assumption that auth will be added later
- [ ] T109 [P] Add PropTypes definitions to all components per constitution code quality standards
- [ ] T110 [P] Add inline comments for complex coordinate conversion math in src/utils/coordinates.js per constitution code quality standards
- [ ] T111 Verify all functional requirements FR-001 through FR-061 are implemented and working
- [ ] T112 Verify all success criteria SC-001 through SC-014 are met with measurable outcomes
- [ ] T112a Create user acceptance testing plan document (tests/uat/testing-plan.md) with scenarios for SC-003 and SC-014 measurement (to be executed post-deployment)

---

## Phase 8: Testing (Constitution Requirement - NON-NEGOTIABLE)

**Purpose**: Verify component behavior, coordinate conversion, state updates, and accessibility compliance per Constitution Principle V

**Constitution Reference**: "Unit tests MUST verify component behavior... E2E tests MUST simulate the full workflow... Accessibility tests MUST run via axe-core... Tests MUST be written before or alongside implementation"

### Unit Tests - Components

- [ ] T113 [P] Write unit tests for PDFUploader component in src/components/PDFUploader/PDFUploader.test.jsx (file validation, drag-drop events, error messages)
- [ ] T114 [P] Write unit tests for PDFViewerPane component in src/components/PDFViewerPane/PDFViewerPane.test.jsx (page navigation, zoom controls, thumbnail clicks)
- [ ] T115 [P] Write unit tests for SnipOverlay component in src/components/SnipOverlay/SnipOverlay.test.jsx (mouse events, resize handles, coordinate conversion integration)
- [ ] T116 [P] Write unit tests for SnipList component in src/components/SnipList/SnipList.test.jsx (CRUD operations, focus management, keyboard navigation)
- [ ] T117 [P] Write unit tests for SummarizePanel component in src/components/SummarizePanel/SummarizePanel.test.jsx (button states, API calls, copy/export functionality)

### Unit Tests - Utils & Services

- [ ] T118 [P] Write unit tests for coordinate conversion utility in src/utils/coordinates.test.js (normalize coords, y-axis inversion, scale factor handling, edge cases at 400% zoom)
- [ ] T119 [P] Write unit tests for API service in src/services/api.test.js (fetch wrappers, error handling, CSRF token inclusion)
- [ ] T120 [P] Write unit tests for useUndo hook in src/hooks/useUndo.test.js (undo/redo operations, 50-action history limit with FIFO overflow, canUndo/canRedo states)
- [ ] T121 [P] Write unit tests for OCR queue manager in src/services/ocrQueue.test.js (FIFO processing, non-blocking behavior, error handling)

### Integration Tests

- [ ] T122 [P] Write API integration tests in tests/integration/api-integration.test.js (MSW contract validation for /api/snip-crop and /api/summarize endpoints)
- [ ] T123 [P] Write state management integration tests in tests/integration/state-management.test.js (AppContext state transitions, undo/redo with complex state changes)

### End-to-End Tests

- [ ] T124 [P] Write E2E test for upload workflow in tests/e2e/upload-workflow.spec.js (drag-drop upload, file validation, PDF rendering, page navigation)
- [ ] T125 [P] Write E2E test for snipping workflow in tests/e2e/snipping-workflow.spec.js (draw snip, OCR extraction, non-blocking UI, multiple snips across pages)
- [ ] T126 [P] Write E2E test for editing workflow in tests/e2e/editing-workflow.spec.js (edit text, insert box, delete box, merge boxes, undo/redo all operations)
- [ ] T127 [P] Write E2E test for summarization workflow in tests/e2e/summarize-workflow.spec.js (generate summary, copy to clipboard, export as text/JSON)
- [ ] T128 [P] Write E2E accessibility test in tests/e2e/accessibility.spec.js (keyboard-only navigation through full workflow, screen reader announcements via aria-live)
- [ ] T128a [P] Write E2E test in tests/e2e/no-persistence.spec.js to verify no data persists after browser refresh (upload PDF, create text boxes, refresh, verify clean state per FR-061)

### Accessibility Tests

- [ ] T129 [P] Write axe-core accessibility tests for PDFUploader in tests/accessibility/pdf-uploader.axe.test.js (WCAG 2.1 AA violations, ARIA roles, color contrast)
- [ ] T130 [P] Write axe-core accessibility tests for SnipList in tests/accessibility/snip-list.axe.test.js (focus management, keyboard shortcuts, ARIA announcements)
- [ ] T131 [P] Write axe-core accessibility tests for full application in tests/accessibility/full-app.axe.test.js (scan all pages, verify zero violations)

### Test Configuration

- [ ] T132 Create Jest configuration in config/jest.config.js (React Testing Library setup, coverage thresholds: 80% statements, 75% branches)
- [ ] T133 Create Cypress configuration in config/cypress.config.js (baseUrl, viewport settings, video recording) OR Playwright configuration in config/playwright.config.js
- [ ] T134 Add test scripts to package.json (npm test, npm run test:e2e, npm run test:a11y, npm run test:coverage)
- [ ] T135 Configure axe-core integration with React Testing Library in src/setupTests.js
- [ ] T135a Install and configure Lighthouse CI in config/lighthouserc.js with performance budgets (TTI <3s, FCP <1.5s per plan.md) and Chrome DevTools Performance profiling scripts for OCR/summarization timing validation

**Checkpoint**: All constitution-mandated tests complete. Application ready for Pre-PR quality gates.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion (T001-T008a) - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion (T009-T020)
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3 → P4)
- **Polish (Phase 7)**: Depends on all desired user stories being complete
- **Testing (Phase 8)**: Can run in parallel with implementation (TDD approach) OR after Polish phase completion

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2 complete: T020) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2 complete: T020) - Integrates with US1 components (PDFViewerPane) but independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2 complete: T020) - Depends on US2 SnipList component (T050) but independently testable
- **User Story 4 (P4)**: Can start after Foundational (Phase 2 complete: T020) - Integrates with US2/US3 TextBox entities but independently testable

### Within Each User Story

- Tests: NOT INCLUDED (tests not explicitly requested in spec)
- Models before services (N/A - frontend-only React components)
- Foundational utils/services before components using them
- Components before integration with App.jsx
- Core implementation before edge case handling
- Story complete before moving to next priority

### Critical Path (Blocking Tasks)

1. **T001-T008a**: Setup tasks (project structure, dependencies, tooling)
2. **T009-T020**: Foundational tasks (theme, MSW, utils, context, App root)
3. **T021**: PDFUploader component (blocks US1 upload flow)
4. **T026**: PDFViewerPane component (blocks US1 viewing and US2 snipping overlay)
5. **T037**: SnipOverlay component (blocks US2 selection and extraction)
6. **T050**: SnipList component (blocks US2 text box display and US3 editing)
7. **T075**: SummarizePanel component (blocks US4 summarization)

### Parallel Opportunities

**Phase 1 (Setup)**: T003, T004, T005, T005a, T006, T007, T008a can run in parallel (different dependency installations, config files)

**Phase 2 (Foundational)**: T010, T011, T012 (MSW setup) can run in parallel; T014, T015, T016, T017 (utils/services) can run in parallel

**Phase 3 (US1)**:
- T021, T021a, T022, T023 (PDFUploader component, validation, ARIA, styles) can run in parallel
- T026, T027, T028 (PDFViewerPane component, Worker, styles) can run in parallel

**Phase 4 (US2)**:
- T037, T038, T039 (SnipOverlay component, handlers, styles) can run in parallel
- T050, T051, T052 (SnipList component, TextFields, styles) can run in parallel

**Phase 5 (US3)**: Tasks are sequential due to state management dependencies

**Phase 6 (US4)**: T075, T076, T077 (SummarizePanel component, styles, ARIA) can run in parallel

**Phase 7 (Polish)**: T093, T094, T095, T096, T097, T098, T099, T100, T101, T102, T102a, T103, T104, T106a, T109, T110 can run in parallel (different files and concerns)

---

## Parallel Example: User Story 1

```bash
# After Foundational phase complete, launch PDFUploader tasks together:
Task T021: "Create PDFUploader component in src/components/PDFUploader/PDFUploader.jsx"
Task T021a: "Implement PDF structure validation"
Task T022: "Add ARIA roles and keyboard accessibility to PDFUploader component"
Task T023: "Style PDFUploader component in src/components/PDFUploader/PDFUploader.module.css"

# Then launch PDFViewerPane tasks together:
Task T026: "Create PDFViewerPane component in src/components/PDFViewerPane/PDFViewerPane.jsx"
Task T027: "Configure PDF.js Worker in PDFViewerPane"
Task T028: "Style PDFViewerPane component in src/components/PDFViewerPane/PDFViewerPane.module.css"
```

---

## Parallel Example: User Story 2

```bash
# After US1 complete, launch SnipOverlay tasks together:
Task T037: "Create SnipOverlay component in src/components/SnipOverlay/SnipOverlay.jsx"
Task T038: "Implement mouse event handlers in SnipOverlay"
Task T039: "Style SnipOverlay component in src/components/SnipOverlay/SnipOverlay.module.css"

# Then launch SnipList tasks together:
Task T050: "Create SnipList component in src/components/SnipList/SnipList.jsx"
Task T051: "Render each TextBox as MUI TextField in SnipList"
Task T052: "Style SnipList component in src/components/SnipList/SnipList.module.css"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T008a)
2. Complete Phase 2: Foundational (T009-T020) - CRITICAL
3. Complete Phase 3: User Story 1 (T021-T036)
4. **STOP and VALIDATE**: Test User Story 1 independently
   - Upload valid PDF (under 10 MB)
   - Verify PDF displays with thumbnails
   - Navigate pages, zoom, pan
   - Test keyboard navigation
   - Attempt invalid uploads and verify error messages
5. Deploy/demo if ready

**MVP Task Count**: 38 tasks (T001-T036 including new T005a, T008a, T021a)

### Incremental Delivery

1. Complete Setup + Foundational (T001-T020) → Foundation ready
2. Add User Story 1 (T021-T036) → Test independently → Deploy/Demo (MVP! Users can upload and view PDFs)
3. Add User Story 2 (T037-T060) → Test independently → Deploy/Demo (Users can extract text from PDFs)
4. Add User Story 3 (T061-T074) → Test independently → Deploy/Demo (Users can edit and manage text boxes)
5. Add User Story 4 (T075-T092) → Test independently → Deploy/Demo (Users can generate summaries)
6. Add Polish (T093-T112a) → Final validation → Production release
7. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. **Team completes Setup + Foundational together** (T001-T020)
2. **Once Foundational is done**:
   - **Developer A**: User Story 1 (T021-T036) - Upload and view PDFs
   - **Developer B**: Wait for US1 PDFViewerPane complete, then User Story 2 (T037-T060) - Snipping and extraction
   - **Developer C**: Research accessibility patterns, prepare for Polish tasks
3. **After US2 complete**:
   - **Developer A**: User Story 3 (T061-T074) - Text editing and management
   - **Developer B**: User Story 4 (T075-T092) - Summarization
   - **Developer C**: Start Polish tasks (T093-T112a)
4. Stories complete and integrate independently

---

## Task Summary

- **Total Tasks**: 142 (was 135, added 7 new tasks)
- **Setup Tasks**: 10 (T001-T008a) - added T005a, T008a
- **Foundational Tasks**: 12 (T009-T020)
- **User Story 1 Tasks**: 17 (T021-T036) - added T021a
- **User Story 2 Tasks**: 24 (T037-T060)
- **User Story 3 Tasks**: 14 (T061-T074)
- **User Story 4 Tasks**: 18 (T075-T092)
- **Polish Tasks**: 23 (T093-T112a) - added T106a, T112a
- **Testing Tasks**: 24 (T113-T135a) - added T128a, T135a

### Parallel Opportunities

- **Phase 1**: 7 parallel tasks (T003, T004, T005, T005a, T006, T007, T008a)
- **Phase 2**: 7 parallel tasks (T010, T011, T012, T014, T015, T016, T017)
- **Phase 3 (US1)**: 8 parallel tasks (T021, T021a, T022, T023, T026, T027, T028)
- **Phase 4 (US2)**: 6 parallel tasks (T037, T038, T039, T050, T051, T052)
- **Phase 6 (US4)**: 3 parallel tasks (T075, T076, T077)
- **Phase 7 (Polish)**: 17 parallel tasks (T093-T104, T106a, T109, T110)
- **Phase 8 (Testing)**: All test tasks can run in parallel

**Total Parallel Opportunities**: 48 tasks can run in parallel

### MVP Scope

**Minimum Viable Product** = Setup + Foundational + User Story 1

- **MVP Task Count**: 39 tasks (includes new T005a, T008a, T021a)
- **MVP Features**: Upload PDF, validate file (including malicious content detection), view multi-page PDFs with thumbnails, navigate pages, zoom/pan with 8 preset levels, keyboard navigation, WCAG 2.1 AA compliance
- **MVP Success Criteria**: SC-001 (upload and view within 5 seconds), SC-007 (keyboard navigation), SC-008 (color contrast), SC-010 (support 50 pages)

---

## Notes

- [P] tasks = different files, no dependencies, can run in parallel
- [Story] label maps task to specific user story (US1, US2, US3, US4) for traceability
- Each user story should be independently completable and testable
- Tests are included per constitution Principle V (NON-NEGOTIABLE)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- **No client-side persistence**: All state stored in memory only per FR-061, clarification #5
- **Constitution compliance**: All tasks follow 7 core principles (Accessibility First, Security by Design, Modular Architecture, Coordinate Precision, Test-Driven Quality, API Contract Adherence, Progressive Enhancement)
- **Performance targets**: PDF render <3s, OCR <1.5s, Summarization <3s, Undo/redo <100ms
