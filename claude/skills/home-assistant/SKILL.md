---
name: home-assistant
description: Manage Home Assistant server configuration, automations, and HomeKit Bridge integration. Use when working with YAML configuration, creating automations, troubleshooting entities, or exposing devices to Apple Home. Covers configuration splitting, packages, Jinja2 templates, entity registries, and Docker deployments.
---

# Managing Home Assistant Servers

This skill provides guidance for navigating, editing, and troubleshooting Home Assistant configuration files. It focuses on manual YAML configuration, Apple HomeKit integration, and patterns that enable agentic navigation of complex setups.

## Server Context

Home Assistant runs at `/opt/homeserver/config/homeassistant` as a Docker container on port 8123. Configuration ownership is `mediaserver:media` (2000:2000).

## Configuration Architecture

### Directory Structure

```
/opt/homeserver/config/homeassistant/
├── configuration.yaml       # Main config (integrations, includes)
├── automations.yaml         # UI-created automations
├── packages/                 # Modular config packages
│   └── *.yml                 # Domain-organized configs
├── custom_components/        # HACS and custom integrations
├── .storage/                 # Runtime state (JSON, do not edit while running)
│   ├── core.entity_registry  # All entity definitions
│   ├── core.device_registry  # Device mappings
│   ├── core.area_registry    # Area/room definitions
│   ├── homekit.*.state       # HomeKit pairing data
│   └── lovelace*             # Dashboard configs
├── home-assistant.log        # Current log file
└── blueprints/               # Automation templates
```

### Include Patterns

Use `!include` directives to split configuration:

```yaml
# Single file include
automation: !include automations.yaml

# Directory as named dict (filename becomes key)
homeassistant:
  packages: !include_dir_named packages

# Directory as merged list (for multiple automation files)
automation manual: !include_dir_merge_list automations/
```

**Include types:**
- `!include file.yaml` - Single file
- `!include_dir_list dir/` - Each file as list entry
- `!include_dir_named dir/` - Filename → content mapping
- `!include_dir_merge_list dir/` - Merge all files into one list
- `!include_dir_merge_named dir/` - Merge all files into one dict

### Packages

Packages bundle related configuration across domains. Create `packages/<name>.yml`:

```yaml
# packages/outdoor.yml
sensor:
  - platform: template
    sensors:
      outdoor_status:
        friendly_name: "Outdoor Status"
        value_template: "{{ states('switch.fountain') }}"

switch:
  - platform: template
    switches:
      all_outdoor:
        turn_on:
          - action: switch.turn_on
            target:
              entity_id:
                - switch.fountain
                - switch.patio_lights

automation:
  - alias: "Sunset Outdoor Lights"
    triggers:
      - trigger: sun
        event: sunset
    actions:
      - action: switch.turn_on
        target:
          entity_id: switch.all_outdoor
```

## Automation YAML Format

### UI Automations

UI-created automations in `automations.yaml` have numeric IDs:

```yaml
- id: '1736267446938'
  alias: Garden Freeze Alert
  triggers:
    - trigger: device
      type: temperature
      device_id: 64028481e29b2f100fb5160f3796f112
      entity_id: 42bf75f526f3820548090337b18bffd3
      below: 33
      for:
        hours: 1
  conditions: []
  actions:
    - action: notify.mobile_app_your_phone
      data:
        message: "Temperature below freezing for 1 hour"
```

### Manual Automations

Manual automations use human-readable IDs and entity IDs:

```yaml
- id: manual_fountain_schedule
  alias: Fountain Schedule
  triggers:
    - trigger: sun
      event: sunrise
      offset: "01:00:00"
  conditions:
    - condition: numeric_state
      entity_id: sensor.outdoor_temperature
      above: 32
  actions:
    - action: switch.turn_on
      target:
        entity_id: switch.garden_fountain
```

### Key Differences

| Aspect      | UI Automations     | Manual Automations       |
| ----------- | ------------------ | ------------------------ |
| IDs         | Numeric timestamps | Descriptive strings      |
| Entity refs | UUID-style IDs     | Entity ID strings        |
| Location    | `automations.yaml` | Packages or separate files |
| Editing     | UI or YAML         | YAML only                |

## HomeKit Bridge Integration

HomeKit Bridge exposes Home Assistant entities to Apple Home.

### Configuration

HomeKit configuration is primarily UI-based. YAML customization options:

```yaml
homekit:
  - name: Home Assistant Bridge
    port: 21063
    filter:
      include_domains:
        - switch
        - light
        - sensor
      exclude_entities:
        - switch.internal_device
```

### Pairing State

Preserve HomeKit pairing when migrating by copying `.storage/homekit.*` files. Stop Home Assistant before copying.

### Entity Exposure

Control which entities appear in HomeKit:
1. Settings → Devices & Services → HomeKit Bridge → Configure
2. Select domains and specific entities
3. Advanced Mode enables device triggers

### Troubleshooting HomeKit

- **Not discovering bridge**: Check TCP port 21063, ensure mDNS/Bonjour works
- **Entities missing**: Check filter configuration and entity domains
- **Lost pairing**: Delete `.storage/homekit.*` files and re-pair

## Entity Management

### Entity Registry

The entity registry (`core.entity_registry`) is JSON. Read to understand entities:

```bash
jq '.data.entities[] | select(.platform == "switch")' \
  /opt/homeserver/config/homeassistant/.storage/core.entity_registry
```

### Customization via YAML

Use `customize.yaml` for entity overrides:

```yaml
# configuration.yaml
homeassistant:
  customize: !include customize.yaml

# customize.yaml
switch.garden_fountain:
  friendly_name: "Garden Fountain"
  icon: mdi:fountain
```

### Finding Entity IDs

```bash
# List all switches
jq -r '.data.entities[] | select(.entity_id | startswith("switch.")) | .entity_id' \
  /opt/homeserver/config/homeassistant/.storage/core.entity_registry

# Find by platform
jq '.data.entities[] | select(.platform == "kasa")' \
  /opt/homeserver/config/homeassistant/.storage/core.entity_registry
```

## Template Sensors (Jinja2)

### Basic Pattern

```yaml
sensor:
  - platform: template
    sensors:
      my_sensor:
        friendly_name: "Sensor Name"
        value_template: "{{ states('sensor.source') }}"
        attribute_templates:
          custom_attr: "{{ state_attr('sensor.source', 'attribute') }}"
```

### Common Functions

```jinja2
{{ states('sensor.name') }}              # Get state
{{ state_attr('sensor.name', 'attr') }}  # Get attribute
{{ is_state('switch.name', 'on') }}      # Boolean check
{{ now().strftime('%I:%M %p') }}         # Current time
{{ as_timestamp(now()) }}                # Unix timestamp
```

### Conditional Logic

```jinja2
{% if states('sensor.temp')|float > 80 %}
  hot
{% else %}
  normal
{% endif %}
```

## Secrets Management

Store sensitive data in `secrets.yaml`:

```yaml
# secrets.yaml
smtp_password: "app_password_here"
notification_email: "user@example.com"

# configuration.yaml
notify:
  - platform: smtp
    password: !secret smtp_password
    recipient: !secret notification_email
```

Secrets cannot be used in Jinja2 templates.

## Validation and Debugging

### Configuration Check

```bash
# Docker container check
docker compose exec homeassistant hass --script check_config

# Or via UI: Developer Tools → YAML → Check Configuration
```

### Enable Debug Logging

```yaml
logger:
  default: warning
  logs:
    homeassistant.components.homekit: debug
    custom_components.weatheralerts: debug
```

### View Logs

```bash
# Follow live logs
docker compose logs -f homeassistant

# Or read log file
tail -f /opt/homeserver/config/homeassistant/home-assistant.log
```

### Developer Tools

- **States**: View/set entity states at `/developer-tools/state`
- **Actions**: Test service calls at `/developer-tools/action`
- **Templates**: Test Jinja2 at `/developer-tools/template`
- **Events**: Monitor events at `/developer-tools/event`

## Agentic Navigation Patterns

When working with Home Assistant configurations:

1. **Read `configuration.yaml` first** to understand include structure
2. **Check packages directory** for domain-specific configurations
3. **Query entity registry** to find entity IDs and platforms
4. **Read automations.yaml** to understand existing automation patterns
5. **Check `.storage/` files** for runtime state (read-only while HA runs)

### File Modification Workflow

1. Stop Home Assistant before editing `.storage/` files
2. Edit YAML files while running (reload via Developer Tools)
3. Validate configuration before restart
4. Check logs after changes for errors

## Common Operations

### Add New Automation

Add to `automations.yaml` for UI management, or create a package for YAML-only:

```yaml
# packages/my_automation.yml
automation:
  - id: my_custom_automation
    alias: "My Custom Automation"
    triggers:
      - trigger: state
        entity_id: binary_sensor.motion
        to: "on"
    actions:
      - action: light.turn_on
        target:
          entity_id: light.living_room
```

### Reload Without Restart

Developer Tools → YAML → Reload sections:
- Reload Automations
- Reload Scripts
- Reload Groups
- Reload Input Booleans

### Restart Home Assistant

```bash
docker compose restart homeassistant
```

## Reference Documentation

- [Configuration.yaml](https://www.home-assistant.io/docs/configuration/)
- [Splitting Configuration](https://www.home-assistant.io/docs/configuration/splitting_configuration/)
- [Packages](https://www.home-assistant.io/docs/configuration/packages/)
- [Automation YAML](https://www.home-assistant.io/docs/automation/yaml/)
- [HomeKit Bridge](https://www.home-assistant.io/integrations/homekit/)
- [Templating](https://www.home-assistant.io/docs/configuration/templating/)
- [Logger](https://www.home-assistant.io/integrations/logger/)
- [Secrets](https://www.home-assistant.io/docs/configuration/secrets)
