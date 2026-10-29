# הפעלה ופריסה

## מקומי

דרישה: Node.js 22+. מתוך `site/`:

```bash
npm run dev
```

ברירת המחדל: port 4173. אפשר `npm run dev -- --host 0.0.0.0 --port 3000`. אין תלות ב-npm install.

## בנייה ובדיקה

```bash
npm run build
npm test
```

## פריסה סטטית

להגדיר `siteUrl` ופרטי קשר, להריץ build ולהעלות את תוכן dist. ל-Vercel קיים vercel.json: root directory = site, build command = npm run build, output = dist. יש לשמור contactMode=whatsapp. שרת ה-Node אינו חלק מהפריסה הסטטית הזו.

אפשר לפרוס dist גם ב-Nginx/Caddy/Cloudflare Pages או אחסון סטטי אחר. להגדיר 404 אמיתי, HTTPS ודומיין. אם משתמשים ב-SPA fallback גורף, מתקנים אותו כדי לא להחזיר את הבית לכל URL חסר.

## VPS / Docker עם שרת

```bash
docker build -t systm-site .
docker run --rm -p 3000:3000 systm-site
```

הפקודות מתוך site. מקימים reverse proxy עם HTTPS מול port 3000. סודות webhook מוזרקים בסביבת ההרצה; לא מוסיפים אותם ל-Dockerfile או לקבצים ציבוריים. `server.mjs` תומך ב-GET/HEAD וב-endpoint פניות. לעומס גבוה מוסיפים CDN ו-rate limit משותף.

## בדיקת דומיין

לבדוק canonical, robots, sitemap, סטטוס 404, גופנים, תמונות וקישורי WhatsApp. להגדיר אימייל וסושיאל רק לאחר קבלת כתובות אמיתיות. קובץ .env אינו נטען אוטומטית על ידי השרת; להזריק environment variables דרך ספק האחסון או להשתמש ב-Node עם `--env-file=.env`.
