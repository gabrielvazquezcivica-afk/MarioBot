/**
 * config.js — Configuración principal del bot WhatsApp
 * ---------------------------------------------------
 * Aquí defines:
 *   - Datos del owner (nombre, número)
 *   - Prefijos, nombre del bot
 *   - URLs de APIs externas
 *   - Claves de APIs (API keys)
 *
 * Puedes usar variables de entorno si prefieres mantener tus claves privadas
 * (ejemplo: process.env.API_KEY)
 */

const fs = require('fs');
const chalk = require('chalk');

// ===============================
// ⚙️ CONFIGURACIÓN GENERAL
// ===============================
global.botname = "CHAPPIE BOT";
global.ownername = "Zaid Castañeda";
global.ownerNumber = "5215512345678"; // sin +, con código de país (ejemplo México 52)
global.prefix = ['!', '.', '/', '#']; // prefijos válidos
global.language = 'es'; // idioma del bot
global.version = '1.0.0';

// ===============================
// 🌐 CONFIGURACIÓN DE APIS
// ===============================
global.APIs = {
  // Ejemplo: API gratuita de stickers, imágenes, IA, etc.
  zenz: 'https://api.zenzapis.xyz',
  lolhuman: 'https://api.lolhuman.xyz',
  xyro: 'https://api.xyro.fun',
  openai: 'https://api.openai.com/v1',
  custom: 'https://api.tuapi.com', // puedes agregar la tuya
};

global.APIKeys = {
  'https://api.zenzapis.xyz': 'apikey-zenz',
  'https://api.lolhuman.xyz': 'apikey-lol',
  'https://api.xyro.fun': 'apikey-xyro',
  'https://api.openai.com/v1': process.env.OPENAI_KEY || 'tu-api-key-openai',
  'https://api.tuapi.com': 'tu-clave-custom',
};

// ===============================
// 💬 MENSAJES POR DEFECTO
// ===============================
global.mess = {
  success: '✅ Hecho!',
  admin: '👑 Solo los admins pueden usar este comando.',
  botAdmin: '⚠️ Necesito ser admin para hacerlo.',
  owner: '🔐 Solo el owner puede usar este comando.',
  group: '👥 Este comando solo funciona en grupos.',
  private: '💬 Este comando solo funciona en privado.',
  wait: '⏳ Procesando...',
  error: '❌ Ocurrió un error, intenta más tarde.',
  limit: '⚠️ Tu límite diario ha terminado, espera el reinicio.',
};

// ===============================
// 💾 CONFIGURACIONES EXTRA
// ===============================
global.limitDefault = {
  premium: 'ilimitado',
  free: 25,
};

global.thumb = fs.existsSync('./media/logo.jpg')
  ? fs.readFileSync('./media/logo.jpg')
  : null;

global.sessionName = 'chappie-session';

// ===============================
// 🚀 AUTO RELOAD AL CAMBIAR CONFIG
// ===============================
let file = require.resolve(__filename);
fs.watchFile(file, () => {
  fs.unwatchFile(file);
  console.log(chalk.greenBright(`\n✅ Se actualizó 'config.js' automáticamente.\n`));
  delete require.cache[file];
  require(file);
});
