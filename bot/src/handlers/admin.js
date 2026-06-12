// admin.js — 管理者専用コマンドハンドラ
// 現在実装済みコマンド:
//   !setkeyword [合言葉] [開始HH:mm] [終了HH:mm]
//   !reset @ユーザー — DB上のウォレット登録をリセット
import { setKeyword, getTodayKeyword, todayJST } from './keyword.js';
import { prisma } from '../lib/db.js';
import { hasDawnSeed, mintDawnSeed, transferATSCAmount, sendMATIC } from '../lib/chain.js';
import { getMonthlyRanking } from '../lib/exp.js';

// HH:mm 形式（00:00〜23:59）のバリデーション正規表現
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

// 管理者コマンドを受け付けるチャンネル名（includes 判定）
const ADMIN_CHANNEL = '司令ルーム';

// =========================================================
// エントリーポイント
// =========================================================

export async function handleAdminCommand(message) {
  // ── ① チャンネルガード ─────────────────────────────────
  // 司令ルーム以外からのコマンドは受け付けない
  if (!message.channel.name?.includes(ADMIN_CHANNEL)) {
    // 管理者が誤って別チャンネルで打った場合だけ案内する
    // （一般ユーザーへは無反応 = チャンネルの存在を知らせない）
    if (message.member?.permissions.has('Administrator')) {
      await message.reply({
        content: `⚠️ 管理者コマンドは **${ADMIN_CHANNEL}** チャンネルで使ってね！`,
        allowedMentions: { repliedUser: false },
      });
    }
    return;
  }

  // ── ② 権限ガード ───────────────────────────────────────
  // 司令ルームに入れても Administrator 権限がなければブロック
  if (!message.member?.permissions.has('Administrator')) {
    console.log(
      `🚫 [${ADMIN_CHANNEL}] 権限なしアクセス: ` +
      `${message.author.username}（${message.author.id}）`
    );
    return;
  }

  console.log(
    `🔑 [${ADMIN_CHANNEL}] 管理者コマンド受信: ` +
    `${message.author.username} → "${message.content}"`
  );

  if (message.content.startsWith('!setkeyword')) {
    await handleSetKeyword(message);
  } else if (message.content.startsWith('!mint')) {
    await handleMint(message);
  } else if (message.content.startsWith('!reset')) {
    await handleReset(message);
  } else if (message.content.trim() === '!keyword') {
    await handleCheckKeyword(message);
  } else if (message.content.trim() === '!累計EXP') {
    await handleCumulativeRanking(message);
  } else if (message.content.startsWith('!月次EXP')) {
    await handleMonthlyRanking(message);
  } else if (message.content.startsWith('!月次エアドロ')) {
    await handleMonthlyAirdrop(message);
  } else if (message.content.startsWith('!sendmatic')) {
    await handleSendMatic(message);
  }
}

// =========================================================
// !setkeyword コマンド
// =========================================================

/**
 * !setkeyword [合言葉] [開始時間] [終了時間]
 *
 * 例:
 *   !setkeyword ひまり           → 00:00〜23:59（終日）
 *   !setkeyword ひまり 19:00 21:00
 */
async function handleSetKeyword(message) {
  const rawArgs = message.content.slice('!setkeyword'.length).trim();

  // 引数なし → ヘルプを表示
  if (!rawArgs) {
    await message.reply({
      content:
        '合言葉を指定してね！\n\n' +
        '**使い方:**\n' +
        '`!setkeyword [合言葉]`\n' +
        '`!setkeyword [合言葉] [開始HH:mm] [終了HH:mm]`\n\n' +
        '**例:**\n' +
        '`!setkeyword ひまり`\n' +
        '`!setkeyword ひまり 19:00 21:00`',
      allowedMentions: { repliedUser: false },
    });
    return;
  }

  const args = rawArgs.split(/\s+/);
  const keyword   = args[0];
  const startTime = args[1] ?? '00:00';
  const endTime   = args[2] ?? '23:59';

  // バリデーション: 時間形式チェック
  if (!TIME_REGEX.test(startTime) || !TIME_REGEX.test(endTime)) {
    await message.reply({
      content:
        '⚠️ 時間の形式が正しくないよ！\n\n' +
        '`HH:mm` 形式（例: `19:00`）で入力してね。\n' +
        '`!setkeyword ひまり 19:00 21:00`',
      allowedMentions: { repliedUser: false },
    });
    return;
  }

  // バリデーション: 開始時間 < 終了時間
  const [sH, sM] = startTime.split(':').map(Number);
  const [eH, eM] = endTime.split(':').map(Number);
  if (sH * 60 + sM >= eH * 60 + eM) {
    await message.reply({
      content:
        '⚠️ 開始時間は終了時間より前にしてね！\n' +
        '例: `!setkeyword ひまり 19:00 21:00`',
      allowedMentions: { repliedUser: false },
    });
    return;
  }

  // DB に登録
  let isUpdate, prevKeyword;
  try {
    ({ isUpdate, prevKeyword } = await setKeyword(keyword, { startTime, endTime }));
  } catch (err) {
    console.error('❌ 合言葉設定エラー:', err);
    await message.reply({
      content: '設定中にエラーが起きちゃった😢 もう一度試してみてね！',
      allowedMentions: { repliedUser: false },
    });
    return;
  }

  // 完了メッセージ（実行者へのリプライ）
  const today = todayJST();
  const [year, month, day] = today.split('-');
  const isAllDay = startTime === '00:00' && endTime === '23:59';
  const timeText = isAllDay ? '終日（00:00〜23:59）' : `${startTime}〜${endTime}`;
  const changeNote = isUpdate ? `（前の合言葉: 『${prevKeyword}』→ 変更）` : '（新規設定）';

  await message.reply({
    content:
      `✅ ${year}年${month}月${day}日の合言葉を『**${keyword}**』に、\n` +
      `時間は **${timeText}** にセットしたよ！🌱 ${changeNote}`,
    allowedMentions: { repliedUser: false },
  });

  // 変更の場合は #今日の合言葉 チャンネルに告知を投稿
  if (isUpdate) {
    const channel = message.guild.channels.cache.find(
      ch => ch.name?.includes('今日の合言葉') && ch.isTextBased()
    );
    if (channel) {
      await channel.send({
        embeds: [
          {
            color: 0xff6b9d,
            author: {
              name: 'ひまり | 陽だまりの庭の管理人',
              icon_url: message.client.user.displayAvatarURL(),
            },
            title: '🔄 合言葉が変わったよ！',
            description:
              `今日の合言葉が更新されたよ🌱\n\n` +
              `## 「${keyword}」\n\n` +
              `受付は **${startTime} 〜 ${endTime}** まで🌿\n` +
              `前の合言葉（${prevKeyword}）は無効になったよ。`,
            footer: { text: '陽だまりの庭 • 新しい合言葉でまた来てね！' },
            timestamp: new Date().toISOString(),
          },
        ],
      });
      console.log(`📢 [変更告知] 合言葉「${prevKeyword}」→「${keyword}」をチャンネルに投稿`);
    }
  }

  console.log(
    `📢 [管理者コマンド] ${message.author.username} → 合言葉「${keyword}」${isUpdate ? '変更' : '設定'} ` +
    `(${today} ${startTime}〜${endTime})`
  );
}

// =========================================================
// !mint @ユーザー — DawnSeed（SBT）発行
// =========================================================

/**
 * !mint @ユーザー
 *
 * 指定したDiscordユーザーのウォレットへ DawnSeed をmintする。
 * DBにウォレットが登録されていること・まだ未mintであることを確認してから実行する。
 */
async function handleMint(message) {
  // メンション優先、なければ数字ID（18桁前後）を直打ちで受け付ける
  let discordId, username;

  const mentioned = message.mentions.members?.first();
  if (mentioned) {
    discordId = mentioned.id;
    username  = mentioned.displayName;
  } else {
    const idArg = message.content.split(/\s+/)[1];
    if (!idArg || !/^\d{17,20}$/.test(idArg)) {
      await message.reply({
        content:
          '⚠️ 発行先のユーザーをメンションかIDで指定してね！\n' +
          '例: `!mint @ユーザー名` または `!mint 123456789012345678`',
        allowedMentions: { repliedUser: false },
      });
      return;
    }
    discordId = idArg;
    // サーバーメンバーからユーザー名を取得（取れなければIDで代用）
    const member = await message.guild.members.fetch(discordId).catch(() => null);
    if (!member) {
      await message.reply({
        content: `⚠️ ID \`${discordId}\` のメンバーがサーバーに見つからないよ。IDを確認してね。`,
        allowedMentions: { repliedUser: false },
      });
      return;
    }
    username = member.displayName;
  }

  // ① DBからウォレットアドレスを取得
  const user = await prisma.user.findUnique({ where: { discordId } }).catch(() => null);

  if (!user?.walletAddress) {
    await message.reply({
      content:
        `⚠️ **${username}** はまだウォレットを登録していないよ。\n` +
        `先に \`!登録\` でウォレットを登録してもらってね。`,
      allowedMentions: { repliedUser: false },
    });
    return;
  }

  // ② すでにDawnSeedを持っていないか確認
  let alreadyHas;
  try {
    alreadyHas = await hasDawnSeed(user.walletAddress);
  } catch (err) {
    console.error(`❌ DawnSeed確認エラー: ${username}`, err);
    await message.reply({
      content: '⚠️ 確認中にエラーが起きちゃった😢 もう一度試してみてね！',
      allowedMentions: { repliedUser: false },
    });
    return;
  }

  if (alreadyHas) {
    await message.reply({
      content:
        `⚠️ **${username}**（\`${user.walletAddress}\`）には\n` +
        `すでに DawnSeed が発行されているよ。`,
      allowedMentions: { repliedUser: false },
    });
    return;
  }

  // ③ mint実行
  await message.reply({
    content: `🌱 **${username}** へ DawnSeed をmint中... しばらく待ってね。`,
    allowedMentions: { repliedUser: false },
  });

  let txHash;
  try {
    txHash = await mintDawnSeed(user.walletAddress);
    console.log(`✅ DawnSeed mint成功: ${username}（${discordId}）→ ${user.walletAddress} | TX: ${txHash}`);
  } catch (err) {
    console.error(`❌ DawnSeed mintエラー: ${username}`, err);
    await message.reply({
      content: `❌ mint中にエラーが起きちゃった😢\n\`${err.message ?? err}\``,
      allowedMentions: { repliedUser: false },
    });
    return;
  }

  // ④ ガス代補填：0.5MATICをユーザーウォレットへ自動送金
  try {
    const maticTx = await sendMATIC(user.walletAddress);
    console.log(`✅ MATIC送金完了: ${username} → ${user.walletAddress} | TX: ${maticTx}`);
  } catch (err) {
    console.error(`⚠️ MATIC送金エラー（mint自体は成功）: ${username}`, err);
  }

  // ⑤ 「陽だまりメンバー」ロールを付与
  const MEMBER_ROLE_NAME = '陽だまりメンバー';
  try {
    const role   = message.guild.roles.cache.find(r => r.name === MEMBER_ROLE_NAME);
    const member = await message.guild.members.fetch(discordId);
    if (role && member) {
      await member.roles.add(role);
      console.log(`✅ ロール付与: ${username} → ${MEMBER_ROLE_NAME}`);
    } else {
      console.warn(`⚠️ ロール「${MEMBER_ROLE_NAME}」が見つからないか、メンバーを取得できなかった`);
    }
  } catch (err) {
    console.error(`❌ ロール付与エラー: ${username}`, err);
  }

  await message.reply({
    embeds: [
      {
        color: 0xf1c40f,
        author: {
          name: 'ひまり | 陽だまりの庭の管理人',
          icon_url: message.client.user.displayAvatarURL(),
        },
        title: '🌱 DawnSeed を発行したよ！',
        description:
          `**${username}** に参加証（DawnSeed）を届けたよ！\n\n` +
          `これで合言葉を打つと ATSC が受け取れるようになったよ🎉`,
        fields: [
          { name: '👛 ウォレット', value: `\`${user.walletAddress}\``, inline: false },
          { name: '🔗 TX', value: `\`${txHash}\``, inline: false },
        ],
        footer: { text: '陽だまりの庭 • Polygon Mainnet' },
        timestamp: new Date().toISOString(),
      },
    ],
    allowedMentions: { repliedUser: false },
  });
}

// =========================================================
// !reset @ユーザー — ウォレット登録リセット
// =========================================================

/**
 * !reset @ユーザー
 *
 * 指定したDiscordユーザーのウォレット登録をDBから削除する。
 * 削除後は !登録 から再登録できるようになる。
 * ブロックチェーン上のウォレット自体は削除されない。
 */
async function handleReset(message) {
  // メンション優先、なければ数字ID直打ちを受け付ける
  let discordId, username;

  const mentioned = message.mentions.members?.first();
  if (mentioned) {
    discordId = mentioned.id;
    username  = mentioned.displayName;
  } else {
    const idArg = message.content.split(/\s+/)[1];
    if (!idArg || !/^\d{17,20}$/.test(idArg)) {
      await message.reply({
        content:
          '⚠️ リセットするユーザーをメンションかIDで指定してね！\n' +
          '例: `!reset @ユーザー名` または `!reset 123456789012345678`',
        allowedMentions: { repliedUser: false },
      });
      return;
    }
    discordId = idArg;
    const member = await message.guild.members.fetch(discordId).catch(() => null);
    if (!member) {
      await message.reply({
        content: `⚠️ ID \`${discordId}\` のメンバーがサーバーに見つからないよ。IDを確認してね。`,
        allowedMentions: { repliedUser: false },
      });
      return;
    }
    username = member.displayName;
  }

  // DB からユーザーレコードを検索
  const existing = await prisma.user.findUnique({ where: { discordId } }).catch(() => null);

  if (!existing) {
    await message.reply({
      content: `⚠️ **${username}** はまだウォレットを登録していないよ。`,
      allowedMentions: { repliedUser: false },
    });
    return;
  }

  try {
    // DailyReward（配布履歴）→ WalletLinkToken → User の順に削除（外部キー制約を回避）
    await prisma.dailyReward.deleteMany({ where: { user: { discordId } } });
    await prisma.walletLinkToken.deleteMany({ where: { discordId } });
    await prisma.user.delete({ where: { discordId } });

    await message.reply({
      content:
        `✅ **${username}** のウォレット登録をリセットしたよ！\n` +
        `\`${existing.walletAddress}\`\n\n` +
        `再登録は **#ats_check-in** で \`!登録\` から。`,
      allowedMentions: { repliedUser: false },
    });

    console.log(
      `🗑️ [管理者コマンド] ${message.author.username} → ` +
      `${username}（${discordId}）のウォレット登録をリセット: ${existing.walletAddress}`
    );
  } catch (err) {
    console.error('❌ !reset エラー:', err);
    await message.reply({
      content: '⚠️ リセット中にエラーが起きちゃった😢 もう一度試してみてね！',
      allowedMentions: { repliedUser: false },
    });
  }
}

// =========================================================
// !sendmatic — ガス代補填（MATIC送金）
// =========================================================

async function handleSendMatic(message) {
  let discordId, username;

  const mentioned = message.mentions.members?.first();
  if (mentioned) {
    discordId = mentioned.id;
    username  = mentioned.displayName;
  } else {
    const idArg = message.content.split(/\s+/)[1];
    if (!idArg || !/^\d{17,20}$/.test(idArg)) {
      await message.reply({
        content: '⚠️ ユーザーをメンションかIDで指定してね！\n例: `!sendmatic @ユーザー名`',
        allowedMentions: { repliedUser: false },
      });
      return;
    }
    discordId = idArg;
    const member = await message.guild.members.fetch(discordId).catch(() => null);
    if (!member) {
      await message.reply({
        content: `⚠️ ID \`${discordId}\` のメンバーが見つからないよ。`,
        allowedMentions: { repliedUser: false },
      });
      return;
    }
    username = member.displayName;
  }

  const user = await prisma.user.findUnique({ where: { discordId } }).catch(() => null);
  if (!user?.walletAddress) {
    await message.reply({
      content: `⚠️ **${username}** はウォレットを登録していないよ。`,
      allowedMentions: { repliedUser: false },
    });
    return;
  }

  await message.reply({
    content: `💸 **${username}** へ 0.5 MATIC を送金中...`,
    allowedMentions: { repliedUser: false },
  });

  try {
    const txHash = await sendMATIC(user.walletAddress);
    console.log(`✅ MATIC送金完了: ${username} → ${user.walletAddress} | TX: ${txHash}`);
    await message.reply({
      content:
        `✅ **${username}** へ 0.5 MATIC を送金したよ！\n` +
        `アドレス: \`${user.walletAddress}\`\n` +
        `TX: \`${txHash}\``,
      allowedMentions: { repliedUser: false },
    });
  } catch (err) {
    console.error(`❌ MATIC送金エラー: ${username}`, err);
    await message.reply({
      content: `❌ 送金中にエラーが起きちゃった😢\n\`${err.message ?? err}\``,
      allowedMentions: { repliedUser: false },
    });
  }
}

// =========================================================
// !keyword — 今日の合言葉確認
// =========================================================

async function handleCheckKeyword(message) {
  const kwRecord = await getTodayKeyword().catch(() => null);
  const today = todayJST();

  if (!kwRecord) {
    await message.reply({
      content: `📋 **${today}** の合言葉はまだ設定されていないよ！\n\`!setkeyword [合言葉]\` で設定してね。`,
      allowedMentions: { repliedUser: false },
    });
    return;
  }

  const isAllDay = kwRecord.startTime === '00:00' && kwRecord.endTime === '23:59';
  const timeText = isAllDay ? '終日（00:00〜23:59）' : `${kwRecord.startTime}〜${kwRecord.endTime}`;

  await message.reply({
    content:
      `📋 **${today}** の合言葉\n\n` +
      `🔑 合言葉: **「${kwRecord.keyword}」**\n` +
      `⏰ 受付時間: **${timeText}**`,
    allowedMentions: { repliedUser: false },
  });
}

// =========================================================
// !累計EXP — 累計EXP 上位5名を表示
// =========================================================

async function handleCumulativeRanking(message) {
  const MEDALS = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];

  let users;
  try {
    users = await prisma.user.findMany({
      orderBy: { exp: 'desc' },
      take: 5,
    });
  } catch (err) {
    console.error('❌ ランキング取得エラー:', err);
    await message.reply({
      content: '⚠️ 取得中にエラーが起きちゃった😢 もう一度試してみてね！',
      allowedMentions: { repliedUser: false },
    });
    return;
  }

  if (users.length === 0) {
    await message.reply({
      content: 'まだ参加者がいないよ🌱',
      allowedMentions: { repliedUser: false },
    });
    return;
  }

  // Discord の表示名を取得（取れなければ ID で代用）
  const lines = await Promise.all(
    users.map(async (user, i) => {
      const member = await message.guild.members.fetch(user.discordId).catch(() => null);
      const name = member?.displayName ?? `ID:${user.discordId}`;
      return `${MEDALS[i]} **${name}** — ${user.exp} EXP`;
    })
  );

  await message.reply({
    embeds: [
      {
        color: 0xf1c40f,
        author: {
          name: 'ひまり | 陽だまりの庭の管理人',
          icon_url: message.client.user.displayAvatarURL(),
        },
        title: '🌳 累計EXP ランキング TOP 5',
        description: lines.join('\n'),
        footer: { text: `全${users.length}名表示 • 陽だまりの庭` },
        timestamp: new Date().toISOString(),
      },
    ],
    allowedMentions: { repliedUser: false },
  });
}

// =========================================================
// !月次EXP [YYYY-MM] — 月次EXP ランキング上位5名を表示
// =========================================================

async function handleMonthlyRanking(message) {
  const MEDALS = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];

  // 引数で月を指定できる。省略時は今月
  const arg = message.content.split(/\s+/)[1];
  const yearMonth = arg ?? new Date().toLocaleDateString('ja-JP', {
    timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit',
  }).replace(/(\d+)\/(\d+)/, '$1-$2'); // "YYYY-MM" 形式に変換

  let logs;
  try {
    logs = await getMonthlyRanking(yearMonth);
  } catch (err) {
    console.error('❌ 月次ランキング取得エラー:', err);
    await message.reply({ content: '⚠️ 取得中にエラーが起きたよ😢', allowedMentions: { repliedUser: false } });
    return;
  }

  if (logs.length === 0) {
    await message.reply({
      content: `📊 **${yearMonth}** のEXPデータはまだないよ🌱`,
      allowedMentions: { repliedUser: false },
    });
    return;
  }

  const lines = await Promise.all(
    logs.map(async (log, i) => {
      const member = await message.guild.members.fetch(log.discordId).catch(() => null);
      const name = member?.displayName ?? `ID:${log.discordId}`;
      return `${MEDALS[i]} **${name}** — ${log.exp} EXP`;
    })
  );

  await message.reply({
    embeds: [
      {
        color: 0x3498db,
        author: {
          name: 'ひまり | 陽だまりの庭の管理人',
          icon_url: message.client.user.displayAvatarURL(),
        },
        title: `📅 ${yearMonth} 月次EXP ランキング TOP 5`,
        description: lines.join('\n'),
        footer: { text: '陽だまりの庭 • !月次エアドロ [YYYY-MM] でエアドロ実行' },
        timestamp: new Date().toISOString(),
      },
    ],
    allowedMentions: { repliedUser: false },
  });
}

// =========================================================
// !月次エアドロ [YYYY-MM] — 上位3名に ATSC エアドロ実行
// =========================================================

const AIRDROP_AMOUNTS = ['30', '20', '10']; // 1位・2位・3位
const AIRDROP_MEDALS  = ['🥇', '🥈', '🥉'];

async function handleMonthlyAirdrop(message) {
  const arg = message.content.split(/\s+/)[1];
  const yearMonth = arg ?? new Date().toLocaleDateString('ja-JP', {
    timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit',
  }).replace(/(\d+)\/(\d+)/, '$1-$2');

  // バリデーション: YYYY-MM 形式チェック
  if (!/^\d{4}-\d{2}$/.test(yearMonth)) {
    await message.reply({
      content: '⚠️ 月の指定は `YYYY-MM` 形式でね！\n例: `!月次エアドロ 2026-05`',
      allowedMentions: { repliedUser: false },
    });
    return;
  }

  const top3 = await getMonthlyRanking(yearMonth, 3).catch(() => null);
  if (!top3 || top3.length === 0) {
    await message.reply({
      content: `⚠️ **${yearMonth}** のEXPデータがないよ。月を確認してね！`,
      allowedMentions: { repliedUser: false },
    });
    return;
  }

  await message.reply({
    content: `🚀 **${yearMonth}** 月次エアドロを開始するよ... しばらく待ってね！`,
    allowedMentions: { repliedUser: false },
  });

  const results = [];

  for (let i = 0; i < top3.length; i++) {
    const log    = top3[i];
    const amount = AIRDROP_AMOUNTS[i];
    const medal  = AIRDROP_MEDALS[i];

    // ウォレットアドレスを取得
    const user = await prisma.user.findUnique({ where: { discordId: log.discordId } }).catch(() => null);
    const member = await message.guild.members.fetch(log.discordId).catch(() => null);
    const name = member?.displayName ?? `ID:${log.discordId}`;

    if (!user?.walletAddress) {
      results.push({ medal, name, amount, status: '⚠️ ウォレット未登録', txHash: null });
      continue;
    }

    try {
      const txHash = await transferATSCAmount(user.walletAddress, amount);
      results.push({ medal, name, amount, status: '✅ 完了', txHash });
      console.log(`✅ 月次エアドロ: ${name}（${log.discordId}）→ ${amount} ATSC | TX: ${txHash}`);
    } catch (err) {
      console.error(`❌ 月次エアドロ失敗: ${name}`, err);
      results.push({ medal, name, amount, status: '❌ 失敗', txHash: null });
    }
  }

  const fields = results.map(r => ({
    name: `${r.medal} ${r.name} — ${r.amount} ATSC`,
    value: r.txHash ? `${r.status}\n\`${r.txHash}\`` : r.status,
    inline: false,
  }));

  await message.reply({
    embeds: [
      {
        color: 0x2ecc71,
        author: {
          name: 'ひまり | 陽だまりの庭の管理人',
          icon_url: message.client.user.displayAvatarURL(),
        },
        title: `🎉 ${yearMonth} 月次エアドロ 完了！`,
        fields,
        footer: { text: '陽だまりの庭 • Polygon Mainnet' },
        timestamp: new Date().toISOString(),
      },
    ],
    allowedMentions: { repliedUser: false },
  });
}
