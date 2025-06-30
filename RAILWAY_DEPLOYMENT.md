# Railway Deployment Guide

## 1. Vorbereitung (Local)

### Railway CLI installieren (Windows)
```powershell
# In PowerShell als Administrator:
scoop install railway

# Oder mit npm:
npm install -g @railway/cli
```

### Railway CLI installieren (Mac/Linux)
```bash
curl -fsSL https://railway.com/install.sh | sh
```

## 2. Projekt vorbereiten

```bash
# In den Projektordner wechseln
cd /mnt/c/dev/InfluencerApp/AI-Module/chat-webhook-server

# Bei Railway einloggen
railway login

# Mit deinem Projekt verknüpfen
railway link -p 8e7259b3-23c3-4995-8a94-dae3253f6a27
```

## 3. Umgebungsvariablen setzen

### Option A: Über Railway CLI (Empfohlen)
```bash
# API Key setzen
railway variables set ANTHROPIC_API_KEY="dein-api-key-hier"

# Port setzen (optional, Railway setzt automatisch)
railway variables set PORT=8080
```

### Option B: Über Railway Dashboard
1. Gehe zu https://railway.app/dashboard
2. Wähle dein Projekt
3. Klicke auf "Variables" Tab
4. Füge hinzu:
   - `ANTHROPIC_API_KEY` = `dein-api-key`
   - `PORT` = `8080` (optional)

## 4. Deployment

### Automatisches Deployment (Git-basiert)
```bash
# Initialisiere Git wenn noch nicht vorhanden
git init

# Füge alle Dateien hinzu
git add .

# Committe die Änderungen
git commit -m "Initial chat webhook server"

# Deploy zu Railway
railway up
```

### Manuelles Deployment (ohne Git)
```bash
# Direkt von lokalem Ordner deployen
railway up --detach
```

## 5. Nach dem Deployment

### Service URL abrufen
```bash
# Domain/URL anzeigen
railway domain
```

Oder im Dashboard unter "Settings" → "Domains" → Generate Domain

### Logs anzeigen
```bash
# Live logs
railway logs

# Letzte 100 Zeilen
railway logs -n 100
```

### Status prüfen
```bash
# Deployment Status
railway status

# Variablen anzeigen
railway variables
```

## 6. Testen

Nach dem Deployment teste deine API:

```bash
# Health Check (ersetze YOUR_DOMAIN mit deiner Railway Domain)
curl https://YOUR_DOMAIN.railway.app/health

# Chat Test
curl -X POST https://YOUR_DOMAIN.railway.app/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hallo Jo!"}'
```

## 7. Updates deployen

Bei Änderungen:
```bash
# Änderungen committen
git add .
git commit -m "Update XYZ"

# Erneut deployen
railway up
```

## Wichtige Hinweise

1. **API Key Sicherheit**: 
   - Niemals den API Key im Code oder Git committen
   - Immer über Umgebungsvariablen setzen

2. **Persistenz**:
   - Railway Container sind ephemeral
   - Für dauerhafte Speicherung: Railway Volumes oder externe DB nutzen

3. **Kosten**:
   - Railway bietet $5 kostenloses Guthaben pro Monat
   - Danach usage-based Pricing

4. **Custom Domain**:
   - Kann über Dashboard → Settings → Domains konfiguriert werden

## Troubleshooting

### "No Dockerfile found"
- Stelle sicher, dass die `Dockerfile` im Root-Verzeichnis ist
- Oder nutze `railway.json` zur Konfiguration

### "Build failed"
- Prüfe die Logs: `railway logs`
- Stelle sicher, dass alle Dependencies in requirements.txt sind

### "API Key not found"
- Prüfe Umgebungsvariablen: `railway variables`
- Setze erneut: `railway variables set ANTHROPIC_API_KEY="..."`