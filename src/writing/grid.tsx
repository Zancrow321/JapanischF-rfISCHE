import { Line, Rect } from 'react-native-svg';

/** Übungsraster wie im Schreibheft: Rahmen und gestrichelte Mittellinien. */
export function Grid({ color }: { color: string }) {
  return (
    <>
      <Rect x={0.5} y={0.5} width={108} height={108} stroke={color} strokeWidth={1} fill="none" />
      <Line x1={54.5} y1={0} x2={54.5} y2={109} stroke={color} strokeWidth={0.6} strokeDasharray="3,3" />
      <Line x1={0} y1={54.5} x2={109} y2={54.5} stroke={color} strokeWidth={0.6} strokeDasharray="3,3" />
    </>
  );
}
