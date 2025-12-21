# Jinja2 Templates Reference

Home Assistant uses Jinja2 for dynamic configuration and automations.

## Basic Syntax

### Expressions

```jinja2
{{ expression }}           # Output value
{% statement %}            # Control flow
{# comment #}              # Comment (not rendered)
```

### Quoting in YAML

Single-line templates require quotes:

```yaml
value_template: "{{ states('sensor.temp') }}"

# Multi-line use block scalar
value_template: >-
  {% if states('sensor.temp')|float > 80 %}
    hot
  {% else %}
    normal
  {% endif %}
```

## State Functions

### Getting State Values

```jinja2
{{ states('sensor.temperature') }}                    # State value as string
{{ states('sensor.temperature')|float }}              # Convert to float
{{ states('sensor.temperature')|float(0) }}           # With default
{{ states('sensor.temperature')|int }}                # Convert to integer

{{ state_attr('sensor.temp', 'unit_of_measurement') }} # Get attribute
{{ state_attr('climate.hvac', 'temperature') }}        # Thermostat setpoint
```

### Boolean Checks

```jinja2
{{ is_state('switch.light', 'on') }}                  # Returns True/False
{{ is_state('person.john', 'home') }}
{{ is_state_attr('climate.hvac', 'hvac_mode', 'heat') }}
{{ has_value('sensor.temp') }}                        # Not unavailable/unknown
```

### State Object Access

```jinja2
{{ states.sensor.temperature.state }}                  # Same as states()
{{ states.sensor.temperature.attributes.unit_of_measurement }}
{{ states.sensor.temperature.last_changed }}           # Datetime
{{ states.sensor.temperature.last_updated }}
```

## Time Functions

### Current Time

```jinja2
{{ now() }}                                           # Current datetime
{{ now().strftime('%Y-%m-%d') }}                      # Format: 2025-12-21
{{ now().strftime('%I:%M %p') }}                      # Format: 03:45 PM
{{ now().hour }}                                      # Current hour (0-23)
{{ now().weekday() }}                                 # 0=Monday, 6=Sunday
```

### Timestamps

```jinja2
{{ as_timestamp(now()) }}                             # Unix timestamp
{{ as_timestamp(states.sensor.temp.last_changed) }}   # Entity timestamp
{{ as_datetime(1734789600) }}                         # Timestamp to datetime
```

### Time Comparisons

```jinja2
{{ now() > today_at('18:00') }}                       # After 6 PM?
{{ now() < today_at('08:00') }}                       # Before 8 AM?

{{ as_timestamp(now()) - as_timestamp(states.sensor.temp.last_updated) }}  # Seconds since update
```

### Time Deltas

```jinja2
{{ now() - timedelta(hours=1) }}                      # 1 hour ago
{{ now() + timedelta(days=7) }}                       # 1 week from now
{{ (now() - states.sensor.temp.last_changed).total_seconds() }}  # Seconds since change
```

## Filters

### Type Conversion

```jinja2
{{ states('sensor.temp')|float }}
{{ states('sensor.count')|int }}
{{ states('sensor.value')|string }}
{{ states('sensor.flag')|bool }}
```

### Math Filters

```jinja2
{{ states('sensor.temp')|float|round(1) }}            # Round to 1 decimal
{{ states('sensor.temp')|float|abs }}                 # Absolute value
{{ [1, 2, 3, 4, 5]|sum }}                             # Sum: 15
{{ [1, 2, 3, 4, 5]|max }}                             # Maximum: 5
{{ [1, 2, 3, 4, 5]|min }}                             # Minimum: 1
{{ [1, 2, 3, 4, 5]|average }}                         # Average: 3
```

### String Filters

```jinja2
{{ 'hello'|upper }}                                   # HELLO
{{ 'HELLO'|lower }}                                   # hello
{{ 'hello world'|title }}                             # Hello World
{{ 'hello world'|capitalize }}                        # Hello world
{{ '  spaces  '|trim }}                               # Remove whitespace
{{ 'hello'|replace('l', 'L') }}                       # heLLo
{{ 'text'|truncate(10) }}                             # Truncate with ellipsis
```

### Regex Filters

```jinja2
{{ 'abc123'|regex_match('\\d+') }}                    # Match at start
{{ 'abc123'|regex_search('\\d+') }}                   # Search anywhere
{{ 'abc123'|regex_replace('\\d+', 'XYZ') }}           # Replace: abcXYZ
{{ 'a,b,c'|regex_findall('[a-z]') }}                  # ['a', 'b', 'c']
```

### List/Dict Filters

```jinja2
{{ [1, 2, 3]|first }}                                 # 1
{{ [1, 2, 3]|last }}                                  # 3
{{ [1, 2, 3]|length }}                                # 3
{{ [1, 2, 3]|join(', ') }}                            # "1, 2, 3"
{{ [1, 2, 3, 2, 1]|unique|list }}                     # [1, 2, 3]
{{ [3, 1, 2]|sort }}                                  # [1, 2, 3]

{{ dict.keys()|list }}                                # Get dict keys
{{ dict.values()|list }}                              # Get dict values
{{ dict.items()|list }}                               # Get key-value pairs
```

### Default Values

```jinja2
{{ states('sensor.temp')|float(default=0) }}          # Default if conversion fails
{{ variable|default('fallback') }}                    # Default if undefined
{{ states('sensor.unknown')|default('N/A', true) }}   # Default for unavailable
```

## Control Structures

### Conditionals

```jinja2
{% if states('sensor.temp')|float > 80 %}
  Hot
{% elif states('sensor.temp')|float > 60 %}
  Warm
{% else %}
  Cool
{% endif %}
```

### Ternary Operator

```jinja2
{{ 'Hot' if states('sensor.temp')|float > 80 else 'Normal' }}
```

### Loops

```jinja2
{% for light in states.light %}
  {{ light.entity_id }}: {{ light.state }}
{% endfor %}

{% for i in range(5) %}
  Item {{ i }}
{% endfor %}

{% for key, value in dict.items() %}
  {{ key }}: {{ value }}
{% endfor %}
```

### Loop Variables

```jinja2
{% for item in items %}
  {{ loop.index }}      # 1-based index
  {{ loop.index0 }}     # 0-based index
  {{ loop.first }}      # True for first item
  {{ loop.last }}       # True for last item
  {{ loop.length }}     # Total items
{% endfor %}
```

## Namespace for Loop State

```jinja2
{% set ns = namespace(count=0) %}
{% for light in states.light %}
  {% if light.state == 'on' %}
    {% set ns.count = ns.count + 1 %}
  {% endif %}
{% endfor %}
{{ ns.count }} lights are on
```

## Home Assistant Extensions

### Entity Queries

```jinja2
# All entities in a domain
{{ states.light | selectattr('state', 'eq', 'on') | list | count }}

# Entities matching pattern
{{ states | selectattr('entity_id', 'match', 'light.living_room.*') | list }}

# Filter by attribute
{{ states.climate | selectattr('attributes.current_temperature', 'defined') | list }}
```

### Area Functions

```jinja2
{{ area_name('sensor.living_room_temp') }}            # Get area name
{{ area_id('Living Room') }}                          # Get area ID
{{ area_entities('living_room') }}                    # Entities in area
{{ area_devices('living_room') }}                     # Devices in area
```

### Device Functions

```jinja2
{{ device_attr('abc123...', 'name') }}                # Device name
{{ device_attr('abc123...', 'manufacturer') }}        # Manufacturer
{{ device_entities('abc123...') }}                    # Entities for device
{{ device_id('sensor.temp') }}                        # Get device ID
```

### Integration Helpers

```jinja2
{{ integration_entities('hue') }}                     # Entities from integration
{{ integration_entities('homekit') | list }}
```

## Common Patterns

### Get Average of Multiple Sensors

```jinja2
{{ [
  states('sensor.temp_1')|float,
  states('sensor.temp_2')|float,
  states('sensor.temp_3')|float
] | average | round(1) }}
```

### Check If Entity Exists

```jinja2
{% if states('sensor.maybe_exists') not in ['unknown', 'unavailable'] %}
  {{ states('sensor.maybe_exists') }}
{% endif %}

# Or use has_value
{% if has_value('sensor.maybe_exists') %}
  {{ states('sensor.maybe_exists') }}
{% endif %}
```

### Format Duration

```jinja2
{% set seconds = states('sensor.uptime')|int %}
{% set hours = seconds // 3600 %}
{% set minutes = (seconds % 3600) // 60 %}
{{ hours }}h {{ minutes }}m
```

### Safe Attribute Access

```jinja2
{{ state_attr('sensor.weather', 'temperature') | default('N/A') }}
```

## Template Sensors

### Basic Template Sensor

```yaml
sensor:
  - platform: template
    sensors:
      average_temperature:
        friendly_name: "Average Temperature"
        unit_of_measurement: "°F"
        value_template: >-
          {{ [
            states('sensor.living_room_temp')|float,
            states('sensor.bedroom_temp')|float
          ] | average | round(1) }}
```

### With Attributes

```yaml
sensor:
  - platform: template
    sensors:
      weather_summary:
        friendly_name: "Weather Summary"
        value_template: "{{ states('weather.home') }}"
        attribute_templates:
          temperature: "{{ state_attr('weather.home', 'temperature') }}"
          humidity: "{{ state_attr('weather.home', 'humidity') }}"
          forecast: "{{ state_attr('weather.home', 'forecast')[0] if state_attr('weather.home', 'forecast') else None }}"
```

### Availability Template

```yaml
sensor:
  - platform: template
    sensors:
      my_sensor:
        value_template: "{{ states('sensor.source') }}"
        availability_template: "{{ has_value('sensor.source') }}"
```

## Debugging Templates

Test templates at Developer Tools → Template in the UI.

Common debugging patterns:

```jinja2
# Check entity exists
{{ states('sensor.name') }}
{{ states.sensor.name is defined }}

# View all attributes
{{ states.sensor.name.attributes }}

# Check type
{{ states('sensor.value').__class__.__name__ }}
```

## Reference Links

- [Home Assistant Templating](https://www.home-assistant.io/docs/configuration/templating/)
- [Jinja2 Documentation](https://jinja.palletsprojects.com/en/3.1.x/templates/)
- [Template Sensor](https://www.home-assistant.io/integrations/template/)
