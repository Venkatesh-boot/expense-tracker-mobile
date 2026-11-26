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
  | 'trend'
  | 'target'
  | 'wallet'
  | 'sun'
  | 'moon'
  | 'groceries'
  | 'food'
  | 'transport'
  | 'bills'
  | 'health'
  | 'shopping'
  | 'other'
  | 'leaf'
  | 'cup'
  | 'fuel'
  | 'bus'
  | 'parking'
  | 'wrench'
  | 'bolt'
  | 'droplet'
  | 'wifi'
  | 'phone'
  | 'shield'
  | 'shirt'
  | 'screen'
  | 'gift'
  | 'book'
  | 'star'
  | 'tag'
  | 'box';

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
    case 'target':
      return (
        <View style={[styles.box, { width: size, height: size }]}>
          <View
            style={{
              width: 14 * s,
              height: 14 * s,
              borderRadius: 7 * s,
              borderWidth: 1.8 * s,
              borderColor: color,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                width: 6 * s,
                height: 6 * s,
                borderRadius: 3 * s,
                backgroundColor: color,
              }}
            />
          </View>
        </View>
      );
    case 'wallet':
      return (
        <View style={[styles.box, { width: size, height: size }]}>
          <View
            style={{
              width: 14 * s,
              height: 11 * s,
              borderWidth: 1.8 * s,
              borderColor: color,
              borderRadius: 3 * s,
              justifyContent: 'center',
              alignItems: 'flex-end',
              paddingRight: 2 * s,
            }}
          >
            <View style={{ width: 3 * s, height: 3 * s, borderRadius: 1.5 * s, backgroundColor: color }} />
          </View>
        </View>
      );
    case 'sun':
      return (
        <View style={[styles.box, { width: size, height: size }]}>
          <View
            style={{
              width: 8 * s,
              height: 8 * s,
              borderRadius: 4 * s,
              borderWidth: 1.8 * s,
              borderColor: color,
            }}
          />
          {[0, 45, 90, 135].map((deg) => (
            <View
              key={deg}
              style={{
                position: 'absolute',
                width: 15 * s,
                height: 1.6 * s,
                borderRadius: s,
                backgroundColor: color,
                transform: [{ rotate: `${deg}deg` }],
                opacity: 0.75,
              }}
            />
          ))}
          <View
            style={{
              position: 'absolute',
              width: 7 * s,
              height: 7 * s,
              borderRadius: 3.5 * s,
              backgroundColor: color,
            }}
          />
        </View>
      );
    case 'moon':
      return (
        <View style={[styles.box, { width: size, height: size }]}>
          <View
            style={{
              width: 12 * s,
              height: 12 * s,
              borderRadius: 6 * s,
              borderLeftWidth: 3.2 * s,
              borderBottomWidth: 3.2 * s,
              borderColor: color,
              transform: [{ rotate: '35deg' }],
            }}
          />
        </View>
      );
    case 'groceries':
      return (
        <View style={[styles.box, { width: size, height: size }]}>
          <View
            style={{
              width: 7 * s,
              height: 4 * s,
              borderTopWidth: 1.8 * s,
              borderLeftWidth: 1.8 * s,
              borderRightWidth: 1.8 * s,
              borderColor: color,
              borderTopLeftRadius: 3 * s,
              borderTopRightRadius: 3 * s,
            }}
          />
          <View
            style={{
              width: 13 * s,
              height: 8 * s,
              borderWidth: 1.8 * s,
              borderColor: color,
              borderBottomLeftRadius: 3 * s,
              borderBottomRightRadius: 3 * s,
              borderTopLeftRadius: 1.5 * s,
              borderTopRightRadius: 1.5 * s,
              justifyContent: 'space-evenly',
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <View style={{ width: 1.5 * s, height: 3.5 * s, backgroundColor: color }} />
            <View style={{ width: 1.5 * s, height: 3.5 * s, backgroundColor: color }} />
          </View>
        </View>
      );
    case 'food':
      return (
        <View style={[styles.rowCenter, { width: size, height: size, justifyContent: 'center', gap: 3 * s }]}>
          <View style={{ alignItems: 'center' }}>
            <View style={{ width: 4.5 * s, height: 5 * s, borderLeftWidth: 1.5 * s, borderRightWidth: 1.5 * s, borderBottomWidth: 1.5 * s, borderColor: color }} />
            <View style={{ width: 1.8 * s, height: 7.5 * s, backgroundColor: color }} />
          </View>
          <View style={{ alignItems: 'center' }}>
            <View style={{ width: 4.5 * s, height: 5.5 * s, borderRadius: 2.5 * s, backgroundColor: color }} />
            <View style={{ width: 1.8 * s, height: 7 * s, backgroundColor: color }} />
          </View>
        </View>
      );
    case 'transport':
      return (
        <View style={[styles.box, { width: size, height: size }]}>
          <View style={{ width: 9 * s, height: 4.5 * s, borderTopLeftRadius: 3 * s, borderTopRightRadius: 3 * s, borderWidth: 1.6 * s, borderBottomWidth: 0, borderColor: color }} />
          <View
            style={{
              width: 14 * s,
              height: 6 * s,
              borderRadius: 2 * s,
              borderWidth: 1.6 * s,
              borderColor: color,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: 2 * s,
            }}
          >
            <View style={{ width: 2 * s, height: 2 * s, borderRadius: s, backgroundColor: color }} />
            <View style={{ width: 2 * s, height: 2 * s, borderRadius: s, backgroundColor: color }} />
          </View>
        </View>
      );
    case 'bills':
      return (
        <View style={[styles.box, { width: size, height: size }]}>
          <View
            style={{
              width: 11 * s,
              height: 13.5 * s,
              borderWidth: 1.7 * s,
              borderColor: color,
              borderRadius: 2.2 * s,
              justifyContent: 'space-evenly',
              paddingHorizontal: 2 * s,
            }}
          >
            <View style={{ height: 1.6 * s, backgroundColor: color, borderRadius: s }} />
            <View style={{ height: 1.6 * s, backgroundColor: color, borderRadius: s }} />
            <View style={{ width: 4.5 * s, height: 1.6 * s, backgroundColor: color, borderRadius: s }} />
          </View>
        </View>
      );
    case 'health':
      return (
        <View style={[styles.box, { width: size, height: size }]}>
          <View style={{ width: 13 * s, height: 13 * s, borderRadius: 4 * s, borderWidth: 1.7 * s, borderColor: color, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: 7 * s, height: 2.2 * s, borderRadius: s, backgroundColor: color }} />
            <View style={{ position: 'absolute', width: 2.2 * s, height: 7 * s, borderRadius: s, backgroundColor: color }} />
          </View>
        </View>
      );
    case 'shopping':
      return (
        <View style={[styles.box, { width: size, height: size }]}>
          <View style={{ width: 6 * s, height: 3.5 * s, borderTopLeftRadius: 3 * s, borderTopRightRadius: 3 * s, borderWidth: 1.7 * s, borderBottomWidth: 0, borderColor: color }} />
          <View style={{ width: 12 * s, height: 9.5 * s, borderWidth: 1.7 * s, borderColor: color, borderRadius: 2.5 * s }} />
        </View>
      );
    case 'other':
      return (
        <View style={[styles.box, { width: size, height: size, gap: 2.5 * s }]}>
          <View style={[styles.rowCenter, { gap: 2.5 * s }]}>
            <View style={{ width: 4.5 * s, height: 4.5 * s, borderRadius: 1.2 * s, borderWidth: 1.5 * s, borderColor: color }} />
            <View style={{ width: 4.5 * s, height: 4.5 * s, borderRadius: 1.2 * s, borderWidth: 1.5 * s, borderColor: color }} />
          </View>
          <View style={[styles.rowCenter, { gap: 2.5 * s }]}>
            <View style={{ width: 4.5 * s, height: 4.5 * s, borderRadius: 1.2 * s, borderWidth: 1.5 * s, borderColor: color }} />
            <View style={{ width: 4.5 * s, height: 4.5 * s, borderRadius: 2.3 * s, backgroundColor: color }} />
          </View>
        </View>
      );
    case 'leaf':
      return (
        <View style={[styles.box, { width: size, height: size }]}>
          <View
            style={{
              width: 11 * s,
              height: 11 * s,
              borderTopLeftRadius: 9 * s,
              borderBottomRightRadius: 9 * s,
              borderWidth: 1.8 * s,
              borderColor: color,
              transform: [{ rotate: '-10deg' }],
            }}
          />
          <View style={{ position: 'absolute', width: 10 * s, height: 1.6 * s, backgroundColor: color, transform: [{ rotate: '-45deg' }] }} />
        </View>
      );
    case 'cup':
      return (
        <View style={[styles.rowCenter, { width: size, height: size, justifyContent: 'center' }]}>
          <View style={{ width: 9 * s, height: 10 * s, borderWidth: 1.7 * s, borderColor: color, borderBottomLeftRadius: 4 * s, borderBottomRightRadius: 4 * s }} />
          <View style={{ width: 3.5 * s, height: 5 * s, borderWidth: 1.6 * s, borderLeftWidth: 0, borderColor: color, borderTopRightRadius: 2.5 * s, borderBottomRightRadius: 2.5 * s, marginTop: -2 * s }} />
        </View>
      );
    case 'fuel':
      return (
        <View style={[styles.rowCenter, { width: size, height: size, justifyContent: 'center', alignItems: 'flex-end' }]}>
          <View style={{ width: 8.5 * s, height: 12 * s, borderWidth: 1.7 * s, borderColor: color, borderRadius: 2 * s, paddingTop: 2 * s, alignItems: 'center' }}>
            <View style={{ width: 4.5 * s, height: 3 * s, backgroundColor: color, borderRadius: 1 * s }} />
          </View>
          <View style={{ width: 3.5 * s, height: 7 * s, borderTopWidth: 1.6 * s, borderRightWidth: 1.6 * s, borderColor: color, borderTopRightRadius: 2 * s, marginBottom: 2 * s }} />
        </View>
      );
    case 'bus':
      return (
        <View style={[styles.box, { width: size, height: size }]}>
          <View style={{ width: 11 * s, height: 11.5 * s, borderWidth: 1.7 * s, borderColor: color, borderRadius: 2.5 * s, justifyContent: 'space-between', padding: 1.8 * s }}>
            <View style={{ height: 4 * s, borderWidth: 1.2 * s, borderColor: color, borderRadius: 1 * s }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ width: 2 * s, height: 2 * s, borderRadius: s, backgroundColor: color }} />
              <View style={{ width: 2 * s, height: 2 * s, borderRadius: s, backgroundColor: color }} />
            </View>
          </View>
        </View>
      );
    case 'parking':
      return (
        <View style={[styles.box, { width: size, height: size }]}>
          <View style={{ width: 12.5 * s, height: 12.5 * s, borderRadius: 3 * s, borderWidth: 1.7 * s, borderColor: color, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: 2 * s, height: 7 * s, backgroundColor: color, marginLeft: -2 * s }} />
            <View style={{ position: 'absolute', top: 2.5 * s, left: 4.5 * s, width: 4 * s, height: 3.8 * s, borderWidth: 1.6 * s, borderLeftWidth: 0, borderColor: color, borderTopRightRadius: 2 * s, borderBottomRightRadius: 2 * s }} />
          </View>
        </View>
      );
    case 'wrench':
      return (
        <View style={[styles.box, { width: size, height: size }]}>
          <View style={{ width: 12 * s, height: 2.4 * s, borderRadius: s, backgroundColor: color, transform: [{ rotate: '-45deg' }] }} />
          <View style={{ position: 'absolute', right: 2.5 * s, top: 2.5 * s, width: 5.5 * s, height: 5.5 * s, borderRadius: 3 * s, borderWidth: 1.8 * s, borderTopWidth: 0, borderColor: color, transform: [{ rotate: '-45deg' }] }} />
        </View>
      );
    case 'bolt':
      return (
        <View style={[styles.box, { width: size, height: size }]}>
          <View style={{ width: 7 * s, height: 2.2 * s, backgroundColor: color, transform: [{ skewX: '-25deg' }, { translateY: -2 * s }] }} />
          <View style={{ width: 7 * s, height: 2.2 * s, backgroundColor: color, transform: [{ skewX: '-25deg' }, { translateY: 2 * s }] }} />
          <View style={{ position: 'absolute', width: 2.2 * s, height: 11 * s, backgroundColor: color, transform: [{ rotate: '22deg' }] }} />
        </View>
      );
    case 'droplet':
      return (
        <View style={[styles.box, { width: size, height: size }]}>
          <View
            style={{
              width: 10 * s,
              height: 10 * s,
              borderRadius: 5 * s,
              borderTopLeftRadius: 0,
              borderWidth: 1.8 * s,
              borderColor: color,
              transform: [{ rotate: '45deg' }, { translateY: 1.5 * s }],
            }}
          />
        </View>
      );
    case 'wifi':
      return (
        <View style={[styles.box, { width: size, height: size }]}>
          <View style={{ width: 13 * s, height: 13 * s, borderRadius: 7 * s, borderTopWidth: 1.8 * s, borderLeftWidth: 1.8 * s, borderColor: color, transform: [{ rotate: '45deg' }, { translateY: 3 * s }] }} />
          <View style={{ position: 'absolute', width: 8 * s, height: 8 * s, borderRadius: 4 * s, borderTopWidth: 1.8 * s, borderLeftWidth: 1.8 * s, borderColor: color, transform: [{ rotate: '45deg' }, { translateY: 3 * s }] }} />
          <View style={{ position: 'absolute', bottom: 3 * s, width: 2.8 * s, height: 2.8 * s, borderRadius: 1.5 * s, backgroundColor: color }} />
        </View>
      );
    case 'phone':
      return (
        <View style={[styles.box, { width: size, height: size }]}>
          <View style={{ width: 9 * s, height: 13.5 * s, borderRadius: 2.2 * s, borderWidth: 1.7 * s, borderColor: color, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 1.5 * s }}>
            <View style={{ width: 3 * s, height: 1.5 * s, borderRadius: s, backgroundColor: color }} />
          </View>
        </View>
      );
    case 'shield':
      return (
        <View style={[styles.box, { width: size, height: size }]}>
          <View style={{ width: 11 * s, height: 12.5 * s, borderWidth: 1.7 * s, borderColor: color, borderTopLeftRadius: 2 * s, borderTopRightRadius: 2 * s, borderBottomLeftRadius: 6 * s, borderBottomRightRadius: 6 * s }} />
        </View>
      );
    case 'shirt':
      return (
        <View style={[styles.box, { width: size, height: size }]}>
          <View style={{ width: 13.5 * s, height: 4.5 * s, borderWidth: 1.7 * s, borderBottomWidth: 0, borderColor: color, borderTopLeftRadius: 3 * s, borderTopRightRadius: 3 * s }} />
          <View style={{ width: 9 * s, height: 7 * s, borderWidth: 1.7 * s, borderTopWidth: 0, borderColor: color, borderBottomLeftRadius: 2 * s, borderBottomRightRadius: 2 * s }} />
        </View>
      );
    case 'screen':
      return (
        <View style={[styles.box, { width: size, height: size }]}>
          <View style={{ width: 13.5 * s, height: 9.5 * s, borderWidth: 1.7 * s, borderColor: color, borderRadius: 2 * s }} />
          <View style={{ width: 6 * s, height: 1.8 * s, backgroundColor: color, marginTop: 1.5 * s, borderRadius: s }} />
        </View>
      );
    case 'gift':
      return (
        <View style={[styles.box, { width: size, height: size }]}>
          <View style={{ width: 13 * s, height: 3.5 * s, borderWidth: 1.6 * s, borderColor: color, borderRadius: 1 * s }} />
          <View style={{ width: 11 * s, height: 7.5 * s, borderWidth: 1.6 * s, borderTopWidth: 0, borderColor: color, borderBottomLeftRadius: 2 * s, borderBottomRightRadius: 2 * s, alignItems: 'center' }}>
            <View style={{ width: 1.6 * s, height: '100%', backgroundColor: color }} />
          </View>
        </View>
      );
    case 'book':
      return (
        <View style={[styles.box, { width: size, height: size }]}>
          <View style={{ width: 11.5 * s, height: 12.5 * s, borderWidth: 1.7 * s, borderColor: color, borderRadius: 2 * s, paddingLeft: 2.5 * s }}>
            <View style={{ width: 1.5 * s, height: '100%', backgroundColor: color }} />
          </View>
        </View>
      );
    case 'star':
      return (
        <View style={[styles.box, { width: size, height: size }]}>
          <View style={{ width: 9 * s, height: 9 * s, borderWidth: 1.7 * s, borderColor: color, borderRadius: 1.5 * s }} />
          <View style={{ position: 'absolute', width: 9 * s, height: 9 * s, borderWidth: 1.7 * s, borderColor: color, borderRadius: 1.5 * s, transform: [{ rotate: '45deg' }] }} />
        </View>
      );
    case 'tag':
      return (
        <View style={[styles.box, { width: size, height: size }]}>
          <View style={{ width: 11 * s, height: 7.5 * s, borderWidth: 1.7 * s, borderColor: color, borderRadius: 2 * s, borderTopLeftRadius: 5 * s, justifyContent: 'center', paddingLeft: 2 * s, transform: [{ rotate: '-30deg' }] }}>
            <View style={{ width: 2 * s, height: 2 * s, borderRadius: s, backgroundColor: color }} />
          </View>
        </View>
      );
    case 'box':
      return (
        <View style={[styles.box, { width: size, height: size }]}>
          <View style={{ width: 12 * s, height: 11 * s, borderWidth: 1.7 * s, borderColor: color, borderRadius: 2 * s, alignItems: 'center' }}>
            <View style={{ width: '100%', height: 1.5 * s, backgroundColor: color, marginTop: 3 * s }} />
            <View style={{ width: 4 * s, height: 1.5 * s, backgroundColor: color, marginTop: 2 * s }} />
          </View>
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
