# Nibbler

Nibbler is one of the best open-source GUI's for chess game and position analyis. 

The program's built-in API for the Lichess games database makes an opening book an unnecessary luxury if you are below the master level. The screenshot shows engine lines and current depth of analysis. At the end of the line, the Lichess API shows the win percentage, the frequency the move is played, and the number of games in the live, Lichess Masters database. 

Nibbler works with traditional engines like [Stockfish](https://stockfishchess.org/).

Please note that our source code only changes the look of the original user interface and adds additional features. You will need a prebuilt binary release of the original program. visit the [Releases](https://github.com/rooklift/nibbler/releases) section of the original Nibbler program. 



![Screenshot](https://chesscalisthenics.com/IMG/D78.jpg)
## Features

* Figurine piece designations in game and analysis notation
* Shows Opening line name
* Shows ECO transposition for individual fens, if there is a match.
* Built in training data: 10,000 mini games.
* 1,069 Puzzles
* Upon loading, a random puzzle is shown
* The puzzles consist of 610 ECM positions and the rest are mate in 2s. All positions are white to move.
* PGN loading via menu, clipboard, or drag-and-drop.
* Press the letter P for a new Puzzle
* Press the letter M to review a new Mini game
* Analysis arrows
* Green and Khaki colored boards are included.
* See a full-screen screenshot here:  https://chesscalisthenics.com/IMG/nibblerShot.png


## Installation - Windows / Linux

1) Download and install from the release links below. In most cases, you can just unzip the files and start using the program. This will give you the original program files including the Nibbler executable.

2) Download our source code (green button above).

3)  Copy the files from the src directory (download no. 2) and paste them (replace all) in Nibbler's (your intallation's) app directory.

Some Windows and Linux standalone releases are uploaded to the [Releases](https://github.com/rooklift/nibbler/releases) section from time to time.



## Linux install script

Linux users can make use of the following *one-liner* to install the latest version of Nibbler:

```bash
curl -L https://raw.githubusercontent.com/rooklift/nibbler/master/files/scripts/install.sh | bash
```

## Thanks

Thanks to everyone in Discord and GitHub who's offered advice and suggestions; and thanks to all Lc0 devs and GPU-hours contributors!

The pieces are from [Lichess](https://lichess.org/).

Icon design by [ciriousjoker](https://github.com/ciriousjoker) based on [this](https://www.svgrepo.com/svg/155301/chess).
