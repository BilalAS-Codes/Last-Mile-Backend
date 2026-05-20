/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  await knex.schema.alterTable('users', (table) => {
    table.string('currency', 10).defaultTo('SAR');
  });
  await knex.schema.alterTable('orders', (table) => {
    table.string('currency', 10).defaultTo('SAR');
  });
  await knex.schema.alterTable('invoices', (table) => {
    table.string('currency', 10).defaultTo('SAR');
  });
  await knex.schema.alterTable('settlements', (table) => {
    table.string('currency', 10).defaultTo('SAR');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.alterTable('settlements', (table) => {
    table.dropColumn('currency');
  });
  await knex.schema.alterTable('invoices', (table) => {
    table.dropColumn('currency');
  });
  await knex.schema.alterTable('orders', (table) => {
    table.dropColumn('currency');
  });
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('currency');
  });
};
