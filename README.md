# Nibbler

"By far the best ICCF analysis tool for Leela." &mdash; *jhorthos*

Nibbler is one of the best GUI's for chess game and position analyis. The program's built-in API for lichess makes an opening book an unnecessary luxury if you are below the master level. The screenshot shows the engine line and current depth of analysis. At the end of the line, the Lichess API shows the win percenntage, the frequency the move is played, and the number of games in the live, Lichess Masters database. 

Nibbler works with traditional engines like [Stockfish](https://stockfishchess.org/).

For prebuilt binary releases of the program, visit the [Releases](https://github.com/rooklift/nibbler/releases) section of the original Nibbler program. 
Our source code only changes the look of the original user interface and adds some additional features.


![Screenshot](https://chesscalisthenics.com/IMG/D78.jpg)
## Features

* Figurine piece designations in notation
* Shows Opening line name
* Shows ECO transposition for individual fens, if there is a match.
* Built in training data: 10,000 mini games.
* 1,100 Puzzles
* Upon loading, a random puzzle is shown
* The puzzles consist of 600 ECM positions and 500 mate in 2s, all wtm.
* PGN loading via menu, clipboard, or drag-and-drop.
* Press the letter P for a new Puzzle
* Press the letter M to review a new Mini game
* Analysis arrows
* Green and Khaki colored boards are included.
* See screenshot here:  https://chesscalisthenics.com/IMG/nibblerShot.png


## Installation - Windows / Linux

1) Download and install from the release links below. In most cases, you can just unzip the files and start using the program. This will give you the original program files including the Nibbler executable.

2) Download our source code (green button above).

3)  Copy the files from the src directory (download no. 2) and paste them (replace all) in Nibbler's (your intallation's) app directory.

Some Windows and Linux standalone releases are uploaded to the [Releases](https://github.com/rooklift/nibbler/releases) section from time to time.

*Alternatively*, it is possible to run Nibbler from source. This requires Electron, but has no other dependencies. If you have Electron installed (e.g. `npm install -g electron`) you can likely enter the `/src` directory, then do `electron .` to run it. Nibbler should be compatible with at least version 5 and above.

You could also build a standalone app. See comments inside the Python script `builder.py` for info.

## Linux install script

Linux users can make use of the following *one-liner* to install the latest version of Nibbler:

```bash
curl -L https://raw.githubusercontent.com/rooklift/nibbler/master/files/scripts/install.sh | bash
```

## Installation - Mac

1) Download and install the original version from the Release links below. 
2)Copy and replace the files from the src directory of this fork to Nibbler's app directory. 

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
