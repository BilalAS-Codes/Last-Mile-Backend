/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex('driver_locations').truncate().then(() => {
    return knex.schema.alterTable('driver_locations', (table) => {
      table.unique('driver_id');
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('driver_locations', (table) => {
    table.dropUnique('driver_id');
    table.dropColumn('updated_at');
  });
};
