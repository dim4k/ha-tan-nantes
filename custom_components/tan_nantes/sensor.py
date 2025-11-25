from datetime import timedelta
import logging
import aiohttp
import async_timeout

from homeassistant.components.sensor import SensorEntity
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from .const import DOMAIN, URL_WAITING_TIME

_LOGGER = logging.getLogger(__name__)

async def async_setup_entry(hass, entry, async_add_entities):
    """Set up the sensors based on the config entry."""
    stop_code = entry.data["stop_code"]
    stop_name = entry.data["stop_label"]

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

    async def _async_update_data(self):
        """Retrieve data from the Tan API."""
        url = URL_WAITING_TIME.format(self.stop_code)
        
        async with async_timeout.timeout(10):
            async with aiohttp.ClientSession() as session:
                async with session.get(url) as response:
                    if response.status != 200:
                        raise UpdateFailed(f"Erreur API: {response.status}")
                    return await response.json()

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
                "destination": passage.get("terminus"),
                "time": passage.get("temps"),
                "direction": passage.get("sens")
            })
            
        return {"next_departures": next_buses}

    async def async_update(self):
        """Update via the coordinator."""
        await self.coordinator.async_request_refresh()