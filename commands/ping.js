module.exports = {
	name: "ping",
	description: "This is a ping command!",
	execute(message, args) {
		console.log(message.content)
		message.channel.send("pong!")
	},
}
