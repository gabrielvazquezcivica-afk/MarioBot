/**
 * main.js — Núcleo modular CHAPPIE BOT
 * -------------------------------------
 * Estructura pro con sistema de comandos y plugins dinámicos
 * by Zaid Castañeda + GPT 💀
 */

const {
  default: makeWASocket,
  useSingleFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require('@adiwajshing/baileys');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const figlet = require('figlet');
const qrcode = require('qrcode-terminal');
const pino = require('pino');

// Cargar configuración global
require('./config');

const AUTH_FILE = './auth_info.json';
const COMMANDS_DIR = path.join(__dirname, 'commands');
const PLUGINS_DIR = path.join(__dirname, 'plugins');

// ===============================
// 💫 Banner inicial
// ===============================
function showBanner() {
  const banner = figlet.textSync(global.botname || 'CHAPPIE BOT', { font: 'Standard' });
  const colors = [chalk.rgb(0, 255, 200), chalk.rgb(255, 100, 180), chalk.rgb(255, 255, 0)];
  const lines = banner.split('\n').map((l, i) => colors[i % colors.length](l));
  console.log('\n' + lines.join('\n'));
  console.log(chalk.gray(`Versión: ${global.version} | Propietario: ${global.ownername}`));
  console.log(chalk.gray('───────────────────────────────────────────\n'));
}

// ===============================
// ⚙️ Cargar comandos dinámicamente
// ===============================
const commands = new Map();

function loadCommands() {
  if (!fs.existsSync(COMMANDS_DIR)) {
    fs.mkdirSync(COMMANDS_DIR, { recursive: true });
  }

  const files = fs.readdirSync(COMMANDS_DIR).filter(f => f.endsWith('.js'));
  commands.clear();

  for (const file of files) {
    try {
      delete require.cache[require.resolve(path.join(COMMANDS_DIR, file))];
      const cmd = require(path.join(COMMANDS_DIR, file));
      if (cmd.name) {
        commands.set(cmd.name, cmd);
        console.log(chalk.green(`🧩 Comando cargado: ${cmd.name}`));
      }
    } catch (e) {
      console.log(chalk.red(`❌ Error cargando ${file}: ${e.message}`));
    }
  }

  console.log(chalk.blueBright(`Total comandos cargados: ${commands.size}`));
}

// 🔁 Recargar comandos automáticamente
function watchCommands() {
  fs.watch(COMMANDS_DIR, (event, filename) => {
    if (filename.endsWith('.js')) {
      console.log(chalk.cyanBright(`🔄 Recargando comando: ${filename}`));
      loadCommands();
    }
  });
}

// ===============================
// ⚡ Cargar plugins adicionales
// ===============================
function loadPlugins(sock) {
  if (!fs.existsSync(PLUGINS_DIR)) fs.mkdirSync(PLUGINS_DIR, { recursive: true });
  const files = fs.readdirSync(PLUGINS_DIR).filter(f => f.endsWith('.js'));
  for (const file of files) {
    try {
      delete require.cache[require.resolve(path.join(PLUGINS_DIR, file))];
      const plugin = require(path.join(PLUGINS_DIR, file));
      if (typeof plugin === 'function') plugin(sock);
      console.log(chalk.magenta(`✨ Plugin cargado: ${file}`));
    } catch (e) {
      console.log(chalk.red(`Error en plugin ${file}: ${e.message}`));
    }
  }
}

// ===============================
// 🚀 Inicio del bot
// ===============================
async function startBot(mode = 'qr') {
  showBanner();
  loadCommands();

  const logger = pino({ level: 'silent' });
  const { state, saveState } = useSingleFileAuthState(AUTH_FILE);
  let version;
  try {
    const latest = await fetchLatestBaileysVersion();
    version = latest.version;
  } catch {
    version = [2, 3000, 1010];
  }

  const sock = makeWASocket({
    logger,
    printQRInTerminal: false,
    auth: state,
    version,
  });

  sock.ev.on('creds.update', saveState);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr && mode === 'qr') {
      qrcode.generate(qr, { small: true });
      console.log(chalk.gray('📱 Escanea el QR con WhatsApp para iniciar sesión.'));
    }

    if (connection === 'open') {
      console.log(chalk.greenBright('✅ Conectado correctamente.'));
      loadPlugins(sock);
      watchCommands();
    }

    if (connection === 'close') {
      const reason = lastDisconnect?.error?.output?.statusCode;
      console.log(chalk.redBright('❌ Conexión cerrada'), reason || '');
      if (reason !== DisconnectReason.loggedOut) {
        console.log(chalk.yellow('Reconectando...'));
        startBot(mode);
      } else {
        console.log(chalk.red('El token expiró. Borra auth_info.json y usa "node main.js qr" nuevamente.'));
      }
    }
  });

  // ============================
  // 💬 Sistema de comandos
  // ============================
  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.remoteJid === 'status@broadcast') return;

    const from = msg.key.remoteJid;
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
    const sender = msg.pushName || 'Usuario';
    const prefix = global.prefix.find(p => text.startsWith(p));

    if (!prefix) return;
    const [cmdName, ...args] = text.slice(prefix.length).trim().split(/\s+/);
    const cmd = commands.get(cmdName.toLowerCase());

    if (!cmd) return; // comando no encontrado

    console.log(chalk.cyan(`[CMD] ${cmdName} de ${sender}`));

    try {
      await cmd.run(sock, msg, args, from);
    } catch (err) {
      console.error(chalk.red(`Error ejecutando ${cmdName}: ${err.message}`));
      await sock.sendMessage(from, { text: '❌ Error ejecutando el comando.' });
    }
  });
}

// ===============================
// 🏁 Inicio según modo
// ===============================
const mode = process.argv[2] === 'codebot' ? 'codebot' : 'qr';
startBot(mode);
