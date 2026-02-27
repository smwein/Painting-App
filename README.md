# Painting Company Bidding App

A mobile-first Progressive Web App (PWA) for painting contractors to create professional job bids on-site. Built with React, TypeScript, and Tailwind CSS.

## Features

### 4 Pricing Calculators

1. **Interior - Square Footage**: Quick estimate based on house square footage
2. **Interior - Detailed**: Comprehensive bid with 22 measurement fields
3. **Exterior - Square Footage**: Quick exterior estimate
4. **Exterior - Detailed**: Detailed exterior bid with 21 measurement fields

### Additional Features

- **Customer Information**: Capture name, address, phone, email, job date, and notes
- **Company Branding**: Upload company logo and contact information for PDF exports
- **Save & Load Bids**: Save bids to localStorage and load them later
- **PDF Export**: Generate professional PDF bid estimates
- **Offline Support**: Works offline as a Progressive Web App (PWA)
- **Mobile-First Design**: Optimized for tablets and smartphones

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Usage

1. **Choose a Calculator**: Select from the 4 calculator options
2. **Enter Customer Information**: Fill in customer details
3. **Input Measurements**: Enter relevant measurements for your project
4. **Select Paint & Markup**: Choose paint type and profit markup
5. **Review Bid**: See real-time calculation
6. **Save or Export**: Save to localStorage or export as PDF

## Technology Stack

- React 18 + TypeScript
- Vite 5
- Tailwind CSS 3
- Zustand (state management)
- React Hook Form + Zod
- jsPDF
- React Router DOM
- Vite PWA Plugin

## PWA Installation

### iOS (Safari)
1. Open the app in Safari
2. Tap the Share button
3. Select "Add to Home Screen"

### Android (Chrome)
1. Open the app in Chrome
2. Tap the menu
3. Select "Install App"

---

**Version**: 1.0.0
**Last Updated**: 2026-02-27
