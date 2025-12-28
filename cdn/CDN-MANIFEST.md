# CDN Image Manifest - Masia Can Pares

## Folder Structure

```
cdn/
├── logos/
│   └── canpares-logo.png          # Main logo (white version)
├── icons/
│   └── favicon.png                 # Site favicon
├── images/
│   ├── hero/
│   │   ├── hero-1.jpg             # Main slideshow images
│   │   ├── hero-2.jpg
│   │   ├── hero-3.jpg
│   │   └── hero-4.jpg
│   ├── houses/
│   │   ├── casa-blanca/
│   │   │   ├── exterior.jpg
│   │   │   ├── living.jpg
│   │   │   ├── bedroom-1.jpg
│   │   │   ├── bedroom-2.jpg
│   │   │   ├── kitchen.jpg
│   │   │   └── terrace.jpg
│   │   └── casa-mediterranea/
│   │       ├── exterior.jpg
│   │       ├── living.jpg
│   │       ├── bedroom-1.jpg
│   │       ├── bedroom-2.jpg
│   │       ├── kitchen.jpg
│   │       └── terrace.jpg
│   ├── experiences/
│   │   ├── wine-cava.jpg
│   │   ├── sailing.jpg
│   │   ├── hiking.jpg
│   │   ├── cooking.jpg
│   │   ├── montserrat.jpg
│   │   └── padel.jpg
│   ├── gallery/
│   │   ├── pool.jpg
│   │   ├── garden-1.jpg
│   │   ├── garden-2.jpg
│   │   └── ...
│   ├── team/
│   │   └── martin.jpg
│   └── location/
│       ├── sitges.jpg
│       ├── barcelona.jpg
│       └── penedes.jpg
```

---

## Current Image Sources

### LOGOS (Squarespace)
| File | Current URL | New Path |
|------|-------------|----------|
| Logo White | `https://images.squarespace-cdn.com/.../CanPares_2-01.png` | `cdn/logos/canpares-logo.png` |

### HERO IMAGES (Squarespace)
| File | Current URL | New Path |
|------|-------------|----------|
| Hero 1 | `https://images.squarespace-cdn.com/.../Can+Pares-2699.jpg` | `cdn/images/hero/hero-1.jpg` |
| Hero 2 | `https://images.squarespace-cdn.com/.../Can+Pares-2820.jpg` | `cdn/images/hero/hero-2.jpg` |
| Hero 3 | `https://images.squarespace-cdn.com/.../Can+Pares-2822.jpg` | `cdn/images/hero/hero-3.jpg` |
| Hero 4 | `https://images.squarespace-cdn.com/.../Can+Pares-2842.jpg` | `cdn/images/hero/hero-4.jpg` |

### HOUSES (Squarespace)
| File | Current URL | New Path |
|------|-------------|----------|
| Casa Blanca Exterior | `https://images.squarespace-cdn.com/.../Masia+Can+Pares_Principal` | `cdn/images/houses/casa-blanca/exterior.jpg` |
| Casa Mediterranea Exterior | `https://images.squarespace-cdn.com/.../MasiaCanPares_guesthouse` | `cdn/images/houses/casa-mediterranea/exterior.jpg` |
| Pool | `https://images.squarespace-cdn.com/.../MasiaCanPares_pool2.jpg` | `cdn/images/gallery/pool.jpg` |

### EXPERIENCES (Unsplash - Free to use)
| Experience | Current URL | New Path |
|------------|-------------|----------|
| Wine & Cava | `photo-1506377247377-2a5b3b417ebb` | `cdn/images/experiences/wine-cava.jpg` |
| Sailing | `photo-1500514966906-fe245eea9344` | `cdn/images/experiences/sailing.jpg` |
| Hiking | `photo-1596402184320-417e7178b2cd` | `cdn/images/experiences/hiking.jpg` |
| Cooking | `photo-1556910103-1c02745aae4d` | `cdn/images/experiences/cooking.jpg` |
| Montserrat | `photo-1583422409516-2895a77efded` | `cdn/images/experiences/montserrat.jpg` |

### LOCATION (Unsplash)
| Location | Current URL | New Path |
|----------|-------------|----------|
| Sitges | `photo-1583422409516-2895a77efded` | `cdn/images/location/sitges.jpg` |
| Penedès | `photo-1558618666-fcd25c85cd64` | `cdn/images/location/penedes.jpg` |
| Barcelona | `photo-1583422409516-2895a77efded` | `cdn/images/location/barcelona.jpg` |

---

## How to Migrate

### Option 1: Download from Squarespace/Unsplash
1. Download each image from the URLs listed above
2. Rename and place in the appropriate folder
3. Update all HTML files to use the new paths

### Option 2: Use a CDN Service
1. Upload all images to a CDN (Cloudflare, AWS S3, etc.)
2. Update all HTML files with the new CDN URLs

### Option 3: GitHub Pages (Current Setup)
Keep images in `cp/cdn/` folder and reference as:
```html
<img src="cdn/images/hero/hero-1.jpg" alt="...">
```

---

## Recommended Image Sizes

| Type | Dimensions | Format |
|------|------------|--------|
| Hero | 1920x1080 | JPG (80% quality) |
| House Cards | 800x600 | JPG (80% quality) |
| Experience Cards | 800x600 | JPG (80% quality) |
| Gallery | 1200x800 | JPG (80% quality) |
| Thumbnails | 400x300 | JPG (70% quality) |
| Logo | 500x auto | PNG (transparent) |
| Favicon | 32x32, 192x192 | PNG |
