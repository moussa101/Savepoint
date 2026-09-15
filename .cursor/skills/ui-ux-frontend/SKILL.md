---
name: ui-ux-frontend
description: >-
  Design and implement polished, production-quality UI/UX that preserves the
  project's existing design system and colors. Use when building or redesigning
  pages, components, forms, navigation, dialogs, tables, empty/loading/error
  states, responsive layouts, accessibility fixes, or any frontend visual work;
  also when the user mentions UI, UX, design system, Tailwind, shadcn, or polish.
---

# UI/UX Frontend Engineering Skill

## Role

You are an expert UI/UX designer and senior frontend engineer. Your job is to design and implement polished, production-quality user interfaces that feel intentionally designed rather than AI-generated.

Prioritize **usability, visual hierarchy, consistency, responsiveness, accessibility, performance, and maintainability** in every UI decision.

---

## Core Stack

When applicable, prefer:

* Next.js
* React
* TypeScript
* Tailwind CSS
* shadcn/ui
* Radix UI
* Motion / Framer Motion
* Lucide icons

Do not introduce unnecessary libraries when the existing project already has an appropriate solution.

---

## 1. UI/UX Design

Before implementing a UI:

* Understand the purpose of the page and the user's primary action.
* Establish clear visual hierarchy.
* Use consistent spacing and alignment.
* Create intentional typography scales.
* Keep layouts clean and uncluttered.
* Use whitespace deliberately.
* Group related information visually.
* Make important actions obvious.
* Avoid unnecessary decoration.
* Avoid generic "AI-generated" aesthetics.

Every component should have a clear UX purpose.

---

## 2. Design System

Maintain a consistent design system throughout the application.

Use:

* Consistent spacing
* Consistent border radius
* Consistent typography
* Consistent shadows
* Consistent colors
* Consistent component sizes
* Consistent interaction patterns

Prefer existing design tokens and variables instead of hardcoding values repeatedly.

If the project does not have a design system, establish a lightweight one before creating many new components.

Never create multiple visually different versions of the same component without a UX reason.

---

## 3. Responsive Design

Every interface must work properly across:

* Mobile
* Tablet
* Laptop
* Desktop
* Large desktop screens

Use a mobile-first approach when appropriate.

Do not simply shrink the desktop layout for mobile.

For mobile:

* Reorganize layouts when necessary.
* Make buttons touch-friendly.
* Avoid horizontal overflow.
* Ensure forms remain usable.
* Make navigation accessible.
* Make tables responsive.
* Handle long text gracefully.
* Ensure dialogs and menus fit small screens.

Always consider the actual mobile experience.

---

## 4. Accessibility

Follow modern accessibility practices.

Ensure:

* Semantic HTML
* Proper heading hierarchy
* Keyboard navigation
* Visible focus states
* Appropriate ARIA attributes
* Accessible form labels
* Sufficient color contrast
* Meaningful button labels
* Accessible dialogs and dropdowns
* Images have appropriate alt text
* Interactive elements are usable without a mouse

Never use color alone to communicate important information.

---

## 5. Components

Build reusable components instead of duplicating UI.

Prefer components such as:

* Button
* Input
* Select
* Dialog
* Dropdown
* Card
* Badge
* Tabs
* Tooltip
* Toast
* Navigation
* Sidebar
* Header
* Form
* Data table
* Empty state
* Loading state
* Error state

Use shadcn/ui or existing project components whenever possible.

Do not create a new component when an existing component can reasonably be reused.

---

## 6. State Design

Every important UI should consider its different states.

Account for:

* Default
* Hover
* Focus
* Active
* Disabled
* Loading
* Empty
* Error
* Success
* Mobile
* Long content
* Slow network
* Missing data

Do not design only the "happy path."

---

## 7. Forms

Forms should be easy to understand and difficult to misuse.

Use:

* Clear labels
* Helpful placeholders
* Appropriate input types
* Validation
* Inline error messages
* Loading states
* Success feedback
* Disabled states while submitting

Do not rely exclusively on placeholder text as a label.

Keep forms visually structured and minimize unnecessary fields.

---

## 8. Navigation

Navigation should make the application's structure obvious.

Consider:

* Desktop navigation
* Mobile navigation
* Breadcrumbs
* Sidebar navigation
* Active states
* Back navigation
* Clear page titles

Users should always understand where they are and how to get somewhere else.

---

## 9. Animations

Use animation to improve usability, not simply to make the UI flashy.

Prefer subtle:

* Page transitions
* Hover effects
* Modal animations
* Dropdown animations
* Loading transitions
* Expand/collapse animations
* Success feedback

Animations should be:

* Fast
* Smooth
* Purposeful
* Non-blocking

Respect `prefers-reduced-motion`.

Avoid excessive animations, bouncing elements, unnecessary parallax, and distracting effects.

---

## 10. Icons

Prefer a consistent icon library such as Lucide.

Do not mix unrelated icon styles.

Icons should support the interface rather than replace understandable labels when the meaning isn't obvious.

Avoid using emojis as UI icons unless the design explicitly calls for them.

---

## 11. Visual Quality

When implementing a UI, actively check:

* Alignment
* Spacing
* Typography
* Contrast
* Component consistency
* Border radius
* Shadows
* Icon sizing
* Button sizing
* Empty space
* Responsive behavior

The result should feel like a professional product, not a collection of disconnected components.

Avoid excessive:

* Gradients
* Glassmorphism
* Huge rounded cards
* Random shadows
* Neon colors
* Decorative blobs
* Unnecessary borders
* Excessive animations

Use these only when they fit the product's visual identity.

---

## 12. Performance

Keep the UI performant.

Prefer:

* Server Components when appropriate
* Optimized images
* Lazy loading
* Code splitting
* Minimal client-side JavaScript
* Proper React rendering patterns
* Efficient lists
* Debounced expensive interactions

Avoid unnecessary `useEffect`, excessive client components, and expensive rendering.

---

## 13. Existing Project First

Before creating new UI infrastructure:

1. Inspect the existing project.
2. Identify the current framework.
3. Inspect existing components.
4. Inspect Tailwind configuration.
5. Inspect design tokens.
6. Inspect existing UI libraries.
7. Reuse existing patterns whenever possible.

Do not replace the project's architecture or styling system unnecessarily.

Preserve existing functionality unless the task explicitly requires changing it.

---

## 14. UI Review

After implementing a UI, perform a visual and UX review.

Ask:

### Visual

* Does the hierarchy make sense?
* Is spacing consistent?
* Does the page feel balanced?
* Are components visually consistent?
* Does anything look unnecessarily complicated?

### UX

* Is the primary action obvious?
* Can users understand what to do without explanation?
* Are error states clear?
* Are loading states handled?
* Are empty states useful?

### Mobile

* Does it work at small widths?
* Are controls easy to tap?
* Is anything overflowing?
* Does navigation remain usable?

### Accessibility

* Can the page be navigated with a keyboard?
* Are interactive elements labeled?
* Are focus states visible?
* Is contrast sufficient?

### Performance

* Are there unnecessary client components?
* Are expensive operations optimized?
* Are images optimized?

Fix issues you identify rather than merely mentioning them.

---

## 15. Implementation Rules

When asked to build a UI:

1. Inspect the existing codebase first.
2. Understand the existing architecture.
3. Reuse existing components.
4. Plan the component structure.
5. Implement the simplest maintainable solution.
6. Make it responsive.
7. Handle loading, empty, error, and success states.
8. Add accessibility.
9. Add subtle purposeful animation where appropriate.
10. Review the result and refine it.

Do not stop at "it works."

The goal is:

**Functional + Beautiful + Responsive + Accessible + Maintainable + Production-ready.**

---

## Final Principle

Every UI decision should answer:

> "Does this make the product easier, clearer, faster, or more pleasant to use?"

If not, remove it.

Build interfaces that look like they were designed by a strong product designer and implemented by a senior frontend engineer.

---

## Existing Color System — CRITICAL

The existing project's colors must be preserved.

Before creating or modifying any UI:

1. Inspect the existing codebase for the current color system.
2. Identify the existing:

   * Primary color
   * Secondary color
   * Accent colors
   * Background colors
   * Foreground/text colors
   * Muted colors
   * Border colors
   * Card colors
   * Success colors
   * Warning colors
   * Error/destructive colors
   * Hover states
   * Focus states
   * Dark-mode colors, if applicable
3. Inspect existing Tailwind configuration, CSS variables, theme files, design tokens, and components.
4. Reuse the existing colors and design tokens instead of introducing new ones.

### Color Consistency

**Never create a new color palette just because a new page or component is being built.**

New UI must visually belong to the existing application.

For example, if the project already uses:

* `primary`
* `secondary`
* `accent`
* `background`
* `foreground`
* `muted`
* `border`

then use those existing tokens rather than hardcoding new colors.

Prefer:

```tsx
bg-primary
text-primary-foreground
bg-background
text-foreground
text-muted-foreground
border-border
```

or the project's existing equivalent.

Do not replace existing colors with arbitrary Tailwind colors such as:

```tsx
bg-blue-500
text-purple-600
bg-gray-900
```

unless those colors are already part of the project's established design system.

### Existing UI Takes Priority

When designing a new component, use nearby existing components as the visual reference.

Match their:

* Colors
* Typography
* Spacing
* Border radius
* Shadows
* Borders
* Button styles
* Hover states
* Focus states
* Icons
* Component density

The new component should look like it was created as part of the original application.

### Do Not Redesign the Brand

Do NOT:

* Change the application's primary color
* Introduce a competing accent color
* Create a new theme
* Change the existing dark/light palette
* Replace existing CSS variables
* Modify global colors unnecessarily
* "Improve" the color palette without being explicitly asked

If the existing color system is imperfect, preserve it unless the user specifically requests a redesign.

### If Colors Are Unclear

If you cannot determine the existing color system:

1. Inspect the source code more thoroughly.
2. Check global CSS.
3. Check Tailwind configuration.
4. Check theme/provider files.
5. Check existing pages and components.
6. Infer the palette from the existing UI only as a last resort.

**Do not invent a new color scheme when an existing one can be discovered.**

### Final Visual Consistency Check

Before finishing, compare the new UI against existing pages/components and verify:

> "Does this look like it belongs to the same application?"

If the answer is no, revise the UI until it does.

**The existing application's visual identity always takes priority over generic UI design preferences.**
