export type PlaceId = 'library' | 'architecture' | 'gate' | 'teaching' | 'lake' | 'stadium'
export type Character = 'boy' | 'girl'
export const campusImage = '/assets/scenes/campus.png'
export const libraryImage = '/assets/landmarks-v0.1.2/library.png'
export type LandmarkPhoto = { src: string; title: string; width: number; height: number }
export const places: { id: PlaceId; name: string; number: string; x: number; y: number; image: string; description: string; note: string; photos?: LandmarkPhoto[]; crop?: { x: number; y: number; zoom: number } }[] = [
  { id: 'gate', name: '西大门', number: '01', x: 35.4, y: 28.8, image: '/assets/landmarks-v0.1.2/university-name.png', photos: [
    { src: '/assets/landmarks-v0.1.2/university-name.png', title: '河南大学校名', width: 830, height: 272 },
    { src: '/assets/landmarks-v0.1.2/motto.png', title: '校训景观', width: 834, height: 283 },
  ], description: '从河南大学校名，到校训景观，认识校园入口处熟悉的风景。', note: '西大门位于图书馆正前方。两张近景采用你提供的像素图片。' },
  { id: 'library', name: '图书馆', number: '02', x: 53, y: 44, image: libraryImage, photos: [
    { src: libraryImage, title: '图书馆', width: 834, height: 272 },
  ], description: '开阔的屋檐、弧形玻璃幕墙与馆前台阶，在像素里留下熟悉的图书馆轮廓。', note: '此处近景与筑小智对话背景采用同一张图书馆图片。' },
  { id: 'teaching', name: '综合教学楼', number: '03', x: 63, y: 55, image: '/assets/landmarks-v0.1.2/teaching.png', photos: [
    { src: '/assets/landmarks-v0.1.2/teaching.png', title: '综合教学楼', width: 830, height: 283 },
  ], description: '整齐的窗格、明亮的玻璃和楼前的自行车，组成日常上课时熟悉的校园景象。', note: '采用你提供的综合教学楼像素图片；全景标记沿用当前视觉稿的位置。' },
  { id: 'lake', name: '校园水系', number: '04', x: 55, y: 63, image: campusImage, crop: { x: 55, y: 62, zoom: 3.8 }, description: '浅蓝水面、弯曲岸线与绿荫步道，将建筑群温柔地串联起来。', note: '这里展示全景中水系与步道的局部放大，保留原有位置与画风；水岸细节仍为视觉草稿。' },
  { id: 'stadium', name: '志义体育场', number: '05', x: 85, y: 64, image: campusImage, crop: { x: 85, y: 64, zoom: 4.1 }, description: '橙色环形跑道与绿色球场，是校园全景中鲜明的地标。', note: '这里展示志义体育场的局部放大，聚焦跑道、球场与看台；不与另一处运动场混同。' },
  { id: 'architecture', name: '建筑工程学院', number: '06', x: 31, y: 56, image: '/assets/landmarks-v0.1.2/architecture-entry.png', photos: [
    { src: '/assets/landmarks-v0.1.2/architecture-entry.png', title: '建工学院入口', width: 830, height: 374 },
    { src: '/assets/landmarks-v0.1.2/architecture.png', title: '建筑工程学院', width: 834, height: 374 },
  ], description: '从圆形入口与空中连廊，到红砖楼体与通透玻璃，看看建工学院的两处建筑近景。', note: '两张图片均来自你提供的地标像素拼贴，已替换上一版不符实物的展示图。' },
]

// 仅用于检验对话视觉与节奏，不属于正式主线。
export const sampleDialogue = [
  { speaker: '筑小智', tag: '校园知识守护者', text: '你也发现了吗？同一条路，每次走过，都能看见不一样的细节。' },
  { speaker: '你', tag: '河大学生', text: '比如……你帽子上的飞檐，还有手里的蓝色建筑？' },
  { speaker: '筑小智', tag: '校园知识守护者', text: '眼力不错。建筑会留下记忆，至于怎么读懂它——先学会观察。' },
  { speaker: '筑小智', tag: '校园知识守护者', text: '今天就先认识一下这片校园吧。真正的故事，等你准备好了再开始。' },
]

export const references = [
  { title: '01 · 校园原图', src: '/references/campus-original.png', detail: '用于建筑布局、道路、水系与运动场的空间关系；不是游戏背景素材。' },
  { title: '02 · 标记地图', src: '/references/campus-marked.png', detail: '黑圈确定学院重点参考范围；相邻建筑归属及入口不擅自定稿。' },
  { title: '03 · 男女主角', src: '/references/player-design.png', detail: '保留蓝色外套、背包、棕色发型与女主马尾。图中文字和动作规格不视作本阶段已实现。' },
  { title: '04 · 筑小智原海报', src: '/references/zhuxiaozhi-original.jpg', detail: '形象的首要依据：灰瓦飞檐帽、红白服、1931腰带、院徽、图纸筒与蓝色数字建筑模型。海报中的学院字样与任务书不同，需确认最终标志版本。' },
  { title: '05 · 筑小智像素设定', src: '/references/zhuxiaozhi-pixel.png', detail: '用于像素转化参考。原图为角色设定板，未经逐帧检验，不直接作为正式游戏精灵表。' },
  { title: '06 · 画风参考', src: '/references/style-reference.jpg', detail: '仅分析像素颗粒、铺砖、草木层次、俯视角与温暖氛围；不提取受版权保护的游戏素材。' },
]
