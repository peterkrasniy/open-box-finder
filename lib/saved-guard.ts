/** Browser-local capacity claims only: no prices, media, catalog payloads or server/shared profile. */
export const SAVED_GUARD_DATABASE='open-box-finder:saved-coordination:v1';
const STORE='guard';
export function openSavedGuard(factory:IDBFactory):Promise<IDBDatabase>{
 return new Promise((resolve,reject)=>{
  let settled=false;const request=factory.open(SAVED_GUARD_DATABASE,1);
  const timeout=setTimeout(()=>{settled=true;reject(new Error('Saved coordination unavailable'));},10000);
  request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(STORE))request.result.createObjectStore(STORE);};
  request.onerror=()=>{clearTimeout(timeout);settled=true;reject(new Error('Saved coordination unavailable'));};
  request.onsuccess=()=>{clearTimeout(timeout);const database=request.result;if(settled){database.close();return;}settled=true;database.onversionchange=()=>database.close();resolve(database);};
 });
}
/** Overlapping readwrite transactions serialize across tabs, including when Web Locks is absent.
 * The localStorage operation stays synchronous inside an active IDB request task. */
export function withSavedGuard<T>(database:IDBDatabase,operation:(capacity:Set<string>)=>T,initial:readonly string[]=[]):Promise<T>{
 return new Promise((resolve,reject)=>{
  let result:T,error:unknown;
  const transaction=database.transaction(STORE,'readwrite'),objectStore=transaction.objectStore(STORE),request=objectStore.get('capacity');
  const timeout=setTimeout(()=>{error=new Error('Saved coordination timed out');try{transaction.abort();}catch{reject(error);}},10000);
  request.onsuccess=()=>{try{
    const value=request.result??initial;
    if(!Array.isArray(value)||value.length>10000||!value.every(identity=>typeof identity==='string'&&identity.length<=2048))throw new Error('Invalid saved capacity state');
    const capacity=new Set<string>(value);result=operation(capacity);objectStore.put([...capacity],'capacity');
  }catch(cause){error=cause;transaction.abort();}};
  transaction.oncomplete=()=>{clearTimeout(timeout);resolve(result);};
  transaction.onabort=()=>{clearTimeout(timeout);reject(error??new Error('Saved coordination unavailable'));};
 });
}
