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
          .card-footer { padding: 8px 16px; text-align: center; border-top: 1px solid var(--divider-color); }
          .button {
            display: inline-flex; align-items: center; justify-content: center;
            text-decoration: none; color: var(--primary-color); font-weight: 500;
            padding: 6px 12px; border-radius: 4px; transition: background 0.2s;
          }
          .button:hover { background-color: rgba(var(--rgb-primary-color), 0.1); }
          .button ha-icon { margin-right: 6px; --mdc-icon-size: 18px; }
          
          @keyframes pulse {
            0% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.8; transform: scale(1.05); }
            100% { opacity: 1; transform: scale(1); }
          }
          .pulse { animation: pulse 2s infinite; }
          
          ha-card { padding-bottom: 0; overflow: hidden; }
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

        this._render(state.attributes);
    }

    _render(attributes) {
        const departures = attributes.next_departures || [];
        const stopCode = attributes.stop_code;

        if (this._showSchedule) {
            this._renderSchedule(attributes);
            return;
        }

        let html = "";

        if (departures.length > 0) {
            html += `<div class="direction-header">Direction 1</div>`;
            html += this._renderRows(departures, 1);
            html += `<div class="direction-header">Direction 2</div>`;
            html += this._renderRows(departures, 2);
        } else {
            html = `<div class="no-bus" style="text-align:center;">Aucun départ proche</div>`;
        }

        if (stopCode) {
            html += `
                <div class="card-footer">
                    <div class="button" id="schedule-btn" style="cursor: pointer;">
                        <ha-icon icon="mdi:clock-outline"></ha-icon>
                        Voir tous les horaires
                    </div>
                </div>
            `;
        }

        this.content.innerHTML = html;

        const btn = this.content.querySelector("#schedule-btn");
        if (btn) {
            btn.addEventListener("click", () => {
                this._showSchedule = true;
                this._render(attributes);
            });
        }
    }

    _renderSchedule(attributes) {
        const schedules = attributes.schedules || {};
        let html = `
            <div class="card-header" style="border-bottom: 1px solid var(--divider-color); padding-bottom: 10px; margin-bottom: 10px;">
                <ha-icon icon="mdi:arrow-left" class="icon" id="back-btn" style="cursor:pointer; margin-right:10px;"></ha-icon>
                <span>Horaires</span>
            </div>
            <div style="padding: 0 16px 16px; max-height: 400px; overflow-y: auto;">
        `;

        if (Object.keys(schedules).length === 0) {
            html += `<div class="no-bus">Chargement des horaires...</div>`;
        } else {
            const sortedKeys = Object.keys(schedules).sort((a, b) => {
                const lineA = schedules[a].ligne.numLigne;
                const lineB = schedules[b].ligne.numLigne;
                return lineA.localeCompare(lineB, undefined, { numeric: true });
            });

            for (const key of sortedKeys) {
                const data = schedules[key];
                const line = data.ligne.numLigne;
                const direction =
                    data.direction_label || `Sens ${data.ligne.direction}`;
                const color = this._getLineColor(line);

                html += `
                    <div style="margin-bottom: 20px;">
                        <div style="display:flex; align-items:center; margin-bottom:8px; border-bottom: 1px solid rgba(127,127,127,0.1); padding-bottom: 4px;">
                            <div class="badge" style="background-color: ${color}; margin-right: 10px;">${line}</div>
                            <div style="font-weight:500; font-size: 1.1em;">Vers ${direction}</div>
                        </div>
                        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(60px, 1fr)); gap: 8px;">
                `;
                if (data.horaires) {
                    data.horaires.forEach((h) => {
                        html += `
                            <div style="background: rgba(127,127,127, 0.1); padding: 4px; border-radius: 4px; text-align: center; font-size: 0.9em;">
                                <div style="font-weight: bold; color: var(--primary-color);">${
                                    h.heure
                                }</div>
                                <div style="color: var(--secondary-text-color);">${h.passages.join(
                                    " "
                                )}</div>
                            </div>
                        `;
                    });
                }

                html += `</div></div>`;
            }
        }

        html += `</div>`;
        this.content.innerHTML = html;

        const backBtn = this.content.querySelector("#back-btn");
        if (backBtn) {
            backBtn.addEventListener("click", () => {
                this._showSchedule = false;
                this._render(attributes);
            });
        }
    }

    _renderRows(departures, direction) {
        const busDirection = departures.filter(
            (p) => p.direction === direction && p.time
        );
        if (busDirection.length === 0)
            return `<div class="no-bus">Pas de départ</div>`;

        return busDirection
            .map((bus) => {
                // Regex to avoid false positives (e.g. "12mn" matching "2mn")
                // Handles "mn" and "'" as per documentation
                const isWarning = /(^|\D)[23](mn|')/.test(bus.time);
                const isUrgent =
                    bus.time.includes("proche") ||
                    /(^|\D)1(mn|')/.test(bus.time);
                const isTraffic = bus.traffic_info;
                const trafficMessage = bus.traffic_message;
                const tooltip = trafficMessage || "Info trafic non disponible";
                const icon = this._getIconForType(bus.type);
                const color = this._getLineColor(bus.line);

                return `
      <div class="row">
        <ha-icon icon="${icon}" class="mode-icon"></ha-icon>
        <div class="badge" style="background-color: ${color};" title="Ligne ${
                    bus.line
                }">${bus.line}</div>
        <div class="dest">
            ${bus.destination}
            ${
                isTraffic
                    ? `<ha-icon icon="mdi:alert-circle" class="traffic-warning" title="${tooltip.replace(
                          /"/g,
                          "&quot;"
                      )}"></ha-icon>`
                    : ""
            }
        </div>
        <div class="time ${
            isUrgent ? "urgent pulse" : isWarning ? "warning" : ""
        }">${bus.time}</div>
      </div>
    `;
            })
            .join("");
    }

    _getLineColor(line) {
        const colors = {
            1: "#00A754",
            2: "#E30612",
            3: "#2481C3",
            4: "#FDC600",
            5: "#0BBBEF",
            C1: "#0BBBEF",
            C2: "#EE7402",
            C3: "#F7A600",
            C4: "#76B82A",
            C6: "#A877B2",
            C7: "#C8D300",
            C8: "#C8D300",
            C9: "#F5B5D3",
            C20: "#FFED00",
            NA: "#2ecc71", // Navette Aéroport
        };
        return colors[line] || "var(--primary-color)";
    }

    _getIconForType(type) {
        switch (type) {
            case 1:
                return "mdi:tram";
            case 2:
                return "mdi:bus-articulated-front"; // Busway
            case 3:
                return "mdi:bus";
            case 4:
                return "mdi:ferry"; // Navibus
            default:
                return "mdi:bus";
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
