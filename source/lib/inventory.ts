/** Call these statements in the SAME D1 batch as the order status change.
 * A guarded refund followed by cancellation is serialized atomically by D1.
 * CHECK(stock >= 0) makes insufficient reservations roll back the whole batch.
 */
export function refundStatements(db:D1Database,id:string,pendingOnly=false){
 const guard="EXISTS (SELECT 1 FROM orders WHERE id=? AND status<>'لغو شده'"+(pendingOnly?" AND payment_status='pending'":"")+")";
 return [
  db.prepare('UPDATE variants SET stock=stock+COALESCE((SELECT SUM(quantity) FROM order_items WHERE order_id=? AND variant_id=variants.id),0) WHERE id IN (SELECT variant_id FROM order_items WHERE order_id=?) AND '+guard).bind(id,id,id),
  db.prepare("INSERT INTO inventory(id,variant_id,delta,reason,created_at) SELECT lower(hex(randomblob(16))),variant_id,quantity,'order cancellation',unixepoch()*1000 FROM order_items WHERE order_id=? AND "+guard).bind(id,id)
 ];
}
export async function expireReservations(db:D1Database){
 const expired=await db.prepare("SELECT id FROM orders WHERE payment_status='pending' AND created_at<? LIMIT 20").bind(Date.now()-30*60000).all<{id:string}>();
 if(!expired.results.length)return;
 const statements=expired.results.flatMap(({id})=>[
  ...refundStatements(db,id,true),
  db.prepare("UPDATE orders SET status='لغو شده',payment_status='cancelled' WHERE id=? AND payment_status='pending'").bind(id),
  db.prepare("UPDATE payments SET status=(SELECT payment_status FROM orders WHERE id=?) WHERE order_id=?").bind(id,id)
 ]);
 await db.batch(statements);
}
