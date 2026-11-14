// End-of-match ladder panel: Season 1 tier cards + top 10 of the week + your row. Data from the ladder API (worker/).
const esc = (v) => String(v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const stars = (n) => '★'.repeat(n) + '<i>' + '★'.repeat(5 - n) + '</i>';
export function renderLadder(el, data, me) {
  // me: { name, rank, points } from the submit response, or null when unranked
  const myTier = me && data.tiers.find((t) => me.rank >= t.from && me.rank <= t.to);
  const tiers = data.tiers.map((t) => `<div class="tier${myTier && myTier.name === t.name ? ' mine' : ''}"><b>${t.name}</b><div class="st">${stars(t.stars)}</div><div class="usd">${t.usdc}<small>USDC</small></div><div class="rk">Ranks ${t.from}–${t.to} · weekly</div></div>`).join('');
  const myName = me ? me.name.toLowerCase() : null;
  let rows = data.rows.slice(0, 10);
  if (me && !rows.some((r) => r.name.toLowerCase() === myName)) rows.push({ rank: me.rank, name: me.name, points: me.points, kills: '', deaths: '', wins: '' });
  const table = rows.length ? `<table><tr><th>#</th><th>Player</th><th class="n">Pts</th><th class="n hs">K</th><th class="n hs">D</th><th class="n">W</th></tr>` +
    rows.map((r) => `<tr${myName && r.name.toLowerCase() === myName ? ' class="me"' : ''}><td>${r.rank}</td><td>${esc(r.name)}</td><td class="n pts">${r.points}</td><td class="n hs">${r.kills}</td><td class="n hs">${r.deaths}</td><td class="n">${r.wins}</td></tr>`).join('') + '</table>' : '<div class="cap">No ranked matches logged this week yet</div>';
  el.innerHTML = `<div class="tiers">${tiers}</div>${table}<div class="cap">Week ${esc(data.week)} · closes Sunday 23:59 UTC · 10 pts per kill · 50 per win · payouts start when the pool is funded</div>`;
  el.classList.add('on');
}
