// 复用统一数据库适配层（SQLite 或 Postgres 自动切换）
const db = require('./db');
const path = require('path');

// ============================================================
//  CSMZ 校园匹配 · 第二代问卷题库
//  设计依据：
//   - Big Five 人格模型（性格维度）
//   - Chapman 五种爱的语言（情感沟通维度）
//   - 依恋理论（情感沟通维度）
//   - Schwartz 价值观问卷（价值观维度）
//   - Sternberg 爱情三元理论（价值观维度）
//
//  5 维度 × 5 题 = 25 题，每题 4 选项
//  选项分数 1-5（代表在该维度光谱上的位置）
//  per-question weight 1.0-2.0（影响该题对维度得分的贡献）
// ============================================================

const questions = [
  // ========== 价值观（Values）==========
  {
    category: 'values',
    content: '当你想象一段理想的恋爱关系，最先浮现在脑海的画面是？',
    options: [
      { text: '两个人像最好的朋友，无话不谈、彼此信任', score: 5, dimension: 'values' },
      { text: '各自独立成长，又能在关键时刻互相支撑', score: 4, dimension: 'values' },
      { text: '充满激情和浪漫，每天都像偶像剧', score: 3, dimension: 'values' },
      { text: '稳定踏实，像家人一样可靠', score: 2, dimension: 'values' }
    ],
    type: 'single',
    weight: 1.8,
    order_num: 1
  },
  {
    category: 'values',
    content: '关于"三观一致"，你的真实想法是？',
    options: [
      { text: '必须高度一致，否则迟早会出问题', score: 5, dimension: 'values' },
      { text: '大方向一致就行，细节可以磨合', score: 4, dimension: 'values' },
      { text: '有差异才有新鲜感，不必强求一致', score: 2, dimension: 'values' },
      { text: '没想过这个问题，看感觉吧', score: 1, dimension: 'values' }
    ],
    type: 'single',
    weight: 1.6,
    order_num: 4
  },
  {
    category: 'values',
    content: '恋爱中，你对"个人空间"的需求是？',
    options: [
      { text: '需要大量独处时间，不希望被打扰', score: 2, dimension: 'values' },
      { text: '适度空间就好，每天保持联系', score: 3, dimension: 'values' },
      { text: '希望高频互动，最好天天在一起', score: 4, dimension: 'values' },
      { text: '完全融合，不分彼此才是一家人', score: 5, dimension: 'values' }
    ],
    type: 'single',
    weight: 1.5,
    order_num: 7
  },
  {
    category: 'values',
    content: '如果朋友和恋人同时需要你帮忙，你会？',
    options: [
      { text: '看事情紧急程度，谁更急就帮谁', score: 5, dimension: 'values' },
      { text: '优先恋人，爱情更重要', score: 4, dimension: 'values' },
      { text: '优先朋友，友谊更长久', score: 2, dimension: 'values' },
      { text: '让他们自己协商，我不掺和', score: 1, dimension: 'values' }
    ],
    type: 'single',
    weight: 1.2,
    order_num: 10
  },
  {
    category: 'values',
    content: '你认为恋爱中"坦诚"的边界在哪里？',
    options: [
      { text: '完全透明，包括手机密码都可以共享', score: 5, dimension: 'values' },
      { text: '大事必须坦白，小事可以保留', score: 4, dimension: 'values' },
      { text: '各自有隐私权，不主动问也不主动说', score: 2, dimension: 'values' },
      { text: '看对方的安全感需求来调整', score: 3, dimension: 'values' }
    ],
    type: 'single',
    weight: 1.4,
    order_num: 13
  },

  // ========== 性格特质（Personality）==========
  {
    category: 'personality',
    content: '在一个陌生的社交场合（比如社团迎新），你通常？',
    options: [
      { text: '主动打招呼，很快和新朋友打成一片', score: 5, dimension: 'personality' },
      { text: '等别人来搭话，顺其自然', score: 3, dimension: 'personality' },
      { text: '只和认识的人待在一起', score: 2, dimension: 'personality' },
      { text: '能不去就不去，社交很消耗能量', score: 1, dimension: 'personality' }
    ],
    type: 'single',
    weight: 1.5,
    order_num: 2
  },
  {
    category: 'personality',
    content: '做一个重要决定时，你更依赖？',
    options: [
      { text: '理性分析，列出优缺点再决定', score: 5, dimension: 'personality' },
      { text: '直觉和第一感觉', score: 3, dimension: 'personality' },
      { text: '询问信任的人的意见', score: 4, dimension: 'personality' },
      { text: '拖到最后时刻才做决定', score: 1, dimension: 'personality' }
    ],
    type: 'single',
    weight: 1.3,
    order_num: 5
  },
  {
    category: 'personality',
    content: '面对全新的挑战（比如转专业/参加比赛），你的第一反应？',
    options: [
      { text: '兴奋，立刻开始规划', score: 5, dimension: 'personality' },
      { text: '先评估风险再决定', score: 4, dimension: 'personality' },
      { text: '有点紧张，但会试一试', score: 3, dimension: 'personality' },
      { text: '本能想逃避，待在舒适区更安全', score: 1, dimension: 'personality' }
    ],
    type: 'single',
    weight: 1.4,
    order_num: 8
  },
  {
    category: 'personality',
    content: '你表达情绪的方式更接近？',
    options: [
      { text: '写在脸上，开心或不开心一眼就能看出', score: 5, dimension: 'personality' },
      { text: '会表达，但需要对方主动关心', score: 4, dimension: 'personality' },
      { text: '只在很亲近的人面前才表露', score: 2, dimension: 'personality' },
      { text: '习惯自己消化，很少外露', score: 1, dimension: 'personality' }
    ],
    type: 'single',
    weight: 1.6,
    order_num: 11
  },
  {
    category: 'personality',
    content: '你的生活节奏偏向？',
    options: [
      { text: '快节奏，喜欢高效填满每一天', score: 5, dimension: 'personality' },
      { text: '有计划但留有余地', score: 4, dimension: 'personality' },
      { text: '随性，走一步看一步', score: 2, dimension: 'personality' },
      { text: '慢节奏，享受当下的慵懒', score: 1, dimension: 'personality' }
    ],
    type: 'single',
    weight: 1.2,
    order_num: 14
  },

  // ========== 生活方式（Lifestyle）==========
  {
    category: 'lifestyle',
    content: '理想中的周末怎么过？',
    options: [
      { text: '户外活动，爬山/骑行/逛公园', score: 5, dimension: 'lifestyle' },
      { text: '和朋友探店、看电影、逛街', score: 4, dimension: 'lifestyle' },
      { text: '宅家追剧/打游戏/看书', score: 2, dimension: 'lifestyle' },
      { text: '睡到自然醒，然后随便点点外卖', score: 1, dimension: 'lifestyle' }
    ],
    type: 'single',
    weight: 1.3,
    order_num: 3
  },
  {
    category: 'lifestyle',
    content: '你的消费习惯更接近？',
    options: [
      { text: '精打细算，每月固定存钱', score: 2, dimension: 'lifestyle' },
      { text: '该花就花，但不会超前消费', score: 3, dimension: 'lifestyle' },
      { text: '看心情，遇到喜欢的就买', score: 4, dimension: 'lifestyle' },
      { text: '及时行乐，月光也无所谓', score: 5, dimension: 'lifestyle' }
    ],
    type: 'single',
    weight: 1.2,
    order_num: 6
  },
  {
    category: 'lifestyle',
    content: '你的作息通常？',
    options: [
      { text: '早睡早起（23:00 前睡）', score: 2, dimension: 'lifestyle' },
      { text: '规律作息（0:00 前睡）', score: 3, dimension: 'lifestyle' },
      { text: '偶尔熬夜（1:00 左右）', score: 4, dimension: 'lifestyle' },
      { text: '资深夜猫子（2:00 后）', score: 5, dimension: 'lifestyle' }
    ],
    type: 'single',
    weight: 1.1,
    order_num: 9
  },
  {
    category: 'lifestyle',
    content: '关于运动健身，你的状态？',
    options: [
      { text: '每周规律运动 3 次以上', score: 5, dimension: 'lifestyle' },
      { text: '每周 1-2 次，保持基本健康', score: 4, dimension: 'lifestyle' },
      { text: '偶尔动一动，全凭心情', score: 2, dimension: 'lifestyle' },
      { text: '能躺着绝不坐着', score: 1, dimension: 'lifestyle' }
    ],
    type: 'single',
    weight: 1.0,
    order_num: 12
  },
  {
    category: 'lifestyle',
    content: '你理想中的约会方式？',
    options: [
      { text: '一起体验新鲜事物（展览/运动/旅行）', score: 5, dimension: 'lifestyle' },
      { text: '找家安静的咖啡馆深度聊天', score: 3, dimension: 'lifestyle' },
      { text: '吃饭+看电影经典组合', score: 4, dimension: 'lifestyle' },
      { text: '宅在一起做饭/追剧/打游戏', score: 2, dimension: 'lifestyle' }
    ],
    type: 'single',
    weight: 1.1,
    order_num: 15
  },

  // ========== 情感沟通（Communication）==========
  {
    category: 'communication',
    content: '你觉得最能感受到"被爱"的方式是？',
    options: [
      { text: '对方说暖心的话，经常表达肯定', score: 5, dimension: 'communication' },
      { text: '对方默默帮你做事、照顾你', score: 4, dimension: 'communication' },
      { text: '收到精心准备的礼物和惊喜', score: 3, dimension: 'communication' },
      { text: '高质量的陪伴，放下手机专注彼此', score: 4, dimension: 'communication' }
    ],
    type: 'single',
    weight: 1.8,
    order_num: 16
  },
  {
    category: 'communication',
    content: '和恋人发生分歧时，你倾向于？',
    options: [
      { text: '当天就说清楚，不隔夜', score: 5, dimension: 'communication' },
      { text: '冷静后再理性沟通', score: 4, dimension: 'communication' },
      { text: '先退一步，等情绪平复再说', score: 2, dimension: 'communication' },
      { text: '希望对方先来哄我', score: 1, dimension: 'communication' }
    ],
    type: 'single',
    weight: 1.9,
    order_num: 17
  },
  {
    category: 'communication',
    content: '当你情绪低落时，最希望对方？',
    options: [
      { text: '认真倾听并给出建议', score: 5, dimension: 'communication' },
      { text: '给予情感共鸣，表示理解', score: 4, dimension: 'communication' },
      { text: '默默陪伴在身边就好', score: 3, dimension: 'communication' },
      { text: '想办法逗我开心，转移注意力', score: 2, dimension: 'communication' }
    ],
    type: 'single',
    weight: 1.5,
    order_num: 18
  },
  {
    category: 'communication',
    content: '你理想的日常联系频率？',
    options: [
      { text: '随时分享生活点滴，想到就说', score: 5, dimension: 'communication' },
      { text: '早晚问候 + 有事就聊', score: 4, dimension: 'communication' },
      { text: '每天固定时间聊一会儿', score: 3, dimension: 'communication' },
      { text: '有事才联系，不喜欢闲聊', score: 1, dimension: 'communication' }
    ],
    type: 'single',
    weight: 1.4,
    order_num: 19
  },
  {
    category: 'communication',
    content: '恋爱中你更在意对方的哪种反馈？',
    options: [
      { text: '认真听我说话，记住我提过的小事', score: 5, dimension: 'communication' },
      { text: '在我需要时及时出现', score: 4, dimension: 'communication' },
      { text: '主动分享 TA 的生活给我', score: 3, dimension: 'communication' },
      { text: '给我足够的独处空间', score: 2, dimension: 'communication' }
    ],
    type: 'single',
    weight: 1.3,
    order_num: 20
  },

  // ========== 未来规划（Future）==========
  {
    category: 'future',
    content: '毕业后你的首选方向？',
    options: [
      { text: '留在长沙/大学所在城市', score: 3, dimension: 'future' },
      { text: '去一线城市闯一闯', score: 5, dimension: 'future' },
      { text: '回家乡发展', score: 2, dimension: 'future' },
      { text: '还没想好，看机会', score: 1, dimension: 'future' }
    ],
    type: 'single',
    weight: 1.6,
    order_num: 21
  },
  {
    category: 'future',
    content: '你理想的职业发展方向？',
    options: [
      { text: '稳定优先（体制内/国企/教师）', score: 2, dimension: 'future' },
      { text: '高薪挑战（互联网/金融/创业）', score: 5, dimension: 'future' },
      { text: '兴趣驱动（做什么不重要，开心就好）', score: 4, dimension: 'future' },
      { text: '工作生活平衡，不卷', score: 3, dimension: 'future' }
    ],
    type: 'single',
    weight: 1.4,
    order_num: 22
  },
  {
    category: 'future',
    content: '你对恋爱和婚姻的关系怎么看？',
    options: [
      { text: '恋爱就是以结婚为目标', score: 5, dimension: 'future' },
      { text: '先恋爱，合适了再考虑结婚', score: 4, dimension: 'future' },
      { text: '享受当下，不急着考虑婚姻', score: 2, dimension: 'future' },
      { text: '不婚主义/还没想过', score: 1, dimension: 'future' }
    ],
    type: 'single',
    weight: 1.7,
    order_num: 23
  },
  {
    category: 'future',
    content: '理想状态下，你希望和伴侣的居住方式？',
    options: [
      { text: '同居，每天在一起', score: 5, dimension: 'future' },
      { text: '各自住，周末情侣', score: 3, dimension: 'future' },
      { text: '同小区/附近，保持适度距离', score: 4, dimension: 'future' },
      { text: '看经济条件再说', score: 2, dimension: 'future' }
    ],
    type: 'single',
    weight: 1.3,
    order_num: 24
  },
  {
    category: 'future',
    content: '对方的家庭背景对你来说？',
    options: [
      { text: '很重要，需要门当户对', score: 5, dimension: 'future' },
      { text: '会考虑，但不是决定性因素', score: 4, dimension: 'future' },
      { text: '主要看 TA 这个人', score: 2, dimension: 'future' },
      { text: '完全不在意', score: 1, dimension: 'future' }
    ],
    type: 'single',
    weight: 1.2,
    order_num: 25
  }
];

function initQuestions() {
  // 先清空旧题目 + 旧答案（因为维度分数计算方式变了）
  db.serialize(async () => {
    db.run('DELETE FROM answers');
    db.run('DELETE FROM questions');
    // 重置自增 ID：SQLite 用 sqlite_sequence，Postgres 用 ALTER SEQUENCE
    if (db.isPostgres) {
      db.run('ALTER SEQUENCE questions_id_seq RESTART WITH 1');
    } else {
      db.run('DELETE FROM sqlite_sequence WHERE name="questions"');
    }
    db.run('DELETE FROM matches'); // 旧匹配结果也清空，因为 reasons 格式可能变

    const stmt = db.prepare(`
      INSERT INTO questions (category, content, options, type, weight, order_num, is_active)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `);

    for (const q of questions) {
      stmt.run(
        q.category,
        q.content,
        JSON.stringify(q.options),
        q.type,
        q.weight,
        q.order_num
      );
    }

    stmt.finalize(() => {
      db.get('SELECT COUNT(*) as count FROM questions', (err, row) => {
        if (err) {
          console.error('初始化失败:', err);
        } else {
          console.log(`✅ 第二代问卷初始化完成！共导入 ${row.count} 道题目`);
          console.log('');
          console.log('📊 维度分布:');
          const dims = {};
          for (const q of questions) {
            const label = {
              values: '价值观',
              personality: '性格特质',
              lifestyle: '生活方式',
              communication: '情感沟通',
              future: '未来规划'
            }[q.category];
            dims[label] = (dims[label] || 0) + 1;
          }
          for (const [k, v] of Object.entries(dims)) {
            console.log(`   ${k}: ${v} 题`);
          }
          console.log('');
          console.log('🧹 已同步清除旧 answers / matches（维度算法已升级）');
          console.log('💡 请重新填写问卷以获得准确的维度评分');
        }
        db.close();
      });
    });
  });
}

initQuestions();
