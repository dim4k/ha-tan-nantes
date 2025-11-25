# 🚌 Tan Nantes - Home Assistant

A custom integration for Home Assistant that displays upcoming bus and tram departures for the **Tan (Nantes)** network at the stop closest to your location.

This integration includes a native **Custom Lovelace Card**, requiring no complex configuration.

![Tan Nantes Card](https://github.com/dim4k/tan_nantes/blob/main/screenshot.png?raw=true)

## ✨ Features

* **📍 Auto-detection:** Enter your GPS coordinates, and the integration automatically finds the nearest stop via the Tan API.
* **⏱️ Real-time:** Displays real waiting times (API `tempsattente.json`).
* **🎨 Included Card:** A visual Custom Card is automatically installed to display line badges and directions properly.
* **🔔 Sensors:** Creates `sensor` entities that you can use in your own automations.

## 📥 Installation

### Via HACS (Recommended)

1.  Open HACS in Home Assistant.
2.  Go to **Integrations** > Menu (3 dots) > **Custom repositories**.
3.  Add the URL of this repository: `https://github.com/dim4k/tan_nantes`.
4.  Category: **Integration**.
5.  Click **Download**.
6.  **Restart Home Assistant**.

### Configuration

1.  Go to **Settings** > **Devices & Services**.
2.  Click **Add Integration**.
3.  Search for **Tan Nantes**.
4.  Enter the **Latitude** and **Longitude** of your home (or desired location).
5.  The integration will find the nearest stop and create the entities.

## 📺 Dashboard Usage

Since the integration automatically loads the necessary resources, you can immediately add the following card to your dashboard (Manual / YAML mode):

```yaml
type: custom:tan-nantes-card
entity: sensor.tan_prochains_commerce_1
# Replace "commerce_1" with the name of the stop found for your location