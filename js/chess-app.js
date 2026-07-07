(function () {
  "use strict";

  var game = new Chess();
  var boardEl = null;
  var mode = "computer"; // "computer" | "two-player"
  var humanColor = "w"; // "w" | "b"
  var difficulty = 2; // 1 easy, 2 medium, 3 hard
  var thinking = false;
  var orientation = "white"; // "white" | "black"
  var selectedSquare = null;
  var legalTargets = []; // verbose move objects for the selected square
  var lastMove = null; // { from, to }

  var FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

  var PIECE_GLYPHS = {
    w: { p: "♙", n: "♘", b: "♗", r: "♖", q: "♕", k: "♔" },
    b: { p: "♟", n: "♞", b: "♝", r: "♜", q: "♛", k: "♚" }
  };

  var PIECE_VALUES = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };

  function pieceSquareBonus(piece, square) {
    // Small nudge toward center control for pawns/knights so the AI
    // doesn't play like it's only counting material.
    if (piece.type !== "p" && piece.type !== "n") return 0;
    var file = square.charCodeAt(0) - "a".charCodeAt(0);
    var rank = parseInt(square[1], 10) - 1;
    var centerDistance = Math.abs(3.5 - file) + Math.abs(3.5 - rank);
    return (4 - centerDistance) * 2;
  }

  function evaluateBoard(chess) {
    var rows = chess.board();
    var score = 0;
    for (var r = 0; r < 8; r++) {
      for (var f = 0; f < 8; f++) {
        var square = rows[r][f];
        if (!square) continue;
        var sq = FILES[f] + (8 - r);
        var value = PIECE_VALUES[square.type] + pieceSquareBonus(square, sq);
        score += square.color === "w" ? value : -value;
      }
    }
    return score;
  }

  function minimax(chess, depth, alpha, beta, maximizing) {
    if (depth === 0 || chess.game_over()) {
      return evaluateBoard(chess);
    }
    var moves = chess.moves();
    if (maximizing) {
      var best = -Infinity;
      for (var i = 0; i < moves.length; i++) {
        chess.move(moves[i]);
        best = Math.max(best, minimax(chess, depth - 1, alpha, beta, false));
        chess.undo();
        alpha = Math.max(alpha, best);
        if (beta <= alpha) break;
      }
      return best;
    } else {
      var worst = Infinity;
      for (var j = 0; j < moves.length; j++) {
        chess.move(moves[j]);
        worst = Math.min(worst, minimax(chess, depth - 1, alpha, beta, true));
        chess.undo();
        beta = Math.min(beta, worst);
        if (beta <= alpha) break;
      }
      return worst;
    }
  }

  function pickComputerMove() {
    var moves = game.moves();
    if (moves.length === 0) return null;

    // Easy mode: mostly random with a slight material bias.
    if (difficulty === 1 && Math.random() < 0.6) {
      return moves[Math.floor(Math.random() * moves.length)];
    }

    var depth = difficulty === 3 ? 3 : difficulty === 2 ? 2 : 1;
    var aiIsWhite = game.turn() === "w";
    var bestMove = null;
    var bestScore = aiIsWhite ? -Infinity : Infinity;

    for (var i = 0; i < moves.length; i++) {
      game.move(moves[i]);
      var score = minimax(game, depth - 1, -Infinity, Infinity, !aiIsWhite);
      game.undo();

      if (aiIsWhite && score > bestScore) {
        bestScore = score;
        bestMove = moves[i];
      } else if (!aiIsWhite && score < bestScore) {
        bestScore = score;
        bestMove = moves[i];
      }
    }
    return bestMove || moves[Math.floor(Math.random() * moves.length)];
  }

  function isComputerTurn() {
    return mode === "computer" && game.turn() !== humanColor;
  }

  function maybeTriggerComputerMove() {
    if (!isComputerTurn() || game.game_over()) return;
    thinking = true;
    updateStatus();
    setTimeout(function () {
      var move = game.move(pickComputerMove());
      if (move) {
        lastMove = { from: move.from, to: move.to };
      }
      thinking = false;
      renderBoard();
      renderMoveList();
      updateStatus();
    }, 300);
  }

  function clearSelection() {
    selectedSquare = null;
    legalTargets = [];
  }

  function onSquareClick(square) {
    if (thinking || game.game_over()) return;
    if (mode === "computer" && game.turn() !== humanColor) return;

    if (selectedSquare) {
      var target = legalTargets.filter(function (m) {
        return m.to === square;
      })[0];

      if (target) {
        var move = game.move({ from: selectedSquare, to: square, promotion: "q" });
        clearSelection();
        if (move) {
          lastMove = { from: move.from, to: move.to };
          renderBoard();
          renderMoveList();
          updateStatus();
          maybeTriggerComputerMove();
        }
        return;
      }

      // Clicking another own piece re-selects instead of moving.
      var piece = game.get(square);
      if (piece && piece.color === game.turn()) {
        selectSquare(square);
      } else {
        clearSelection();
      }
      renderBoard();
      return;
    }

    var clicked = game.get(square);
    if (clicked && clicked.color === game.turn()) {
      selectSquare(square);
      renderBoard();
    }
  }

  function selectSquare(square) {
    selectedSquare = square;
    legalTargets = game.moves({ square: square, verbose: true });
  }

  function renderBoard() {
    boardEl.innerHTML = "";
    var rankOrder = orientation === "white" ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8];
    var fileOrder = orientation === "white" ? FILES : FILES.slice().reverse();

    rankOrder.forEach(function (rank) {
      fileOrder.forEach(function (file) {
        var square = file + rank;
        var fileIdx = FILES.indexOf(file);
        var isDark = (fileIdx + rank) % 2 === 0;

        var squareEl = document.createElement("div");
        squareEl.className = "square " + (isDark ? "dark" : "light");
        squareEl.setAttribute("data-square", square);

        if (lastMove && (square === lastMove.from || square === lastMove.to)) {
          squareEl.classList.add("last-move");
        }
        if (selectedSquare === square) {
          squareEl.classList.add("selected");
        }
        var targetMove = legalTargets.filter(function (m) {
          return m.to === square;
        })[0];
        if (targetMove) {
          squareEl.classList.add(targetMove.flags.indexOf("c") !== -1 ? "legal-capture" : "legal-move");
        }

        var piece = game.get(square);
        if (piece) {
          var pieceEl = document.createElement("span");
          pieceEl.className = "piece piece-" + piece.color;
          pieceEl.textContent = PIECE_GLYPHS[piece.color][piece.type];
          squareEl.appendChild(pieceEl);
        }

        squareEl.addEventListener("click", function () {
          onSquareClick(square);
        });

        boardEl.appendChild(squareEl);
      });
    });
  }

  function updateStatus() {
    var statusEl = document.getElementById("gameStatus");
    statusEl.className = "";
    var text = "";

    if (thinking) {
      text = "Computer is thinking…";
    } else if (game.in_checkmate()) {
      var winner = game.turn() === "w" ? "Black" : "White";
      text = "Checkmate — " + winner + " wins.";
      statusEl.className = "over";
    } else if (game.in_stalemate()) {
      text = "Stalemate — draw.";
      statusEl.className = "over";
    } else if (game.in_threefold_repetition()) {
      text = "Draw by threefold repetition.";
      statusEl.className = "over";
    } else if (game.insufficient_material()) {
      text = "Draw — insufficient material.";
      statusEl.className = "over";
    } else if (game.in_draw()) {
      text = "Draw.";
      statusEl.className = "over";
    } else {
      var turn = game.turn() === "w" ? "White" : "Black";
      text = turn + " to move.";
      if (game.in_check()) {
        text += " Check!";
        statusEl.className = "check";
      }
    }
    statusEl.textContent = text;
  }

  function renderMoveList() {
    var el = document.getElementById("moveList");
    var history = game.history();
    if (history.length === 0) {
      el.textContent = "No moves yet.";
      return;
    }
    var lines = [];
    for (var i = 0; i < history.length; i += 2) {
      var num = i / 2 + 1;
      var white = history[i] || "";
      var black = history[i + 1] || "";
      lines.push(num + ". " + white + (black ? "  " + black : ""));
    }
    el.textContent = lines.join("   ");
    el.scrollTop = el.scrollHeight;
  }

  function newGame() {
    game.reset();
    mode = document.getElementById("modeSelect").value;
    humanColor = document.getElementById("colorSelect").value === "black" ? "b" : "w";
    difficulty = parseInt(document.getElementById("difficultySelect").value, 10);
    thinking = false;
    lastMove = null;
    clearSelection();

    orientation = humanColor === "w" ? "white" : "black";
    renderBoard();
    renderMoveList();
    updateStatus();
    maybeTriggerComputerMove();
  }

  function undo() {
    if (thinking) return;
    game.undo();
    if (mode === "computer" && isComputerTurn()) {
      // Also undo the human's move so it's their turn again, not the computer's.
      game.undo();
    }
    lastMove = null;
    clearSelection();
    renderBoard();
    renderMoveList();
    updateStatus();
    maybeTriggerComputerMove();
  }

  document.addEventListener("DOMContentLoaded", function () {
    boardEl = document.getElementById("board");

    document.getElementById("newGameBtn").addEventListener("click", newGame);
    document.getElementById("undoBtn").addEventListener("click", undo);
    document.getElementById("flipBtn").addEventListener("click", function () {
      orientation = orientation === "white" ? "black" : "white";
      renderBoard();
    });
    document.getElementById("modeSelect").addEventListener("change", newGame);
    document.getElementById("colorSelect").addEventListener("change", newGame);
    document.getElementById("difficultySelect").addEventListener("change", function () {
      difficulty = parseInt(document.getElementById("difficultySelect").value, 10);
    });

    renderBoard();
    updateStatus();
  });
})();
