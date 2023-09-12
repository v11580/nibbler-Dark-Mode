# Nibbler

"By far the best ICCF analysis tool for Leela." &mdash; *jhorthos*

Nibbler is a real-time analysis GUI for [Leela Chess Zero](http://lczero.org/play/quickstart/) (Lc0), which runs Leela in the background and constantly displays opinions about the current position. You can also compel the engine to evaluate one or more specific moves. Nibbler is loosely inspired by [Lizzie](https://github.com/featurecat/lizzie) and [Sabaki](https://github.com/SabakiHQ/Sabaki).

These days, Nibbler more-or-less works with traditional engines like [Stockfish](https://stockfishchess.org/), too. (Ensure `MultiPV` is `1`, `Threads` (CPU) is set, and `Hash` is set (more is better), for maximum strength.)

For prebuilt binary releases, see the [Releases](https://github.com/rooklift/nibbler/releases) section. For help, the [Discord](https://discordapp.com/invite/pKujYxD) may be your best bet, or open an issue here.


![Screenshot](https://chesscalisthenics.com/IMG/nibblerShot.png)
## Features

* Figurine piece designations in notation
* Shows Opening line name
* Shows ECO transposition of individual fens
* Built in training data: 10,000 mini games.
* 1,000 Puzzles
* Upon loading, a random puzzle is shown
* The puzzles consist of 600 ECM positions and 600 mate in 2s, all wtm.
* PGN loading via menu, clipboard, or drag-and-drop.
* Press the letter P for a new Puzzle
* Press the letter M for a new Mini game
* See screenshot here:  https://chesscalisthenics.com/IMG/nibblerShot.png


## Installation - Windows / Linux

Some Windows and Linux standalone releases are uploaded to the [Releases](https://github.com/rooklift/nibbler/releases) section from time to time.

*Alternatively*, it is possible to run Nibbler from source. This requires Electron, but has no other dependencies. If you have Electron installed (e.g. `npm install -g electron`) you can likely enter the `/src` directory, then do `electron .` to run it. Nibbler should be compatible with at least version 5 and above.

You could also build a standalone app. See comments inside the Python script `builder.py` for info.

## Linux install script

Linux users can make use of the following *one-liner* to install the latest version of Nibbler:

```bash
curl -L https://raw.githubusercontent.com/rooklift/nibbler/master/files/scripts/install.sh | bash
```

## Installation - Mac

Mac builds have been made by [twoplan](https://github.com/twoplan/Nibbler-for-macOS) and [Jac-Zac](https://github.com/Jac-Zac/Nibbler_MacOS) - the latter is probably more up-to-date.

## Advanced engine options

Most people won't need them, but all of Leela's engine options can be set in two ways:

* Leela automatically loads options from a file called `lc0.config` at startup - see [here](https://lczero.org/play/configuration/flags/#config-file).
* Nibbler will send UCI options specified in Nibbler's own `engines.json` file (which you can find via the Dev menu).

## Hints and tips

An option to enable the UCI `searchmoves` feature is available in the Analysis menu. Once enabled, one or more moves can be specified as moves to focus on; Leela will ignore other moves. This is useful when you think Leela isn't giving a certain move enough attention.

Leela forgets much of the evaluation if the position changes. To mitigate this, an option in the Analysis menu allows you to hover over a PV (on the right) and see it play out on the board, without changing the position we're actually analysing. You might prefer to halt Leela while doing this, so that the PVs don't change while you're looking at them.

Leela running out of RAM can be a problem if searches go on too long. You might like to set a reasonable node limit (in the Engine menu), perhaps 10 million or so.

## Thanks

Thanks to everyone in Discord and GitHub who's offered advice and suggestions; and thanks to all Lc0 devs and GPU-hours contributors!

The pieces are from [Lichess](https://lichess.org/).

Icon design by [ciriousjoker](https://github.com/ciriousjoker) based on [this](https://www.svgrepo.com/svg/155301/chess).
