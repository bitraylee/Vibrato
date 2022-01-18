const ytdl = require("ytdl-core")
const ytSearch = require("yt-search")
// const play = require("play-dl")

const {
	joinVoiceChannel,
	createAudioPlayer,
	createAudioResource,
} = require("@discordjs/voice")
// const { Client, Collection, Intents } = require("discord.js")
// const ytdl = require("ytdl-core")

ffmpeg_options = {
	options: "-vn",
	before_options: "-reconnect 1 -reconnect_streamed 1 -reconnect_delay_max 5",
}

module.exports = {
	name: "play",
	description: "Joins the voice channel and plays a video from youtube",
	async execute(message, args) {
		const vcID = message.member.voice.channelId
		const voice_channel = message.member.voice.channel
		if (!voice_channel)
			return message.channel.send(
				"You need to be in a voice channel to execute this command."
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
		// console.log("Everthing is working correctly")

		if (!args.length)
			return message.channel.send("You need to add the second argument")

		// console.log(voice_channel)
		const voiceConnection = joinVoiceChannel({
			channelId: voice_channel.id,
			guildId: voice_channel.guildId,
			adapterCreator: message.guild.voiceAdapterCreator,
		})
		let video
		let song = {
			title: null,
			video_url: null,
		}
		if (!ytdl.validateURL(args[0])) {
			async function video_finder(query) {
				const videoResult = await ytSearch(query) // YouTube Video Search
				console.log(query)
				return videoResult.videos.length > 1
					? videoResult.videos[0]
					: null
			}
			video = await video_finder(args.join(" "))
			song = {
				title: video.title,
				url: video.url,
			}
		} else {
			const song_info = await ytdl.getInfo(args[0])
			song = {
				// title: song_info.video_details.title,
				// url: song_info.video_details.url,
				title: song_info.videoDetails.title,
				url: song_info.videoDetails.url,
			}
		}
		if (song.url == null) {
			return message.channel.send("No results were found.")
		}
		// const stream = new play.stream(song.url)
		// console.log(stream)

		const resource = createAudioResource(
			ytdl(song.url, {
				filter: "audioonly",
				highWaterMark: 1 << 25,
			}),
			{
				inlineVolume: true,
				bitrate: 192000,
			}
		)
		resource.volume.setVolume(0.5)
		const player = createAudioPlayer()
		voiceConnection.subscribe(player)
		player.play(resource)

		message.channel.send(`:thumbsup: Now Playing ***${song.title}***`)

		player.on("idle", () => {
			try {
				player.stop()
			} catch (e) {
				console.log(e)
			}

			try {
				voiceConnection.destroy()
			} catch (e) {
				joinVoiceChannel(vcID)
			}
		})
	},
}
