---
allowed-tools: Bash(node:*), Bash(git add:*), Bash(git commit:*), Bash(git push:*), Bash(git status:*), Read, Write, Edit
argument-hint: [last-complete-date]
description: Update LuckySea dashboard with latest blockchain data via Blockscout API
model: claude-sonnet-4-20250514
---

# 🚀 LuckySea Dashboard Update

## Current Status
- **Current cache**: !`tail -10 src/data/contract-cache-v2.json | grep -E '"2025-|totalTransactions'`
- **Blockchain total**: Check live total from Blockscout API
- **Git status**: !`git status --porcelain`
- **Current date UTC**: !`date -u +"%Y-%m-%d %H:%M UTC"`

## Your Task

**📅 Step 1**: Ask user for the last complete date they want to sync FROM
- Format: YYYY-MM-DD (ex: 2025-08-22)
- This will be the starting point to calculate which days need sync

**🎯 Automatic Process**:
1. **Calculate gap**: Between provided date and yesterday (UTC)
2. **Show plan**: Which days will be synced via Blockscout API  
3. **Confirm**: Ask user confirmation before executing
4. **Sequential sync**: Run `quick-sync-day.js` for each missing day
5. **Validate data**: Verify 24h coverage for each day
6. **Update totals**: Fetch REAL blockchain totals via API and update cache
7. **Update daily averages**: Recalculate excluding first launch day
8. **Commit + Push**: Trigger automatic Vercel deploy

**📊 Final Result**:
- ✅ Dashboard shows REAL blockchain totals (165,000+ transactions)
- ✅ Daily average excludes first launch day (accurate calculation)
- ✅ Advanced analytics updated (timeline, peak hours, status)
- ✅ Automatic Vercel deploy triggered
- ✅ All data 100% synced with blockchain via API

**🔧 Available Commands**:
- `node quick-sync-day.js YYYY-MM-DD` - Sync specific day
- Fetch real blockchain totals via Blockscout API
- Update cache with accurate total transactions count
- Recalculate daily averages (total / (days - 1))
- `git add src/data/contract-cache-v2.json` - Stage cache changes
- `git commit -m "message"` - Commit with descriptive message
- `git push origin main` - Trigger automatic deploy

**💡 Execution Example**:
```
User provides: 2025-08-22
System calculates: gap until 2025-08-24 (2 days missing)
Shows: "Will sync: 2025-08-23, 2025-08-24"
User confirms: y
Executes: 
  1. Sync each day via quick-sync-day.js
  2. Fetch real blockchain totals (165,000+ txs)
  3. Update daily average calculation
  4. Commit + push
Result: Dashboard + analytics automatically updated
```

**⚠️ Important**:
- Always validate user's date format
- Verify each sync collected complete 24h data
- Fetch REAL blockchain totals after sync (not just cache sum)
- Update daily average = total / (active_days - 1) to exclude launch day
- Make single commit with all synced days + updated totals
- Confirm push triggers Vercel deploy

**🔗 CRITICAL**: After syncing days, ALWAYS:
1. Fetch real total from: `https://blockscout.lisk.com/api/v2/addresses/0xf18485f75551FFCa4011C32a0885ea8C22336840/counters`
2. Update `totalTransactions` field in cache with blockchain reality
3. This ensures dashboard shows accurate blockchain totals, not just our limited cache data