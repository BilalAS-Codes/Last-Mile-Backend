/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.alterTable('orders', (table) => {
      table.uuid('invoice_id').references('id').inTable('invoices').onDelete('SET NULL');
      table.index('invoice_id', 'idx_orders_invoice_id', {
          predicate: knex.raw('invoice_id IS NULL')
      });
    });
  };
  
  /**
   * @param { import("knex").Knex } knex
   * @returns { Promise<void> }
   */
  exports.down = function(knex) {
    return knex.schema.alterTable('orders', (table) => {
      table.dropIndex('invoice_id', 'idx_orders_invoice_id');
      table.dropColumn('invoice_id');
    });
  };
