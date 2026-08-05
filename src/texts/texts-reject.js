// ===== 伦理拒绝文案 =====
export const REFUSAL_TEXTS = {
  keywords: {
    death: { trigger: ['死', '自杀', '杀人'], response: '这种问题不在牌面讨论范围内。你值得被认真对待，请和信任的人或专业人士聊聊。' },
    medical: { trigger: ['药', '癌症', '手术'], response: '牌不能替代医疗诊断。该看的医生，今天就去约。' },
    curse: { trigger: ['诅咒', '下降头', '报复'], response: '浮生牌不为仇恨提供燃料。请回。' },
    privacy: { trigger: ['他是不是', '她喜不喜欢我', '别人在想什么', '谁害我'], response: '浮生牌只谈你的课题，不替你猜别人的心思。' },
    gamble: { trigger: ['彩票', '中奖', '稳赚', '暴富'], response: '牌不看赌运。天上掉下来的，往往要从别处还回去。' },
  }
};