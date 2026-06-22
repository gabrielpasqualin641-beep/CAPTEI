const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.usuario.findFirst()
  .then(u => { console.log('User found:', JSON.stringify(u, null, 2)); return p.$disconnect(); })
  .catch(e => { console.error('DB Error:', e.message); return p.$disconnect(); });
