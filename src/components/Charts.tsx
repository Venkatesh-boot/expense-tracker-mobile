import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { buildDonutSegments } from '../dashboardUtils';
import { useTheme, useThemedStyles } from '../theme';
import type { ThemeColors } from '../theme';

export type DonutSlice = {
  key: string;
  label: string;
  value: number;
  color: string;
};

/** Pure React Native Donut / Pie chart rendered via clipped geometric semicircle segments. */
export function DonutChart({
  slices,
  size = 152,
  holeRatio = 0.62,
  centerTopLabel,
  centerValue,
  centerSubLabel,
  selectedIndex,
  onSelectSlice,
}: {
  slices: DonutSlice[];
  size?: number;
  holeRatio?: number;
  centerTopLabel?: string;
  centerValue: string;
  centerSubLabel?: string;
  selectedIndex?: number | null;
  onSelectSlice?: (index: number | null) => void;
}) {
  const styles = useThemedStyles(createStyles);
  const segments = useMemo(() => buildDonutSegments(slices), [slices]);
  const radius = size / 2;
  const holeSize = Math.round(size * holeRatio);

  if (segments.length === 0) {
    return (
      <View style={[styles.donutWrap, { width: size, height: size }]}>
        <View
          style={[
            styles.donutEmptyRing,
            { width: size, height: size, borderRadius: radius },
          ]}
        />
        <View
          style={[
            styles.donutHole,
            {
              width: holeSize,
              height: holeSize,
              borderRadius: holeSize / 2,
            },
          ]}
        >
          <Text style={styles.donutCenterValue}>{centerValue}</Text>
          {centerSubLabel ? <Text style={styles.donutCenterSub}>{centerSubLabel}</Text> : null}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.donutWrap, { width: size, height: size }]}>
      <View style={[styles.donutClip, { width: size, height: size, borderRadius: radius }]}>
        {segments.map((segment, index) => {
          const dimmed =
            selectedIndex !== null &&
            selectedIndex !== undefined &&
            selectedIndex !== segment.sliceIndex;
          return (
            <View
              key={`${segment.sliceIndex}-${index}`}
              style={[
                styles.fullLayer,
                {
                  width: size,
                  height: size,
                  opacity: dimmed ? 0.3 : 1,
                  transform: [{ rotate: `${segment.startAngle}deg` }],
                },
              ]}
            >
              <View
                style={[
                  styles.rightHalfClip,
                  { left: radius, width: radius, height: size },
                ]}
              >
                <View
                  style={[
                    styles.fullLayer,
                    {
                      left: -radius,
                      width: size,
                      height: size,
                      transform: [{ rotate: `${segment.sweepAngle}deg` }],
                    },
                  ]}
                >
                  <View
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      width: radius,
                      height: size,
                      backgroundColor: segment.color,
                    }}
                  />
                </View>
              </View>
            </View>
          );
        })}
      </View>

      <Pressable
        style={[
          styles.donutHole,
          {
            width: holeSize,
            height: holeSize,
            borderRadius: holeSize / 2,
          },
        ]}
        onPress={() => onSelectSlice?.(null)}
        disabled={!onSelectSlice}
      >
        {centerTopLabel ? (
          <Text style={styles.donutCenterTop} numberOfLines={1}>
            {centerTopLabel}
          </Text>
        ) : null}
        <Text style={styles.donutCenterValue} numberOfLines={1}>
          {centerValue}
        </Text>
        {centerSubLabel ? (
          <Text style={styles.donutCenterSub} numberOfLines={1}>
            {centerSubLabel}
          </Text>
        ) : null}
      </Pressable>
    </View>
  );
}

export type LineChartPoint = {
  key: string;
  label: string;
  value: number;
  comparison?: number | null;
  highlight?: boolean;
};

/** Pure React Native responsive line & area chart with optional comparison series and point inspection. */
export function TrendLineChart({
  points,
  height = 148,
  lineColor,
  comparisonColor,
  referenceValue,
  referenceLabel,
  selectedIndex,
  onSelectPoint,
  formatShortValue,
  showAllLabels = true,
}: {
  points: LineChartPoint[];
  height?: number;
  lineColor?: string;
  comparisonColor?: string;
  referenceValue?: number;
  referenceLabel?: string;
  selectedIndex?: number | null;
  onSelectPoint?: (index: number) => void;
  formatShortValue: (value: number) => string;
  showAllLabels?: boolean;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const resolvedLineColor = lineColor ?? colors.primary;
  const resolvedComparisonColor = comparisonColor ?? colors.secondary;
  const [chartWidth, setChartWidth] = useState(0);
  const padX = 14;
  const padTop = 16;
  const padBottom = 26;
  const plotHeight = Math.max(60, height - padTop - padBottom);

  const maxValue = useMemo(() => {
    const rawMax = Math.max(
      1,
      referenceValue ?? 0,
      ...points.map((point) => Math.max(point.value, point.comparison ?? 0))
    );
    return rawMax * 1.12;
  }, [points, referenceValue]);

  const coordinates = useMemo(() => {
    if (chartWidth <= 0 || points.length === 0) return [];
    const usableWidth = Math.max(1, chartWidth - padX * 2);
    return points.map((point, index) => {
      const x =
        points.length === 1
          ? chartWidth / 2
          : padX + (index / (points.length - 1)) * usableWidth;
      const y = padTop + (1 - Math.min(1, point.value / maxValue)) * plotHeight;
      const compY =
        point.comparison !== undefined && point.comparison !== null
          ? padTop + (1 - Math.min(1, point.comparison / maxValue)) * plotHeight
          : null;
      return { ...point, index, x, y, compY };
    });
  }, [chartWidth, maxValue, padX, padTop, plotHeight, points]);

  const refY =
    referenceValue && referenceValue > 0
      ? padTop + (1 - Math.min(1, referenceValue / maxValue)) * plotHeight
      : null;

  const labelStep = showAllLabels || points.length <= 7 ? 1 : Math.ceil(points.length / 5);

  return (
    <View
      style={[styles.lineChartRoot, { height }]}
      onLayout={(event) => {
        const nextWidth = event.nativeEvent.layout.width;
        if (Math.abs(nextWidth - chartWidth) > 1) {
          setChartWidth(nextWidth);
        }
      }}
    >
      {/* Subtle horizontal gridlines */}
      {[0, 0.5, 1].map((fraction) => {
        const y = padTop + fraction * plotHeight;
        const axisValue = maxValue * (1 - fraction);
        return (
          <View key={fraction} style={[styles.gridLineRow, { top: y }]}>
            <View style={styles.gridLine} />
            {fraction < 1 ? (
              <Text style={styles.gridLabel}>{formatShortValue(axisValue)}</Text>
            ) : null}
          </View>
        );
      })}

      {/* Optional average / target reference line */}
      {refY !== null ? (
        <View style={[styles.refLineRow, { top: refY }]}>
          <View style={styles.refLine} />
          {referenceLabel ? <Text style={styles.refLabel}>{referenceLabel}</Text> : null}
        </View>
      ) : null}

      {/* Soft area columns under primary points */}
      {coordinates.map((coord) => {
        const bottomY = padTop + plotHeight;
        const columnHeight = Math.max(0, bottomY - coord.y);
        if (columnHeight <= 0) return null;
        return (
          <View
            key={`area-${coord.key}`}
            style={[
              styles.areaStem,
              {
                left: coord.x - 5,
                top: coord.y,
                width: 10,
                height: columnHeight,
                backgroundColor:
                  selectedIndex === coord.index ? `${resolvedLineColor}30` : `${resolvedLineColor}14`,
              },
            ]}
          />
        );
      })}

      {/* Comparison line segments (if provided) */}
      {coordinates.slice(0, -1).map((coord, idx) => {
        const next = coordinates[idx + 1];
        if (coord.compY === null || next.compY === null) return null;
        return (
          <LineSegment
            key={`comp-${coord.key}`}
            x1={coord.x}
            y1={coord.compY}
            x2={next.x}
            y2={next.compY}
            color={resolvedComparisonColor}
            thickness={2}
          />
        );
      })}

      {/* Primary line segments */}
      {coordinates.slice(0, -1).map((coord, idx) => {
        const next = coordinates[idx + 1];
        return (
          <LineSegment
            key={`seg-${coord.key}`}
            x1={coord.x}
            y1={coord.y}
            x2={next.x}
            y2={next.y}
            color={resolvedLineColor}
            thickness={2.6}
          />
        );
      })}

      {/* Interactive data point dots & X labels */}
      {coordinates.map((coord) => {
        const isSelected = selectedIndex === coord.index;
        const showLabel =
          coord.index === 0 ||
          coord.index === coordinates.length - 1 ||
          coord.index % labelStep === 0;
        const showDot = showAllLabels || isSelected || coord.highlight || coord.index === coordinates.length - 1;
        return (
          <React.Fragment key={`pt-${coord.key}`}>
            <Pressable
              style={[
                styles.pointHitTarget,
                { left: coord.x - 14, top: coord.y - 14 },
              ]}
              onPress={() => onSelectPoint?.(coord.index)}
              accessibilityRole="button"
              accessibilityLabel={`${coord.label}: ${formatShortValue(coord.value)}`}
            >
              {showDot ? (
                <View
                  style={[
                    styles.dotOuter,
                    {
                      borderColor: isSelected || coord.highlight ? resolvedLineColor : colors.surface,
                      backgroundColor: isSelected
                        ? resolvedLineColor
                        : coord.highlight
                          ? resolvedLineColor
                          : colors.surface,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.dotInner,
                      {
                        backgroundColor:
                          isSelected || coord.highlight ? colors.onPrimary : resolvedLineColor,
                      },
                    ]}
                  />
                </View>
              ) : null}
            </Pressable>
            {showLabel ? (
              <Text
                style={[
                  styles.xLabel,
                  { left: coord.x - 18, top: padTop + plotHeight + 7 },
                  (coord.highlight || isSelected) && { color: resolvedLineColor, fontWeight: '800' },
                ]}
                numberOfLines={1}
              >
                {coord.label}
              </Text>
            ) : null}
          </React.Fragment>
        );
      })}
    </View>
  );
}

function LineSegment({
  x1,
  y1,
  x2,
  y2,
  color,
  thickness,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  thickness: number;
}) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy);
  if (length <= 0.1) return null;
  const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: midX - length / 2,
        top: midY - thickness / 2,
        width: length,
        height: thickness,
        borderRadius: thickness / 2,
        backgroundColor: color,
        transform: [{ rotate: `${angleDeg}deg` }],
      }}
    />
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    donutWrap: {
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    donutClip: {
      position: 'relative',
      overflow: 'hidden',
      backgroundColor: colors.track,
    },
    donutEmptyRing: {
      borderWidth: 18,
      borderColor: colors.track,
    },
    fullLayer: {
      position: 'absolute',
      left: 0,
      top: 0,
    },
    rightHalfClip: {
      position: 'absolute',
      top: 0,
      overflow: 'hidden',
    },
    donutHole: {
      position: 'absolute',
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 8,
    },
    donutCenterTop: {
      color: colors.muted,
      fontSize: 9,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    donutCenterValue: {
      color: colors.ink,
      fontSize: 13,
      fontWeight: '800',
      marginTop: 1,
    },
    donutCenterSub: {
      color: colors.primary,
      fontSize: 10,
      fontWeight: '700',
      marginTop: 1,
    },
    lineChartRoot: {
      position: 'relative',
      width: '100%',
      marginTop: 12,
    },
    gridLineRow: {
      position: 'absolute',
      left: 0,
      right: 0,
      flexDirection: 'row',
      alignItems: 'center',
    },
    gridLine: {
      flex: 1,
      height: 1,
      backgroundColor: colors.border,
    },
    gridLabel: {
      position: 'absolute',
      right: 0,
      top: -13,
      fontSize: 9,
      color: colors.placeholder,
      fontWeight: '600',
      backgroundColor: colors.surface,
      paddingHorizontal: 2,
    },
    refLineRow: {
      position: 'absolute',
      left: 14,
      right: 14,
    },
    refLine: {
      borderTopWidth: 1,
      borderStyle: 'dashed',
      borderColor: colors.amber,
    },
    refLabel: {
      position: 'absolute',
      left: 0,
      top: -13,
      fontSize: 9,
      color: colors.amber,
      fontWeight: '700',
    },
    areaStem: {
      position: 'absolute',
      borderTopLeftRadius: 5,
      borderTopRightRadius: 5,
    },
    pointHitTarget: {
      position: 'absolute',
      width: 28,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dotOuter: {
      width: 11,
      height: 11,
      borderRadius: 6,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dotInner: {
      width: 5,
      height: 5,
      borderRadius: 3,
    },
    xLabel: {
      position: 'absolute',
      width: 36,
      textAlign: 'center',
      fontSize: 10,
      color: colors.muted,
    },
  });
