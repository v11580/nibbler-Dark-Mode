"use strict";

function NewNode(parent, move, board_for_root) {		// move must be legal; board is only relevant for root nodes

	let node = Object.create(node_prototype);
	node.id = next_node_id++;
	live_nodes[node.id.toString()] = node;

	if (parent) {
		parent.children.push(node);
		node.parent = parent;
		node.move = move;
		node.board = parent.board.move(move);
		node.depth = parent.depth + 1;
		node.graph_length_knower = parent.graph_length_knower;		// 1 object every node points to, a bit lame
	} else {
		node.parent = null;
		node.move = null;
		node.board = board_for_root;
		node.depth = 0;
		node.graph_length_knower = {val: config.graph_minimum_length};
	}

	if (node.depth + 1 > node.graph_length_knower.val) {
		node.graph_length_knower.val = node.depth + 1;
	}

	node.table = NewTable();
	node.searchmoves = [];
	node.__nice_move = null;
	node.destroyed = false;
	node.children = [];

	return node;
}

function NewRoot(board) {					// Arg is a board (position) object, not a FEN

var i  = Math.floor(Math.random() * 1069) + 1; 
	if (!board) {
		board = LoadFEN(EPDs[i])   //("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
	}

	let root = NewNode(null, null, board);

	// Tags. Only root gets these. Get overwritten by the PGN loader.
	// Internally, these get kept as HTML-safe, PGN-unsafe.

	root.tags = Object.create(null);
	root.tags.Event = "?";
	root.tags.Site = "?";
	root.tags.Date = DateString(new Date());
	root.tags.Round = "?";
	root.tags.White = "White";
	root.tags.Black = "Black";
	root.tags.Result = "*";

	return root;
	
}

const node_prototype = {

	make_move: function(s, force_new_node) {

		// s must be exactly a legal move, including having promotion char iff needed (e.g. e2e1q)

		if (!force_new_node) {
			for (let child of this.children) {
				if (child.move === s) {
					return child;
				}
			}
		}

		return NewNode(this, s, null);
	},

	history: function() {

		let ret = [];
		let node = this;

		while (node.move) {
			ret.push(node.move);
			node = node.parent;
		}

		ret.reverse();
		return ret;
	},

	history_old_format: function() {		// For engines that can't handle Chess960 format stuff.

		let ret = [];
		let node = this;

		while (node.move) {
			ret.push(node.move_old_format());
			node = node.parent;
		}

		ret.reverse();
		return ret;
	},

	move_old_format: function() {
		let move = this.move;
		if (move === "e1h1" && this.parent.board.state[4][7] === "K") return "e1g1";
		if (move === "e1a1" && this.parent.board.state[4][7] === "K") return "e1c1";
		if (move === "e8h8" && this.parent.board.state[4][0] === "k") return "e8g8";
		if (move === "e8a8" && this.parent.board.state[4][0] === "k") return "e8c8";
		return move;
	},

	node_history: function() {

		let ret = [];
		let node = this;

		while (node) {
			ret.push(node);
			node = node.parent;
		}

		ret.reverse();
		return ret;
	},

	eval_history: function() {

		let ret = [];
		let node = this;

		while (node) {
			ret.push(node.table.get_eval());
			node = node.parent;
		}

		ret.reverse();
		return ret;
	},

	future_history: function() {
		return this.get_end().history();
	},

	future_node_history: function() {
		return this.get_end().node_history();
	},

	future_eval_history: function() {
		return this.get_end().eval_history();
	},

	get_root: function() {

		let node = this;

		while (node.parent) {
			node = node.parent;
		}

		return node;
	},

	get_end: function() {

		let node = this;

		while (node.children.length > 0) {
			node = node.children[0];
		}

		return node;
	},

	return_to_main_line_helper: function() {

		// Returns the node that "return to main line" should go to.

		let ret = this;
		let node = this;

		while (node.parent) {
			if (node.parent.children[0] !== node) {
				ret = node.parent;
			}
			node = node.parent;
		}

		return ret;
	},

	is_main_line: function() {

		let node = this;

		while (node.parent) {
			if (node.parent.children[0] !== node) {
				return false;
			}
			node = node.parent;
		}

		return true;
	},

	is_same_line: function(other) {

		// This is not testing whether one is an ancestor of the other, but
		// rather whether the main lines of each end in the same place.

		// Easy case is when one is the parent of the other...

		if (this.parent === other) return other.children[0] === this;
		if (other.parent === this) return this.children[0] === other;

		return this.get_end() === other.get_end();
	},

	is_triple_rep: function() {

		// Are there enough ancestors since the last pawn move or capture?

		if (this.board.halfmove < 8) {
			return false;
		}

		let ancestor = this;
		let hits = 0;

		while (ancestor.parent && ancestor.parent.parent) {
			ancestor = ancestor.parent.parent;
			if (ancestor.board.compare(this.board)) {
				hits++;
				if (hits >= 2) {
					return true;
				}
			}

			// All further ancestors are the wrong side of a pawn move or capture?

			if (ancestor.board.halfmove < 2) {
				return false;
			}
		}

		return false;
	},

	nice_move: function() {

		if (this.__nice_move) {
			return this.__nice_move;
		}

		if (!this.move || !this.parent) {
			this.__nice_move = "??";
		} else {
			this.__nice_move = this.parent.board.nice_string(this.move);
		}
	this.__nice_move = infobox_props.replaceChessPiecesWithUnicode(this.__nice_move)  /**redone* 82_infobox for replace function **/
		return this.__nice_move; 
		
	},

	token: function(stats_flag, force_number_flag) {

		// The complete token when writing the move, including number string if necessary,
		// which depends on position within variations etc and so cannot easily be cached.
		// We don't do brackets because closing brackets are complicated.

		if (!this.move || !this.parent) {
			return "";
		}

		let need_number_string = false;

		if (force_number_flag) need_number_string = true;
		if (!this.parent.parent) need_number_string = true;
		if (this.parent.board.active === "w") need_number_string = true;
		if (this.parent.children[0] !== this) need_number_string = true;

		// There are some other cases where we are supposed to have numbers but the logic
		// escapes me right now.

		let s = "";

		if (need_number_string) {
			s += this.parent.board.next_number_string() + " ";
		}

		s += this.nice_move();

		if (stats_flag) {
			let stats = this.make_stats();
			if (stats !== "") {
				s += " {" + stats + "}";
			}
		}

		return s;
	},

	make_stats: function() {

		if (!this.parent) {
			return "";
		}

		let info = this.parent.table.moveinfo[this.move];
		let total_nodes = this.parent.table.nodes;

		if (!info || info.__ghost || info.__touched === false) {
			return "";
		}

		let sl = info.stats_list({
			ev_pov:        config.ev_pov,
			cp_pov:        config.cp_pov,
			wdl_pov:       config.wdl_pov,
			ev:            config.pgn_ev,
			cp:            config.pgn_cp,
			n:             config.pgn_n,
			n_abs:         config.pgn_n_abs,
			of_n:          config.pgn_of_n,
			depth:         config.pgn_depth,
			wdl:           config.pgn_wdl,
			p:             config.pgn_p,
			m:             config.pgn_m,
			v:             config.pgn_v,
			q:             config.pgn_q,
			u:             config.pgn_u,
			s:             config.pgn_s,
		}, total_nodes);

		return sl.join(", ");			// Will be "" on empty list
	},

	end_nodes: function() {
		if (this.children.length === 0) {
			return [this];
		} else {
			let list = [];
			for (let child of this.children) {
				list = list.concat(child.end_nodes());
			}
			return list;
		}
	},

	terminal_reason: function() {

		// Returns "" if not a terminal position, otherwise returns the reason.
		// Also updates table.eval (for the graph) if needed.

		if (typeof this.table.terminal === "string") {
			return this.table.terminal;
		}

		let board = this.board;

		if (board.no_moves()) {
			if (board.king_in_check()) {
				this.table.set_terminal_info("Checkmate", board.active === "w" ? 0 : 1);	// The PGN writer checks for this exact string! (Lame...)
			} else {
				this.table.set_terminal_info("Stalemate", 0.5);
			}
		} else if (board.insufficient_material()) {
			this.table.set_terminal_info("Insufficient Material", 0.5);
		} else if (board.halfmove >= 100) {
			this.table.set_terminal_info("50 Move Rule", 0.5);
		} else if (this.is_triple_rep()) {
			this.table.set_terminal_info("Triple Repetition", 0.5);
		} else {
			this.table.set_terminal_info("", null);
		}

		return this.table.terminal;
	},

	validate_searchmoves: function(arr) {

		// Returns a new array with only legal searchmoves.

		if (Array.isArray(arr) === false) {
			arr = [];
		}

		let valid_list = [];

		for (let move of arr) {
			if (this.board.illegal(move) === "") {
				valid_list.push(move);
			}
		}

		return valid_list;
	},

	detach: function() {

		// Returns the node that the hub should point to,
		// which is the parent unless the call is a bad one.

		let parent = this.parent;
		if (!parent) return this;		// Fail

		parent.children = parent.children.filter(child => child !== this);

		this.parent = null;
		DestroyTree(this);
		return parent;
	},
};

// ---------------------------------------------------------------------------------------------------------
// On the theory that it might help the garbage collector, we can
// destroy trees when we're done with them. Whether this is helpful
// in general I don't know, but we also take this opportunity to
// clear nodes from the live_list.

function DestroyTree(node) {
	if (!node || node.destroyed) {
		console.log("Warning: DestroyTree() called with invalid arg");
		return;
	}
	__destroy_tree(node.get_root());
}

function __destroy_tree(node) {

	// Non-recursive when possible...

	while (node.children.length === 1) {

		let child = node.children[0];

		node.parent = null;
		node.board = null;
		node.children = null;
		node.searchmoves = null;
		node.table = null;
		node.graph_length_knower = null;
		node.destroyed = true;

		delete live_nodes[node.id.toString()];

		node = child;
	}

	// Recursive when necessary...

	let children = node.children;

	node.parent = null;
	node.board = null;
	node.children = null;
	node.searchmoves = null;
	node.table = null;
	node.graph_length_knower = null;
	node.destroyed = true;

	delete live_nodes[node.id.toString()];

	for (let child of children) {
		__destroy_tree(child);
	}
}

// ---------------------------------------------------------------------------------------------------------
// Reset analysis and searchmove selections, recursively.

function CleanTree(node) {
	if (!node || node.destroyed) {
		return;
	}
	__clean_tree(node.get_root());
}

function __clean_tree(node) {

	// Non-recursive when possible...

	while (node.children.length === 1) {
		node.table.clear();
		node.searchmoves = [];
		node = node.children[0];
	}

	// Recursive when necessary...

	node.table.clear();
	node.searchmoves = [];

	for (let child of node.children) {
		__clean_tree(child);
	}
}

// ------------------------------------------------------------------------------------------------------
// Add positions to a book, using the given tree. No sorting here, needs to be done after completion.

function AddTreeToBook(node, book) {

	if (!book || Array.isArray(book) === false) {
		throw "AddTreeToBook called without valid array";
	}

	if (!node || node.destroyed) {
		return book;
	}

	__add_tree_to_book(node.get_root(), book);

	return book;
}

function __add_tree_to_book(node, book) {

	// Non-recursive when possible...

	while (node.children.length === 1) {

		let key = KeyFromBoard(node.board);
		let move = node.children[0].move;

		book.push({							// Duplicates allowed. This is improper.
			key: key,
			move: move,
			weight: 1,
		});

		node = node.children[0];
	}

	if (node.children.length === 0) {		// Do this test here, not at the start, since it can become true.
		return;
	}

	// Recursive when necessary...

	let key = KeyFromBoard(node.board);

	for (let child of node.children) {

		book.push({							// Duplicates allowed. This is improper.
			key: key,
			move: child.move,
			weight: 1,
		});

		__add_tree_to_book(child, book);
	}
}

var EPDs =[// last 500 ccrl m2
"6k1/4K3/5PP1/7P/8/8/8/8 w - - 0 1",
"3R4/4K3/6k1/7p/7P/5Q2/8/8 w - - 0 1",
"2R5/8/5Q2/1k4K1/8/P7/8/8 w - - 0 1",
"1R6/4k3/R7/8/7p/8/7K/8 w - - 0 1",
"4Q3/1k6/2R5/8/8/5PK1/5P2/8 w - - 0 1",
"R7/2Q5/8/1k6/4K3/8/8/8 w - - 0 1",
"1k6/3B4/1K6/2N5/4P2P/8/8/8 w - - 0 1",
"8/5K2/8/6Q1/2Q2P2/2P2k2/8/8 w - - 0 1",
"6k1/8/1N3BKP/8/8/1N6/8/8 w - - 0 1",
"8/2k5/4Q2R/8/8/7P/5K2/8 w - - 0 1",
"8/2P5/8/8/6N1/5QK1/3k4/R7 w - - 0 1",
"8/1B3k2/8/4Q3/3K1N2/8/8/8 w - - 0 1",
"8/5k2/1R6/4Q3/8/5P2/6PK/8 w - - 0 1",
"Q1Q5/3K4/8/1k6/8/8/8/8 w - - 0 1",
"6k1/2P3P1/5K2/8/8/8/8/8 w - - 0 1",
"8/8/8/8/4K3/2QRP3/8/1k6 w - - 0 1",
"7Q/8/8/8/1Q6/4K3/8/2k5 w - - 0 1",
"2Q5/4R1K1/8/1k3P2/8/8/8/8 w - - 0 1",
"3Q4/8/8/8/1k6/2R5/1P3P1K/8 w - - 0 1",
"8/4k2K/6Q1/5Q2/8/8/8/8 w - - 0 1",
"5Q2/8/1K6/6k1/8/8/4Q3/8 w - - 0 1",
"8/8/8/3QN3/8/7P/4kp2/K7 w - - 0 1",
"3Q4/2R5/1k6/8/8/8/4K3/8 w - - 0 1",
"3R4/8/K7/8/8/1k6/8/2Q5 w - - 0 1",
"8/k1K5/5Q2/8/8/6P1/8/4q3 w - - 0 1",
"k7/P7/1P5r/1K3R2/8/8/8/8 w - - 0 1",
"6Q1/4k3/6R1/6K1/8/8/8/8 w - - 0 1",
"8/6k1/2K1Q3/5R2/7P/8/8/8 w - - 0 1",
"R7/7k/4Q3/2N5/8/5P2/4K3/8 w - - 0 1",
"8/8/8/1Q4Rp/8/4K3/2k4P/8 w - - 0 1",
"8/4K3/8/8/6Q1/2p5/2B5/7k w - - 0 1",
"8/8/8/4R3/8/Q7/3k1K2/8 w - - 0 1",
"8/k3N3/2Q5/6R1/8/8/3K3p/8 w - - 0 1",
"Q4Q2/8/6k1/8/8/8/3K4/8 w - - 0 1",
"8/R7/8/5P2/3Q1K2/3P4/3k4/8 w - - 0 1",
"7k/8/2B3PK/8/8/8/8/8 w - - 0 1",
"7k/5P2/7P/6K1/8/8/8/4N3 w - - 0 1",
"1k6/3B4/K7/2B5/8/8/8/8 w - - 0 1",
"8/6Q1/1K6/8/8/5B1k/8/8 w - - 0 1",
"3k4/5Q2/1K6/1P4N1/8/8/8/8 w - - 0 1",
"1Q6/8/7k/8/8/5Q2/1K4P1/8 w - - 0 1",
"1Q6/8/8/2K5/8/k7/8/B7 w - - 0 1",
"5Q2/1Pk5/8/6K1/N7/8/6P1/8 w - - 0 1",
"1K6/8/8/8/1QR3p1/6P1/k7/8 w - - 0 1",
"2Q5/8/1k6/4K3/6p1/6P1/2R5/8 w - - 0 1",
"8/1K6/1P6/8/3Q4/6R1/2k5/8 w - - 0 1",
"4Q3/3K4/5Q2/8/8/3P2k1/8/8 w - - 0 1",
"8/k1K5/3N4/8/8/8/4B3/8 w - - 0 1",
"8/5K1k/4N3/6B1/8/8/8/8 w - - 0 1",
"8/8/7K/7p/8/4R2Q/8/6k1 w - - 0 1",
"8/6k1/3Q2bN/6K1/8/8/8/8 w - - 0 1",
"8/6k1/8/5Q2/8/7R/6K1/8 w - - 0 1",
"2Q5/3R2K1/1k6/8/8/8/8/8 w - - 0 1",
"8/6k1/8/5Q2/8/4Q3/5K2/8 w - - 0 1",
"2K5/4R3/kpQ5/8/1r6/8/8/8 w - - 0 1",
"2Q5/8/8/8/1k6/8/5PP1/3R2K1 w - - 0 1",
"2Q5/4R1P1/1k6/8/4K3/8/8/3r4 w - - 0 1",
"4Q3/7k/5K2/5P1p/7P/8/8/8 w - - 0 1",
"5Q2/1K6/5Qp1/8/6k1/8/8/8 w - - 0 1",
"8/8/8/8/6P1/2K5/k7/3Q4 w - - 0 1",
"1Q4R1/4k3/8/P2K4/8/8/8/8 w - - 0 1",
"8/2k5/3R4/4Q3/8/2P4K/8/8 w - - 0 1",
"7Q/3k4/6Q1/8/8/8/6PK/6B1 w - - 0 1",
"6Q1/7K/7Q/4k3/8/8/8/8 w - - 0 1",
"1Q6/8/2K1k3/Q7/8/8/8/8 w - - 0 1",
"8/2B5/8/8/7p/5R2/6r1/5K1k w - - 0 1",
"8/4k3/2Q3K1/8/5N2/2B5/8/8 w - - 0 1",
"4k3/3R4/4K3/8/4N2p/8/6r1/8 w - - 0 1",
"8/8/8/8/7p/4QBP1/8/1K3k2 w - - 0 1",
"2QQ4/4P3/3K4/8/8/1k6/8/8 w - - 0 1",
"8/8/8/8/8/2Q5/5PK1/1Qqk4 w - - 0 1",
"1krQ4/6R1/8/8/8/3K4/8/8 w - - 0 1",
"8/8/8/4K3/5N2/8/3Q4/5k2 w - - 0 1",
"7k/7P/3r2PK/2R5/8/8/8/8 w - - 0 1",
"3Q4/2Q5/8/8/5K2/1k3B2/8/8 w - - 0 1",
"k7/2K5/8/8/8/8/1p6/2Q5 w - - 0 1",
"R7/8/2Q5/8/1k5K/8/7p/8 w - - 0 1",
"5B2/5K1k/8/8/2B5/8/8/8 w - - 0 1",
"8/8/8/8/1B6/3B4/k1K5/8 w - - 0 1",
"8/kPK5/8/p7/P7/8/8/8 w - - 0 1",
"2Q5/5k2/1R5p/8/7P/8/8/6K1 w - - 0 1",
"8/6k1/4Q3/3Q4/8/7K/8/8 w - - 0 1",
"8/4k2P/6K1/3QB3/8/8/8/8 w - - 0 1",
"8/4K3/8/8/8/P1R3Q1/6p1/7k w - - 0 1",
"8/4Q3/5R2/6k1/8/8/6PK/8 w - - 0 1",
"3Q4/k7/2K2B2/8/5P2/8/8/8 w - - 0 1",
"8/8/4P1k1/5R2/5PK1/8/8/1B6 w - - 0 1",
"2R5/6k1/Q6p/8/6PK/8/8/8 w - - 0 1",
"5Q1Q/4K3/8/8/8/6k1/8/8 w - - 0 1",
"8/5K1k/8/6P1/8/8/3B4/8 w - - 0 1",
"8/8/8/8/3Q2K1/P1R3P1/4k3/8 w - - 0 1",
"4Q3/8/1k6/8/8/3K1p1P/8/2R5 w - - 0 1",
"3K4/8/8/8/2Q2B2/8/8/1k6 w - - 0 1",
"6Q1/5K2/8/7k/8/5P2/6P1/8 w - - 0 1",
"2Q5/3R4/1k6/7K/8/8/8/8 w - - 0 1",
"7k/8/6PK/8/3NBP2/8/8/8 w - - 0 1",
"8/5k2/4R3/3Q4/7K/4P3/5P2/8 w - - 0 1",
"7k/8/8/5KQ1/8/5P2/7B/8 w - - 0 1",
"8/8/4Q3/1k4K1/5Q2/6P1/8/8 w - - 0 1",
"8/8/8/8/3Q4/2R5/1k3P2/6K1 w - - 0 1",
"2K5/8/8/8/Q7/1Q6/3k4/8 w - - 0 1",
"8/8/8/7K/2N2P2/8/5Q1P/2k5 w - - 0 1",
"3Q4/8/8/NpK5/kP6/8/8/8 w - - 0 1",
"8/8/8/3Q4/6k1/5R2/8/4K3 w - - 0 1",
"5Q2/1R6/8/1p6/6k1/6p1/6K1/8 w - - 0 1",
"5k2/8/5P2/6Qp/7P/5K2/8/8 w - - 0 1",
"8/8/8/8/6k1/4R3/5Q2/2K5 w - - 0 1",
"2Q5/6K1/1k6/8/8/8/8/3Q4 w - - 0 1",
"7Q/3k4/5R2/4P3/6K1/6P1/8/8 w - - 0 1",
"8/8/1k6/7K/8/8/2R5/3Q4 w - - 0 1",
"8/5K1k/8/6PN/5N2/5P2/8/8 w - - 0 1",
"8/8/8/4Q2p/2BP2k1/8/8/6K1 w - - 0 1",
"8/8/6B1/7p/2K5/P1Q5/k7/8 w - - 0 1",
"5R2/8/3K4/6k1/8/5Q1P/8/8 w - - 0 1",
"8/kP5R/8/8/5B2/8/2K5/8 w - - 0 1",
"8/8/8/8/3pN1QP/3K4/7k/8 w - - 0 1",
"8/8/1B6/5K2/7k/4Q3/8/8 w - - 0 1",
"5R2/3K4/8/8/8/8/2Q5/6k1 w - - 0 1",
"8/6k1/Q7/2Q4p/8/6p1/6K1/8 w - - 0 1",
"6k1/8/5PKP/2B5/8/8/8/8 w - - 0 1",
"8/8/8/1BB5/8/8/k1K5/8 w - - 0 1",
"8/8/8/8/2N5/8/1pKNN3/k7 w - - 0 1",
"8/3k4/8/2Q1R3/3PP1K1/8/8/8 w - - 0 1",
"3Q4/8/6K1/8/1k6/8/1B6/2Q5 w - - 0 1",
"R7/8/4K3/8/8/5Q2/3k1P2/8 w - - 0 1",
"7Q/3k4/6R1/5K2/8/8/8/8 w - - 0 1",
"2Q5/8/8/3Q4/8/4K1k1/8/8 w - - 0 1",
"4R3/7k/5K2/6Pp/7P/8/8/8 w - - 0 1",
"8/7P/R7/4k3/8/p3K3/P7/8 w - - 0 1",
"1R2Q3/5K2/8/4B3/3P4/k7/8/8 w - - 0 1",
"8/P7/8/1P6/8/Q6R/3k4/6K1 w - - 0 1",
"7k/8/3q1pK1/6P1/4Q3/8/8/8 w - - 0 1",
"6k1/3R4/8/5Q2/6N1/8/2K2P2/8 w - - 0 1",
"8/k1K5/1N6/1B6/8/2P5/8/8 w - - 0 1",
"8/8/8/8/6Q1/p4K1p/P7/7k w - - 0 1",
"8/8/8/8/8/5K2/7k/4Q3 w - - 0 1",
"8/8/K7/8/1k6/8/2QR3P/8 w - - 0 1",
"8/1Q4P1/8/5K2/5P2/7P/k7/8 w - - 0 1",
"Q7/8/8/6kp/8/8/5R1P/6K1 w - - 0 1",
"7Q/3k4/5RK1/8/8/6P1/6P1/8 w - - 0 1",
"5R2/8/8/6k1/2P5/8/6K1/1B2Q3 w - - 0 1",
"2Q5/8/8/1k4N1/3Q2K1/8/8/8 w - - 0 1",
"8/6k1/4Q3/8/B5K1/8/P7/4R3 w - - 0 1",
"4K3/6Bk/4QP1P/8/8/8/8/8 w - - 0 1",
"1k6/3Q4/8/2K5/3N4/8/8/8 w - - 0 1",
"8/4k3/6R1/7Q/8/K4PP1/8/8 w - - 0 1",
"7Q/p7/5p2/8/8/8/k1K2P2/8 w - - 0 1",
"Q7/5K1k/5p2/8/8/7P/8/8 w - - 0 1",
"8/7k/5Q2/7P/8/5K2/8/8 w - - 0 1",
"8/4K3/8/NP6/6Q1/8/4B3/7k w - - 0 1",
"8/8/2P3K1/P1B5/1Q6/8/8/k7 w - - 0 1",
"4Q3/5R2/8/6k1/8/8/K7/8 w - - 0 1",
"8/5BPk/5K2/8/8/8/8/8 w - - 0 1",
"6k1/3P4/2P2Q2/8/8/7K/8/8 w - - 0 1",
"8/8/1k6/8/8/1KQ3p1/8/1R6 w - - 0 1",
"5Q2/8/1k6/8/6P1/2R5/2K5/8 w - - 0 1",
"8/2k5/Q2p4/1R6/8/8/5P2/6K1 w - - 0 1",
"2Q5/3R4/8/1k6/8/8/8/6K1 w - - 0 1",
"8/1R3P2/8/8/8/k7/6PP/6K1 w - - 0 1",
"4Q3/5R2/8/6k1/8/8/4K3/8 w - - 0 1",
"8/6P1/6k1/8/4KB2/8/8/8 w - - 0 1",
"8/8/3Q2p1/6k1/8/4K3/5R2/8 w - - 0 1",
"5R2/8/8/8/1K4PQ/7P/8/6k1 w - - 0 1",
"7Q/8/5R2/6k1/8/2K5/p7/8 w - - 0 1",
"1K5k/1R6/3Q4/8/8/8/6r1/8 w - - 0 1",
"7k/8/2N2KPP/8/8/3B4/8/8 w - - 0 1",
"8/8/8/4Q3/6k1/4R3/8/1N4K1 w - - 0 1",
"3Q4/kP6/2P5/8/8/K7/7q/8 w - - 0 1",
"8/7p/8/7P/4Q3/5R2/6k1/2K5 w - - 0 1",
"8/8/5Q2/6p1/4N2k/8/3K4/8 w - - 0 1",
"5Q1R/4K3/8/8/8/6k1/8/8 w - - 0 1",
"5kbQ/8/5PP1/6K1/8/8/8/8 w - - 0 1",
"8/4Q3/5R2/1P4k1/1K6/8/8/8 w - - 0 1",
"R7/5k2/1R6/2K5/8/8/8/8 w - - 0 1",
"8/4N2k/7P/6KN/8/8/8/8 w - - 0 1",
"5QQ1/8/8/K6k/8/1P6/P7/8 w - - 0 1",
"6k1/8/5QB1/5K2/8/8/8/8 w - - 0 1",
"8/2k5/5Q2/4R3/4K3/3NP3/8/8 w - - 0 1",
"2k5/3R4/1K6/8/6B1/8/8/8 w - - 0 1",
"2Q5/5k2/1KQ5/8/8/8/8/8 w - - 0 1",
"2R5/6Q1/8/8/1k2p3/4P3/8/2K5 w - - 0 1",
"8/2R5/8/3Q4/6K1/6P1/1k5P/8 w - - 0 1",
"6K1/3r4/8/8/5Q1R/8/6k1/8 w - - 0 1",
"2k5/3R4/2P5/3K4/2N5/8/8/2r5 w - - 0 1",
"8/8/7B/8/8/3R1Q2/P6k/2K5 w - - 0 1",
"k7/8/KP6/8/7B/8/8/8 w - - 0 1",
"2Q5/5k2/1R6/8/2K5/8/8/8 w - - 0 1",
"4R3/8/2K5/4P3/8/8/3Q2p1/7k w - - 0 1",
"5k2/8/1KQ5/3B4/8/8/8/8 w - - 0 1",
"8/5KPk/8/8/B7/8/P7/8 w - - 0 1",
"8/6k1/1Q6/R7/8/8/5P2/1K6 w - - 0 1",
"5Q2/8/8/6k1/4R3/5P1K/7P/8 w - - 0 1",
"6k1/8/1K3Q2/2Q3Pp/8/8/8/8 w - - 0 1",
"2Q5/3Q4/8/7K/8/1k6/8/8 w - - 0 1",
"8/3k4/7R/R7/5KP1/8/8/8 w - - 0 1",
"5Q2/8/4R3/4K3/6k1/8/8/8 w - - 0 1",
"7Q/8/8/1Q6/8/p7/k7/7K w - - 0 1",
"8/3K4/kPQ5/4N3/8/4B3/8/8 w - - 0 1",
"3k4/P7/8/1K2Q3/8/8/8/2R5 w - - 0 1",
"1k6/7P/2BR4/5K2/2N5/8/8/8 w - - 0 1",
"8/5k2/1Q6/Q7/8/7p/2P5/1K6 w - - 0 1",
"1k6/6K1/8/2Q5/2BB4/8/8/8 w - - 0 1",
"8/8/8/3P4/1B6/3N4/k1K5/8 w - - 0 1",
"8/5BPk/5K2/8/7P/8/8/8 w - - 0 1",
"8/8/8/8/4N3/8/2K5/k1B5 w - - 0 1",
"2Q5/4k3/6RK/8/8/8/8/8 w - - 0 1",
"7Q/8/8/8/6k1/6P1/7K/1B6 w - - 0 1",
"3k4/8/p1BKP3/8/8/6p1/8/8 w - - 0 1",
"5R2/4R3/8/8/8/6kP/6P1/6K1 w - - 0 1",
"Q7/8/8/1R6/2P3k1/3P4/5K2/8 w - - 0 1",
"6Q1/k7/4Q3/8/8/7P/8/3K4 w - - 0 1",
"8/8/5K2/8/N7/3Q4/8/k7 w - - 0 1",
"5Q2/8/8/8/8/p4K2/P6R/4k3 w - - 0 1",
"Q7/3k1B2/1K5p/8/8/8/8/8 w - - 0 1",
"1q6/8/4N3/5K2/8/3BQ3/7k/8 w - - 0 1",
"5B2/5K1k/8/6PP/8/8/8/8 w - - 0 1",
"7Q/5R2/1K4k1/8/8/8/8/8 w - - 0 1",
"7k/6rP/R6K/8/8/8/8/8 w - - 0 1",
"8/4Q3/7k/5K2/6P1/8/8/8 w - - 0 1",
"8/7k/6R1/5K2/5bN1/8/7p/8 w - - 0 1",
"8/4k3/7Q/8/8/6R1/1P4P1/7K w - - 0 1",
"7R/8/5Q2/4K3/8/2N3k1/1N6/8 w - - 0 1",
"3Q4/8/8/1kB3p1/8/3K4/2P5/8 w - - 0 1",
"6R1/7k/8/8/5Q2/P5K1/8/8 w - - 0 1",
"8/kPK5/8/p1P5/P7/8/8/8 w - - 0 1",
"2k5/8/1BPP1K2/8/8/8/P7/8 w - - 0 1",
"8/8/8/7Q/3K1p2/2R5/6k1/8 w - - 0 1",
"3Q4/2Q5/6K1/8/8/8/1k6/8 w - - 0 1",
"7k/5P2/7P/7K/8/6P1/8/8 w - - 0 1",
"8/5KPk/7P/8/5N2/8/8/8 w - - 0 1",
"7Q/1k6/4Q3/4K3/8/8/7P/8 w - - 0 1",
"2Q5/3R4/8/8/1k6/6P1/6K1/8 w - - 0 1",
"2R5/8/3QK3/8/8/1k6/8/8 w - - 0 1",
"1k4K1/3Q4/3R4/8/r7/8/8/8 w - - 0 1",
"8/8/1Q6/6p1/3R4/5pk1/8/6K1 w - - 0 1",
"7Q/1k6/4Q3/5KN1/8/8/8/8 w - - 0 1",
"8/8/8/2P5/3P4/2R5/1k3K2/3Q4 w - - 0 1",
"8/1K6/8/8/6Q1/8/5B1k/8 w - - 0 1",
"6k1/4Q3/8/8/4N3/5K2/8/8 w - - 0 1",
"3Q4/2R5/8/1k6/8/8/5PP1/6K1 w - - 0 1",
"2QQ4/8/1K6/8/8/k6p/7P/8 w - - 0 1",
"2Q5/4B1k1/5R2/3K4/8/8/8/8 w - - 0 1",
"7k/5P2/5K1P/8/8/7P/8/8 w - - 0 1",
"7Q/p7/8/1k6/8/2Q1N3/8/6K1 w - - 0 1",
"8/8/8/2R5/6k1/4Q3/8/6K1 w - - 0 1",
"3Q4/2R5/8/1k6/8/4K3/8/8 w - - 0 1",
"2Q5/7R/4K3/1k6/8/5P2/8/8 w - - 0 1",
"5Q2/8/8/6k1/8/8/3KQ3/8 w - - 0 1",
"8/8/8/k2N4/2p4p/8/1Q4K1/8 w - - 0 1",
"8/8/6k1/4R3/5Q2/3p2P1/3K4/8 w - - 0 1",
"8/2B5/4N3/1K6/8/2Q5/k7/8 w - - 0 1",
"8/8/8/8/8/2K5/k7/3Q4 w - - 0 1",
"1k6/8/2QK4/3N4/8/8/8/8 w - - 0 1",
"4Q3/7k/2R5/P7/8/7P/8/6K1 w - - 0 1",
"1k6/4Q3/1P6/2P5/8/6K1/8/8 w - - 0 1",
"5Q2/8/8/3B4/3K4/8/P6k/8 w - - 0 1",
"Q7/7K/8/1k6/2R4P/8/8/8 w - - 0 1",
"8/4k3/1R6/R7/8/8/6K1/8 w - - 0 1",
"4Q3/8/1k6/8/7K/7P/8/2R5 w - - 0 1",
"5R2/3Q4/8/6k1/P7/1P6/3K4/8 w - - 0 1",
"8/4k3/1Q6/R7/3P4/8/5K1P/8 w - - 0 1",
"5Q2/8/6B1/8/6Kp/7P/7k/8 w - - 0 1",
"8/2k5/Q7/1R6/8/8/8/4K3 w - - 0 1",
"8/6k1/1R6/5p2/8/3Q4/6K1/8 w - - 0 1",
"8/2Q5/4K3/8/8/8/k7/1R6 w - - 0 1",
"8/K7/8/5p2/3R3p/2Q5/5k2/8 w - - 0 1",
"8/1K6/8/8/6Q1/4Q3/2k5/8 w - - 0 1",
"8/8/6K1/1k6/3R4/2Q5/8/8 w - - 0 1",
"8/B1k4K/6R1/8/8/8/8/5R2 w - - 0 1",
"2Q3Q1/8/8/1k6/5N2/3K4/8/8 w - - 0 1",
"8/8/1p6/1P6/8/7R/3Q4/1k4K1 w - - 0 1",
"5Q2/4R3/8/8/6k1/8/6K1/8 w - - 0 1",
"8/1K6/8/8/Q7/2R5/7k/8 w - - 0 1",
"8/k1K5/8/1B6/8/8/7B/8 w - - 0 1",
"4Q3/4K1k1/3B4/6P1/8/5P2/8/8 w - - 0 1",
"8/1k2P1K1/2p5/Q1P5/8/8/8/8 w - - 0 1",
"8/8/8/8/2K3p1/k1N5/3Q4/q7 w - - 0 1",
"8/5K1k/8/8/6N1/8/6R1/7r w - - 0 1",
"8/3P4/8/k7/8/1R4K1/P7/8 w - - 0 1",
"7k/5P2/4K2P/8/8/p7/8/8 w - - 0 1",
"3R4/2Q3K1/8/1k6/8/8/8/8 w - - 0 1",
"2k5/K6R/1P6/P2r4/8/8/8/8 w - - 0 1",
"1k6/8/2Q5/8/3R4/8/P5K1/8 w - - 0 1",
"8/8/5Q2/4R3/6k1/8/8/6K1 w - - 0 1",
"8/k1K5/3N4/1B6/8/8/8/8 w - - 0 1",
"8/5KPk/8/8/7P/2N5/8/8 w - - 0 1",
"8/8/8/3K4/k7/1pB5/1Q6/8 w - - 0 1",
"7k/5P2/4PK2/8/3N4/2P5/8/8 w - - 0 1",
"6Q1/8/3K3k/8/r7/8/8/5R2 w - - 0 1",
"6k1/8/4NPP1/7P/8/5K2/8/8 w - - 0 1",
"6Q1/3k3K/R7/8/8/8/8/8 w - - 0 1",
"8/2P2K2/5R2/3Q4/1k6/8/8/7r w - - 0 1",
"3Q4/k7/P7/1K6/8/8/8/8 w - - 0 1",
"4Q3/2K5/5Q2/8/6k1/8/8/8 w - - 0 1",
"8/8/8/4K1kp/8/7p/5Qr1/8 w - - 0 1",
"3Q4/2Q5/5K2/8/1k6/8/8/8 w - - 0 1",
"4k3/1Q6/4P3/4K3/8/8/8/2q5 w - - 0 1",
"8/8/1K6/5B2/7p/3Q3N/8/4k3 w - - 0 1",
"2K5/8/8/8/4R3/5Q2/3k4/8 w - - 0 1",
"4k3/7Q/3R4/8/8/3B4/2P3K1/8 w - - 0 1",
"k7/Pr6/K2R4/8/8/8/8/8 w - - 0 1",
"Q7/8/8/4NK2/1Q6/3N4/8/3k4 w - - 0 1",
"1Q6/6R1/8/8/3B4/3P4/4k2K/8 w - - 0 1",
"8/8/8/8/P7/1Q5R/3k4/6K1 w - - 0 1",
"8/6P1/8/7K/8/5Q2/8/6k1 w - - 0 1",
"2Q5/5k2/1P6/2K5/4Q3/8/8/8 w - - 0 1",
"8/8/8/8/3Bb3/2K3R1/8/k7 w - - 0 1",
"1k6/8/1P6/2Q5/5K2/8/8/8 w - - 0 1",
"2Q5/8/3Q4/8/8/1k6/8/6K1 w - - 0 1",
"Q7/8/8/1K6/1B6/8/4p2p/6k1 w - - 0 1",
"6Q1/8/8/4Q3/8/5K2/2k5/8 w - - 0 1",
"6K1/8/7k/4R2p/6nP/8/8/8 w - - 0 1",
"2k5/2p5/7Q/8/r7/1QK5/8/8 w - - 0 1",
"5Q2/8/8/8/8/6k1/8/4R2K w - - 0 1",
"8/2p5/2P5/8/1Q6/8/k1B1K3/8 w - - 0 1",
"8/6k1/3Q4/2Q5/8/7P/6PK/8 w - - 0 1",
"5QR1/8/4K3/7k/8/8/8/8 w - - 0 1",
"4Q2Q/8/8/8/8/p4k2/Kp6/8 w - - 0 1",
"8/3k4/1Q6/2R5/8/1n2K3/r7/8 w - - 0 1",
"8/8/8/8/4Q1K1/pk6/1p6/7Q w - - 0 1",
"8/kPK5/8/8/8/P7/8/8 w - - 0 1",
"7Q/8/8/2Q3K1/kP6/8/8/8 w - - 0 1",
"8/1k6/3Q1K2/4Q3/6N1/6P1/8/8 w - - 0 1",
"6k1/7p/4KQ2/8/7P/8/8/8 w - - 0 1",
"1K6/8/4k3/2Q5/Q7/3R4/8/8 w - - 0 1",
"8/8/8/3K4/7Q/6R1/k7/8 w - - 0 1",
"8/8/8/6Q1/8/8/5K1k/6q1 w - - 0 1",
"8/2k5/7R/6R1/8/6K1/8/8 w - - 0 1",
"2K5/8/8/8/2R5/1Q6/4k3/8 w - - 0 1",
"8/k7/P7/6K1/8/2QB4/8/8 w - - 0 1",
"8/2N5/2Q5/3B4/1k1K4/8/8/8 w - - 0 1",
"8/2k5/7R/3Q4/8/P7/K7/8 w - - 0 1",
"8/5KPk/8/8/8/4N3/8/8 w - - 0 1",
"3k4/8/1KQ5/3N4/8/8/8/8 w - - 0 1",
"7R/3k4/6Q1/8/4K3/p7/P7/8 w - - 0 1",
"K1Q5/1R6/8/8/k7/8/8/8 w - - 0 1",
"5Q2/8/8/6k1/4Q3/8/5K1p/8 w - - 0 1",
"3Q4/4Q3/8/8/6K1/5P2/5k2/8 w - - 0 1",
"8/k2N4/2Q5/6p1/8/5P2/3K4/8 w - - 0 1",
"8/5Q2/8/1K4Q1/7P/8/7k/8 w - - 0 1",
"4B1Q1/8/8/8/5K2/8/7k/8 w - - 0 1",
"5Q2/4Q3/8/8/6K1/8/6k1/8 w - - 0 1",
"3Q4/2Q5/8/1k6/8/8/5K2/8 w - - 0 1",
"8/k7/2RK4/1P1B4/8/8/1r6/8 w - - 0 1",
"4k3/2Q5/6K1/8/8/8/8/3B4 w - - 0 1",
"8/6Pk/5K2/4N3/2B5/8/8/8 w - - 0 1",
"1k6/4N3/KPP5/8/8/8/8/8 w - - 0 1",
"8/4K2k/5Q2/6P1/8/8/8/3B4 w - - 0 1",
"3k4/5Q2/6p1/6N1/8/7K/5P2/8 w - - 0 1",
"4Q3/3K2k1/8/2B2PP1/8/8/8/8 w - - 0 1",
"7k/5P2/5K2/8/6BP/8/6P1/8 w - - 0 1",
"8/5r2/6K1/8/2R1Q3/5P2/3k4/8 w - - 0 1",
"6k1/4K3/6PP/8/6N1/8/8/8 w - - 0 1",
"8/4k3/6Q1/5R2/8/8/P6P/5K2 w - - 0 1",
"4R3/5Q2/8/6k1/8/7P/2P2K2/8 w - - 0 1",
"8/8/8/8/2R5/1K5Q/5k2/8 w - - 0 1",
"6Q1/2Q5/8/8/1k6/7P/6PK/8 w - - 0 1",
"8/3k4/5Q2/6Q1/7P/8/8/6K1 w - - 0 1",
"8/8/2r5/5RK1/8/Q7/6kp/8 w - - 0 1",
"3Q4/8/8/4Q3/6K1/6P1/5k1P/8 w - - 0 1",
"4Q3/5R2/8/6k1/3K4/8/8/8 w - - 0 1",
"8/8/2Q5/5K2/8/1Q6/4k3/8 w - - 0 1",
"Q7/1K5k/8/8/8/1N6/8/6R1 w - - 0 1",
"8/8/8/Q7/6P1/1R5P/5k2/7K w - - 0 1",
"8/3k4/1Q6/2R5/3P4/2K5/8/8 w - - 0 1",
"8/5KPk/8/8/3N3P/8/8/8 w - - 0 1",
"8/K3k3/3R4/8/P4Q2/6P1/8/8 w - - 0 1",
"1k6/5Q2/1P6/5K2/2N5/8/8/8 w - - 0 1",
"8/8/8/8/5N2/pQK5/8/k7 w - - 0 1",
"k7/2r5/K7/2Q5/8/8/8/8 w - - 0 1",
"8/8/4K3/8/7Q/6R1/2k5/8 w - - 0 1",
"4k3/8/4P1R1/4KP2/8/8/8/7r w - - 0 1",
"7Q/8/1k4K1/3Q4/8/8/8/8 w - - 0 1",
"4R3/4K3/5Q2/8/6k1/8/8/4B3 w - - 0 1",
"8/P7/8/1K6/6Q1/1p6/1P6/7k w - - 0 1",
"8/2k5/4Q3/3R4/5N2/5K2/8/8 w - - 0 1",
"k7/7R/2K4p/7P/8/5B2/8/8 w - - 0 1",
"8/8/8/R7/2QP4/8/1k3P1K/8 w - - 0 1",
"k7/2K5/1P6/2N5/P7/8/8/8 w - - 0 1",
"2Q5/8/8/8/6Q1/4k3/7K/4N3 w - - 0 1",
"8/5BPk/5K2/5n2/8/6P1/8/8 w - - 0 1",
"3R4/8/2Q5/6p1/7p/1k5K/8/8 w - - 0 1",
"5Q2/8/4B1k1/8/3B4/6K1/8/8 w - - 0 1",
"5Q2/k7/Pp1K4/1P6/8/8/8/8 w - - 0 1",
"6K1/8/8/8/6N1/8/4Q3/6k1 w - - 0 1",
"5k2/8/4PKB1/8/7P/6P1/8/8 w - - 0 1",
"6QQ/8/8/8/5k2/8/2K5/8 w - - 0 1",
"2Q5/3R4/1k6/8/6p1/8/7P/5K2 w - - 0 1",
"3Q4/8/4kN2/6K1/8/8/8/8 w - - 0 1",
"Q7/8/8/8/3K4/6kB/8/8 w - - 0 1",
"7K/2pR4/6k1/8/8/8/7P/5Q2 w - - 0 1",
"5Q2/1k5K/6R1/8/8/8/8/8 w - - 0 1",
"4Q2Q/8/1k2K3/8/6P1/7P/8/8 w - - 0 1",
"5Q2/2k3K1/7Q/8/5N2/6P1/8/8 w - - 0 1",
"5Q2/3R4/8/3K2k1/8/8/6PP/8 w - - 0 1",
"8/3R4/8/8/8/8/3Q2PK/1k6 w - - 0 1",
"6R1/8/4R3/3K4/8/5Q2/3k4/8 w - - 0 1",
"k7/3Q4/8/8/6P1/1B6/5P2/6K1 w - - 0 1",
"1QQ5/8/8/k3p3/8/4K3/5P2/8 w - - 0 1",
"8/8/8/4Q3/K5p1/P1R5/5k2/8 w - - 0 1",
"6QB/3k4/5R2/8/6K1/8/1P6/8 w - - 0 1",
"1Q6/K2k4/8/5N2/p7/P7/8/8 w - - 0 1",
"2Q5/6k1/5Rp1/6P1/6K1/8/8/8 w - - 0 1",
"8/8/8/8/8/6RK/4k3/7Q w - - 0 1",
"8/5Q2/4R3/6k1/8/7P/6P1/6K1 w - - 0 1",
"8/8/8/1K6/1R4p1/Q5P1/5k2/8 w - - 0 1",
"8/r7/8/4KN2/6kP/3R4/8/8 w - - 0 1",
"2K5/8/k7/8/4B3/1Q6/8/8 w - - 0 1",
"3B3k/8/2K5/6Q1/6P1/8/8/8 w - - 0 1",
"5R2/2B3k1/3Q4/8/2K5/8/8/8 w - - 0 1",
"8/6Pk/4BK1P/8/8/8/8/8 w - - 0 1",
"4Q3/7k/5K2/8/8/8/8/8 w - - 0 1",
"8/6K1/8/8/8/3Q2p1/6k1/5R2 w - - 0 1",
"1R2Q3/8/K2k4/6p1/6P1/8/8/8 w - - 0 1",
"7Q/6K1/8/8/8/5QP1/2k5/8 w - - 0 1",
"5k2/8/2N1QP2/8/5K2/8/8/8 w - - 0 1",
"8/8/8/2K5/2N5/3Q4/k7/8 w - - 0 1",
"5K2/8/8/6k1/8/8/7Q/5R2 w - - 0 1",
"8/8/8/8/3N1P1Q/1P3K2/8/6k1 w - - 0 1",
"8/8/4K3/3p4/3P3R/5Q2/2k5/8 w - - 0 1",
"Q7/8/8/4K3/8/1Q6/4k3/8 w - - 0 1",
"8/8/1k6/4QK2/8/8/2Q5/8 w - - 0 1",
"8/8/6K1/3Q4/6P1/7R/1k6/8 w - - 0 1",
"4Q3/2k5/7R/8/8/P7/1P6/6K1 w - - 0 1",
"4K3/5Q2/4R3/6k1/8/8/8/8 w - - 0 1",
"3r2k1/5R2/6K1/5NP1/8/8/8/8 w - - 0 1",
"8/8/8/8/6Rp/1Q5P/4k2K/8 w - - 0 1",
"8/8/8/3Q4/5PKP/4B3/4k3/8 w - - 0 1",
"8/5k2/1R6/2Q5/5P2/5KP1/8/8 w - - 0 1",
"8/8/8/R7/8/6Q1/3k2P1/5K2 w - - 0 1",
"1R6/8/2Q5/8/8/3k2p1/5PK1/8 w - - 0 1",
"2Q5/3R2K1/1k4P1/8/8/8/8/1r6 w - - 0 1",
"8/k7/8/1Q4R1/8/P3K3/6P1/8 w - - 0 1",
"8/5P2/4K2k/6R1/P6P/8/8/8 w - - 0 1",
"5K1k/6r1/5R2/8/8/6R1/8/8 w - - 0 1",
"3R4/k7/3Q3K/8/8/6N1/7P/8 w - - 0 1",
"7k/4R1b1/6K1/6P1/8/8/8/8 w - - 0 1",
"5R2/8/8/4Q3/6k1/K7/8/8 w - - 0 1",
"8/1k3K2/4Q3/3N4/8/8/8/8 w - - 0 1",
"3R4/8/2Q5/8/8/1k5P/6P1/6K1 w - - 0 1",
"5k2/8/5K2/6Q1/8/8/8/8 w - - 0 1",
"8/R2K2k1/6p1/8/5p1Q/8/8/8 w - - 0 1",
"7Q/5k2/6R1/6K1/4p3/8/5P2/8 w - - 0 1",
"3R3B/k7/2K5/8/8/8/8/8 w - - 0 1",
"8/8/8/5K2/8/1B6/5Q2/1k6 w - - 0 1",
"7k/8/2K5/6Q1/8/6B1/2P4P/8 w - - 0 1",
"8/7P/8/5Q2/8/8/4K1pk/8 w - - 0 1",
"2Q5/3Q4/1k4PK/8/8/8/8/8 w - - 0 1",
"8/8/8/8/5Q1P/5K2/7P/6k1 w - - 0 1",
"8/8/5K1k/6pp/8/6Q1/8/8 w - - 0 1",
"6k1/4K3/5P2/p7/P7/8/2B5/8 w - - 0 1",
"6Q1/4KP2/4N2k/8/8/8/8/8 w - - 0 1",
"Q7/7k/2K5/8/8/8/8/6Q1 w - - 0 1",
"4K3/8/8/8/1Q6/Q7/5k2/8 w - - 0 1",
"8/7k/2K2Q2/4N3/1P6/P7/8/8 w - - 0 1",
"6R1/8/2Q5/8/6P1/1k6/4K3/8 w - - 0 1",
"8/4Q3/1k6/2R5/4K3/8/4N3/8 w - - 0 1",
"4K3/8/5B1k/5Q2/8/8/8/8 w - - 0 1",
"8/8/P7/3N4/1K4P1/8/3Q4/1k6 w - - 0 1",
"3Q4/2Q5/8/1k3N1K/8/2p5/8/8 w - - 0 1",
"8/8/8/5K2/2N5/8/3Q4/5k2 w - - 0 1",
"8/8/8/1N6/8/8/3Q1PP1/1k3K2 w - - 0 1",
"8/8/8/5Q2/8/5K2/8/6k1 w - - 0 1",
"8/1Q6/4k3/1Q6/8/8/5P1p/7K w - - 0 1",
"8/8/1KN1Q3/P4R2/6k1/8/8/8 w - - 0 1",
"8/4k3/5N1K/3Q4/8/8/8/8 w - - 0 1",
"6Q1/k7/P3R3/8/5K2/8/8/8 w - - 0 1",
"8/3K4/8/8/3N4/8/4Q3/6k1 w - - 0 1",
"8/3K4/8/6p1/8/7k/5Qp1/6B1 w - - 0 1",
"4k3/8/3PP1K1/8/7B/5P2/8/8 w - - 0 1",
"1kNQ4/6r1/2K5/8/8/8/8/8 w - - 0 1",
"6k1/R7/5B1P/8/8/8/5K2/8 w - - 0 1",
"8/8/K7/8/8/4Q3/7k/3R4 w - - 0 1",
"8/1k6/7Q/P7/3K4/8/8/3B4 w - - 0 1",
"6Q1/2R5/1k6/8/8/8/8/5K2 w - - 0 1",
"8/6PK/8/8/8/8/3Q4/6k1 w - - 0 1",
"8/7k/2Q5/4Q3/8/8/1K6/8 w - - 0 1",
"8/3Q4/2R5/8/1k6/7P/P5K1/8 w - - 0 1",
"Q7/7k/8/2K5/8/6Q1/7P/8 w - - 0 1",
"K7/8/5Q2/4R3/6k1/8/8/8 w - - 0 1",
"5k2/8/6K1/6B1/8/8/r7/4R3 w - - 0 1",
"8/3k4/1Q6/2R5/8/5PK1/8/8 w - - 0 1",
"2Q5/3R4/1k6/8/7P/8/6P1/6K1 w - - 0 1",
"2K1R3/8/5Q2/8/6k1/8/8/6B1 w - - 0 1",
"R7/6k1/2Q5/8/8/8/6K1/8 w - - 0 1",
"8/8/Pk6/8/8/2R5/3Q4/1K6 w - - 0 1",
"1k6/8/1PQ3K1/8/2P5/8/6P1/8 w - - 0 1",
"5Q2/7K/1k6/3QB3/8/8/8/8 w - - 0 1",
"8/5PkP/4K1P1/7B/8/8/8/8 w - - 0 1",
"5k2/6R1/4KP2/1r6/5N2/8/8/8 w - - 0 1",
"2Q5/3R4/8/6p1/6P1/5K2/8/1k6 w - - 0 1",
"8/8/8/8/4B3/5K2/2R5/7k w - - 0 1",
"8/8/2k5/8/1Q4Q1/5K2/8/8 w - - 0 1",
"1B1k4/8/2K1R3/8/6p1/6P1/8/8 w - - 0 1",
"4Q3/6K1/5N2/5k2/8/7P/5P2/8 w - - 0 1",
"7k/8/6PP/6K1/8/1B6/8/8 w - - 0 1",
"6Q1/8/8/8/8/8/5Q2/3k2K1 w - - 0 1",
"7Q/4kN2/6K1/3p4/8/8/8/2q5 w - - 0 1",
"6k1/P5P1/5K2/8/8/6P1/p7/8 w - - 0 1", //next line starts ECM wtm 610 positions
"2q1r1k1/1ppb4/r2p1Pp1/p4n1p/2P1n3/5NPP/PP3Q1K/2BRRB2 w - - 0 1",
"4k3/p1P3p1/2q1np1p/3N4/8/1Q3PP1/6KP/8 w - - 0 1",
"3q4/pp3pkp/5npN/2bpr1B1/4r3/2P2Q2/PP3PPP/R4RK1 w - - 0 1",
"3rr1k1/pb3pp1/1p1q1b1p/1P2NQ2/3P4/P1NB4/3K1P1P/2R3R1 w - - 0 1",
"5rk1/7p/p1N5/3pNp2/2bPnqpQ/P7/1P3PPP/4R1K1 w - - 0 1",
"rnb2rk1/pp2np1p/2p2q1b/8/2BPPN2/2P2Q2/PP4PP/R1B2RK1 w - - 0 1",
"2k4r/1pp2ppp/p1p1bn2/4N3/1q1rP3/2N1Q3/PPP2PPP/R4RK1 w - - 0 1",
"r3kb1r/pp2pppp/3q4/3Pn3/6b1/2N1BN2/PP3PPP/R2QKB1R w KQkq - 0 1",
"r1b1k3/5p1p/p1p5/3np3/1b2N3/4B3/PPP1BPrP/2KR3R w q - 0 1",
"r3rbk1/1pq2ppp/2ppbnn1/p3p3/P1PPN3/BP1BPN1P/2Q2PP1/R2R2K1 w - - 0 1",
"b7/2q2kp1/p3pbr1/1pPpP2Q/1P1N3P/6P1/P7/5RK1 w - - 0 1",
"1rr1nbk1/5ppp/3p4/1q1PpN2/np2P3/5Q1P/P1BB1PP1/2R1R1K1 w - - 0 1",
"rn3rk1/4bppp/1q2p3/p2pP3/8/1PN2B1P/P4PP1/2RQ1RK1 w - - 0 1",
"6rk/1p1br2p/pqp5/3pNP2/3Pp3/P5PR/5PKR/Q7 w - - 0 1",
"2b3k1/5p1p/7b/p2B3p/3P4/P2Q1N1P/1q3PP1/6K1 w - - 0 1",
"r1b5/4k3/p7/3p1n2/3Bp3/2P2r1P/PPBK1P2/4R2R w - - 0 1",
"r1b2rk1/2q2ppp/2pbp3/p7/4Nn2/3B4/PPPBQ1PP/R4R1K w - - 0 1",
"3r2k1/1q1P1ppp/r2R2n1/p4Q2/1ppB2R1/6P1/PP3PP1/6K1 w - - 0 1",
"2bnr1k1/2q2ppp/p7/2p1b3/2N1B3/R7/1P2QPPP/2B3K1 w - - 0 1",
"r1b2r1k/3nN2p/p2Q1p2/8/4PP2/1R6/q1PK2PP/4R3 w - - 0 1",
"1nk1r1r1/pp2n1pp/4p3/q2pPp1N/b1pP1P2/B1P2R2/2P1B1PP/R2Q2K1 w - - 0 1",
"2r2bk1/4qp2/3n2p1/2R1p1Np/2p1N3/r6P/1Q3PP1/3R2K1 w - - 0 1",
"2k4r/ppp1n1p1/2n2qb1/2N5/Q1P3p1/P2r3P/1P3PB1/R1B2RK1 w - - 0 1",
"r1b2rk1/pp2b3/2pn1n1p/3pNppq/3P4/BP1N2P1/P3PPBP/R1Q2RK1 w - - 0 1",
"r4rk1/pp4pp/2nqb3/3p4/8/2NB4/PP1Q1PPP/4RRK1 w - - 0 1",
"5bk1/1bqn1r1p/p3Q1p1/4p3/1PN1Pp2/P1N4P/5PP1/R1BR2K1 w - - 0 1",
"5rk1/1r1qbnnp/R2p2p1/1p1Pp3/1Pp1P1N1/2P1B1NP/5QP1/5R1K w - - 0 1",
"2kr1b1R/1b3pp1/p2pp3/1pq3P1/2nQPP2/P1N5/1PP1BB2/1K6 w - - 0 1",
"r3nb1Q/p1q2kr1/2p3p1/2ppnpP1/1P3N2/4P3/PB1P4/1R2KB1R w K - 0 1",
"1rb1qn2/1p2nrbk/p2p2p1/P2Pp1Pp/NP2P2P/2RNB3/2QKB3/1R6 w - - 0 1",
"r1b1r1k1/pp4bp/5np1/2qPB3/8/6NP/PPP1Q1B1/R4R1K w - - 0 1",
"4qk2/pp3pp1/1nbr3p/2p5/5N2/2P1Q3/PPB2PPP/2K1R3 w - - 0 1",
"r4rk1/1b3ppp/p2q1n2/1p2N3/3P4/1B6/P1Q2PPP/2R1R1K1 w - - 0 1",
"2rq1r2/pp3pnk/2n1b1pp/3pQ3/3P1N2/P1N5/1P3PPP/1BR2RK1 w - - 0 1",
"4nk2/r1r1bppp/pN2p3/2np4/8/BPN3PP/P3PPK1/2RR4 w - - 0 1",
"2nq2k1/2r3pp/p1p1rp2/PpQ1N3/1P1PR3/8/5PPP/2R3K1 w - - 0 1",
"r1b2rk1/1p2bppp/p3pn2/4B3/1qBR4/2N5/P3QPPP/R5K1 w - - 0 1",
"3r4/p2nrpkp/2B1p3/2P2pP1/3R3Q/q7/6PP/6RK w - - 0 1",
"b1n1r1k1/2q2p1p/p4Pp1/1pBP4/4B1P1/2P1Q3/P4K1P/4R3 w - - 0 1",
"r1bqnrk1/pp2ppb1/1np3pp/4P1N1/5P2/2NBB3/PPP3PP/R2Q1RK1 w - - 0 1",
"3nk3/3q1p2/1B3pr1/4p3/bP2P2p/r2B4/2Q2RPP/3R2K1 w - - 0 1",
"3rnr1k/pp3ppp/4b3/2p1qNP1/P2pPR2/1P1P2Q1/2P3BP/5RK1 w - - 0 1",
"r1b2kr1/1p1p1pNp/p1n1p1p1/5P2/3QP3/2N5/PqP1B1PP/R4RK1 w - - 0 1",
"5rk1/3r1p1p/3b2pQ/8/4q3/4B2P/3R1PP1/4R1K1 w - - 0 1",
"4rrk1/1bp2ppp/p1q2b1B/1pn2B2/4N1Q1/2P4P/PP3PP1/3RR1K1 w - - 0 1",
"2rnrbnk/3q1ppp/p1p5/3p1P2/1p1PPN2/4BQ1R/PP1N2PP/3R2K1 w - - 0 1",
"5r1k/pb2r1bp/1p2B1p1/n7/4qNQ1/4B3/P4PPP/2RR2K1 w - - 0 1",
"1r3rk1/5pp1/1n2qn1p/1p1pPNb1/2pP2QP/2P5/1PB3P1/R1B1R1K1 w - - 0 1",
"4r1k1/1b4pp/p7/1prP3q/2P1B3/5P2/P3Q2P/3RR2K w - - 0 1",
"r1br2k1/ppb1qpp1/2P4p/2n1p3/4B3/P1N2N2/1P3PPP/2RQ1RK1 w - - 0 1",
"2r3k1/1nqbrp2/p5pp/1p1Pp1N1/8/1P5P/P1B2PP1/2RQR1K1 w - - 0 1",
"2r1rbk1/1b3ppp/pp6/2q1pNP1/Pn1RP3/2N5/1PP2QBP/5R1K w - - 0 1",
"r1b1rk2/3n1pbQ/2qp2p1/p2N2P1/2Bp3N/4P3/PP3PP1/2KR3R w - - 0 1",
"r1r2qkb/4pp1p/pBbp3P/3Nn1P1/4Q3/1B6/PPP5/1K1R2R1 w - - 0 1",
"r4k2/q4npp/P2P4/2p1R3/2N5/6PP/Q5K1/8 w - - 0 1",
"rn1q1r2/4bpk1/p3p3/1pN1N1np/2pP4/4PpBb/PPQ4P/1B1RK1R1 w - - 0 1",
"1r1rb1k1/2p3pp/p2q1p2/3PpP1Q/Pp1bP2N/1B5R/1P4PP/2B4K w - - 0 1",
"rn1r2k1/p4ppp/2p3b1/3PQ3/1B2Np1q/1B3P2/P1P3PP/4R1K1 w - - 0 1",
"4r2k/5R1p/pp1Bq1pN/2p1P3/1n1b3Q/3P4/1P4KP/8 w - - 0 1",
"r2nk1r1/pb3q1p/4p3/3p2pQ/8/BP6/P4PPP/2R1R1K1 w q - 0 1",
"6k1/1pqb1p2/5bpB/r2n4/4N1P1/1P3P2/1P1Q4/1K5R w - - 0 1",
"1r3rk1/3Q2pp/p3p3/6B1/3np3/6R1/PqP1B2P/3K2R1 w - - 0 1",
"2r5/p4Q2/k1bBp3/4P3/p1nq4/5B2/2Pr2P1/1R1RK3 w - - 0 1",
"2r1nk2/4qpbQ/4b3/1p2RpP1/4P3/p7/PBP5/1K5R w - - 0 1",
"2kr4/1bpr3p/4R3/1pQ5/8/6B1/3q2PP/2R4K w - - 0 1",
"r1k4r/ppp1b3/5Npp/4pb1Q/8/1B2B3/PqP2PPP/2RR2K1 w - - 0 1",
"6r1/p4rkp/3RQ1n1/1pp1p1B1/2p1P3/2P3R1/P4qPK/8 w - - 0 1",
"2kr1r2/1pp3pp/1n2p1b1/pN2B3/P1q5/1Q1p3P/5PP1/R4R1K w - - 0 1",
"2kr1bnr/1ppq4/p3bp2/6pp/4p3/2N2NBP/PP3PP1/2RQ1RK1 w - - 0 1",
"r2q2rk/p3bp1p/4b1p1/3pP2R/1p1B4/3BQ3/PPP3PP/5R1K w - - 0 1",
"q6r/pp3pkp/5np1/4Q3/4P3/6N1/P4PPP/5RK1 w - - 0 1",
"r1b1rk2/pp3ppQ/1np5/4q3/2B4N/4P3/PP3PP1/2R2K1R w - - 0 1",
"r1bn1rk1/pp3p1p/6p1/2bR2N1/2B2B2/q1P1P3/2Q2PPP/4K2R w K - 0 1",
"r3r1k1/p2N1pp1/1pn1p3/q1n5/2PQ4/P3B3/4PPKP/R5R1 w - - 0 1",
"4qbk1/1R5n/p2pr1p1/2pQpNPp/P1P1P3/2P2P2/3B4/5K2 w - - 0 1",
"3qr1k1/1p1bppbp/p2p2p1/2rPn3/P2N4/4BP2/1PPQ2PP/R2R1BK1 w - - 0 1",
"2b2r2/1p2q1k1/r3pppp/4n2P/p3N3/1B4Q1/PPP3P1/3R1R1K w - - 0 1",
"8/R5p1/6k1/pr2p1b1/4K3/7P/5P2/6R1 w - - 0 1",
"5rk1/1b1r1p2/p1q1pQp1/1p2P2p/8/1BP1NR2/PP1n2PP/5R1K w - - 0 1",
"6k1/p1p2r2/1p1p1P1Q/3P4/2P5/5qr1/PP4RP/6RK w - - 0 1",
"2b1rr1k/1p5p/1Ppp2q1/p3bN2/2P1n3/5R2/PBQ3BP/3R2K1 w - - 0 1",
"3b2rk/7p/p7/2pbqNrn/Pp1p1R2/1P1Q2P1/1BPN1R1P/6K1 w - - 0 1",
"1rbr2k1/1pq1bp1p/p1pNn1p1/2n1p3/2B1P2P/1NQ1BP2/PP4P1/1K1R3R w - - 0 1",
"r4rk1/1pp1b1pp/p1q5/3pPp2/3Pn3/P3N3/1P3PPP/R1BQR1K1 w - - 0 1",
"rbbq1rk1/p3nppp/1p2p3/8/1B1pN3/P2B4/1P3PPP/2RQ1RK1 w - - 0 1",
"rn2qbr1/2p4k/p2p1nb1/1p1Pp2p/2P4P/2NBBPN1/PP1Q4/2KR2R1 w - - 0 1",
"5r1k/1p2qp1p/p4R1Q/P1p5/2Prp3/7P/1P4P1/5R1K w - - 0 1",
"r1bq1rk1/pp2bp1p/2p2np1/3p2B1/3P4/2NQ2N1/PPP2PPP/4RRK1 w - - 0 1",
"2rq1rk1/pp2bppp/1npp1n2/3PpN1b/2P5/2N3PP/PP2PPB1/R1BQ1RK1 w - - 0 1",
"rnbq1rk1/pp2b1pp/5n2/2pPp3/2P1N3/3B1N2/PP4PP/R1BQK2R w KQ - 0 1",
"2n1rbk1/5pp1/7p/qP1pp3/4b1Q1/1B5P/1P1N1PP1/2B1R1K1 w - - 0 1",
"4k3/2R2p2/5p1p/8/rb6/1N6/5PPP/5K2 w - - 0 1",
"2k3r1/pp2rp2/1np5/2Np1p2/P2P3p/1R2P1Pq/2Q2P1P/1R4K1 w - - 0 1",
"2r1k3/p3nrR1/1p1p4/2p1p1p1/2P1B3/2PP1P2/P5K1/7R w - - 0 1",
"3r2k1/1p4pp/p1q1p3/3p1B2/bP1B2P1/P4Q2/5PKP/2b2R2 w - - 0 1",
"5n1r/1p2kp2/rB1Nb3/4p1Pp/4p2P/1PP5/8/1K1R1R2 w - - 0 1",
"4r1k1/3R1ppp/p2p4/5PP1/2q2P2/2n2B2/P1P3QP/1r3R1K w - - 0 1",
"2r3k1/pp2n3/6pQ/4q3/8/2P1p1P1/P5BP/3R2K1 w - - 0 1",
"8/p3q1kp/1p2Pnp1/3pQ3/2pP4/1nP3N1/1B4PP/6K1 w - - 0 1",
"r2b1rk1/5qp1/2p2P2/2p3Pp/p6P/2Q5/PPP5/2KR2R1 w - - 0 1",
"1r2k2r/p5bp/4p1p1/q2pn3/1p2N1P1/6QP/PPP5/1KBR3R w k - 0 1",
"rn1q1rk1/pp3p1p/2p5/3p4/5Q1P/2NP3R/PPP3P1/4RK2 w - - 0 1",
"r1b1kb1Q/qp2pp2/p3n1p1/2nN2Pp/2B4P/7N/PPP5/2KRR3 w q - 0 1",
"2r1q1r1/6bk/p2pN1pp/1p1N4/4P3/3R3Q/PnP4P/1K4R1 w - - 0 1",
"6k1/p1q2pp1/2n2b2/3B2Pp/2P2P2/5N1P/Pr1Q2K1/4R3 w - - 0 1",
"r1r3k1/p4n2/3p4/5NpR/8/2q2P2/P1PQ4/2K4R w - - 0 1",
"8/p5Q1/2ppq2p/3n1ppk/3B4/2P2P1P/P5P1/6K1 w - - 0 1",
"r1r3k1/1p1b1nq1/6p1/pN1p4/P2Np2R/1P2P3/1Q3PP1/1K5R w - - 0 1",
"1r2k2r/3q2pp/p3pp2/P7/2P1Q3/8/1nB3PP/1R3R1K w k - 0 1",
"r1bq3k/ppp2Qp1/2n1p2p/6N1/2BPN3/2P1n3/PP4PP/R5K1 w - - 0 1",
"3R4/1p2kp2/p1b1nN2/6p1/8/6BP/2r1qPPK/Q7 w - - 0 1",
"6k1/p5p1/1p1p1nN1/1B1P4/4PK2/8/2r3b1/7R w - - 0 1",
"8/5P2/4K1kP/4R3/8/8/8/5r2 w - - 0 1",
"3r1rk1/p1p1qp1p/2p1b1p1/8/P2PRP2/2P1NQ2/6PP/R5K1 w - - 0 1",
"6k1/pr3ppp/1p3qn1/5NQ1/2p5/8/P4PPP/4R1K1 w - - 0 1",
"4r1k1/p4ppp/4q2r/1Q6/4p3/4P1P1/P4P1P/2RR2K1 w - - 0 1",
"4r1k1/1np1r1pp/1ppp1q2/6N1/1P3P2/4RQP1/7P/4R1K1 w - - 0 1",
"r4rk1/pp3p1p/3pq1p1/2nNp3/3R1P2/7Q/PP4PP/5RK1 w - - 0 1",
"3qn2k/1p3Bp1/rbn4p/2p5/p1P2p2/P2b2PP/1BQNRP2/1R4K1 w - - 0 1",
"1q6/2rk1p2/p1n1b1rN/3p2p1/8/3Q4/PP1B1PPP/2R1R1K1 w - - 0 1",
"r3kb1r/2q2p2/3p4/ppp1n1B1/P6P/1B3pQ1/1PP3b1/2KRR3 w kq - 0 1",
"r1b2rk1/1p4pp/p1n3q1/4ppN1/7Q/2P1B3/P1P2PPP/R2R2K1 w - - 0 1",
"1rb2r2/1pR1N2p/p2R2pk/5p2/4pP2/1P1nP3/P4P1P/5BK1 w - - 0 1",
"r1b3k1/ppp2r2/6p1/3n3p/6qP/3BQ3/PBP5/2KR3R w - - 0 1",
"4r1k1/1pbb3p/2pp2q1/p1n5/2P2R2/1PN1n1P1/PB2Q1B1/5RK1 w - - 0 1",
"3r2k1/p2r1p1p/1pR1p1qP/3P1pP1/3R4/1P2Q3/P4K2/8 w - - 0 1",
"r4k2/p1pr1ppp/2q5/3PR2P/3Q4/8/6P1/5RK1 w - - 0 1",
"1R3b2/3r3k/2p1bp1p/r1q1pNpQ/2PpP2P/6B1/P4PP1/1R4K1 w - - 0 1",
"r1b4r/pp2ppk1/2np1np1/3N3p/2B1P3/q3BP2/P1PQ2PP/1R3RK1 w - - 0 1",
"r3k2r/pb1n1pbp/4p1p1/q1n1P3/Bp1N1N2/4B3/PP3PPP/R2Q1RK1 w kq - 0 1",
"5rk1/5pbp/b5p1/p1nNN3/1p2n3/1P4PP/P4PB1/2BR2K1 w - - 0 1",
"5r1k/pp1n1p1p/1b1qpP2/8/1PrN4/P1N1Q1P1/7P/3R1R1K w - - 0 1",
"r2r1bk1/3qp2p/3pp1p1/p2n2N1/2N3Q1/BP4P1/P4PP1/2R3K1 w - - 0 1",
"1rbr2k1/4qp2/p1n2bpp/1pp1p1N1/4P3/2P1BQ1P/PPB2PP1/3RR1K1 w - - 0 1",
"2r2rk1/1p1q1ppp/1p3n2/3p1N2/4n3/1N3Q2/PPP2PPP/R2R2K1 w - - 0 1",
"rn3rk1/pp2ppbp/6p1/2R3N1/2B3b1/q3B3/P1P1Q1PP/5RK1 w - - 0 1",
"r1k3r1/pppnb1p1/4N3/3QP2p/3P3q/4B3/PPP2P2/R3KB2 w Q - 0 1",
"r1nqr2k/1p1b1Q1p/p5p1/P1pPb3/5B2/2N5/BP4PP/R4RK1 w - - 0 1",
"8/k3r1b1/Pp2rpp1/1qpQ4/4nB2/2P2NP1/7P/R4RK1 w - - 0 1",
"r1b2nk1/2qn1p1p/1ppR2p1/8/1PP1NP2/4r1PP/1Q2N1B1/3R2K1 w - - 0 1",
"4br1k/pR4bp/2r1B1pN/4npB1/3p4/P7/5PPP/4R1K1 w - - 0 1",
"r1bq1rk1/pppn2bp/3p2p1/3N1p2/8/BP1BRQ1P/P1PP1PP1/4R1K1 w - - 0 1",
"r6r/1p2kp2/3p1b2/pPpPpQ1P/1nP1P2P/6R1/1P2K3/1B6 w - - 0 1",
"2r1r1k1/pp3pp1/3p3B/P2P1P2/2nb4/7R/1q3PQP/1B3R1K w - - 0 1",
"r2qr1n1/p4pk1/1p1p2p1/4p3/4PQ2/1PN2P2/1PP3P1/2KR3R w - - 0 1",
"r4rk1/ppp3b1/3p1qp1/3Pp3/2P1Bn2/4BP2/PP1Q4/2K3RR w - - 0 1",
"1k1r2r1/pp3p1p/B2q1n2/8/3Pb1p1/2Q5/PR3PPP/2B1R1K1 w - - 0 1",
"k3r3/pR5p/PppR1p1p/4nP2/1PP5/8/4B1rP/2K5 w - - 0 1",
"r4n1r/ppq1nk2/1bpRpN2/4PpQ1/8/2B4P/PPP2PP1/2KR4 w - - 0 1",
"1rq1r2k/5Rbp/p2p1p1B/2p1p3/2P1P2Q/1P6/P5PP/3b3K w - - 0 1",
"5Q2/5p1p/3p2p1/4p1k1/4P1P1/3R1P1K/r6P/4q3 w - - 0 1",
"2b2r1k/ppq3pp/3b3r/n3NpN1/Q2PpP1B/2P1R3/PP5P/4R1K1 w - - 0 1",
"2r1r1k1/1R4bp/p5p1/2pqn3/8/2B5/1PQ1B1PP/5RK1 w - - 0 1",
"7k/pp1q2pp/3Nr1n1/3B2Q1/2pP4/B3P1Pb/P6P/6K1 w - - 0 1",
"5Bk1/pr2pp1p/2b3pQ/2p1q3/8/2P4P/PP4P1/1B1Rb1K1 w - - 0 1",
"5nk1/2b1q1p1/2p5/3pP1pQ/1r1P2P1/3B1R2/5PP1/6K1 w - - 0 1",
"rnb1kr2/p4pQ1/8/1ppPpP2/2p1P3/N6P/Pq4B1/3R1RK1 w q - 0 1",
"5r1k/2p3pp/3pQ3/3P1rN1/pp5q/5PR1/P4PKP/B7 w - - 0 1",
"r1b1Rnk1/6pp/p4q2/1pp2P2/3r4/2NB4/PP1Q2PP/4R1K1 w - - 0 1",
"rq3r1k/p2n1p2/1pbb1np1/2p2BB1/8/2N2N2/PP3QPP/3R1RK1 w - - 0 1",
"8/2p2Q1p/1rp5/p3q1kp/P7/2P2RP1/5PK1/8 w - - 0 1",
"6k1/3b1p1p/6p1/2BPR3/8/4Q2P/1q3rPK/8 w - - 0 1",
"2R5/4ppkp/6p1/p2P4/4P2P/p3B1P1/qbR2PK1/8 w - - 0 1",
"6k1/p4pq1/2n1p1p1/1p1pP1N1/3P1QPP/8/P3K3/8 w - - 0 1",
"3r1rk1/1pq1nppp/p7/2pB3Q/P4P2/1P2P3/6PP/2RR2K1 w - - 0 1",
"8/p1r2q1k/1p1p3p/1Pp1nP2/P1P5/3R2PP/1Q4BK/8 w - - 0 1",
"6rr/1b3k1p/pbqppPn1/1p5Q/4PN2/P6R/1PP3BP/2B2R1K w - - 0 1",
"6rr/ppqb1pkp/2pb1pn1/3p3Q/3P1P1N/3B1RN1/PPP3PP/5RK1 w - - 0 1",
"r2qr1k1/1pnb1pp1/p1n1p2p/8/P2P3P/B2B1NP1/6P1/R2Q1RK1 w - - 0 1",
"r2q1rk1/1b1nbpp1/p1p1p2p/1pPpN3/3P1N2/P2BP3/1PQ2PPP/R4RK1 w - - 0 1",
"2r1rbk1/5pp1/bq5p/1pnBPN2/6Q1/N7/5PPP/R2R2K1 w - - 0 1",
"1k1r1r2/2b2R2/Bppp2p1/2q4p/Q2pP3/P2P4/2P3PP/1R4K1 w - - 0 1",
"r5k1/pp2ppb1/4qn2/r3B1p1/3P4/3QNP1R/PP2K1P1/7R w - - 0 1",
"1R2br1k/5r1p/p2p1P2/6RQ/3p1P2/4p2B/q6P/5N1K w - - 0 1",
"5r1r/1pkb4/5pB1/2P5/p3R2P/Pq6/1PQ2Pn1/K2R4 w - - 0 1",
"kn5r/p2r2p1/1pqBp1np/1Q1pPp2/R2P4/1N6/2P2PPP/R5K1 w - - 0 1",
"4Rnk1/2p2pp1/3r3p/p2P4/P5Q1/1B5P/5PK1/q7 w - - 0 1",
"4r3/2k1p2q/pp1nR1p1/2pP1pP1/2P2P2/1P6/P1K3B1/4Q3 w - - 0 1",
"r1b1rbk1/7p/2p1pBp1/p2pP1P1/5P2/1PqB4/P1P1Q3/1K4RR w - - 0 1",
"2rq4/5rbk/3p1n1p/p2Pp2P/1p2b3/4BNR1/PP1Q1P2/3BK1R1 w - - 0 1",
"r2q1rkb/pp2p3/2p2pp1/3pPb2/3P3R/2N3P1/PPPQBPK1/3R4 w - - 0 1",
"3r2k1/p4rPp/1b1q3Q/n1p1pP2/1p6/3B1NR1/P4P1P/6RK w - - 0 1",
"r1bqrnk1/p4p2/1p5p/3pB1p1/P2P2n1/1P1B2N1/2Q3PP/R4RK1 w - - 0 1",
"r2rn1k1/1bqn1ppp/p7/2bpP1P1/1p1N1Q2/1P3B2/PBP1NR1P/3R2K1 w - - 0 1",
"r2r2k1/1bqpbpp1/ppn1p2p/2p1P1N1/P1B2B2/2P5/1PPRQPPP/3R2K1 w - - 0 1",
"r1b1r1k1/1p1n1p2/p1nBp1p1/q2pP1Np/P7/R2B3Q/2P2PPP/5RK1 w - - 0 1",
"r1b1k2r/ppp3pp/1qp5/2b1Pp2/3Qn3/5N2/PPPBNPPP/2KR3R w kq - 0 1",
"1k6/1p4p1/P1p5/5Q2/2q2r2/P7/8/4R2K w - - 0 1",
"4n1q1/1k1b4/2p4R/2Pp4/1p1N1rpQ/3B4/PPP2P2/2K5 w - - 0 1",
"2kr2r1/R2p3p/2n2p2/1R3P2/2P1p3/4BQ2/1Pq4P/4K3 w - - 0 1",
"r1br4/ppq2pk1/3bpN2/8/2P5/3n2B1/PP2QPPP/R4K1R w - - 0 1",
"rn4k1/pp2p1b1/4b3/q2p2Q1/2B2P2/8/P1P1K1P1/R6R w - - 0 1",
"r1b2rk1/1pqp1ppp/p1n1pn2/5N2/8/2PBB3/P1P2PPP/R2QR1K1 w - - 0 1",
"4k2r/1bqnbppp/p3p3/1p2P1N1/2r2BB1/8/PPP3PP/R2Q1R1K w k - 0 1",
"r4r2/pp2qk2/4pnp1/3pQ3/2p2P2/3B4/PPP2P2/2KR3R w - - 0 1",
"3bq3/p1n2rk1/1pp1p1p1/3pPnPp/1P1P1N1P/2PN3K/P2BQR2/8 w - - 0 1",
"b6r/2q2k2/4pPp1/1p1n2Bp/2pPB1PP/2P2Q2/8/4R1K1 w - - 0 1",
"r1b2r2/3pNpkp/3pn1p1/2pN3P/2PnP3/q3QP2/4BKP1/1R5R w - - 0 1",
"4k3/p4ppp/nb1P4/4p3/1P6/P4BP1/3q1r1P/2R2QKR w - - 0 1",
"r2q1rk1/pp2pp2/3pb3/3Qb2R/4P1p1/1BN1Bn2/PPP2P2/2K4R w - - 0 1",
"2r1r1k1/pp1nbpp1/4pn1p/q3NN1P/P1pP1B2/2P5/1PQ2PP1/R3R1K1 w - - 0 1",
"r2qnr2/pp3kbQ/2npb1p1/2pN1pP1/4P3/8/PPP1BP2/R1B1K1NR w KQ - 0 1",
"r2k3r/2pb1ppp/p1p1q3/2Q5/5B2/2N5/PPP2PPP/3R2K1 w - - 0 1",
"2r1qrk1/pp1b1ppp/4pn2/n1b5/8/2NQ1NP1/PP1BPPBP/R2R2K1 w - - 0 1",
"2b1qr1k/7p/p1pR2p1/1pP1p1Q1/4P3/1B6/PP4PP/6K1 w - - 0 1",
"8/2b2k1p/2N2pp1/P2p4/3KnP2/6BP/P5P1/8 w - - 0 1",
"4b1r1/1p3ppk/3r3p/p1p1qP1B/3pPN2/3P3R/nPPQ3P/6RK w - - 0 1",
"4b2k/7p/3q3P/1p1pRpr1/1P1B4/2P2Q2/7K/8 w - - 0 1",
"2kr2r1/pbp4p/1p4p1/1NqpNp2/4nQ2/8/PPPR1PPP/2K1R3 w - - 0 1",
"r1br4/1p3k2/p2q1p2/3N1Pp1/3Q4/8/PP4P1/4RR1K w - - 0 1",
"r3kbnr/p4ppp/2p1p3/8/Q1B3b1/2N1B3/PP3PqP/R3K2R w KQkq - 0 1",
"3r1rk1/2p1qp1p/pnP3p1/4n3/PP1NpR2/1BQ4P/6P1/5RK1 w - - 0 1",
"r1bq1k2/5pb1/p2p1n2/2pPrP2/2p4B/3B2R1/PP1Q2PP/R5K1 w - - 0 1",
"r3rk2/p2q1b1p/1pnP1Qp1/5pN1/2p2P2/P1P5/7P/4RRK1 w - - 0 1",
"r2qrbk1/1p4pb/2n2p1p/pNpn4/2N5/PP1PPQPB/1B5P/2R2RK1 w - - 0 1",
"5r1k/1p1b1p1p/p2ppb2/5P1B/1q6/1Pr3R1/2PQ2PP/5R1K w - - 0 1",
"r1b2rk1/p3bppp/2q5/8/2p1NR2/PnB1P3/1PB1Q1PP/3R2K1 w - - 0 1",
"r1rbb3/1R3pkp/2pBp1p1/p3P3/q6P/6P1/P2Q1P2/1R3BK1 w - - 0 1",
"1rb2rk1/p1p2ppp/2q5/3R4/2P1N3/bP4B1/P1Q2P1P/1K5R w - - 0 1",
"rnb2rk1/pp2bppp/2p5/q7/4NN2/4B1QP/PPP3P1/2KR3R w - - 0 1",
"2R5/2R4p/5p1k/6n1/8/1P2QPPq/r7/6K1 w - - 0 1",
"r1b1r1kb/p1qn1pnp/2p1p1p1/4P1N1/2p1NPP1/4B3/PPPQ3P/3RK2R w K - 0 1",
"5k1r/ppqnnp2/3b2p1/2pB2Qp/3p3N/1P1P2P1/P1P2P2/2B1R1K1 w - - 0 1",
"5rk1/5p1p/8/3pNp2/RPrqn3/1Q5P/1P3PP1/4R1K1 w - - 0 1",
"2rr2k1/4qppp/bn6/p1bB4/4N3/6P1/PB2PP1P/2RQ1RK1 w - - 0 1",
"3r1rk1/pbqn1pp1/1pp2n1p/2b1p1B1/P1B1P2N/2N4P/1PP1QPP1/3R1RK1 w - - 0 1",
"5rk1/r2nqpp1/p3p3/1p2P3/4N1pP/8/PPP3Q1/1K1R3R w - - 0 1",
"1rr3k1/4ppb1/2q1bnp1/1p2B1Q1/6P1/2p2P2/2P1B2R/2K4R w - - 0 1",
"2r2r1k/1pq1b1p1/p1b1Qn1p/8/3B4/2NB4/PPP3PP/3R1R1K w - - 0 1",
"3rqb2/1pR3pk/p3n1pp/3p4/3B4/PP6/1P4PP/4RQK1 w - - 0 1",
"rkb2qr1/1p5p/pQ1bp3/3p2B1/5n2/3B1N2/PP3PPP/2R2RK1 w - - 0 1",
"2r2rk1/1bq2ppp/p7/1p1pNN2/1b1PnB2/3Q3P/PP3PP1/R3R1K1 w - - 0 1",
"r3r1k1/1p3pPp/p1p5/3bb2N/7q/1P1Q4/2PB2PP/4RRK1 w - - 0 1",
"r1b1r1k1/pp3p1p/1q2p1pQ/2b1P1B1/8/P2B3P/1P3PP1/2R1R1K1 w - - 0 1",
"r1k2n1r/2pb4/1p1p1qpp/p2P1p2/3N1P1P/2Q3P1/PPP1R3/2K1RB2 w - - 0 1",
"r1b2r1R/1p2bpk1/4p1p1/4P1N1/p2p4/5Q2/qPP2PP1/1NKR4 w - - 0 1",
"rnb2rk1/3n1ppp/p3p3/1p2P1q1/3N4/1BN5/PPP3PP/R2Q1RK1 w - - 0 1",
"4q1r1/5kpp/2p1nb2/2PpQp2/r4P2/1N3P2/1BP1R2P/6RK w - - 0 1",
"2r1k2r/1pq1bppp/p3bn2/4N3/2pPN3/2P5/P3QPPP/R1B1R1K1 w k - 0 1",
"1r3k1r/4Rn1p/pb1p1P2/1p1q2P1/5p2/7Q/PPP1B1RP/2K5 w - - 0 1",
"2b1r2k/2Q4p/4q3/1pp5/3b4/4NP2/1P3BP1/3R2K1 w - - 0 1",
"r3r1k1/pp3ppp/1qp5/2bbNQ2/5B2/2P5/PP3PPP/3RR1K1 w - - 0 1",
"r2qn1k1/1p1b3p/2pp1b2/6pQ/p1P1P3/P1N3PB/1P6/3R1R1K w - - 0 1",
"2rq3r/5p2/p3pkbQ/3p4/3N4/2P4R/P4PP1/4R1K1 w - - 0 1",
"r4k1r/pp2pp2/3p1b2/q2PnQpp/3N4/1BP3P1/PP3PP1/3RR1K1 w - - 0 1",
"r1b3rk/pp1n3p/2p2b1n/4pp1q/2P5/1P3NPP/PBQ1NPB1/3RR1K1 w - - 0 1",
"r3r1k1/4pp1p/b5pB/q1pP4/3b4/2N4P/PP4P1/R2RQ2K w - - 0 1",
"2r3k1/p1r1ppb1/2bp1np1/q5N1/1p1BP2Q/3P4/PP2N1PP/2R2R1K w - - 0 1",
"rn1kr3/pppb4/3p1q2/3P1pNn/2P2P1p/1P2Q2P/P2NR1B1/4R1K1 w - - 0 1",
"r3k3/1pqb1p2/p3p3/4n2r/3N1Q2/2P5/PP4B1/4RRK1 w q - 0 1",
"2rbr2k/1pq2ppp/p3bn2/4p1B1/P3P3/2N3Q1/1PP1B1PP/3R1R1K w - - 0 1",
"r4rk1/5p2/p1b1pQpq/8/1B2P3/2NR4/PPP3PP/1K6 w - - 0 1",
"3nr1k1/p6p/2n1pRpB/3pP3/2pP2P1/q1P4P/6BK/5Q2 w - - 0 1",
"1r2r1k1/1pqb2pp/p2bp1n1/2p3BQ/3pN3/1P1P2P1/P1P3BP/4RRK1 w - - 0 1",
"1k2rb1r/pbp1q1pp/2pp4/2PnpP2/Q7/1P3NP1/PB5P/2KR1B1R w - - 0 1",
"5r1k/5Bb1/3p2Pp/p1pP4/1p2Q3/4P1P1/q7/3K3R w - - 0 1",
"r2q1r2/p1pbppbk/1p3npp/n2P2B1/7Q/2NB1N2/PPP3PP/4RRK1 w - - 0 1",
"5n2/3bp1r1/1r1p3k/p1p2pNp/1nP2P1P/1PN1PB1K/P5R1/6R1 w - - 0 1",
"r3bb2/P1q3k1/Q2p3p/2pPp1pP/2B1P3/2B5/6P1/R5K1 w - - 0 1",
"r1b1qbk1/7p/4p1p1/1p2Bp2/p1B2Q2/P3P3/1P3PPP/3R2K1 w - - 0 1",
"2r1k2r/3b1pb1/p2ppp2/2q2P2/2p1P2p/P1N2N2/1PP1Q1PP/3R1R1K w k - 0 1",
"3r1rk1/1pq1bppp/p7/n2RN3/P7/1P6/1B2QPPP/R5K1 w - - 0 1",
"q1r3k1/2r4p/2p3pP/2Qp1p2/PRn5/4P1P1/5PB1/1R4K1 w - - 0 1",
"r3bknr/1p4pp/p3Q3/q4pb1/P1Bn4/8/1PP2PPP/R1B1R1K1 w - - 0 1",
"r1b1nrk1/p2n3p/2pp4/8/2P2q1N/1PB4P/P4PB1/R2QR1K1 w - - 0 1",
"r2r2k1/1bq2pb1/6pp/2P1p3/1nBpN2N/6PP/2Q2P2/3RR1K1 w - - 0 1",
"r3rbk1/p1q2pp1/1n5p/2pp4/4N3/1PQ3P1/PB2PP1P/3R1RK1 w - - 0 1",
"2k2r1r/1pp1nqbp/p2p1p2/5P2/2PBN3/1P3Q2/1P4PP/R4RK1 w - - 0 1",
"r5kr/p3PR1p/1p1p2pq/4n3/8/3B4/P4QPP/4R1K1 w - - 0 1",
"2bq1b2/1p3k2/1r1p1p1p/pNpP1PpP/P1P3P1/6B1/1P5Q/2K1R3 w - - 0 1",
"2br1rk1/2qnQ2p/p4pp1/4p3/P1p1P1N1/2Pn1N1P/2B2PP1/1R1R1K2 w - - 0 1",
"2r2nk1/6pp/p1rPqp2/1pP1p3/1P6/2B3R1/1P2Q1PP/5RK1 w - - 0 1",
"r2rnbk1/pp3ppp/1q4n1/3p1N2/5P2/1PQB4/PBP3PP/4RR1K w - - 0 1",
"r3nrk1/p1pb1qpp/3p1p2/2pP1N2/2P1PR2/P1PB4/4Q1PP/5RK1 w - - 0 1",
"r1b2rk1/pp2qp2/2nRp1p1/6Pn/1Pp5/P1N1P3/1BQ2PP1/2K2B1R w - - 0 1",
"1r1q1k2/R4pp1/5p1r/1p1p1n1p/3Pb2N/1BP5/2P1Q1PP/4R1K1 w - - 0 1",
"R2b2k1/2rq1n1p/3p2p1/1p1Ppp1n/1P6/1B1PQN1P/1B3PP1/6K1 w - - 0 1",
"r1b3kr/bp3ppp/p1nNp3/4P3/P1Q2P2/BBP5/5qPP/R2R3K w - - 0 1",
"6k1/5rb1/6pp/1p2p3/2b5/4B1P1/r4PBP/1RR3K1 w - - 0 1",
"4r1k1/1p5p/5ppP/1qnP4/r4R2/P6P/1B1Q2K1/5R2 w - - 0 1",
"r2q1rnk/1p1bb1pp/p2p4/3NP1P1/P2Bp3/3Q3R/1PP1B2P/6RK w - - 0 1",
"r4rk1/1b4bp/p1npq1P1/R3p3/8/1N2BP2/1PPQ2P1/4KB1R w K - 0 1",
"r2q1rk1/p5pp/bn1p1p2/2pP4/1bP1NP2/3B1R2/PBQ3PP/R5K1 w - - 0 1",
"1r1q2k1/7p/2p3p1/1P1n1b1r/2BQ4/4B3/P6P/1R3RK1 w - - 0 1",
"r3kbnr/1ppb3p/p1q1pp2/3p4/3P4/2N2N2/PPP2PPP/R1BQ1RK1 w kq - 0 1",
"r1b1qbk1/pp3r1p/2pR1np1/5p2/2P1pP2/1PN1Q1PP/PB2P1B1/5RK1 w - - 0 1",
"3rr1k1/1p1qb2p/pP4p1/2p2p2/4RQ2/3P4/1PPB2PP/4R1K1 w - - 0 1",
"6k1/rnqb3p/5ppQ/2pPp3/p1N1P3/2PB3P/5PP1/1R4K1 w - - 0 1",
"7r/pp4k1/3pn1p1/q1pB1b2/2P5/5NR1/1P3PP1/2Q3K1 w - - 0 1",
"8/2R4p/2R3bk/8/5N1P/1p3PP1/2pqP1K1/8 w - - 0 1",
"6k1/3Q1pp1/4p2p/p2pP3/1p1P2P1/nP1R1N2/q1r2PKP/8 w - - 0 1",
"6k1/5pp1/p5r1/3Np2q/4P2p/1r3P1Q/n4P1P/3R2RK w - - 0 1",
"nr2rb2/3q1kpp/3p4/pnpPpNBP/2N1P3/3Q4/PP3P2/2K3RR w - - 0 1",
"1n2n1r1/r3qppk/p2p3p/3PpP1P/1P2P3/3B2RQ/3B1P1K/6R1 w - - 0 1",
"r2b4/pb2q1k1/np1p2r1/1N1Pp2Q/PPN1Pp2/8/2R2BPp/2R4K w - - 0 1",
"r7/2qnb1kp/p2p1nP1/1p1Pp1p1/6N1/3BB2Q/PPP4P/5RK1 w - - 0 1",
"n1rqk3/1p2p3/1n1pP1p1/pP1P1p1r/3B3P/1BN3p1/3Q4/R3K2R w KQ - 0 1",
"rn2kr2/pp1b1pQp/3Pp3/qB1n4/3N4/P7/1PP2PPP/2KR3R w q - 0 1",
"3r1r2/1b4bk/p1n3pp/1p2p3/4P3/q1P1QNB1/B4RPP/5RK1 w - - 0 1",
"r1r3kb/1pqbpp2/p2p1npB/n7/3NP3/1BN2P2/PPPQ2P1/2KR3R w - - 0 1",
"4qn1k/1b3rpp/pb2pB2/1pp1P2P/3p1NQ1/P2P2PB/1PP4K/5R2 w - - 0 1",
"2b5/2qrrpk1/5Rp1/2p4p/1pB1PR1P/1P1P2P1/5Q1K/8 w - - 0 1",
"7r/2p1q1k1/1p3r1p/p1pPpPp1/2P1P1P1/PP6/3Q2KR/7R w - - 0 1",
"rnb2k2/ppbp2p1/2p2pB1/8/1PN5/2P5/P4PPP/R1B3K1 w - - 0 1",
"2k5/1p1b4/2n1p1r1/7q/4RP2/3BQN2/2P2K1P/8 w - - 0 1",
"4r1k1/1p2rq1p/2bQpp2/p1Pp4/3P4/P3RN2/5PPP/4R1K1 w - - 0 1",
"b2b1r1k/3R1ppp/4qP2/4p1PQ/4P3/5B2/4N1KP/8 w - - 0 1",
"1k4q1/1p2Rprp/p1p5/2Pp4/1P1Q3P/6P1/P5K1/8 w - - 0 1",
"r2r3k/ppq3pp/2p1n3/4NQ2/3P4/1B6/PP3PPP/6K1 w - - 0 1",
"r4r1k/p2bN2p/1p1p1p2/2q4P/3Q4/1P6/1PP3P1/1K2R2R w - - 0 1",
"6nk/p4rrp/1p1p1p2/1q1Pp2R/4B1P1/1PP2Q1R/P6P/7K w - - 0 1",
"r1b1k2r/6pp/p1p1p3/3np1B1/1b2N3/8/q1PQB1PP/3RK2R w Kkq - 0 1",
"3qrbk1/1r3p2/p1bp1Pp1/1p2p1Pp/4P2R/1P2BB1Q/P1P4P/R6K w - - 0 1",
"2r3k1/4qpp1/2p1r3/pbQpN1Pp/3P1P1P/4P3/PP6/1KR3R1 w - - 0 1",
"4r2k/p2Q3p/2p1r1p1/4NpR1/3P4/2P1PP1b/P4q1P/6RK w - - 0 1",
"4r1kb/p2r4/1np1p1p1/3nP1Bp/1p3P1R/1B2qP2/PPPN3Q/2K4R w - - 0 1",
"2rq2k1/pp1bpp1p/3p1np1/8/3NPPnQ/1BP5/P1P3P1/1K1R3R w - - 0 1",
"r1b3k1/3nqp1p/p1n1p1pP/3pP1N1/Pp3QN1/1Pr3P1/2PR1P2/4RBK1 w - - 0 1",
"2r1kr2/p1qbbp1Q/3pp3/5p2/1p1N1PB1/6P1/PPP4P/K2RR3 w - - 0 1",
"r6k/ppr1qpp1/4n2p/3pP3/3P2R1/3BQ2P/P5PK/5R2 w - - 0 1",
"2rr2k1/5pn1/1b2q1pp/pP1pP3/2pP1PP1/2R1B2P/2Q3B1/3R3K w - - 0 1",
"2Q2bkr/5p2/1rb5/1pN1n1qB/1P1pPN2/6P1/5P2/R1R3K1 w - - 0 1",
"2r4r/3bk1b1/1q2pp2/3pPp1p/1p1N1P1P/1P1R1BP1/P2Q4/1K1R4 w - - 0 1",
"1rb3k1/2r2pbp/p2q1npn/P1pPp1N1/2B1P3/2P1B1NP/5QP1/3R1RK1 w - - 0 1",
"2r2r1k/1p3p1p/p2p1Pp1/3Pp3/1q2Bn1Q/8/1PP3PP/4RR1K w - - 0 1",
"r4rk1/5ppp/p7/4PR2/P1qnp2Q/4B3/1P4PP/5RK1 w - - 0 1",
"1r3kr1/p3q1b1/3p2Q1/2p2p2/2P2N2/4Pn2/PB6/K2R3R w - - 0 1",
"1r2k2r/1bq2pp1/pn2p2p/1p2P1b1/3N4/2N3Q1/PPP3PP/1K1R1BR1 w k - 0 1",
"r1bqn1r1/p2k1pp1/1p5p/n1pPpN2/2P1P3/P1PBB2P/4Q1P1/R4RK1 w - - 0 1",
"2r2r2/p4p1k/1p2pBpn/2p5/6N1/8/P4P2/R3R1K1 w - - 0 1",
"r4rk1/p1p2pp1/bp1p1q1p/n1nPpN2/2P1P2P/2PB4/P2BQPP1/R3K2R w KQ - 0 1",
"3rn1k1/pp3ppp/6b1/2p1Q3/2P1P3/P4P2/1B1qBP1P/1R5K w - - 0 1",
"4r1k1/5ppp/p1q3b1/1ppNr3/2P1P3/1P4QP/P4PP1/4RRK1 w - - 0 1",
"6k1/5rp1/4Nb1p/2p5/4Q3/1r5P/q5P1/3R1R1K w - - 0 1",
"r4r2/1pnqb2k/3p1p1p/p1pPpPpP/2P1N1P1/4BP2/PP1Q4/R2R2K1 w - - 0 1",
"rnb3kr/ppp2ppp/1b6/3q4/3pN3/Q4N2/PPP2KPP/R1B1R3 w - - 0 1",
"6kr/1p1r1p1p/p2pnPpQ/3Np2R/2q1P3/5P2/PPP5/2KR4 w - - 0 1",
"3Rq1k1/1pp1Ppbp/r1b3p1/p7/P1N5/1P4P1/1B2PP1P/2R3K1 w - - 0 1",
"rq1r2k1/3nbp1p/p2p2p1/1p1Pp1P1/3B1P2/3B3Q/PPP4P/2KR2R1 w - - 0 1",
"r4rk1/1bq1bppp/8/p2pPR2/3B4/1NnP3Q/1P4PP/4R1K1 w - - 0 1",
"r4rk1/1nqb1pbn/6pB/pppPp2p/8/1PP2NNP/P1BQ2P1/R4RK1 w - - 0 1",
"r2qkr2/1p3pQp/2p1b3/1B1pN3/1p6/8/1P1K1PPP/2B1R3 w q - 0 1",
"r3rk2/pb2bpp1/1n5p/q1pP1B2/1p3B2/5N2/PPQ2PPP/R2R2K1 w - - 0 1",
"r1bqr2k/ppp2p1p/5b2/3Pn1p1/1PP1Bp2/8/PB2N1PP/R2Q1RK1 w - - 0 1",
"r3kb1r/npqbpp1p/p3n1p1/P3P3/6N1/3B1NB1/1PP3PP/R3QRK1 w kq - 0 1",
"2kr4/pp1r1pp1/4n1p1/4R3/2Pp1qP1/3P2QP/5PB1/1R4K1 w - - 0 1",
"3r1qk1/5p1p/4b1pP/1pRp4/1P1Q4/r5P1/5P2/4RBK1 w - - 0 1",
"r2qkn1r/pb2bp2/1pp1p3/5p1p/2BPN3/5NQ1/PPP2PPP/1K1RR3 w kq - 0 1",
"2rr1nk1/pp2q1b1/4p1p1/5p2/1nB5/2B1N1QP/PP4P1/4RRK1 w - - 0 1",
"3r3k/p4npp/1p2qpb1/4P3/5P2/P3N3/1B2QP1P/6RK w - - 0 1",
"4qrk1/pp1bbppp/4pn2/2r1Q1B1/7P/2N3R1/PPP2PP1/2KR1B2 w - - 0 1",
"r5n1/pppb1B2/2k1pb2/3p2B1/5P2/2N5/PPP3P1/2KR4 w - - 0 1",
"2b2q2/r2n2kp/1n1p1pp1/p1pP4/1pP1NPN1/1P1B4/P5PP/Q3R1K1 w - - 0 1",
"r3k2r/1bq1bp1p/p2p1np1/1p2p3/3NP3/P1N2QB1/1PP2PPP/3RR1K1 w kq - 0 1",
"r2q4/5p1P/2p1bR2/ppk1p1P1/3pB2Q/8/PPP5/6K1 w - - 0 1",
"r3kb1r/pp1b1pp1/4p3/2q3Qp/5B2/2PB4/P4PPP/R3R1K1 w kq - 0 1",
"r3r1k1/p6p/bp4p1/2bPN3/6n1/6P1/PB2RPB1/3R2K1 w - - 0 1",
"3r1k2/1q1r1pp1/3p2bp/p2N4/8/2P1RQ1P/P4PP1/4R1K1 w - - 0 1",
"3q3r/p2r1pkp/bp1N1np1/n2p4/5Q2/B1P5/P4PPP/R3R1K1 w - - 0 1",
"1kb3rr/1p2n2q/1Np2p2/1p6/1P1N1P1p/8/2P1RQPP/R6K w - - 0 1",
"r3r1k1/p3Rp1p/1qp1bQ2/8/1p1P4/3R4/PP3PPP/6K1 w - - 0 1",
"rn4k1/pp2rpb1/2pNb1pp/4p3/P3Pq2/2P2N1P/1PB1QPP1/R3R1K1 w - - 0 1",
"r4rn1/ppp1q3/2bp2kp/6P1/3QpP2/2N5/PPP1B3/2KR3R w - - 0 1",
"3qr2r/1p1bppk1/3p2p1/p1nP1PQp/3N3R/1P4PP/P1P3BK/4R3 w - - 0 1",
"2rq1rk1/1b1nbpp1/1p5p/p2pNB2/3p1N2/4P3/PPQ2PPP/2RR2K1 w - - 0 1",
"r3r2k/pb2q1p1/1p2Nn1p/2b5/2B5/2P2P2/PPQ3PP/4RR1K w - - 0 1",
"r1b2nk1/ppq2ppp/8/1BP1p1NQ/5p2/8/PP3PPP/3R2K1 w - - 0 1",
"5r1n/r2q1pkp/3p1npN/NppPp2P/1P2P3/2P1Q1P1/5P2/R3K2R w KQ - 0 1",
"r5rk/1pp1n1pp/p1n1b1q1/3p1p2/7R/2QB1N2/PB3PPP/4R1K1 w - - 0 1",
"8/4Ppk1/6p1/1p6/1Pb1Q3/6pq/8/6K1 w - - 0 1",
"3R4/4Qpk1/4p1p1/7p/7K/5rP1/5P2/2q5 w - - 0 1",
"8/5pk1/p6p/2R5/3q2p1/6P1/2Q3PK/4r3 w - - 0 1",
"8/4p3/8/3P3p/P2pK3/6P1/7b/3k4 w - - 0 1",
"6r1/5p1k/4p3/3pQp2/1p1P1P1q/1P3RR1/7r/5K2 w - - 0 1",
"r1b2rk1/ppp2ppp/2n3q1/b2N2N1/2BP4/4p2P/PPP3P1/R2Q1RK1 w - - 0 1",
"1r4k1/3qb2p/pr1pppn1/2p2N2/2P2PQ1/1P4P1/P2R2BP/R5K1 w - - 0 1",
"r6r/pR1nqkpp/2p1p3/3p4/6Q1/2b4P/P1PP1PP1/2B1R1K1 w - - 0 1",
"1k1r3r/ppq2pnp/1npbb1p1/3p4/3P1NP1/2NBP2P/PPQ2P1B/1KR4R w - - 0 1",
"r5r1/4q2k/p2p3p/5p2/4p3/P2QR3/1PP2PPP/4R1K1 w - - 0 1",
"r1b2rk1/4bnpp/2p5/pp2q3/4N3/PQ2B1P1/1PP3BP/4RRK1 w - - 0 1",
"2r2rk1/pp2bppp/3q1n2/3nNRB1/3P4/1B5Q/PP4PP/3R2K1 w - - 0 1",
"r1bq1rk1/1pp2ppn/1pnp3p/3N4/2B1PN2/3P4/PPP3PP/R2Q1RK1 w - - 0 1",
"r1b2rk1/pp3p1p/2pq2pn/2nNN3/2B1QP2/8/P1PP2PP/R1B1K2R w KQ - 0 1",
"1r2r1k1/1bn2pbp/pp1q1np1/2pPN1B1/P1B5/2N4P/1P1Q1PP1/R3R1K1 w - - 0 1",
"1rb2bk1/2n2qp1/p2p3p/R1pP1p2/2B5/1PBQ1N1P/2P2PP1/6K1 w - - 0 1",
"r1b3k1/2pq2pp/p4p2/1p1Nr3/2n2R2/1B6/PPQ2PPP/R5K1 w - - 0 1",
"2rq1rk1/3bbppp/p3pn2/1p1pN3/2nP1B2/P1NBP2Q/1P3PPP/2R2RK1 w - - 0 1",
"2br2k1/1p2qppp/r1n1p3/pQ1nN3/P2P4/2B3P1/1P3PBP/2RR2K1 w - - 0 1",
"5rk1/3q2bp/3pb2r/1p1n1p2/3p1P2/P2B1QN1/1P1B2PP/2R1R1K1 w - - 0 1",
"4r1k1/1ppQr1p1/1p1p1pP1/3P3p/7P/1P3q2/P1P5/1KRR4 w - - 0 1",
"2Rr2k1/7p/4pqp1/p4p2/1p1P1Q1P/8/PP3PP1/6K1 w - - 0 1",
"4r1kb/5p1p/6pB/3Np3/4n3/P3Q1PP/2q2P2/R5K1 w - - 0 1",
"2q1rk2/QR3ppp/1pPpb3/1P2p1b1/4P3/6P1/3N1PBP/6K1 w - - 0 1",
"n1bq3k/pp4bp/6p1/5pP1/3p1P2/1B1P4/PB3Q1P/4R1K1 w - - 0 1",
"r3r1k1/p2n4/3p1pp1/qnp3B1/1p2P1P1/1P3P2/PP2N2Q/1K1R1B2 w - - 0 1",
"2rq1kbR/4R1p1/3p3r/pp1P1Pp1/6P1/3B4/PPP1Q3/6K1 w - - 0 1",
"4k3/4Bp2/1p2nP1P/2p5/2K1b1B1/8/P7/8 w - - 0 1",
"1k1r3r/ppqb4/5Ppp/3p4/P2np3/3BR1Q1/2PB1PPP/R5K1 w - - 0 1",
"r2q1rk1/pb1nbpp1/1pp1pn1p/3pN3/2PPP3/2N1B1P1/PP3PBP/R2Q1RK1 w - - 0 1",
"2r2rk1/pp2pp1p/2np2p1/q4P2/2PBP1b1/2N5/PP1Q2PP/R4RK1 w - - 0 1",
"r2b1rnk/1p4qp/p1p1b1p1/2PpNp2/PP1PnP1Q/3BB2R/4N1PP/R6K w - - 0 1",
"4r1k1/r1q2p1p/p5pB/1pbBpN1n/1n2P3/5Q2/PP3PPP/R1R3K1 w - - 0 1",
"r1r3k1/ppnbb1pp/2ppp1q1/1P3p2/P1PPn3/2N2NP1/2Q1PPBP/1RB2RK1 w - - 0 1",
"r1b1k2r/2q1bppp/p3p3/1p1nP1B1/3Q4/2N5/PPP1B1PP/2KR3R w kq - 0 1",
"2rqk1nr/pp3ppp/2n1p3/2b5/3N4/2NQB1P1/PP2PPKP/R4R2 w k - 0 1",
"rnb2rk1/pp4pp/2pb1n2/3N1p1q/2P5/3N2P1/P1Q1PPBP/R1B2RK1 w - - 0 1",
"8/5pp1/7p/5P1P/2p3P1/2k5/5P2/2K5 w - - 0 1",
"7k/8/1p1ppp1p/1Pp5/2P2P2/8/3P2PP/6K1 w - - 0 1",
"8/2k3p1/2p4p/5P2/2K3PP/8/8/8 w - - 0 1",
"r1b5/p2k1r1p/3P2pP/1ppR4/2P2p2/2P5/P1B4P/4R1K1 w - - 0 1",
"6r1/1p3k2/pPp4R/K1P1p1p1/1P2Pp1p/5P1P/6P1/8 w - - 0 1",
"1k2b3/4bpp1/p2pp1P1/1p3P2/2q1P3/4B3/PPPQN2r/1K1R4 w - - 0 1",
"1r3qk1/pb3p1p/1pn2PpQ/2pN4/3r4/5B2/PPP4P/4RRK1 w - - 0 1",
"6k1/2q3p1/1n2Pp1p/pBp2P2/Pp2P3/1P1Q1KP1/8/8 w - - 0 1",
"5r2/pp1RRrk1/4Qq1p/1PP3p1/8/4B3/1b3P1P/6K1 w - - 0 1",
"6k1/1q2rpp1/p6p/P7/1PB1n3/5Q2/6PP/5R1K w - - 0 1",
"r5r1/8/bRP1pk1p/3pNp2/5P2/7P/PR4P1/6K1 w - - 0 1",
"3r2k1/p6p/b2r2p1/2qPQp2/2P2P2/8/6BP/R4R1K w - - 0 1",
"7k/4b2p/5p1P/5PP1/1pNp1P2/1P1B4/2P2K2/r7 w - - 0 1",
"3q1k2/5p2/p5pN/1b2Q2P/8/8/5PPK/8 w - - 0 1",
"4r2k/3n1Qpp/1pRP1p2/p4P2/1p1P2P1/6rP/P3q1B1/6RK w - - 0 1",
"2r2rk1/p1N2p1p/2P1p1p1/1Pp3q1/3b4/5Q2/P1P3PP/4RR1K w - - 0 1",
"3r1r2/pp1P3k/4Rbp1/1BP2p1p/8/7P/P4KP1/3R4 w - - 0 1",
"3rr1k1/pppRn1pp/4Pp2/1P5q/1QB5/4P3/P4P1P/4K1R1 w - - 0 1",
"rn1q2k1/pp3pb1/3p2pp/2pP2N1/3r1P2/7Q/PP4PP/R1B2RK1 w - - 0 1",
"5bk1/r4ppp/1r1P1n2/2p2N2/b7/2B3P1/5PBP/R3R1K1 w - - 0 1",
"8/8/8/P2k1p2/2N5/1pb2P2/4P3/2K5 w - - 0 1",
"3qr1k1/p4ppp/1p1P4/2r1nN2/4P2n/P7/1B4P1/3QRRK1 w - - 0 1",
"2r1rbk1/p1Bq1ppp/Ppn1b3/1Npp4/B7/3P2Q1/1PP2PPP/R4RK1 w - - 0 1",
"r4rk1/ppq3pp/2p1Pn2/4p1Q1/8/2N5/PP4PP/2KR1R2 w - - 0 1",
"8/6kP/6p1/1p1pP3/pP6/P1n2K2/2N5/8 w - - 0 1",
"6k1/p4pp1/Pp2r3/1QPq3p/8/6P1/2P2P1P/1R4K1 w - - 0 1",
"6k1/p4pbp/Bp2p1p1/n2P4/q3P3/B1rQP3/P5PP/5RK1 w - - 0 1",
"5r2/R4p2/5P1k/4PK2/1p6/8/8/8 w - - 0 1",
"4r2k/pppb2pp/2np2q1/3B4/2P2P2/1PB1R1P1/PQ5P/6K1 w - - 0 1",
"1r6/3r1Pk1/p2p1np1/5q2/1p3P2/1B5R/PPP4Q/1K1R4 w - - 0 1",
"4r2k/p2qr1pp/1pp2p2/2p1nP1N/4R3/1P1P2RP/1PP2QP1/7K w - - 0 1",
"6k1/p4p2/5Ppp/3RP3/Pr4P1/2p2K2/7P/8 w - - 0 1",
"8/1R2P3/6k1/3B4/2P2P2/1p2r3/1Kb4p/8 w - - 0 1",
"r1b2rk1/1p2qppp/p3p3/2n5/3N4/3B1R2/PPP1Q1PP/R5K1 w - - 0 1",
"3r1rk1/pp1q1ppp/3pn3/2pN4/5PP1/P5PQ/1PP1B3/1K1R4 w - - 0 1",
"r2qrbk1/5ppp/pn1p4/np2P1P1/3p4/5N2/PPB2PP1/R1BQR1K1 w - - 0 1",
"6rk/3nrpbp/p1bq1npB/1p2p1N1/4P1PQ/P2B3R/1PP1N2P/5R1K w - - 0 1",
"1rb2rk1/3nqppp/p1n1p3/1p1pP3/5P2/2NBQN2/PPP3PP/2KR3R w - - 0 1",
"5rrk/1p3qpp/p3pn2/2PpBp2/3P1P1Q/P1P1R2R/2b1B1PP/6K1 w - - 0 1",
"r4rk1/1bq2ppp/p1p1p3/2b1P1B1/3p2Q1/3B4/PPP2PPP/R3R1K1 w - - 0 1",
"r4rk1/pb1q1ppp/2N1p3/2Rn4/3P4/3BPQ2/1P3PPP/2R3K1 w - - 0 1",
"r5rk/1p1q1p1p/5pn1/p2p1N1Q/3P2P1/PP2R3/5P1P/5RK1 w - - 0 1",
"2r2r2/p2qppkp/3p2p1/3P1P2/2n2R2/7R/P5PP/1B1Q2K1 w - - 0 1",
"1r1qr1k1/5p1p/1n2p1p1/pp1pP1P1/2pP1BB1/PnP3P1/1P3PK1/1R1Q3R w - - 0 1",
"4rrk1/2q1bppp/p2p4/1p1Pn3/3B1R2/P2B2Q1/1PP3PP/5R1K w - - 0 1",
"r1b2rk1/2q1bppp/p1n1p3/1p1np1P1/5P2/1NNBBQ2/PPP4P/R4RK1 w - - 0 1",
"5r1k/ppp2qnp/1n1p1N1Q/3Ppb2/2P4P/7B/PP6/2KR2R1 w - - 0 1",
"b3r1k1/2rN1ppp/2n1p3/p7/P3BP2/1R6/q1P2QPP/3R2K1 w - - 0 1",
"2r1qrk1/3n3p/b3pPp1/4P3/1pp1nBN1/pP4PQ/P1P2PK1/3RR3 w - - 0 1",
"r1b1rnk1/pp1nb1pp/2p1pp2/q3N3/2PP1P2/3BP1N1/PBQ3PP/R4RK1 w - - 0 1",
"4r1k1/2q2r1p/p3bQ2/1p4Bp/2np4/8/PPB2PP1/3RR1K1 w - - 0 1",
"5rk1/pbrn1ppp/1ppN1q2/2P1p3/3P4/1PRB4/P3QPPP/5RK1 w - - 0 1",
"2rqr1k1/1p1bbppp/p3p3/n7/3P2Q1/2PB1N2/P4PPP/R1B1R1K1 w - - 0 1",
"r1b2r1k/ppppq1pp/2n1n3/6N1/2B2P2/4B3/PPP3PP/R2Q1RK1 w - - 0 1",
"rn1q1rk1/pb1p1ppp/4p3/2pnP3/1bp5/2N2N2/PP3PPP/RBBQK2R w KQ - 0 1",
"r2r2k1/p1p2p1p/4pPp1/1Pqb4/8/7R/1PB2PPP/3QR1K1 w - - 0 1",
"r1b2rk1/1pq2ppp/p1p1p3/2n1P3/2N2P2/3B4/PPP3PP/R2Q1RK1 w - - 0 1",
"rnq3rk/4bp1p/p1p3pQ/1p1pP3/1P1N1B2/2P3R1/1P3PPP/R5K1 w - - 0 1",
"rn3rk1/pp1bppbp/1qp3p1/4P1N1/PP1PB3/2P1B3/4Q1PP/R4RK1 w - - 0 1",
"3rr1k1/1pq1nppp/p1p2b2/4pB2/2QPP3/P1P1B3/1P4PP/3R1RK1 w - - 0 1",
"1r2nrkb/2n2p1p/p2p1Pp1/P1pPp1P1/1pP1P1q1/1P1BB1N1/3Q4/2KR3R w - - 0 1",
"2rrn1k1/2q2ppp/p2pp3/1p2P1P1/4B3/P5Q1/1PP3PP/R4R1K w - - 0 1",
"2rq1rk1/pp1bnpbp/4p1p1/3pP1N1/3P2Q1/2PB4/P4PPP/R1B1R1K1 w - - 0 1",
"2rq1bk1/1br2p1p/p2p2p1/1p1P4/4Q3/PP3N2/1BP5/1K1R3R w - - 0 1",
"r2qn1k1/pb4Pp/1pn5/2p5/2P2p2/P1PB4/5PPP/R2Q1RK1 w - - 0 1",
"r4rk1/pp1n1ppp/3qp3/3nN1P1/b2P4/P2B1Q2/3B1P1P/1R2R1K1 w - - 0 1",
"r2r2k1/ppqbbppp/4pn2/6N1/n1P4P/3B1N2/PP2QPP1/1KBR3R w - - 0 1",
"r5k1/6bp/2q1p1p1/p2pP3/3P4/1rP2QP1/3B1PK1/2R4R w - - 0 1",
"4nrk1/r4p1p/p2p2pQ/2pPpNPP/qpn1P3/5P1R/PPP1N3/2K3R1 w - - 0 1",
"r2qrnk1/4bppp/b1p5/1p1p2P1/p2P1N1P/2NBP3/PPQ2P2/2K3RR w - - 0 1",
"rn1q1rk1/pppbb1pp/4p3/3pP1p1/3P3P/2NB4/PPP2PP1/R2QK2R w KQ - 0 1",
"1r2nr1k/6pp/pp1p1p2/2pPnN2/q1P1PB2/5PR1/4K1P1/2Q4R w - - 0 1",
"r2q1rk1/3n1ppp/8/1pbP2P1/p1N4P/PnBBPQ2/5P2/R3K2R w KQ - 0 1",
"r1b4r/3p1kp1/pp3q1p/4RP2/8/B7/P5PP/4QRK1 w - - 0 1",
"1r2rnk1/2R2bpp/p2q4/1p1N2R1/5P2/1Q1B3P/PP4P1/7K w - - 0 1",
"4rrk1/2qb2pp/p5P1/1p2p3/1b2P3/2N5/PPPQ4/1K1R2R1 w - - 0 1",
"3q1k2/pp3ppn/2p1n2p/4pN1N/P3P2P/5Q2/1PP2PP1/6K1 w - - 0 1",
"2r2r1k/3b1pb1/p3pp1p/q2p1P1B/8/2N2RR1/P1PQ2PP/7K w - - 0 1",
"5bk1/1p4p1/4N1R1/3p4/p1r2P1q/Pr1QP2P/1P6/1K4R1 w - - 0 1",
"2r1r1k1/5ppp/p3pn2/1pb1N3/2P5/1PQ3R1/PB2qPPP/3R2K1 w - - 0 1",
"r1q1bk1r/1p3pp1/4pn1p/p3Q3/P1P2N2/1B4R1/1P3PPP/4R1K1 w - - 0 1",
"r4rk1/p2n2p1/1q1Qpn1p/1P6/P6B/2p5/2B1KP1P/R5R1 w - - 0 1",
"r3r1k1/pp3pp1/3p4/2q4p/2P5/1PB2Q1P/n4PP1/3R1RK1 w - - 0 1",
"r5k1/pn1q1rpp/2pp4/5R1N/bP6/4BQ2/P4PPP/2R3K1 w - - 0 1",
"3r1rk1/5pp1/pq1n1n1p/2pPR3/2B2P2/1PBQ2RP/P5P1/6K1 w - - 0 1",
"rn3rk1/ppq2ppp/2pb1nb1/5N2/2BP4/8/PPP1N1P1/R1B1QR1K w - - 0 1",
"r1qb1r1k/2p3pp/p1n1bp2/1p1Np2Q/P3P3/1BP3R1/1P3PPP/R1B3K1 w - - 0 1",
"r4rk1/5ppp/p2pbb2/3B3Q/qp2p3/4B3/PPP2P1P/2KR2R1 w - - 0 1",
"r2r3k/5bp1/2p2N2/5P1p/3q3Q/3B2R1/n5PP/3R3K w - - 0 1",
"4rrk1/2pn2pb/p1p1qp2/1pb1pN2/P3P1PN/1P1P4/1BP2PK1/R2Q3R w - - 0 1",
"r3r1k1/p3bppp/q1b2n2/5Q2/1p1B4/1BNR4/PPP3PP/2K2R2 w - - 0 1",
"r4rk1/1p1q1ppp/p1b4B/8/2R3R1/P2P4/1b1N1QPP/6K1 w - - 0 1",
"rq3rk1/3b1ppp/p2bp3/3pB2Q/8/1B5P/PP3PP1/2RR2K1 w - - 0 1",
"2r3k1/1p2R1p1/p3n2p/2pq4/7P/1P1P2P1/PB1Q3K/8 w - - 0 1",
"2rr2k1/4bppp/p1n1p3/3q4/1p1P2N1/2P3R1/P3QPPP/2B2RK1 w - - 0 1",
"rq1r1bk1/1b3pp1/3pn2p/1n2BN1P/1P2P3/3R1NP1/3Q1PB1/2R3K1 w - - 0 1",
"r1b5/ppqn2bk/3R2pp/2p2p2/2P1rN2/4BN2/PPQ2PPP/4R1K1 w - - 0 1",
"3q1r2/1p1b1pk1/pn5p/3pN1pQ/3P3P/2r3B1/P4PP1/3RR1K1 w - - 0 1",
"r1bqkbnr/pp2ppp1/2p4p/3n2N1/2BP4/5N2/PPP2PPP/R1BQK2R w KQkq - 0 1",
"r2qr1k1/1ppb1p1p/p1np2p1/7Q/3PP2b/1B2N2P/PP3PP1/R1B2RK1 w - - 0 1",
"2r3k1/pbq1np1p/1p1b1Bp1/8/6QP/2P2N2/B4PP1/4R1K1 w - - 0 1",
"r3r1k1/1bqn1ppp/1pp2p2/8/3P4/1B4N1/PP3PPP/R2QR1K1 w - - 0 1",
"r2qr1k1/1b2bp1p/p3p1p1/1p2N1Bn/3P4/P6Q/1P3PPP/RB2R1K1 w - - 0 1",
"2rqnk1r/pp2bpp1/2p1pn1p/2P1N2P/3P1BP1/3BQ3/PP6/2K2R1R w - - 0 1",
"2rq1rk1/1b2bppp/p1n5/1p1BN3/5B2/P7/1P3PPP/R2Q1RK1 w - - 0 1",
"r2qr1k1/pb2bp1p/1pn1p1pB/8/2BP4/P1P2N2/4QPPP/3R1RK1 w - - 0 1",
"r3r1k1/1bq1nppp/p1np4/1ppBpN2/4P3/2PP1N2/PP3PPP/R2QR1K1 w - - 0 1",
"r5k1/p4ppp/3qpb2/1P2N3/1nBP4/1P5P/4QPP1/4R1K1 w - - 0 1",
"r2qr1k1/1b1nbp1p/p3pp2/1p2N3/3P4/3B1N2/PP2QPPP/R2R2K1 w - - 0 1",
"r3k2r/p1qb1p2/1p2p2p/3pPpN1/P1nP3Q/8/2P2PPP/R1B1R1K1 w kq - 0 1",
"2r1r1k1/1pq1bp1p/p3pnp1/P2n2N1/7R/2P4P/1PB1QPP1/2B1R1K1 w - - 0 1",
"r1bq2k1/pp1n1ppp/3b1n2/PQ1B3r/3N1P2/2N5/1PP3PP/R1B2RK1 w - - 0 1",
"2r1r1k1/5ppp/pq3b2/2pB1P2/2p2B2/5Q1P/Pn3PP1/2R1R1K1 w - - 0 1",
"r3kr2/1b2qp2/pp2p2N/4p2Q/8/2n5/P3B1PP/3R1R1K w q - 0 1",
"b2r1rk1/pq2bpp1/1p2p2p/4N2n/2P2R2/1PB2N2/1P2QPPP/4R1K1 w - - 0 1",
"rqb1k2r/1p1nbp1p/p4pp1/8/1PBN1P2/P1N1P3/7P/2RQ1RK1 w kq - 0 1",
"r2r2k1/4ppbp/5np1/p1q5/QnB1P3/5N2/1P3PPP/R1B2RK1 w - - 0 1",
"1r2q1k1/p3pp2/3p1bp1/2pP2N1/8/P5PB/2Q2PK1/1rBR4 w - - 0 1",
"2rqrbk1/pb1n1p1p/1p2pnp1/4N3/2BP1N2/1P2Q3/PB3PPP/3R1RK1 w - - 0 1",
"1r4k1/p4pp1/bqnrpn1p/2ppN3/2P2P1B/P3P3/1P2B1PP/1Q1R1RK1 w - - 0 1",
"r1bqrbk1/5p1p/2pp2nB/pp5Q/4P3/PBNPR2P/1P4P1/R5K1 w - - 0 1",
"r1bqkb1r/1p3ppp/pn1P1n2/4p3/2B5/2N2N2/PP3PPP/R1BQ1RK1 w kq - 0 1",
"2rqr1k1/pp2nppp/3p2b1/6B1/2BNn1Q1/P7/1PP2PPP/2KRR3 w - - 0 1",
"r3r1k1/pbq1ppbp/1pp2np1/4N3/3P4/2P5/PPB1QPPP/R1B1R1K1 w - - 0 1",
"r2rn3/1p3pk1/p1pNn1pp/q3P3/P7/1PN4P/2QR1PP1/3R2K1 w - - 0 1",
"r1bqr1k1/1p1nnpb1/p5pp/2P1p1B1/B3N3/5N2/P4PPP/2RQR1K1 w - - 0 1",
"rn2r1k1/pp3p1p/3P2p1/2p1bbB1/2B5/2N5/Pq4PP/R2Q1RK1 w - - 0 1",
"5rk1/r2qnppp/p1nN4/2Q5/3PB3/4P3/6PP/R4RK1 w - - 0 1",
"1bq2k2/1b1n1pp1/pp5p/2pBpN2/P3P2B/3Q1P2/1PP3PP/4K3 w - - 0 1",
"rnb2rk1/pp3pbp/2p3pB/2q5/4P3/1BN5/PPP3PP/R2Q1R1K w - - 0 1",
"3qr1k1/1br1bp1p/p3p1pB/1p1nN3/3PB3/7Q/PP3PPP/3RR1K1 w - - 0 1",
"1qr1b1k1/4bpp1/pn2p2p/1p1nN3/3P4/P2BBN1Q/1P3PPP/4R1K1 w - - 0 1",
"rr1q2k1/1p2bpp1/2p1p2p/P1Pn4/2NP4/3Q1RP1/5PKP/2B1R3 w - - 0 1",
"r2r2k1/pb1nbpp1/1qp1pn1p/1p2N3/3P1B2/P1N1P3/BPQ2PPP/2R2RK1 w - - 0 1",
"2r5/1p4bk/3p2rp/4pN2/1P2P1pR/2P2q2/QP6/1K5R w - - 0 1",
"r1b1r3/pp2Npbk/3pp2p/q5p1/2QNPP2/6P1/PPP3P1/2KR3R w - - 0 1",
"r1q3r1/1ppQ2pk/3bNp1p/p3pP2/P3P3/7R/1PP3PP/3R2K1 w - - 0 1",
"1rbqnr2/5p1k/p1np3p/1p1Np3/4P2P/1Q2B3/PPP1BP2/2KR3R w - - 0 1",
"r1br2k1/p1q2pp1/4p1np/2ppP2Q/2n5/2PB1N2/2P2PPP/R1B1R1K1 w - - 0 1",
"3r1r1k/p5p1/n1p2p1p/1qp2b2/N1R4R/1PB1P1P1/P2P3P/3Q2K1 w - - 0 1",
"r4rk1/2q1b1p1/p4p1p/n3pP2/1p2Q1N1/4B3/PPP3PP/4RR1K w - - 0 1",
"r2q1rk1/ppp2pp1/1b2b2p/3n3Q/2Bp4/3P1N2/PPP2PPP/R1B1R1K1 w - - 0 1",
"r3rbk1/1bp1qpp1/p6p/np2p2Q/4P2N/1BP4P/PP3PP1/R1B1R1K1 w - - 0 1",
"4q3/p2r1ppk/R6p/3n4/3B1Q2/4P2P/5PP1/6K1 w - - 0 1",
"2r1r1k1/pb1n1pp1/1p1qpn1p/4N1B1/2PP4/3B4/P2Q1PPP/3RR1K1 w - - 0 1",
"3q1rk1/p2bbpp1/1rn4p/1pp2P2/3pBBP1/3P3P/PPPQ3N/R4RK1 w - - 0 1",
"r2qr3/2p1b1pk/p5pp/1p2p3/nP2P1P1/1BP2RP1/P3QPK1/R1B5 w - - 0 1",
"r5r1/pbn4k/1p1p1Ppp/2pPn3/4BQq1/1PN3P1/PB3PK1/3R1R2 w - - 0 1",
"r1b2rk1/pp2bpp1/4p2p/2q4Q/5nNB/2PB4/PP3PPP/2KR3R w - - 0 1",
"r1b2rk1/1p3pp1/p5Pp/2bpPp1Q/3N4/1Pq1B1R1/2P4P/3R2K1 w - - 0 1",
"r2r2k1/pp1n1bp1/2p2p1p/b4N2/q2BR3/2QB2PP/1PP5/2KR4 w - - 0 1",
"3r2bk/1q4p1/p2P1N1p/2p1rP2/pb5R/7P/1P4P1/2Q2RK1 w - - 0 1",
"2b1rk2/r6p/1pP1p1p1/p2pNnR1/5Q2/P1B4q/1PP2P1P/1K4R1 w - - 0 1",
"r6r/ppnqpk2/3pbpp1/5N2/1PP1P3/5RR1/P2QB1PP/6K1 w - - 0 1",
"3r3r/p4pk1/5Rp1/3q4/1p1P2RQ/5N2/P1P4P/2b4K w - - 0 1",
"r1bq2k1/pp3r1p/2n1p1p1/3pP3/6Q1/2PB2P1/P4PK1/R1B4R w - - 0 1",
"3q1rk1/2r4p/n1p1n1pQ/p2pP3/Np1P2R1/5PN1/PP3KP1/2R5 w - - 0 1",
"2Nq1rk1/6pp/b1p2b2/p6Q/np1p4/6P1/PB3PBP/R3R1K1 w - - 0 1",
"r2r4/p4pk1/2p3p1/1p1nPR2/5p1Q/2N5/PPPq4/1K4R1 w - - 0 1",
"r5k1/1p2Rpb1/3p1np1/2nP2B1/1qP5/1pN1Q2P/P5P1/1B4K1 w - - 0 1",
"2rqr1k1/pb2bp1p/1pn1pnpB/4N3/3P4/P1N3R1/1P3PPP/RB1Q2K1 w - - 0 1",
"2r5/pp2qr1k/1nb3pp/2ppBp2/2P4P/3B2R1/P3QPP1/1R4K1 w - - 0 1",
"3rr3/3q1p1k/p2P2pp/1bp1b3/5N2/6QP/P1B3P1/3RR1K1 w - - 0 1",
"r2q1rk1/pp2ppb1/3pn1pQ/3R4/2P3B1/4BR2/PP4PP/6K1 w - - 0 1",
"1n1b1rk1/r4p1p/p1p2qpQ/P3Np2/2BP4/2P1R3/5PPP/R5K1 w - - 0 1",
"3rr1k1/pb2bp1p/3qp1pB/1p2N3/3P2Q1/2P1R3/P4PPP/4R1K1 w - - 0 1",
"r2q1rk1/pb1nbp1p/1p2p1p1/4N1BQ/2PP4/P7/5PPP/RB2R1K1 w - - 0 1",
"1Q4R1/r2qbp2/3p1kp1/3Bp2p/8/3PP1P1/5PKP/8 w - - 0 1",
"r3r1k1/b1p2pn1/p2q1Bp1/1p1bN1Qp/3P4/2P4P/PPB2PP1/R3R1K1 w - - 0 1",
"3r2k1/p1rn1p1p/1p2pp2/6q1/3PQNP1/5P2/P1P4R/R5K1 w - - 0 1",
"k2r3r/ppq2p1p/n1pb1Pp1/4p3/2Q5/1R2B1P1/PPP2PBP/R5K1 w - - 0 1",
"k7/pp1N4/4P3/5P2/8/5p2/1R6/B4Knq w - - 0 1",
"1q1r3k/3P1pp1/ppBR1n1p/4Q2P/P4P2/8/5PK1/8 w - - 0 1",
"r1bq1rk1/1p2bppp/p3p3/n3P3/4N3/1P1P1N2/PB4PP/R3QR1K w - - 0 1",
"1n2r3/p1pq1kp1/1b1pNpp1/3P4/5RP1/3Q3P/1B3P2/6K1 w - - 0 1",
"3r1b2/p4bkp/1p1P1p2/r3p1p1/2q1N3/2N2P2/1P1R2PP/2QR3K w - - 0 1",
"rqbn1rk1/1p3ppp/p3p3/8/4NP2/8/PPP1BQPP/1K1R3R w - - 0 1",
"r1b1kb1r/1p4pp/p2ppn2/8/2qNP3/2N1B3/PPP3PP/R2Q1RK1 w kq - 0 1",
"1rn5/p3Bk1p/1pq1bpp1/P3p3/1Q2P2P/2P3P1/5PB1/1R4K1 w - - 0 1",
"2nr2k1/1pq1bppp/p1p5/2p1P1PQ/2P1NP2/1PNR4/P6P/6K1 w - - 0 1",
"6nk/pn2qr1r/1pbp1p1p/2p1pPpN/P1P1P1PP/2PP3R/7Q/2BBK2R w K - 0 1",
"7r/4p1k1/p3Pppp/1p6/3N1R2/3PQ2P/qr4b1/5RK1 w - - 0 1",
"r3k2r/1bq1bp2/p3p1pp/1p2P3/3NpP2/4B1Q1/PPP3PP/1K1R3R w kq - 0 1",
"rnbqkb1r/pp1n1p2/4p1p1/1N1pP2p/1P4Q1/3B1N2/P1PB1PPP/R3K2R w KQkq - 0 1",
"r1b1kb1r/1p1n1ppp/p2ppn2/6BB/2qNP3/2N5/PPP2PPP/R2Q1RK1 w kq - 0 1",
"r1b1k1nr/3n1p1p/1qpBp1p1/pp2b3/4PN2/PBN2Q2/1PP2PPP/2KR3R w kq - 0 1",
"2r2rk1/1b3ppp/pq2p3/1pbn2N1/3B3P/1B4P1/P1P1QP2/2KRR3 w - - 0 1",
"r3k2r/pp1n1pb1/1qn1p1p1/2p3Pp/4R2P/2NP2QB/PPPB1P2/2K1R3 w kq - 0 1",
"r3k2r/1q3ppp/p3p3/2b1P3/p2N1Q2/P7/1PP3PP/3R1R1K w kq - 0 1",
"rnbqkb1r/1p1n1pp1/p3p2p/3pP3/3p1NQP/2N5/P1PB1PP1/R3KB1R w KQkq - 0 1",
"3r1b1R/3bkpp1/1p1np3/1BqpPPP1/PQ1N4/8/1PP5/1K6 w - - 0 1",
"1k1r3r/ppR2ppp/1q2b3/1N6/4Q3/8/PP3PPP/4R1K1 w - - 0 1",
"1k2bb1r/1p3p1p/p2qpP1p/3pN3/3P1Q2/2RB2P1/PP3P1P/6K1 w - - 0 1",
"6k1/5p2/R3p1p1/1pq1PpB1/4nP2/5Q1P/P2r2PK/8 w - - 0 1",
"1r4k1/1q3pb1/r1b3p1/pp1Qp3/P3P3/1B2BP2/1PP3P1/1K1R3R w - - 0 1",
"2R5/p3q1kp/6p1/3p4/b2P2p1/Pr4N1/5Q2/3K3R w - - 0 1",
"7R/1p1r4/2b2p2/2Pp1qk1/3P1bp1/3N4/2Q2PB1/6K1 w - - 0 1",
"r6r/1pn1b1k1/2p1pq2/2Pp3p/p2P1Pp1/P2BP1P1/1P2QB2/3R2KR w - - 0 1",
"1r3r2/6kp/3p1pp1/qnp1pP2/1p2P2N/3P4/PPPQ1P1P/1K1R2R1 w - - 0 1",
"2rq1rk1/5ppp/2b1pb2/np6/6N1/2NBB3/PP3PPP/R2Q2K1 w - - 0 1",
"5r2/p2p2kp/3PnNp1/1qr1Pp2/2p5/P1R5/6PP/2Q1R1K1 w - - 0 1",
"2Qbq1k1/6p1/1p4Np/4p2P/3rP3/8/3p2PK/3R4 w - - 0 1",
"2K5/6p1/kp2P3/1p6/1P6/2P1P2p/8/1r6 w - - 0 1",
"6k1/1R4pp/2p5/8/P1rNp3/6Pb/4PK2/8 w - - 0 1"];
