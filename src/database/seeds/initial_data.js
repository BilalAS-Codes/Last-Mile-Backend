const bcrypt = require('bcryptjs');

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function (knex) {
  // Deletes ALL existing entries
  await knex('invoices').del();
  await knex('settlements').del();
  await knex('orders').del();
  await knex('users').del();

  const hashedPassword = await bcrypt.hash('123456', 10);

  // Inserts seed entries for Users
  const [admin, client1, client2, driver1, driver2] = await knex('users').insert([
    {
      name: 'Alex Admin',
      email: 'admin@logiflow.com',
      password: hashedPassword,
      role: 'ADMIN',
      active: true
    },
    {
      name: 'Sarah Client',
      email: 'sarah@boutique.com',
      password: hashedPassword,
      role: 'CLIENT',
      active: true,
      company_details: JSON.stringify({
        companyName: "Sarah's Boutique",
        billingEmail: 'billing@sarah.com',
        phone: '555-0199',
        address: { street: '123 Fashion Ave', city: 'NYC', state: 'NY', zip: '10001' },
        feeType: 'FIXED',
        feeValue: 15
      })
    },
    {
      name: 'John Tech',
      email: 'john@techcorp.com',
      password: hashedPassword,
      role: 'CLIENT',
      active: true,
      company_details: JSON.stringify({
        companyName: 'TechCorp Solutions',
        billingEmail: 'accounts@techcorp.com',
        phone: '555-0200',
        address: { street: '101 Tech Blvd', city: 'San Jose', state: 'CA', zip: '95101' },
        feeType: 'PERCENTAGE',
        feeValue: 1.5
      })
    },
    {
      name: 'Mike Mover',
      email: 'mike@logiflow.com',
      password: hashedPassword,
      role: 'DRIVER',
      active: true,
      phone: '+1234567890',
      vehicle_number: 'V-102',
      cash_in_hand: 450
    },
    {
      name: 'Dave Delivery',
      email: 'dave@logiflow.com',
      password: hashedPassword,
      role: 'DRIVER',
      active: true,
      phone: '+1234567891',
      vehicle_number: 'V-105',
      cash_in_hand: 120
    }
  ]).returning('*');

  // Inserts seed entries for Orders
  await knex('orders').insert([
    {
      tracking_id: 'LF-98231',
      client_id: client1.id,
      driver_id: driver1.id,
      status: 'IN_TRANSIT',
      order_value: 1200,
      cod_amount: 1200,
      delivery_fee: 15,
      customer_name: 'Alice Johnson',
      customer_phone: '+1999888777',
      pickup_address: JSON.stringify({ street: '123 Fashion Ave', city: 'New York', state: 'NY', zip: '10001' }),
      delivery_address: JSON.stringify({ street: '456 Residential St', city: 'Brooklyn', state: 'NY', zip: '11201' }),
      timeline: JSON.stringify([
        { status: 'PENDING', timestamp: new Date(Date.now() - 90000000).toISOString() },
        { status: 'ASSIGNED', timestamp: new Date(Date.now() - 88000000).toISOString() },
        { status: 'PICKED_UP', timestamp: new Date(Date.now() - 86400000).toISOString() },
        { status: 'IN_TRANSIT', timestamp: new Date(Date.now() - 43200000).toISOString() },
      ])
    },
    {
      tracking_id: 'LF-98232',
      client_id: client1.id,
      status: 'PENDING',
      order_value: 800,
      cod_amount: 0,
      delivery_fee: 15,
      customer_name: 'Bob Smith',
      customer_phone: '+1777666555',
      pickup_address: JSON.stringify({ street: '123 Fashion Ave', city: 'New York', state: 'NY', zip: '10001' }),
      delivery_address: JSON.stringify({ street: '789 Business Rd', city: 'Queens', state: 'NY', zip: '11101' }),
      timeline: JSON.stringify([{ status: 'PENDING', timestamp: new Date().toISOString() }])
    },
    {
      tracking_id: 'LF-98233',
      client_id: client2.id,
      driver_id: driver2.id,
      status: 'DELIVERED',
      order_value: 5000,
      cod_amount: 0,
      delivery_fee: 50,
      customer_name: 'Charlie Data',
      customer_phone: '+1555444333',
      pickup_address: JSON.stringify({ street: '101 Tech Blvd', city: 'San Jose', state: 'CA', zip: '95101' }),
      delivery_address: JSON.stringify({ street: '202 Server Ln', city: 'Palo Alto', state: 'CA', zip: '94301' }),
      timeline: JSON.stringify([
        { status: 'PENDING', timestamp: new Date(Date.now() - 172800000).toISOString() },
        { status: 'DELIVERED', timestamp: new Date(Date.now() - 86400000).toISOString() },
      ])
    }
  ]);
};
