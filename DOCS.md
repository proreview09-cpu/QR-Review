# QR Google Review - Documentation

## Overview

QR Google Review helps businesses collect Google reviews easily. Customers scan a QR code, pick an AI-generated review, copy it, and paste it on Google. No more asking customers to write reviews from scratch!

---

## Admin Guide

### Login
- URL: `https://your-app.railway.app/login`
- Email: `pro.review09@gmail.com` (or your admin email)
- Password: Your admin password

### Dashboard
Shows overview of:
- Total Shops, Active Shops, Shop Owners
- Reviews Copied (customer activity)
- ChatGPT Usage: API Calls, Tokens Used, Reviews Generated
- Recent Shops list

### Settings
Configure global defaults:
| Field | Description |
|-------|-------------|
| OpenAI API Key | Your ChatGPT API key from platform.openai.com |
| Default Review Tone | Tone applied to new shops (Professional/Friendly/Casual/etc) |
| Default Review Language | English / Gujarati / Hindi |

### Managing Shops

#### Add New Shop
`Admin → Shops → Add Shop`

**Owner Details:**
| Field | Description |
|-------|-------------|
| Owner Name | Shop owner's full name |
| Owner Email | Login email for shop owner |
| Password | Login password (leave empty for default) |

**Business Details:**
| Field | Description |
|-------|-------------|
| Business Name | Full business name as on Google |
| Shop Display Name | Short name shown to customers |
| Phone | Contact number |
| Address | Full address |
| Google Review URL | From Google Business Profile → Ask for Reviews → Copy link |

**Review Settings:**
| Field | Description |
|-------|-------------|
| Review Tone | AI review style (Professional/Friendly/Casual/Enthusiastic/Grateful/Humorous) |
| Review Language | English / Gujarati / Hindi |
| Allow owner to change tone | If checked, shop owner can modify tone & language |
| Pool Size (Queue) | Minimum reviews always available (default: 50) |
| Generate Batch | Reviews generated at once (default: 50) |

#### View Shop Details
`Admin → Shops → Click shop name`

Shows:
- **Stats:** Total / Available / Copied / Posted reviews
- **ChatGPT Usage:** API Calls & Tokens used for this shop
- **QR Code:** Display & download
- **Review Link:** Copy & share with customers
- **Review Activity:** Which reviews were copied, when, from which device, posted or pending
- **Edit Fields:** All business & review settings editable

### Activity Logs
`Admin → Logs`

Tracks everything:
| Action | What it tracks |
|--------|---------------|
| CREATE | Shop/owner created |
| UPDATE | Shop updated |
| DELETE | Shop deleted |
| LOGIN | Who logged in, IP address |
| ERROR | Login failures, API failures |
| COPY | Customer copied a review |
| POSTED | Review posted on Google |
| SETTINGS | Settings changed |

Filter by action type. Paginated (25 per page).

---

## Shop Owner Guide

### Login
- Use the email & password admin created for you
- URL: `https://your-app.railway.app/login`

### Dashboard
Shows:
- **Total Reviews Copied** by customers (live counter)
- **Shop Details:** Business name, address, phone, tone, language

If admin allowed, you can:
- Change **Review Tone** & **Language**
- Note: Changing these regenerates ALL reviews

### Getting Your QR Code & Link
Contact your admin. They have:
- **QR Code image** - print and display at your counter
- **Review Link** - share directly via WhatsApp/SMS

---

## Customer Flow

### How It Works

1. **Customer visits your shop**
2. **You show them the QR code** (printed at counter/desk)
3. **Customer scans QR** with phone camera → opens review page
4. **50 AI-generated reviews appear** in your selected language & tone
5. **Customer taps "Copy Review"** → review copied to clipboard
6. **Google review page opens automatically** in a new tab
7. **Customer pastes the review** on Google and submits
8. **Customer taps "I Posted It!"** on the review page to confirm

### Important
- Reviews are short (~50 words, 3 lines)
- Each review includes your business name
- Reviews never repeat - once copied, removed permanently
- New reviews auto-generate to maintain the pool
- Human-like, natural tone - not robotic

---

## Technical Details

### Architecture
- **Backend:** Node.js + Express + MongoDB (Atlas)
- **Frontend:** React + Vite + Tailwind CSS
- **Hosting:** Railway (free tier)
- **Database:** MongoDB Atlas (free M0 cluster)
- **AI:** OpenAI GPT-4o-mini

### Environment Variables (Railway)
| Variable | Description |
|----------|-------------|
| MONGO_URI | MongoDB Atlas connection string |
| JWT_SECRET | Secret key for authentication |
| NODE_ENV | Set to "production" |
| FRONTEND_URL | Your Railway app URL |

### OpenAI API Key
Set via Admin Panel → Settings (not in environment variables).
Stored encrypted in database.

### Security
- JWT authentication with role-based access
- Passwords hashed with bcrypt (12 rounds)
- All API requests logged with IP & user agent

---

## FAQ

**Q: Reviews not generating?**
A: Check OpenAI API key in Settings. Also check credits at platform.openai.com/billing.

**Q: QR code shows wrong URL?**
A: Contact admin to update FRONTEND_URL in Railway variables, then regenerate QR.

**Q: Customer can't copy on iPhone?**
A: Fixed! Fallback copy method works on all devices including HTTP.

**Q: How do I add ChatGPT credits?**
A: Go to platform.openai.com → Settings → Billing → Add credits.

**Q: Can I change the review tone later?**
A: Yes! Admin can change it per shop. Reviews will regenerate with new tone.

---

## Support
For issues, contact your system administrator.
