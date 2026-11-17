/** In-memory D1 interface for HTTP tests; the budget SQL also has a real SQLite test. */
module.exports=class DB {
 constructor(){this.quota=new Map();this.quotas=this.quota;this.cooldowns=new Map();this.fail=false;}
 prepare(sql){const db=this;let args=[];return {
  bind(...values){args=values;return this;},
  async first(){
   if(db.fail)throw Error('database unavailable');
   if(sql.startsWith('SELECT'))return db.cooldowns.has(args[0])?{until_ms:db.cooldowns.get(args[0])}:null;
   const key=args[0]+'|'+args[1],old=db.quota.get(key)||0;
   const weighted=args.length===4,amount=weighted?args[2]:1,cap=weighted?args[3]:args[2];
   if(old+amount>cap)return null;
   db.quota.set(key,old+amount);return {used:old+amount};
  },
  async run(){
   if(db.fail)throw Error('database unavailable');
   if(sql.startsWith('INSERT INTO cooldown'))db.cooldowns.set(args[0],Math.max(args[1],db.cooldowns.get(args[0])||0));
   if(sql.startsWith('DELETE FROM quota'))for(const key of db.quota.keys())if(key.split('|')[0]<args[0])db.quota.delete(key);
  },
 };}
};
