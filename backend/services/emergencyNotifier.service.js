// ─── Emergency Notifier Service ─────────────────────────────────────────────
// Simulates external webhook notifications to trusted contacts
// when a break-glass emergency access is triggered.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Simulated trusted contacts registry.
 * In production, this would be fetched from the patient's emergency contacts.
 */
const SIMULATED_CONTACTS = [
  { name: 'Primary Care Physician', endpoint: 'https://hooks.example.com/pcp', method: 'POST' },
  { name: 'Emergency Contact (Family)', endpoint: 'https://hooks.example.com/family', method: 'POST' },
  { name: 'Hospital Admin', endpoint: 'https://hooks.example.com/admin', method: 'POST' },
];

/**
 * Sends simulated webhook notifications to trusted contacts.
 *
 * @param {object} params
 * @param {string} params.patientId     — Patient UUID
 * @param {string} params.accessorId    — Who triggered the emergency access
 * @param {string} params.reason        — Reason for emergency access
 * @param {string} params.timestamp     — ISO 8601 timestamp
 * @returns {Promise<object[]>} Array of notification results
 */
export async function notifyTrustedContacts({ patientId, accessorId, reason, timestamp }) {
  console.log('\n🚨 [EmergencyNotifier] Dispatching notifications to trusted contacts...');

  const results = await Promise.allSettled(
    SIMULATED_CONTACTS.map(async (contact) => {
      const payload = {
        event: 'EMERGENCY_ACCESS',
        patientId,
        accessedBy: accessorId,
        reason,
        timestamp,
        message: `Emergency break-glass access was triggered for patient ${patientId}. Accessor: ${accessorId}. Reason: ${reason}`,
      };

      // Simulate the webhook call (log instead of actual HTTP in dev)
      console.log(`  📤 Notifying: ${contact.name} → ${contact.endpoint}`);

      // In production, replace with actual fetch():
      // const res = await fetch(contact.endpoint, {
      //   method: contact.method,
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(payload),
      // });

      // Simulated success
      return {
        contact: contact.name,
        status: 'delivered',
        payload,
        deliveredAt: new Date().toISOString(),
      };
    })
  );

  const summary = results.map((r, i) => ({
    contact: SIMULATED_CONTACTS[i].name,
    status: r.status === 'fulfilled' ? 'delivered' : 'failed',
    detail: r.status === 'fulfilled' ? r.value : r.reason?.message,
  }));

  console.log(`  ✅ Notifications dispatched: ${summary.filter(s => s.status === 'delivered').length}/${summary.length}`);

  return summary;
}
