import type { PlaceId } from './content'

// Footpath centres traced against campus.png. Values are percentages of the
// artwork, not surveyed coordinates. Extra bends follow paving around facades.
export const roadPoints: [number, number][] = [
  [36.7,32.5],[38.48,33.71],[39.64,35],[39.5,39.65],[41.52,42.11],
  [41.9,43.27],[44.48,45.94],[45.7,48.46],[47.5,50.04],[49,51.63],
  [50.58,53.5],[51.5,53.23],[52.5,51.9],
  [50.58,53.5],[50.8,55],[53,55.44],[54.88,60.06],[57.48,61.4],
  [60.46,62.95],[63.28,65.15],[63.4,64.8],
  [66.04,62.05],[67.84,60.65],[70.74,59.46],[72.14,57.67],[74.34,56.65],
  [76.28,58.3],[77.1,59.59],[77.4,60.56],[77.34,63.74],[77.62,64.85],
  [78.1,68.7],
  [76.46,67.3],[75.5,66.09],[75.28,69.25],[75.14,69.59],[73.08,71.7],
  [71.08,73.8],[68.8,75.6],[67.4,74.19],[65.28,72.2],[65.34,69.61],
  [63.46,69.24],[59.76,69.56],[57.18,69.85],[54.52,70.29],[52,71],
  [49.28,73.41],[47.4,74],[45.08,74.26],[42.14,72.95],[39.96,73.07],
  [37.98,72.83],[36.1,70.7],[34.7,69.1],[33,67.6],[31.3,65],
]

// The display numbers are the user's landmark numbers; the visit order places
// the stadium before the water, as requested for this route review.
export const routeStops: { id: PlaceId; name: string; number: string; index: number }[] = [
  { id:'gate',name:'西大门',number:'01',index:0 },
  { id:'library',name:'图书馆',number:'02',index:12 },
  { id:'teaching',name:'综合教学楼',number:'03',index:20 },
  { id:'stadium',name:'志义体育场',number:'04',index:31 },
  { id:'lake',name:'校园水系',number:'05',index:46 },
  { id:'architecture',name:'建筑工程学院',number:'06',index:56 },
]
