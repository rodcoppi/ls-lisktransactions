# 🎲 LuckySea Lisk Analytics Dashboard

[![Next.js](https://img.shields.io/badge/Next.js-14.0.4-black.svg)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3.3-blue.svg)](https://typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4.17-38B2AC.svg)](https://tailwindcss.com/)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-black.svg)](https://vercel.com/)

A beautiful, real-time analytics dashboard for Lisk blockchain transactions, featuring the signature LuckySea design system with glassmorphism effects and smooth animations.

## ✨ Features

- **🎨 LuckySea Design System** - Premium glassmorphism effects with signature color palette (#05202E, #041924, #02FFD2)
- **⚡ Real-time Analytics** - Live transaction monitoring with smart polling
- **🕒 UTC Timezone Support** - Consistent timezone handling across all data
- **📊 Interactive Charts** - Beautiful Recharts visualizations with animations
- **💾 Pre-populated Cache** - 24,955+ historical transactions included
- **🚀 Vercel Optimized** - Efficient caching strategy for Free Tier limits
- **📱 Responsive Design** - Perfect on desktop, tablet, and mobile
- **🔄 Auto-refresh** - Smart updates every hour with exponential backoff

## 🎯 Live Demo

🔗 **[View Live Dashboard](https://ls-lisktransactions.vercel.app/)**

## 🏗️ Quick Start

### Prerequisites

- Node.js 18.0.0 or higher
- npm 9.0.0 or higher

### Installation

```bash
# Clone the repository
git clone https://github.com/rodcoppi/ls-lisktransactions.git
cd ls-lisktransactions

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

## 🎨 Design System

### Color Palette
- **Primary Dark**: `#05202E` - Main background and containers
- **Secondary Dark**: `#041924` - Cards and secondary elements  
- **Accent Cyan**: `#02FFD2` - Highlights, borders, and CTAs
- **Status Green**: `#10B981` - Success states and online indicators

### Typography
- **Font Family**: Inter (fallback: system fonts)
- **Headings**: Bold weights with proper contrast
- **Body**: Regular weight optimized for readability

### Effects
- **Glassmorphism**: `backdrop-blur-md` with semi-transparent backgrounds
- **Animations**: Smooth transitions and hover effects
- **Gradients**: Subtle overlays and accent highlights

## 📊 Data Analytics

### Metrics Displayed
- **Total Transactions** - All-time contract interactions
- **Today's Activity** - Current day transactions (UTC)
- **Weekly Trends** - 7-day transaction patterns  
- **Monthly Overview** - 30-day aggregated data
- **Hourly Breakdown** - Real-time hourly distribution
- **Average Daily** - Smart calculation excluding incomplete days

### Data Sources
- **Blockscout API** - Lisk blockchain explorer
- **Contract Address**: `0xf18485f75551FFCa4011C32a0885ea8C22336840`
- **Update Schedule**: Daily at 00:00 UTC via Vercel Cron
- **Cache Strategy**: Optimized for Vercel Free Tier

## 🔧 Technical Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Recharts** - Chart visualization library
- **Lucide React** - Icon system

### Backend
- **API Routes** - Next.js serverless functions
- **File System Cache** - JSON-based data persistence
- **Smart Polling** - Exponential backoff strategy

### Deployment
- **Vercel** - Serverless deployment platform
- **Edge Runtime** - Global CDN distribution
- **Automatic Deployments** - Git-based CI/CD

## ⚙️ Configuration

### Environment Variables
```bash
# Optional: Add to .env.local for custom configuration
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

### Cache Settings
- **Update Interval**: 1 hour (Vercel Free Tier optimized)
- **Retention**: Daily totals (historical) + Hourly data (recent 48h)
- **Location**: `/tmp/contract-cache.json` (production) or `src/data/contract-cache.json` (development)

## 📱 Responsive Breakpoints

```css
sm: 640px   /* Mobile landscape */
md: 768px   /* Tablet portrait */  
lg: 1024px  /* Desktop */
xl: 1280px  /* Large desktop */
```

## 🚀 Deployment

### Vercel (Recommended)

1. **Connect Repository**
   ```bash
   # Push to GitHub
   git push origin main
   ```

2. **Deploy on Vercel**
   - Import project from GitHub
   - Configure build settings (auto-detected)
   - Deploy with one click

3. **Custom Domain** (Optional)
   - Add custom domain in Vercel dashboard
   - Configure DNS settings

### Manual Deployment

```bash
# Build for production
npm run build

# Start production server
npm start
```

## 🕒 Automated Updates

### Daily Cron Job
- **Schedule**: Every day at 00:00 UTC
- **Endpoint**: `/api/cron/update-cache`
- **Function**: Fetches new transactions since last update
- **Vercel Compatibility**: Uses Free Tier daily cron allowance

### How It Works
1. **Incremental Updates**: Only fetches transactions newer than `lastBlockNumber`
2. **Smart Caching**: Rotates old hourly data to daily totals
3. **UTC Consistency**: All timestamps normalized to UTC
4. **Error Handling**: Graceful fallback if API fails

### Manual Update (Optional)
```bash
# Force cache update via API
curl https://your-app.vercel.app/api/cron/update-cache
```

## 🛠️ Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production  
npm run start        # Start production server
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
npm run type-check   # TypeScript type checking
npm run format       # Format code with Prettier
```

### Project Structure

```
src/
├── app/                 # Next.js App Router
│   ├── api/            # API routes
│   │   └── contract-data/ # Main data endpoint
│   ├── globals.css     # Global styles
│   ├── layout.tsx      # Root layout
│   └── page.tsx        # Homepage/Dashboard
├── components/         # React components
│   ├── providers/      # Context providers
│   └── ui/            # UI components
├── data/              # Static data and cache
│   └── contract-cache.json # Pre-populated transactions
├── lib/               # Utility libraries
│   ├── cache-manager.ts # Smart caching system
│   └── utils.ts       # Helper functions
└── types/             # TypeScript definitions
```

## 🎯 Performance Optimizations

### Caching Strategy
- **Pre-populated Cache**: 24,955 transactions included in repository
- **Incremental Updates**: Only fetch new transactions during updates  
- **Smart Rotation**: Hourly data rotated to daily totals automatically
- **Vercel Optimized**: 720 API calls/month (well under 1,000 limit)

### Loading Performance
- **Smart Polling**: Exponential backoff (10s → 30s intervals)
- **Progress Indicators**: Visual feedback during initial cache loading
- **Error Handling**: Graceful degradation for API failures
- **UTC Consistency**: Eliminates timezone-related data inconsistencies

## 📈 Analytics Features

### Time-based Analysis
- **UTC Standardization** - All timestamps converted to UTC for consistency
- **Complete Days Only** - Averages calculated excluding incomplete days
- **Smart Filtering** - Deployment day excluded from statistics
- **Real-time Updates** - Live data refresh with visual indicators

### Visual Components
- **Transaction Timeline** - Hourly breakdown with smooth animations
- **Trend Indicators** - Growth/decline arrows with percentages
- **Status Indicators** - Online status with pulsing animation
- **Responsive Charts** - Mobile-optimized visualizations

## 🛡️ Best Practices

### Code Quality
- TypeScript strict mode enabled
- ESLint with Next.js recommended rules
- Prettier for consistent formatting
- Responsive design patterns

### Performance
- Image optimization with Next.js
- Lazy loading for non-critical components  
- Efficient re-renders with React best practices
- Optimized bundle size

### Security
- API rate limiting considerations
- Input validation and sanitization
- Secure environment variable handling
- HTTPS enforcement in production

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is private and proprietary to LuckySea.

## 🎲 About LuckySea

LuckySea is a premium blockchain gaming platform featuring provably fair systems and real-time analytics. This dashboard showcases our signature design system and technical expertise in blockchain data visualization.

---

**Built with ❤️ by the LuckySea Team**

🔗 [Live Dashboard](https://ls-lisktransactions.vercel.app/) • 🎲 [LuckySea Platform](https://luckysea.gg/) • 📊 [Analytics](https://ls-lisktransactions.vercel.app/)