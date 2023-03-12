/**
 * @name MarriageBooster
 * @author tooru
 * @description Gains marriage XP in Holo bot.
 * @version 2.2
 */
var timeoutId
const configurables = {
  token: "Token",
  session_id: "Session ID",
  guild_id: "Guild ID",
  channel_id: "Channel ID",
  value: "Target user ID",
}
const settings = BdApi.Data.load("MarriageBooster", "settings") || {}
const reactions = BdApi.Data.load("MarriageBooster", "reactions") || {xpTier: 0}
const headers = {"Content-Type": "application/json", Authorization: settings.token}
const payload = {
  type: 2,
  application_id: "791766309611634698",
  guild_id: settings.guild_id,
  channel_id: settings.channel_id,
  session_id: settings.session_id,
  data: {
    version: "1078434589577592992",
    id: "1014316902560059454",
    name: "react",
    options: [
      {
        type: 1,
        name: "kiss",
        options: [{type: 6, name: "target", value: settings.value}],
      },
    ],
  },
}

async function emitReaction() {
  const r = await fetch("https://discord.com/api/v9/interactions", {
    method: "POST",
    headers: headers,
    body: JSON.stringify(payload),
  })
  return r.ok
}

function buildTextfieldSetting(text, key, value = "") {
  const setting = document.createElement("div")
  const label = Object.assign(document.createElement("span"), {textContent: text})
  const input = Object.assign(document.createElement("input"), {
    type: "text",
    name: key,
    value: value,
    oninput: () => {
      const newValue = input.value
      settings[key] = newValue
      if (key in payload) payload[key] = newValue
      else {
        const d = payload["data"]["options"][0]["options"][0]
        if (key in d) d[key] = newValue
        else headers.Authorization = newValue
      }
      BdApi.Data.save("MarriageBooster", "settings", settings)
    },
  })
  setting.append(label, input)
  return setting
}

const verifySettings = () => Object.keys(configurables).every(key => key in settings)

function calculateTimeout() {
  if (!reactions.lastReaction) return 0
  return reactions.lastReaction - Date.now() + (reactions.xpTier < 5 ? 10000 : 300000)
}

async function main() {
  if (!verifySettings()) {
    BdApi.UI.alert("MarriageBooster error", "Please fill in your settings")
    return
  }
  if (!(await emitReaction())) {
    BdApi.UI.alert("MarriageBooster error", "Please verify your settings")
    return
  }
  const now = Date.now()
  reactions.lastReaction = now
  if (reactions.xpBonusResetCooldownStart <= now - 3600000) reactions.xpTier = 0
  if (++reactions.xpTier === 1) reactions.xpBonusResetCooldownStart = now
  BdApi.Data.save("MarriageBooster", "reactions", reactions)
  timeoutId = setTimeout(main, calculateTimeout())
}

module.exports = () => ({
  start() {
    if (reactions.xpBonusResetCooldownStart <= Date.now() - 3600000) reactions.xpTier = 0
    timeoutId = setTimeout(main, calculateTimeout())
  },
  stop() {
    clearTimeout(timeoutId)
  },
  getSettingsPanel() {
    const settingsPanel = document.createElement("div")
    for (const [key, description] of Object.entries(configurables))
      settingsPanel.append(buildTextfieldSetting(description, key, settings[key]))
    return settingsPanel
  },
})
