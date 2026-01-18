import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const quickActions = [
  {
    title: 'Log Blood Pressure',
    description: 'Record a reading and confirm positioning.',
    cta: 'Log now',
  },
  {
    title: 'Symptoms Check',
    description: 'Headache, vision changes, swelling, or pain.',
    cta: 'Review',
  },
  {
    title: 'Medication Plan',
    description: 'See what is due and confirm completion.',
    cta: 'View',
  },
];

const todayPlan = [
  {
    time: '8:00 AM',
    title: 'Morning BP',
    detail: 'Sit quietly for 5 minutes. Use the correct cuff size.',
  },
  {
    time: '12:30 PM',
    title: 'Medication Check',
    detail: 'Confirm your noon dose and note any side effects.',
  },
  {
    time: '6:00 PM',
    title: 'Evening BP',
    detail: 'Repeat BP reading and log symptoms if present.',
  },
];

const warningSigns = [
  'Severe headache that does not improve',
  'Vision changes or flashing lights',
  'Shortness of breath or chest pain',
  'Severe swelling of face or hands',
  'Upper right abdominal pain',
];

const medicationSchedule = [
  { time: '9:00 AM', name: 'Labetalol 200 mg', status: 'Taken' },
  { time: '1:00 PM', name: 'Nifedipine 30 mg', status: 'Due soon' },
  { time: '9:00 PM', name: 'Labetalol 200 mg', status: 'Upcoming' },
];

export default function PostpartumHome() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.protocolBanner}>
        <Text style={styles.protocolText}>RWJ Hypertension Emergency Protocol</Text>
      </View>

      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Postpartum Home</Text>
          <Text style={styles.subtitle}>Track BP, medications, and warning signs</Text>
        </View>
        <TouchableOpacity style={styles.helpButton} onPress={() => {}}>
          <Text style={styles.helpButtonText}>Help</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today</Text>
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <View>
                <Text style={styles.cardLabel}>Last reading</Text>
                <Text style={styles.cardValue}>142 / 92</Text>
                <Text style={styles.cardHint}>Taken 1 hour ago</Text>
              </View>
              <View style={styles.cardRight}>
                <Text style={styles.cardLabel}>Goal</Text>
                <Text style={styles.cardValueSmall}>130-150 / 80-100</Text>
                <Text style={styles.cardHint}>mmHg target range</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.primaryButton} onPress={() => {}}>
              <Text style={styles.primaryButtonText}>Log a BP reading</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          {quickActions.map((action) => (
            <View key={action.title} style={styles.listCard}>
              <View style={styles.listCardBody}>
                <View style={styles.listText}>
                  <Text style={styles.listTitle}>{action.title}</Text>
                  <Text style={styles.listSubtitle}>{action.description}</Text>
                </View>
                <TouchableOpacity style={styles.secondaryButton} onPress={() => {}}>
                  <Text style={styles.secondaryButtonText}>{action.cta}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today Plan</Text>
          {todayPlan.map((item) => (
            <View key={item.time} style={styles.planCard}>
              <View style={styles.planTime}>
                <Text style={styles.planTimeText}>{item.time}</Text>
              </View>
              <View style={styles.planBody}>
                <Text style={styles.planTitle}>{item.title}</Text>
                <Text style={styles.planDetail}>{item.detail}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Warning Signs</Text>
          <View style={styles.card}>
            {warningSigns.map((sign) => (
              <View key={sign} style={styles.warningRow}>
                <View style={styles.warningDot} />
                <Text style={styles.warningText}>{sign}</Text>
              </View>
            ))}
            <TouchableOpacity style={styles.dangerButton} onPress={() => {}}>
              <Text style={styles.dangerButtonText}>Emergency Steps</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Medication Schedule</Text>
          <View style={styles.card}>
            {medicationSchedule.map((dose) => (
              <View key={dose.time} style={styles.medRow}>
                <View>
                  <Text style={styles.medTime}>{dose.time}</Text>
                  <Text style={styles.medName}>{dose.name}</Text>
                </View>
                <View style={styles.medStatus}>
                  <Text style={styles.medStatusText}>{dose.status}</Text>
                </View>
              </View>
            ))}
            <TouchableOpacity style={styles.secondaryButton} onPress={() => {}}>
              <Text style={styles.secondaryButtonText}>Update Medication Status</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Care Team</Text>
          <View style={styles.card}>
            <View style={styles.careRow}>
              <View>
                <Text style={styles.careTitle}>Labor and Delivery</Text>
                <Text style={styles.careDetail}>24/7 triage line</Text>
              </View>
              <TouchableOpacity style={styles.primaryButton} onPress={() => {}}>
                <Text style={styles.primaryButtonText}>Call</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.careDivider} />
            <View style={styles.careRow}>
              <View>
                <Text style={styles.careTitle}>Postpartum Clinic</Text>
                <Text style={styles.careDetail}>Weekdays 8 AM to 5 PM</Text>
              </View>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => {}}>
                <Text style={styles.secondaryButtonText}>Message</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            If you experience severe symptoms or are concerned, contact your care team or emergency services.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  protocolBanner: {
    backgroundColor: '#e8f4f8',
    padding: 8,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#0066cc',
  },
  protocolText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#003d99',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  helpButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  helpButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  container: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardLabel: {
    fontSize: 12,
    color: '#666',
  },
  cardValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginTop: 4,
  },
  cardValueSmall: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 4,
  },
  cardHint: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },
  cardRight: {
    alignItems: 'flex-end',
    maxWidth: 140,
  },
  primaryButton: {
    backgroundColor: '#c41e3a',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#f1f1f1',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
    flexShrink: 0,
  },
  secondaryButtonText: {
    color: '#333',
    fontWeight: '600',
    fontSize: 13,
  },
  listCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 10,
  },
  listCardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  listText: {
    flex: 1,
    paddingRight: 8,
  },
  listTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  listSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    padding: 12,
    marginBottom: 10,
  },
  planTime: {
    backgroundColor: '#e8f4f8',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 12,
  },
  planTimeText: {
    fontSize: 12,
    color: '#003d99',
    fontWeight: '600',
  },
  planBody: {
    flex: 1,
  },
  planTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  planDetail: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  warningDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#c41e3a',
    marginRight: 8,
  },
  warningText: {
    fontSize: 12,
    color: '#333',
    flex: 1,
  },
  dangerButton: {
    backgroundColor: '#c41e3a',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  dangerButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  medRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  medTime: {
    fontSize: 12,
    color: '#666',
  },
  medName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  medStatus: {
    backgroundColor: '#f1f1f1',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  medStatusText: {
    fontSize: 11,
    color: '#333',
    fontWeight: '600',
  },
  careRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  careDivider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 12,
  },
  careTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  careDetail: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  footerText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 18,
  },
});
