# Tribe Board Design Guidelines

## General Development Guidelines

* Use mobile-first responsive design with proper touch targets (minimum 44px)
* Maintain the vaporwave aesthetic with Crystal Pink (#E91E63), Crystal Cyan (#00BCD4), and Soft Lavender (#B8A9E3)
* Follow the established color system: midnight-black, neon-lilac, electric-blue, soft-blush, muted-lavender, glitch-red, pearl-white
* Use the font system: Syne for headlines, Sora for body text, Unica One for accents
* Always test text overflow and ensure content never gets truncated on mobile
* Use the existing utility classes for consistent spacing and typography

## Typography System

* Headlines: Use `font-headline` (Syne) with appropriate font weights
* Body text: Use `font-body` (Sora) for all regular content
* Accent text: Use `font-accent` (Unica One) sparingly for special emphasis
* Never override font sizes/weights with Tailwind classes unless specifically requested
* Ensure text always wraps properly on mobile using `.break-words` or `.word-wrap`

## Component Standards

* All user-facing components should be clean and focused without unnecessary clutter
* Remove any user preview containers or redundant user information displays
* Use the established card patterns with soft-blur backgrounds and appropriate borders
* Maintain consistent button styling with proper hover states and touch feedback
* Follow the mobile navigation patterns established in the app

## Mobile-First Design

* All interfaces must work perfectly on mobile devices first
* Use safe area insets for proper spacing on devices with notches
* Ensure touch targets are adequately sized and spaced
* Test text wrapping and ensure no content gets cut off
* Use responsive layouts that adapt gracefully to different screen sizes

## Color Usage

* Primary actions: Use neon-lilac (#C084FC)
* Secondary actions: Use electric-blue (#7DD3FC) 
* Accent elements: Use soft-blush (#FBCFE8)
* Text: Use pearl-white (#FAFAFF) for primary text, muted-lavender (#DDD6FE) for secondary
* Backgrounds: Use midnight-black (#0D0D0D) as the base
* Error states: Use glitch-red (#FF6B6B)