# Dressly — Setup Guide

## Requirements
- Node.js (https://nodejs.org — LTS version)
- Anthropic API key (https://console.anthropic.com) — optional, app works in demo mode without it

---

## Run the app

### 1. Open terminal and go to the project folder
```
cd ~/Desktop/dressly-app
```

### 2. Set your API key (optional — skip for demo mode)
**Mac / Linux:**
```
export ANTHROPIC_API_KEY=sk-ant-YOUR-KEY-HERE
```
**Windows:**
```
set ANTHROPIC_API_KEY=sk-ant-YOUR-KEY-HERE
```

### 3. Start the server
```
node server.js
```

### 4. Open in browser
Go to **http://localhost:3000**

---

## What's in this version
- Login flow with name, email, physical details, and profile photo
- Digital wardrobe with photo upload — images are auto-cropped to 3:4 and normalised
- AI outfit suggestions (real API or demo mode)
- Profile page with avatar, style chips, and AI colour notes based on skin tone

## Notes
- Without an API key the server returns demo outfit suggestions automatically
- All data is stored in your browser's localStorage — nothing is sent to any server except the Anthropic API call
- Press Ctrl+C in terminal to stop the server
