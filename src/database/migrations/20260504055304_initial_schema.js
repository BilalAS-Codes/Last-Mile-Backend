/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    .createTable('users', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('name').notNullable();
      table.string('email').unique().notNullable();
      table.string('password').notNullable();
      table.string('role').notNullable(); // ADMIN, CLIENT, DRIVER
      table.boolean('active').defaultTo(true);
      table.string('avatar').nullable();
      table.string('phone').nullable();
      table.string('vehicle_number').nullable();
      table.string('vehicle_type').nullable();
      table.decimal('rating', 3, 2).defaultTo(5.0);
      table.decimal('cash_in_hand', 14, 2).defaultTo(0);
      table.jsonb('company_details').nullable();
      table.timestamps(true, true);
    })
    .createTable('orders', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('tracking_id').unique().notNullable();
      table.uuid('client_id').references('id').inTable('users').onDelete('CASCADE');
      table.uuid('driver_id').references('id').inTable('users').onDelete('SET NULL').nullable();
      table.string('status').defaultTo('PENDING'); // PENDING, ASSIGNED, PICKED_UP, IN_TRANSIT, DELIVERED, CANCELLED
      table.decimal('order_value', 14, 2).defaultTo(0);
      table.decimal('cod_amount', 14, 2).defaultTo(0);
      table.decimal('delivery_fee', 14, 2).defaultTo(0);
      table.string('customer_name').notNullable();
      table.string('customer_phone').notNullable();
      table.jsonb('pickup_address').notNullable();
      table.jsonb('delivery_address').notNullable();
      table.jsonb('timeline').defaultTo('[]');
      table.boolean('cod_collected').defaultTo(false);
      table.timestamps(true, true);
    })
    .createTable('settlements', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('driver_id').references('id').inTable('users').onDelete('CASCADE');
      table.decimal('amount', 14, 2).notNullable();
      table.string('status').defaultTo('PENDING'); // PENDING, COMPLETED
      table.uuid('admin_id').references('id').inTable('users').onDelete('SET NULL').nullable();
      table.timestamps(true, true);
    })
    .createTable('invoices', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('client_id').references('id').inTable('users').onDelete('CASCADE');
      table.decimal('total_amount', 14, 2).notNullable();
      table.decimal('outstanding_balance', 14, 2).defaultTo(0);
      table.timestamp('due_date').nullable();
      table.string('status').defaultTo('UNPAID'); // PAID, UNPAID, OVERDUE
      table.string('billing_period').nullable();
      table.jsonb('orders').defaultTo('[]'); // Array of order IDs
      table.timestamps(true, true);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('invoices')
    .dropTableIfExists('settlements')
    .dropTableIfExists('orders')
    .dropTableIfExists('users');
};
