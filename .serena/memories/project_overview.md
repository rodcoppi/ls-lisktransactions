# LuckySea Lisk Analytics Dashboard - Project Overview

## Purpose
The LuckySea Lisk Analytics Dashboard is a real-time analytics dashboard for Lisk blockchain transactions that features the signature LuckySea design system with glassmorphism effects and smooth animations. It monitors contract interactions for address `0xf18485f75551FFCa4011C32a0885ea8C22336840` on the Lisk blockchain.

## Key Features
- Real-time transaction monitoring with smart polling
- UTC timezone support for consistent data handling
- Interactive charts with Recharts visualizations
- Pre-populated cache with 24,955+ historical transactions
- Vercel optimized with efficient caching strategy for Free Tier
- Responsive design with LuckySea design system
- Auto-refresh with exponential backoff strategy

## Live Demo
https://ls-lisktransactions.vercel.app/

## Tech Stack
- **Frontend**: Next.js 14 with App Router, TypeScript, React 18
- **Styling**: Tailwind CSS 3.4.17 with glassmorphism effects
- **Charts**: Recharts 3.1.2 for data visualization
- **Icons**: Lucide React
- **Backend**: Next.js API routes (serverless functions)
- **Data**: File system cache with JSON persistence
- **Deployment**: Vercel with Edge Runtime and automatic deployments

## Project Structure
```
src/
├── app/                 # Next.js App Router
│   ├── api/            # API routes (many endpoints for debugging/admin)
│   ├── analytics/      # Analytics page
│   ├── globals.css     # Global styles
│   ├── layout.tsx      # Root layout
│   └── page.tsx        # Homepage/Dashboard
├── components/         # React components and UI library
├── data/              # Static data and cache files
├── hooks/             # Custom React hooks
├── lib/               # Utility libraries (cache manager, utils)
├── scripts/           # Data migration and fix scripts
├── styles/            # Additional styles
└── types/             # TypeScript definitions
```

## Data Source
- **Blockscout API**: Lisk blockchain explorer
- **Contract Address**: `0xf18485f75551FFCa4011C32a0885ea8C22336840`
- **Update Schedule**: Daily at 00:00 UTC via Vercel Cron
- **Cache Strategy**: Optimized for Vercel Free Tier (720 API calls/month limit)