/**
 * @file This module contains logic for automated road, container, extension, and defensive choke point placement.
 * @author Kellan Cook
 * @version 0.5
 */

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

    // 3. Detect ideal choke points and place defensive ramparts
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
   * Detects natural terrain bottlenecks (choke points) between room exits and the spawner,
   * then creates rampart construction sites to fortify those choke points and the core spawn.
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
      var hasRampart =
        room
          .lookForAt(LOOK_STRUCTURES, corePos.x, corePos.y)
          .some((s) => s.structureType === STRUCTURE_RAMPART);
      var hasRampartSite =
        room
          .lookForAt(LOOK_CONSTRUCTION_SITES, corePos.x, corePos.y)
          .some((s) => s.structureType === STRUCTURE_RAMPART);

      if (!hasRampart && !hasRampartSite) {
        room.createConstructionSite(corePos.x, corePos.y, STRUCTURE_RAMPART);
      }
    }

    // 2. Identify and fortify the ideal natural choke points
    var chokepoints = this.findChokePoints(spawner);

    for (var i = 0; i < chokepoints.length; i++) {
      var choke = chokepoints[i];

      for (var p = 0; p < choke.positions.length; p++) {
        var pos = choke.positions[p];

        var exists =
          room
            .lookForAt(LOOK_STRUCTURES, pos.x, pos.y)
            .some((s) => s.structureType === STRUCTURE_RAMPART);
        var siteExists =
          room
            .lookForAt(LOOK_CONSTRUCTION_SITES, pos.x, pos.y)
            .some((s) => s.structureType === STRUCTURE_RAMPART);

        if (!exists && !siteExists) {
          room.createConstructionSite(pos.x, pos.y, STRUCTURE_RAMPART);
        }

        // Draw in-game visual defense marker
        if (room.visual) {
          room.visual.circle(pos.x, pos.y, {
            fill: "#00ffff",
            radius: 0.35,
            opacity: 0.3,
          });
        }
      }
    }
  },

  /**
   * Analyzes room geometry and terrain to find optimal bottleneck choke cuts
   * between room exits and the spawner.
   * @param {StructureSpawn} spawner
   * @returns {Array<{width: number, positions: RoomPosition[], rangeToSpawn: number}>}
   */
  findChokePoints: function (spawner) {
    var room = spawner.room;
    var terrain = room.getTerrain();
    var spawnPos = spawner.pos;

    // Retrieve all exit tiles in the room
    var exits = room.find(FIND_EXIT);
    if (!exits || exits.length === 0) return [];

    // Group exit positions by direction to sample each approach corridor
    var exitsByDir = { top: [], right: [], bottom: [], left: [] };
    for (var i = 0; i < exits.length; i++) {
      var e = exits[i];
      if (e.y === 0) exitsByDir.top.push(e);
      else if (e.x === 49) exitsByDir.right.push(e);
      else if (e.y === 49) exitsByDir.bottom.push(e);
      else if (e.x === 0) exitsByDir.left.push(e);
    }

    var sampleExits = [];
    for (var dir in exitsByDir) {
      var list = exitsByDir[dir];
      if (list.length > 0) {
        // Sample the median exit tile from each entry border
        var mid = list[Math.floor(list.length / 2)];
        sampleExits.push(mid);
      }
    }

    var detectedChokes = [];
    var maxChokeWidth = 4; // Ideal chokepoints are narrow (1 to 4 tiles between terrain walls)

    for (var s = 0; s < sampleExits.length; s++) {
      var exitPos = sampleExits[s];
      var path = room.findPath(exitPos, spawnPos, {
        ignoreCreeps: true,
        ignoreRoads: true,
      });

      var bestChokeForPath = null;

      for (var p = 0; p < path.length; p++) {
        var step = path[p];
        var x = step.x;
        var y = step.y;

        // Must be in safe build zone (at least 3 tiles away from room edges)
        if (x < 3 || x > 46 || y < 3 || y > 46) continue;

        var rangeToSpawn = spawnPos.getRangeTo(x, y);
        // Chokepoint should be between range 4 and 20 from spawn
        // (Within tower reach, but outside core base infrastructure)
        if (rangeToSpawn < 4 || rangeToSpawn > 20) continue;

        // Check Horizontal Cut (natural wall to the left and right along y = step.y)
        var leftWallX = -1;
        for (var lx = x - 1; lx >= Math.max(1, x - 5); lx--) {
          if (terrain.get(lx, y) === TERRAIN_MASK_WALL) {
            leftWallX = lx;
            break;
          }
        }

        var rightWallX = -1;
        for (var rx = x + 1; rx <= Math.min(48, x + 5); rx++) {
          if (terrain.get(rx, y) === TERRAIN_MASK_WALL) {
            rightWallX = rx;
            break;
          }
        }

        if (leftWallX !== -1 && rightWallX !== -1) {
          var widthH = rightWallX - leftWallX - 1;
          if (widthH >= 1 && widthH <= maxChokeWidth) {
            var validH = true;
            var hPositions = [];
            for (var tx = leftWallX + 1; tx < rightWallX; tx++) {
              if (terrain.get(tx, y) === TERRAIN_MASK_WALL) {
                validH = false;
                break;
              }
              hPositions.push(new RoomPosition(tx, y, room.name));
            }
            if (validH && hPositions.length > 0) {
              var chokeH = {
                width: widthH,
                positions: hPositions,
                rangeToSpawn: rangeToSpawn,
              };
              if (
                !bestChokeForPath ||
                chokeH.width < bestChokeForPath.width ||
                (chokeH.width === bestChokeForPath.width &&
                  chokeH.rangeToSpawn < bestChokeForPath.rangeToSpawn)
              ) {
                bestChokeForPath = chokeH;
              }
            }
          }
        }

        // Check Vertical Cut (natural wall above and below along x = step.x)
        var topWallY = -1;
        for (var ty = y - 1; ty >= Math.max(1, y - 5); ty--) {
          if (terrain.get(x, ty) === TERRAIN_MASK_WALL) {
            topWallY = ty;
            break;
          }
        }

        var bottomWallY = -1;
        for (var by = y + 1; by <= Math.min(48, y + 5); by++) {
          if (terrain.get(x, by) === TERRAIN_MASK_WALL) {
            bottomWallY = by;
            break;
          }
        }

        if (topWallY !== -1 && bottomWallY !== -1) {
          var widthV = bottomWallY - topWallY - 1;
          if (widthV >= 1 && widthV <= maxChokeWidth) {
            var validV = true;
            var vPositions = [];
            for (var ty2 = topWallY + 1; ty2 < bottomWallY; ty2++) {
              if (terrain.get(x, ty2) === TERRAIN_MASK_WALL) {
                validV = false;
                break;
              }
              vPositions.push(new RoomPosition(x, ty2, room.name));
            }
            if (validV && vPositions.length > 0) {
              var chokeV = {
                width: widthV,
                positions: vPositions,
                rangeToSpawn: rangeToSpawn,
              };
              if (
                !bestChokeForPath ||
                chokeV.width < bestChokeForPath.width ||
                (chokeV.width === bestChokeForPath.width &&
                  chokeV.rangeToSpawn < bestChokeForPath.rangeToSpawn)
              ) {
                bestChokeForPath = chokeV;
              }
            }
          }
        }
      }

      if (bestChokeForPath) {
        detectedChokes.push(bestChokeForPath);
      }
    }

    return detectedChokes;
  },
};

module.exports = roomBuilder;
