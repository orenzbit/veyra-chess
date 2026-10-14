import staticBots from '../../public/data/bots/index.json' with { type: 'json' };
import { clientIp, json, rateLimit, supabaseRequest } from './_lib.mjs';

const requests = new Map();

export async function handler(event) {
  const ip = clientIp(event || { headers: {} });
  if (!rateLimit(requests, `ip:${ip}`, 60, 60 * 1000) || !rateLimit(requests, '__global__', 600, 60 * 1000)) return json(429, { ok: false, error: 'rate_limited' }, { 'cache-control': 'no-store', 'retry-after': '60' });
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
