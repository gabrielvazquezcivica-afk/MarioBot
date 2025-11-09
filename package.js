{
  "name": "chappie-bot",
  "version": "1.0.0",
  "description": "Bot de WhatsApp estilo GataBot / ItachiBot, modular con comandos y plugins",
  "main": "main.js",
  "scripts": {
    "start": "node main.js qr",
    "start:codebot": "node main.js codebot",
    "dev": "nodemon main.js qr"
  },
  "keywords": [
    "whatsapp",
    "bot",
    "baileys",
    "commands",
    "plugins",
    "chappie"
  ],
  "author": "Zaid Castañeda",
  "license": "MIT",
  "dependencies": {
    "@adiwajshing/baileys": "^4.6.0",
    "chalk": "^5.3.0",
    "figlet": "^1.5.2",
    "pino": "^8.12.0",
    "qrcode-terminal": "^0.12.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.3"
  }
  }
