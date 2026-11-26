import React from 'react';
import { StyleSheet, View } from 'react-native';

export type AppIconName =
  | 'menu'
  | 'home'
  | 'add'
  | 'list'
  | 'chart'
  | 'family'
  | 'settings'
  | 'close'
  | 'back'
  | 'chevronDown'
  | 'calendar'
  | 'check'
  | 'edit'
  | 'trash'
  | 'trend';

/**
 * Pure React Native geometric icon primitives for consistent cross-platform rendering
 * across Android OEM fonts, iOS, and Web without extra native vector-font linking.
 */
export function AppIcon({
  name,
  color,
  size = 18,
}: {
  name: AppIconName;
  color: string;
  size?: number;
}) {
  const s = size / 18;

  switch (name) {
    case 'menu':
      return (
        <View style={[styles.box, { width: size, height: size, justifyContent: 'space-evenly' }]}>
          <View style={{ width: 16 * s, height: 2 * s, borderRadius: s, backgroundColor: color }} />
          <View style={{ width: 16 * s, height: 2 * s, borderRadius: s, backgroundColor: color }} />
          <View style={{ width: 12 * s, height: 2 * s, borderRadius: s, backgroundColor: color }} />
        </View>
      );
    case 'home':
      return (
        <View style={[styles.box, { width: size, height: size }]}>
          <View
            style={{
              width: 11 * s,
              height: 11 * s,
              borderTopWidth: 2 * s,
              borderLeftWidth: 2 * s,
              borderColor: color,
              transform: [{ rotate: '45deg' }, { translateY: 2 * s }],
            }}
          />
          <View
            style={{
              width: 11 * s,
              height: 7 * s,
              borderLeftWidth: 2 * s,
              borderRightWidth: 2 * s,
              borderBottomWidth: 2 * s,
              borderColor: color,
              borderBottomLeftRadius: 2 * s,
              borderBottomRightRadius: 2 * s,
              marginTop: -4 * s,
            }}
          />
        </View>
      );
    case 'add':
      return (
        <View style={[styles.box, { width: size, height: size }]}>
          <View style={{ width: 12 * s, height: 2 * s, borderRadius: s, backgroundColor: color }} />
          <View
            style={{
              position: 'absolute',
              width: 2 * s,
              height: 12 * s,
              borderRadius: s,
              backgroundColor: color,
            }}
          />
        </View>
      );
    case 'list':
      return (
        <View style={[styles.box, { width: size, height: size, justifyContent: 'space-evenly' }]}>
          {[0, 1, 2].map((row) => (
            <View key={row} style={styles.rowCenter}>
              <View style={{ width: 2.5 * s, height: 2.5 * s, borderRadius: 2 * s, backgroundColor: color, marginRight: 2.5 * s }} />
              <View style={{ width: 10.5 * s, height: 2 * s, borderRadius: s, backgroundColor: color }} />
            </View>
          ))}
        </View>
      );
    case 'chart':
      return (
        <View style={[styles.rowEnd, { width: size, height: size, gap: 2.5 * s, paddingBottom: 2 * s }]}>
          <View style={{ width: 3 * s, height: 6 * s, borderRadius: 1 * s, backgroundColor: color }} />
          <View style={{ width: 3 * s, height: 12 * s, borderRadius: 1 * s, backgroundColor: color }} />
          <View style={{ width: 3 * s, height: 9 * s, borderRadius: 1 * s, backgroundColor: color }} />
        </View>
      );
    case 'family':
      return (
        <View style={[styles.rowEnd, { width: size, height: size, gap: 1.5 * s, paddingBottom: 2 * s }]}>
          <View style={styles.personWrap}>
            <View style={{ width: 4.5 * s, height: 4.5 * s, borderRadius: 3 * s, backgroundColor: color, marginBottom: 1.5 * s }} />
            <View style={{ width: 8 * s, height: 5 * s, borderTopLeftRadius: 4 * s, borderTopRightRadius: 4 * s, backgroundColor: color }} />
          </View>
          <View style={styles.personWrap}>
            <View style={{ width: 3.8 * s, height: 3.8 * s, borderRadius: 2.5 * s, backgroundColor: color, marginBottom: 1.5 * s }} />
            <View style={{ width: 6.5 * s, height: 4 * s, borderTopLeftRadius: 3.5 * s, borderTopRightRadius: 3.5 * s, backgroundColor: color }} />
          </View>
        </View>
      );
    case 'settings':
      return (
        <View style={[styles.box, { width: size, height: size, justifyContent: 'space-evenly' }]}>
          <View style={styles.rowCenter}>
            <View style={{ width: 6 * s, height: 2 * s, borderRadius: s, backgroundColor: color }} />
            <View style={{ width: 4 * s, height: 4 * s, borderRadius: 2 * s, borderWidth: 1.5 * s, borderColor: color, marginHorizontal: 1 }} />
            <View style={{ width: 4 * s, height: 2 * s, borderRadius: s, backgroundColor: color }} />
          </View>
          <View style={styles.rowCenter}>
            <View style={{ width: 4 * s, height: 2 * s, borderRadius: s, backgroundColor: color }} />
            <View style={{ width: 4 * s, height: 4 * s, borderRadius: 2 * s, borderWidth: 1.5 * s, borderColor: color, marginHorizontal: 1 }} />
            <View style={{ width: 6 * s, height: 2 * s, borderRadius: s, backgroundColor: color }} />
          </View>
        </View>
      );
    case 'close':
      return (
        <View style={[styles.box, { width: size, height: size }]}>
          <View
            style={{
              width: 13 * s,
              height: 2 * s,
              borderRadius: s,
              backgroundColor: color,
              transform: [{ rotate: '45deg' }],
            }}
          />
          <View
            style={{
              position: 'absolute',
              width: 13 * s,
              height: 2 * s,
              borderRadius: s,
              backgroundColor: color,
              transform: [{ rotate: '-45deg' }],
            }}
          />
        </View>
      );
    case 'back':
      return (
        <View style={[styles.box, { width: size, height: size }]}>
          <View
            style={{
              width: 8 * s,
              height: 8 * s,
              borderLeftWidth: 2.2 * s,
              borderBottomWidth: 2.2 * s,
              borderColor: color,
              transform: [{ rotate: '45deg' }, { translateX: 2 * s }],
            }}
          />
        </View>
      );
    case 'chevronDown':
      return (
        <View style={[styles.box, { width: size, height: size }]}>
          <View
            style={{
              width: 7 * s,
              height: 7 * s,
              borderRightWidth: 2 * s,
              borderBottomWidth: 2 * s,
              borderColor: color,
              transform: [{ rotate: '45deg' }, { translateY: -2 * s }],
            }}
          />
        </View>
      );
    case 'calendar':
      return (
        <View style={[styles.box, { width: size, height: size }]}>
          <View
            style={{
              width: 13 * s,
              height: 12 * s,
              borderWidth: 1.8 * s,
              borderColor: color,
              borderRadius: 2.5 * s,
              overflow: 'hidden',
            }}
          >
            <View style={{ height: 3.5 * s, backgroundColor: color }} />
          </View>
        </View>
      );
    case 'check':
      return (
        <View style={[styles.box, { width: size, height: size }]}>
          <View
            style={{
              width: 9 * s,
              height: 5 * s,
              borderLeftWidth: 2.2 * s,
              borderBottomWidth: 2.2 * s,
              borderColor: color,
              transform: [{ rotate: '-45deg' }, { translateY: -1 * s }],
            }}
          />
        </View>
      );
    case 'edit':
      return (
        <View style={[styles.box, { width: size, height: size }]}>
          <View
            style={{
              width: 11 * s,
              height: 4 * s,
              borderWidth: 1.6 * s,
              borderColor: color,
              borderRadius: 1 * s,
              transform: [{ rotate: '-45deg' }],
            }}
          />
        </View>
      );
    case 'trash':
      return (
        <View style={[styles.box, { width: size, height: size }]}>
          <View style={{ width: 11 * s, height: 1.8 * s, borderRadius: s, backgroundColor: color, marginBottom: 1.5 * s }} />
          <View
            style={{
              width: 9 * s,
              height: 9 * s,
              borderWidth: 1.6 * s,
              borderTopWidth: 0,
              borderColor: color,
              borderBottomLeftRadius: 2 * s,
              borderBottomRightRadius: 2 * s,
            }}
          />
        </View>
      );
    case 'trend':
      return (
        <View style={[styles.box, { width: size, height: size }]}>
          <View
            style={{
              width: 12 * s,
              height: 2 * s,
              borderRadius: s,
              backgroundColor: color,
              transform: [{ rotate: '-35deg' }],
            }}
          />
          <View
            style={{
              position: 'absolute',
              right: 2.5 * s,
              top: 3.5 * s,
              width: 6 * s,
              height: 6 * s,
              borderTopWidth: 2 * s,
              borderRightWidth: 2 * s,
              borderColor: color,
            }}
          />
        </View>
      );
  }
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center' },
  rowCenter: { flexDirection: 'row', alignItems: 'center' },
  rowEnd: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center' },
  personWrap: { alignItems: 'center' },
});
