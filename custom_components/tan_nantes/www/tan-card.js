class TanNantesCard extends HTMLElement {
    // Default configuration definition
    setConfig(config) {
        if (!config.entity) {
            throw new Error("You must define an entity");
        }
        this.config = config;
    }

    set hass(hass) {
        const entityId = this.config.entity;
        const state = hass.states[entityId];

        // If state hasn't changed, do not redraw (perf)
        if (!state || (this._state && this._state === state)) return;
        this._state = state;

        // Retrieve attributes
        const attributes = state.attributes;
        const passages = attributes.prochains_passages || [];

        // Create container if it doesn't exist
        if (!this.content) {
            this.attachShadow({ mode: "open" }); // Shadow DOM to protect CSS
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
          .dest { flex-grow: 1; font-size: 1.05em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-right: 10px; }
          .time { font-weight: bold; font-size: 1.1em; padding: 4px 8px; border-radius: 4px; white-space: nowrap; background: rgba(127,127,127,0.1); color: var(--primary-text-color); }
          .urgent { background-color: rgba(231, 76, 60, 0.2); color: #e74c3c; }
          .no-bus { padding: 10px 16px; font-style: italic; color: var(--secondary-text-color); }
          ha-card { padding-bottom: 10px; }
        </style>
        <ha-card>
          <div class="card-header">
            <ha-icon icon="mdi:bus-clock" class="icon"></ha-icon>
            ${state.attributes.friendly_name || "Arrêt Tan"}
          </div>
          <div id="content"></div>
        </ha-card>
      `;
            this.content = this.shadowRoot.getElementById("content");
        }

        // Dynamic HTML generation
        let html = "";

        // Helper function to generate rows
        const renderRows = (sens) => {
            const busSens = passages.filter((p) => p.sens === sens && p.temps);
            if (busSens.length === 0)
                return `<div class="no-bus">Aucun passage</div>`;

            return busSens
                .map((bus) => {
                    const isUrgent =
                        bus.temps.includes("proche") ||
                        bus.temps.includes("1mn");
                    return `
          <div class="row">
            <div class="badge">${bus.ligne}</div>
            <div class="dest">${bus.destination}</div>
            <div class="time ${isUrgent ? "urgent" : ""}">${bus.temps}</div>
          </div>
        `;
                })
                .join("");
        };

        if (passages.length > 0) {
            html += `<div class="direction-header">Direction 1</div>`;
            html += renderRows(1);
            html += `<div class="direction-header">Direction 2</div>`;
            html += renderRows(2);
        } else {
            html = `<div class="no-bus" style="text-align:center;">Chargement ou API indisponible...</div>`;
        }

        this.content.innerHTML = html;
    }

    // Card size
    getCardSize() {
        return 3;
    }
}

customElements.define("tan-nantes-card", TanNantesCard);
