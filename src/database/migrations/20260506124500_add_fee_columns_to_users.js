/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.alterTable('users', (table) => {
      table.string('fee_type').defaultTo('fixed'); // fixed, percentage
      table.decimal('fee_value', 14, 2).defaultTo(0);
    });
  };
  
  /**
   * @param { import("knex").Knex } knex
   * @returns { Promise<void> }
   */
  exports.down = function(knex) {
    return knex.schema.alterTable('users', (table) => {
      table.dropColumn('fee_type');
      table.dropColumn('fee_value');
    });
  };
