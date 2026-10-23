/**
 * @file 8-Directional Min-Cut (Minimum Cut) algorithm for Screeps.
 * Computes the mathematically optimal, gapless defensive barrier enclosing the base
 * across natural terrain choke points using Dinic's Max-Flow / Min-Cut algorithm.
 * @author Kellan Cook
 * @version 1.1
 */

var minCut = {
  /**
   * Computes both the minimum cut rampart positions and the interior protected grid
   * separating all room exits from the protected base zone.
   * Guaranteed to leave zero openings/gaps against 8-directional creep movement.
   *
   * @param {Room} room - The Screeps room object.
   * @param {Array<{x1: number, y1: number, x2: number, y2: number}>} protectedRects - Core areas to protect.
   * @returns {{cutTiles: RoomPosition[], insideGrid: Uint8Array}}
   */
  calculate: function (room, protectedRects) {
    var emptyResult = {
      cutTiles: [],
      insideGrid: new Uint8Array(2500),
    };
    if (!room) return emptyResult;

    var terrain = room.getTerrain();
    var exits = room.find(FIND_EXIT);

    // If room has no exits, all walkable tiles are safe/inside
    if (!exits || exits.length === 0) {
      for (var iy = 0; iy < 50; iy++) {
        for (var ix = 0; ix < 50; ix++) {
          if (terrain.get(ix, iy) !== TERRAIN_MASK_WALL) {
            emptyResult.insideGrid[iy * 50 + ix] = 1;
          }
        }
      }
      return emptyResult;
    }

    // Tile classifications:
    // 0: Walkable / Cuttable candidate
    // 1: Wall (impassable)
    // 2: Exit buffer zone (cannot place ramparts within 2 tiles of room border)
    // 3: Protected zone (must not be cut)
    var grid = new Uint8Array(2500);

    for (var y = 0; y < 50; y++) {
      for (var x = 0; x < 50; x++) {
        var idx = y * 50 + x;
        if (terrain.get(x, y) === TERRAIN_MASK_WALL) {
          grid[idx] = 1; // Wall
        } else if (x <= 2 || x >= 47 || y <= 2 || y >= 47) {
          grid[idx] = 2; // Exit buffer zone
        } else {
          grid[idx] = 0; // Candidate for cut
        }
      }
    }

    // Mark protected zones
    if (!protectedRects || protectedRects.length === 0) {
      return emptyResult;
    }

    for (var r = 0; r < protectedRects.length; r++) {
      var rect = protectedRects[r];
      var minX = Math.max(3, Math.min(46, rect.x1));
      var maxX = Math.max(3, Math.min(46, rect.x2));
      var minY = Math.max(3, Math.min(46, rect.y1));
      var maxY = Math.max(3, Math.min(46, rect.y2));

      for (var py = minY; py <= maxY; py++) {
        for (var px = minX; px <= maxX; px++) {
          var pIdx = py * 50 + px;
          if (grid[pIdx] !== 1) {
            grid[pIdx] = 3; // Protected
          }
        }
      }
    }

    // Pre-mark existing ramparts and rampart construction sites to prefer reusing them on ties
    var hasExistingRampart = new Uint8Array(2500);
    if (typeof FIND_STRUCTURES !== "undefined") {
      var structures = room.find(FIND_STRUCTURES) || [];
      for (var s = 0; s < structures.length; s++) {
        if (structures[s].structureType === STRUCTURE_RAMPART) {
          hasExistingRampart[structures[s].pos.y * 50 + structures[s].pos.x] = 1;
        }
      }
    }
    if (typeof FIND_CONSTRUCTION_SITES !== "undefined") {
      var sites = room.find(FIND_CONSTRUCTION_SITES) || [];
      for (var cs = 0; cs < sites.length; cs++) {
        if (sites[cs].structureType === STRUCTURE_RAMPART) {
          hasExistingRampart[sites[cs].pos.y * 50 + sites[cs].pos.x] = 1;
        }
      }
    }

    // Setup network flow graph
    // Source S = 0, Sink T = 1
    // Each tile i: inNode = 2 + 2*i, outNode = 2 + 2*i + 1
    var S = 0;
    var T = 1;
    var nodeCount = 5002;
    var maxEdges = 80000;

    var head = new Int32Array(nodeCount).fill(-1);
    var to = new Int32Array(maxEdges);
    var cap = new Int32Array(maxEdges);
    var flow = new Int32Array(maxEdges);
    var next = new Int32Array(maxEdges);
    var edgeCount = 0;

    function addEdge(u, v, c) {
      if (edgeCount + 2 >= maxEdges) return;
      to[edgeCount] = v;
      cap[edgeCount] = c;
      flow[edgeCount] = 0;
      next[edgeCount] = head[u];
      head[u] = edgeCount++;

      to[edgeCount] = u;
      cap[edgeCount] = 0;
      flow[edgeCount] = 0;
      next[edgeCount] = head[v];
      head[v] = edgeCount++;
    }

    var INF = 100000;

    // Connect Source S directly to all exit tiles so flow naturally navigates around border walls
    for (var e = 0; e < exits.length; e++) {
      var exitPos = exits[e];
      var exitIdx = exitPos.y * 50 + exitPos.x;
      if (grid[exitIdx] !== 1) {
        var entryInNode = 2 + 2 * exitIdx;
        addEdge(S, entryInNode, INF);
      }
    }

    // 8-direction offsets (Chebyshev movement)
    var dx = [-1, 0, 1, -1, 1, -1, 0, 1];
    var dy = [-1, -1, -1, 0, 0, 1, 1, 1];

    for (var y = 0; y < 50; y++) {
      for (var x = 0; x < 50; x++) {
        var idx = y * 50 + x;
        var type = grid[idx];
        if (type === 1) continue; // Wall

        var uIn = 2 + 2 * idx;
        var uOut = 2 + 2 * idx + 1;

        if (type === 2) {
          // Exit buffer: infinite capacity (cannot be cut)
          addEdge(uIn, uOut, INF);
        } else if (type === 3) {
          // Protected zone: infinite capacity (cannot be cut), connected to Sink
          addEdge(uIn, uOut, INF);
          addEdge(uOut, T, INF);
        } else {
          // Normal candidate tile: cost 2, or cost 1 if rampart already exists (prefers reusing existing ramparts)
          var cost = hasExistingRampart[idx] ? 1 : 2;
          addEdge(uIn, uOut, cost);
        }

        // 8-directional connectivity to neighbors
        for (var d = 0; d < 8; d++) {
          var nx = x + dx[d];
          var ny = y + dy[d];
          if (nx >= 0 && nx < 50 && ny >= 0 && ny < 50) {
            var nIdx = ny * 50 + nx;
            if (grid[nIdx] !== 1) {
              var vIn = 2 + 2 * nIdx;
              addEdge(uOut, vIn, INF);
            }
          }
        }
      }
    }

    // Dinic's Algorithm
    var level = new Int32Array(nodeCount);
    var work = new Int32Array(nodeCount);
    var queue = new Int32Array(nodeCount);

    function bfs() {
      level.fill(-1);
      level[S] = 0;
      var qHead = 0;
      var qTail = 0;
      queue[qTail++] = S;

      while (qHead < qTail) {
        var u = queue[qHead++];
        for (var e = head[u]; e !== -1; e = next[e]) {
          var v = to[e];
          if (cap[e] - flow[e] > 0 && level[v] === -1) {
            level[v] = level[u] + 1;
            queue[qTail++] = v;
          }
        }
      }
      return level[T] !== -1;
    }

    function dfs(u, pushed) {
      if (pushed === 0) return 0;
      if (u === T) return pushed;
      for (var e = work[u]; e !== -1; e = next[e]) {
        work[u] = e;
        var v = to[e];
        var tr = cap[e] - flow[e];
        if (level[u] + 1 !== level[v] || tr <= 0) continue;
        var trPush = dfs(v, Math.min(pushed, tr));
        if (trPush === 0) continue;
        flow[e] += trPush;
        flow[e ^ 1] -= trPush;
        return trPush;
      }
      return 0;
    }

    while (bfs()) {
      work.set(head);
      while (true) {
        var pushed = dfs(S, INF);
        if (pushed === 0) break;
      }
    }

    // Find all nodes reachable from S in the residual graph
    var visited = new Uint8Array(nodeCount);
    var qHead = 0;
    var qTail = 0;
    visited[S] = 1;
    queue[qTail++] = S;

    while (qHead < qTail) {
      var u = queue[qHead++];
      for (var e = head[u]; e !== -1; e = next[e]) {
        if (cap[e] - flow[e] > 0 && !visited[to[e]]) {
          visited[to[e]] = 1;
          queue[qTail++] = to[e];
        }
      }
    }

    // Identify saturated cut edges (uIn visited, uOut unvisited) and interior protected tiles (!visited[uOut])
    var cutPositions = [];
    var insideGrid = new Uint8Array(2500);

    for (var y = 3; y <= 46; y++) {
      for (var x = 3; x <= 46; x++) {
        var idx = y * 50 + x;
        if (grid[idx] === 1) continue;

        var uIn = 2 + 2 * idx;
        var uOut = 2 + 2 * idx + 1;

        if (!visited[uOut]) {
          // Tile is either inside the protected perimeter or on the rampart cut line itself
          insideGrid[idx] = 1;
        }

        if (grid[idx] === 0 && visited[uIn] && !visited[uOut]) {
          cutPositions.push(new RoomPosition(x, y, room.name));
        }
      }
    }

    return {
      cutTiles: cutPositions,
      insideGrid: insideGrid,
    };
  },

  /**
   * Computes the minimum cut of walkable tiles separating all room exits from the protected base zone.
   *
   * @param {Room} room - The Screeps room object.
   * @param {Array<{x1: number, y1: number, x2: number, y2: number}>} protectedRects - Core areas to protect.
   * @returns {RoomPosition[]} Array of positions forming the complete defensive perimeter.
   */
  getCutTiles: function (room, protectedRects) {
    return this.calculate(room, protectedRects).cutTiles;
  },
};

module.exports = minCut;
