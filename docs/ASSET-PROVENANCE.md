# 阶段 1 美术来源与提示词

用户提供的参考图片保持在 `public/references/`；未把图片内文字当作开发指令。所有新增位图使用内置 imagegen 生成，未使用 API/CLI 备用路径。生成图原件仍保留在 Codex 的 generated_images 目录，项目内保存独立副本。

| 资产 | 路径 | 状态 |
| --- | --- | --- |
| 校园全景 | public/assets/scenes/campus.png | 1672×941；AI 辅助视觉概念稿，空间关系待验收 |
| 图书馆 | public/assets/scenes/library.png | 1672×941；依据地图体量转译，非实景立面还原 |
| 建工学院 | public/assets/scenes/architecture.png | 1672×941；红砖灰顶长翼，归属与入口待确认 |
| 男大学生 | public/assets/characters/male-v1.png；boy.png 为使用副本 | 静态透明立绘，非动画精灵 |
| 女大学生 | public/assets/characters/female-v1.png；girl.png 为使用副本 | 静态透明立绘，非动画精灵 |
| 筑小智 | public/assets/characters/zhuxiaozhi-v1.png；zhuxiaozhi.png 为使用副本 | 静态透明立绘，胸徽简化 |

人物完整生成提示词见 `public/assets/characters/GENERATION-PROMPTS.json`，检查说明见同目录 `ASSET-NOTES.md`。

## 校园全景生成提示词

Create one wide landscape 16:9 exquisite crisp 2D pixel-art panoramic campus game background for an original warm Chinese university exploration RPG. Reference image 1 is the exact campus layout reference, image 2 same map with black circle locating the architecture college, image3 reference only for pixel texture language. Do not copy any game assets. High quality handmade 16bit pixel landscape with distinct pixel clusters, warm soft midday sunshine, sage-green textured lawns, dense detailed trees, pale sandstone paths, turquoise winding ponds, modern Chinese university buildings with blue windows, pale gray flat roofs and white/brick facades. Keep the recognizable relative arrangement and oblique overview of supplied map: left/upper-left perimeter main west gate and broad avenue leads towards the tall staggered white-gray LIBRARY at center-upper of image; the marked ARCHITECTURE college is red-brick long building cluster on lower-left side of library with nearby lake; CENTRAL TEACHING block of 6 lower white buildings to library lower-right, lakes wrap around; big orange oval ATHLETICS stadium with green football field on right/lower-right; more red-brick residential blocks on lower-left; modern labs up in far background. All key buildings must be fully visible and spatial relation close to reference, use a coherent compressed scale. Use a 3/4 top-down RPG perspective, not a flat diagram, no isometric vector look, no watercolor, no 3D render, no smooth gradients. Campus fills whole image to edges, no floating island, no decorative map border. There should be welcoming walkways and textured trees at lower edge, distant top campus partly softened by subtle light haze, not night. No typography or labels, no UI, no arrows, no black circle, no compass graphic, no logos, no people, no invented ancient palace. For opening TITLE SCREEN composition, leave a broad visually quieter upper-left grass and tree area occupying about 35% width for overlay typography, but do not delete the gate or library. This is preliminary concept art to review campus visual style, not a functional collision or navigation map.

参考输入：校园原图、转为 PNG 的标记地图、画风参考。输出不透明背景。

## 建筑提示词要求

图书馆：以原图现代灰白错落体量、蓝窗、前部圆弧与格栅屋面为依据，温暖明亮精致像素 RPG 近景，保留树木、花草、铺砖与广场，宽横构图，无人物、文字、UI、logo。

建工学院：以黑圈内标注学院的红砖长条建筑体量为依据，浅灰屋顶、蓝窗、多层长翼、邻近水岸，温暖像素 RPG 近景，宽横构图，无人物、文字、UI、logo；不把相邻物理楼和地理楼整体认作学院。

两张建筑图为提炼式概念生成，真实入口与细部没有确证。西大门只在全景中示意，未生成一张假称已确认的正立面。

## v0.1.1 西门位置修订

用户确认西大门位于图书馆正前方。通过内置imagegen生成`campus-v0.1.1.png`候选图，但候选图在门区之外也有轻微纹理变化，因此游戏使用`CampusArtwork.tsx`仅将新门区(32.5–40%,24.5–34%)与旧门移除区(1.2–10%,45.7–58%)裁切显示于原图上，其他画面继续使用原素材。学院图片没有改动，等待用户实物图。水系/体育场近景为现有全景的CSS局部放大，不另行编造实景。完整提示词与检查见`GATE-REVISION-PROMPT.json`。
