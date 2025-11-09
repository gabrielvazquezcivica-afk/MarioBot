/**
 * handler.js — Gestor avanzado de mensajes CHAPPIE BOT
 * -----------------------------------------------------
 * Funciona con:
 * - main.js
 * - carpeta /commands
 * - config.js
 */

const chalk = require('chalk');
const fs = require('fs');

// ===============================
// 🔒 Sistema de límites
// ===============================
const userLimits = new Map();

function checkLimit(sender) {
  const now = Date.now();
  const data = userLimits.get(sender) || { count: 0, lastReset: now };
  const limit = global.limitDefault?.free || 25;

  // reset diario
  if (now - data.lastReset > 24 * 60 * 60 * 1000) {
    data.count = 0;
    data.lastReset = now;
  }

  if (data.count >= limit) return false;

  data.count += 1;
  userLimits.set(sender, data);
  return true;
}

// ===============================
// ⚙️ Función principal
// ===============================
async function handleMessage(sock, message, commandsMap) {
  try {
    if (!message.message || message.key.remoteJid === 'status@broadcast') return;

    const from = message.key.remoteJid;
    const sender = message.key.participant || message.key.remoteJid.split('@')[0];
    const text = message.message.conversation || message.message.extendedTextMessage?.text || '';
    const prefix = global.prefix.find(p => text.startsWith(p));
    if (!prefix) return;

    const [cmdName, ...args] = text.slice(prefix.length).trim().split(/\s+/);
    const command = commandsMap.get(cmdName.toLowerCase());
    if (!command) return;

    // ===============================
    // ⚠️ Permisos
    // ===============================
    const isOwner = sender.includes(global.ownerNumber);
    const isGroup = from.endsWith('@g.us');
    let isAdmin = false;

    // Chequeo simple de admins (requiere integrar funciones de Baileys para grupos)
    if (isGroup) {
      const groupMeta = await sock.groupMetadata(from).catch(() => null);
      if (groupMeta) {
        const participants = groupMeta.participants;
        isAdmin = participants.some(p => p.id === sender && (p.admin === 'admin' || p.admin === 'superadmin'));
      }
    }

    if (command.owner && !isOwner) {
      await sock.sendMessage(from, { text: '🔐 Solo el owner puede usar este comando.' }, { quoted: message });
      return;
    }
    if (command.admin && !isAdmin && !isOwner) {
      await sock.sendMessage(from, { text: '⚠️ Solo admins pueden usar este comando.' }, { quoted: message });
      return;
    }

    // ===============================
    // ⏱️ Limites diarios
    // ===============================
    if (!command.premium && !isOwner) {
      const ok = checkLimit(sender);
      if (!ok) {
        await sock.sendMessage(from, { text: '⚠️ Has alcanzado tu límite diario, espera al reinicio.' }, { quoted: message });
        return;
      }
    }

    // ===============================
    // 📌 Ejecutar comando
    // ===============================
    console.log(chalk.cyan(`[CMD] ${cmdName} de ${sender} (${from})`));

    try {
      await command.run(sock, message, args, from);
    } catch (err) {
      console.error(chalk.red(`Error ejecutando ${cmdName}: ${err.message}`));
      await sock.sendMessage(from, { text: '❌ Ocurrió un error ejecutando el comando.' }, { quoted: message });
    }

    // ===============================
    // 🤖 Auto-reply básico
    // ===============================
    const autoReplies = [
      { trigger: 'hola', reply: `Hola ${sender}! 👋 Soy ${global.botname}` },
      { trigger: 'chappie', reply: 'Sí! Estoy activo 😉' },
      { trigger: 'gracias', reply: 'De nada! 😎' },
    ];

    for (const ar of autoReplies) {
      if (text.toLowerCase().includes(ar.trigger)) {
        await sock.sendMessage(from, { text: ar.reply }, { quoted: message });
      }
    }

  } catch (err) {
    console.error(chalk.red('Error en handler.js:'), err);
  }
}

module.exports = handleMessage;
