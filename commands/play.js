const ytdl = require("ytdl-core")
const ytSearch = require("yt-search")
const {
	joinVoiceChannel,
	createAudioPlayer,
	createAudioResource,
} = require("@discordjs/voice")

ffmpeg_options = {
	options: "-vn",
	before_options: "-reconnect 1 -reconnect_streamed 1 -reconnect_delay_max 5",
}
// const { Permissions } = require("discord.js")

const queue = new Map() //global map
/**
 * *queue(message.guild.id, queue_constructor object{voice channel}, {text channel}, connection, songs[])
 * message.guild.id is the key of the object in the map
 * queue_constructor creates objects
 * and songs[] is the array of songs
 */

module.exports = {
	name: "play",
	aliases: ["skip", "stop", "pause", "queue", "now"],
	cooldown: 0,
	description: "Some music bot",
	async execute(message, args, cmd, client, Discord) {
		// console.log(message.member.voice.channel)
		const voice_channel = message.member.voice.channel
		if (!voice_channel)
			return message.channel.send(
				"You need to be in a channel to execute this command."
			)
		const permissions = voice_channel.permissionsFor(message.client.user)
		if (!permissions.has("CONNECT"))
			return message.channel.send(
				"Vibrato does not have the correct permissions to join the voice channel."
			)
		if (!permissions.has("SPEAK"))
			return message.channel.send(
				"Vibrato does not have the correct permissions to speak in the voice channel."
			)

		const server_queue = queue.get(message.guild.id)
		//checking if our server has a spot on the global map (mentioned on the top)
		if (cmd === "play" && !args.length) {
			unpause(message, server_queue)
		} else if (cmd === "play") {
			let song = await findSong(args)
			if (!server_queue || !server_queue.connection) {
				const queue_constructor = {
					voice_channel: voice_channel, //the voice in which the user's in
					text_channel: message.channel, //text channel in which all the messages are going to be displayed
					connection: null,
					player: null,
					songs: [],
					index: 0,
					length: 0,
					nowPlaying: null,
				}

				queue.set(message.guild.id, queue_constructor)
				queue_constructor.songs.push(song)
				queue_constructor.length++

				try {
					// const connection = await voice_channel.join()
					const connection = joinVoiceChannel({
						channelId: voice_channel.id,
						guildId: voice_channel.guildId,
						adapterCreator: message.guild.voiceAdapterCreator,
					})

					// connection.

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
		} else if (cmd === "skip") {
			skip_song(message, server_queue)
		} else if (cmd === "stop") {
			stop_song(message, server_queue)
		} else if (cmd === "pause") {
			pause_song(message, server_queue)
		} else if (cmd === "queue") {
			show_queue(message, server_queue)
		} else if (cmd === "np") {
			now_playing(message, server_queue)
		}
	},
}

const video_player = async (guild, song) => {
	const song_queue = queue.get(guild.id)
	// console.log(song_queue)
	if (!song) {
		try {
			queue.delete(guild.id)
			song_queue.connection.disconnect()
			song_queue.text_channel.send(
				`:wave: Vibrato has finshed the queue and left the channel.`
			)
		} catch (e) {
			console.log(e)
		}
		queue.delete(guild.id)
		return
	}
	const resource = createAudioResource(
		ytdl(song.url, {
			filter: "audioonly",
			highWaterMark: 1024 * 1024 * 10,
			quality: "highestaudio",
		}),
		{
			inlineVolume: true,
			// inputType: StreamType.Opus,
		}
	)
	resource.volume.setVolume(0.5)
	if (!song_queue.player) {
		song_queue.player = createAudioPlayer()
		song_queue.connection.subscribe(song_queue.player)
	}

	song_queue.player.play(resource)
	song_queue.player.on("idle", () => {
		try {
			song_queue.index++
			video_player(guild, song_queue.songs[song_queue.index])
		} catch (e) {
			console.log(e)
		}
	})

	await song_queue.text_channel.send(`Now playing: **${song.title}**`)
	song_queue.nowPlaying = song_queue.songs[song_queue.index]
}

const skip_song = (message, server_queue) => {
	if (!message.member.voice.channel)
		return message.channel.send(
			"You need to be in the voice channel to execute this command"
		)
	if (!server_queue)
		return message.channel.send(`There are no songs in the queue :pensive:`)

	video_player(message.guild, server_queue.songs[++server_queue.index])
}
const stop_song = async (message, server_queue) => {
	if (!message.member.voice.channel)
		return message.channel.send(
			"You need to be in the voice channel to execute this command"
		)
	// server_queue.connection.destroy()
	try {
		server_queue.connection.destroy()
	} catch (e) {
		console.log(e)
	}
	queue.delete(message.guild.id)
	await message.channel.send(`:wave: Vibrato has left the channel`)

	// await message.channel.send(`:v: Resumed`)
	return
}

const pause_song = async (message, server_queue) => {
	if (!message.member.voice.channel)
		return message.channel.send(
			"You need to be in the voice channel to execute this command"
		)
	if (!server_queue)
		return message.channel.send(`There are no songs in the queue :pensive:`)

	server_queue.player.pause()
	await message.channel.send(`:pause_button: Paused`)
}
const unpause = async (message, server_queue) => {
	if (!message.member.voice.channel)
		return message.channel.send(
			"You need to be in the voice channel to execute this command"
		)
	if (!server_queue)
		return message.channel.send("There are no songs playing currently")
	server_queue.player.unpause()
	await message.channel.send(`:v: Resumed`)
}

const show_queue = (message, server_queue) => {
	if (!server_queue)
		return message.channel.send("The queue is currently empty :cold_face:")
	else {
		let i = 1
		let list = ``
		// console.log(server_queue)
		server_queue.songs.forEach((song) => {
			list = list + `${i++}\t${song.title}\t${song.length}\n`
		})
		return message.channel.send("```" + list + "```")
	}
}

let findSong = async (args) => {
	let song = {
		title: null,
		url: null,
		length: null,
	}

	if (ytdl.validateURL(args[0])) {
		const song_info = await ytdl.getInfo(args[0])
		song = {
			title: song_info.videoDetails.title,
			url: song_info.videoDetails.video_url,
			length: toHHMMSS(song_info.videoDetails.lengthSeconds),
		}
	} else {
		async function video_finder(query) {
			const videoResult = await ytSearch(query)
			console.log(query)
			return videoResult.videos.length > 1 ? videoResult.videos[0] : null
		}
		const video = await video_finder(args.join(" ")) //getting the arguments and joining them and passing them into the query variable in the video_finder function
		if (video) {
			song = {
				title: video.title,
				url: video.url,
				length: toHHMMSS(video.seconds),
			}
			console.log(toHHMMSS(video.seconds))
		} else {
			message.channel.send("Error finding video.")
		}
	}

	return song
}

var toHHMMSS = (secs) => {
	var sec_num = parseInt(secs, 10)
	var hours = Math.floor(sec_num / 3600)
	var minutes = Math.floor(sec_num / 60) % 60
	var seconds = sec_num % 60

	return [hours, minutes, seconds]
		.map((v) => (v < 10 ? "0" + v : v))
		.filter((v, i) => v !== "00" || i > 0)
		.join(":")
}
