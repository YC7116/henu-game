export const SPEEDS=[110,145,185,235,290]
export const START_X=-80, END_X=720, TARGET_X=320, TOLERANCE=35
export function swanX(seconds,round){return START_X+Math.max(0,seconds)*SPEEDS[round]}
export function judge(x){const distance=Math.abs(x-TARGET_X);return {success:distance<=TOLERANCE,distance,accuracy:Math.max(0,Math.round(100-distance/TOLERANCE*100))}}
export function labelForRound(round){return ['轻快游来','轻快一点','速度渐快','越来越快','最后冲刺'][round]}
