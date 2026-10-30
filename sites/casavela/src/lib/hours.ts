// Geometry of the one-day bar in the hours card: where each opening span starts and how wide it is, as a share
// of a fixed axis (9:00 to 20:00), plus the tick marks. Pure data; the card draws it with HTML and CSS.

import type { OpeningSpan } from '../content/site';

export interface DaySegment extends OpeningSpan {
  /** Left edge and width as percentages of the axis. */
  left: number;
  width: number;
}

export interface DayTick {
  label: string;
  left: number;
}

const AXIS_START = 9 * 60;
const AXIS_END = 20 * 60;
const TICKS = [9, 12, 15, 18];

/** "9:30" to minutes after midnight. */
export function toMinutes(time: string): number {
  const [hours, minutes = '0'] = time.split(':');
  return Number(hours) * 60 + Number(minutes);
}

const percent = (minutes: number): number =>
  Math.round(((minutes - AXIS_START) / (AXIS_END - AXIS_START)) * 10000) / 100;

export function daySegments(spans: OpeningSpan[]): DaySegment[] {
  return spans.map((span) => {
    const from = toMinutes(span.from);
    const to = toMinutes(span.to);
    return { ...span, left: percent(from), width: percent(to) - percent(from) };
  });
}

export function dayTicks(): DayTick[] {
  return TICKS.map((hour) => ({
    label: `${hour}:00`,
    left: percent(hour * 60),
  }));
}
