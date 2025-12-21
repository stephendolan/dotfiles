# Storage Files Reference

Home Assistant stores runtime state in `.storage/` as JSON files.

## Overview

The `.storage/` directory contains JSON files that store:
- Entity and device registries
- Integration configurations
- UI settings and dashboards
- Authentication data
- Pairing states

Only edit these files when Home Assistant is stopped.

## Key Storage Files

### Entity Registry

**File**: `core.entity_registry`

Contains all registered entities with unique IDs.

```json
{
  "version": 1,
  "minor_version": 19,
  "key": "core.entity_registry",
  "data": {
    "entities": [
      {
        "entity_id": "switch.garden_fountain",
        "unique_id": "kasa_switch_abc123",
        "platform": "tplink",
        "device_id": "xyz789...",
        "area_id": "garden",
        "disabled_by": null,
        "hidden_by": null,
        "name": null,
        "icon": null,
        "original_name": "Garden Fountain",
        "capabilities": null,
        "device_class": null
      }
    ]
  }
}
```

**Query examples**:

```bash
# List all entity IDs
jq -r '.data.entities[].entity_id' core.entity_registry

# Find by platform
jq '.data.entities[] | select(.platform == "tplink")' core.entity_registry

# Find by area
jq '.data.entities[] | select(.area_id == "garden")' core.entity_registry

# Find disabled entities
jq '.data.entities[] | select(.disabled_by != null)' core.entity_registry

# Count entities by platform
jq -r '.data.entities | group_by(.platform) | map({platform: .[0].platform, count: length})' core.entity_registry
```

### Device Registry

**File**: `core.device_registry`

Maps physical devices to their entities.

```json
{
  "version": 1,
  "key": "core.device_registry",
  "data": {
    "devices": [
      {
        "id": "xyz789...",
        "name": "Garden Fountain",
        "manufacturer": "TP-Link",
        "model": "KP115",
        "sw_version": "1.0.2",
        "area_id": "garden",
        "config_entries": ["01JGAEFHPQA6FM4Y30DC6E7WZ4"],
        "disabled_by": null
      }
    ]
  }
}
```

**Query examples**:

```bash
# List all devices
jq '.data.devices[] | {name, manufacturer, model}' core.device_registry

# Find devices by manufacturer
jq '.data.devices[] | select(.manufacturer == "TP-Link")' core.device_registry

# Count devices by manufacturer
jq '.data.devices | group_by(.manufacturer) | map({manufacturer: .[0].manufacturer, count: length})' core.device_registry
```

### Area Registry

**File**: `core.area_registry`

Room/area definitions.

```json
{
  "version": 1,
  "key": "core.area_registry",
  "data": {
    "areas": [
      {
        "id": "living_room",
        "name": "Living Room",
        "picture": null,
        "floor_id": "main_floor",
        "icon": "mdi:sofa"
      }
    ]
  }
}
```

### Config Entries

**File**: `core.config_entries`

Integration configurations.

```json
{
  "version": 1,
  "key": "core.config_entries",
  "data": {
    "entries": [
      {
        "entry_id": "01JGAEFHPQA6FM4Y30DC6E7WZ4",
        "domain": "awair",
        "title": "Awair",
        "source": "user",
        "state": "loaded"
      }
    ]
  }
}
```

**Query examples**:

```bash
# List all integrations
jq '.data.entries[] | {domain, title, state}' core.config_entries

# Find failed integrations
jq '.data.entries[] | select(.state != "loaded")' core.config_entries
```

### Lovelace Dashboards

**Files**: `lovelace`, `lovelace_dashboards`, `lovelace.*`

Dashboard configurations for UI-mode dashboards.

```json
{
  "version": 1,
  "key": "lovelace",
  "data": {
    "config": {
      "views": [
        {
          "title": "Home",
          "cards": [...]
        }
      ]
    }
  }
}
```

### HomeKit State

**Files**: `homekit.XXXX.state`, `homekit.XXXX.aids`, `homekit.XXXX.iids`

HomeKit pairing and accessory data.

- `.state`: Encrypted pairing keys
- `.aids`: Accessory ID assignments
- `.iids`: Instance ID assignments

**Preserve these files when migrating to keep HomeKit pairings.**

### Authentication

**Files**: `auth`, `auth_provider.homeassistant`

User accounts and authentication data.

```json
{
  "version": 1,
  "key": "auth",
  "data": {
    "users": [
      {
        "id": "abc123...",
        "name": "Admin User",
        "is_owner": true
      }
    ]
  }
}
```

### Restore State

**File**: `core.restore_state`

Entity states saved for restoration on restart.

## File Operations

### Reading Files

```bash
# Pretty print with jq
jq '.' /opt/homeserver/config/homeassistant/.storage/core.entity_registry

# Search across all storage files
grep -r "entity_name" /opt/homeserver/config/homeassistant/.storage/
```

### Editing Files Safely

1. **Stop Home Assistant first**
   ```bash
   docker compose stop homeassistant
   ```

2. **Backup the file**
   ```bash
   cp .storage/core.entity_registry .storage/core.entity_registry.bak
   ```

3. **Edit with jq or text editor**
   ```bash
   # Remove an entity
   jq '.data.entities = [.data.entities[] | select(.entity_id != "sensor.to_remove")]' \
     .storage/core.entity_registry > temp.json && mv temp.json .storage/core.entity_registry
   ```

4. **Start Home Assistant**
   ```bash
   docker compose start homeassistant
   ```

### Common Modifications

#### Rename Entity ID

```bash
jq '(.data.entities[] | select(.entity_id == "switch.old_name")).entity_id = "switch.new_name"' \
  core.entity_registry > temp.json && mv temp.json core.entity_registry
```

#### Assign Entity to Area

```bash
jq '(.data.entities[] | select(.entity_id == "sensor.temp")).area_id = "living_room"' \
  core.entity_registry > temp.json && mv temp.json core.entity_registry
```

#### Remove Orphaned Entity

```bash
jq '.data.entities = [.data.entities[] | select(.entity_id != "sensor.orphaned")]' \
  core.entity_registry > temp.json && mv temp.json core.entity_registry
```

## Navigation Patterns

### Find Entity's Device

```bash
# Get device_id from entity
DEVICE_ID=$(jq -r '.data.entities[] | select(.entity_id == "switch.name") | .device_id' core.entity_registry)

# Look up device details
jq --arg id "$DEVICE_ID" '.data.devices[] | select(.id == $id)' core.device_registry
```

### List Entities for a Device

```bash
DEVICE_ID="xyz789..."
jq --arg id "$DEVICE_ID" '.data.entities[] | select(.device_id == $id) | .entity_id' core.entity_registry
```

### Find Integration's Entities

```bash
# Get entry_id from config_entries
ENTRY_ID=$(jq -r '.data.entries[] | select(.domain == "tplink") | .entry_id' core.config_entries)

# Find all entities for this config entry
jq --arg id "$ENTRY_ID" '.data.entities[] | select(.config_entry_id == $id)' core.entity_registry
```

### Cross-Reference Summary

```bash
# Create a summary of devices with their entities
jq -r '.data.devices[] | "\(.name) (\(.manufacturer) \(.model)): \(.id)"' core.device_registry | while read line; do
  DEVICE_ID=$(echo "$line" | grep -oP '[a-f0-9]{32}')
  echo "$line"
  jq -r --arg id "$DEVICE_ID" '.data.entities[] | select(.device_id == $id) | "  - \(.entity_id)"' core.entity_registry
done
```

## Backup Strategies

### Essential Files for Migration

```bash
# Core configuration
configuration.yaml
automations.yaml
packages/
secrets.yaml

# Critical storage
.storage/core.entity_registry
.storage/core.device_registry
.storage/core.area_registry
.storage/core.config_entries
.storage/homekit.*
.storage/auth*
```

### Full Backup

```bash
# Create backup archive
tar -czvf homeassistant-backup.tar.gz \
  --exclude='.storage/core.restore_state' \
  --exclude='home-assistant.log*' \
  --exclude='deps/' \
  --exclude='tts/' \
  /opt/homeserver/config/homeassistant/
```

## Reference Links

- [Entity Registry Developer Docs](https://developers.home-assistant.io/docs/entity_registry_index/)
- [Device Registry Developer Docs](https://developers.home-assistant.io/docs/device_registry_index/)
