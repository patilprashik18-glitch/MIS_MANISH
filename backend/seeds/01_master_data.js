export async function seed(knex) {
  await knex('master_products').del();
  await knex('master_salesmen').del();
  await knex('master_expenses').del();
  
  await knex('master_products').insert([
    { name: 'MAIDA BAKERY 50KG' },
    { name: 'MAIDA 30KG' },
    { name: 'MAIDA LEMINATION 50 KG' },
    { name: 'REFINED WHEAT FLOUR (MAIDA) 50KG' },
    { name: 'SOOJI 50 KG' },
    { name: 'Sooji 30 Kgs' },
    { name: 'Rawa 50 kg' },
    { name: 'Rawa 30 Kg' },
    { name: 'TANDORI MAIDA 50 KG' },
    { name: 'CA50' },
    { name: 'CA30' },
    { name: 'FINE BRAN 40 KG' },
    { name: 'Bran ROUGH 39 KG' },
    { name: 'Bran Fine 49 KG' },
    { name: 'DELUX BRAN 49KG' },
    { name: 'SUPER DELUX BRAN 49KG' },
    { name: 'POWER MESH 50 KG' }
  ]);

  await knex('master_salesmen').insert([
    { name: 'ADITYA JI' },
    { name: 'KAILASH JI SHARMA' },
    { name: 'DEEPAK JI SHARMA' },
    { name: 'ADMIN' }
  ]);

  await knex('master_expenses').insert([
    { name: 'ELECTRIC BILL' },
    { name: 'SALARY' },
    { name: 'PP BAG' },
    { name: 'CC INT..' },
    { name: 'REPAIR & MAINTANANCE' },
    { name: 'Staff Welfare A/c' },
    { name: 'TRAVELLING EXPENSES' },
    { name: 'PEST CONTROL' },
    { name: 'DIRECTOR REMUNARATION' },
    { name: 'Building Repaire & Maintance' },
    { name: 'Printing & Stationery Exp' },
    { name: 'Transport Exp. A/c' },
    { name: 'Interest Paid (Expenses) BMW' },
    { name: 'Wherehouse Rent' },
    { name: 'Rent Pune' },
    { name: 'Bardana Repaire' },
    { name: 'MAIDA TRANSPORT' },
    { name: 'Cash discount' }
  ]);
}
