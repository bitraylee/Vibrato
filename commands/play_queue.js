const ytdl = require("ytdl-core")
const ytSearch = require("yt-search")
const { Permissions } = require("discord.js")

const queue = new Map() //global map
/**
 * *queue(message.guild.id, queue_constructor object{voice channel}, {text channel}, connection, songs[])
 * message.guild.id is the key of the object in the map
 * queue_constructor creates objects
 * and songs[] is the array of songs
 */

module.exports = {
	name: "play",
	aliases: ["skip", "stop"],
	cooldown: 0,
	description: "Some music bot",
	async execute(message, args, cmd, client, Discord) {
		// console.log(message.member.voice.channel)
		const voice_channel = message.member.voice.channel
		if (!voice_channel)
			return message.channel.send(
				"You need to be in a channel to execute this command."
			)

		// const permission = voice_channel.permission(
		// 	message.client.user
		// )
		// if (!message.client.user.permissions.has(Permissions.FLAGS.CONNECT))
		// 	return message.channel.send(
		// 		"You don't have the correct permissions to CONNECT"
		// 	)
		// if (!message.client.user.permissions.has(Permissions.FLAGS.SPEAK))
		// 	return message.channel.send(
		// 		"You don't have the correct permissions to SPEAK"
		// 	)

		const server_queue = queue.get(message.guild.id)
		//checking if our server has a spot on the global map (mentioned on the top)
		if (cmd === "play") {
			if (!args.length)
				return message.channel.send(
					"You need to send the second argument!"
				)
			let song = {}

			if (ytdl.validateURL(args[0])) {
				const song_info = await ytdl.getInfo(args[0])
				song = {
					title: song_info.videoDetails.title,
					url: song_info.videoDetails.video_url,
				}
			} else {
				;async () => {
					console.log(await ytSearch("superman theme"))
				}
				async function video_finder(query) {
					const videoResult = await ytSearch(query)
					console.log(query)
					return videoResult.videos.length > 1
						? videoResult.videos[0]
						: null
				}
				const video = await video_finder(args.join(" ")) //getting the arguments and joining them and passing them into the query variable in the video_finder function
				if (video) {
					song = { title: video.title, url: video.url }
				} else {
					message.channel.send("Error finding video.")
				}
			}
			if (!server_queue) {
				const queue_constructor = {
					voice_channel: voice_channel, //the voice in which the user's in
					text_channel: message.channel, //text channel in which all the messages are going to be displayed
					connection: null,
					songs: [],
				}

				queue.set(message.guild.id, queue_constructor)
				queue_constructor.songs.push(song)

				try {
					const connection = await voice_channel.join()
					queue_constructor.connection = connection
					video_player(message.guild, queue_constructor.songs[0])
				} catch (err) {
					queue.delete(message.guild.id)
					message.channel.send("There was an error connecting")
					throw err
				}
			} else {
				server_queue.songs.push(song)
				return message.channel.send(
					`**${song.title}** has been added to queue`
				)
			}
		}
	},
}

const video_player = async (guild, song) => {
	const song_queue = queue.get(guild.id)
	if (!song) {
		song_queue.voice_channel.leave()
		queue.delete(guild.id)
		return
	}
	const stream = ytdl(song.url, { filter: "audioonly" })
	song_queue.connection
		.play(stream, { seek: 0, volume: 0.5 })
		.on("finish", () => {
			song_queue.songs.shift()
			video_player(guild, song_queue.songs[0])
		})
	await song_queue.text_channel.send(`Now playing: **${song.title}**`)
}
