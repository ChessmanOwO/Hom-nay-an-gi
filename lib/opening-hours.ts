export type OpeningStatus = 'open' | 'closed' | 'unknown';
export function openingStatus(hoursStr: string, now = new Date()): OpeningStatus {
  const raw = (hoursStr || '').trim().toLowerCase();
  if (/^(24\/7|24h|24 giờ|cả ngày)$/.test(raw)) return 'open';
  const normalized = raw.replace(/[–—−‑]/g, '-');
  const pattern = /(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/g;
  const ranges = [...normalized.matchAll(pattern)];
  if (!ranges.length || normalized.replace(pattern, '').replace(/[\s;,|]+/g, '')) return 'unknown';
  const parts = new Intl.DateTimeFormat('en-GB', {timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now);
  const minute = Number(parts.find(p=>p.type==='hour')?.value)*60 + Number(parts.find(p=>p.type==='minute')?.value);
  let open = false;
  for (const r of ranges) {
    const [h1,m1,h2,m2] = r.slice(1).map(Number);
    if (h1>23 || h2>24 || m1>59 || m2>59 || (h2===24&&m2!==0)) return 'unknown';
    const start=h1*60+m1, end=h2*60+m2;
    if (start===end) return 'unknown';
    if (start<end ? minute>=start&&minute<end : minute>=start||minute<end) open=true;
  }
  return open?'open':'closed';
}
export function isOpenNow(hoursStr:string,now=new Date()):boolean {return openingStatus(hoursStr,now)==='open'}
