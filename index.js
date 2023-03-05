const {
	default: WASocket,
	DisconnectReason,
	useMultiFileAuthState,
	fetchLatestWaWebVersion,
} = require("@adiwajshing/baileys");
const Pino = require("pino");
const path = require("path").join;
const { Boom } = require("@hapi/boom");
const fs = require("fs");
const { serialize } = require("./serialize");
const fetch = require("node-fetch");
const api = require("caliph-api");

const start = async () => {
	const { state, saveCreds } = await useMultiFileAuthState(path("./session"));
	let { version, isLatest } = await fetchLatestWaWebVersion();
	console.log(`Using: ${version}, newer: ${isLatest}`);
	const sock = WASocket({
		printQRInTerminal: true,
		auth: state,
		logger: Pino({ level: "silent" }),
		version,
	});
	// creds.update
	sock.ev.on("creds.update", saveCreds);

	// connection.update
	sock.ev.on("connection.update", async (up) => {
		const { lastDisconnect, connection } = up;
		if (connection) {
			console.log("Connection Status: ", connection);
		}

		if (connection === "close") {
			let reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
			if (reason === DisconnectReason.badSession) {
				console.log(
					`Bad Session File, Please Delete ${session} and Scan Again`
				);
				sock.logout();
			} else if (reason === DisconnectReason.connectionClosed) {
				console.log("Connection closed, reconnecting....");
				start();
			} else if (reason === DisconnectReason.connectionLost) {
				console.log("Connection Lost from Server, reconnecting...");
				start();
			} else if (reason === DisconnectReason.connectionReplaced) {
				console.log(
					"Connection Replaced, Another New Session Opened, Please Close Current Session First"
				);
				sock.logout();
			} else if (reason === DisconnectReason.loggedOut) {
				console.log(`Device Logged Out, Please Delete session and Scan Again.`);
				sock.logout();
			} else if (reason === DisconnectReason.restartRequired) {
				console.log("Restart Required, Restarting...");
				start();
			} else if (reason === DisconnectReason.timedOut) {
				console.log("Connection TimedOut, Reconnecting...");
				start();
			} else {
				sock.end(`Unknown DisconnectReason: ${reason}|${lastDisconnect.error}`);
			}
		}
	});

	sock.ev.on("messages.upsert", async (m) => {
		try {
			if (m.type !== "notify") return;
			let msg = serialize(JSON.parse(JSON.stringify(m.messages[0])), sock);
			if (!msg.message) return;
			if (msg.key && msg.key.remoteJid === "status@broadcast") return;
			if (
				msg.type === "protocolMessage" ||
				msg.type === "senderKeyDistributionMessage" ||
				!msg.type ||
				msg.type === ""
			)
				return;
			// chats
			const { bodi } = msg;
			chat = bodi.toLowerCase();
			const args = bodi.trim().split(/ +/).slice(1);
			const { from } = msg;

			if (chat.startsWith("pin")) {
				try {
					query = args.join(" ");
					if (query.includes("|")) {
						query = args.join(" ").split("|")[0];
					}
					console.log(query);
					result = await api.search.pin(query);
					res = result;
					if (chat.includes("|")) {
						banyaknya = chat.split("|")[1];
						if (banyaknya.includes("all")) {
							for (let i = 0; i < res.length; i++) {
								try {
									link = res[i];
									ser = await fetch(link);
									bubu = await ser.buffer();
									await sock.sendMessage(
										from,
										{ image: bubu },
										{ quoted: msg }
									);
								} catch (e) {
									console.log(e.message);
									msg.reply(`failed to send the ${i + 1}th photo`);
								}
							}
						} else {
							for (let i = 0; i < banyaknya; i++) {
								try {
									link = res[i];
									ser = await fetch(link);
									bubu = await ser.buffer();
									await sock.sendMessage(
										from,
										{ image: bubu },
										{ quoted: msg }
									);
								} catch (e) {
									console.log(e.message);
									msg.reply(`failed to send the ${i + 1}th photo`);
								}
							}
						}
						await sock.sendMessage(
							from,
							{ text: `Success Send ${banyaknya} Pict From Query ${query}` },
							{ quoted: msg }
						);
					} else {
						await msg.reply(`Pinterest Searching With Query \n*${query}*`);
						resone = await fetch(res[Math.floor(Math.random() * res.length)]);
						pictone = await resone.buffer();
						text =
							`*${res.length}* Result Obtained\n\nif you want to get more you can with\n` +
							"``` pin " +
							query +
							" | " +
							"<much desired>" +
							"```\n" +
							"or want to get it all with\n" +
							"``` pin " +
							query +
							" | " +
							"all" +
							"```";
						await msg.reply(text);
						await sock.sendMessage(from, { image: pictone }, { quoted: msg });
					}
				} catch (e) {
					msg.reply(e.message);
					console.log(e.message);
				}
			}
		} catch (e) {
			console.log(e.message);
		}
	});
};
start();
