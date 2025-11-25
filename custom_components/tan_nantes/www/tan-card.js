class TanNantesCard extends HTMLElement {
    // 1. Default configuration definition (Stub)
    // This allows pre-filling the YAML when adding the card via the UI
    static getStubConfig() {
        return {
            entity: "sensor.tan_next_commerce", // An example entity
        };
    }

    setConfig(config) {
        if (!config.entity) {
            throw new Error("You must define an entity");
        }
        this.config = config;
    }

    set hass(hass) {
        const entityId = this.config.entity;
        const state = hass.states[entityId];

        if (!state || (this._state && this._state === state)) return;
        this._state = state;

        if (!this.content) {
            this.attachShadow({ mode: "open" });
            this.shadowRoot.innerHTML = `
        <style>
          :host { font-family: Roboto, sans-serif; }
          .card-header { padding: 16px; font-weight: bold; font-size: 1.2em; display: flex; align-items: center; }
          .icon { margin-right: 10px; color: var(--primary-color); }
          .direction-header {
            font-size: 0.85em; text-transform: uppercase; color: var(--secondary-text-color);
            margin: 10px 16px 5px; border-bottom: 1px solid var(--divider-color);
            padding-bottom: 4px; letter-spacing: 1px;
          }
          .row {
            display: flex; align-items: center; padding: 8px 16px;
            border-bottom: 1px solid rgba(127,127,127, 0.1);
          }
          .badge {
            background-color: var(--primary-color); color: white; font-weight: bold;
            padding: 4px 8px; border-radius: 6px; min-width: 25px; text-align: center;
            margin-right: 12px; font-size: 1.1em; box-shadow: 0 1px 3px rgba(0,0,0,0.2);
          }
          .mode-icon { color: var(--secondary-text-color); margin-right: 8px; --mdc-icon-size: 20px; }
          .dest { flex-grow: 1; font-size: 1.05em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-right: 10px; }
          .time { font-weight: bold; font-size: 1.1em; padding: 4px 8px; border-radius: 4px; white-space: nowrap; background: rgba(127,127,127,0.1); color: var(--primary-text-color); }
          .urgent { background-color: rgba(231, 76, 60, 0.2); color: #e74c3c; }
          .warning { background-color: rgba(241, 196, 15, 0.2); color: #f1c40f; }
          .traffic-warning { color: #f39c12; margin-left: 5px; vertical-align: middle; }
          .no-bus { padding: 10px 16px; font-style: italic; color: var(--secondary-text-color); }
          ha-card { padding-bottom: 10px; }
        </style>
        <ha-card>
          <div class="card-header">
            <ha-icon icon="mdi:bus-clock" class="icon"></ha-icon>
            <span id="title">Arrêt Tan</span>
          </div>
          <div id="content"></div>
        </ha-card>
      `;
            this.content = this.shadowRoot.getElementById("content");
            this.titleElement = this.shadowRoot.getElementById("title");
        }

        // Update the title with the stop name (Friendly Name)
        if (this.titleElement) {
            this.titleElement.innerText =
                state.attributes.friendly_name || "Arrêt Tan";
        }

        this._render(state.attributes.next_departures || []);
    }

    _render(departures) {
        let html = "";

        if (departures.length > 0) {
            html += `<div class="direction-header">Direction 1</div>`;
            html += this._renderRows(departures, 1);
            html += `<div class="direction-header">Direction 2</div>`;
            html += this._renderRows(departures, 2);
        } else {
            html = `<div class="no-bus" style="text-align:center;">Loading...</div>`;
        }

        this.content.innerHTML = html;
    }

    _renderRows(departures, direction) {
        const busDirection = departures.filter(
            (p) => p.direction === direction && p.time
        );
        if (busDirection.length === 0)
            return `<div class="no-bus">No departure</div>`;

        return busDirection
            .map((bus) => {
                // Regex to avoid false positives (e.g. "12mn" matching "2mn")
                // Handles "mn" and "'" as per documentation
                const isWarning = /(^|\D)[23](mn|')/.test(bus.time);
                const isUrgent =
                    bus.time.includes("proche") || /(^|\D)1(mn|')/.test(bus.time);
                const isTraffic = bus.traffic_info;
                const icon = this._getIconForType(bus.type);
                
                return `
      <div class="row">
        <ha-icon icon="${icon}" class="mode-icon"></ha-icon>
        <div class="badge type-${bus.type}">${bus.line}</div>
        <div class="dest">
            ${bus.destination}
            ${isTraffic ? '<ha-icon icon="mdi:alert-circle" class="traffic-warning" title="Info Trafic"></ha-icon>' : ''}
        </div>
        <div class="time ${isUrgent ? "urgent" : isWarning ? "warning" : ""}">${
                    bus.time
                }</div>
      </div>
    `;
            })
            .join("");
    }

    _getIconForType(type) {
        switch (type) {
            case 1: return "mdi:tram";
            case 2: return "mdi:bus-articulated-front"; // Busway
            case 3: return "mdi:bus";
            case 4: return "mdi:ferry"; // Navibus
            default: return "mdi:bus";
        }
    }

    getCardSize() {
        return 3;
    }
}

customElements.define("tan-nantes-card", TanNantesCard);

// 2. Registration in the card list (Picker)
// This block makes the card appear in the "Add a card" menu
window.customCards = window.customCards || [];
window.customCards.push({
    type: "tan-nantes-card",
    name: "Tan Nantes",
    preview: true, // Displays a visual preview in the list
    description: "Displays upcoming departures (Bus/Tram) for a given stop.",
});
