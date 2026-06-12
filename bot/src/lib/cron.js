// cron.js — ひまりちゃんの定期実行スケジューラ
import cron from 'node-cron';
import { setKeyword, getTodayKeyword } from '../handlers/keyword.js';
import { getMonthlyRanking } from './exp.js';

// =========================================================
// 合言葉リスト（陽だまりの庭にふさわしい言葉）
// =========================================================
const KEYWORD_LIST = [
  // 光・空・朝
  'あさひ', 'ひかり', 'あかつき', 'あけぼの', 'はつひ',
  'たいよう', 'かがやき', 'あおぞら', 'わたぐも', 'にじ',
  'あさもや', 'あさかぜ', 'あさつゆ', 'そら', 'きぼう',

  // 水・流れ
  'しずく', 'つゆ', 'いずみ', 'せせらぎ', 'ながれ',
  'うるおい', 'めぐり',

  // 植物・庭
  'ふたば', 'こだち', 'さくら', 'もみじ', 'たんぽぽ',
  'すみれ', 'なでしこ', 'ひまわり', 'あじさい', 'れんげ',
  'なのはな', 'ふじ', 'しおん', 'わかば', 'もえぎ',
  'めぶき', 'みのり', 'こもれび', 'はなびら', 'こけ',

  // 自然・いきもの
  'ほたる', 'かぜ', 'みどり', 'いのち', 'さわやか',

  // つながり・気持ち
  'なごみ', 'きずな', 'めぐみ', 'やすらぎ', 'いぶき',
  'はるかぜ', 'こころ', 'えがお', 'やわらぎ', 'ぬくもり',
  'やさしさ', 'なかま', 'ほほえみ', 'むすび', 'あゆみ',

  // 時間・日々
  'あした', 'たより', 'ゆめ', 'ひとひ', 'たまゆら',
  'つむぎ', 'かおり', 'ひとみ',
];

function pickKeyword() {
  return KEYWORD_LIST[Math.floor(Math.random() * KEYWORD_LIST.length)];
}

// =========================================================
// 開園告知 Embed を #今日の合言葉 チャンネルに投稿
// =========================================================
async function postAnnouncement(client, kwRecord) {
  const guild = client.guilds.cache.get(process.env.DISCORD_GUILD_ID);
  if (!guild) {
    console.warn('⚠️ [Cron] DISCORD_GUILD_ID のサーバーが見つかりません');
    return;
  }

  const channel = guild.channels.cache.find(
    ch => ch.name?.includes('今日の合言葉') && ch.isTextBased()
  );
  if (!channel) {
    console.warn('⚠️ [Cron] 「今日の合言葉」チャンネルが見つかりません');
    return;
  }

  await channel.send({
    embeds: [
      {
        color: 0xf9ca24,
        author: {
          name: 'ひまり | 陽だまりの庭の管理人',
          icon_url: client.user.displayAvatarURL(),
        },
        title: '🌸 今日の庭が開園したよ！',
        description:
          `おはよう！今日も来てくれてありがとう🌞\n\n` +
          `今日の合言葉は…\n\n` +
          `## 「${kwRecord.keyword}」\n\n` +
          `このチャンネルに入力すると **3 ATSC** が届くよ！\n` +
          `受付は **${kwRecord.startTime} 〜 ${kwRecord.endTime}** まで🌿`,
        footer: { text: '陽だまりの庭 • 毎朝コツコツ続けよう🌱' },
        timestamp: new Date().toISOString(),
      },
    ],
  });

  console.log(`📢 [Cron 05:30] 合言葉「${kwRecord.keyword}」の開園告知を投稿しました`);
}

// =========================================================
// initCron — Bot 起動時に呼び出す
// =========================================================
export function initCron(client) {
  // ── 04:00 JST: 合言葉を DB に自動設定 ──────────────────
  cron.schedule(
    '0 4 * * *',
    async () => {
      try {
        const keyword = pickKeyword();
        await setKeyword(keyword, { startTime: '05:30', endTime: '07:30' });
        console.log(`🤖 [Cron 04:00] 合言葉「${keyword}」を自動設定しました（05:30〜07:30）`);
      } catch (err) {
        console.error('❌ [Cron 04:00] 合言葉自動設定エラー:', err);
      }
    },
    { timezone: 'Asia/Tokyo' }
  );

  // ── 05:30 JST: 開園告知を投稿 ──────────────────────────
  cron.schedule(
    '30 5 * * *',
    async () => {
      try {
        const kwRecord = await getTodayKeyword();
        if (!kwRecord) {
          console.warn('⚠️ [Cron 05:30] 合言葉が未設定のため告知をスキップ');
          return;
        }
        await postAnnouncement(client, kwRecord);
      } catch (err) {
        console.error('❌ [Cron 05:30] 開園告知エラー:', err);
      }
    },
    { timezone: 'Asia/Tokyo' }
  );

  // ── 毎月1日 00:01 JST: 前月の月次EXPランキングを司令ルームに通知 ──
  cron.schedule(
    '1 0 1 * *',
    async () => {
      try {
        const guild = client.guilds.cache.get(process.env.DISCORD_GUILD_ID);
        if (!guild) return;

        const channel = guild.channels.cache.find(
          ch => ch.name?.includes('司令ルーム') && ch.isTextBased()
        );
        if (!channel) return;

        // 前月を計算
        const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
        now.setMonth(now.getMonth() - 1);
        const prevMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        const top3 = await getMonthlyRanking(prevMonth, 3);
        if (top3.length === 0) return;

        const MEDALS = ['🥇', '🥈', '🥉'];
        const lines = await Promise.all(
          top3.map(async (log, i) => {
            const member = await guild.members.fetch(log.discordId).catch(() => null);
            const name = member?.displayName ?? `ID:${log.discordId}`;
            return `${MEDALS[i]} **${name}** — ${log.exp} EXP`;
          })
        );

        await channel.send({
          embeds: [
            {
              color: 0xf1c40f,
              author: { name: 'ひまり | 陽だまりの庭の管理人', icon_url: client.user.displayAvatarURL() },
              title: `📅 ${prevMonth} 月次EXP 結果発表！`,
              description: lines.join('\n'),
              footer: { text: `エアドロは !月次エアドロ ${prevMonth} で実行してね` },
              timestamp: new Date().toISOString(),
            },
          ],
        });

        console.log(`📢 [Cron 月初] ${prevMonth} 月次EXPランキングを司令ルームに投稿しました`);
      } catch (err) {
        console.error('❌ [Cron 月初] 月次EXPランキング投稿エラー:', err);
      }
    },
    { timezone: 'Asia/Tokyo' }
  );

  console.log('⏰ Cron スケジュール登録完了（04:00 合言葉設定 / 05:30 開園告知 / 月初 月次EXP集計）');
}
