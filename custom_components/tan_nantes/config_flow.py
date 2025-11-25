import logging
import voluptuous as vol
import aiohttp
from homeassistant import config_entries
from .const import DOMAIN, URL_STOPS

_LOGGER = logging.getLogger(__name__)

class TanConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle the config flow for Tan Nantes."""

    VERSION = 1

    async def async_step_user(self, user_input=None):
        """Handle the initial step (user input)."""
        errors = {}

        if user_input is not None:
            lat = user_input["latitude"]
            lon = user_input["longitude"]

            # Verify coordinates via the API
            try:
                url = URL_STOPS.format(lat, lon)
                
                async with aiohttp.ClientSession() as session:
                    async with session.get(url) as response:
                        if response.status != 200:
                            errors["base"] = "cannot_connect"
                        else:
                            stops = await response.json()
                            
                            if not stops:
                                errors["base"] = "no_stops_found"
                            else:
                                # Take the first stop (the closest one)
                                closest_stop = stops[0]
                                stop_code = closest_stop["codeLieu"] # Field defined p.5
                                stop_label = closest_stop["libelle"]     # Field defined p.5

                                # Create the configuration entry stored in HA
                                return self.async_create_entry(
                                    title=f"Stop: {stop_label}",
                                    data={
                                        "stop_code": stop_code,
                                        "stop_label": stop_label
                                    }
                                )
            except Exception:
                errors["base"] = "unknown"

        # Form displayed to the user
        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema({
                vol.Required("latitude"): float,
                vol.Required("longitude"): float,
            }),
            errors=errors,
        )