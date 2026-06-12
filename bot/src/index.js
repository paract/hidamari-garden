import 'dotenv/config'; // 必ず最初の行に置く（他のimportより先にenvを読み込むため）
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { handleKeyword } from './handlers/keyword.js';
import { handleAdminCommand } from './handlers/admin.js';
import { registerWallet } from './lib/walletStore.js';
import { isExpChannel, addExp, getNextEvolution, addReactionGivenExp, addReactionReceivedExp } from './lib/exp.js';
import { isTooNewAccount, getDaysUntilUnlock } from './lib/security.js';
import { initCron } from './lib/cron.js';
import { createLinkToken } from './lib/linkToken.js';
import { prisma } from './lib/db.js';
import { transferATSCAmount } from './lib/chain.js';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,       // 要: Developer Portal で "Message Content Intent" をONに
    GatewayIntentBits.GuildMessageReactions, // 🌸リアクションEXP検知に必要
  ],
  partials: [
    Partials.Channel,
    Partials.Message,  // キャッシュされていない古いメッセージへのリアクションを検知するために必要
    Partials.Reaction, // 同上
    Partials.User,     // リアクションしたユーザー情報を取得するために必要
  ],
});

// =========================================================
// ロール定義（名前・色・用途）
// =========================================================
const ROLE_DEFINITIONS = [
  { name: 'Visitor', color: 0x95a5a6, hoist: false }, // グレー：初期メンバー
  { name: 'Sprout',  color: 0x2ecc71, hoist: true  }, // 緑：SBT認証済み
  { name: 'Bloom',   color: 0xff6b9d, hoist: true  }, // ピンク：開花ステージ
  { name: 'Ancient', color: 0xf1c40f, hoist: true  }, // 金：大樹ステージ（最上位）
];

// =========================================================
// 起動時ロール初期化（存在しない場合のみ作成）
// =========================================================
async function initRoles(guild) {
  console.log('\n🌿 ロール初期化チェック中...');

  for (const def of ROLE_DEFINITIONS) {
    const exists = guild.roles.cache.find(r => r.name === def.name);

    if (exists) {
      console.log(`  ✓ 「${def.name}」 は既に存在します`);
    } else {
      await guild.roles.create({
        name: def.name,
        color: def.color,
        hoist: def.hoist, // trueにするとメンバーリストに別表示される
        reason: '陽だまりの庭 Bot による自動初期化',
      });
      console.log(`  ✅ 「${def.name}」 を新規作成しました`);
    }
  }

  console.log('🌸 ロール初期化 完了！\n');
}

// =========================================================
// Ready イベント：Bot起動完了時
// =========================================================
client.once('clientReady', async () => {
  console.log('========================================');
  console.log(`✨ ${client.user.tag} 起動完了！`);
  console.log('   陽だまりの庭の管理人・ひまりとして準備完了だよ！');
  console.log('========================================\n');

  const guild = client.guilds.cache.get(process.env.DISCORD_GUILD_ID);
  if (!guild) {
    console.error('❌ エラー: サーバーが見つかりません。DISCORD_GUILD_ID を確認してください。');
    return;
  }

  // キャッシュを最新状態に更新してからロール確認
  await guild.members.fetch();
  await initRoles(guild);

  console.log('👀 合言葉チャンネルの監視を開始します...');
  console.log('   対象: チャンネル名に「今日の合言葉」を含むチャンネル\n');

  // Cron スケジューラ起動（04:00 合言葉自動設定 / 05:30 開園告知）
  initCron(client);
});

// =========================================================
// guildMemberAdd イベント：新規メンバー参加時
// =========================================================
client.on('guildMemberAdd', async (member) => {
  if (member.user.bot) return;

  const username = member.displayName ?? member.user.username;
  console.log(`🌱 新メンバー参加: ${username}（${member.id}）`);

  // Visitor ロールを付与
  const visitorRole = member.guild.roles.cache.find(r => r.name === 'Visitor');
  if (visitorRole) {
    await member.roles.add(visitorRole).catch((err) =>
      console.error(`❌ Visitorロール付与失敗: ${username}`, err)
    );
  }

  // ウェルカムDM を送信（DM無効のユーザーはスキップ）
  try {
    const url = await createLinkToken(member.id);
    await member.send({
      embeds: [
        {
          color: 0xf1c40f,
          author: {
            name: 'ひまり | 陽だまりの庭の管理人',
            icon_url: member.client.user.displayAvatarURL(),
          },
          title: '🌸 陽だまりの庭へようこそ！',
          description:
            `**${username}**、来てくれてありがとう！\n\n` +
            `陽だまりの庭では、朝活に参加するたびに\n` +
            `**ATSC トークン**が届くよ🌱\n\n` +
            `まず最初に、下のボタンからウォレットを作ってね。\n` +
            `Discordアカウントで1クリックするだけで完了するよ✨\n\n` +
            `登録が済んだら、朝のスペースに参加して\n` +
            `**#📝今日の合言葉** チャンネルで合言葉を入力してね！`,
          fields: [
            {
              name: '📅 朝活スペース',
              value: '毎朝 **5:30〜** 開催中！',
              inline: true,
            },
            {
              name: '🪙 参加報酬',
              value: '合言葉で **3 ATSC** 獲得',
              inline: true,
            },
          ],
          footer: { text: '⏰ このリンクは10分間有効だよ。期限が切れたら #ats_check-in で !登録 と送ってね！' },
        },
      ],
      components: [
        {
          type: 1,
          components: [
            {
              type: 2,
              style: 5,
              label: '🌱 ウォレットを作る（1クリックで完了）',
              url,
            },
          ],
        },
      ],
    });
    console.log(`📨 ウェルカムDM送信: ${username}（${member.id}）`);
  } catch (err) {
    // DM無効の場合はスキップ（エラーではない）
    console.log(`📭 ウェルカムDM送信スキップ（DM無効の可能性）: ${username}`);
  }
});

// =========================================================
// messageCreate イベント：メッセージ受信時
// =========================================================
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // ── 司令ルーム デバッグログ ────────────────────────────────────────
  if (message.channel.name?.includes('司令ルーム')) {
    const isAdmin = message.member?.permissions.has('Administrator') ?? false;
    console.log(
      `🔍 [司令ルーム] ${isAdmin ? '👑管理者' : '一般ユーザー'}: ` +
      `${message.author.username}（${message.author.id}） → "${message.content}"`
    );
  }

  // ── EXP 加算（対象チャンネル × コマンド以外のメッセージのみ） ──────
  // コマンド（! 始まり）はカウントしない（コマンドスパム対策）
  if (isExpChannel(message.channel.name) && !message.content.startsWith('!')) {
    addExp(message.author.id).catch(err =>
      console.error('❌ EXP加算エラー:', err)
    );
  }

  // !登録 — ウォレット登録リンク発行（#ats_cheak-in 専用）
  if (message.content.trim() === '!登録') {
    await handleRegister(message);
    return;
  }

  // 管理者専用コマンド（権限チェックは admin.js 内で行う）
  if (message.content.startsWith('!setkeyword') || message.content.startsWith('!mint') || message.content.startsWith('!reset') || message.content.trim() === '!keyword' || message.content.trim() === '!累計EXP' || message.content.startsWith('!月次EXP') || message.content.startsWith('!月次エアドロ')) {
    await handleAdminCommand(message);
    return;
  }

  // !ステータス — EXP 確認コマンド
  if (message.content.trim() === '!ステータス') {
    await handleStatus(message);
    return;
  }

  // !convert — EXP を ATSC に変換するコマンド
  if (message.content.trim() === '!convert') {
    await handleConvert(message);
    return;
  }

  // !wallet 0x... でウォレットアドレスを登録する
  if (message.content.startsWith('!wallet ')) {
    const address = message.content.slice('!wallet '.length).trim();

    // Sybil 攻撃対策: アカウント作成 7 日未満はブロック
    if (isTooNewAccount(message.author)) {
      const remaining = getDaysUntilUnlock(message.author);
      await message.reply({
        content:
          `Discordアカウントが作成されてから **7日** 経過しないと\n` +
          `ウォレットを登録できないよ😢\n\n` +
          `あと **${remaining}日** で登録できるようになるよ🌱 待っててね！`,
        allowedMentions: { repliedUser: false },
      });
      console.log(
        `🚫 Sybil対策: ウォレット登録ブロック: ${message.author.username}` +
        ` アカウント作成: ${message.author.createdAt.toLocaleDateString('ja-JP')}`
      );
      return;
    }

    // 簡易バリデーション：0x で始まる42文字のアドレス形式かチェック
    if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
      await message.reply({
        content: 'ウォレットアドレスの形式が正しくないみたい😢\n`!wallet 0x...`（42文字）の形で送ってね！',
        allowedMentions: { repliedUser: false },
      });
      return;
    }

    try {
      await registerWallet(message.author.id, address);
      await message.reply({
        content: `✅ ウォレットアドレスを登録したよ！\n\`${address}\`\n次に合言葉を入力すると、ATSCが届くよ🌱`,
        allowedMentions: { repliedUser: false },
      });
      console.log(`📝 ウォレット登録: ${message.author.username}（${message.author.id}）→ ${address}`);
    } catch (err) {
      if (err.message === 'WALLET_ALREADY_REGISTERED') {
        await message.reply({
          content: `そのウォレットアドレスはすでに別のアカウントで登録されているよ😢\n別のアドレスで試してね！`,
          allowedMentions: { repliedUser: false },
        });
      } else {
        console.error('❌ ウォレット登録エラー:', err);
        await message.reply({
          content: `登録中にエラーが起きちゃった😢\nもう一度試してみて！`,
          allowedMentions: { repliedUser: false },
        });
      }
    }
    return;
  }

  try {
    await handleKeyword(message);
  } catch (error) {
    console.error('❌ keyword ハンドラでエラーが発生しました:', error);
  }
});

// =========================================================
// messageReactionAdd イベント：🌸リアクション検知
// =========================================================
client.on('messageReactionAdd', async (reaction, user) => {
  // Bot のリアクションは無視
  if (user.bot) return;

  // Partial（未キャッシュ）の場合はフェッチして完全なオブジェクトを取得
  try {
    if (reaction.partial) await reaction.fetch();
    if (reaction.message.partial) await reaction.message.fetch();
  } catch (err) {
    console.error('❌ リアクションフェッチ失敗:', err);
    return;
  }

  // 🌸 と ❣️ 以外は無視
  const EXP_REACTION_EMOJIS = ['🌸', '❣️'];
  if (!EXP_REACTION_EMOJIS.includes(reaction.emoji.name)) return;

  // 対象チャンネル以外は無視
  if (!isExpChannel(reaction.message.channel.name)) return;

  // Bot のメッセージへのリアクションは無視
  if (reaction.message.author?.bot) return;

  // 自分のメッセージへの自己リアクションは無視
  const authorId  = reaction.message.author?.id;
  const reactorId = user.id;
  if (authorId === reactorId) return;

  // 🌸を押した人に +1 EXP（1日5回上限）
  try {
    const result = await addReactionGivenExp(reactorId);
    if (result === 'added') {
      console.log(`${reaction.emoji.name} リアクションEXP +1: ${user.username}（${reactorId}）`);
    } else if (result === 'limit_reached') {
      console.log(`⚠️  リアクション上限到達: ${user.username}（${reactorId}）`);
    }
  } catch (err) {
    console.error('❌ リアクション送信EXP加算エラー:', err);
  }

  // 🌸をもらった人に +2 EXP
  if (authorId) {
    try {
      const added = await addReactionReceivedExp(authorId);
      if (added) {
        console.log(`${reaction.emoji.name} リアクション受信EXP +2: ${reaction.message.author.username}（${authorId}）`);
      }
    } catch (err) {
      console.error('❌ リアクション受信EXP加算エラー:', err);
    }
  }
});

// =========================================================
// エラーハンドリング
// =========================================================
client.on('error', (error) => {
  console.error('❌ Discord クライアントエラー:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('❌ 未処理の Promise エラー:', error);
});

// =========================================================
// !ステータス — EXP 確認コマンド
// 「✒️ひまりの記録帳」チャンネル専用
// =========================================================
async function handleStatus(message) {
  const username = message.member?.displayName ?? message.author.username;

  // 対象チャンネル以外では短いリダイレクトメッセージを返す
  if (!message.channel.name?.includes('ひまりの記録帳')) {
    await message.reply({
      content: '`!ステータス` は **✒️ひまりの記録帳** チャンネルで聞いてね！',
      allowedMentions: { repliedUser: false },
    });
    return;
  }

  // ユーザー情報（EXP + ウォレットアドレス）を取得
  let user;
  try {
    user = await prisma.user.findUnique({ where: { discordId: message.author.id } });
  } catch (err) {
    console.error(`❌ ユーザー取得エラー: ${username}`, err);
    await message.reply({
      content: `${username}、ごめんね！確認中にエラーが起きちゃった😢\nもう一度試してみて！`,
      allowedMentions: { repliedUser: false },
    });
    return;
  }

  // ウォレット未登録 → レコードなし
  if (!user) {
    await message.reply({
      content:
        `${username}、まだウォレットの登録が済んでいないみたい！\n\n` +
        `ウォレットを登録すると EXP が記録されるよ🌱\n` +
        `**#✅ats_check-in** で \`!登録\` と送ってね！`,
      allowedMentions: { repliedUser: false },
    });
    return;
  }

  const exp = user.exp;

  // 次の進化ステージを取得
  let nextEvo = null;
  try {
    nextEvo = await getNextEvolution(exp);
  } catch (err) {
    console.error('❌ 進化情報取得エラー:', err);
  }

  const fields = [
    {
      name: '👛 ウォレットアドレス',
      value: `\`${user.walletAddress}\``,
      inline: false,
    },
    {
      name: '📊 EXP の貯め方',
      value:
        '「☕陽だまりラウンジ」と「📝今日の合言葉」でのメッセージ → **+1**（1分に1回）\n' +
        '🌸❣️リアクションを押す → **+1**（1日5回まで）\n' +
        '🌸❣️リアクションをもらう → **+2**',
      inline: false,
    },
  ];

  if (nextEvo) {
    const remaining = nextEvo.requiredExp - exp;
    fields.push({
      name: `🌱 次の進化 → ${nextEvo.stageName} (Level ${nextEvo.level})`,
      value:
        `必要ATSC: **${nextEvo.requiredAtsc}** / 必要EXP: **${nextEvo.requiredExp}**\n` +
        `あと **${remaining} EXP** で到達！`,
      inline: false,
    });
  } else {
    fields.push({
      name: '🌳 大樹の境地',
      value: '全ステージ到達済み！陽だまりの庭の守護者だね✨',
      inline: false,
    });
  }

  await message.reply({
    embeds: [
      {
        color: 0xf1c40f,
        author: {
          name: 'ひまり | 陽だまりの庭の管理人',
          icon_url: message.client.user.displayAvatarURL(),
        },
        title: '🌟 貢献ポイント確認',
        description: `**${username}** さんの現在の累計 EXP は **${exp}** だよ！`,
        fields,
        footer: { text: '陽だまりの庭 • コツコツ続けると大樹になれるよ🌳' },
        timestamp: new Date().toISOString(),
      },
    ],
    allowedMentions: { repliedUser: false },
  });

  console.log(`📊 !ステータス: ${username}（${message.author.id}） EXP: ${exp}`);
}

// =========================================================
// !登録 — ウォレット登録リンク発行（#ats_cheak-in 専用）
// =========================================================
async function handleRegister(message) {
  const username = message.member?.displayName ?? message.author.username;

  // チャンネル制限: ats_check-in（または旧表記 cheak-in）以外では案内のみ
  if (!message.channel.name?.includes('check-in') && !message.channel.name?.includes('cheak-in')) {
    await message.reply({
      content: '`!登録` は **✅ats_check-in** チャンネルで使ってね！',
      allowedMentions: { repliedUser: false },
    });
    return;
  }

  // Sybil対策: アカウント作成7日未満はブロック
  if (isTooNewAccount(message.author)) {
    const remaining = getDaysUntilUnlock(message.author);
    await message.reply({
      content:
        `${username}、Discordアカウントが作成されてから **7日** 経過しないと\n` +
        `登録できないよ😢\n\nあと **${remaining}日** で登録できるようになるよ🌱`,
      allowedMentions: { repliedUser: false },
    });
    return;
  }

  // すでに登録済みか確認
  const existing = await prisma.user.findUnique({
    where: { discordId: message.author.id },
  }).catch(() => null);

  if (existing) {
    await message.reply({
      content:
        `${username}、ウォレットはすでに登録済みだよ✅\n` +
        `**#📝今日の合言葉** で合言葉を入力するとATSCが届くよ🌱`,
      allowedMentions: { repliedUser: false },
    });
    return;
  }

  // ワンタイム登録URLを生成して送信
  try {
    const url = await createLinkToken(message.author.id);
    await message.reply({
      embeds: [
        {
          color: 0xf1c40f,
          author: {
            name: 'ひまり | 陽だまりの庭の管理人',
            icon_url: message.client.user.displayAvatarURL(),
          },
          title: '🌱 登録リンクを発行したよ！',
          description:
            `**${username}**、下のボタンをクリックするだけで完了だよ✨\n\n` +
            `Discordアカウントで認証すると、ウォレットが自動で作られるよ🎉\n` +
            `登録が終わったら **#📝今日の合言葉** で合言葉を入力してね！`,
          footer: { text: '⏰ リンクは10分間有効。期限切れは !登録 で再発行できるよ🌱' },
        },
      ],
      components: [
        {
          type: 1,
          components: [
            {
              type: 2,
              style: 5,
              label: '🌱 ウォレットを作る（1クリックで完了）',
              url,
            },
          ],
        },
      ],
      allowedMentions: { repliedUser: false },
    });
    console.log(`🔗 登録リンク発行: ${username}（${message.author.id}）`);
  } catch (err) {
    console.error('❌ 登録リンク生成エラー:', err);
    await message.reply({
      content: `ごめんね😢 リンクの生成中にエラーが起きちゃった。もう一度試してみて！`,
      allowedMentions: { repliedUser: false },
    });
  }
}

// =========================================================
// !convert — EXP を ATSC に変換（✒️ひまりの記録帳 専用）
// =========================================================

// 変換処理中のユーザーIDを追跡（二重実行防止）
const convertingUsers = new Set();

async function handleConvert(message) {
  const username = message.member?.displayName ?? message.author.username;

  // ✒️ひまりの記録帳 以外では案内のみ
  if (!message.channel.name?.includes('ひまりの記録帳')) {
    await message.reply({
      content: '`!convert` は **✒️ひまりの記録帳** チャンネルで使ってね！',
      allowedMentions: { repliedUser: false },
    });
    return;
  }

  // ユーザー情報（EXP + ウォレットアドレス）を取得
  let user;
  try {
    user = await prisma.user.findUnique({ where: { discordId: message.author.id } });
  } catch (err) {
    console.error(`❌ !convert ユーザー取得エラー: ${username}`, err);
    await message.reply({
      content: `ごめんね😢 確認中にエラーが起きちゃった。もう一度試してみて！`,
      allowedMentions: { repliedUser: false },
    });
    return;
  }

  // ウォレット未登録
  if (!user) {
    await message.reply({
      content:
        `${username}、まだウォレットの登録が済んでいないよ！\n` +
        `**#✅ats_check-in** で \`!登録\` から始めてね🌱`,
      allowedMentions: { repliedUser: false },
    });
    return;
  }

  // 二重実行チェック（連打対策）
  if (convertingUsers.has(message.author.id)) {
    await message.reply({
      content: `${username}、変換中だよ！完了するまで少し待ってね🌱`,
      allowedMentions: { repliedUser: false },
    });
    return;
  }

  // DB から変換レートを取得（デフォルト 10 EXP = 0.1 ATSC）
  let rate = 10;
  try {
    const setting = await prisma.systemSettings.findUnique({ where: { key: 'exp_to_atsc_rate' } });
    if (setting) rate = Number(setting.value);
  } catch (err) {
    console.error('❌ !convert レート取得エラー:', err);
  }

  const exp = user.exp;
  const units = Math.floor(exp / rate); // 0.1 ATSC 単位数
  const atscAmountStr = (units * 0.1).toFixed(1); // 小数点1桁（例: "0.1", "1.0"）

  // 最低 0.1 ATSC 分の EXP がないと変換できない
  if (units < 1) {
    await message.reply({
      content:
        `${username}、変換するにはもう少し EXP が必要だよ！\n\n` +
        `現在の EXP: **${exp}**\n` +
        `変換に必要な最低 EXP: **${rate}**\n\n` +
        `「☕陽だまりラウンジ」や「📝今日の合言葉」で活動すると EXP が貯まるよ🌱`,
      allowedMentions: { repliedUser: false },
    });
    return;
  }

  // 消費する EXP を計算（端数は切り捨てて残す）
  const expToDeduct = units * rate;
  const remainingExp = exp - expToDeduct;

  // 変換処理中フラグをセット（finally で必ず解除）
  convertingUsers.add(message.author.id);

  try {
    // ① 先に EXP を DB から差し引く（転送失敗時は戻す）
    try {
      await prisma.user.update({
        where: { discordId: message.author.id },
        data:  { exp: { decrement: expToDeduct } },
      });
    } catch (err) {
      console.error(`❌ !convert EXP更新エラー: ${username}`, err);
      await message.reply({
        content: `ごめんね😢 変換処理中にエラーが起きちゃった。もう一度試してみて！`,
        allowedMentions: { repliedUser: false },
      });
      return;
    }

    // ② ATSC を転送
    let txHash;
    try {
      txHash = await transferATSCAmount(user.walletAddress, atscAmountStr);
      console.log(
        `✅ !convert 完了: ${username}（${message.author.id}）` +
        ` ${expToDeduct} EXP → ${atscAmountStr} ATSC | TX: ${txHash}`
      );
    } catch (err) {
      // 転送失敗 → EXP を元に戻す
      console.error(`❌ !convert ATSC転送エラー: ${username}`, err);
      try {
        await prisma.user.update({
          where: { discordId: message.author.id },
          data:  { exp: { increment: expToDeduct } },
        });
      } catch (rollbackErr) {
        console.error(`❌ !convert EXP ロールバックエラー: ${username}`, rollbackErr);
      }
      await message.reply({
        content:
          `❌ ATSC の転送中にエラーが起きちゃった😢\n` +
          `EXP は元に戻したよ。もう一度試してみてね！\n` +
          `\`${err.message ?? err}\``,
        allowedMentions: { repliedUser: false },
      });
      return;
    }

    // ③ 完了報告
    await message.reply({
      embeds: [
        {
          color: 0x2ecc71,
          author: {
            name: 'ひまり | 陽だまりの庭の管理人',
            icon_url: message.client.user.displayAvatarURL(),
          },
          title: '🌿 EXP → ATSC 変換完了！',
          description: `**${username}** の EXP を ATSC に変換したよ🎉`,
          fields: [
            {
              name: '💫 変換結果',
              value: `**${expToDeduct} EXP** → **${atscAmountStr} ATSC**`,
              inline: false,
            },
            {
              name: '📊 変換レート',
              value: `${rate} EXP = 0.1 ATSC`,
              inline: true,
            },
            {
              name: '📦 残り EXP',
              value: `**${remainingExp} EXP**`,
              inline: true,
            },
            {
              name: '🔗 TX',
              value: `\`${txHash}\``,
              inline: false,
            },
          ],
          footer: { text: '陽だまりの庭 • Polygon Mainnet' },
          timestamp: new Date().toISOString(),
        },
      ],
      allowedMentions: { repliedUser: false },
    });
  } finally {
    // 成功・失敗にかかわらず必ずフラグを解除する
    convertingUsers.delete(message.author.id);
  }
}

// =========================================================
// Bot ログイン
// =========================================================
client.login(process.env.DISCORD_TOKEN);
