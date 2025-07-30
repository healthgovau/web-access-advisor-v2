# Accessibility Defects Reference

This document lists all accessibility defects implemented in the test pages for benchmarking purposes. These defects are specifically designed to be detected by:
- **Google Chrome Lighthouse** accessibility audits
- **axe-core** accessibility engine (used by axe DevTools, axe-linter, etc.)
- **NVDA screen reader** compatibility testing

## Page 1 - Text Content & Basic Forms

### Lighthouse/axe-core Detected Issues:
1. **color-contrast**: Text with insufficient contrast ratios (<4.5:1 for normal text)
2. **image-alt**: Images missing alt attributes or with inappropriate alt text
3. **heading-order**: Skipped heading levels (h1 jumping to h3)
4. **html-has-lang**: HTML element missing lang attribute
5. **label**: Form inputs without associated labels
6. **form-field-multiple-labels**: Inputs with multiple or conflicting labels
7. **button-name**: Buttons without accessible names
8. **link-name**: Links without accessible text
9. **empty-heading**: Heading elements with no content

### NVDA Screen Reader Issues:
1. **Non-semantic markup**: Using divs styled as headings instead of proper h1-h6
2. **Missing form labels**: Inputs that NVDA cannot associate with descriptive text
3. **Placeholder abuse**: Using placeholder as the only label (not announced consistently)
4. **Missing required field indication**: No ARIA or semantic indication of required fields
5. **Poor error association**: Error messages not programmatically linked to form fields
6. **Decorative images with alt**: Images that should be ignored by screen readers

## Page 2 - Complex Forms & Navigation

### Lighthouse/axe-core Detected Issues:
1. **aria-valid-attr**: Invalid ARIA attribute names
2. **aria-valid-attr-value**: ARIA attributes with invalid values
3. **aria-required-attr**: Missing required ARIA attributes for roles
4. **aria-hidden-focus**: Focusable elements with aria-hidden="true"
5. **duplicate-id**: Multiple elements with the same ID
6. **bypass**: Missing skip links for main content
7. **tabindex**: Improper use of positive tabindex values
8. **focus-order-semantics**: Illogical focus order
9. **autocomplete-valid**: Missing or incorrect autocomplete attributes

### NVDA Screen Reader Issues:
1. **Missing fieldset/legend**: Related form controls not grouped properly
2. **Poor progress indication**: Multi-step forms without clear progress communication
3. **No error announcements**: Form validation errors not announced to screen readers
4. **Missing navigation landmarks**: Content areas not properly identified
5. **Inconsistent navigation**: Navigation structure that confuses screen reader users
6. **No current page indication**: Screen readers can't identify current location

## Page 3 - Data Tables & Media

### Lighthouse/axe-core Detected Issues:
1. **table-headers**: Data tables without proper header elements
2. **td-headers-attr**: Table cells not associated with headers
3. **th-has-data-cells**: Table headers without associated data cells
4. **table-duplicate-name**: Tables with duplicate accessible names
5. **scope-attr-valid**: Invalid scope attribute values
6. **video-caption**: Videos without captions
7. **audio-caption**: Audio content without transcripts
8. **meta-refresh**: Auto-refreshing content without warning

### NVDA Screen Reader Issues:
1. **Missing table captions**: Tables without descriptive captions for context
2. **Complex table navigation**: Headers not properly associated with data cells
3. **Nested tables**: Tables within tables causing navigation confusion
4. **Missing media alternatives**: No text alternatives for audio/video content
5. **Auto-playing media**: Media that starts without user control
6. **Layout tables with headers**: Presentational tables incorrectly marked up

## Page 4 - Interactive Elements & ARIA

### Lighthouse/axe-core Detected Issues:
1. **aria-expanded**: Missing or incorrect aria-expanded values
2. **aria-controls**: Missing aria-controls relationships
3. **aria-describedby**: Invalid aria-describedby references
4. **aria-labelledby**: Invalid aria-labelledby references
5. **button-has-type**: Buttons without explicit type attributes
6. **dlitem**: Improper definition list structure
7. **definition-list**: Invalid definition list markup
8. **listitem**: List items not contained in proper list elements
9. **aria-hidden-body**: aria-hidden on document body

### NVDA Screen Reader Issues:
1. **Modal focus management**: Dialogs that don't trap focus properly
2. **Missing live regions**: Dynamic content changes not announced
3. **Inconsistent widget behavior**: Custom controls that don't follow ARIA patterns
4. **No keyboard escape**: Modal dialogs without ESC key functionality
5. **Poor state communication**: Widget states not communicated to assistive technology
6. **Missing component labels**: Custom widgets without accessible names

## Page 5 - Advanced Components & Error Handling

### Lighthouse/axe-core Detected Issues:
1. **aria-roles**: Invalid or inappropriate ARIA roles
2. **aria-allowed-attr**: ARIA attributes not allowed on specific elements
3. **aria-required-children**: ARIA roles missing required child roles
4. **aria-required-parent**: ARIA roles missing required parent roles
5. **region**: Page regions not properly identified
6. **landmark-unique**: Duplicate landmark labels
7. **page-has-heading-one**: Missing h1 element
8. **scrollable-region-focusable**: Scrollable regions not keyboard accessible

### NVDA Screen Reader Issues:
1. **Session timeout without warning**: Timed content without sufficient warning
2. **Error recovery guidance**: Error messages without correction instructions
3. **Silent form submissions**: Form processing without status feedback
4. **Inaccessible drag and drop**: Drag interfaces without keyboard alternatives
5. **Poor loading state communication**: Async operations without status updates
6. **Color-only error indication**: Errors conveyed only through visual styling

## Lighthouse Accessibility Audit Categories

### Manual Checks (require human verification):
1. **Color contrast**: Verify all text meets minimum contrast ratios
2. **Keyboard navigation**: Ensure all interactive elements are keyboard accessible
3. **Screen reader testing**: Verify content is properly announced
4. **Focus management**: Check focus indicators and logical tab order
5. **Form validation**: Verify error messages are helpful and accessible

### Automated Checks (detected by Lighthouse):
1. **ARIA implementation**: Proper use of ARIA attributes and roles
2. **Semantic HTML**: Use of appropriate HTML elements for content structure
3. **Image accessibility**: Alt text and decorative image handling
4. **Form accessibility**: Labels, fieldsets, and form structure
5. **Navigation accessibility**: Skip links, landmarks, and heading structure

## axe-core Rule Categories

### Level A Violations:
- **1.1.1 Non-text Content**: image-alt, input-image-alt, area-alt
- **1.3.1 Info and Relationships**: label, form-field-multiple-labels, fieldset
- **1.3.2 Meaningful Sequence**: tabindex, focus-order-semantics
- **1.4.1 Use of Color**: color-contrast (Level AA but commonly tested)
- **2.1.1 Keyboard**: focusable-content, keyboard-navigation
- **2.1.2 No Keyboard Trap**: no-keyboard-trap
- **2.4.1 Bypass Blocks**: bypass, skip-link
- **2.4.2 Page Titled**: document-title
- **2.4.3 Focus Order**: tabindex, focus-order-semantics
- **2.4.4 Link Purpose**: link-name, link-in-text-block
- **3.1.1 Language of Page**: html-has-lang, html-lang-valid
- **3.2.1 On Focus**: no-focus-change
- **3.2.2 On Input**: no-input-change
- **3.3.1 Error Identification**: label, form-field-multiple-labels
- **3.3.2 Labels or Instructions**: label, fieldset
- **4.1.1 Parsing**: duplicate-id, valid-html
- **4.1.2 Name, Role, Value**: button-name, link-name, aria-*

### Level AA Violations:
- **1.4.3 Contrast (Minimum)**: color-contrast
- **1.4.4 Resize Text**: meta-viewport-large
- **2.4.6 Headings and Labels**: heading-order, empty-heading
- **2.4.7 Focus Visible**: focus-order-semantics
- **3.2.3 Consistent Navigation**: consistent-navigation
- **3.2.4 Consistent Identification**: consistent-identification

## NVDA Screen Reader Test Scenarios

### Navigation Testing:
1. **Heading navigation** (H key): Verify logical heading structure
2. **Landmark navigation** (D key): Check main, nav, aside, footer regions
3. **Link navigation** (K key): Ensure all links have descriptive text
4. **Form control navigation** (F key): Verify all form elements are reachable
5. **Table navigation** (T key): Check table structure and header associations
6. **List navigation** (L key): Verify proper list markup

### Content Announcement Testing:
1. **Form labels**: Verify input labels are announced when focused
2. **Error messages**: Check that validation errors are announced
3. **Status updates**: Ensure dynamic content changes are communicated
4. **Required fields**: Verify required field indication is announced
5. **Instructions**: Check that help text is properly associated and announced
6. **State changes**: Verify expanded/collapsed states are communicated

### Interactive Element Testing:
1. **Button functionality**: Verify buttons work with ENTER/SPACE keys
2. **Modal dialogs**: Check focus trapping and ESC key functionality
3. **Custom widgets**: Verify ARIA patterns work correctly with screen readers
4. **Form submission**: Check that success/error states are communicated
5. **Loading states**: Verify async operations communicate status changes
