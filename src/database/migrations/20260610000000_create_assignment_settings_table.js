/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  const hasSettings = await knex.schema.hasTable('assignment_settings');
  if (!hasSettings) {
    await knex.schema.createTable('assignment_settings', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('strategy', 50).defaultTo('fifo');
      table.boolean('order_clubbing').defaultTo(false);
      table.decimal('clubbing_distance', 10, 2).defaultTo(1.00);
      table.decimal('clubbing_time_difference', 10, 2).defaultTo(1.00);
      table.timestamps(true, true);
    });

    // Seed default settings row
    await knex('assignment_settings').insert({
      strategy: 'fifo',
      order_clubbing: false,
      clubbing_distance: 1.00,
      clubbing_time_difference: 1.00
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('assignment_settings');
};
