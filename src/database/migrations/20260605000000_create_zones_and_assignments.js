/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  const hasZones = await knex.schema.hasTable('zones');
  if (!hasZones) {
    await knex.schema.createTable('zones', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('name').unique().notNullable();
      table.jsonb('coordinates').notNullable(); // Array of coordinates: [[lng1, lat1], [lng2, lat2], ...]
      table.timestamps(true, true);
    });
  }

  const hasDriverZones = await knex.schema.hasTable('driver_zones');
  if (!hasDriverZones) {
    await knex.schema.createTable('driver_zones', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('driver_id').references('id').inTable('users').onDelete('CASCADE').notNullable();
      table.uuid('zone_id').references('id').inTable('zones').onDelete('CASCADE').notNullable();
      table.unique(['driver_id', 'zone_id']);
      table.timestamps(true, true);
    });
  }

  const hasZoneIdInOrders = await knex.schema.hasColumn('orders', 'zone_id');
  if (!hasZoneIdInOrders) {
    await knex.schema.alterTable('orders', (table) => {
      table.uuid('zone_id').references('id').inTable('zones').onDelete('SET NULL').nullable();
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .alterTable('orders', (table) => {
      table.dropColumn('zone_id');
    })
    .dropTableIfExists('driver_zones')
    .dropTableIfExists('zones');
};
