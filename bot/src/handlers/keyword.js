// keyword.js — 合言葉検知 & ATSC配布ハンドラ（時間制限・Prisma永続化版）
import { transferATSC, hasDawnSeed } from '../lib/chain.js';
import { prisma } from '../lib/db.js';
import { isTooNewAccount, getDaysUntilUnlock } from '../lib/security.js';
import { createLinkToken } from '../lib/linkToken.js';

// =========================================================
// ユーティリティ
// =========================================================

/** 今日の日付を JST で "YYYY-MM-DD" 形式で返す */
export function todayJST() {
  return new Date()
    .toLocaleDateString('ja-JP', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    .replace(/\//g, '-');
}

/** JST の現在時刻を「分換算」で返す */
function nowJSTMins() {
  const jst = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
  return jst.getHours() * 60 + jst.getMinutes();
}

/** "HH:mm" → 分換算 */
function toMins(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/**
 * 現在時刻（JST）が startTime〜endTime の範囲内かチェックする。
 * 境界値: 05:30 と 07:30 はそれぞれ受付開始・終了の瞬間を含む（>= / <=）。
 */
function isWithinTimeWindow(startTime, endTime) {
  const now = nowJSTMins();
  return now >= toMins(startTime) && now <= toMins(endTime);
}

/**
 * 時間外の場合に表示するメッセージを「開始前 / 終了後」で分けて返す
 */
function buildTimeOutsideMessage(username, kwRecord) {
  const now = nowJSTMins();
  if (now < toMins(kwRecord.startTime)) {
    return (
      `${username}、おはよう！合言葉はバッチリだよ🌱\n\n` +
      `でも今はまだひまりちゃんお休み中💤\n` +
      `**${kwRecord.startTime}** になったらまた来てね🌅`
    );
  }
  return (
    `${username}、合言葉はバッチリ！🌱\n\n` +
    `でも今日の受付は **${kwRecord.endTime}** に終わっちゃったんだ💦\n` +
    `また明日の朝スペで一緒に頑張ろうね🌸`
  );
}

// =========================================================
// 合言葉の管理（DailyKeyword テーブル）
// =========================================================

/**
 * 合言葉を DB に設定（upsert）
 * @param {string} keyword
 * @param {{ startTime?: string, endTime?: string, date?: string }} options
 */
/**
 * @returns {{ isUpdate: boolean, prevKeyword: string|null }}
 *   isUpdate: true = 既存レコードを上書き（変更）/ false = 新規作成
 */
export async function setKeyword(keyword, { startTime = '00:00', endTime = '23:59', date = null } = {}) {
  const targetDate = date ?? todayJST();
  const existing = await prisma.dailyKeyword.findUnique({ where: { date: targetDate } });

  await prisma.dailyKeyword.upsert({
    where:  { date: targetDate },
    update: { keyword: keyword.trim(), startTime, endTime },
    create: { date: targetDate, keyword: keyword.trim(), startTime, endTime },
  });

  console.log(`📢 合言葉「${keyword.trim()}」を設定しました（${targetDate} ${startTime}〜${endTime}）`);
  return { isUpdate: !!existing, prevKeyword: existing?.keyword ?? null };
}

/**
 * 本日の合言葉レコードを取得する（フォールバック付き）
 *
 * 優先順位:
 *   1. DB の当日レコード
 *   2. 環境変数 DEFAULT_KEYWORD（将来的にAI自動生成へ差し替え可能）
 *   3. null（設定なし・何もしない）
 *
 * @returns {Promise<{ keyword: string, startTime: string, endTime: string } | null>}
 */
export async function getTodayKeyword() {
  const today  = todayJST();
  const record = await prisma.dailyKeyword.findUnique({ where: { date: today } });
  if (record) return record;

  // フォールバック: .env の DEFAULT_KEYWORD
  // NOTE: ここを AI 生成ロジックに差し替えることで自動化できる
  const defaultKw = process.env.DEFAULT_KEYWORD?.trim();
  if (defaultKw) {
    return { keyword: defaultKw, startTime: '00:00', endTime: '23:59' };
  }

  return null;
}

// =========================================================
// 合言葉ハンドラ（メインロジック）
// =========================================================

export async function handleKeyword(message) {
  // ① 対象チャンネルの判定（「今日の合言葉」を名前に含むチャンネルのみ）
  if (!message.channel.name?.includes('今日の合言葉')) return;

  const content  = message.content.trim().replace(/　/g, ' ');
  const userId   = message.author.id;
  const username = message.member?.displayName ?? message.author.username;
  const today    = todayJST();

  // ──────────────────────────────────
  // チェック① 合言葉の一致確認
  // ──────────────────────────────────
  let kwRecord;
  try {
    kwRecord = await getTodayKeyword();
  } catch (err) {
    console.error('❌ 合言葉取得エラー:', err);
    await message.reply({
      content: `${username}、ごめんね！合言葉の確認中にエラーが起きちゃった😢\nしばらく待ってから試してみて！`,
      allowedMentions: { repliedUser: false },
    });
    return;
  }

  // 合言葉未設定、または入力内容が一致しない → 無視
  if (!kwRecord || content !== kwRecord.keyword) return;

  // ──────────────────────────────────
  // チェック② 受付時間内かどうか
  // ──────────────────────────────────
  if (!isWithinTimeWindow(kwRecord.startTime, kwRecord.endTime)) {
    await message.reply({
      content: buildTimeOutsideMessage(username, kwRecord),
      allowedMentions: { repliedUser: false },
    });
    console.log(`⏰ 時間外アクセス: ${username}（${userId}）${kwRecord.startTime}〜${kwRecord.endTime} 外`);
    return;
  }

  // ──────────────────────────────────
  // ユーザー情報取得（ウォレット確認）
  // ──────────────────────────────────
  let user;
  try {
    user = await prisma.user.findUnique({ where: { discordId: userId } });
  } catch (err) {
    console.error(`❌ ユーザー取得エラー: ${username}`, err);
    await message.reply({
      content: `${username}、ごめんね！確認中にエラーが起きちゃった😢\nもう一度試してみて！`,
      allowedMentions: { repliedUser: false },
    });
    return;
  }

  if (!user?.walletAddress) {
    // ワンタイム登録 URL を生成（失敗してもメッセージは送る）
    let linkUrl = null;
    try {
      linkUrl = await createLinkToken(userId);
    } catch (err) {
      console.error('❌ リンクトークン生成エラー:', err);
    }

    const replyOptions = {
      embeds: [
        {
          color: 0x3498db,
          author: {
            name: 'ひまり | 陽だまりの庭の管理人',
            icon_url: message.client.user.displayAvatarURL(),
          },
          title: '🌱 はじめてだね！ウォレット登録が必要だよ',
          description:
            `**${username}**、合言葉ばっちり！\n\n` +
            `ATSCを受け取るには、最初に一度だけウォレット登録が必要だよ。\n` +
            `下のボタンをクリックすると、Discordアカウントで\n` +
            `自動的にウォレットが作られるよ🎉\n\n` +
            `登録が終わったら、もう一度合言葉を入力してね！`,
          footer: { text: 'リンクは10分間有効だよ。期限が切れたら合言葉を再入力してね🌱' },
        },
      ],
      allowedMentions: { repliedUser: false },
    };

    // DiscordのLinkボタン（リンクが生成できた場合のみ表示）
    if (linkUrl) {
      replyOptions.components = [
        {
          type: 1, // ActionRow
          components: [
            {
              type: 2,  // Button
              style: 5, // Link（外部URL を開くスタイル）
              label: '🌱 ウォレットを作る（Discord認証）',
              url: linkUrl,
            },
          ],
        },
      ];
    }

    await message.reply(replyOptions);
    console.log(`🔗 ウォレット登録リンク送信: ${username}（${userId}） URL: ${linkUrl ?? 'null'}`);
    return;
  }

  // ──────────────────────────────────
  // チェック③ DawnSeed（参加証SBT）保有チェック
  // ──────────────────────────────────
  let seedHolder;
  try {
    seedHolder = await hasDawnSeed(user.walletAddress);
  } catch (err) {
    console.error(`❌ DawnSeed確認エラー: ${username}`, err);
    await message.reply({
      content: `${username}、ごめんね！確認中にエラーが起きちゃった😢\nもう一度試してみて！`,
      allowedMentions: { repliedUser: false },
    });
    return;
  }

  if (!seedHolder) {
    await message.reply({
      embeds: [
        {
          color: 0x95a5a6,
          author: {
            name: 'ひまり | 陽だまりの庭の管理人',
            icon_url: message.client.user.displayAvatarURL(),
          },
          title: '🌱 もう少しだよ！',
          description:
            `**${username}**、合言葉はばっちり！\n\n` +
            `ATSCを受け取るには **DawnSeed（参加証）** が必要なんだ🌸\n\n` +
            `DawnSeedは陽だまりの庭への正式な招待証。\n` +
            `管理人からの配布をもう少し待っててね！`,
          footer: { text: '陽だまりの庭 • 招待制コミュニティ' },
        },
      ],
      allowedMentions: { repliedUser: false },
    });
    console.log(`🚫 DawnSeed未保有でブロック: ${username}（${userId}）ウォレット: ${user.walletAddress}`);
    return;
  }

  // ──────────────────────────────────
  // チェック④ アカウント年齢チェック（Sybil 攻撃対策）
  // ──────────────────────────────────
  if (isTooNewAccount(message.author)) {
    const remaining = getDaysUntilUnlock(message.author);
    await message.reply({
      content:
        `${username}、ごめんね！\n\n` +
        `Discordアカウントが作成されてから **7日** 経過しないと、\n` +
        `ATSCを受け取ることができないんだ😢\n\n` +
        `あと **${remaining}日** で解禁されるよ🌱 それまで待ってね！`,
      allowedMentions: { repliedUser: false },
    });
    console.log(
      `🚫 Sybil対策ブロック: ${username}（${userId}）` +
      ` アカウント作成: ${message.author.createdAt.toLocaleDateString('ja-JP')}`
    );
    return;
  }

  // ──────────────────────────────────
  // チェック⑤ 配布ログを先に作成（二重転送防止）
  // DB の UNIQUE 制約が同時リクエストをブロックする
  // ──────────────────────────────────
  let rewardRecord;
  try {
    rewardRecord = await prisma.dailyReward.create({
      data: { userId: user.id, date: today },
    });
  } catch (dbErr) {
    if (dbErr.code === 'P2002') {
      // 既に今日分が存在する → 重複受取をブロック
      await message.reply({
        content: `${username}、今日はもう受け取り済みだよ！\n明日の朝スペでまた一緒に頑張ろうね🌅`,
        allowedMentions: { repliedUser: false },
      });
      console.log(`⚠️  重複受取をブロック: ${username}（${userId}）日付: ${today}`);
    } else {
      console.error(`❌ 配布ログ作成エラー: ${username}`, dbErr);
      await message.reply({
        content: `${username}、ごめんね！確認中にエラーが起きちゃった😢\nもう一度試してみて！`,
        allowedMentions: { repliedUser: false },
      });
    }
    return;
  }

  // ──────────────────────────────────
  // ATSC 実転送（ログ作成後に実行）
  // ──────────────────────────────────
  let txHash;
  try {
    txHash = await transferATSC(user.walletAddress);
    console.log(`✅ ATSC転送成功: ${username} → ${user.walletAddress} | TX: ${txHash}`);
  } catch (err) {
    // 転送失敗 → DB ログを削除してロールバック（次回また受け取れるようにする）
    console.error(`❌ ATSC転送失敗: ${username}`, err);
    await prisma.dailyReward.delete({ where: { id: rewardRecord.id } }).catch(() => {});
    await message.reply({
      content: `${username}、ごめんね！転送中にエラーが起きちゃった😢\nもう一度試してみて！`,
      allowedMentions: { repliedUser: false },
    });
    return;
  }

  // ──────────────────────────────────
  // TX ハッシュを DB に記録
  // ──────────────────────────────────
  await prisma.dailyReward.update({
    where: { id: rewardRecord.id },
    data:  { txHash },
  }).catch(err => console.error(`❌ TX記録失敗（転送は成功済み TX: ${txHash}）: ${username}`, err));

  // ──────────────────────────────────
  // 成功返信（Embed カード形式）
  // ──────────────────────────────────
  await message.reply({
    embeds: [
      {
        color: 0x2ecc71,
        author: {
          name: 'ひまり | 陽だまりの庭の管理人',
          icon_url: message.client.user.displayAvatarURL(),
        },
        title: '🌱 正解！ よく来てくれたね！',
        description:
          `**${username}** 、合言葉ばっちり！\n` +
          `今日も朝から来てくれてありがとう！\n\n` +
          `**3 ATSC** をプレゼントするね🎉\n` +
          `コツコツ続けると、きっと大樹になれるよ🌳`,
        fields: [
          { name: '✨ 今日の獲得',    value: '**3 ATSC**',      inline: true },
          { name: '🌳 大樹まで',      value: '**540 ATSC**',    inline: true },
          { name: '📅 1日3ATSC配布', value: '約180日で到達！', inline: true },
        ],
        footer: {
          text: `陽だまりの庭 • TX: ${txHash.slice(0, 18)}...`,
        },
        timestamp: new Date().toISOString(),
      },
    ],
    allowedMentions: { repliedUser: false },
  });

  const now = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
  console.log(`✅ [${now}] ${username}（${userId}）に 3 ATSC を配布しました | TX: ${txHash}`);
}
