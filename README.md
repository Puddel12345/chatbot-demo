# Chat Webhook Server für Railway

Ein produktionsreifer Webhook-basierter Chat-Server mit Claude Opus 4, Streaming-Unterstützung und Konversationsspeicher.

## Features

- **Claude Opus 4** mit Thinking Mode
- **Echtzeit-Streaming** über Server-Sent Events (SSE)
- **Konversationsspeicher** (persistiert in JSON)
- **Docker-ready** für einfaches Deployment
- **Railway-optimiert**

## Lokales Testen mit Docker

1. **Erstelle eine `.env` Datei:**
```bash
cp .env.example .env
# Füge deinen API-Key in die .env Datei ein
```

2. **Starte mit Docker Compose:**
```bash
docker-compose up --build
```

3. **Teste die API:**
```bash
# Health Check
curl http://localhost:8080/health

# Chat Request (non-streaming)
curl -X POST http://localhost:8080/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hallo, wie geht es dir?"}'

# Streaming Request
curl -X POST http://localhost:8080/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"message": "Erzähle mir eine kurze Geschichte"}'
```

## Deployment auf Railway

1. **Fork oder lade diesen Ordner auf GitHub hoch**

2. **Erstelle ein neues Railway-Projekt:**
   - Gehe zu [railway.app](https://railway.app)
   - Klicke auf "New Project"
   - Wähle "Deploy from GitHub repo"
   - Wähle dieses Repository/Ordner

3. **Setze die Umgebungsvariablen:**
   - Gehe zu "Variables" im Railway Dashboard
   - Füge hinzu: `ANTHROPIC_API_KEY` = `dein-api-key`

4. **Deploy:**
   - Railway deployed automatisch bei jedem Push
   - Die URL findest du unter "Settings" → "Domains"

## API Endpoints

### POST /chat
Standard Chat-Anfrage (wartet auf vollständige Antwort)

**Request:**
```json
{
  "message": "Deine Nachricht",
  "conversation_id": "optional-id",
  "system_prompt": "Optionaler System Prompt"
}
```

### POST /chat/stream
Streaming Chat-Anfrage (SSE)

**Request:** Gleich wie `/chat`

**Response:** Server-Sent Events Stream

### GET /conversation/{id}
Hole Konversationsverlauf

### GET /health
Health Check

## Umgebungsvariablen

- `ANTHROPIC_API_KEY` (erforderlich): Dein Anthropic API Key
- `PORT` (optional): Server Port (Standard: 8080)
- `DATA_DIR` (optional): Verzeichnis für Datenspeicher (Standard: /app/data)

## Volumes

Der Container speichert Konversationen im `/app/data` Verzeichnis. Bei Docker Compose wird dies auf `./data` gemappt.

## Entwicklung

```bash
# Installiere Dependencies
pip install -r requirements.txt

# Starte den Server
python app.py
```