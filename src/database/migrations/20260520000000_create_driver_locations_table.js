/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('driver_locations', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.uuid('driver_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.decimal('latitude', 10, 7).notNullable();
    table.decimal('longitude', 10, 7).notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    // Index on driver_id for faster lookups
    table.index('driver_id');
    // Index on created_at for chronological queries
    table.index('created_at');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('driver_locations');
};
