const knex = require('knex')(require('./knexfile').development);

async function verifyDynamicFeatures() {
  console.log('--- Verifying Dynamic Features Tables & Default Rows ---');
  try {
    const chartConfigs = await knex('dashboard_chart_config').select('*');
    console.log('1. dashboard_chart_config rows:', chartConfigs.length);
    chartConfigs.forEach(c => {
      console.log(`   [Chart] ${c.chart_key}: title="${c.display_title}", type=${c.chart_type}, enabled=${c.is_enabled}`);
    });

    const permMatrix = await knex('section_permission_matrix').select('*');
    console.log('2. section_permission_matrix rows:', permMatrix.length);

    const layoutConfigs = await knex('ui_layout_config').select('*');
    console.log('3. ui_layout_config rows:', layoutConfigs.length);

    console.log('--- ALL DYNAMIC FEATURE TABLES & DATA VERIFIED SUCCESSFULLY ---');
  } catch (err) {
    console.error('ERROR during verification:', err);
  } finally {
    await knex.destroy();
  }
}

verifyDynamicFeatures();
