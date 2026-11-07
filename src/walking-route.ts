import type { PlaceId } from './content'

// Footpath centres traced against campus.png. Values are percentages of the
// artwork, not surveyed coordinates. Extra bends follow paving around facades.
export const roadPoints: [number, number][] = [
  [36.7,32.5],[38.6,33.5],[40,35],[40.1,38.8],[41.4,41.9],
  [42.5,43.7],[44,45.3],[45.7,47.4],[47.5,49.4],[49,51.2],
  [50.7,53.5],[51.5,52.8],[52.5,51.9],
  [50.7,53.5],[50.8,55],[52.4,56.5],[55,59],[57.6,61.4],
  [60.1,63.8],[62.8,66],[63.4,64.8],
  [65.8,62.9],[68.2,61.5],[70.5,60.1],[72.5,58.1],[74.1,57.5],
  [75.8,58.3],[77.1,59.8],[78,61.2],[77.7,63.1],[77.5,65.7],
  [78.1,68.7],
  [76.7,67.3],[75.5,66.3],[75.4,68.4],[74.9,69.8],[73.2,71.7],
  [71.2,73.8],[68.8,75.6],[67.4,74.4],[65.4,72.2],[65.1,69.4],
  [63.1,70.3],[60,70.2],[57.3,70.7],[54.4,70.5],[52,71],
  [49.4,73.2],[47.4,74],[45.2,73.2],[42.5,73.8],[40.2,73.5],
  [38.1,72.4],[36.1,70.7],[34.7,69.1],[33,67.6],[31.3,65],
]

// The display numbers are the user's landmark numbers; the visit order places
// the stadium before the water, as requested for this route review.
export const routeStops: { id: PlaceId; name: string; number: string; index: number }[] = [
  { id:'gate',name:'西大门',number:'01',index:0 },
  { id:'library',name:'图书馆',number:'02',index:12 },
  { id:'teaching',name:'综合教学楼',number:'03',index:20 },
  { id:'stadium',name:'志义体育场',number:'05',index:31 },
  { id:'lake',name:'校园水系',number:'04',index:46 },
  { id:'architecture',name:'建筑工程学院',number:'06',index:56 },
]
