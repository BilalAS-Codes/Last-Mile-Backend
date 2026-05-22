/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('refresh_tokens', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE').notNullable();
    table.string('token_hash').unique().notNullable(); // Hashed refresh token
    table.timestamp('expires_at').notNullable();
    table.timestamp('last_active_at').notNullable().defaultTo(knex.fn.now());
    table.boolean('is_revoked').notNullable().defaultTo(false); // For token rotation reuse detection
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('refresh_tokens');
};
