"use strict";

const alert = require("./modules/alert");
const debork_json = require("./modules/debork_json");
const electron = require("electron");
const fs = require("fs");
const path = require("path");
const windows = require("./modules/windows");

let config = {};

try {
	if (fs.existsSync("config.json")) {
		config = JSON.parse(debork_json(fs.readFileSync("config.json", "utf8")));
	} else if (fs.existsSync("config.json.example")) {
		config = JSON.parse(debork_json(fs.readFileSync("config.json.example", "utf8")));
	}
} catch (err) {
	// pass
}

if (config.width === undefined || config.width <= 0) {
	config.width = 1280;
}

if (config.height === undefined || config.height <= 0) {
	config.height = 840;
}

electron.app.on("ready", () => {
	windows.new("main-window", {width: config.width, height: config.height, page: path.join(__dirname, "nibbler.html")});
	menu_build();
});

electron.app.on("window-all-closed", () => {
	electron.app.quit();
});

function menu_build() {
	const template = [
		{
			label: "App",
			submenu: [
				{
					label: "About",
					click: () => {
						alert(`Nibbler ${electron.app.getVersion()}, running under Electron ${process.versions.electron}`);
					}
				},
				{
					role: "toggledevtools"
				},
				{
					type: "separator"
				},
				{
					label: "New Game",
					accelerator: "CommandOrControl+N",
					click: () => {
						windows.send("main-window", "call", "new");
					}
				},
				{
					type: "separator"
				},
				{
					label: "Open PGN...",
					accelerator: "CommandOrControl+O",
					click: () => {
						let files = electron.dialog.showOpenDialog({
							properties: ["openFile"]
						});
						if (files && files.length > 0) {
							windows.send("main-window", "call", {
								fn: "open",
								args: [files[0]]
							});
						}
					}
				},
				{
					label: "Validate PGN...",
					click: () => {
						let files = electron.dialog.showOpenDialog({
							properties: ["openFile"]
						});
						if (files && files.length > 0) {
							windows.send("main-window", "call", {
								fn: "validate_pgn",
								args: [files[0]]
							});
						}
					}
				},
				{
					type: "separator"
				},
				{
					role: "quit",
					label: "Quit",
					accelerator: "CommandOrControl+Q"
				},
			]
		},
		{
			label: "Navigation",
			submenu: [
				{
					label: "Play Best",
					accelerator: "CommandOrControl+D",
					click: () => {
						windows.send("main-window", "call", "play_best");
					}
				},
				{
					type: "separator"
				},
				{
					label: "Root",
					accelerator: "Home",
					click: () => {
						windows.send("main-window", "call", "goto_root");
					}
				},
				{
					label: "End",
					accelerator: "End",
					click: () => {
						windows.send("main-window", "call", "goto_end");
					}
				},
				{
					label: "Backward",
					accelerator: "Left",
					click: () => {
						windows.send("main-window", "call", "prev");
					}
				},
				{
					label: "Forward",
					accelerator: "Right",
					click: () => {
						windows.send("main-window", "call", "next");
					}
				},
				{
					type: "separator"
				},
				{
					label: "Return to PGN main line",
					accelerator: "CommandOrControl+R",
					click: () => {
						windows.send("main-window", "call", "return_to_pgn");
					}
				},
				{
					type: "separator"
				},
				{
					label: "Show PGN games list",
					click: () => {
						windows.send("main-window", "call", "show_pgn_chooser");
					}
				},
				{
					label: "Hide PGN games list",
					accelerator: "Escape",
					click: () => {
						windows.send("main-window", "call", "hide_pgn_chooser");
					}
				},
				{
					type: "separator"
				},
				{
					label: "Flip Board",
					accelerator: "CommandOrControl+F",
					click: () => {
						windows.send("main-window", "toggle", "flip");
					}
				},
			]
		},
		{
			label: "Analysis",
			submenu: [
				{
					label: "Go",
					accelerator: "CommandOrControl+G",
					click: () => {
						windows.send("main-window", "call", "go");
					}
				},
				{
					label: "Halt",
					accelerator: "CommandOrControl+H",
					click: () => {
						windows.send("main-window", "call", "halt");
					}
				},
				{
					type: "separator"
				},
				{
					label: "Reset Lc0 cache",
					click: () => {
						windows.send("main-window", "call", "reset_leela_cache");
					}
				},
				{
					type: "separator"
				},
				{
					label: "Move display",
					submenu: [
						{
							label: "All",
							click: () => {
								windows.send("main-window", "set", {
									key: "node_display_threshold",
									value: 0
								});
							}
						},
						{
							label: "Very many",
							click: () => {
								windows.send("main-window", "set", {
									key: "node_display_threshold",
									value: 0.005
								});
							}
						},
						{
							label: "Many",
							click: () => {
								windows.send("main-window", "set", {
									key: "node_display_threshold",
									value: 0.01
								});
							}
						},
						{
							label: "Some",
							click: () => {
								windows.send("main-window", "set", {
									key: "node_display_threshold",
									value: 0.02
								});
							}
						},
						{
							label: "Few",
							click: () => {
								windows.send("main-window", "set", {
									key: "node_display_threshold",
									value: 0.05
								});
							}
						},
						{
							label: "Very few",
							click: () => {
								windows.send("main-window", "set", {
									key: "node_display_threshold",
									value: 0.1
								});
							}
						},
						{
							type: "separator"
						},
						{
							label: "About this option",
							click: () => {
								about_move_display();
							}
						}
					]
				}		
			]
		}
	];

	const menu = electron.Menu.buildFromTemplate(template);
	electron.Menu.setApplicationMenu(menu);
}

function about_move_display() {

	let s = `

Nibbler decides whether to display a move based on how many visits it \
has, compared to the best move. Exactly how many moves will be \
displayed depends on the position; positions with more viable moves \
will display more. Sometimes different settings of this option will \
still display the same number of moves.`;

	alert(s);
}
