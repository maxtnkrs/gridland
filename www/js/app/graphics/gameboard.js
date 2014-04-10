define(['app/eventmanager', 'app/gameboard', 'app/entity/tile', 'app/gamecontent', 'app/gameoptions'], 
		function(E, GameBoard, Tile, Content, Options) {
	
	var G = null;
	var _el = null;
	var tileContainer = null;
	var tiles = [];
	var TILE_WIDTH = 0, TILE_HEIGHT = 0;
	var BOARD_PAD = 2;
	var FILL_DELAY = 100;
	
	function el() {
		if (_el == null) {
			clearBoard();
			_el = createBoard(GameBoard.options.rows, GameBoard.options.columns);
			_el.addClass('hidden');
			G.addToScreen(_el);
		}
		return _el;
	}
	
	function setTile(row, col, tile) {
		tiles[row] = tiles[row] || [];
		tiles[row][col] = tile;
	}
	
	function getTile(row, col) {
		return tiles[row][col];
	}
	
	function clearBoard() {
		$('.gameBoard').remove();
	}
	
	function createBoard(rows, cols) {
		// Generate the board element
		var el = G.make('gameBoard litBorder');
		if(Options.get('showCosts')) {
			el.addClass('showCosts');
		};
		tileContainer = G.make('tileContainer').attr('id', 'tileContainer').appendTo(el);
		// Determine the board dimensions based on the size of the tiles
		var testTile = G.make('tile').hide().appendTo('body');
		TILE_WIDTH = testTile.width();
		TILE_HEIGHT = testTile.height();
		el.width(TILE_WIDTH * cols);
		el.height(TILE_HEIGHT * rows);
		testTile.remove();
		return el;
	}
	
	function drawSwapTiles(opts) {
		var t1 = tiles[opts.pos1.row][opts.pos1.col];
		var t2 = tiles[opts.pos2.row][opts.pos2.col];
		tiles[opts.pos1.row][opts.pos1.col] = t2;
		tiles[opts.pos2.row][opts.pos2.col] = t1;
		t1.options.row = opts.pos2.row;
		t1.options.column = opts.pos2.col;
		t2.options.row = opts.pos1.row;
		t2.options.column = opts.pos1.col;
		updatePositionInBoard(t1);
		updatePositionInBoard(t2);
		
		return 200;
	}
	
	function drawBoardClear() {
		var t = G.get('.tile', null, true);
		t.addClass('hidden');
		setTimeout(function() {
			t.remove();
			tiles.length = 0;
		}, 200);
		return 200;
	}
	
	function drawFillBoard(tileString) {
		var t = tileString.split('');
		var col = 0, row = 0;
		var mTime = (GameBoard.options.rows + GameBoard.options.columns) * FILL_DELAY;
		(function _f() {
			var tileChar = t.shift();
			if(tileChar == GameBoard.SEP) {
				col++;
				row = 0;
			} else {
				var tile = newTile(row, col, tileChar);
				setTimeout(function() {
					updatePositionInBoard(tile);
					setTimeout(function() {
						E.trigger('tileDrop');
					}, 100);
				}, 200 + mTime - ((row + (GameBoard.options.columns - col)) * FILL_DELAY));
				row++;
			}
			if(t.length > 0) {
				setTimeout(_f, 0);
			}
		})();
		return mTime + 200;
	}
	
	function drawMatch(opts) {
		var tilesToUpdate = [];
		// Remove matched tiles
		if(opts.removed) {
			for(var i in opts.removed) {
				var pos = opts.removed[i];
				removeTile(pos.row, pos.col);
				// Drop each tile above this tile one space
				for(var r = pos.row - 1; r >= 0; r--) {
					var t = getTile(r, pos.col);
					if(t) {
						t.options.row++;
						tilesToUpdate.push(t);
					}
				}
			}
		}
		
		// Add new tiles to the top
		// TODO: As expected, this is the heaviest thing. Optimize it.
		if(opts.added) {
			for(var i in opts.added) {
				var a = opts.added[i];
				var tile = newTile(a.row, a.col, a.char);
				tilesToUpdate.push(tile);
			}
		}
		
		setTimeout(function() {
			// Drop tiles that need dropping
			for(var i in tilesToUpdate) {
				var t = tilesToUpdate[i];
				setTile(t.options.row, t.options.column, t);
				updatePositionInBoard(t);
			}
		}, 200);
		
		setTimeout(function() {
			E.trigger('tileDrop');
		}, 300);
		
		return 400;
	}
	
	function updatePositionInBoard(entity, row, column) {
		row = row || entity.options.row;
		column = column || entity.options.column;
		var el = entity.el();
		var p = getPosition(row, column);
		el.css({
			transform: 'translate3d(' + p.left + 'px, ' + p.top + 'px, 0)'
		});
	}
	
	function getPosition(row, column) {
		return {
			top: row * TILE_HEIGHT + BOARD_PAD,
			left: column * TILE_WIDTH + BOARD_PAD
		};
	}
	
	function newTile(row, col, tileChar) {
		var tile = new Tile({
			type: Content.getResourceType(tileChar),
			row: row,
			column: col
		});
		setTile(row, col, tile);
		updatePositionInBoard(tile, tile.options.row - GameBoard.options.rows);
		tileContainer.append(tile.el());
		
		return tile;
	}
	
	function removeTile(row, col) {
		var t = getTile(row, col);
		setTile(row, col, null);
		t.el().addClass('hidden');
		setTimeout(function() {
			t.el().remove();
			t._el = null;
		}, 200);
	}
	
	function drawTileEffect(options) {
		getTile(options.row, options.column).el().addClass('effect_' + options.effectType);
	}
	
	function removeTileEffect(options) {
		getTile(options.row, options.column).el().removeClass('effect_' + options.effectType);
	}
	
	function explode(options) {
		var explosion = G.make('explosion');
		var p = getPosition(options.row, options.column);
		explosion.css({
			transform: 'translate3d(' + p.left + 'px, ' + p.top + 'px, 0)'
		});
		tileContainer.append(explosion);
		setTimeout(function() {
			explosion.remove();
		}, 400);
		explosion.show(function() {
			explosion.addClass('exploded');
		});
	}
	
	return {
		init: function() {
			G = require('app/graphics/graphics');
			tiles.length = 0;
			_el = null;
			el();
			
			E.bind('drawEffect', drawTileEffect);
			E.bind('drawRemoveEffect', removeTileEffect);
			E.bind('drawExplode', explode);
			E.bind('gameLoaded', function() {
				el().removeClass('hidden');
			});
		},
		
		el: el,
		
		attachHandler: function(event, element, handler) {
			if(element) {
				el().on(event, element, handler);
			} else {
				el().on(event, handler);
			}
		},
		
		handleDrawRequest: function(requestString, options) {
			switch(requestString.toLowerCase()) {
				case 'clear':
					return drawBoardClear(options);
				case 'fill':
					return drawFillBoard(options);
				case 'swap':
					return drawSwapTiles(options);
				case 'match':
					return drawMatch(options);
			}
		}
	};
});