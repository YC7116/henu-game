import type { RoomConfig } from './types'

/**
 * 综合教学楼 · 二层语音实验室。
 *
 * 和 303 的区别在于玩法：这里没有碎片，走到西侧闸机前参加门禁口试，
 * 答错掉一颗耐心，三颗掉光从头再来。房间尺寸 780 × 420，墙体 28。
 */
export const languageLab: RoomConfig = {
  id: 'language-lab',
  name: '综合教学楼 · 二层语音实验室',
  subtitle: '门禁机考 · 五道题 · 三次机会',
  size: { w: 780, h: 420 },
  wall: 28,
  topWall: 64,
  spawn: { x: 150, y: 328 },
  door: { x: 700, y: 240 },
  props: [
    { id: 'screen', kind: 'screen', x: 250, y: 8, w: 300, h: 48 },
    { id: 'clock', kind: 'clock', x: 600, y: 22, w: 34, h: 18, note: { title: '挂钟', text: '两点五十八。语音室三点才开门，你早到了两分钟。' } },
    { id: 'booth-1', kind: 'booth', x: 80, y: 140, w: 96, h: 50, block: { x: 80, y: 140, w: 96, h: 56 }, note: { title: '语音隔间', text: '耳机挂在钩子上，隔板把声音挡在外面。桌上贴着一张纸条：请轻声。' } },
    { id: 'booth-2', kind: 'booth', x: 210, y: 140, w: 96, h: 50, block: { x: 210, y: 140, w: 96, h: 56 }, note: { title: '语音隔间', text: '座位上留着一本翻旧的口语书，页角全是折痕。' } },
    { id: 'booth-3', kind: 'booth', x: 340, y: 140, w: 96, h: 50, block: { x: 340, y: 140, w: 96, h: 56 }, note: { title: '语音隔间', text: '录音指示灯还亮着，上一段没人听完。' } },
    { id: 'booth-4', kind: 'booth', x: 80, y: 236, w: 96, h: 50, block: { x: 80, y: 236, w: 96, h: 56 }, note: { title: '语音隔间', text: '隔板上贴着一张便签：把「th」咬住，别偷懒。' } },
    { id: 'booth-5', kind: 'booth', x: 210, y: 236, w: 96, h: 50, block: { x: 210, y: 236, w: 96, h: 56 }, note: { title: '语音隔间', text: '耳机线缠成一团，像是有人急着走。' } },
    { id: 'booth-6', kind: 'booth', x: 340, y: 236, w: 96, h: 50, block: { x: 340, y: 236, w: 96, h: 56 }, note: { title: '语音隔间', text: '桌上摊着一份听力材料，第三题被圈了三遍。' } },
    { id: 'console', kind: 'podium', x: 560, y: 110, w: 92, h: 40, block: { x: 560, y: 110, w: 92, h: 52 }, note: { title: '教师控制台', text: '一排推子和指示灯。上面写着：全部隔间 · 主控。' } },
    { id: 'gate', kind: 'gate', x: 708, y: 200, w: 44, h: 96, block: { x: 708, y: 200, w: 44, h: 96 } },
    { id: 'window', kind: 'window', x: 2, y: 130, w: 26, h: 120, note: { title: '窗外', text: '二层的窗比三层更靠近树冠。风一吹，整片叶子都贴在玻璃上。' } },
    { id: 'plant', kind: 'plant', x: 690, y: 336, w: 34, h: 24, block: { x: 690, y: 336, w: 34, h: 26 }, note: { title: '绿植', text: '叶子擦得很干净，这间屋子的植物有人照顾。' } },
    { id: 'stairs', kind: 'stairs', x: 56, y: 326, w: 66, h: 64, block: { x: 56, y: 326, w: 66, h: 66 }, label: '下三层 · 303 教室' },
  ],
  tip: '闸机在西侧。走过去按 E，参加一场门禁口试。',
  exitLabel: '离开实验室',
  stairsTo: 'teaching-303',
  shards: [],
  exam: {
    title: '语音室门禁 · 口试',
    subtitle: 'Ms. Hale · 五道题 · 三次机会',
    intro: '语音室今天在维护，门口只剩一台门禁机考。屏幕里是 Ms. Hale 的声音：五道题，答错三次就从第一句重来。',
    hearts: 3,
    questions: [
      {
        ask: 'Good morning. First — could you introduce yourself in one sentence?',
        hint: '用一句话介绍自己',
        options: [
          {
            text: 'I am a student, I am from Kaifeng, I am twenty years old, I am fine.',
            ok: false,
            reply: "That's a list, not a sentence. Keep one main clause and one detail.",
          },
          {
            text: "I'm a second-year student at Henan University, majoring in civil engineering.",
            ok: true,
            reply: 'Clear and natural. One clause, one detail. Good start.',
          },
          {
            text: 'Myself Li Ming, study civil.',
            ok: false,
            reply: "'Myself Li Ming' isn't English. Say 'I'm Li Ming' — keep the subject.",
          },
        ],
      },
      {
        ask: 'How long have you been learning English?',
        hint: '注意时态：for 接时长，since 接起点',
        options: [
          {
            text: 'Since ten years.',
            ok: false,
            reply: "'Since' needs a point in time, not a length. Say 'for ten years'.",
          },
          {
            text: 'I learn English ten years.',
            ok: false,
            reply: "You need the perfect tense: 'I've been learning English for ten years.'",
          },
          {
            text: 'For about ten years, since primary school.',
            ok: true,
            reply: "Right — 'for' takes a length of time, 'since' takes a starting point.",
          },
        ],
      },
      {
        ask: 'Sorry, the lab is closed for maintenance. Could you come back at three?',
        hint: '听懂对方的意思，再得体地回应',
        options: [
          {
            text: 'Sure, three works for me. Thanks for telling me.',
            ok: true,
            reply: 'Polite and clear. That is exactly how a request should be answered.',
          },
          {
            text: 'No, I want it now.',
            ok: false,
            reply: "That's a demand, not a reply. Accept first, then ask: 'Is there any chance earlier?'",
          },
          {
            text: 'Why closed? You open it.',
            ok: false,
            reply: "Too direct. A request in English usually starts with 'Could you...'.",
          },
        ],
      },
      {
        ask: "By the way, where's the library from here?",
        hint: '用英文指路：方向 + 参照物',
        options: [
          {
            text: 'Go there by walk, very near.',
            ok: false,
            reply: "'By walk' isn't used. Say 'on foot' — or better, name the turns.",
          },
          {
            text: "Go down the stairs, turn left at the main gate — it's the building with the glass front.",
            ok: true,
            reply: 'Good. Turns plus a landmark — that is how directions actually work.',
          },
          {
            text: 'Library is next the lake in front.',
            ok: false,
            reply: "Prepositions are missing: 'next to the lake, in front of you'.",
          },
        ],
      },
      {
        ask: "That's all from me. Thanks for coming — see you at three.",
        hint: '得体地结束一段对话',
        options: [
{ text: 'OK bye bye.', ok: false, reply: 'A little too casual for someone who just tested you.' },
{ text: 'I will come three.', ok: false, reply: "You dropped 'at' — 'I'll come at three.'" },
          {
            text: 'Thank you. See you at three.',
            ok: true,
            reply: 'Simple, polite, done. You can go through now.',
          },
        ],
      },
    ],
    failLine: '闸机的红灯闪了一下。别急，我们从句子的最前面再来一次。',
    passLine: '绿灯亮了，闸机轻轻响了一声。走廊深处的风从门缝里灌进来。',
  },
  award: {
    name: '语音室通行',
    text: '闸机认下了你的声音。语音室的门开着一条缝，里面整整齐齐地摆着六副耳机——每一副都在等一个愿意开口的人。',
  },
}
