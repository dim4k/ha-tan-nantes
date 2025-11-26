from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.components.http import StaticPathConfig
from homeassistant.components.frontend import add_extra_js_url
from homeassistant.loader import async_get_integration
from .const import DOMAIN

async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up the integration from a config entry."""
    hass.data.setdefault(DOMAIN, {})

    # Only register static path and js once
    if not hass.data[DOMAIN].get("js_registered"):
        integration = await async_get_integration(hass, DOMAIN)
        version = integration.version

        # 1. Define the virtual URL path to serve static files
        path = hass.config.path("custom_components/tan_nantes/www")
        url_path = "/tan_nantes_static"
        
        await hass.http.async_register_static_paths([
            StaticPathConfig(
                url_path=url_path,
                path=path,
                cache_headers=False
            )
        ])

        # 2. Inject JS directly into the frontend with version for cache busting
        add_extra_js_url(hass, f"{url_path}/tan-card.js?v={version}")
        
        hass.data[DOMAIN]["js_registered"] = True
    
    # 3. Load sensors
    await hass.config_entries.async_forward_entry_setups(entry, ["sensor"])
    return True

async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload the integration."""
    return await hass.config_entries.async_unload_platforms(entry, ["sensor"])