# Masia Can Pares - Website

## 📁 Structure

```
cp/
├── index.html                  # Homepage (EN)
├── index-es.html               # Homepage (ES)  
├── index-fr.html               # Homepage (FR)
├── manifest.json               # PWA manifest
├── sw.js                       # Service worker
├── firebase.json
│
├── [content pages].html        # All content pages
├── login.html                  # Login
├── admin-dashboard.html        # Admin
├── member-dashboard.html       # Guest portal
├── staff-cleaning.html         # Cleaning portal
│
├── cdn/                        # All static assets
│   ├── fonts/
│   │   └── BoogyBrutPoster-White.otf
│   ├── icons/
│   │   └── icon.svg            # Favicon/app icon
│   ├── logos/
│   │   └── icon.svg            # Brand logo
│   └── images/
│       ├── hero/               # Homepage slideshow
│       ├── houses/             # Property photos
│       ├── experiences/        # Activity photos
│       ├── gallery/            # General gallery
│       ├── team/               # Team photos
│       └── location/           # Location photos
│
└── functions/                  # Firebase Functions
    ├── index.js
    └── package.json
```

## 🌐 URLs

| Page | URL |
|------|-----|
| Homepage | `/cp/` |
| Admin Login | `/cp/login.html?admin=true` |
| Member Login | `/cp/login.html` |
| Admin Dashboard | `/cp/admin-dashboard.html` |

## 🔥 Firebase

Project: `masia-can-pares`

### Deploy Functions
```bash
cd functions
npm install
firebase deploy --only functions
```

## 🏨 Integrations

- **Beds24** - Booking (IDs: 306071, 306072)
- **Resend** - Email notifications
- **Firebase** - Auth, Firestore, Functions
