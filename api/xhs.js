/**
 * /api/xhs.js
 * 絨靘��檎��絎��号��絨����駕�best-effort鐚�
 *
 * 絨靘��御������� API鐚�罩よ君�怨��荅��
 *  1. ��� server-side fetch ������鎞��� HTML鐚�茹ｆ�� __INITIAL_STATE__
 *  2. �ュけ��鐚�Cloudflare �����鐚����括� items + searchUrl鐚�莅���腴��箴��ｇ�鐚�
 *
 * 羈����罩ゆ�号����初�� XHS ��腴��合����紊掩��鐚�絮��域�峨�医原篏睡���������篋榊������
 *
 * Query params:
 *   q  �� ��絨����球�
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { q } = req.query;
  if (!q) return res.status(400).json({ _error: 'missing q', items: [] });

  const searchUrl = `https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(q)}&source=web_explore_feed`;

  try {
    const r = await fetch(searchUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) ' +
          'AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8',
        'Referer': 'https://www.xiaohongshu.com/',
        'sec-fetch-dest': 'document',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-site': 'none',
      },
      signal: AbortSignal.timeout(9000),
    });

    const html = await r.text();

    // Try to parse __INITIAL_STATE__ injected into the HTML
    const stateMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]+?\})(?:<\/script>|;\s*<)/);
    if (stateMatch) {
      // XHS sometimes replaces undefined with null in the JSON
      const raw = stateMatch[1].replace(/\bundefined\b/g, 'null');
      try {
        const state = JSON.parse(raw);
        // Path varies by XHS version
        const notes =
          state?.search?.notes ||
          state?.searchResult?.notes ||
          state?.data?.notes ||
          [];

        if (notes.length > 0) {
          return res.status(200).json({
            items: notes.slice(0, 8).map(n => ({
              id: n.id || n.note_id,
              title: (n.title || n.desc || '').slice(0, 80),
              author: n.user?.nickname || n.author?.nickname || '',
              likes: n.interact_info?.liked_count || n.liked_count || 0,
              url: `https://www.xiaohongshu.com/explore/${n.id || n.note_id}`,
              cover: n.cover?.url_default || n.cover?.url || n.image_list?.[0]?.url || '',
            })),
          });
        }
      } catch (_) { /* JSON parse failed */ }
    }

    // Fallback: return the search URL so the frontend can show a deep link
    return res.status(200).json({
      _error: 'parse_failed',
      items: [],
      searchUrl,
    });
  } catch (e) {
    return res.status(200).json({
      _error: e.message,
      items: [],
      searchUrl,
    });
  }
}
