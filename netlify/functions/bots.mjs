import staticBots from '../../public/data/bots/index.json' with { type: 'json' };
import { json, supabaseRequest } from './_lib.mjs';

export async function handler() {
  try {
    let overrides=[];
    try { overrides=await supabaseRequest('bot_overrides?select=slug,payload,updated_at'); } catch {}
    const map=new Map((overrides||[]).map(row=>[row.slug,row]));
    const bots=staticBots.map(bot=>({...bot,...(map.get(bot.slug)?.payload||{}),_updatedAt:map.get(bot.slug)?.updated_at||null}));
    return json(200,{ok:true,bots},{'cache-control':'private, max-age=60'});
  } catch {
    return json(200,{ok:true,bots:staticBots,storage:'offline'},{'cache-control':'no-store'});
  }
}
