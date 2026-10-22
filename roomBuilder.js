/**
 * @file This module contains logic for automated road, container, extension, and gapless defensive choke point placement.
 * Uses existing roads and road blueprints (construction sites) to prevent redundant road placement.
 * @author Kellan Cook
 * @version 0.7
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

    // 1. Build roads to sources and containers adjacent to sources (reusing existing roads/blueprints)
    this.buildSourceInfrastructure(spawner);

    // 2. Build extensions and connecting roads based on room controller level
    this.buildExtensions(spawner);

    // 3. Detect complete, gapless choke points and place defensive ramparts
    this.buildChokePointRamparts(spawner);
  },

  /**
   * Generates or updates a CostMatrix where existing roads and road blueprints cost 1,
   * plains cost 2, swamps cost 5, and obstacles cost 255.
   * This ensures all pathfinding prefers existing and planned roads.
   * @param {Room} room
   * @param {CostMatrix} [existingMatrix]
   * @returns {CostMatrix}
   */
  getRoadCostMatrix: function (room, existingMatrix) {
    var costs = existingMatrix || new PathFinder.CostMatrix();

    // Mark existing structures
    var structures = room.find(FIND_STRUCTURES);
    for (var i = 0; i < structures.length; i++) {
      var s = structures[i];
      if (s.structureType === STRUCTURE_ROAD) {
        // Heavily favor existing roads
        costs.set(s.pos.x, s.pos.y, 1);
      } else if (
        s.structureType !== STRUCTURE_CONTAINER &&
        s.structureType !== STRUCTURE_RAMPART
      ) {
        // Can't walk through other structures
        costs.set(s.pos.x, s.pos.y, 255);
      }
    }

    // Mark road construction sites (blueprints)
    var sites = room.find(FIND_CONSTRUCTION_SITES);
    for (var j = 0; j < sites.length; j++) {
      var site = sites[j];
      if (site.structureType === STRUCTURE_ROAD) {
        // Favor road blueprints equally with built roads!
        costs.set(site.pos.x, site.pos.y, 1);
      } else if (
        site.structureType !== STRUCTURE_CONTAINER &&
        site.structureType !== STRUCTURE_RAMPART
      ) {
        // Can't walk through impassable structure sites
        costs.set(site.pos.x, site.pos.y, 255);
      }
    }

    return costs;
  },

  /**
   * Safely creates a road construction site only if the tile is buildable
   * and does not already have a road or road blueprint.
   * @param {Room} room
   * @param {number} x
   * @param {number} y
   * @returns {number} Screeps return code (OK, ERR_FULL, etc.) or -1 if skipped
   */
  placeRoadSite: function (room, x, y) {
    if (x < 1 || x > 48 || y < 1 || y > 48) return -1;
    if (room.getTerrain().get(x, y) === TERRAIN_MASK_WALL) return -1;

    // Check existing structures
    var structures = room.lookForAt(LOOK_STRUCTURES, x, y);
    for (var i = 0; i < structures.length; i++) {
      if (structures[i].structureType === STRUCTURE_ROAD) {
        return -1; // Road already exists!
      }
      if (
        structures[i].structureType !== STRUCTURE_RAMPART &&
        structures[i].structureType !== STRUCTURE_CONTAINER
      ) {
        return -1; // Impassable structure exists
      }
    }

    // Check existing blueprints
    var sites = room.lookForAt(LOOK_CONSTRUCTION_SITES, x, y);
    for (var j = 0; j < sites.length; j++) {
      if (sites[j].structureType === STRUCTURE_ROAD) {
        return -1; // Road blueprint already exists!
      }
      return -1; // Other construction site exists
    }

    // Check construction sites budget
    if (room.find(FIND_CONSTRUCTION_SITES).length >= 85) return -1;

    return room.createConstructionSite(x, y, STRUCTURE_ROAD);
  },

  /**
   * Connects a position to the existing road network (built roads, road blueprints, or spawn)
   * by finding the path to the closest network node using the road CostMatrix,
   * placing roads only until it intersects an existing road or blueprint.
   * @param {Room} room
   * @param {RoomPosition} fromPos
   */
  connectToRoadNetwork: function (room, fromPos) {
    if (!room || !fromPos) return;

    // Check if already adjacent (range <= 1) to any road or road blueprint
    var adjacentRoad = fromPos.findInRange(FIND_STRUCTURES, 1, {
      filter: { structureType: STRUCTURE_ROAD },
    });
    if (adjacentRoad.length > 0) return; // Already connected to a road!

    var adjacentBlueprint = fromPos.findInRange(FIND_CONSTRUCTION_SITES, 1, {
      filter: { structureType: STRUCTURE_ROAD },
    });
    if (adjacentBlueprint.length > 0) return; // Already connected to a road blueprint!

    var adjacentSpawn = fromPos.findInRange(FIND_MY_SPAWNS, 1);
    if (adjacentSpawn.length > 0) return; // Adjacent to spawn!

    // Gather all existing roads, road blueprints, and spawns as potential network connection goals
    var roadStructures = room.find(FIND_STRUCTURES, {
      filter: { structureType: STRUCTURE_ROAD },
    });
    var roadSites = room.find(FIND_CONSTRUCTION_SITES, {
      filter: { structureType: STRUCTURE_ROAD },
    });
    var spawns = room.find(FIND_MY_SPAWNS);

    var networkTargets = roadStructures
      .concat(roadSites)
      .concat(spawns)
      .map(function (item) {
        return item.pos || item;
      });

    if (networkTargets.length === 0) return;

    // Find the closest road network node by path, prioritizing existing roads/blueprints
    var self = this;
    var target = fromPos.findClosestByPath(networkTargets, {
      ignoreCreeps: true,
      costCallback: function (roomName, costMatrix) {
        return self.getRoadCostMatrix(room, costMatrix);
      },
    });

    if (!target) return;

    var path = fromPos.findPathTo(target, {
      ignoreCreeps: true,
      plainCost: 2,
      swampCost: 5,
      costCallback: function (roomName, costMatrix) {
        return self.getRoadCostMatrix(room, costMatrix);
      },
    });

    for (var i = 0; i < path.length; i++) {
      var step = path[i];

      // Stop as soon as we reach an existing road or road blueprint
      var hasRoad = room
        .lookForAt(LOOK_STRUCTURES, step.x, step.y)
        .some(function (s) {
          return s.structureType === STRUCTURE_ROAD;
        });
      var hasBlueprint = room
        .lookForAt(LOOK_CONSTRUCTION_SITES, step.x, step.y)
        .some(function (s) {
          return s.structureType === STRUCTURE_ROAD;
        });

      if (hasRoad || hasBlueprint) {
        // Connected to existing network! No need to pave further.
        break;
      }

      self.placeRoadSite(room, step.x, step.y);
    }
  },

  /**
   * Builds roads from spawner to sources and places containers at sources,
   * reusing existing roads and road blueprints to avoid duplicate paths.
   * @param {StructureSpawn} spawner
   */
  buildSourceInfrastructure: function (spawner) {
    var self = this;
    var room = spawner.room;

    for (const source of spawner.memory.roomsources) {
      const sourceObject = Game.getObjectById(source.id);
      if (!sourceObject) continue;

      // Find path from spawner to source using road CostMatrix to reuse existing roads and blueprints
      const path = spawner.pos.findPathTo(sourceObject, {
        ignoreCreeps: true,
        plainCost: 2,
        swampCost: 5,
        costCallback: function (roomName, costMatrix) {
          return self.getRoadCostMatrix(room, costMatrix);
        },
      });

      for (let i = 0; i < path.length; i++) {
        const position = path[i];
        if (
          position.x !== sourceObject.pos.x ||
          position.y !== sourceObject.pos.y
        ) {
          self.placeRoadSite(room, position.x, position.y);
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
              room.getTerrain().get(x, y) !== TERRAIN_MASK_WALL &&
              room.lookForAt(LOOK_STRUCTURES, x, y).length === 0 &&
              room.lookForAt(LOOK_CONSTRUCTION_SITES, x, y).length === 0
            ) {
              positions.push(new RoomPosition(x, y, room.name));
            }
          }
        }

        if (positions.length > 0) {
          let pos = positions[0];
          // Prioritize positions that already touch an existing road OR road blueprint
          for (let p = 0; p < positions.length; p++) {
            let hasRoad =
              positions[p].findInRange(FIND_STRUCTURES, 1, {
                filter: { structureType: STRUCTURE_ROAD },
              }).length > 0;
            let hasBlueprint =
              positions[p].findInRange(FIND_CONSTRUCTION_SITES, 1, {
                filter: { structureType: STRUCTURE_ROAD },
              }).length > 0;

            if (hasRoad || hasBlueprint) {
              pos = positions[p];
              break;
            }
          }

          var res = room.createConstructionSite(pos, STRUCTURE_CONTAINER);
          if (res === OK) {
            // Ensure the newly placed container is connected to the road network
            self.connectToRoadNetwork(room, pos);
          }
        }
      }
    }

    // Connect Room Controller to road network for faster upgrader movement
    if (room.controller) {
      self.connectToRoadNetwork(room, room.controller.pos);
    }
  },

  /**
   * Automatically places extensions in an optimized checkerboard layout around the spawn,
   * placing roads only where needed and connecting to the existing road network.
   * @param {StructureSpawn} spawner
   */
  buildExtensions: function (spawner) {
    var self = this;
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

    // Ensure immediate cardinal tiles around spawner are roads for creep egress (reusing existing roads/blueprints)
    var cardinalAroundSpawn = [
      { x: spawnPos.x + 1, y: spawnPos.y },
      { x: spawnPos.x - 1, y: spawnPos.y },
      { x: spawnPos.x, y: spawnPos.y + 1 },
      { x: spawnPos.x, y: spawnPos.y - 1 },
    ];
    for (const c of cardinalAroundSpawn) {
      self.placeRoadSite(room, c.x, c.y);
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

        // Place road sites only on empty checkerboard road neighbors (skips existing roads and blueprints)
        var adjacentRoads = [
          { x: extPos.x + 1, y: extPos.y },
          { x: extPos.x - 1, y: extPos.y },
          { x: extPos.x, y: extPos.y + 1 },
          { x: extPos.x, y: extPos.y - 1 },
        ];

        for (const adj of adjacentRoads) {
          self.placeRoadSite(room, adj.x, adj.y);
        }

        // Connect this extension to the nearest point on the existing road network
        // (If already adjacent to a road or blueprint, this performs zero work!)
        self.connectToRoadNetwork(room, extPos);
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
