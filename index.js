/**
 * index.js - Bot WhatsApp con opciones de login: QR o codebot
 * - Usa baileys v4 (makeWASocket)
 * - Muestra letras grandes y en colores (figlet + chalk)
 * - Carga plugins desde ./plugins
 *
 * Uso:
 *   node index.js qr        -> inicia y muestra QR en terminal
 *   node index.js codebot   -> intenta iniciar con auth_info.json (modo sin QR)
 *
 * Asegúrate de tener una carpeta ./plugins con módulos que exporten:
 *   module.exports = async (sock) => { /* registra handlers aquí */ }
 */

const { default: makeWASocket, useSingleFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@adiwajshing/baileys');
const require('./config');
const handleMessage = require('./handler');
const figlet = require('figlet');
const chalk = require('chalk');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const pino = require('pino');

const AUTH_FILE = './auth_info.json';
const PLUGINS_DIR = path.join(__dirname, 'plugins');

// Muestra el título grande y colorido
function showTitle() {
  const text = 'CHAPPIE';
  const fig = figlet.textSync(text, { horizontalLayout: 'default' });
  // colorea cada línea con tonos alternos
  const colors = [chalk.rgb(255,180,0), chalk.rgb(0,200,255), chalk.rgb(180,0,255), chalk.rgb(0,255,120)];
  const lines = fig.split('\n');
  const colored = lines.map((l, i) => colors[i % colors.length](l));
  console.log('\n' + colored.join('\n') + '\n');
  console.log(chalk.bold.greenBright('Iniciando CHAPPIE Bot — WhatsApp\n'));
}

// Carga plugins (cada plugin exporta async function(sock) {...})
function loadPlugins(sock) {
  if (!fs.existsSync(PLUGINS_DIR)) {
    console.log(chalk.yellow('No existe carpeta plugins - creando ./plugins'));
    fs.mkdirSync(PLUGINS_DIR, { recursive: true });
    return;
  }
  const files = fs.readdirSync(PLUGINS_DIR).filter(f => f.endsWith('.js'));
  if (files.length === 0) {
    console.log(chalk.yellow('No se encontraron plugins en ./plugins'));
    return;
  }
  console.log(chalk.blueBright(`Cargando ${files.length} plugin(s)...`));
  for (const f of files) {
    try {
      const pluginPath = path.join(PLUGINS_DIR, f);
      delete require.cache[require.resolve(pluginPath)]; // recarga si cambia
      const plugin = require(pluginPath);
      if (typeof plugin === 'function') {
        plugin(sock).catch(err => console.error(chalk.red(`Error iniciando plugin ${f}:`), err));
        console.log(chalk.green(`  ✓ ${f}`));
      } else {
        console.log(chalk.yellow(`  - ${f}: no exporta función (ignored)`));
      }
    } catch (err) {
      console.error(chalk.red(`  ✗ Error cargando plugin ${f}:`), err);
    }
  }
}

// Función principal
async function start(mode = 'qr') {
  showTitle();

  // logger para baileys
  const logger = pino({ level: 'silent' }); // cambia a 'info' para debug
  const { state, saveState } = useSingleFileAuthState(AUTH_FILE);

  // intenta obtener versión (opcional, pero útil)
  let waVersion = undefined;
  try {
    const versionInfo = await fetchLatestBaileysVersion();
    waVersion = versionInfo.version;
  } catch (err) {
    // si falla, no es crítico
  }

  const sock = makeWASocket({
    logger,
    printQRInTerminal: false, // no usamos printQRInTerminal interno porque gestionamos QR con qrcode-terminal
    auth: state,
    version: waVersion,
  });

  // guardado de credenciales cuando cambien
  sock.ev.on('creds.update', saveState);

  // Mostrar QR si estamos en modo 'qr'
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr && mode === 'qr') {
      qrcode.generate(qr, { small: true });
      console.log(chalk.gray('Escanea el QR con WhatsApp (usando tu teléfono).'));
    }
    if (connection === 'open') {
      console.log(chalk.greenBright('\nConexión establecida ✅'));
      // después de conectar cargamos plugins
      loadPlugins(sock);
    }
    if (connection === 'close') {
      const reason = (lastDisconnect && lastDisconnect.error && lastDisconnect.error.output) ? lastDisconnect.error.output.statusCode : null;
      console.log(chalk.redBright('Conexión cerrada'), reason || '');
      // reconectar si no fue cierre voluntario
      if (lastDisconnect && lastDisconnect.error) {
        const code = lastDisconnect.error?.output?.statusCode;
        if (code !== DisconnectReason.loggedOut && mode === 'codebot') {
          console.log(chalk.yellow('Intentando reconectar...'));
          start(mode).catch(console.error);
        } else if (code === DisconnectReason.loggedOut) {
          console.log(chalk.red('El token ya no es válido (logged out). Borra auth_info.json y vuelve a iniciar en modo qr.'));
        }
      }
    }
  });

  // Mensajes entrantes (ejemplo básico)
  sock.ev.on('messages.upsert', async (m) => {
    try {
      const messages = m.messages;
      for (const msg of messages) {
        if (!msg.message || msg.key && msg.key.remoteJid === 'status@broadcast') continue;
        const from = msg.key.remoteJid;
        const pushName = msg.pushName || 'unknown';
        // Log rápido
        console.log(chalk.cyan(`[MSG] ${from} from ${pushName}:`), (msg.message.conversation || msg.message?.extendedTextMessage?.text || '').slice(0,120));
        // Respuesta simple: si te mencionan "ping"
        const text = (msg.message.conversation || msg.message?.extendedTextMessage?.text || '').toLowerCase();
        if (text === 'ping') {
          await sock.sendMessage(from, { text: `pong — Hola ${pushName}!` }, { quoted: msg });
        }
      }
    } catch (err) {
      console.error(chalk.red('Error al procesar mensajes:'), err);
    }
  });

  // Notifica cuando credenciales se guardan
  sock.ev.on('creds.update', () => {
    console.log(chalk.gray('Credenciales actualizadas y guardadas en ' + AUTH_FILE));
  });

  // Si ya existe auth file y estamos en mode codebot, intenta iniciar sesión sin QR
  if (mode === 'codebot') {
    if (!fs.existsSync(AUTH_FILE)) {
      console.log(chalk.yellow(`No se encontró ${AUTH_FILE}. Ejecuta en modo 'qr' al menos una vez para generar credenciales.`));
    } else {
      console.log(chalk.green('Modo codebot: usando credenciales en ' + AUTH_FILE));
    }
  } else {
    console.log(chalk.blue('Modo QR: se mostrará QR en la terminal. Si no aparece, revisa conexión a Internet y vuelve a ejecutar.'));
  }
}

// Leer argumento de línea de comandos
const modeArg = (process.argv[2] || '').toLowerCase();
const mode = (modeArg === 'codebot' || modeArg === 'qr') ? modeArg : 'qr';

// Arranca
start(mode).catch(err => {
  console.error(chalk.red('Error iniciando bot:'), err);
  process.exit(1);
});
