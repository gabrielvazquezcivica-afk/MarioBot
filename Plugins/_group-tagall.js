module.exports = {
  name: 'tagall',
  alias: ['everyone', 'all'],
  description: 'Menciona a todos los miembros del grupo sin mensaje adicional',
  category: 'group',
  admin: true, // Solo admins pueden usarlo
  async run(sock, m, args, from) {
    try {
      if (!from.endsWith('@g.us')) {
        return await sock.sendMessage(from, { text: '❌ Este comando solo funciona en grupos.' }, { quoted: m });
      }

      // Obtener info del grupo
      const groupMeta = await sock.groupMetadata(from);
      const participants = groupMeta.participants;

      // Crear array de menciones (solo IDs)
      const mentions = participants.map(p => p.id);

      // Enviar mensaje vacío solo con menciones
      await sock.sendMessage(from, { text: '‎', mentions });

      // Reaccionar al mensaje que ejecutó el comando
      await sock.sendMessage(from, {
        react: {
          text: '👻',
          key: m.key
        }
      });

    } catch (err) {
      console.error('Error en group-tagall:', err);
      await sock.sendMessage(from, { text: '❌ Ocurrió un error al mencionar a todos.' }, { quoted: m });
    }
  },
};
