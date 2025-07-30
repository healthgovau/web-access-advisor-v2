# Accessibility Defects Reference

This document lists all accessibility defects implemented in the test pages for benchmarking purposes. These defects are specifically designed to be detected by:
- **Google Chrome Lighthouse** accessibility audits
- **axe-core** accessibility engine (used by axe DevTools, axe-linter, etc.)
- **NVDA screen reader** compatibility testing

**Usage:** Check off the boxes below as you verify each issue is detected by your testing tools.

**Checkbox Legend:**
- Each issue has two separate entries: one for Standard Tool testing, one for WAA Tool testing

## Home Page (index.html) - Navigation & Basic Structure

### Lighthouse/axe-core Detected Issues:

1. **html-has-lang**: HTML element missing lang attribute
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

2. **bypass**: Missing skip links for main content
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

3. **region**: Page regions not properly identified (missing landmarks)
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

4. **landmark-one-main**: Missing main landmark
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

5. **page-has-heading-one**: Page has proper h1 element (this should pass)
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

### NVDA Screen Reader Issues:

1. **Missing navigation landmark**: Navigation area not marked with nav element or role
   - [ ] NVDA manual test detected
   - [ ] WAA Tool detected

2. **Missing main landmark**: Content area not marked with main element or role
   - [ ] NVDA manual test detected
   - [ ] WAA Tool detected

3. **No skip link**: No way to bypass navigation for keyboard/screen reader users
   - [ ] NVDA manual test detected
   - [ ] WAA Tool detected

4. **Missing current page indication**: No indication of which page is currently active
   - [ ] NVDA manual test detected
   - [ ] WAA Tool detected

5. **Navigation structure**: Proper list structure for navigation (this should pass)
   - [ ] NVDA manual test detected
   - [ ] WAA Tool detected

## Page 1 - Text Content & Basic Forms

### Lighthouse/axe-core Detected Issues:

1. **html-has-lang**: HTML element missing lang attribute
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

2. **document-title**: Page missing or empty title element
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

3. **duplicate-id**: Multiple elements with the same ID
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

4. **heading-order**: Skipped heading levels (h1 jumping to h3)
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

5. **empty-heading**: Heading elements with no content
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

6. **image-alt**: Images missing alt attributes or with inappropriate alt text
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

7. **label**: Form inputs without associated labels
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

8. **form-field-multiple-labels**: Inputs with multiple or conflicting labels
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

9. **button-name**: Buttons without accessible names
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

10. **link-name**: Links without accessible text
    - [ ] Lighthouse/axe-core detected
    - [ ] WAA Tool detected

11. **tabindex**: Improper use of positive tabindex values
    - [ ] Lighthouse/axe-core detected
    - [ ] WAA Tool detected

12. **color-contrast**: Text with insufficient contrast ratios (<4.5:1 for normal text)
    - [ ] Lighthouse/axe-core detected
    - [ ] WAA Tool detected

13. **list-structure**: Fake lists using divs instead of proper ul/ol elements
    - [ ] Lighthouse/axe-core detected
    - [ ] WAA Tool detected

### NVDA Screen Reader Issues:

1. **Missing form labels**: Inputs that NVDA cannot associate with descriptive text
   - [ ] NVDA manual test detected
   - [ ] WAA Tool detected

2. **Non-semantic markup**: Using divs styled as headings instead of proper h1-h6
   - [ ] NVDA manual test detected
   - [ ] WAA Tool detected

3. **Placeholder abuse**: Using placeholder as the only label (not announced consistently)
   - [ ] NVDA manual test detected
   - [ ] WAA Tool detected

4. **Decorative images with alt**: Images that should be ignored by screen readers
   - [ ] NVDA manual test detected
   - [ ] WAA Tool detected

5. **Hidden labels**: Labels that are visually hidden but confuse screen readers
   - [ ] NVDA manual test detected
   - [ ] WAA Tool detected

6. **Missing required field indication**: No ARIA or semantic indication of required fields
   - [ ] NVDA manual test detected
   - [ ] WAA Tool detected

7. **Poor error association**: Error messages not programmatically linked to form fields
   - [ ] NVDA manual test detected
   - [ ] WAA Tool detected

8. **Fake buttons**: Divs with click handlers that appear as buttons but lack semantics
   - [ ] NVDA manual test detected
   - [ ] WAA Tool detected

## Page 2 - Complex Forms & Navigation

### Lighthouse/axe-core Detected Issues:

1. **bypass**: Missing skip links for main content
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

2. **duplicate-id**: Multiple elements with the same ID
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

3. **button-has-type**: Buttons without explicit type attributes
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

4. **autocomplete-valid**: Missing or incorrect autocomplete attributes
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

5. **tabindex**: Improper use of positive tabindex values
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

6. **focus-order-semantics**: Illogical focus order
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

7. **aria-valid-attr**: Invalid ARIA attribute names
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

8. **aria-valid-attr-value**: ARIA attributes with invalid values
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

9. **aria-required-attr**: Missing required ARIA attributes for roles
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

10. **aria-allowed-attr**: ARIA attributes not allowed on specific elements
    - [ ] Lighthouse/axe-core detected
    - [ ] WAA Tool detected

11. **aria-hidden-focus**: Focusable elements with aria-hidden="true"
    - [ ] Lighthouse/axe-core detected
    - [ ] WAA Tool detected

### NVDA Screen Reader Issues:

1. **Missing navigation landmarks**: Content areas not properly identified
   - [ ] NVDA manual test detected
   - [ ] WAA Tool detected

2. **Missing fieldset/legend**: Related form controls not grouped properly
   - [ ] NVDA manual test detected
   - [ ] WAA Tool detected

3. **No current page indication**: Screen readers can't identify current location
   - [ ] NVDA manual test detected
   - [ ] WAA Tool detected

4. **Inconsistent navigation**: Navigation structure that confuses screen reader users
   - [ ] NVDA manual test detected
   - [ ] WAA Tool detected

5. **Keyboard traps**: Navigation that traps focus without escape mechanism
   - [ ] NVDA manual test detected
   - [ ] WAA Tool detected

6. **Poor progress indication**: Multi-step forms without clear progress communication
   - [ ] NVDA manual test detected
   - [ ] WAA Tool detected

7. **No error announcements**: Form validation errors not announced to screen readers
   - [ ] NVDA manual test detected
   - [ ] WAA Tool detected

8. **Silent form submission**: Forms that submit without status feedback
   - [ ] NVDA manual test detected
   - [ ] WAA Tool detected

## Page 3 - Data Tables & Media

### Lighthouse/axe-core Detected Issues:

1. **table-headers**: Data tables without proper header elements
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

2. **th-has-data-cells**: Table headers without associated data cells
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

3. **td-headers-attr**: Table cells not associated with headers
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

4. **scope-attr-valid**: Invalid scope attribute values
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

5. **table-duplicate-name**: Tables with duplicate accessible names
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

6. **video-caption**: Videos without captions
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

7. **audio-caption**: Audio content without transcripts
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

8. **nested-interactive**: Interactive elements nested within other interactive elements
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

9. **presentation-role-conflict**: Elements with conflicting roles
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

10. **meta-refresh**: Auto-refreshing content without warning
    - [ ] Lighthouse/axe-core detected
    - [ ] WAA Tool detected

### NVDA Screen Reader Issues:

1. **Missing table captions**: Tables without descriptive captions for context
   - [ ] NVDA manual test detected
   - [ ] WAA Tool detected

2. **Complex table navigation**: Headers not properly associated with data cells
   - [ ] NVDA manual test detected
   - [ ] WAA Tool detected

3. **Empty table cells**: Data cells with no content or context
   - [ ] NVDA manual test detected
   - [ ] WAA Tool detected

4. **Layout tables with headers**: Presentational tables incorrectly marked up
   - [ ] NVDA manual test detected
   - [ ] WAA Tool detected

5. **Table structure confusion**: Tables used for layout instead of data presentation
   - [ ] NVDA manual test detected
   - [ ] WAA Tool detected

6. **Nested tables**: Tables within tables causing navigation confusion
   - [ ] NVDA manual test detected
   - [ ] WAA Tool detected

7. **Missing media alternatives**: No text alternatives for audio/video content
   - [ ] NVDA manual test detected
   - [ ] WAA Tool detected

8. **Auto-playing media**: Media that starts without user control
   - [ ] NVDA manual test detected
   - [ ] WAA Tool detected

## Page 4 - Interactive Elements & ARIA

### Lighthouse/axe-core Detected Issues:

1. **button-has-type**: Buttons without explicit type attributes
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

2. **listitem**: List items not contained in proper list elements
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

3. **dlitem**: Improper definition list structure
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

4. **definition-list**: Invalid definition list markup
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

5. **aria-roles**: Invalid or inappropriate ARIA roles
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

6. **aria-required-parent**: ARIA roles missing required parent roles
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

7. **aria-required-children**: ARIA roles missing required child roles
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

8. **aria-expanded**: Missing or incorrect aria-expanded values
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

9. **aria-controls**: Missing aria-controls relationships
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

10. **aria-labelledby**: Invalid aria-labelledby references
    - [ ] Lighthouse/axe-core detected
    - [ ] WAA Tool detected

11. **aria-describedby**: Invalid aria-describedby references
    - [ ] Lighthouse/axe-core detected
    - [ ] WAA Tool detected

12. **aria-hidden-body**: aria-hidden on document body
    - [ ] Lighthouse/axe-core detected
    - [ ] WAA Tool detected

### NVDA Screen Reader Issues:

1. **Missing component labels**: Custom widgets without accessible names
   - [ ] NVDA manual test detected
   - [ ] WAA Tool detected

2. **Modal focus management**: Dialogs that don't trap focus properly
   - [ ] NVDA manual test detected
   - [ ] WAA Tool detected

3. **No keyboard escape**: Modal dialogs without ESC key functionality
   - [ ] NVDA manual test detected
   - [ ] WAA Tool detected

4. **Broken custom dropdowns**: Select-like widgets without proper keyboard support
   - [ ] NVDA manual test detected
   - [ ] WAA Tool detected

5. **Poor state communication**: Widget states not communicated to assistive technology
   - [ ] NVDA manual test detected
   - [ ] WAA Tool detected

6. **Inconsistent widget behavior**: Custom controls that don't follow ARIA patterns
   - [ ] NVDA manual test detected
   - [ ] WAA Tool detected

7. **Missing live regions**: Dynamic content changes not announced
   - [ ] NVDA manual test detected
   - [ ] WAA Tool detected

8. **Conflicting ARIA semantics**: ARIA roles that conflict with HTML semantics
   - [ ] NVDA manual test detected
   - [ ] WAA Tool detected

9. **Invalid ARIA relationships**: Elements referencing non-existent IDs
   - [ ] NVDA manual test detected
   - [ ] WAA Tool detected

## Page 5 - Advanced Components & Error Handling

### Lighthouse/axe-core Detected Issues:

1. **page-has-heading-one**: Missing h1 element
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

2. **duplicate-id**: Multiple instances of elements with same ID
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

3. **region**: Page regions not properly identified
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

4. **landmark-unique**: Duplicate landmark labels
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

5. **scrollable-region-focusable**: Scrollable regions not keyboard accessible
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

6. **focus-order-semantics**: Logical focus order violations
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

7. **aria-roles**: Invalid or inappropriate ARIA roles
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

8. **aria-allowed-attr**: ARIA attributes not allowed on specific elements
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

9. **aria-required-children**: ARIA roles missing required child roles
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

10. **aria-required-parent**: ARIA roles missing required parent roles
    - [ ] Lighthouse/axe-core detected
    - [ ] WAA Tool detected

11. **color-contrast**: Error states indicated only by color
    - [ ] Lighthouse/axe-core detected
    - [ ] WAA Tool detected

### NVDA Screen Reader Issues:

1. **Color-only error indication**: Errors conveyed only through visual styling
   - [ ] NVDA manual test detected
   - [ ] WAA Tool detected

2. **Missing error summaries**: Forms without comprehensive error collection
   - [ ] NVDA manual test detected
   - [ ] WAA Tool detected

3. **Error recovery guidance**: Error messages without correction instructions
   - [ ] NVDA manual test detected
   - [ ] WAA Tool detected

4. **Silent form submissions**: Form processing without status feedback
   - [ ] NVDA manual test detected
   - [ ] WAA Tool detected

5. **Poor loading state communication**: Async operations without status updates
   - [ ] NVDA manual test detected
   - [ ] WAA Tool detected

6. **Session timeout without warning**: Timed content without sufficient warning
   - [ ] NVDA manual test detected
   - [ ] WAA Tool detected

7. **Auto-refresh without announcement**: Content that updates silently
   - [ ] NVDA manual test detected
   - [ ] WAA Tool detected

8. **Carousel without navigation aids**: Image sliders with no screen reader support
   - [ ] NVDA manual test detected
   - [ ] WAA Tool detected

9. **Inaccessible drag and drop**: Drag interfaces without keyboard alternatives
   - [ ] NVDA manual test detected
   - [ ] WAA Tool detected

10. **Fake form controls**: Non-semantic elements styled to look like form controls
    - [ ] NVDA manual test detected
    - [ ] WAA Tool detected

## Lighthouse Accessibility Audit Categories

### Manual Checks (require human verification):

1. **Color contrast**: Verify all text meets minimum contrast ratios
   - [ ] Lighthouse manual detected
   - [ ] WAA Tool detected

2. **Keyboard navigation**: Ensure all interactive elements are keyboard accessible
   - [ ] Lighthouse manual detected
   - [ ] WAA Tool detected

3. **Screen reader testing**: Verify content is properly announced
   - [ ] Lighthouse manual detected
   - [ ] WAA Tool detected

4. **Focus management**: Check focus indicators and logical tab order
   - [ ] Lighthouse manual detected
   - [ ] WAA Tool detected

5. **Form validation**: Verify error messages are helpful and accessible
   - [ ] Lighthouse manual detected
   - [ ] WAA Tool detected

### Automated Checks (detected by Lighthouse):

1. **ARIA implementation**: Proper use of ARIA attributes and roles
   - [ ] Lighthouse auto detected
   - [ ] WAA Tool detected

2. **Semantic HTML**: Use of appropriate HTML elements for content structure
   - [ ] Lighthouse auto detected
   - [ ] WAA Tool detected

3. **Image accessibility**: Alt text and decorative image handling
   - [ ] Lighthouse auto detected
   - [ ] WAA Tool detected

4. **Form accessibility**: Labels, fieldsets, and form structure
   - [ ] Lighthouse auto detected
   - [ ] WAA Tool detected

5. **Navigation accessibility**: Skip links, landmarks, and heading structure
   - [ ] Lighthouse auto detected
   - [ ] WAA Tool detected

## axe-core Rule Categories

### Level A Violations (in WCAG order):

1. **1.1.1 Non-text Content**: image-alt, input-image-alt, area-alt
   - [ ] axe-core detected
   - [ ] WAA Tool detected

2. **1.3.1 Info and Relationships**: label, form-field-multiple-labels, fieldset
   - [ ] axe-core detected
   - [ ] WAA Tool detected

3. **1.3.2 Meaningful Sequence**: tabindex, focus-order-semantics
   - [ ] axe-core detected
   - [ ] WAA Tool detected

4. **1.4.1 Use of Color**: color-contrast (Level AA but commonly tested)
   - [ ] axe-core detected
   - [ ] WAA Tool detected

5. **2.1.1 Keyboard**: focusable-content, keyboard-navigation
   - [ ] axe-core detected
   - [ ] WAA Tool detected

6. **2.1.2 No Keyboard Trap**: no-keyboard-trap
   - [ ] axe-core detected
   - [ ] WAA Tool detected

7. **2.4.1 Bypass Blocks**: bypass, skip-link
   - [ ] axe-core detected
   - [ ] WAA Tool detected

8. **2.4.2 Page Titled**: document-title
   - [ ] axe-core detected
   - [ ] WAA Tool detected

9. **2.4.3 Focus Order**: tabindex, focus-order-semantics
   - [ ] axe-core detected
   - [ ] WAA Tool detected

10. **2.4.4 Link Purpose**: link-name, link-in-text-block
    - [ ] axe-core detected
    - [ ] WAA Tool detected

11. **3.1.1 Language of Page**: html-has-lang, html-lang-valid
    - [ ] axe-core detected
    - [ ] WAA Tool detected

12. **3.2.1 On Focus**: no-focus-change
    - [ ] axe-core detected
    - [ ] WAA Tool detected

13. **3.2.2 On Input**: no-input-change
    - [ ] axe-core detected
    - [ ] WAA Tool detected

14. **3.3.1 Error Identification**: label, form-field-multiple-labels
    - [ ] axe-core detected
    - [ ] WAA Tool detected

15. **3.3.2 Labels or Instructions**: label, fieldset
    - [ ] axe-core detected
    - [ ] WAA Tool detected

16. **4.1.1 Parsing**: duplicate-id, valid-html
    - [ ] axe-core detected
    - [ ] WAA Tool detected

17. **4.1.2 Name, Role, Value**: button-name, link-name, aria-*
    - [ ] axe-core detected
    - [ ] WAA Tool detected

### Level AA Violations (in WCAG order):

1. **1.4.3 Contrast (Minimum)**: color-contrast
   - [ ] axe-core detected
   - [ ] WAA Tool detected

2. **1.4.4 Resize Text**: meta-viewport-large
   - [ ] axe-core detected
   - [ ] WAA Tool detected

3. **2.4.6 Headings and Labels**: heading-order, empty-heading
   - [ ] axe-core detected
   - [ ] WAA Tool detected

4. **2.4.7 Focus Visible**: focus-order-semantics
   - [ ] axe-core detected
   - [ ] WAA Tool detected

5. **3.2.3 Consistent Navigation**: consistent-navigation
   - [ ] axe-core detected
   - [ ] WAA Tool detected

6. **3.2.4 Consistent Identification**: consistent-identification
   - [ ] axe-core detected
   - [ ] WAA Tool detected

## NVDA Screen Reader Test Scenarios

### Navigation Testing (by navigation method):

1. **Heading navigation** (H key): Verify logical heading structure
   - [ ] NVDA manual test detected
   - [ ] WAA Tool detected

2. **Landmark navigation** (D key): Check main, nav, aside, footer regions
   - [ ] NVDA manual test detected
   - [ ] WAA Tool detected

3. **Link navigation** (K key): Ensure all links have descriptive text
   - [ ] NVDA manual test detected
   - [ ] WAA Tool detected

4. **List navigation** (L key): Verify proper list markup
   - [ ] NVDA manual test detected
   - [ ] WAA Tool detected

5. **Form control navigation** (F key): Verify all form elements are reachable
   - [ ] NVDA manual test detected
   - [ ] WAA Tool detected

6. **Table navigation** (T key): Check table structure and header associations
   - [ ] NVDA manual test detected
   - [ ] WAA Tool detected

### Content Announcement Testing (by element focus):

1. **Form labels**: Verify input labels are announced when focused
   - [ ] NVDA manual test detected
   - [ ] WAA Tool detected

2. **Required fields**: Verify required field indication is announced
   - [ ] NVDA manual test detected
   - [ ] WAA Tool detected

3. **Instructions**: Check that help text is properly associated and announced
   - [ ] NVDA manual test detected
   - [ ] WAA Tool detected

4. **Error messages**: Check that validation errors are announced
   - [ ] NVDA manual test detected
   - [ ] WAA Tool detected

5. **State changes**: Verify expanded/collapsed states are communicated
   - [ ] NVDA manual test detected
   - [ ] WAA Tool detected

6. **Status updates**: Ensure dynamic content changes are communicated
   - [ ] NVDA manual test detected
   - [ ] WAA Tool detected

### Interactive Element Testing (by interaction type):

1. **Button functionality**: Verify buttons work with ENTER/SPACE keys
   - [ ] NVDA manual test detected
   - [ ] WAA Tool detected

2. **Form submission**: Check that success/error states are communicated
   - [ ] NVDA manual test detected
   - [ ] WAA Tool detected

3. **Modal dialogs**: Check focus trapping and ESC key functionality
   - [ ] NVDA manual test detected
   - [ ] WAA Tool detected

4. **Custom widgets**: Verify ARIA patterns work correctly with screen readers
   - [ ] NVDA manual test detected
   - [ ] WAA Tool detected

5. **Loading states**: Verify async operations communicate status changes
   - [ ] NVDA manual test detected
   - [ ] WAA Tool detected

---

## Testing Results Summary

**Total Issues to Test:** 100+

### Tool Detection Rates:
- **Lighthouse:** ___/__ issues detected | **WAA:** ___/__ issues detected
- **axe-core:** ___/__ issues detected | **WAA:** ___/__ issues detected  
- **NVDA:** ___/__ issues identified during manual testing | **WAA:** ___/__ issues detected

### Notes:
_Use this space to record any additional findings or tool-specific observations._
