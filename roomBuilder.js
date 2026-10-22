/**
 * @file This module contains logic for automated road, container, extension, and gapless defensive choke point placement.
 * @author Kellan Cook
 * @version 0.6
 */

var minCut = require("util.mincut");

var roomBuilder = {
  /**
   * Main entry point for the room builder logic. Called for each spawner.
   * @param {StructureSpawn} spawner - The spawner to run the logic for.
   */
  run: function (spawner) {
    if (!spawner || !spawner.room) return;

    if (!spawner.memory.roomsources) {
      spawner.memory.roomsources = spawner.room
        .find(FIND_SOURCES)
        .map((s) => ({ id: s.id }));
    }

    // 1. Build roads to sources and containers adjacent to sources
    this.buildSourceInfrastructure(spawner);

    // 2. Build extensions and connecting roads based on room controller level
    this.buildExtensions(spawner);

    // 3. Detect complete, gapless choke points and place defensive ramparts
    this.buildChokePointRamparts(spawner);
  },

  /**
   * Builds roads from spawner to sources and places containers at sources.
   * @param {StructureSpawn} spawner
   */
  buildSourceInfrastructure: function (spawner) {
    for (const source of spawner.memory.roomsources) {
      const sourceObject = Game.getObjectById(source.id);
      if (!sourceObject) continue;

      // Find path from spawner to source and create road construction sites (omit the source tile itself)
      const path = spawner.pos.findPathTo(sourceObject, {
        ignoreCreeps: true,
      });
      for (let i = 0; i < path.length; i++) {
        const position = path[i];
        if (
          position.x !== sourceObject.pos.x ||
          position.y !== sourceObject.pos.y
        ) {
          spawner.room.createConstructionSite(
            position.x,
            position.y,
            STRUCTURE_ROAD
          );
        }
      }

      // Find existing containers and container construction sites near the source
      var containers = sourceObject.pos.findInRange(FIND_STRUCTURES, 2, {
        filter: { structureType: STRUCTURE_CONTAINER },
      });
      var constructionSites = sourceObject.pos.findInRange(
        FIND_CONSTRUCTION_SITES,
        2,
        {
          filter: { structureType: STRUCTURE_CONTAINER },
        }
      );

      // If no containers or construction sites exist, find a suitable adjacent location
      if (containers.length === 0 && constructionSites.length === 0) {
        let positions = [];
        for (let x = sourceObject.pos.x - 1; x <= sourceObject.pos.x + 1; x++) {
          for (let y = sourceObject.pos.y - 1; y <= sourceObject.pos.y + 1; y++) {
            if (
              x >= 0 &&
              x <= 49 &&
              y >= 0 &&
              y <= 49 &&
              !(x === sourceObject.pos.x && y === sourceObject.pos.y) &&
              spawner.room.getTerrain().get(x, y) !== TERRAIN_MASK_WALL &&
              spawner.room.lookForAt(LOOK_STRUCTURES, x, y).length === 0 &&
              spawner.room.lookForAt(LOOK_CONSTRUCTION_SITES, x, y).length === 0
            ) {
              positions.push(new RoomPosition(x, y, spawner.room.name));
            }
          }
        }

        if (positions.length > 0) {
          let pos = positions[0];
          for (let p = 0; p < positions.length; p++) {
            let roads = positions[p].findInRange(FIND_STRUCTURES, 1, {
              filter: { structureType: STRUCTURE_ROAD },
            });
            if (roads.length > 0) {
              pos = positions[p];
              break;
            }
          }
          spawner.room.createConstructionSite(pos, STRUCTURE_CONTAINER);
        }
      }
    }
  },

  /**
   * Automatically places extensions in an optimized checkerboard layout around the spawn,
   * along with the connecting road grid so creeps can access and fill every extension.
   * @param {StructureSpawn} spawner
   */
  buildExtensions: function (spawner) {
    var room = spawner.room;
    if (!room.controller || room.controller.level < 2) {
      return; // Extensions require RCL 2 or higher
    }

    var maxExtensions =
      CONTROLLER_STRUCTURES[STRUCTURE_EXTENSION][room.controller.level] || 0;
    var existingExtensions = room.find(FIND_MY_STRUCTURES, {
      filter: { structureType: STRUCTURE_EXTENSION },
    });
    var extensionSites = room.find(FIND_CONSTRUCTION_SITES, {
      filter: { structureType: STRUCTURE_EXTENSION },
    });

    var neededExtensions =
      maxExtensions - (existingExtensions.length + extensionSites.length);
    if (neededExtensions <= 0) return;

    // Avoid exceeding the global construction sites budget (max 100 per player)
    var currentSites = room.find(FIND_CONSTRUCTION_SITES).length;
    if (currentSites >= 80) return;

    var terrain = room.getTerrain();
    var spawnPos = spawner.pos;

    // Use checkerboard parity relative to spawner:
    // (x + y) % 2 === parity => Extension tile
    // (x + y) % 2 !== parity => Road tile
    var parity = (spawnPos.x + spawnPos.y) % 2;

    // Also ensure immediate cardinal tiles around spawner are roads for creep egress
    var cardinalAroundSpawn = [
      { x: spawnPos.x + 1, y: spawnPos.y },
      { x: spawnPos.x - 1, y: spawnPos.y },
      { x: spawnPos.x, y: spawnPos.y + 1 },
      { x: spawnPos.x, y: spawnPos.y - 1 },
    ];
    for (const c of cardinalAroundSpawn) {
      if (
        c.x >= 1 &&
        c.x <= 48 &&
        c.y >= 1 &&
        c.y <= 48 &&
        terrain.get(c.x, c.y) !== TERRAIN_MASK_WALL &&
        room.lookForAt(LOOK_STRUCTURES, c.x, c.y).length === 0 &&
        room.lookForAt(LOOK_CONSTRUCTION_SITES, c.x, c.y).length === 0
      ) {
        room.createConstructionSite(c.x, c.y, STRUCTURE_ROAD);
      }
    }

    // Collect candidate positions in expanding rings around the spawn (distance 2 to 10)
    var candidates = [];
    for (let r = 2; r <= 10; r++) {
      for (let dx = -r; dx <= r; dx++) {
        for (let dy = -r; dy <= r; dy++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;

          let x = spawnPos.x + dx;
          let y = spawnPos.y + dy;

          // Stay within room boundary safe zone (avoid edge walls & room exits)
          if (x < 3 || x > 46 || y < 3 || y > 46) continue;

          // Check checkerboard parity for extension placement
          if ((x + y) % 2 !== parity) continue;

          // Terrain must not be a wall
          if (terrain.get(x, y) === TERRAIN_MASK_WALL) continue;

          // Must not block sources (keep at least range 3 from any energy source)
          var nearSource = false;
          if (spawner.memory.roomsources) {
            for (const s of spawner.memory.roomsources) {
              const sObj = Game.getObjectById(s.id);
              if (sObj && sObj.pos.getRangeTo(x, y) <= 2) {
                nearSource = true;
                break;
              }
            }
          }
          if (nearSource) continue;

          // Must not block room controller (keep at least range 3 from controller)
          if (room.controller.pos.getRangeTo(x, y) <= 2) continue;

          // Must not already have structures or construction sites
          if (room.lookForAt(LOOK_STRUCTURES, x, y).length > 0) continue;
          if (room.lookForAt(LOOK_CONSTRUCTION_SITES, x, y).length > 0) continue;

          candidates.push(new RoomPosition(x, y, room.name));
        }
      }
    }

    // Sort candidate positions by path distance to spawner
    candidates.sort((a, b) => a.getRangeTo(spawnPos) - b.getRangeTo(spawnPos));

    var placedCount = 0;
    // Place extensions up to needed count (limit to 10 per cycle to prevent overwhelming builders)
    var batchLimit = Math.min(neededExtensions, 10);

    for (let i = 0; i < candidates.length && placedCount < batchLimit; i++) {
      let extPos = candidates[i];
      let res = room.createConstructionSite(
        extPos.x,
        extPos.y,
        STRUCTURE_EXTENSION
      );

      if (res === OK) {
        placedCount++;

        // Place road construction sites on all walkable adjacent cardinal tiles (the road grid)
        var adjacentRoads = [
          { x: extPos.x + 1, y: extPos.y },
          { x: extPos.x - 1, y: extPos.y },
          { x: extPos.x, y: extPos.y + 1 },
          { x: extPos.x, y: extPos.y - 1 },
        ];

        for (const adj of adjacentRoads) {
          if (
            adj.x >= 2 &&
            adj.x <= 47 &&
            adj.y >= 2 &&
            adj.y <= 47 &&
            terrain.get(adj.x, adj.y) !== TERRAIN_MASK_WALL &&
            room.lookForAt(LOOK_STRUCTURES, adj.x, adj.y).length === 0 &&
            room.lookForAt(LOOK_CONSTRUCTION_SITES, adj.x, adj.y).length === 0
          ) {
            room.createConstructionSite(adj.x, adj.y, STRUCTURE_ROAD);
          }
        }

        // Connect this extension position back to the spawner along the path
        var pathToSpawn = extPos.findPathTo(spawnPos, {
          ignoreCreeps: true,
          swampCost: 1, // Prioritize shortest direct path for roads
        });

        for (const step of pathToSpawn) {
          if (
            (step.x !== extPos.x || step.y !== extPos.y) &&
            (step.x !== spawnPos.x || step.y !== spawnPos.y) &&
            terrain.get(step.x, step.y) !== TERRAIN_MASK_WALL &&
            room.lookForAt(LOOK_STRUCTURES, step.x, step.y).length === 0 &&
            room.lookForAt(LOOK_CONSTRUCTION_SITES, step.x, step.y).length === 0
          ) {
            room.createConstructionSite(step.x, step.y, STRUCTURE_ROAD);
          }
        }
      } else if (res === ERR_FULL || res === ERR_RCL_NOT_ENOUGH) {
        break;
      }
    }
  },

  /**
   * Detects complete, gapless choke point cuts using the 8-directional Min-Cut algorithm,
   * then creates rampart construction sites to seal off the base from all room exits.
   * @param {StructureSpawn} spawner
   */
  buildChokePointRamparts: function (spawner) {
    var room = spawner.room;
    if (!room.controller || room.controller.level < 2) {
      return; // Ramparts require RCL 2 or higher
    }

    var currentSites = room.find(FIND_CONSTRUCTION_SITES).length;
    if (currentSites >= 80) return;

    // 1. Fortify core infrastructure (spawner and towers) directly with ramparts
    var corePositions = [spawner.pos];
    var towers = room.find(FIND_MY_STRUCTURES, {
      filter: { structureType: STRUCTURE_TOWER },
    });
    for (var t = 0; t < towers.length; t++) {
      corePositions.push(towers[t].pos);
    }

    for (var c = 0; c < corePositions.length; c++) {
      var corePos = corePositions[c];
      var hasRampart = room
        .lookForAt(LOOK_STRUCTURES, corePos.x, corePos.y)
        .some((s) => s.structureType === STRUCTURE_RAMPART);
      var hasRampartSite = room
        .lookForAt(LOOK_CONSTRUCTION_SITES, corePos.x, corePos.y)
        .some((s) => s.structureType === STRUCTURE_RAMPART);

      if (!hasRampart && !hasRampartSite) {
        room.createConstructionSite(corePos.x, corePos.y, STRUCTURE_RAMPART);
      }
    }

    // 2. Identify the core base zone to protect with the perimeter
    var spawnPos = spawner.pos;
    var protectedRects = [
      {
        x1: Math.max(3, spawnPos.x - 5),
        y1: Math.max(3, spawnPos.y - 5),
        x2: Math.min(46, spawnPos.x + 5),
        y2: Math.min(46, spawnPos.y + 5),
      },
    ];

    // Include any structures (extensions, storage, towers) that extend beyond the main 5-tile radius
    var vitalStructures = room.find(FIND_MY_STRUCTURES, {
      filter: function (s) {
        return (
          s.structureType === STRUCTURE_EXTENSION ||
          s.structureType === STRUCTURE_STORAGE ||
          s.structureType === STRUCTURE_TOWER
        );
      },
    });

    for (var vs = 0; vs < vitalStructures.length; vs++) {
      var sPos = vitalStructures[vs].pos;
      if (
        sPos.x < protectedRects[0].x1 ||
        sPos.x > protectedRects[0].x2 ||
        sPos.y < protectedRects[0].y1 ||
        sPos.y > protectedRects[0].y2
      ) {
        protectedRects.push({
          x1: Math.max(3, sPos.x - 1),
          y1: Math.max(3, sPos.y - 1),
          x2: Math.min(46, sPos.x + 1),
          y2: Math.min(46, sPos.y + 1),
        });
      }
    }

    // 3. Compute mathematically proven gapless choke cut tiles
    var cutPositions = this.findChokePoints(spawner, protectedRects);

    var maxNewSites = Math.max(
      0,
      80 - room.find(FIND_CONSTRUCTION_SITES).length
    );
    var sitesPlaced = 0;

    for (var i = 0; i < cutPositions.length; i++) {
      var pos = cutPositions[i];

      var hasRampart = room
        .lookForAt(LOOK_STRUCTURES, pos.x, pos.y)
        .some((s) => s.structureType === STRUCTURE_RAMPART);
      var hasRampartSite = room
        .lookForAt(LOOK_CONSTRUCTION_SITES, pos.x, pos.y)
        .some((s) => s.structureType === STRUCTURE_RAMPART);

      if (!hasRampart && !hasRampartSite && sitesPlaced < maxNewSites) {
        var res = room.createConstructionSite(pos.x, pos.y, STRUCTURE_RAMPART);
        if (res === OK) {
          sitesPlaced++;
        }
      }

      // Draw in-game visual defense barrier
      if (room.visual) {
        room.visual.circle(pos.x, pos.y, {
          fill: "#00ffcc",
          radius: 0.35,
          opacity: 0.35,
        });
      }
    }
  },

  /**
   * Finds all optimal choke cut tiles using 8-directional Min-Cut network flow.
   * Ensures 100% gapless protection against any path from any room exit to the base.
   * @param {StructureSpawn} spawner
   * @param {Array<{x1: number, y1: number, x2: number, y2: number}>} [protectedRects]
   * @returns {RoomPosition[]}
   */
  findChokePoints: function (spawner, protectedRects) {
    var room = spawner.room;
    var spawnPos = spawner.pos;

    if (!protectedRects) {
      protectedRects = [
        {
          x1: Math.max(3, spawnPos.x - 5),
          y1: Math.max(3, spawnPos.y - 5),
          x2: Math.min(46, spawnPos.x + 5),
          y2: Math.min(46, spawnPos.y + 5),
        },
      ];
    }

    return minCut.getCutTiles(room, protectedRects);
  },
};

module.exports = roomBuilder;
