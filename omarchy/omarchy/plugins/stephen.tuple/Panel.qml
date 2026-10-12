import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import Quickshell
import Quickshell.Io
import qs.Commons
import qs.Ui

Panel {
  id: root
  moduleName: "stephen.tuple"
  ipcTarget: "stephen.tuple"
  manageIpc: false

  readonly property color foreground: bar ? bar.foreground : Color.foreground
  readonly property color urgent: bar ? bar.urgent : Color.urgent
  readonly property color dim: Qt.darker(foreground, 1.55)
  readonly property color accent: Color.accent
  readonly property string fontFamily: bar ? bar.fontFamily : Style.font.family
  readonly property int refreshSeconds: Math.max(5, Number(settings.refreshIntervalSec || 15))
  readonly property string environment: settings.environment === "Staging" ? "staging" : "production"
  readonly property string environmentLabel: environment === "staging" ? "Staging" : "Production"
  readonly property string client: environment === "staging"
    ? Quickshell.env("HOME") + "/bin/tuple-staging"
    : Quickshell.env("HOME") + "/.local/bin/tuple"
  readonly property string statusScript: Quickshell.env("HOME") + "/.config/omarchy/plugins/stephen.tuple/Status.py"

  function alpha(color, opacity) {
    return Qt.rgba(color.r, color.g, color.b, opacity)
  }

  property var contacts: []
  property var rooms: []
  property var call: ({ active: false, muted: false, sharing: false, participants: [] })
  property bool authenticated: false
  property bool daemon: false
  property bool refreshing: false
  property string errorText: ""
  property string actionText: ""
  property string section: "contacts"
  property string query: ""
  property var selectedRoom: null

  component ActionButton: Rectangle {
    id: actionButton
    property string text: ""
    property bool active: false
    property bool destructive: false
    signal clicked()
    implicitWidth: label.implicitWidth + Style.space(22)
    implicitHeight: Style.space(34)
    radius: Style.cornerRadius
    color: destructive
      ? root.alpha(root.urgent, mouse.containsMouse ? 0.22 : 0.12)
      : (active
        ? Style.selectedFillFor(root.foreground, root.accent)
        : (mouse.containsMouse ? Style.hoverFillFor(root.foreground, root.accent) : root.alpha(root.foreground, 0.045)))
    border.width: 1
    border.color: destructive
      ? root.alpha(root.urgent, mouse.containsMouse ? 0.84 : 0.54)
      : (active || mouse.containsMouse ? root.accent : root.alpha(root.foreground, 0.28))
    Text {
      id: label
      anchors.centerIn: parent
      text: actionButton.text
      color: actionButton.destructive ? root.urgent : (actionButton.active || mouse.containsMouse ? root.accent : root.foreground)
      font.family: root.fontFamily
      font.pixelSize: Style.font.bodySmall
      font.bold: actionButton.active
    }
    MouseArea {
      id: mouse
      anchors.fill: parent
      hoverEnabled: true
      cursorShape: Qt.PointingHandCursor
      onClicked: actionButton.clicked()
    }
  }

  component JoinButton: Rectangle {
    id: joinButton
    signal clicked()
    Layout.preferredWidth: Style.space(72)
    Layout.minimumWidth: Style.space(72)
    Layout.maximumWidth: Style.space(72)
    Layout.preferredHeight: Style.space(30)
    radius: Style.cornerRadius
    color: joinMouse.containsMouse ? root.alpha(root.accent, 0.16) : root.alpha(root.accent, 0.08)
    border.width: 1
    border.color: root.alpha(root.accent, joinMouse.containsMouse ? 0.72 : 0.34)

    Row {
      anchors.centerIn: parent
      spacing: Style.space(5)
      Text {
        text: "Join"
        color: root.accent
        font.family: root.fontFamily
        font.pixelSize: Style.font.bodySmall
        font.bold: true
      }
      Text {
        text: "󰅂"
        color: root.accent
        font.family: root.fontFamily
        font.pixelSize: Style.font.bodySmall
      }
    }

    MouseArea {
      id: joinMouse
      anchors.fill: parent
      hoverEnabled: true
      cursorShape: Qt.PointingHandCursor
      onClicked: joinButton.clicked()
    }
  }

  component IconButton: Rectangle {
    id: iconButton
    property string icon: ""
    property string label: ""
    property bool active: false
    property bool destructive: false
    signal clicked()
    implicitWidth: Style.space(36)
    implicitHeight: Style.space(32)
    radius: Style.cornerRadius
    color: destructive
      ? root.alpha(root.urgent, iconMouse.containsMouse ? 0.24 : 0.12)
      : (active
        ? root.alpha(root.accent, 0.18)
        : (iconMouse.containsMouse ? root.alpha(root.foreground, 0.14) : "transparent"))
    border.width: 1
    border.color: destructive
      ? root.alpha(root.urgent, iconMouse.containsMouse ? 0.84 : 0.48)
      : (active ? root.alpha(root.accent, 0.74) : root.alpha(root.foreground, iconMouse.containsMouse ? 0.32 : 0.18))

    Text {
      anchors.centerIn: parent
      text: iconButton.icon
      color: iconButton.destructive ? root.urgent : (iconButton.active || iconMouse.containsMouse ? root.accent : root.foreground)
      font.family: root.fontFamily
      font.pixelSize: Style.font.title
    }
    MouseArea {
      id: iconMouse
      anchors.fill: parent
      hoverEnabled: true
      cursorShape: Qt.PointingHandCursor
      onClicked: iconButton.clicked()
    }
    ToolTip.visible: iconMouse.containsMouse
    ToolTip.delay: 500
    ToolTip.text: iconButton.label
  }

  readonly property var visibleContacts: {
    var needle = query.toLowerCase().trim()
    if (needle === "") return contacts.slice(0, 18)
    return contacts.filter(function(c) {
      return String(c.name + " " + c.email).toLowerCase().indexOf(needle) >= 0
    }).slice(0, 18)
  }
  readonly property var visibleRooms: rooms.slice(0, 20)
  readonly property int onlineCount: contacts.filter(function(c) { return c.presence === "available" }).length

  implicitWidth: button.implicitWidth
  implicitHeight: button.implicitHeight

  function run(command, message) {
    if (action.running) return
    action.command = command
    actionText = message
    errorText = ""
    action.running = true
  }

  function clientCommand(args) {
    return [client].concat(args)
  }

  function switchEnvironment(value) {
    if (environmentLabel === value) return
    run(["omarchy", "bar", "set", "stephen.tuple", "environment", value], "Switching to " + value + "…")
  }

  function openTupleUi() {
    run(clientCommand(["ui"]), "Opening Tuple UI…")
  }

  function toggleMute() {
    run(clientCommand([call.muted ? "unmute" : "mute"]), "")
  }

  function refresh() {
    if (!status.running) {
      refreshing = true
      status.running = true
    }
  }

  function callPicker() {
    if (bar) bar.run("uwsm app -- ghostty -e " + client + " call")
    close()
  }

  function joinRoom(room) {
    selectedRoom = room
    run(clientCommand(["join", room.url]), "Joining " + room.name + "…")
  }

  function callLocation() {
    if (selectedRoom) return selectedRoom.name
    return call.participants && call.participants.length > 0 ? "Audio call" : "Your personal room"
  }

  function participantSummary() {
    if (!call.participants || call.participants.length === 0) return "Just you"
    return "With " + call.participants.map(function(person) { return person.name }).join(", ")
  }

  function presenceColor(presence) {
    if (presence === "available") return "#6fcf97"
    if (presence === "unavailable") return "#f2c94c"
    return dim
  }

  onOpenedChanged: if (opened) {
    query = ""
    refresh()
  }

  Timer {
    interval: root.refreshSeconds * 1000
    running: true
    repeat: true
    triggeredOnStart: true
    onTriggered: root.refresh()
  }

  // Keep Tuple reachable after login/reboot. If a daemon already exists this
  // command simply hands off to it and exits.
  Process {
    command: root.clientCommand(["on"])
    running: true
  }

  Process {
    id: status
    running: false
    command: ["python3", root.statusScript, root.environment]
    stdout: StdioCollector {
      waitForEnd: true
      onStreamFinished: {
        try {
          var data = JSON.parse(text)
          root.contacts = data.contacts || []
          root.rooms = data.rooms || []
          var nextCall = data.call || ({ active: false, muted: false, sharing: false })
          // Linux reports mute/share changes to the command's stdout, not the
          // daemon log Status.py polls. Preserve those confirmed local values
          // while the same call remains active.
          root.call = ({
            active: nextCall.active === true,
            muted: nextCall.active && root.call.active ? root.call.muted : nextCall.muted === true,
            sharing: nextCall.active && root.call.active ? root.call.sharing : nextCall.sharing === true,
            participants: nextCall.participants || []
          })
          if (!nextCall.active && !action.running) root.selectedRoom = null
          root.authenticated = data.authenticated === true
          root.daemon = data.daemon === true
          root.errorText = ""
        } catch (e) {
          root.errorText = "Tuple status could not be read"
        }
      }
    }
    onExited: root.refreshing = false
  }

  Process {
    id: action
    running: false
    stdout: StdioCollector { id: actionOutput; waitForEnd: true }
    stderr: StdioCollector {
      waitForEnd: true
      onStreamFinished: if (text.trim() !== "") root.errorText = text.trim()
    }
    onExited: function(exitCode) {
      var output = actionOutput.text.trim()
      var changedMute = output === "muted" || output === "already muted"
        || output === "unmuted" || output === "already unmuted"
      if (exitCode !== 0) {
        if (root.errorText === "") root.errorText = "Tuple command failed"
      } else if (output.indexOf("can't ") === 0 || output.indexOf("error:") === 0) {
        root.errorText = output
      } else {
        if (output === "muted" || output === "already muted")
          root.call = ({ active: root.call.active, muted: true, sharing: root.call.sharing, participants: root.call.participants || [] })
        else if (output === "unmuted" || output === "already unmuted")
          root.call = ({ active: root.call.active, muted: false, sharing: root.call.sharing, participants: root.call.participants || [] })
        else if (output.indexOf("screen share initiated") >= 0 || output.indexOf("already sharing") >= 0)
          root.call = ({ active: root.call.active, muted: root.call.muted, sharing: true, participants: root.call.participants || [] })
        else if (output === "success")
          root.call = ({ active: root.call.active, muted: root.call.muted, sharing: false, participants: root.call.participants || [] })
        root.actionText = ""
      }
      if (!changedMute) refreshDelay.restart()
    }
  }

  Timer { id: refreshDelay; interval: 600; onTriggered: root.refresh() }

  IpcHandler {
    target: root.ipcTarget
    function open(): void { root.open() }
    function close(): void { root.close() }
    function toggle(): void { root.toggle() }
    function refresh(): string { root.refresh(); return "ok" }
    function mute(): string { root.run(root.clientCommand(["mute"]), ""); return "ok" }
    function unmute(): string { root.run(root.clientCommand(["unmute"]), ""); return "ok" }
    function end(): string { root.run(root.clientCommand(["end"]), "Ending call…"); return "ok" }
  }

  BarIconButton {
    id: button
    anchors.fill: parent
    bar: root.bar
    text: root.call.active ? "󱒃" : "󰍹"
    active: root.call.active
    activeColor: "#6fcf97"
    foreground: root.dim
    tooltipText: root.call.active ? "Tuple · In call" : "Tuple · Ready"
    onPressed: function(buttonCode) {
      if (buttonCode === Qt.RightButton && root.call.active)
        root.toggleMute()
      else if (buttonCode === Qt.MiddleButton) root.callPicker()
      else root.toggle()
    }
  }

  KeyboardPanel {
    id: panel
    anchorItem: button
    owner: root
    bar: root.bar
    open: root.opened
    contentWidth: panel.fittedContentWidth(Style.space(420))
    contentHeight: panel.fittedContentHeight(panelContent.implicitHeight, Style.space(620))

    ColumnLayout {
      id: panelContent
      anchors.fill: parent
      spacing: Style.space(12)

      Column {
        id: stickyContent
        Layout.fillWidth: true
        spacing: Style.space(12)

        PanelHero {
          width: parent.width
          title: "Tuple · " + root.environmentLabel
          meta: root.call.active ? root.callLocation() + " · " + root.participantSummary() : (root.onlineCount + " available · " + (root.daemon ? "ready" : "offline"))
          foreground: root.foreground
          fontFamily: root.fontFamily
          iconComponent: Component {
            Text {
              text: root.call.active ? "󰍬" : "󰕧"
              color: root.call.active ? root.accent : root.foreground
              font.family: root.fontFamily
              font.pixelSize: Style.font.display
            }
          }
        }

        Rectangle {
          width: parent.width
          height: Style.space(40)
          radius: Style.cornerRadius
          color: root.call.active ? root.alpha(root.accent, 0.10) : root.alpha(root.foreground, 0.04)
          border.width: 1
          border.color: root.call.active ? root.alpha(root.accent, 0.50) : root.alpha(root.foreground, 0.20)

          RowLayout {
            anchors.fill: parent
            anchors.leftMargin: Style.space(10)
            anchors.rightMargin: Style.space(5)
            spacing: Style.space(6)

            Rectangle {
              Layout.preferredWidth: Style.space(8)
              Layout.preferredHeight: Style.space(8)
              radius: width / 2
              color: root.call.active ? "#6fcf97" : root.dim
            }
            Text {
              text: root.call.active ? "In call" : root.onlineCount + " available"
              color: root.foreground
              font.family: root.fontFamily
              font.pixelSize: Style.font.bodySmall
              font.bold: true
            }
            Item { Layout.fillWidth: true }

            IconButton {
              visible: root.call.active
              icon: root.call.muted ? "󰍭" : "󰍬"
              label: root.call.muted ? "Unmute microphone" : "Mute microphone"
              active: !root.call.muted
              onClicked: root.toggleMute()
            }
            IconButton {
              visible: root.call.active
              icon: "󱒃"
              label: root.call.sharing ? "Stop screen sharing" : "Share screen"
              active: root.call.sharing
              onClicked: root.run(root.clientCommand([root.call.sharing ? "unshare" : "share"]), root.call.sharing ? "Stopping share…" : "Sharing…")
            }
            IconButton {
              visible: root.call.active
              icon: "󰖱"
              label: "Open Tuple UI for advanced call controls"
              onClicked: root.openTupleUi()
            }
            IconButton {
              visible: root.call.active
              icon: "󰏵"
              label: "End call"
              destructive: true
              onClicked: root.run(root.clientCommand(["end"]), "Ending call…")
            }

            IconButton {
              visible: !root.call.active
              icon: "󰙙"
              label: "Start a new call"
              onClicked: root.run(root.clientCommand(["new"]), "Starting call…")
            }
            IconButton {
              visible: !root.call.active
              icon: "󰀔"
              label: "Call a contact"
              onClicked: root.callPicker()
            }
            IconButton {
              icon: "󰑐"
              label: "Refresh Tuple"
              onClicked: root.refresh()
            }
            ActionButton {
              text: root.environment === "staging" ? "STG" : "PROD"
              active: true
              onClicked: root.switchEnvironment(root.environment === "staging" ? "Production" : "Staging")
            }
          }
        }

        Text {
          visible: root.actionText !== "" || root.errorText !== ""
          width: parent.width
          text: root.errorText !== "" ? root.errorText : root.actionText
          color: root.errorText !== "" ? root.urgent : root.dim
          font.family: root.fontFamily
          font.pixelSize: Style.font.bodySmall
          wrapMode: Text.WordWrap
        }

        RowLayout {
          width: parent.width
          spacing: Style.space(8)

          ActionButton { text: "Contacts"; active: root.section === "contacts"; Layout.fillWidth: true; onClicked: root.section = "contacts" }
          ActionButton { text: "Rooms"; active: root.section === "rooms"; Layout.fillWidth: true; onClicked: root.section = "rooms" }
        }

        TextField {
          visible: root.section === "contacts"
          width: parent.width
          placeholderText: "Search contacts"
          text: root.query
          onTextChanged: root.query = text
          font.family: root.fontFamily
        }
      }

      Flickable {
        id: resultsScroller
        Layout.fillWidth: true
        Layout.fillHeight: true
        implicitHeight: resultsContent.implicitHeight
        contentWidth: width
        contentHeight: resultsContent.implicitHeight
        clip: true
        boundsBehavior: Flickable.StopAtBounds
        ScrollBar.vertical: ScrollBar { policy: ScrollBar.AsNeeded }

        Column {
          id: resultsContent
          width: resultsScroller.width
          spacing: Style.space(4)

        Column {
          visible: root.section === "contacts"
          width: parent.width
          spacing: Style.space(4)

          Repeater {
            model: root.visibleContacts
            delegate: Rectangle {
              required property var modelData
              width: parent.width
              height: Style.space(48)
              radius: Style.cornerRadius
              color: contactMouse.containsMouse
                ? Style.hoverFillFor(root.foreground, root.accent)
                : root.alpha(root.foreground, 0.025)
              border.width: 1
              border.color: root.alpha(root.foreground, contactMouse.containsMouse ? 0.14 : 0.07)

              RowLayout {
                anchors.fill: parent
                anchors.leftMargin: Style.space(8)
                anchors.rightMargin: Style.space(8)
                spacing: Style.space(9)

                Rectangle {
                  Layout.preferredWidth: Style.space(9)
                  Layout.preferredHeight: Style.space(9)
                  radius: width / 2
                  color: root.presenceColor(modelData.presence)
                }
                ColumnLayout {
                  Layout.fillWidth: true
                  spacing: 0
                  Text { text: (modelData.favorite ? "  " : "") + modelData.name; color: root.foreground; font.family: root.fontFamily; font.pixelSize: Style.font.body; font.bold: modelData.favorite }
                  Text { text: modelData.email; color: root.dim; font.family: root.fontFamily; font.pixelSize: Style.font.bodySmall; elide: Text.ElideRight; Layout.fillWidth: true }
                }
                Text {
                  text: modelData.presence
                  color: root.presenceColor(modelData.presence)
                  font.family: root.fontFamily
                  font.pixelSize: Style.font.bodySmall
                  horizontalAlignment: Text.AlignRight
                  Layout.preferredWidth: Style.space(82)
                }
              }
              MouseArea { id: contactMouse; anchors.fill: parent; hoverEnabled: true; onClicked: root.callPicker() }
            }
          }
        }

        Column {
          visible: root.section === "rooms"
          width: parent.width
          spacing: Style.space(4)

          Repeater {
            model: root.visibleRooms
            delegate: Rectangle {
              required property var modelData
              width: parent.width
              height: Style.space(54)
              radius: Style.cornerRadius
              readonly property bool currentRoom: root.call.active && root.selectedRoom && root.selectedRoom.slug === modelData.slug
              color: currentRoom
                ? root.alpha(root.accent, 0.13)
                : roomMouse.containsMouse
                ? Style.hoverFillFor(root.foreground, root.accent)
                : root.alpha(root.foreground, 0.025)
              border.width: 1
              border.color: currentRoom ? root.alpha(root.accent, 0.62) : root.alpha(root.foreground, roomMouse.containsMouse ? 0.14 : 0.07)

              MouseArea {
                id: roomMouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                onClicked: root.joinRoom(modelData)
              }

              RowLayout {
                z: 1
                anchors.fill: parent
                anchors.leftMargin: Style.space(8)
                anchors.rightMargin: Style.space(8)
                spacing: Style.space(10)
                Text {
                  text: modelData.kind === "team" ? "󰓾" : "󰋑"
                  color: modelData.kind === "team" ? root.accent : root.foreground
                  font.family: root.fontFamily
                  font.pixelSize: Style.font.title
                  horizontalAlignment: Text.AlignHCenter
                  Layout.preferredWidth: Style.space(24)
                }
                ColumnLayout {
                  Layout.fillWidth: true
                  spacing: 0
                  Text { text: modelData.name; color: root.foreground; font.family: root.fontFamily; font.pixelSize: Style.font.body; font.bold: true; elide: Text.ElideRight; Layout.fillWidth: true }
                  Text {
                    text: currentRoom ? root.participantSummary() : (modelData.kind === "team" ? "Team room" : "Personal room")
                    color: currentRoom ? root.accent : root.dim
                    font.family: root.fontFamily
                    font.pixelSize: Style.font.bodySmall
                  }
                }
                Text {
                  visible: currentRoom
                  text: "Here"
                  color: root.accent
                  font.family: root.fontFamily
                  font.pixelSize: Style.font.bodySmall
                  font.bold: true
                  Layout.preferredWidth: Style.space(72)
                  horizontalAlignment: Text.AlignHCenter
                }
                JoinButton { visible: !currentRoom; onClicked: root.joinRoom(modelData) }
              }
            }
          }
        }
        }
      }

        Text {
          visible: !root.authenticated
          Layout.fillWidth: true
          text: "Tuple " + root.environmentLabel.toLowerCase() + " is not authenticated. Run " + root.client + " login in a terminal."
          color: root.urgent
          font.family: root.fontFamily
          wrapMode: Text.WordWrap
        }
      }
    }
  }
