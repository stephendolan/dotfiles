# Automation YAML Reference

Detailed reference for writing Home Assistant automations in YAML.

## Automation Structure

```yaml
- id: unique_automation_id
  alias: Human-Readable Name
  description: Optional description
  mode: single  # single, restart, queued, parallel
  max: 10       # For queued/parallel modes
  max_exceeded: silent  # silent, warning, error

  variables:
    my_var: "value"
    template_var: "{{ states('sensor.name') }}"

  triggers:
    - trigger: state
      entity_id: sensor.name
      to: "on"

  conditions:
    - condition: state
      entity_id: input_boolean.enabled
      state: "on"

  actions:
    - action: light.turn_on
      target:
        entity_id: light.living_room
      data:
        brightness: 255
```

## Trigger Types

### State Trigger

```yaml
triggers:
  - trigger: state
    entity_id: sensor.name
    from: "off"
    to: "on"
    for:
      hours: 0
      minutes: 5
      seconds: 0
    attribute: current_temperature  # Optional, trigger on attribute
```

### Time Trigger

```yaml
triggers:
  - trigger: time
    at: "07:00:00"

  # With weekday filter
  - trigger: time
    at: "07:00:00"
    weekday:
      - mon
      - tue
      - wed
      - thu
      - fri
```

### Sun Trigger

```yaml
triggers:
  - trigger: sun
    event: sunset
    offset: "-01:00:00"  # 1 hour before sunset

  - trigger: sun
    event: sunrise
    offset: "00:30:00"   # 30 minutes after sunrise
```

### Numeric State Trigger

```yaml
triggers:
  - trigger: numeric_state
    entity_id: sensor.temperature
    above: 75
    below: 85
    for:
      minutes: 10
```

### Device Trigger

```yaml
triggers:
  - trigger: device
    device_id: abc123...
    domain: sensor
    type: temperature
    entity_id: def456...
    below: 33
```

### Template Trigger

```yaml
triggers:
  - trigger: template
    value_template: "{{ states('sensor.temp')|float > 80 }}"
    for:
      minutes: 5
```

### Event Trigger

```yaml
triggers:
  - trigger: event
    event_type: call_service
    event_data:
      domain: light
      service: turn_on
```

### Webhook Trigger

```yaml
triggers:
  - trigger: webhook
    webhook_id: my_unique_webhook_id
    allowed_methods:
      - POST
    local_only: true
```

## Condition Types

### State Condition

```yaml
conditions:
  - condition: state
    entity_id: input_boolean.vacation_mode
    state: "off"

  # Multiple states (OR)
  - condition: state
    entity_id: alarm_control_panel.home
    state:
      - armed_home
      - armed_away
```

### Numeric State Condition

```yaml
conditions:
  - condition: numeric_state
    entity_id: sensor.temperature
    above: 60
    below: 80
```

### Time Condition

```yaml
conditions:
  - condition: time
    after: "07:00:00"
    before: "23:00:00"
    weekday:
      - mon
      - tue
      - wed
      - thu
      - fri
```

### Sun Condition

```yaml
conditions:
  - condition: sun
    before: sunset
    after: sunrise
    before_offset: "-01:00:00"
```

### Template Condition

```yaml
conditions:
  - condition: template
    value_template: "{{ is_state('person.john', 'home') }}"
```

### And/Or/Not Conditions

```yaml
conditions:
  - condition: and
    conditions:
      - condition: state
        entity_id: input_boolean.enabled
        state: "on"
      - condition: time
        after: "08:00:00"

  - condition: or
    conditions:
      - condition: state
        entity_id: person.john
        state: home
      - condition: state
        entity_id: person.jane
        state: home

  - condition: not
    conditions:
      - condition: state
        entity_id: alarm_control_panel.home
        state: armed_away
```

## Action Types

### Service/Action Call

```yaml
actions:
  - action: light.turn_on
    target:
      entity_id: light.living_room
    data:
      brightness_pct: 75
      color_temp: 350
```

### Multiple Targets

```yaml
actions:
  - action: switch.turn_on
    target:
      entity_id:
        - switch.light_1
        - switch.light_2
      area_id: living_room
      device_id:
        - abc123...
```

### Delay

```yaml
actions:
  - delay:
      hours: 0
      minutes: 5
      seconds: 0

  # Template delay
  - delay: "{{ states('input_number.delay_minutes') | int * 60 }}"
```

### Wait for Trigger

```yaml
actions:
  - wait_for_trigger:
      - trigger: state
        entity_id: binary_sensor.motion
        to: "off"
    timeout:
      minutes: 30
    continue_on_timeout: true
```

### Wait Template

```yaml
actions:
  - wait_template: "{{ is_state('vacuum.roborock', 'docked') }}"
    timeout:
      minutes: 60
```

### Choose (If/Else)

```yaml
actions:
  - choose:
      - conditions:
          - condition: state
            entity_id: input_select.mode
            state: "away"
        sequence:
          - action: light.turn_off
            target:
              entity_id: all

      - conditions:
          - condition: state
            entity_id: input_select.mode
            state: "night"
        sequence:
          - action: light.turn_on
            target:
              entity_id: light.bedroom
            data:
              brightness_pct: 10

    default:
      - action: light.turn_on
        target:
          entity_id: light.living_room
```

### Repeat

```yaml
actions:
  # Count-based
  - repeat:
      count: 3
      sequence:
        - action: light.toggle
          target:
            entity_id: light.alert
        - delay:
            seconds: 1

  # While condition
  - repeat:
      while:
        - condition: state
          entity_id: input_boolean.keep_running
          state: "on"
      sequence:
        - action: script.do_something
        - delay:
            seconds: 30

  # Until condition
  - repeat:
      until:
        - condition: numeric_state
          entity_id: sensor.counter
          above: 10
      sequence:
        - action: counter.increment
          target:
            entity_id: counter.my_counter
```

### Variables in Actions

```yaml
actions:
  - variables:
      brightness: "{{ (states('sensor.light_level')|float / 100 * 255)|int }}"
  - action: light.turn_on
    target:
      entity_id: light.living_room
    data:
      brightness: "{{ brightness }}"
```

### Stop and Continue

```yaml
actions:
  - if:
      - condition: state
        entity_id: input_boolean.disabled
        state: "on"
    then:
      - stop: "Automation disabled"

  - action: light.turn_on
    target:
      entity_id: light.main
```

## Mode Options

| Mode       | Description                                   |
| ---------- | --------------------------------------------- |
| `single`   | Cancel new runs if already running (default)  |
| `restart`  | Stop current run and start new one            |
| `queued`   | Queue new runs                                |
| `parallel` | Run multiple instances simultaneously         |

## Stored Traces

Configure debugging traces:

```yaml
- id: my_automation
  alias: My Automation
  trace:
    stored_traces: 10  # Default is 5
```

## Full Example

```yaml
- id: smart_lighting
  alias: Smart Living Room Lighting
  description: Adjust lighting based on time and presence
  mode: restart

  triggers:
    - trigger: state
      entity_id: binary_sensor.living_room_motion
      to: "on"
    - trigger: sun
      event: sunset

  conditions:
    - condition: state
      entity_id: input_boolean.smart_lighting_enabled
      state: "on"

  actions:
    - choose:
        - conditions:
            - condition: sun
              after: sunset
              before: sunrise
          sequence:
            - action: light.turn_on
              target:
                entity_id: light.living_room
              data:
                brightness_pct: 70
                color_temp: 400
        - conditions:
            - condition: time
              after: "06:00:00"
              before: "09:00:00"
          sequence:
            - action: light.turn_on
              target:
                entity_id: light.living_room
              data:
                brightness_pct: 100
                color_temp: 250
      default:
        - action: light.turn_on
          target:
            entity_id: light.living_room
          data:
            brightness_pct: 50

    - wait_for_trigger:
        - trigger: state
          entity_id: binary_sensor.living_room_motion
          to: "off"
          for:
            minutes: 10
      timeout:
        minutes: 60

    - action: light.turn_off
      target:
        entity_id: light.living_room
```

## Reference Links

- [Automation YAML Documentation](https://www.home-assistant.io/docs/automation/yaml/)
- [Automation Triggers](https://www.home-assistant.io/docs/automation/trigger/)
- [Automation Conditions](https://www.home-assistant.io/docs/automation/condition/)
- [Automation Actions](https://www.home-assistant.io/docs/automation/action/)
- [Script Syntax](https://www.home-assistant.io/docs/scripts/)
