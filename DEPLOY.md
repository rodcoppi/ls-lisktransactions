# 🚀 LuckySea Dashboard - Deploy Guide

## ✅ System Overview

This dashboard shows temporal transaction analysis for the LuckySea contract
(`0xf18485f75551FFCa4011C32a0885ea8C22336840`) with:

- **Smart Caching**: Historical data stored compactly (~15KB total)
- **Auto-Updates**: Hourly background updates via Vercel Cron
- **Optimized Performance**: Instant loading after first cache
- **Cost**: 100% FREE on Vercel

## 🏗️ Architecture

- **Frontend**: Next.js 14 with App Router
- **Cache**: Filesystem-based optimized storage
- **Updates**: Vercel Cron (every hour)
- **API**: Blockscout Lisk integration

## 📋 Prerequisites

- GitHub account
- Vercel account (free)
- This repository pushed to GitHub

## 🚀 Step-by-Step Deploy

### 1. Create Vercel Account

1. Go to [vercel.com](https://vercel.com)
2. Click "Sign Up"
3. Choose "Continue with GitHub"
4. Authorize Vercel to access your GitHub

### 2. Deploy Project

1. In Vercel Dashboard, click "New Project"
2. Import your GitHub repository
3. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

### 3. Environment Variables (Optional)

In Vercel project settings > Environment Variables:

```bash
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
CRON_SECRET=your-random-secret-here
```

To generate CRON_SECRET:

```bash
openssl rand -base64 32
```

### 4. Deploy!

1. Click "Deploy"
2. Wait 2-3 minutes for build
3. Get your live URL: `https://your-app.vercel.app`

## 🔄 How It Works

### First Visit (Cold Start)

- Takes 20-30s to fetch all historical transactions
- Creates optimized cache file (~15KB)
- Shows progress in server logs

### All Future Visits

- Instant load (<500ms)
- Data served from cache
- Auto-updates every hour via cron

### Cache Structure

```typescript
{
  dailyTotals: { "2025-08-01": 5420, "2025-08-02": 6180 },    // Historical (compact)
  monthlyTotals: { "2025-08": 18632 },                        // Monthly aggregates
  recentHourly: {                                              // Detailed (last 2 days only)
    "2025-08-07": [89, 134, 203, ...24 numbers]
  },
  totalTransactions: 18632,
  lastUpdate: "2025-08-07T15:30:00Z"
}
```

## 🔧 Monitoring

### Check Cron Jobs

- Vercel Dashboard > Functions > Cron
- View execution logs and status

### Manual Update

- Visit: `https://your-app.vercel.app/api/cron/update-cache`
- Or use Vercel CLI: `vercel logs --follow`

### Performance

- First load: ~20-30s (one time only)
- Regular loads: <500ms always
- Storage: ~15KB (scales linearly)

## 🌍 Custom Domain (Optional)

1. Vercel Dashboard > Domains
2. Add your domain: `dashboard.yourdomain.com`
3. Update DNS records as instructed
4. SSL certificate auto-generated

## 🛠️ Troubleshooting

### Build Fails

```bash
# Local test
npm run build
npm start
```

### Cache Issues

- Check `/api/contract-data` endpoint
- Look at Vercel function logs
- Verify Blockscout API connectivity

### Cron Not Working

- Verify `vercel.json` cron configuration
- Check Environment Variables
- Review function execution logs

## 📊 Expected Performance

- **Storage**: ~15KB cache + 2MB build = 2.015MB total
- **Bandwidth**: ~500MB/month for 1k visits (of 100GB limit)
- **Functions**: ~720s/month compute (minimal)
- **Cost**: $0/month (well within free limits)

## 🎯 Success Metrics

- ✅ Dashboard loads in <1s after first visit
- ✅ Shows 18,632+ total transactions
- ✅ Hourly data for today
- ✅ Daily breakdown for last 7 days
- ✅ Monthly breakdown by month
- ✅ Auto-updates every hour
- ✅ "Last updated: Xh ago" shown

---

**🎉 Your LuckySea dashboard is now live and auto-updating!**
