const Discord = require("discord.js")
const { Client, Collection, Intents } = require("discord.js")
const client = new Client({ intents: ["GUILDS", "GUILD_MESSAGES"] })
const fs = require("fs")

client.commands = new Collection()
const commandFiles = fs
	.readdirSync("./commands/")
	.filter((file) => file.endsWith(".js"))
for (const file of commandFiles) {
	const command = require(`./commands/${file}`)
	client.commands.set(command.name, command)
}
const prefix = "-"

client.once("ready", () => {
	console.log("Vibrato is online")
})

client.on("message", (message) => {
	if (!message.content.startsWith(prefix) || message.author.bot) return
	const args = message.content.slice(prefix.length).split(/ +/)
	const command = args.shift().toLowerCase()
	console.log(command)
	console.log(args)
	console.log(client.commands)

	if (command === "ping") {
		client.commands.get("ping").execute(message, args)
	} else if (command === "play") {
		client.commands.get("play").execute(message, args)
	} else if (command === "leave") {
		client.commands.get("leave").execute(message, args)
	} else {
		message.channel.send("Check Console!")
	}
})

client.login("OTMxNTg0MjAzNzQzNjkwNzgy.YeGjZg.KgcBvs1LFM0P3ibFY4fw7RQiVqM")
