export async function up(knex) {
  // 1. Find all garbage master_products IDs
  const allProducts = await knex('master_products').select('id', 'name');
  const garbageProductIds = [];
  const badNames = [
    '0', 'PRODUCT', 'PRODUCTS', 'W.P', 'ASH', 'GLUTEN',
    'MAIDA 1', 'MAIDA 2', 'MAIDA 3', 'MAIDA 4', 'MAIDA 5',
    'MAIDA 6', 'MAIDA 7', 'MAIDA 8', 'MAIDA 9', 'MAIDA 10',
    'MAIDA 11', 'MAIDA 12', 'MAIDA 13', 'MAIDA 14', 'MAIDA 15',
    'MAIDA 16', 'MAIDA 17', 'MAIDA 18', 'MAIDA 19', 'MAIDA 20',
    'MAIDA 21', 'MAIDA 22', 'MAIDA 23', 'MAIDA 24', 'MAIDA 25',
    'MAIDA 26', 'MAIDA 27', 'MAIDA 28', 'MAIDA 29', 'MAIDA 31',
    'मिल पिसाई', 'चक्की पिसाई', 'टोटल मिल औरचक्की'
  ];

  for (const p of allProducts) {
    const name = String(p.name || '').trim();
    const up = name.toUpperCase();
    if (
      !name ||
      !isNaN(Number(name)) ||
      badNames.includes(name) ||
      up.includes('TOTAL') ||
      up.includes('टोटल') ||
      up.includes('कुल') ||
      up.includes('GRINDING') ||
      up.includes('पिसाई') ||
      up.includes('चक्की')
    ) {
      garbageProductIds.push(p.id);
    }
  }

  if (garbageProductIds.length > 0) {
    await knex('dmr_finish_stock').whereIn('product_id', garbageProductIds).del();
    await knex('dmr_sales_report').whereIn('product_id', garbageProductIds).del();
    await knex('dmr_sales_pending').whereIn('product_id', garbageProductIds).del();
    await knex('dmr_todays_production').whereIn('product_id', garbageProductIds).del();
    await knex('dmr_salesman_sales').whereIn('product_id', garbageProductIds).del();
    await knex('master_products').whereIn('id', garbageProductIds).del();
  }

  // 2. Find all garbage master_salesmen IDs
  const allSalesmen = await knex('master_salesmen').select('id', 'name');
  const garbageSalesmanIds = [];
  const badSmNames = [
    '0', 'SALESMAN', 'PARTY WISE', 'SALESMAN WISE',
    'मिल पिसाई', 'चक्की पिसाई', 'टोटल मिल औरचक्की'
  ];

  for (const s of allSalesmen) {
    const name = String(s.name || '').trim();
    const up = name.toUpperCase();
    if (
      !name ||
      !isNaN(Number(name)) ||
      badSmNames.includes(name) ||
      up.includes('TOTAL') ||
      up.includes('टोटल') ||
      up.includes('कुल') ||
      up.includes('GRINDING') ||
      up.includes('पिसाई') ||
      up.includes('चक्की') ||
      up.includes('मिल')
    ) {
      garbageSalesmanIds.push(s.id);
    }
  }

  if (garbageSalesmanIds.length > 0) {
    await knex('dmr_salesman_sales').whereIn('salesman_id', garbageSalesmanIds).del();
    await knex('master_salesmen').whereIn('id', garbageSalesmanIds).del();
  }
}

export async function down(knex) {
  // No-op for cleanup
}
