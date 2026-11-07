import { roadPoints, routeStops } from './walking-route'

export default function RouteGuide() {
  return <svg className="route-guide" viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="西大门、图书馆、综合教学楼、体育场、校园水系、建筑工程学院的步行路线">
    <polyline points={roadPoints.map(p=>p.join(',')).join(' ')} />
    {routeStops.map(stop=><circle key={stop.id} cx={roadPoints[stop.index][0]} cy={roadPoints[stop.index][1]} r=".7"/>)}
  </svg>
}
