const { getPrisma } = require('./src/db/prisma');
const p = getPrisma();
(async () => {
  try {
    const rows = await p.$queryRaw`SELECT column_name, is_nullable, data_type FROM information_schema.columns WHERE table_name = 'SimulationRun';`;
    console.log(rows);
  } catch (err) {
    console.error(err);
  } finally {
    await p.$disconnect();
  }
})();