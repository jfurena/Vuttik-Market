import { db, all } from './server/db.ts';

async function test() {
  try {
    const votes = await all('SELECT * FROM vuttik_product_votes');
    console.log('Votes:', votes);
    const products = await all(`
      SELECT p.id,
             (SELECT json_group_array(user_id) FROM vuttik_product_votes WHERE product_id = p.id AND vote_type = 'up') as up_votes
      FROM vuttik_products p LIMIT 5
    `);
    console.log('Products:', products);
  } catch (e) {
    console.error(e);
  }
}

test();
