import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import TankGauge from '@/components/TankGauge';
import { useTankData } from '@/hooks/useTankData';
import { useConfig } from '@/context/ConfigContext';

function formatTime(date: Date | null): string {
  if (!date) return 'Never';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { config } = useConfig();
  const [tankData, refresh] = useTankData(config);

  const onRefresh = useCallback(() => {
    refresh();
  }, [refresh]);


  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#060E18" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={tankData.isRefreshing}
            onRefresh={onRefresh}
            tintColor="#00D4AA"
            colors={['#00D4AA']}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Water Level</Text>
            <Text style={styles.headerSub}>Home Tank Monitor</Text>
          </View>
          <TouchableOpacity
            style={[styles.refreshBtn, tankData.isRefreshing && styles.refreshBtnActive]}
            onPress={refresh}
            disabled={tankData.isRefreshing}
            accessibilityLabel="Refresh tank data"
          >
            <Ionicons
              name={tankData.isRefreshing ? 'sync' : 'refresh'}
              size={20}
              color={tankData.isRefreshing ? '#00D4AA' : '#8AAEC8'}
            />
          </TouchableOpacity>
        </View>

        {/* Last updated bar */}
        <View style={styles.updateBar}>
          <Ionicons name="time-outline" size={13} color="#3A5068" />
          <Text style={styles.updateText}>
            Updated: {formatTime(tankData.lastUpdated)}
          </Text>
          <View style={styles.updateBarRight}>
            <View style={[styles.autoRefreshDot, { backgroundColor: '#00D4AA' }]} />
            <Text style={styles.autoRefreshText}>
              Auto {config.refreshInterval / 1000}s
            </Text>
          </View>
        </View>

        {/* Error banner */}
        {tankData.error && (
          <View style={styles.errorBanner}>
            <Ionicons name="warning-outline" size={16} color="#FF4444" />
            <Text style={styles.errorText}>{tankData.error}</Text>
          </View>
        )}

        {/* Gauges */}
        <View style={styles.gaugeRow}>
          <TankGauge
            label={config.tank1Label}
            reading={tankData.tank1}
            accentColor="#38BDF8"
            height={260}
            width={140}
          />
          <TankGauge
            label={config.tank2Label}
            reading={tankData.tank2}
            accentColor="#A78BFA"
            height={260}
            width={140}
          />
        </View>

        {/* Detail cards */}
        <View style={styles.detailGrid}>
          <DetailCard
            label={config.tank1Label}
            pct={tankData.tank1.status === 'ok' ? tankData.tank1.percentage : null}
            dist={tankData.tank1.status === 'ok' ? tankData.tank1.rawDistance : null}
            height={config.tank1Height}
            color="#38BDF8"
            status={tankData.tank1.status}
          />
          <DetailCard
            label={config.tank2Label}
            pct={tankData.tank2.status === 'ok' ? tankData.tank2.percentage : null}
            dist={tankData.tank2.status === 'ok' ? tankData.tank2.rawDistance : null}
            height={config.tank2Height}
            color="#A78BFA"
            status={tankData.tank2.status}
          />
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

interface DetailCardProps {
  label: string;
  pct: number | null;
  dist: number | null;
  height: number;
  color: string;
  status: string;
}

function DetailCard({ label, pct, dist, height, color, status }: DetailCardProps) {
  const waterHeight = pct !== null && dist !== null ? height - dist : null;
  return (
    <View style={[styles.detailCard, { borderTopColor: color }]}>
      <Text style={[styles.detailLabel, { color }]}>{label}</Text>
      <View style={styles.detailRow}>
        <Ionicons name="water" size={14} color={color} />
        <Text style={styles.detailKey}>Water height</Text>
        <Text style={styles.detailValue}>
          {waterHeight !== null ? `${waterHeight.toFixed(1)} cm` : 'N/A'}
        </Text>
      </View>
      <View style={styles.detailRow}>
        <Ionicons name="arrow-down" size={14} color="#5A7A99" />
        <Text style={styles.detailKey}>Dist from top</Text>
        <Text style={styles.detailValue}>{dist !== null ? `${dist.toFixed(1)} cm` : 'N/A'}</Text>
      </View>
      <View style={styles.detailRow}>
        <Ionicons name="resize-outline" size={14} color="#5A7A99" />
        <Text style={styles.detailKey}>Tank height</Text>
        <Text style={styles.detailValue}>{height} cm</Text>
      </View>
      <View
        style={[
          styles.statusPill,
          { backgroundColor: status === 'offline' ? '#FF444420' : `${color}20` },
        ]}
      >
        <Text
          style={[
            styles.statusPillText,
            { color: status === 'offline' ? '#FF4444' : color },
          ]}
        >
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#060E18',
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#E2F0FF',
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 13,
    color: '#4A6A88',
    fontWeight: '500',
    marginTop: 2,
  },
  refreshBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#0D1E2E',
    borderWidth: 1,
    borderColor: '#1A3048',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshBtnActive: {
    borderColor: '#00D4AA40',
    backgroundColor: '#00D4AA10',
  },
  updateBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 14,
  },
  updateText: {
    fontSize: 12,
    color: '#3A5068',
    flex: 1,
  },
  updateBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  autoRefreshDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  autoRefreshText: {
    fontSize: 11,
    color: '#3A5068',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FF444415',
    borderWidth: 1,
    borderColor: '#FF444430',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
  },
  errorText: {
    color: '#FF4444',
    fontSize: 13,
    flex: 1,
  },
  gaugeRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    marginBottom: 28,
    gap: 12,
  },
  detailGrid: {
    gap: 12,
  },
  detailCard: {
    backgroundColor: '#0D1E2E',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1A3048',
    borderTopWidth: 2,
    padding: 16,
    gap: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailKey: {
    color: '#4A6A88',
    fontSize: 13,
    flex: 1,
  },
  detailValue: {
    color: '#C0D8F0',
    fontSize: 13,
    fontWeight: '600',
  },
  statusPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    marginTop: 4,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
});
