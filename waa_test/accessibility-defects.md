# Accessibility Defects Reference

This document lists all accessibility defects implemented in the test pages for benchmarking purposes. These defects are specifically designed to be detected by:
- **Google Chrome Lighthouse** accessibility audits
- **axe-core** accessibility engine (used by axe DevTools, axe-linter, etc.)
- **NVDA screen reader** compatibility testing

**Usage:** Check off the boxes below as you verify each issue is detected by your testing tools.

## Page 1 - Text Content & Basic Forms

### Lighthouse/axe-core Detected Issues:
- [ ] **html-has-lang**: HTML element missing lang attribute
- [ ] **document-title**: Page missing or empty title element
- [ ] **duplicate-id**: Multiple elements with the same ID
- [ ] **heading-order**: Skipped heading levels (h1 jumping to h3)
- [ ] **empty-heading**: Heading elements with no content
- [ ] **image-alt**: Images missing alt attributes or with inappropriate alt text
- [ ] **label**: Form inputs without associated labels
- [ ] **form-field-multiple-labels**: Inputs with multiple or conflicting labels
- [ ] **button-name**: Buttons without accessible names
- [ ] **link-name**: Links without accessible text
- [ ] **tabindex**: Improper use of positive tabindex values
- [ ] **color-contrast**: Text with insufficient contrast ratios (<4.5:1 for normal text)
- [ ] **list-structure**: Fake lists using divs instead of proper ul/ol elements

### NVDA Screen Reader Issues:
- [ ] **Missing form labels**: Inputs that NVDA cannot associate with descriptive text
- [ ] **Non-semantic markup**: Using divs styled as headings instead of proper h1-h6
- [ ] **Placeholder abuse**: Using placeholder as the only label (not announced consistently)
- [ ] **Decorative images with alt**: Images that should be ignored by screen readers
- [ ] **Hidden labels**: Labels that are visually hidden but confuse screen readers
- [ ] **Missing required field indication**: No ARIA or semantic indication of required fields
- [ ] **Poor error association**: Error messages not programmatically linked to form fields
- [ ] **Fake buttons**: Divs with click handlers that appear as buttons but lack semantics

## Page 2 - Complex Forms & Navigation

### Lighthouse/axe-core Detected Issues:
- [ ] **bypass**: Missing skip links for main content
- [ ] **duplicate-id**: Multiple elements with the same ID
- [ ] **button-has-type**: Buttons without explicit type attributes
- [ ] **autocomplete-valid**: Missing or incorrect autocomplete attributes
- [ ] **tabindex**: Improper use of positive tabindex values
- [ ] **focus-order-semantics**: Illogical focus order
- [ ] **aria-valid-attr**: Invalid ARIA attribute names
- [ ] **aria-valid-attr-value**: ARIA attributes with invalid values
- [ ] **aria-required-attr**: Missing required ARIA attributes for roles
- [ ] **aria-allowed-attr**: ARIA attributes not allowed on specific elements
- [ ] **aria-hidden-focus**: Focusable elements with aria-hidden="true"

### NVDA Screen Reader Issues:
- [ ] **Missing navigation landmarks**: Content areas not properly identified
- [ ] **Missing fieldset/legend**: Related form controls not grouped properly
- [ ] **No current page indication**: Screen readers can't identify current location
- [ ] **Inconsistent navigation**: Navigation structure that confuses screen reader users
- [ ] **Keyboard traps**: Navigation that traps focus without escape mechanism
- [ ] **Poor progress indication**: Multi-step forms without clear progress communication
- [ ] **No error announcements**: Form validation errors not announced to screen readers
- [ ] **Silent form submission**: Forms that submit without status feedback

## Page 3 - Data Tables & Media

### Lighthouse/axe-core Detected Issues:
- [ ] **table-headers**: Data tables without proper header elements
- [ ] **th-has-data-cells**: Table headers without associated data cells
- [ ] **td-headers-attr**: Table cells not associated with headers
- [ ] **scope-attr-valid**: Invalid scope attribute values
- [ ] **table-duplicate-name**: Tables with duplicate accessible names
- [ ] **video-caption**: Videos without captions
- [ ] **audio-caption**: Audio content without transcripts
- [ ] **nested-interactive**: Interactive elements nested within other interactive elements
- [ ] **presentation-role-conflict**: Elements with conflicting roles
- [ ] **meta-refresh**: Auto-refreshing content without warning

### NVDA Screen Reader Issues:
- [ ] **Missing table captions**: Tables without descriptive captions for context
- [ ] **Complex table navigation**: Headers not properly associated with data cells
- [ ] **Empty table cells**: Data cells with no content or context
- [ ] **Layout tables with headers**: Presentational tables incorrectly marked up
- [ ] **Table structure confusion**: Tables used for layout instead of data presentation
- [ ] **Nested tables**: Tables within tables causing navigation confusion
- [ ] **Missing media alternatives**: No text alternatives for audio/video content
- [ ] **Auto-playing media**: Media that starts without user control

## Page 4 - Interactive Elements & ARIA

### Lighthouse/axe-core Detected Issues:
- [ ] **button-has-type**: Buttons without explicit type attributes
- [ ] **listitem**: List items not contained in proper list elements
- [ ] **dlitem**: Improper definition list structure
- [ ] **definition-list**: Invalid definition list markup
- [ ] **aria-roles**: Invalid or inappropriate ARIA roles
- [ ] **aria-required-parent**: ARIA roles missing required parent roles
- [ ] **aria-required-children**: ARIA roles missing required child roles
- [ ] **aria-expanded**: Missing or incorrect aria-expanded values
- [ ] **aria-controls**: Missing aria-controls relationships
- [ ] **aria-labelledby**: Invalid aria-labelledby references
- [ ] **aria-describedby**: Invalid aria-describedby references
- [ ] **aria-hidden-body**: aria-hidden on document body

### NVDA Screen Reader Issues:
- [ ] **Missing component labels**: Custom widgets without accessible names
- [ ] **Modal focus management**: Dialogs that don't trap focus properly
- [ ] **No keyboard escape**: Modal dialogs without ESC key functionality
- [ ] **Broken custom dropdowns**: Select-like widgets without proper keyboard support
- [ ] **Poor state communication**: Widget states not communicated to assistive technology
- [ ] **Inconsistent widget behavior**: Custom controls that don't follow ARIA patterns
- [ ] **Missing live regions**: Dynamic content changes not announced
- [ ] **Conflicting ARIA semantics**: ARIA roles that conflict with HTML semantics
- [ ] **Invalid ARIA relationships**: Elements referencing non-existent IDs

## Page 5 - Advanced Components & Error Handling

### Lighthouse/axe-core Detected Issues:
- [ ] **page-has-heading-one**: Missing h1 element
- [ ] **duplicate-id**: Multiple instances of elements with same ID
- [ ] **region**: Page regions not properly identified
- [ ] **landmark-unique**: Duplicate landmark labels
- [ ] **scrollable-region-focusable**: Scrollable regions not keyboard accessible
- [ ] **focus-order-semantics**: Logical focus order violations
- [ ] **aria-roles**: Invalid or inappropriate ARIA roles
- [ ] **aria-allowed-attr**: ARIA attributes not allowed on specific elements
- [ ] **aria-required-children**: ARIA roles missing required child roles
- [ ] **aria-required-parent**: ARIA roles missing required parent roles
- [ ] **color-contrast**: Error states indicated only by color

### NVDA Screen Reader Issues:
- [ ] **Color-only error indication**: Errors conveyed only through visual styling
- [ ] **Missing error summaries**: Forms without comprehensive error collection
- [ ] **Error recovery guidance**: Error messages without correction instructions
- [ ] **Silent form submissions**: Form processing without status feedback
- [ ] **Poor loading state communication**: Async operations without status updates
- [ ] **Session timeout without warning**: Timed content without sufficient warning
- [ ] **Auto-refresh without announcement**: Content that updates silently
- [ ] **Carousel without navigation aids**: Image sliders with no screen reader support
- [ ] **Inaccessible drag and drop**: Drag interfaces without keyboard alternatives
- [ ] **Fake form controls**: Non-semantic elements styled to look like form controls

## Lighthouse Accessibility Audit Categories

### Manual Checks (require human verification):
- [ ] **Color contrast**: Verify all text meets minimum contrast ratios
- [ ] **Keyboard navigation**: Ensure all interactive elements are keyboard accessible
- [ ] **Screen reader testing**: Verify content is properly announced
- [ ] **Focus management**: Check focus indicators and logical tab order
- [ ] **Form validation**: Verify error messages are helpful and accessible

### Automated Checks (detected by Lighthouse):
- [ ] **ARIA implementation**: Proper use of ARIA attributes and roles
- [ ] **Semantic HTML**: Use of appropriate HTML elements for content structure
- [ ] **Image accessibility**: Alt text and decorative image handling
- [ ] **Form accessibility**: Labels, fieldsets, and form structure
- [ ] **Navigation accessibility**: Skip links, landmarks, and heading structure

## axe-core Rule Categories

### Level A Violations (in WCAG order):
- [ ] **1.1.1 Non-text Content**: image-alt, input-image-alt, area-alt
- [ ] **1.3.1 Info and Relationships**: label, form-field-multiple-labels, fieldset
- [ ] **1.3.2 Meaningful Sequence**: tabindex, focus-order-semantics
- [ ] **1.4.1 Use of Color**: color-contrast (Level AA but commonly tested)
- [ ] **2.1.1 Keyboard**: focusable-content, keyboard-navigation
- [ ] **2.1.2 No Keyboard Trap**: no-keyboard-trap
- [ ] **2.4.1 Bypass Blocks**: bypass, skip-link
- [ ] **2.4.2 Page Titled**: document-title
- [ ] **2.4.3 Focus Order**: tabindex, focus-order-semantics
- [ ] **2.4.4 Link Purpose**: link-name, link-in-text-block
- [ ] **3.1.1 Language of Page**: html-has-lang, html-lang-valid
- [ ] **3.2.1 On Focus**: no-focus-change
- [ ] **3.2.2 On Input**: no-input-change
- [ ] **3.3.1 Error Identification**: label, form-field-multiple-labels
- [ ] **3.3.2 Labels or Instructions**: label, fieldset
- [ ] **4.1.1 Parsing**: duplicate-id, valid-html
- [ ] **4.1.2 Name, Role, Value**: button-name, link-name, aria-*

### Level AA Violations (in WCAG order):
- [ ] **1.4.3 Contrast (Minimum)**: color-contrast
- [ ] **1.4.4 Resize Text**: meta-viewport-large
- [ ] **2.4.6 Headings and Labels**: heading-order, empty-heading
- [ ] **2.4.7 Focus Visible**: focus-order-semantics
- [ ] **3.2.3 Consistent Navigation**: consistent-navigation
- [ ] **3.2.4 Consistent Identification**: consistent-identification

## NVDA Screen Reader Test Scenarios

### Navigation Testing (by navigation method):
- [ ] **Heading navigation** (H key): Verify logical heading structure
- [ ] **Landmark navigation** (D key): Check main, nav, aside, footer regions
- [ ] **Link navigation** (K key): Ensure all links have descriptive text
- [ ] **List navigation** (L key): Verify proper list markup
- [ ] **Form control navigation** (F key): Verify all form elements are reachable
- [ ] **Table navigation** (T key): Check table structure and header associations

### Content Announcement Testing (by element focus):
- [ ] **Form labels**: Verify input labels are announced when focused
- [ ] **Required fields**: Verify required field indication is announced
- [ ] **Instructions**: Check that help text is properly associated and announced
- [ ] **Error messages**: Check that validation errors are announced
- [ ] **State changes**: Verify expanded/collapsed states are communicated
- [ ] **Status updates**: Ensure dynamic content changes are communicated

### Interactive Element Testing (by interaction type):
- [ ] **Button functionality**: Verify buttons work with ENTER/SPACE keys
- [ ] **Form submission**: Check that success/error states are communicated
- [ ] **Modal dialogs**: Check focus trapping and ESC key functionality
- [ ] **Custom widgets**: Verify ARIA patterns work correctly with screen readers
- [ ] **Loading states**: Verify async operations communicate status changes

---

## Testing Results Summary

**Total Issues to Test:** 100+

### Tool Detection Rates:
- **Lighthouse:** ___/__ issues detected
- **axe-core:** ___/__ issues detected  
- **NVDA:** ___/__ issues identified during manual testing

### Notes:
_Use this space to record any additional findings or tool-specific observations._
