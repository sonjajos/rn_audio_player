import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Canvas, Picture, Skia } from "@shopify/react-native-skia";
import {
  useSharedValue,
  useDerivedValue,
  withTiming,
  cancelAnimation,
  Easing,
} from "react-native-reanimated";

interface WaveformSeekerProps {
  peaks: number[] | null;
  currentPositionMs: number;
  durationMs: number;
  width: number;
  height?: number;
  isPlaying?: boolean;
}

const HEIGHT = 72;
const CARD_PADDING = 12;

// Loaded waveform colors
const BAR_INACTIVE = "#00E5FF22";
const BAR_ACTIVE = "#00E5FF";
const BAR_ACTIVE_TIP = "#FFFFFF";

// Placeholder colors
const LINE_COLOR = "#00E5FF33";
const TICK_COLOR = "#00E5FF55";

function formatMs(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function WaveformSeeker({
  peaks,
  currentPositionMs,
  durationMs,
  width,
  height = HEIGHT,
  isPlaying = false,
}: WaveformSeekerProps) {
  const canvasWidth = width - CARD_PADDING * 2;
  const canvasWidthShared = useSharedValue(canvasWidth);
  const peaksShared = useSharedValue<number[]>(peaks ?? []);
  const progress = useSharedValue(0);

  useEffect(() => {
    canvasWidthShared.value = canvasWidth;
  }, [canvasWidth]);

  useEffect(() => {
    peaksShared.value = peaks ?? [];
  }, [peaks]);

  useEffect(() => {
    const target = durationMs > 0 ? currentPositionMs / durationMs : 0;
    if (isPlaying) {
      progress.value = withTiming(target, {
        duration: 120,
        easing: Easing.linear,
      });
    } else {
      cancelAnimation(progress);
      progress.value = target;
    }
  }, [currentPositionMs, durationMs, isPlaying]);

  const picture = useDerivedValue(() => {
    "worklet";
    const cw = canvasWidthShared.value;
    const peakArr = peaksShared.value;
    const isLoading = peakArr.length === 0;

    const p = Math.max(0, Math.min(1, progress.value));
    const progressX = p * cw;
    const midY = height / 2;

    const recorder = Skia.PictureRecorder();
    const canvas = recorder.beginRecording(Skia.XYWHRect(0, 0, cw, height));

    if (isLoading) {
      const linePaint = Skia.Paint();
      linePaint.setColor(Skia.Color(LINE_COLOR));
      linePaint.setStrokeWidth(1);
      canvas.drawLine(0, midY, cw, midY, linePaint);

      const TICK_COUNT = 60;
      const tickPaint = Skia.Paint();
      tickPaint.setColor(Skia.Color(TICK_COLOR));
      tickPaint.setStrokeWidth(1.5);
      const tickPath = Skia.Path.Make();
      for (let i = 0; i < TICK_COUNT; i++) {
        const x = (i / (TICK_COUNT - 1)) * cw;
        const envelope = 0.18 + 0.22 * Math.abs(Math.sin(i * 0.53));
        const tickH = envelope * midY;
        tickPath.moveTo(x, midY - tickH);
        tickPath.lineTo(x, midY + tickH);
      }
      canvas.drawPath(tickPath, tickPaint);
    } else {
      const barCount = peakArr.length;
      const barW = cw / barCount;
      const gap = Math.max(1, barW * 0.25);
      const bW = Math.max(1, barW - gap);
      const radius = bW / 2;

      const inactivePath = Skia.Path.Make();
      const activePath = Skia.Path.Make();

      for (let i = 0; i < barCount; i++) {
        const peak = peakArr[i] ?? 0;
        const barH = Math.max(3, peak * midY * 0.9);
        const x = i * barW + gap / 2;
        const rrect = Skia.RRectXY(
          Skia.XYWHRect(x, midY - barH, bW, barH * 2),
          radius,
          radius,
        );
        if (x + bW / 2 <= progressX) {
          activePath.addRRect(rrect);
        } else {
          inactivePath.addRRect(rrect);
        }
      }

      const inactivePaint = Skia.Paint();
      inactivePaint.setColor(Skia.Color(BAR_INACTIVE));
      canvas.drawPath(inactivePath, inactivePaint);

      const activePaint = Skia.Paint();
      activePaint.setColor(Skia.Color(BAR_ACTIVE));
      canvas.drawPath(activePath, activePaint);

      if (progressX > 0) {
        const tipPath = Skia.Path.Make();
        for (let i = 0; i < barCount; i++) {
          const peak = peakArr[i] ?? 0;
          const barH = Math.max(3, peak * midY * 0.9);
          const x = i * barW + gap / 2;
          if (x + bW / 2 > progressX) break;
          const tipH = Math.max(2, barH * 0.2);
          tipPath.addRRect(
            Skia.RRectXY(
              Skia.XYWHRect(x, midY - barH, bW, tipH * 2),
              bW / 2,
              bW / 2,
            ),
          );
        }
        const tipPaint = Skia.Paint();
        tipPaint.setColor(Skia.Color(BAR_ACTIVE_TIP));
        tipPaint.setAlphaf(0.35);
        canvas.drawPath(tipPath, tipPaint);
      }
    }

    return recorder.finishRecordingAsPicture();
  });

  const elapsed = formatMs(currentPositionMs);
  const total = formatMs(durationMs);

  return (
    <View style={{ width }}>
      <View style={[styles.card, { width }]}>
        <Canvas style={{ width: canvasWidth, height }}>
          <Picture picture={picture} />
        </Canvas>
      </View>
      <View style={styles.timeRow}>
        <Text style={styles.timeText}>{elapsed}</Text>
        <Text style={styles.timeText}>{total}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    // backgroundColor: "#0a1628",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: "#4ef2c136",
    borderBottomColor: "#4ef2c136",
    borderLeftWidth: 3,
    borderRightWidth: 3,
    borderLeftColor: "#4ef2c1",
    borderRightColor: "#4ef2c1",
    paddingHorizontal: CARD_PADDING,
    paddingVertical: 10,
    alignItems: "center",
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
    paddingHorizontal: 4,
  },
  timeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontVariant: ["tabular-nums"],
  },
});
