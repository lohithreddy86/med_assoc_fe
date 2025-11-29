<!--
Sync Impact Report:
- Version change: [INITIAL] → 1.0.0
- New constitution created from Frontend UI detailed README
- Modified principles: N/A (initial creation)
- Added sections: All core principles, technical standards, quality gates, governance
- Removed sections: N/A
- Templates requiring updates:
  ✅ plan-template.md (reviewed - Constitution Check section aligns)
  ✅ spec-template.md (reviewed - user story approach aligns with accessibility requirements)
  ✅ tasks-template.md (reviewed - phase structure supports testing discipline)
- Follow-up TODOs: None
-->

# OCR Snipping & Summarization Frontend Constitution

## Core Principles

### I. Accessibility First (NON-NEGOTIABLE)

Every interactive element MUST have an ARIA role and keyboard equivalent. Colour contrast MUST meet WCAG 2.1 AA standards (minimum 4.5:1 ratio). A high-contrast mode MUST be provided. The application MUST be fully keyboard-operable with proper focus management following WAI-ARIA Authoring Practices.

**Rationale**: Medical associates may have varying accessibility needs. Non-compliance creates legal risk and excludes users. Accessibility is not optional—it is a fundamental requirement for equitable access to healthcare documentation tools.

### II. Security by Design

Client-side validation MUST prevent malicious uploads by validating MIME type (`application/pdf`) and enforcing a 10 MB size limit. User input MUST be sanitized to prevent XSS attacks. CSRF tokens MUST be included for all state-changing requests. The application MUST assume HTTPS and use `SameSite=Strict` cookies.

**Rationale**: Medical documents contain sensitive patient information. Security vulnerabilities could lead to HIPAA violations, data breaches, and loss of user trust. Every layer of defense matters.

### III. Modular Component Architecture

The UI MUST follow a modular component structure separating concerns into upload/rendering, snipping, text editing, and summarization. Components MUST be self-contained with clear responsibilities and well-defined props/callbacks. Each component MUST be independently testable.

**Rationale**: Modularity enables parallel development, easier testing, maintainability, and future feature extensions. Tight coupling creates fragile code that is difficult to modify or debug.

### IV. Coordinate Precision & Conversion

Snipping coordinates MUST be stored as normalized fractions (0-1 range) of the displayed page size. The y-axis MUST be inverted when converting browser coordinates to PDF coordinates (PDF origin is bottom-left, browser is top-left). High-DPI considerations MUST be documented when communicating with backend services.

**Rationale**: Coordinate conversion errors lead to incorrect OCR results, wasting medical associates' time and potentially causing documentation errors. Precision is critical for usability.

### V. Test-Driven Quality (NON-NEGOTIABLE)

Unit tests MUST verify component behavior, coordinate conversion, and state updates. End-to-end tests MUST simulate the full workflow (upload → snip → edit → summarize). Accessibility tests MUST run via axe-core to ensure WCAG compliance. Tests MUST be written before or alongside implementation—not as an afterthought.

**Rationale**: Medical applications demand high reliability. Untested code is untrustworthy code. TDD catches bugs early, documents expected behavior, and enables confident refactoring.

### VI. API Contract Adherence

The frontend MUST interact with backend endpoints via well-defined contracts:
- `/api/snip-crop` receives `{page, rect}` and returns `{id, text, image_id}`
- `/api/summarize` receives `{texts, max_sentences}` and returns `{summary}`

Stubbed APIs via Mock Service Worker (MSW) MUST simulate real backend behavior during development. API responses MUST be validated and errors MUST be handled gracefully with user-friendly messages.

**Rationale**: Contract adherence prevents integration failures. Stub-driven development enables frontend progress independent of backend availability. Clear error handling maintains user confidence.

### VII. Progressive Enhancement & Graceful Degradation

Core functionality MUST work with keyboard-only navigation. Loading states MUST be communicated via spinners and `aria-live` regions. Network failures MUST allow retry without losing user state. The application MUST provide meaningful feedback for all operations.

**Rationale**: Network conditions vary. Users should never lose work due to transient failures. Progressive enhancement ensures the broadest possible device and browser support.

## Technical Standards

### Technology Stack (MANDATORY)

- **Framework**: React 18 (functional components with hooks)
- **PDF Rendering**: React PDF Viewer (built on PDF.js, accessibility-focused)
- **UI Library**: Material UI (MUI) for accessible form controls, modals, buttons
- **State Management**: React Context API (Redux Toolkit for future caching if needed)
- **API Stubbing**: Mock Service Worker (MSW) for development
- **Testing**: Jest for unit tests, Cypress or Playwright for E2E, axe-core for accessibility

**Rationale**: These libraries are selected per the technical report evaluation. They prioritize accessibility, provide rich ecosystems, and are battle-tested in production environments.

### File Structure Requirements

```
src/
├── components/
│   ├── PDFUploader/       # Drag-and-drop upload with validation
│   ├── PDFViewerPane/     # PDF rendering with React PDF Viewer
│   ├── SnipOverlay/       # Transparent overlay for region selection
│   ├── SnipList/          # Ordered list of editable text boxes
│   └── SummarizePanel/    # Summarization button and results display
├── services/
│   └── api.js             # Centralized API calls (fetch wrappers)
├── mocks/
│   └── browser.js         # MSW handlers for stubbed endpoints
├── utils/
│   └── coordinates.js     # Coordinate normalization and inversion
└── App.js                 # Root component with theme and routing
```

### Code Quality Standards

- **Linting**: ESLint with React and accessibility plugins MUST pass with zero warnings
- **Formatting**: Prettier MUST be configured and enforced
- **Type Safety**: PropTypes MUST be defined for all components
- **Documentation**: Complex logic (especially coordinate conversion) MUST include inline comments explaining the math
- **Accessibility**: Every PR MUST include an accessibility checklist verifying ARIA roles, keyboard support, and contrast ratios

## Quality Gates

### Pre-Commit Gates

1. ✅ ESLint passes with zero warnings
2. ✅ Prettier formatting applied
3. ✅ No console.log or debugger statements in production code

### Pre-PR Gates

1. ✅ All unit tests pass
2. ✅ All E2E tests pass
3. ✅ Accessibility tests (axe-core) pass with zero violations
4. ✅ Manual keyboard navigation test completed
5. ✅ High-contrast mode tested visually
6. ✅ File size limits validated (10 MB enforcement)
7. ✅ Error handling tested (network failures, invalid files, API errors)

### Pre-Release Gates

1. ✅ Full regression testing on Chrome, Firefox, Safari, Edge
2. ✅ Screen reader testing (NVDA, JAWS, or VoiceOver)
3. ✅ Performance testing: Time to Interactive < 3 seconds, First Contentful Paint < 1.5 seconds
4. ✅ Security review: MIME validation, CSRF tokens, input sanitization verified
5. ✅ Documentation updated (README, inline docs, API contract docs)

## Development Workflow

### Feature Development Process

1. **Specification**: Feature requirements documented with acceptance criteria
2. **Design**: UI mockups reviewed for accessibility compliance
3. **Test Planning**: Test cases written covering happy path, edge cases, error states
4. **Implementation**: TDD approach—write failing test, implement feature, refactor
5. **Code Review**: Peer review with focus on accessibility, security, modularity
6. **QA**: Manual testing + automated test suite execution
7. **Deployment**: Staged rollout (dev → staging → production)

### Keyboard Shortcuts (MUST BE IMPLEMENTED)

- **Ctrl+N**: Insert new text box
- **Delete**: Remove selected text box
- **Shift+M**: Merge current box with next box
- **Ctrl+Z/Y**: Undo/Redo
- **Ctrl+Enter**: Trigger summarization
- **Tab/Shift+Tab**: Navigate between interactive elements
- **Arrow Keys**: Navigate within lists and text boxes
- **Enter**: Activate focused button

**Rationale**: Keyboard shortcuts dramatically improve efficiency for power users, especially medical associates processing high volumes of documents.

### Error Handling Standards

All errors MUST be categorized and handled appropriately:

- **Validation Errors**: Display inline with specific guidance (e.g., "File exceeds 10 MB limit")
- **Network Errors**: Show retry button, preserve user state
- **API Errors**: Display non-technical message, log technical details for debugging
- **Unexpected Errors**: Generic message + error boundary to prevent full app crash

Users MUST never see raw error messages, stack traces, or technical jargon.

## Governance

### Constitution Authority

This constitution supersedes all other practices and preferences. Any deviation MUST be explicitly justified in writing and approved by the project lead. When in doubt, prioritize accessibility and security over convenience.

### Amendment Process

1. Proposal documented with rationale and impact analysis
2. Team review and discussion (minimum 3 business days)
3. Approval by project lead
4. Version bump (semantic versioning: MAJOR for breaking changes, MINOR for additions, PATCH for clarifications)
5. Migration plan for existing code (if applicable)
6. Documentation updates across all templates and guides

### Compliance Review

- **Every PR**: Reviewer MUST verify adherence to accessibility and security principles
- **Every Sprint**: Retrospective includes constitution compliance discussion
- **Quarterly**: Full audit of codebase against constitution standards, with remediation plan for violations

### Versioning Policy

- **MAJOR (X.0.0)**: Backward-incompatible governance changes (e.g., removing a principle, changing mandatory technology)
- **MINOR (x.Y.0)**: New principle added or materially expanded guidance (e.g., adding a new quality gate)
- **PATCH (x.y.Z)**: Clarifications, wording improvements, typo fixes

### Complexity Justification

Any introduction of complexity beyond the standard stack MUST be justified:

- **Additional libraries**: Document why existing tools insufficient
- **Architectural patterns**: Explain problem solved and simpler alternatives rejected
- **Performance optimizations**: Provide benchmarks showing measurable improvement

**Version**: 1.0.0 | **Ratified**: 2025-10-29 | **Last Amended**: 2025-10-29
