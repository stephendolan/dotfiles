# HomeKit Bridge Reference

Configure Home Assistant to expose entities to Apple Home via HomeKit.

## Overview

HomeKit Bridge creates a virtual accessory bridge that exposes Home Assistant entities to Apple's Home app. Devices without native HomeKit support become controllable through Siri and the Home app.

## Initial Setup

### Via UI (Recommended)

1. Settings → Devices & Services → Add Integration
2. Search for "HomeKit" → Select "HomeKit Bridge"
3. Select domains/entities to expose
4. Scan QR code from notifications panel in Apple Home app
5. Accept "Uncertified Accessory" warning

### Via YAML

```yaml
homekit:
  - name: Home Assistant Bridge
    port: 21063
    filter:
      include_domains:
        - switch
        - light
        - sensor
        - climate
        - cover
        - fan
        - lock
      exclude_entities:
        - switch.internal_only
        - sensor.debug_sensor
```

## Configuration Options

### Filter Configuration

```yaml
homekit:
  - filter:
      # Include specific domains
      include_domains:
        - switch
        - light

      # Exclude specific entities
      exclude_entities:
        - switch.hidden_switch

      # Include specific entities (overrides domain exclusion)
      include_entities:
        - sensor.temperature

      # Exclude entity globs
      exclude_entity_globs:
        - sensor.debug_*
        - switch.internal_*
```

### Entity Configuration

Override how entities appear in HomeKit:

```yaml
homekit:
  - entity_config:
      switch.living_room_light:
        name: "Living Room Light"
        linked_battery_sensor: sensor.living_room_battery

      cover.garage_door:
        name: "Garage Door"
        linked_obstruction_sensor: binary_sensor.garage_obstruction

      climate.hvac:
        name: "Thermostat"
```

### Multiple Bridges

For more than 150 accessories, create multiple bridges:

```yaml
homekit:
  - name: Home Assistant Lights
    port: 21063
    filter:
      include_domains:
        - light

  - name: Home Assistant Switches
    port: 21064
    filter:
      include_domains:
        - switch

  - name: Home Assistant Climate
    port: 21065
    filter:
      include_domains:
        - climate
        - cover
        - fan
```

## Supported Domains

| Domain | HomeKit Type | Notes |
|--------|-------------|-------|
| `light` | Lightbulb | Brightness, color, temperature |
| `switch` | Switch | On/off only |
| `sensor` | Sensor | Temperature, humidity, etc. |
| `binary_sensor` | Sensor | Motion, contact, etc. |
| `climate` | Thermostat | Heating/cooling control |
| `cover` | Window/Door/Garage | Position control |
| `fan` | Fan | Speed, direction |
| `lock` | Lock | Lock/unlock |
| `alarm_control_panel` | Security System | Arm/disarm |
| `camera` | Camera | Streaming (HKSV support) |
| `media_player` | TV | Limited control |

## Sensor Mappings

HomeKit requires specific device classes for sensors:

| Device Class | HomeKit Type |
|--------------|-------------|
| `temperature` | Temperature Sensor |
| `humidity` | Humidity Sensor |
| `illuminance` | Light Sensor |
| `carbon_dioxide` | Carbon Dioxide Sensor |
| `carbon_monoxide` | Carbon Monoxide Sensor |
| `pm25` | Air Quality Sensor |

Binary sensors:

| Device Class | HomeKit Type |
|--------------|-------------|
| `motion` | Motion Sensor |
| `door` | Contact Sensor |
| `window` | Contact Sensor |
| `opening` | Contact Sensor |
| `smoke` | Smoke Sensor |
| `moisture` | Leak Sensor |
| `occupancy` | Occupancy Sensor |

## Network Requirements

### Ports

- TCP 21063 (or configured port) must be accessible
- Each bridge needs a unique port

### mDNS/Bonjour

HomeKit discovery uses multicast DNS:
- Home Assistant and iOS devices must be on same subnet
- mDNS must not be blocked by router/firewall
- Avahi service should be running (for Linux hosts)

### Docker Networking

Use `network_mode: host` or ensure mDNS forwarding:

```yaml
# docker-compose.yml
services:
  homeassistant:
    network_mode: host  # Simplest for HomeKit
    # OR
    ports:
      - "8123:8123"
      - "21063:21063"  # HomeKit bridge port
```

## Pairing

### QR Code Method

1. Open Home app on iOS
2. Tap + → Add Accessory
3. Scan QR code from Home Assistant notifications

### Manual Code

If QR scanning fails:
1. Tap "More options..." or "Don't Have a Code"
2. Select "Home Assistant Bridge"
3. Enter the 8-digit code shown in HA

### Pairing File Location

Pairing data stored in `.storage/homekit.*`:

```
.storage/
├── homekit.XXXX.aids      # Accessory IDs
├── homekit.XXXX.iids      # Instance IDs
└── homekit.XXXX.state     # Pairing state (encrypted)
```

### Preserving Pairing During Migration

1. Stop both old and new Home Assistant instances
2. Copy all `.storage/homekit.*` files
3. Start new instance
4. Existing pairings remain valid

## Remote Access

HomeKit can work remotely with a Home Hub:

- **Apple TV** (4th generation or later)
- **HomePod** or **HomePod mini**
- **iPad** (left at home, signed into same Apple ID)

The hub relays commands to Home Assistant on the local network.

## Troubleshooting

### Bridge Not Discovered

```bash
# Check port is listening
docker compose exec homeassistant netstat -tlnp | grep 21063

# Test mDNS
avahi-browse -art | grep homekit
```

- Verify port 21063 is accessible
- Check mDNS isn't blocked
- Restart Home Assistant
- Restart iOS device

### Entities Not Appearing

1. Check filter configuration includes the domain/entity
2. Verify entity has required device_class for sensors
3. Check HomeKit Bridge → Configure for exposed entities
4. Look for errors in logs:
   ```yaml
   logger:
     logs:
       homeassistant.components.homekit: debug
   ```

### Slow Response

- Too many entities on one bridge (limit ~150)
- Network latency between HA and iOS device
- Entity state updates too frequent

### "Not Responding" in Home App

1. Check Home Assistant is running
2. Verify network connectivity
3. Check HomeKit bridge logs
4. Re-pair if necessary (Settings → Devices & Services → HomeKit → Re-configure)

### Lost Pairing

If pairing is lost:
1. Delete bridge from iOS Home app
2. Delete `.storage/homekit.*` files
3. Restart Home Assistant
4. Re-pair using QR code

### Duplicate Accessories

After changing entity IDs or moving entities between bridges:
1. Remove affected accessories from Home app
2. Restart Home Assistant
3. They should reappear with new identities

## HomeKit Categories

Override accessory category:

```yaml
homekit:
  - entity_config:
      switch.fan:
        type: fan  # Treat switch as fan

      switch.light:
        type: outlet  # Show as outlet icon
```

Valid types:
- `switch` (default for switches)
- `outlet`
- `fan`
- `light` (for switch acting as light)

## Linked Sensors

Link battery and charging sensors:

```yaml
homekit:
  - entity_config:
      camera.doorbell:
        linked_battery_sensor: sensor.doorbell_battery
        linked_battery_charging_sensor: binary_sensor.doorbell_charging
```

## Device Triggers

Expose automation triggers to HomeKit (requires Advanced Mode):

1. Enable Advanced Mode in user profile
2. Settings → Devices & Services → HomeKit Bridge → Configure
3. Enable device triggers

This allows HomeKit automations to trigger based on HA device events.

## Reference Links

- [HomeKit Bridge Integration](https://www.home-assistant.io/integrations/homekit/)
- [HomeKit Supported Devices](https://www.home-assistant.io/integrations/homekit/#supported-devices)
- [HomeKit Troubleshooting](https://www.home-assistant.io/integrations/homekit/#troubleshooting)
