import { db, run, get } from './server/db.ts';

async function testVote() {
  const productId = '4d0831c4-67e1-49bd-a7b8-45e54d2d6169'; // from test-db output
  const userId = 'd30a6c28-2a73-4e5b-abfa-877c1ba2d6f4';
  
  try {
    // Simulate POST with null (Toggle off)
    console.log('Sending null vote...');
    await run('DELETE FROM vuttik_product_votes WHERE product_id = ? AND user_id = ?', [productId, userId]);
    
    // Check if deleted
    let vote = await get('SELECT * FROM vuttik_product_votes WHERE product_id = ? AND user_id = ?', [productId, userId]);
    console.log('Vote after delete:', vote);
    
    // Simulate POST with 'up'
    console.log('Sending UP vote...');
    await run(
      `INSERT INTO vuttik_product_votes (product_id, user_id, vote_type, created_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(product_id, user_id) DO UPDATE SET vote_type = excluded.vote_type`,
      [productId, userId, 'up', new Date().toISOString()]
    );
    
    // Check if inserted
    vote = await get('SELECT * FROM vuttik_product_votes WHERE product_id = ? AND user_id = ?', [productId, userId]);
    console.log('Vote after insert:', vote);

  } catch (e) {
    console.error(e);
  }
}

testVote();
