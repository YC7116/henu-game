import { asset } from './asset-path'
export type PlaceId = 'library' | 'architecture' | 'gate' | 'teaching' | 'lake' | 'stadium'
export type Character = 'boy' | 'girl'
export const campusImage = asset('/assets/scenes/campus.png')
export const libraryImage = asset('/assets/landmarks-v0.1.2/library.png')
export type LandmarkPhoto = { src: string; title: string; width: number; height: number; crop?: { x: number; y: number; zoom: number } }
export const places: { id: PlaceId; name: string; number: string; x: number; y: number; image: string; description: string; note: string; photos?: LandmarkPhoto[]; crop?: { x: number; y: number; zoom: number } }[] = [
  { id: 'gate', name: '西大门', number: '01', x: 35.4, y: 28.8, image: asset('/assets/landmarks-v0.1.2/university-name.png'), photos: [
    { src: asset('/assets/landmarks-v0.1.2/university-name.png'), title: '河南大学校名', width: 830, height: 272 },
    { src: asset('/assets/landmarks-v0.1.2/motto.png'), title: '校训景观', width: 834, height: 283 },
  ], description: '从河南大学校名，到校训景观，认识校园入口处熟悉的风景。', note: '西大门位于图书馆正前方。两张近景采用你提供的像素图片。' },
  { id: 'library', name: '图书馆', number: '02', x: 53, y: 44, image: libraryImage, photos: [
    { src: libraryImage, title: '图书馆', width: 834, height: 272 },
  ], description: '开阔的屋檐、弧形玻璃幕墙与馆前台阶，在像素里留下熟悉的图书馆轮廓。', note: '此处近景与筑小智对话背景采用同一张图书馆图片。' },
  { id: 'teaching', name: '综合教学楼', number: '03', x: 63, y: 55, image: asset('/assets/landmarks-v0.1.2/teaching.png'), photos: [
    { src: asset('/assets/landmarks-v0.1.2/teaching.png'), title: '综合教学楼', width: 830, height: 283 },
  ], description: '整齐的窗格、明亮的玻璃和楼前的自行车，组成日常上课时熟悉的校园景象。', note: '采用你提供的综合教学楼像素图片；全景标记沿用当前视觉稿的位置。' },
  { id: 'lake', name: '校园水系', number: '05', x: 55, y: 63, image: campusImage, photos: [
    { src: asset('/assets/scenes/swan-lakeside.png'), title: '黑天鹅湖畔', width: 1672, height: 941 },
    { src: campusImage, title: '水岸与步道', width: 1672, height: 941, crop: { x: 55, y: 62, zoom: 3.8 } },
  ], description: '树影落在水面上，黑天鹅从岸边悠然游过。举起手机，试着抓住它与取景轮廓重合的瞬间。', note: '沿水岸看看风景，也可以参加五轮黑天鹅抓拍。点击快门或按空格拍摄，速度会逐轮加快。' },
  { id: 'stadium', name: '志义体育场', number: '04', x: 85, y: 64, image: campusImage, crop: { x: 85, y: 64, zoom: 4.1 }, description: '橙色环形跑道与绿色球场，是校园全景中鲜明的地标。', note: '这里展示志义体育场的局部放大，聚焦跑道、球场与看台；不与另一处运动场混同。' },
  { id: 'architecture', name: '建筑工程学院', number: '06', x: 31, y: 56, image: asset('/assets/landmarks-v0.1.2/architecture-entry.png'), photos: [
    { src: asset('/assets/landmarks-v0.1.2/architecture-entry.png'), title: '建工学院入口', width: 830, height: 374 },
    { src: asset('/assets/landmarks-v0.1.2/architecture.png'), title: '建筑工程学院', width: 834, height: 374 },
  ], description: '从圆形入口与空中连廊，到红砖楼体与通透玻璃，看看建工学院的两处建筑近景。', note: '两张图片均来自你提供的地标像素拼贴，已替换上一版不符实物的展示图。' },
]

// 仅用于检验对话视觉与节奏，不属于正式主线。
export const sampleDialogue = [
  { speaker:'你', tag:'河大学生', text:'你好！你的帽子好特别。你是谁呀？' },
  { speaker:'筑小智', tag:'校园知识守护者', text:'我？你可以猜猜看。提示一下，我熟悉这里的建筑，也喜欢到处寻找有趣的东西。' },
  { speaker:'你', tag:'河大学生', text:'难道你是校园里的……神秘建筑师？' },
  { speaker:'筑小智', tag:'校园知识守护者', text:'哈哈，算你猜对一半。我叫筑小智，是这片校园的知识守护者。' },
  { speaker:'你', tag:'河大学生', text:'知识守护者？那你手里拿的是什么？' },
  { speaker:'筑小智', tag:'校园知识守护者', text:'一块建筑碎片。我发现校园里还有几块，它们好像原本属于同一样东西。' },
  { speaker:'你', tag:'河大学生', text:'集齐之后能拼出什么？' },
  { speaker:'筑小智', tag:'校园知识守护者', text:'现在告诉你，就少了一点探索的乐趣。要不要和我一起找找？' },
  { speaker:'你', tag:'河大学生', text:'好啊，从哪里开始？' },
  { speaker:'筑小智', tag:'校园知识守护者', text:'先去图书馆吧。说不定在那里，能找到第一块碎片的线索。' },
]
export const repeatGateDialogue = [{ speaker:'筑小智', tag:'校园知识守护者', text:'图书馆就在前面，先去那里看看吧。' }]


export const references = [
  { title: '01 · 校园原图', src: '/references/campus-original.png', detail: '用于建筑布局、道路、水系与运动场的空间关系；不是游戏背景素材。' },
  { title: '02 · 标记地图', src: '/references/campus-marked.png', detail: '黑圈确定学院重点参考范围；相邻建筑归属及入口不擅自定稿。' },
  { title: '03 · 男女主角', src: '/references/player-design.png', detail: '保留蓝色外套、背包、棕色发型与女主马尾。图中文字和动作规格不视作本阶段已实现。' },
  { title: '04 · 筑小智原海报', src: '/references/zhuxiaozhi-original.jpg', detail: '形象的首要依据：灰瓦飞檐帽、红白服、1931腰带、院徽、图纸筒与蓝色数字建筑模型。海报中的学院字样与任务书不同，需确认最终标志版本。' },
  { title: '05 · 筑小智像素设定', src: '/references/zhuxiaozhi-pixel.png', detail: '用于像素转化参考。原图为角色设定板，未经逐帧检验，不直接作为正式游戏精灵表。' },
  { title: '06 · 画风参考', src: '/references/style-reference.jpg', detail: '仅分析像素颗粒、铺砖、草木层次、俯视角与温暖氛围；不提取受版权保护的游戏素材。' },
]

// 水系区域：观察黑天鹅 → 抓拍挑战。具体结果对话在 SwanMission 中。
export const lakeDialogue = [
  {
    "speaker": "你",
    "tag": "河大学生",
    "text": "等等，水里那几只是黑天鹅吗？"
  },
  {
    "speaker": "筑小智",
    "tag": "校园知识守护者",
    "text": "是啊。这段路的风景，它们每天都要巡视几遍。"
  },
  {
    "speaker": "你",
    "tag": "河大学生",
    "text": "听起来比你还熟悉校园。"
  },
  {
    "speaker": "筑小智",
    "tag": "校园知识守护者",
    "text": "水里的事，我确实得让它们三分。"
  },
  {
    "speaker": "你",
    "tag": "河大学生",
    "text": "我想拍一张，可它们一直在游。"
  },
  {
    "speaker": "筑小智",
    "tag": "校园知识守护者",
    "text": "那就试试抓住刚刚好的瞬间。拿出手机吧。"
  },
  {
    "speaker": "你",
    "tag": "河大学生",
    "text": "有什么诀窍？"
  },
  {
    "speaker": "筑小智",
    "tag": "校园知识守护者",
    "text": "看取景框里的轮廓。等黑天鹅游过来，与轮廓重合时，按下快门。"
  },
  {
    "speaker": "你",
    "tag": "河大学生",
    "text": "听起来不难。"
  },
  {
    "speaker": "筑小智",
    "tag": "校园知识守护者",
    "text": "一共五次机会，会越来越快。先别急着说这句话。"
  },
  {
    "speaker": "你",
    "tag": "河大学生",
    "text": "来吧，让你看看我的反应！"
  }
]
export const repeatLakeDialogue = [{speaker:'筑小智',tag:'校园知识守护者',text:'碎片已经收好了。这次，就给自己留一张喜欢的照片吧。'}]
