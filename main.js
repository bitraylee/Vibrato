// const {
// 	joinVoiceChannel,
// 	createAudioPlayer,
// 	createAudioResource,
// } = require("@discordjs/voice")
// const { channel } = require("diagnostics_channel")
const { Client, Collection, Intents } = require("discord.js")
// const ytdl = require("ytdl-core")
const client = new Client({
	shards: "auto",
	intents: [
		Intents.FLAGS.GUILDS,
		Intents.FLAGS.GUILD_VOICE_STATES,
		Intents.FLAGS.GUILD_MESSAGES,
	],
})

const fs = require("fs")
// const { join } = require("path")

const config = require("./config.json")

client.commands = new Collection()
const commandFiles = fs
	.readdirSync("./commands/")
	.filter((file) => file.endsWith(".js"))
for (const file of commandFiles) {
	const command = require(`./commands/${file}`)
	client.commands.set(command.name, command)
}
const prefix = config.prefix

client.once("ready", () => {
	console.log("Vibrato is online")
})

client.on("message", (message) => {
	if (!message.content.startsWith(prefix) || message.author.bot) return
	const args = message.content.slice(prefix.length).split(/ +/)
	const command = args.shift().toLowerCase()
	// console.log(command)
	// console.log(args)
	// console.log(client.commands)

	if (command === "ping") {
		client.commands.get("ping").execute(message, args)
	} else if (
		command === "play" ||
		command === "pause" ||
		command === "skip" ||
		command === "stop" ||
		command === "queue"
	) {
		client.commands.get("play").execute(message, args, command, client)
		// const voice_channel = message.member.voice.channel
	} else if (command === "leave") {
		client.commands.get("leave").execute(message, args)
	} else {
		message.channel.send("Check Console!")
	}
})

client.login(config["bot-token"])
