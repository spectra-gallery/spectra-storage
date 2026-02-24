const axios = require("axios");
const appCypherConfig = require("../config/app.cypher.config");
const { sendAlertEmail } = require("./mailService");

class StorageConnectionMonitor {
  constructor(opts = {}) {
    this.intervalMs = opts.intervalMs || 30000;
    this.maxBackoffMs = opts.maxBackoffMs || 10 * 60 * 1000;
    this.currentInterval = this.intervalMs;
    this.timer = null;
    this.running = false;
    this.adminEmail = appCypherConfig.ADMIN_EMAIL;
    this.backendUrl = (
      appCypherConfig.BACKEND_PUBLIC_URL || appCypherConfig.BACKEND_API_URL || "http://localhost:8000"
    ).replace(/\/$/, "");
    this.frontendUrl = (appCypherConfig.CLIENT_URL || "http://localhost:3201").replace(/\/$/, "");
    this.lastIncidentByKind = new Map();
  }

  async start() {
    if (this.running) return;
    this.running = true;
    await this._tick();
  }

  stop() {
    if (this.timer) clearTimeout(this.timer);
    this.running = false;
  }

  async _tick() {
    if (!this.running) return;
    try {
      const ok = await this._probeAll();
      if (ok) this.currentInterval = this.intervalMs;
    } finally {
      this.timer = setTimeout(() => this._tick(), this.currentInterval);
    }
  }

  async _probeAll() {
    const results = await Promise.allSettled([
      this._probeBackendHealth(),
      this._probeFrontend(),
    ]);
    const ok = results.every((r) => r.status === "fulfilled" && r.value === true);
    if (!ok) this.currentInterval = Math.min(this.currentInterval * 2, this.maxBackoffMs);
    return ok;
  }

  async _probeBackendHealth() {
    try {
      const url = `${this.backendUrl}/api/health`;
      const { data } = await axios.get(url);
      if (!data || data.ok !== true) throw new Error("backend health not ok");
      return true;
    } catch (err) {
      await this._reportIncident("backend_down", err?.message || String(err));
      return false;
    }
  }

  async _probeFrontend() {
    try {
      await axios.get(this.frontendUrl);
      return true;
    } catch (err) {
      await this._reportIncident("frontend_down", err?.message || String(err));
      return false;
    }
  }

  async _reportIncident(kind, detail) {
    const now = Date.now();
    const last = this.lastIncidentByKind.get(kind) || 0;
    if (now - last < 5 * 60 * 1000) return; // at most one every 5 minutes per kind
    this.lastIncidentByKind.set(kind, now);

    if (!this.adminEmail) return;
    const rehandshakeUrl = `${this.backendUrl}/app/admin/rehandshake/storage`;
    const restartBackendUrl = `${this.backendUrl}/app/admin/restart/backend`;
    const storageStatusUrl = `${this.backendUrl}/app/auth/storage/status`;

    const html = `
      <h3>Storage-side Monitor Incident: ${kind}</h3>
      <p>Detail: ${detail}</p>
      <ul>
        <li><a href="${rehandshakeUrl}">Re-run handshake (via backend)</a></li>
        <li><a href="${storageStatusUrl}">Open storage setup status</a></li>
        <li><a href="${restartBackendUrl}">Restart backend (requires supervisor)</a></li>
      </ul>
    `;

    await sendAlertEmail({
      to: this.adminEmail,
      subject: `[Spectra][Storage] Connection incident: ${kind}`,
      html,
    });
  }
}

module.exports = { StorageConnectionMonitor };
