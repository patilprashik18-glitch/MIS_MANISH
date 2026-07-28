export async function up(knex) {
  // 1. Dashboard Chart Config
  await knex.schema.createTable('dashboard_chart_config', (table) => {
    table.increments('id').primary();
    table.string('chart_key').unique().notNullable();
    table.string('title').notNullable();
    table.boolean('is_visible').defaultTo(true);
    table.integer('display_order').defaultTo(1);
  });

  // 2. Role Permissions
  await knex.schema.createTable('role_permissions', (table) => {
    table.increments('id').primary();
    table.string('role_name').notNullable();
    table.string('section_key').notNullable();
    table.boolean('can_create').defaultTo(true);
    table.boolean('can_read').defaultTo(true);
    table.boolean('can_update').defaultTo(true);
    table.boolean('can_delete').defaultTo(true);
    table.unique(['role_name', 'section_key']);
  });

  // 3. User Permissions Override
  await knex.schema.createTable('user_permissions_override', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
    table.string('section_key').notNullable();
    table.boolean('can_create').defaultTo(true);
    table.boolean('can_read').defaultTo(true);
    table.boolean('can_update').defaultTo(true);
    table.boolean('can_delete').defaultTo(true);
    table.unique(['user_id', 'section_key']);
  });

  // 4. UI Layout Config
  await knex.schema.createTable('ui_layout_config', (table) => {
    table.increments('id').primary();
    table.string('section_key').notNullable();
    table.string('field_key').notNullable();
    table.string('display_label').notNullable();
    table.boolean('is_visible').defaultTo(true);
    table.integer('display_order').defaultTo(1);
    table.unique(['section_key', 'field_key']);
  });

  // Seed default 8 charts
  await knex('dashboard_chart_config').insert([
    { chart_key: 'grinding_trend', title: '30-Day Grinding Output (Mill vs Chakki)', is_visible: true, display_order: 1 },
    { chart_key: 'production_by_product', title: "Today's Production by Product (Qtl)", is_visible: true, display_order: 2 },
    { chart_key: 'sales_by_product', title: 'Product Sales Volume & Revenue', is_visible: true, display_order: 3 },
    { chart_key: 'salesman_performance', title: 'Salesman Revenue Breakdown', is_visible: true, display_order: 4 },
    { chart_key: 'moisture_tracking', title: 'Flour Moisture Levels vs Normal Range', is_visible: true, display_order: 5 },
    { chart_key: 'lab_quality_index', title: 'Lab Quality Metrics (W.P %, Ash %, Gluten %)', is_visible: true, display_order: 6 },
    { chart_key: 'attendance_dept', title: 'Department Attendance (Present vs Absent)', is_visible: true, display_order: 7 },
    { chart_key: 'padtal_margin', title: 'Daily Padtal Net Realization Margin', is_visible: true, display_order: 8 }
  ]);

  // Sections list
  const sections = [
    'grinding_power', 'wheat_stock', 'finish_stock', 'todays_production',
    'sales_report', 'sales_pending', 'salesman_sales', 'attendance',
    'moisture', 'lab_report', 'padtal_report', 'master_data'
  ];

  // Seed admin role (Full CRUD on all)
  const adminRoleSeeds = sections.map((sec) => ({
    role_name: 'admin',
    section_key: sec,
    can_create: true,
    can_read: true,
    can_update: true,
    can_delete: true
  }));
  await knex('role_permissions').insert(adminRoleSeeds);

  // Seed mill_floor role (CRUD on operations, read-only on padtal and master_data)
  const millFloorRoleSeeds = sections.map((sec) => {
    const isReadOnly = sec === 'padtal_report' || sec === 'master_data';
    return {
      role_name: 'mill_floor',
      section_key: sec,
      can_create: !isReadOnly,
      can_read: true,
      can_update: !isReadOnly,
      can_delete: !isReadOnly
    };
  });
  await knex('role_permissions').insert(millFloorRoleSeeds);

  // Seed default UI layout field labels
  const defaultLayouts = [
    { section_key: 'grinding_power', field_key: 'mill_grinding', display_label: 'Mill Grinding (Qtl)', is_visible: true, display_order: 1 },
    { section_key: 'grinding_power', field_key: 'chakki_grinding', display_label: 'Chakki Grinding (Qtl)', is_visible: true, display_order: 2 },
    { section_key: 'grinding_power', field_key: 'power_units', display_label: 'Power Units Consumed', is_visible: true, display_order: 3 },
    { section_key: 'grinding_power', field_key: 'power_rate_per_unit', display_label: 'Power Rate/Unit (₹)', is_visible: true, display_order: 4 },
    { section_key: 'wheat_stock', field_key: 'wheat_opening', display_label: 'Opening Wheat Stock (Qtl)', is_visible: true, display_order: 1 },
    { section_key: 'wheat_stock', field_key: 'wheat_received', display_label: 'Wheat Received (Qtl)', is_visible: true, display_order: 2 },
    { section_key: 'wheat_stock', field_key: 'wheat_purchase_rate', display_label: 'Wheat Purchase Rate (₹/Qtl)', is_visible: true, display_order: 3 },
    { section_key: 'moisture', field_key: 'moisture_maida_percent', display_label: 'Maida Moisture %', is_visible: true, display_order: 1 },
    { section_key: 'moisture', field_key: 'moisture_average_percent', display_label: 'Average Moisture %', is_visible: true, display_order: 2 },
    { section_key: 'moisture', field_key: 'moisture_wheat_percent', display_label: 'Wheat Moisture %', is_visible: true, display_order: 3 },
    { section_key: 'lab_report', field_key: 'wp', display_label: 'W.P %', is_visible: true, display_order: 1 },
    { section_key: 'lab_report', field_key: 'ash', display_label: 'Ash %', is_visible: true, display_order: 2 },
    { section_key: 'lab_report', field_key: 'gluten', display_label: 'Gluten %', is_visible: true, display_order: 3 },
    { section_key: 'lab_report', field_key: 'sedimentation', display_label: 'Sedimentation Value', is_visible: true, display_order: 4 },
    { section_key: 'lab_report', field_key: 'bread_height', display_label: 'Bread Height (mm)', is_visible: true, display_order: 5 }
  ];
  await knex('ui_layout_config').insert(defaultLayouts);
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('ui_layout_config');
  await knex.schema.dropTableIfExists('user_permissions_override');
  await knex.schema.dropTableIfExists('role_permissions');
  await knex.schema.dropTableIfExists('dashboard_chart_config');
}
