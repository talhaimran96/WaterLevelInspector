import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useConfig } from '@/context/ConfigContext';
import { TankConfig, DEFAULT_CONFIG } from '@/constants/tankConfig';

type DraftConfig = {
  [K in keyof TankConfig]: string;
};

function toDraft(c: TankConfig): DraftConfig {
  return {
    tank1Url: c.tank1Url,
    tank2Url: c.tank2Url,
    tank1Height: String(c.tank1Height),
    tank2Height: String(c.tank2Height),
    tank1MaxLevelDistance: String(c.tank1MaxLevelDistance),
    tank2MaxLevelDistance: String(c.tank2MaxLevelDistance),
    tank1Label: c.tank1Label,
    tank2Label: c.tank2Label,
    refreshInterval: String(c.refreshInterval / 1000), // store as seconds for display
  };
}

function fromDraft(d: DraftConfig): TankConfig | null {
  const tank1Height = parseFloat(d.tank1Height);
  const tank2Height = parseFloat(d.tank2Height);
  const tank1MaxLevelDistance = parseFloat(d.tank1MaxLevelDistance);
  const tank2MaxLevelDistance = parseFloat(d.tank2MaxLevelDistance);
  const refreshSec = parseFloat(d.refreshInterval);

  if (
    isNaN(tank1Height) ||
    tank1Height <= 0 ||
    isNaN(tank2Height) ||
    tank2Height <= 0 ||
    isNaN(tank1MaxLevelDistance) ||
    tank1MaxLevelDistance < 0 ||
    isNaN(tank2MaxLevelDistance) ||
    tank2MaxLevelDistance < 0 ||
    isNaN(refreshSec) ||
    refreshSec < 5
  )
    return null;

  if (!d.tank1Url.startsWith('http') || !d.tank2Url.startsWith('http')) return null;

  return {
    tank1Url: d.tank1Url.trim(),
    tank2Url: d.tank2Url.trim(),
    tank1Height,
    tank2Height,
    tank1MaxLevelDistance,
    tank2MaxLevelDistance,
    tank1Label: d.tank1Label.trim() || 'Tank 1',
    tank2Label: d.tank2Label.trim() || 'Tank 2',
    refreshInterval: refreshSec * 1000,
  };
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { config, saveConfig } = useConfig();
  const [draft, setDraft] = useState<DraftConfig>(() => toDraft(config));
  const [saved, setSaved] = useState(false);

  // Sync draft when context config is first loaded from storage
  useEffect(() => {
    setDraft(toDraft(config));
  }, [config.tank1Url]);

  const set = (key: keyof DraftConfig, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    const next = fromDraft(draft);
    if (!next) {
      Alert.alert(
        'Invalid values',
        'Please check all fields:\n• URLs must start with http://\n• Heights must be positive numbers\n• Offsets must be ≥ 0\n• Refresh interval must be ≥ 5 seconds',
      );
      return;
    }
    await saveConfig(next);
    setSaved(true);
  };

  const handleReset = () => {
    Alert.alert(
      'Reset to defaults',
      'This will restore all original values from the Arduino sketch.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await saveConfig(DEFAULT_CONFIG);
            setDraft(toDraft(DEFAULT_CONFIG));
            setSaved(false);
          },
        },
      ],
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#060E18' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Settings</Text>
              <Text style={styles.headerSub}>Sensor Configuration</Text>
            </View>
            <TouchableOpacity
              style={styles.resetBtn}
              onPress={handleReset}
              accessibilityLabel="Reset to defaults"
            >
              <Ionicons name="refresh-circle-outline" size={20} color="#5A7A99" />
            </TouchableOpacity>
          </View>

          {/* --- Tank 1 Section --- */}
          <SectionHeader title={draft.tank1Label || 'Tank 1'} color="#38BDF8" icon="water" />
          <FieldCard>
            <Field
              label="Label"
              value={draft.tank1Label}
              onChangeText={(v) => set('tank1Label', v)}
              placeholder="Underground Tank"
            />
            <Field
              label="Sensor URL"
              value={draft.tank1Url}
              onChangeText={(v) => set('tank1Url', v)}
              placeholder="http://192.168.18.78/measurement"
              keyboard="url"
              mono
            />
            <Field
              label="Tank Height (cm)"
              value={draft.tank1Height}
              onChangeText={(v) => set('tank1Height', v)}
              placeholder="142"
              keyboard="decimal-pad"
              hint="Absolute internal height of the tank"
            />
            <Field
              label="Max Level Offset (cm)"
              value={draft.tank1MaxLevelDistance}
              onChangeText={(v) => set('tank1MaxLevelDistance', v)}
              placeholder="29.56"
              keyboard="decimal-pad"
              hint="Sensor reading when tank is completely full"
              last
            />
          </FieldCard>

          {/* --- Tank 2 Section --- */}
          <SectionHeader title={draft.tank2Label || 'Tank 2'} color="#A78BFA" icon="water-outline" />
          <FieldCard>
            <Field
              label="Label"
              value={draft.tank2Label}
              onChangeText={(v) => set('tank2Label', v)}
              placeholder="Roof Tank"
            />
            <Field
              label="Sensor URL"
              value={draft.tank2Url}
              onChangeText={(v) => set('tank2Url', v)}
              placeholder="http://192.168.18.79/measurement"
              keyboard="url"
              mono
            />
            <Field
              label="Tank Height (cm)"
              value={draft.tank2Height}
              onChangeText={(v) => set('tank2Height', v)}
              placeholder="108"
              keyboard="decimal-pad"
              hint="Absolute internal height of the tank"
            />
            <Field
              label="Max Level Offset (cm)"
              value={draft.tank2MaxLevelDistance}
              onChangeText={(v) => set('tank2MaxLevelDistance', v)}
              placeholder="0"
              keyboard="decimal-pad"
              hint="Sensor reading when tank is completely full"
              last
            />
          </FieldCard>

          {/* --- General --- */}
          <SectionHeader title="General" color="#F9A8D4" icon="settings-outline" />
          <FieldCard>
            <Field
              label="Refresh Interval (seconds)"
              value={draft.refreshInterval}
              onChangeText={(v) => set('refreshInterval', v)}
              placeholder="30"
              keyboard="decimal-pad"
              hint="Minimum 5 seconds. Dashboard auto-refreshes at this interval."
              last
            />
          </FieldCard>

          {/* Save button */}
          <TouchableOpacity
            style={[styles.saveBtn, saved && styles.saveBtnDone]}
            onPress={handleSave}
            accessibilityLabel="Save settings"
          >
            <Ionicons
              name={saved ? 'checkmark-circle' : 'save-outline'}
              size={20}
              color={saved ? '#00D4AA' : '#E2F0FF'}
            />
            <Text style={[styles.saveBtnText, saved && { color: '#00D4AA' }]}>
              {saved ? 'Saved!' : 'Save Changes'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.footerNote}>
            Changes take effect immediately after saving. The dashboard will re-fetch data using the
            updated configuration.
          </Text>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────

function SectionHeader({
  title,
  color,
  icon,
}: {
  title: string;
  color: string;
  icon: any;
}) {
  return (
    <View style={sectionStyles.header}>
      <View style={[sectionStyles.iconBox, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={[sectionStyles.title, { color }]}>{title}</Text>
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    marginBottom: 10,
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
});

function FieldCard({ children }: { children: React.ReactNode }) {
  return <View style={cardStyles.card}>{children}</View>;
}

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: '#0D1E2E',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1A3048',
    overflow: 'hidden',
  },
});

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboard?: any;
  hint?: string;
  mono?: boolean;
  last?: boolean;
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboard,
  hint,
  mono,
  last,
}: FieldProps) {
  return (
    <View style={[fieldStyles.wrapper, !last && fieldStyles.separator]}>
      <Text style={fieldStyles.label}>{label}</Text>
      <TextInput
        style={[fieldStyles.input, mono && fieldStyles.mono]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#2A4A68"
        keyboardType={keyboard ?? 'default'}
        autoCapitalize="none"
        autoCorrect={false}
        selectTextOnFocus
      />
      {hint && <Text style={fieldStyles.hint}>{hint}</Text>}
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 6,
  },
  separator: {
    borderBottomWidth: 1,
    borderBottomColor: '#1A3048',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4A6A88',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  input: {
    fontSize: 15,
    color: '#C0D8F0',
    backgroundColor: '#0A1828',
    borderWidth: 1,
    borderColor: '#1A3048',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  mono: {
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    fontSize: 13,
  },
  hint: {
    fontSize: 11,
    color: '#2A4A68',
    marginTop: 1,
  },
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#060E18',
  },
  scroll: {
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 4,
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
  resetBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#0D1E2E',
    borderWidth: 1,
    borderColor: '#1A3048',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0D2A40',
    borderWidth: 1.5,
    borderColor: '#1A4A70',
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 24,
  },
  saveBtnDone: {
    backgroundColor: '#00D4AA10',
    borderColor: '#00D4AA40',
  },
  saveBtnText: {
    color: '#E2F0FF',
    fontSize: 16,
    fontWeight: '700',
  },
  footerNote: {
    color: '#2A4A68',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 18,
  },
});
