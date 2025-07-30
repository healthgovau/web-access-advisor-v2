# Accessibility Defects Reference

This document lists all accessibility defects implemented in the test pages for benchmarking purposes. These defects are specifically designed to be detected by:
- **Google Chrome Lighthouse** accessibility audits
- **axe-core** accessibility engine (used by axe DevTools, axe-linter, etc.)
- **NVDA screen reader** compatibility testing

**⚠️ CRITICAL ACCURACY UPDATE:** This documentation has been corrected after comprehensive verification. Previous versions contained significant inaccuracies regarding structural elements.

**VERIFIED STRUCTURAL STATUS:**
- **index.html**: ❌ Missing lang, skip links, main landmark (uses div.nav, div.content)
- **page1.html**: ✅ HAS lang="en", skip links, main landmark 
- **page2.html**: ❌ Missing lang | ✅ HAS skip links, main landmark
- **page3.html**: ❌ Missing lang | ✅ HAS skip links, main landmark  
- **page4.html**: ❌ Missing lang | ✅ HAS skip links, main landmark
- **page5.html**: ❌ Missing lang | ✅ HAS skip links, main landmark
- **page6.html**: ❌ Missing lang | ✅ HAS skip links, main landmark

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
   - [x] Lighthouse/axe-core detected
   - [x] WAA Tool detected

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

**CORRECTED: This page HAS lang="en", skip links, and main landmark - DOCUMENTATION WAS INCORRECT**

### Lighthouse/axe-core Detected Issues:

1. **duplicate-id**: Multiple h1 elements with id="duplicate" 
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

2. **heading-order**: Skipped heading levels (h1 jumping to h3)
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

3. **empty-heading**: Heading elements with no content (h2 and h4 elements)
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

4. **image-alt**: Images missing alt attributes
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

5. **label**: Form inputs without associated labels (name, email, phone, message fields)
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

6. **form-field-multiple-labels**: Input with multiple conflicting labels
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

7. **button-name**: Button elements without accessible names (empty buttons)
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

8. **link-name**: Links without accessible text (empty links, "here" links)
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

9. **tabindex**: Improper use of positive tabindex values (tabindex="1", "3", "5")
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

10. **color-contrast**: Text with insufficient contrast ratios (#ccc text on white)
    - [ ] Lighthouse/axe-core detected
    - [ ] WAA Tool detected

11. **list-structure**: Fake lists using divs instead of proper ul/ol elements
    - [ ] Lighthouse/axe-core detected
    - [ ] WAA Tool detected

12. **select-name**: Select element without associated label
    - [ ] Lighthouse/axe-core detected
    - [ ] WAA Tool detected

### Advanced Defects (Often Missed by Basic Tools):

13. **verbose-alt-text**: Overly descriptive alt text that's unnecessarily verbose
    - [ ] Lighthouse/axe-core detected
    - [ ] WAA Tool detected

14. **decorative-alt-misuse**: Decorative images with unnecessary alt text instead of alt=""
    - [ ] Lighthouse/axe-core detected
    - [ ] WAA Tool detected

15. **placeholder-alt-text**: Alt text containing placeholder/outdated information (e.g., "555-1234")
    - [ ] Lighthouse/axe-core detected
    - [ ] WAA Tool detected

16. **css-background-images**: Important content delivered via CSS background-image without text alternative
    - [ ] Lighthouse/axe-core detected
    - [ ] WAA Tool detected

17. **non-descriptive-links**: Link text like "Read more..." or "Click here" without context
    - [ ] Lighthouse/axe-core detected
    - [ ] WAA Tool detected

18. **link-image-empty-alt**: Links containing only images with empty alt attributes
    - [ ] Lighthouse/axe-core detected
    - [ ] WAA Tool detected

19. **visual-heading-non-semantic**: Text styled to look like headings but not using heading elements
    - [ ] Lighthouse/axe-core detected
    - [ ] WAA Tool detected

20. **reading-sequence-css**: Content order problems caused by CSS positioning/flexbox
    - [ ] Lighthouse/axe-core detected
    - [ ] WAA Tool detected

21. **link-visual-distinction**: Links that look like headings and aren't visually distinct
    - [ ] Lighthouse/axe-core detected
    - [ ] WAA Tool detected

22. **focusable-non-interactive**: Focusable elements without interactive purpose or accessible name
    - [ ] Lighthouse/axe-core detected
    - [ ] WAA Tool detected

23. **context-only-instructions**: Help text that only appears on hover/focus without proper association
    - [ ] Lighthouse/axe-core detected
    - [ ] WAA Tool detected

24. **broken-live-regions**: aria-live regions that don't properly announce content changes
    - [ ] Lighthouse/axe-core detected
    - [ ] WAA Tool detected

25. **false-positive-accessibility**: Elements that look accessible but have no real functionality
    - [ ] Lighthouse/axe-core detected
    - [ ] WAA Tool detected

26. **dynamic-content-focus-loss**: Content that appears/disappears without proper focus management
    - [ ] Lighthouse/axe-core detected
    - [ ] WAA Tool detected

27. **javascript-navigation-links**: Navigation links using JavaScript instead of proper href attributes
    - [ ] Lighthouse/axe-core detected
    - [ ] WAA Tool detected

28. **layout-tables-for-design**: Tables used for visual layout instead of data presentation
    - [ ] Lighthouse/axe-core detected
    - [ ] WAA Tool detected

29. **nested-interactive-elements**: Interactive elements nested inside other interactive elements
    - [ ] Lighthouse/axe-core detected
    - [ ] WAA Tool detected

### NVDA Screen Reader Issues:

**NOTE: Pages 1-5 all have proper skip links and main landmarks - focus on content-specific issues**

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

9. **Verbose alt text confusion**: Overly long descriptions that provide too much detail
   - [ ] NVDA manual test detected
   - [ ] WAA Tool detected

10. **Content reading order**: CSS-positioned content that reads in wrong sequence
    - [ ] NVDA manual test detected
    - [ ] WAA Tool detected

11. **Link context confusion**: Non-descriptive links that lack sufficient context
    - [ ] NVDA manual test detected
    - [ ] WAA Tool detected

12. **CSS content missing**: Important visual information only available through background images
    - [ ] NVDA manual test detected
    - [ ] WAA Tool detected

13. **Focusable non-interactive elements**: Elements that receive focus but serve no interactive purpose
    - [ ] NVDA manual test detected
    - [ ] WAA Tool detected

14. **Context-dependent instructions**: Help text that appears only on hover/focus without proper association
    - [ ] NVDA manual test detected
    - [ ] WAA Tool detected

15. **Silent live region updates**: Content that changes but isn't announced to screen readers
    - [ ] NVDA manual test detected
    - [ ] WAA Tool detected

16. **False accessibility feedback**: Elements that announce as interactive but have no real functionality
    - [ ] NVDA manual test detected
    - [ ] WAA Tool detected

17. **Dynamic content without focus management**: Content that appears/disappears without proper focus handling
    - [ ] NVDA manual test detected
    - [ ] WAA Tool detected

18. **Navigation confusion**: Interactive elements that don't behave as expected with screen reader navigation
    - [ ] NVDA manual test detected
    - [ ] WAA Tool detected

19. **JavaScript navigation problems**: Links that use JavaScript instead of proper href causing screen reader issues
    - [ ] NVDA manual test detected
    - [ ] WAA Tool detected

20. **Layout table confusion**: Tables used for layout being announced as data tables
    - [ ] NVDA manual test detected
    - [ ] WAA Tool detected

21. **Nested interactive element confusion**: Interactive elements inside other interactive elements causing navigation problems
    - [ ] NVDA manual test detected
    - [ ] WAA Tool detected

## Page 2 - Complex Forms & Navigation

**CORRECTED: This page has skip links and main landmark but is MISSING lang attribute**

### Lighthouse/axe-core Detected Issues:

1. **html-has-lang**: HTML element missing lang attribute
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

2. **duplicate-id**: Multiple elements with id="submit" and other duplicates
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

3. **autocomplete-valid**: Invalid autocomplete values ("invalid-value", "bad-autocomplete")
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

4. **tabindex**: Improper use of positive tabindex values (tabindex="1", "2", "3")
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

5. **focus-order-semantics**: Illogical focus order due to positive tabindex
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

6. **aria-valid-attr**: Invalid ARIA attribute names (aria-fake, aria-invalid-name)
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

7. **aria-valid-attr-value**: ARIA attributes with invalid values (aria-expanded="maybe")
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

8. **aria-required-attr**: Missing required ARIA attributes for roles (progressbar missing valuemin/valuemax)
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

9. **aria-allowed-attr**: ARIA attributes not allowed on specific elements
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

10. **aria-hidden-focus**: Focusable elements with aria-hidden="true"
    - [ ] Lighthouse/axe-core detected
    - [ ] WAA Tool detected

### NVDA Screen Reader Issues:

**NOTE: Page 2 has proper skip links and main landmarks - focus on form-specific issues**

1. **Missing fieldset/legend**: Related form controls not grouped properly
   - [ ] NVDA manual test detected
   - [ ] WAA Tool detected

2. **No current page indication**: Screen readers can't identify current location in navigation
   - [ ] NVDA manual test detected
   - [ ] WAA Tool detected

3. **Inconsistent navigation**: Navigation structure that confuses screen reader users
   - [ ] NVDA manual test detected
   - [ ] WAA Tool detected

4. **Keyboard traps**: Navigation that traps focus without escape mechanism
   - [ ] NVDA manual test detected
   - [ ] WAA Tool detected

5. **Poor progress indication**: Multi-step forms without clear progress communication
   - [ ] NVDA manual test detected
   - [ ] WAA Tool detected

6. **No error announcements**: Form validation errors not announced to screen readers
   - [ ] NVDA manual test detected
   - [ ] WAA Tool detected

7. **Silent form submission**: Forms that submit without status feedback
   - [ ] NVDA manual test detected
   - [ ] WAA Tool detected

8. **Invalid ARIA patterns**: ARIA attributes with incorrect or invalid values
   - [ ] NVDA manual test detected
   - [ ] WAA Tool detected

## Page 3 - Data Tables & Media

**CORRECTED: This page has skip links and main landmark but is MISSING lang attribute**

### Lighthouse/axe-core Detected Issues:

1. **html-has-lang**: HTML element missing lang attribute
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

2. **table-headers**: Data tables without proper header elements (tables using td instead of th)
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

3. **th-has-data-cells**: Empty table cells in data tables
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

4. **td-headers-attr**: Table cells incorrectly referencing non-existent headers (headers="pop-id")
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

5. **presentation-role-conflict**: Layout tables with role="presentation" containing semantic markup
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

6. **video-caption**: Videos without captions or transcripts
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

7. **audio-caption**: Audio content without transcripts
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

8. **nested-interactive**: Interactive elements nested within other interactive elements
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

9. **frame-title**: iframe elements without title attributes
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

10. **meta-refresh**: Auto-playing media without user control
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

**CORRECTED: This page has skip links and main landmark but is MISSING lang attribute**

### Lighthouse/axe-core Detected Issues:

1. **html-has-lang**: HTML element missing lang attribute
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

2. **aria-valid-attr-value**: Invalid ARIA attribute values (aria-pressed="maybe", aria-checked="undefined")
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

3. **aria-required-attr**: Missing required ARIA attributes (progressbar missing valuemin/valuemax, slider with invalid range)
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

4. **aria-required-parent**: ARIA elements missing required parent roles (tab, option without proper containers)
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

5. **aria-required-children**: ARIA elements missing required children (listbox without options)
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

6. **aria-allowed-role**: Invalid role combinations (input with role="button", h1 with role="button")
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

7. **aria-labelledby**: Invalid aria-labelledby references (referencing non-existent IDs)
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

8. **aria-describedby**: Invalid aria-describedby references (referencing non-existent IDs)
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

9. **aria-controls**: aria-controls referencing non-existent elements
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

10. **aria-owns**: aria-owns referencing non-existent elements
    - [ ] Lighthouse/axe-core detected
    - [ ] WAA Tool detected

11. **tabindex**: Improper use of positive tabindex values (tabindex="10")
    - [ ] Lighthouse/axe-core detected
    - [ ] WAA Tool detected

12. **nested-interactive**: Button role on interactive elements, conflicting semantics
    - [ ] Lighthouse/axe-core detected
    - [ ] WAA Tool detected

13. **aria-label**: Redundant aria-label when label element already exists
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

**CORRECTED: This page has skip links and main landmark but is MISSING lang attribute**

### Lighthouse/axe-core Detected Issues:

1. **html-has-lang**: HTML element missing lang attribute
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

2. **duplicate-id**: Multiple instances of elements with same ID throughout page
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

3. **color-contrast**: Error states indicated only by color (red borders without text)
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

4. **aria-required-children**: List role missing required listitem children
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

5. **aria-required-parent**: Multiple main landmarks (nested main elements)
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

6. **aria-allowed-attr**: Navigation elements with conflicting ARIA (nested nav elements)
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

7. **aria-live**: Improper live region usage (aria-live="aggressive")
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

8. **form-field-multiple-labels**: Radio buttons with conflicting name attributes
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

9. **label**: Form inputs without proper labels (multiple unlabeled inputs)
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

10. **button-name**: Non-semantic elements styled as buttons (div with onclick)
    - [ ] Lighthouse/axe-core detected
    - [ ] WAA Tool detected

11. **frame-title**: iframe without title attribute
    - [ ] Lighthouse/axe-core detected
    - [ ] WAA Tool detected

12. **tabindex**: Positive tabindex disrupting logical focus order
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

## Page 6 - Advanced ARIA & Screen Reader Edge Cases

**CORRECTED: This page has skip links and main landmark but is MISSING lang attribute**

### Advanced ARIA Defects (Often Missed by Lighthouse/axe):

1. **aria-pressed state management**: Button states that don't update when clicked
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

2. **aria-expanded without content**: Expandable controls that don't actually expand content
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

3. **Non-functional live regions**: aria-live regions that don't announce changes
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

4. **Invalid aria-current values**: Using "yes", "active", "true" instead of proper values
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

5. **Contradictory ARIA labels**: aria-label that contradicts visible button text
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

6. **Invalid aria-level values**: Heading levels >6, ≤0, or non-numeric
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

7. **Mixed state conflicts**: aria-pressed and aria-checked on same element
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

8. **Multiple selected options**: Listbox with multiple aria-selected="true" in single-select
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

9. **Broken tree structure**: Tree items not properly nested in groups
   - [ ] Lighthouse/axe-core detected
   - [ ] WAA Tool detected

10. **Grid header misassociation**: Using aria-describedby instead of proper header association
    - [ ] Lighthouse/axe-core detected
    - [ ] WAA Tool detected

11. **Hidden content references**: aria-describedby pointing to display:none elements
    - [ ] Lighthouse/axe-core detected
    - [ ] WAA Tool detected

12. **Presentation table with headers**: role="presentation" table containing th elements
    - [ ] Lighthouse/axe-core detected
    - [ ] WAA Tool detected

13. **Conflicting list semantics**: List items with menuitem/option roles
    - [ ] Lighthouse/axe-core detected
    - [ ] WAA Tool detected

14. **aria-hidden/visibility mismatch**: aria-hidden="false" on display:none elements
    - [ ] Lighthouse/axe-core detected
    - [ ] WAA Tool detected

15. **Broken tab panel associations**: Tabs referencing non-existent panels
    - [ ] Lighthouse/axe-core detected
    - [ ] WAA Tool detected

16. **Multiple active tabs**: Multiple tabs with tabindex="0" in same tablist
    - [ ] Lighthouse/axe-core detected
    - [ ] WAA Tool detected

17. **Option focus management**: Listbox options with tabindex="0" (should be -1)
    - [ ] Lighthouse/axe-core detected
    - [ ] WAA Tool detected

18. **Silent progress updates**: Progress bars that update without announcements
    - [ ] Lighthouse/axe-core detected
    - [ ] WAA Tool detected

19. **Context-only instructions**: Help text that only appears on hover/focus
    - [ ] Lighthouse/axe-core detected
    - [ ] WAA Tool detected

20. **Misleading field context**: Form fields with contradictory labels and ARIA
    - [ ] Lighthouse/axe-core detected
    - [ ] WAA Tool detected

### Screen Reader Edge Cases:

1. **State change communication**: Interactive elements that change appearance but don't update ARIA states
   - [ ] NVDA manual test detected
   - [ ] WAA Tool detected

2. **Dynamic content without announcements**: Content that appears/disappears silently
   - [ ] NVDA manual test detected
   - [ ] WAA Tool detected

3. **Focus management failures**: Modals and custom widgets that don't trap or return focus
   - [ ] NVDA manual test detected
   - [ ] WAA Tool detected

4. **Loading state silence**: Async operations without status communication
   - [ ] NVDA manual test detected
   - [ ] WAA Tool detected

5. **Time-sensitive content**: Countdown timers without adequate warnings
   - [ ] NVDA manual test detected
   - [ ] WAA Tool detected

6. **Context loss**: Form validation errors that appear without focus management
   - [ ] NVDA manual test detected
   - [ ] WAA Tool detected

7. **Widget keyboard traps**: Custom components with broken arrow key navigation
   - [ ] NVDA manual test detected
   - [ ] WAA Tool detected

8. **Inconsistent widget behavior**: Components that don't follow standard ARIA patterns
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
