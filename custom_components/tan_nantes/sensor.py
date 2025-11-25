from datetime import timedelta
import logging
import async_timeout

from homeassistant.components.sensor import SensorEntity
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from .const import DOMAIN, CONF_STOP_CODE, CONF_STOP_LABEL
from .api import TanApiClient

_LOGGER = logging.getLogger(__name__)

async def async_setup_entry(hass, entry, async_add_entities):
    """Set up the sensors based on the config entry."""
    # Handle backward compatibility for existing entries
    stop_code = entry.data.get(CONF_STOP_CODE) or entry.data.get("code_lieu")
    stop_name = entry.data.get(CONF_STOP_LABEL) or entry.data.get("libelle")

    if not stop_code:
        _LOGGER.error("Stop code missing from configuration")
        return

    # Coordinator to manage updates (every 60s)
    coordinator = TanDataCoordinator(hass, stop_code)
    await coordinator.async_config_entry_first_refresh()

    # Create a main sensor
    async_add_entities([TanSensor(coordinator, stop_name)], True)

class TanDataCoordinator(DataUpdateCoordinator):
    """Manage API data retrieval."""

    def __init__(self, hass, stop_code):
        super().__init__(
            hass,
            _LOGGER,
            name="Tan API",
            update_interval=timedelta(seconds=60),
        )
        self.stop_code = stop_code
        self.api = TanApiClient(async_get_clientsession(hass))

    async def _async_update_data(self):
        """Retrieve data from the Tan API."""
        try:
            data = await self.api.get_waiting_time(self.stop_code)
            if data is None:
                raise UpdateFailed("Error fetching data from Tan API")
            return data
        except Exception as err:
            raise UpdateFailed(f"Error communicating with API: {err}")

class TanSensor(SensorEntity):
    """Represent the next bus at the stop."""

    def __init__(self, coordinator, stop_name):
        self.coordinator = coordinator
        self._stop_name = stop_name
        self._attr_unique_id = f"tan_{coordinator.stop_code}_next"
        self._attr_name = f"Tan Next - {stop_name}"
        self._attr_icon = "mdi:bus-clock"

    @property
    def native_value(self):
        """Return the time of the very first bus."""
        data = self.coordinator.data
        if data and isinstance(data, list) and len(data) > 0:
            return data[0].get("temps", "Indisponible")
        return "No bus"

    @property
    def extra_state_attributes(self):
        """Return all next passages as attributes."""
        data = self.coordinator.data
        if not data:
            return {}
        
        next_buses = []
        for passage in data:
            line_info = passage.get("ligne", {})
            next_buses.append({
                "line": line_info.get("numLigne"),
                "type": line_info.get("typeLigne"),
                "destination": passage.get("terminus"),
                "time": passage.get("temps"),
                "direction": passage.get("sens"),
                "traffic_info": passage.get("infotrafic")
            })
            
        return {
            "stop_code": self.coordinator.stop_code,
            "next_departures": next_buses
        }

    async def async_update(self):
        """Update via the coordinator."""
        await self.coordinator.async_request_refresh()