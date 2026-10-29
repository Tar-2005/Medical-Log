// ─── Internal Event Bus (Pub/Sub) ───────────────────────────────────────────
// Lightweight event-driven architecture using Node.js EventEmitter.
// Decouples data ingestion from downstream processing (Synthesizer Agent, etc.)
//
// Events:
//   DATA_ADDED         — Emitted when new clinical data is ingested
//   SUMMARY_UPDATED    — Emitted when a patient summary is regenerated
//   EMERGENCY_ACCESS   — Emitted when break-glass endpoint is triggered
//   AUDIT_RECORDED     — Emitted after an audit log entry is written
// ─────────────────────────────────────────────────────────────────────────────

import { EventEmitter } from 'node:events';

/**
 * Typed event names — single source of truth for all event identifiers.
 */
export const Events = Object.freeze({
  DATA_ADDED: 'DATA_ADDED',
  SUMMARY_UPDATED: 'SUMMARY_UPDATED',
  EMERGENCY_ACCESS: 'EMERGENCY_ACCESS',
  AUDIT_RECORDED: 'AUDIT_RECORDED',
});

/**
 * @typedef {Object} DataAddedPayload
 * @property {string} patientId    — UUID of the affected patient
 * @property {string} resourceType — FHIR resource type ('Observation' | 'ClinicalImpression')
 * @property {string} resourceId   — UUID of the newly created resource
 * @property {string} timestamp    — ISO 8601 timestamp of the event
 */

/**
 * @typedef {Object} EmergencyAccessPayload
 * @property {string} patientId     — UUID of the patient
 * @property {string} accessorId    — ID of the person/system that accessed
 * @property {string} reason        — Emergency reason text
 * @property {string} timestamp     — ISO 8601 timestamp
 */

class HealthEventBus extends EventEmitter {
  constructor() {
    super();
    // Allow many listeners (e.g., multiple downstream consumers)
    this.setMaxListeners(50);

    // Log all events in development mode
    if (process.env.NODE_ENV === 'development') {
      this._setupDevLogging();
    }
  }

  /**
   * Emit a typed event with a structured payload.
   * @param {string} eventName — One of the Events constants
   * @param {object} payload   — Event-specific data
   */
  publish(eventName, payload) {
    const enrichedPayload = {
      ...payload,
      _emittedAt: new Date().toISOString(),
      _eventName: eventName,
    };

    this.emit(eventName, enrichedPayload);
    return enrichedPayload;
  }

  /**
   * Subscribe to a typed event.
   * @param {string} eventName — One of the Events constants
   * @param {function} handler — Callback receiving the event payload
   * @returns {function} Unsubscribe function
   */
  subscribe(eventName, handler) {
    this.on(eventName, handler);

    // Return an unsubscribe function for clean teardown
    return () => this.off(eventName, handler);
  }

  /**
   * Subscribe to a typed event for a single occurrence.
   * @param {string} eventName
   * @param {function} handler
   */
  subscribeOnce(eventName, handler) {
    this.once(eventName, handler);
  }

  /**
   * Development-mode logging for all events.
   * @private
   */
  _setupDevLogging() {
    const originalEmit = this.emit.bind(this);

    this.emit = (eventName, ...args) => {
      if (Object.values(Events).includes(eventName)) {
        console.log(
          `\n🔔 [EventBus] ${eventName}`,
          JSON.stringify(args[0], null, 2)
        );
      }
      return originalEmit(eventName, ...args);
    };
  }
}

// Singleton instance — shared across the entire backend
const eventBus = new HealthEventBus();
export default eventBus;
