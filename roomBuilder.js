/**
 * @file This module contains logic for automated road, container, extension, and gapless defensive choke point placement.
 * Uses existing roads and road blueprints (construction sites) to prevent redundant road placement.
 * @author Kellan Cook
 * @version 0.9
 */

var minCut = require("util.mincut");

var roomBuilder = {
  /**
   * Initializes in-tick tracking of newly created construction sites.
   * In Screeps, room.createConstructionSite() does not appear in room.find() or lookForAt()
   * until the following tick, so tracking in-tick sites prevents duplicate roads and site overflow.
   * @param {Room} room
   */
  initTickState: function (room) {
    this._tickRoomName = room ? room.name : null;
    this._tickTime = typeof Game !== "undefined" && Game ? Game.time : -1;
    this._inTickSites = [];
    this._inTickRoadSet = new Set();
    this._baseSiteCount = room ? room.find(FIND_CONSTRUCTION_SITES).length : 0;
  },

  /**
   * Ensures in-tick tracking state is initialized for the given room.
   * @param {Room} room
   */
  ensureTickState: function (room) {
    var now = typeof Game !== "undefined" && Game ? Game.time : -1;
    if (
      !this._inTickSites ||
      !this._inTickRoadSet ||
      this._tickRoomName !== (room ? room.name : null) ||
      (now !== -1 && this._tickTime !== now)
    ) {
      this.initTickState(room);
    }
  },

  /**
   * Returns total construction sites in the room including sites created earlier this tick.
   * @param {Room} room
   * @returns {number}
   */
  getTotalSiteCount: function (room) {
    this.ensureTickState(room);
    return this._baseSiteCount + this._inTickSites.length;
  },

  /**
   * Checks whether a road or road blueprint (including in-tick blueprints) exists at (x, y).
   * @param {Room} room
   * @param {number} x
   * @param {number} y
   * @returns {boolean}
   */
  hasRoadOrBlueprintAt: function (room, x, y) {
    this.ensureTickState(room);
    if (this._inTickRoadSet.has(y * 50 + x)) return true;

    var structures = room.lookForAt(LOOK_STRUCTURES, x, y);
    for (var i = 0; i < structures.length; i++) {
      if (structures[i].structureType === STRUCTURE_ROAD) return true;
    }

    var sites = room.lookForAt(LOOK_CONSTRUCTION_SITES, x, y);
    for (var j = 0; j < sites.length; j++) {
      if (sites[j].structureType === STRUCTURE_ROAD) return true;
    }

    return false;
  },

  /**
   * Checks whether an in-tick construction site was already placed at (x, y).
   * @param {Room} room
   * @param {number} x
   * @param {number} y
   * @param {string} [structureType]
   * @returns {boolean}
   */
  hasInTickSiteAt: function (room, x, y, structureType) {
    this.ensureTickState(room);
    for (var i = 0; i < this._inTickSites.length; i++) {
      var s = this._inTickSites[i];
      if (
        s.x === x &&
        s.y === y &&
        (!structureType || s.structureType === structureType)
      ) {
        return true;
      }
    }
    return false;
  },

  /**
   * Wrapper around room.createConstructionSite that records the site in in-tick state.
   * @param {Room} room
   * @param {number} x
   * @param {number} y
   * @param {string} structureType
   * @param {number} [maxSites=85]
   * @returns {number} Screeps return code or -1 if skipped
   */
  createSite: function (room, x, y, structureType, maxSites) {
    this.ensureTickState(room);
    var limit = maxSites !== undefined ? maxSites : 85;
    if (this.getTotalSiteCount(room) >= limit) return -1;
    if (this.hasInTickSiteAt(room, x, y)) return -1;

    var res = room.createConstructionSite(x, y, structureType);
    if (res === OK) {
      var pos = new RoomPosition(x, y, room.name);
      this._inTickSites.push({
        x: x,
        y: y,
        pos: pos,
        structureType: structureType,
      });
      if (structureType === STRUCTURE_ROAD) {
        this._inTickRoadSet.add(y * 50 + x);
      }
    }
    return res;
  },

  /**
   * Main entry point for the room builder logic. Called for each spawner.
   * @param {StructureSpawn} spawner - The spawner to run the logic for.
   */
  run: function (spawner) {
    if (!spawner || !spawner.room) return;

    this.initTickState(spawner.room);

    if (!spawner.memory.roomsources) {
      spawner.memory.roomsources = spawner.room
        .find(FIND_SOURCES)
        .map((s) => ({ id: s.id }));
    }

    // 1. Build roads to sources and containers adjacent to sources (reusing existing roads/blueprints)
    this.buildSourceInfrastructure(spawner);

    // 2. Reserve / place central storage near spawner within rampart perimeter (RCL 4+)
    this.buildSpawnerStorage(spawner);

    // 3. Place towers at mathematically optimal defense and repair positions (before extensions)
    this.buildOptimalTowers(spawner);

    // 4. Build extensions and connecting roads based on room controller level
    this.buildExtensions(spawner);

    // 5. Detect complete, gapless choke points and place defensive ramparts
    var minCutResult = this.buildChokePointRamparts(spawner);

    // 6. Build controller container as close as possible to controller within rampart perimeter
    this.buildControllerContainer(
      spawner,
      minCutResult ? minCutResult.insideGrid : null
    );

    // 7. Verify storage placement and fortification with computed insideGrid
    this.buildSpawnerStorage(
      spawner,
      minCutResult ? minCutResult.insideGrid : null
    );

    // 8. Final tower check with computed insideGrid
    this.buildOptimalTowers(
      spawner,
      minCutResult ? minCutResult.insideGrid : null
    );
  },

  /**
   * Generates or updates a CostMatrix where existing roads and road blueprints cost 1,
   * plains cost 2, swamps cost 5, and obstacles cost 255.
   * This ensures all pathfinding prefers existing and planned roads (including in-tick blueprints).
   * @param {Room} room
   * @param {CostMatrix} [existingMatrix]
   * @returns {CostMatrix}
   */
  getRoadCostMatrix: function (room, existingMatrix) {
    this.ensureTickState(room);
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

    // Mark construction sites placed earlier during this same tick
    for (var k = 0; k < this._inTickSites.length; k++) {
      var inTick = this._inTickSites[k];
      if (inTick.structureType === STRUCTURE_ROAD) {
        costs.set(inTick.x, inTick.y, 1);
      } else if (
        inTick.structureType !== STRUCTURE_CONTAINER &&
        inTick.structureType !== STRUCTURE_RAMPART
      ) {
        costs.set(inTick.x, inTick.y, 255);
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
    this.ensureTickState(room);
    if (x < 1 || x > 48 || y < 1 || y > 48) return -1;
    if (room.getTerrain().get(x, y) === TERRAIN_MASK_WALL) return -1;
    if (this.hasRoadOrBlueprintAt(room, x, y)) return -1;
    if (this.hasInTickSiteAt(room, x, y)) return -1;

    // Check existing structures
    var structures = room.lookForAt(LOOK_STRUCTURES, x, y);
    for (var i = 0; i < structures.length; i++) {
      if (
        structures[i].structureType !== STRUCTURE_RAMPART &&
        structures[i].structureType !== STRUCTURE_CONTAINER
      ) {
        return -1; // Impassable structure exists
      }
    }

    // Check existing blueprints
    var sites = room.lookForAt(LOOK_CONSTRUCTION_SITES, x, y);
    if (sites.length > 0) {
      return -1; // Another construction site already exists on this tile
    }

    return this.createSite(room, x, y, STRUCTURE_ROAD, 85);
  },

  /**
   * Checks whether a position is adjacent (range <= 1) to any existing road or road blueprint.
   * @param {Room} room
   * @param {RoomPosition} pos
   * @returns {boolean}
   */
  isAdjacentToRoadOrBlueprint: function (room, pos) {
    this.ensureTickState(room);
    for (var dx = -1; dx <= 1; dx++) {
      for (var dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        var nx = pos.x + dx;
        var ny = pos.y + dy;
        if (nx >= 0 && nx <= 49 && ny >= 0 && ny <= 49) {
          if (this.hasRoadOrBlueprintAt(room, nx, ny)) {
            return true;
          }
        }
      }
    }
    return false;
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
    this.ensureTickState(room);

    // Check if already adjacent (range <= 1) to any road, road blueprint, or in-tick road
    if (this.isAdjacentToRoadOrBlueprint(room, fromPos)) return;

    var adjacentSpawn = fromPos.findInRange(FIND_MY_SPAWNS, 1);
    if (adjacentSpawn.length > 0) return; // Adjacent to spawn!

    // Gather all existing roads, road blueprints, in-tick roads, and spawns as network connection goals
    var roadStructures = room.find(FIND_STRUCTURES, {
      filter: { structureType: STRUCTURE_ROAD },
    });
    var roadSites = room.find(FIND_CONSTRUCTION_SITES, {
      filter: { structureType: STRUCTURE_ROAD },
    });
    var inTickRoads = this._inTickSites.filter(function (s) {
      return s.structureType === STRUCTURE_ROAD;
    });
    var spawns = room.find(FIND_MY_SPAWNS);

    var networkTargets = roadStructures
      .concat(roadSites)
      .concat(inTickRoads)
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

      // Stop as soon as we reach an existing road or road blueprint (including in-tick roads)
      if (self.hasRoadOrBlueprintAt(room, step.x, step.y)) {
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
    this.ensureTickState(room);

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
      var hasInTickContainer = this._inTickSites.some(function (s) {
        return (
          s.structureType === STRUCTURE_CONTAINER &&
          sourceObject.pos.getRangeTo(s.x, s.y) <= 2
        );
      });

      // If no containers or construction sites exist, find a suitable adjacent location
      if (
        containers.length === 0 &&
        constructionSites.length === 0 &&
        !hasInTickContainer
      ) {
        let positions = [];
        for (let x = sourceObject.pos.x - 1; x <= sourceObject.pos.x + 1; x++) {
          for (let y = sourceObject.pos.y - 1; y <= sourceObject.pos.y + 1; y++) {
            if (
              x >= 1 &&
              x <= 48 &&
              y >= 1 &&
              y <= 48 &&
              !(x === sourceObject.pos.x && y === sourceObject.pos.y) &&
              room.getTerrain().get(x, y) !== TERRAIN_MASK_WALL &&
              room
                .lookForAt(LOOK_STRUCTURES, x, y)
                .every(
                  (s) =>
                    s.structureType === STRUCTURE_ROAD ||
                    s.structureType === STRUCTURE_RAMPART
                ) &&
              room
                .lookForAt(LOOK_CONSTRUCTION_SITES, x, y)
                .every((s) => s.structureType === STRUCTURE_ROAD) &&
              !self.hasInTickSiteAt(room, x, y, STRUCTURE_CONTAINER)
            ) {
              positions.push(new RoomPosition(x, y, room.name));
            }
          }
        }

        if (positions.length > 0) {
          let pos = positions[0];
          // Prioritize positions that already touch or sit on an existing road OR road blueprint (including in-tick roads)
          for (let p = 0; p < positions.length; p++) {
            if (
              self.hasRoadOrBlueprintAt(room, positions[p].x, positions[p].y) ||
              self.isAdjacentToRoadOrBlueprint(room, positions[p])
            ) {
              pos = positions[p];
              break;
            }
          }

          var res = self.createSite(
            room,
            pos.x,
            pos.y,
            STRUCTURE_CONTAINER,
            85
          );
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
   * Checks whether a given position is adjacent (range <= 1) to any energy source in the room.
   * Used to avoid confusing source containers with the controller container.
   * @param {Room} room
   * @param {RoomPosition|{x: number, y: number}} pos
   * @returns {boolean}
   */
  isNearSource: function (room, pos) {
    var sources = room.find(FIND_SOURCES);
    for (var i = 0; i < sources.length; i++) {
      if (sources[i].pos.getRangeTo(pos.x, pos.y) <= 1) {
        return true;
      }
    }
    return false;
  },

  /**
   * Places a dedicated container as close as possible to the room controller
   * while keeping it strictly within the rampart perimeter.
   * Records the container coordinates in room.memory.controllerContainer so storage managers
   * and upgraders can reliably identify it regardless of distance.
   * @param {StructureSpawn} spawner
   * @param {Uint8Array} [precomputedInsideGrid]
   */
  buildControllerContainer: function (spawner, precomputedInsideGrid) {
    var room = spawner.room;
    if (!room.controller) return;
    this.ensureTickState(room);

    var self = this;
    var controllerPos = room.controller.pos;
    var existingContainer = null;
    var existingSite = null;

    // 1. Check recorded controller container location in room.memory first
    if (room.memory && room.memory.controllerContainer) {
      var memPos = room.memory.controllerContainer;
      var structsAtMem = room.lookForAt(LOOK_STRUCTURES, memPos.x, memPos.y);
      for (var s = 0; s < structsAtMem.length; s++) {
        if (structsAtMem[s].structureType === STRUCTURE_CONTAINER) {
          existingContainer = structsAtMem[s];
          room.memory.controllerContainer.id = existingContainer.id;
          break;
        }
      }
      if (!existingContainer) {
        var sitesAtMem = room.lookForAt(
          LOOK_CONSTRUCTION_SITES,
          memPos.x,
          memPos.y
        );
        for (var c = 0; c < sitesAtMem.length; c++) {
          if (sitesAtMem[c].structureType === STRUCTURE_CONTAINER) {
            existingSite = sitesAtMem[c];
            break;
          }
        }
      }
      if (
        !existingContainer &&
        !existingSite &&
        !this.hasInTickSiteAt(room, memPos.x, memPos.y, STRUCTURE_CONTAINER)
      ) {
        // Recorded container no longer exists (destroyed or cancelled)
        delete room.memory.controllerContainer;
      }
    }

    // 2. Otherwise check within range 4 of controller (excluding source containers)
    if (!existingContainer && !existingSite) {
      var nearbyContainers = controllerPos.findInRange(FIND_STRUCTURES, 4, {
        filter: function (st) {
          return (
            st.structureType === STRUCTURE_CONTAINER &&
            !self.isNearSource(room, st.pos)
          );
        },
      });
      if (nearbyContainers.length > 0) {
        existingContainer = nearbyContainers[0];
      } else {
        var nearbySites = controllerPos.findInRange(
          FIND_CONSTRUCTION_SITES,
          4,
          {
            filter: function (st) {
              return (
                st.structureType === STRUCTURE_CONTAINER &&
                !self.isNearSource(room, st.pos)
              );
            },
          }
        );
        if (nearbySites.length > 0) {
          existingSite = nearbySites[0];
        }
      }
    }

    if (existingContainer || existingSite) {
      var containerPos = existingContainer
        ? existingContainer.pos
        : existingSite.pos;

      if (room.memory) {
        room.memory.controllerContainer = {
          x: containerPos.x,
          y: containerPos.y,
          id: existingContainer ? existingContainer.id : null,
        };
      }

      // Once the container is built and RCL >= 2, ensure a rampart is placed on top of it
      // (Cannot place a rampart construction site on the same tile while the container site is still unbuilt)
      if (
        existingContainer &&
        room.controller.level >= 2 &&
        this.getTotalSiteCount(room) < 85
      ) {
        var hasRampart = room
          .lookForAt(LOOK_STRUCTURES, containerPos.x, containerPos.y)
          .some((st) => st.structureType === STRUCTURE_RAMPART);
        var hasRampartSite = room
          .lookForAt(LOOK_CONSTRUCTION_SITES, containerPos.x, containerPos.y)
          .some((st) => st.structureType === STRUCTURE_RAMPART);

        if (
          !hasRampart &&
          !hasRampartSite &&
          !this.hasInTickSiteAt(
            room,
            containerPos.x,
            containerPos.y,
            STRUCTURE_RAMPART
          )
        ) {
          this.createSite(
            room,
            containerPos.x,
            containerPos.y,
            STRUCTURE_RAMPART,
            85
          );
        }
      }
      return;
    }

    if (this.getTotalSiteCount(room) >= 85) return;

    var terrain = room.getTerrain();

    // 3. Determine which tiles are inside the rampart perimeter
    var insidePerimeter = precomputedInsideGrid;
    if (!insidePerimeter) {
      var calc = minCut.calculate(room, this.getProtectedRects(spawner));
      insidePerimeter = calc.insideGrid;
    }

    // Helper to check if a tile at (cx, cy) is valid for placing the controller container
    var isValidCandidate = function (cx, cy) {
      if (cx < 2 || cx > 47 || cy < 2 || cy > 47) return false;
      if (cx === controllerPos.x && cy === controllerPos.y) return false;
      if (terrain.get(cx, cy) === TERRAIN_MASK_WALL) return false;
      if (self.isNearSource(room, { x: cx, y: cy })) return false;
      if (room.storage && cx === room.storage.pos.x && cy === room.storage.pos.y) return false;
      if (room.memory && room.memory.storagePos && cx === room.memory.storagePos.x && cy === room.memory.storagePos.y) {
        return false;
      }
      if (self.hasInTickSiteAt(room, cx, cy)) return false;

      var structures = room.lookForAt(LOOK_STRUCTURES, cx, cy);
      var hasImpassable = structures.some(
        (st) =>
          st.structureType !== STRUCTURE_ROAD &&
          st.structureType !== STRUCTURE_RAMPART
      );
      if (hasImpassable) return false;

      var sites = room.lookForAt(LOOK_CONSTRUCTION_SITES, cx, cy);
      var hasSite = sites.some(
        (st) =>
          st.structureType !== STRUCTURE_ROAD &&
          st.structureType !== STRUCTURE_RAMPART
      );
      if (hasSite) return false;

      return true;
    };

    // 4. Search for candidate locations inside the rampart perimeter as close as possible to the controller
    var candidatesInside = [];
    var fallbackCandidates = [];

    // First search within range 1..3 of the controller
    for (let radius = 1; radius <= 3; radius++) {
      for (
        let cx = controllerPos.x - radius;
        cx <= controllerPos.x + radius;
        cx++
      ) {
        for (
          let cy = controllerPos.y - radius;
          cy <= controllerPos.y + radius;
          cy++
        ) {
          if (
            Math.max(
              Math.abs(cx - controllerPos.x),
              Math.abs(cy - controllerPos.y)
            ) !== radius
          ) {
            continue;
          }
          if (!isValidCandidate(cx, cy)) continue;

          var pos = new RoomPosition(cx, cy, room.name);
          var idx = cy * 50 + cx;

          if (insidePerimeter[idx]) {
            candidatesInside.push(pos);
          } else {
            fallbackCandidates.push(pos);
          }
        }
      }
    }

    // If the controller lies outside the rampart perimeter and no tile within range 3 is inside,
    // search all tiles inside the rampart perimeter to find the one closest to the controller.
    if (candidatesInside.length === 0) {
      for (let cy = 2; cy <= 47; cy++) {
        for (let cx = 2; cx <= 47; cx++) {
          var idx = cy * 50 + cx;
          if (!insidePerimeter[idx]) continue;
          if (!isValidCandidate(cx, cy)) continue;
          candidatesInside.push(new RoomPosition(cx, cy, room.name));
        }
      }
    }

    var sortByProximity = function (a, b) {
      var distA = a.getRangeTo(controllerPos);
      var distB = b.getRangeTo(controllerPos);
      if (distA !== distB) return distA - distB;
      // Tie-breaker 1: Euclidean squared distance to controller
      var euclidA =
        (a.x - controllerPos.x) * (a.x - controllerPos.x) +
        (a.y - controllerPos.y) * (a.y - controllerPos.y);
      var euclidB =
        (b.x - controllerPos.x) * (b.x - controllerPos.x) +
        (b.y - controllerPos.y) * (b.y - controllerPos.y);
      if (euclidA !== euclidB) return euclidA - euclidB;
      // Tie-breaker 2: closer to spawner
      return a.getRangeTo(spawner.pos) - b.getRangeTo(spawner.pos);
    };

    var bestPos = null;
    if (candidatesInside.length > 0) {
      candidatesInside.sort(sortByProximity);
      bestPos = candidatesInside[0];
    } else if (fallbackCandidates.length > 0) {
      fallbackCandidates.sort(sortByProximity);
      bestPos = fallbackCandidates[0];
    }

    if (bestPos) {
      var res = this.createSite(
        room,
        bestPos.x,
        bestPos.y,
        STRUCTURE_CONTAINER,
        85
      );
      if (res === OK) {
        if (room.memory) {
          room.memory.controllerContainer = {
            x: bestPos.x,
            y: bestPos.y,
            id: null,
          };
        }
        // Connect container to road network
        this.connectToRoadNetwork(room, bestPos);
      }
    }
  },

  /**
   * Places central storage (STRUCTURE_STORAGE) near the spawner within the rampart perimeter.
   * Replaces placing a container near the spawner with a true central storage depot.
   * Automatically reserves the optimal storage tile near spawn (RCL 1-3) and queues construction at RCL 4+.
   * Fortified with a rampart once built.
   * Records coordinates in room.memory.storagePos.
   * @param {StructureSpawn} spawner
   * @param {Uint8Array} [precomputedInsideGrid]
   */
  buildSpawnerStorage: function (spawner, precomputedInsideGrid) {
    var room = spawner.room;
    if (!spawner || !room) return;
    this.ensureTickState(room);

    var self = this;
    var spawnPos = spawner.pos;

    // Remove legacy container construction sites near spawner if any were queued previously
    var legacySites = spawnPos.findInRange(FIND_CONSTRUCTION_SITES, 2, {
      filter: function (st) {
        return (
          st.structureType === STRUCTURE_CONTAINER &&
          !self.isNearSource(room, st.pos) &&
          (!room.controller || st.pos.getRangeTo(room.controller.pos) > 3)
        );
      },
    });
    for (var ls = 0; ls < legacySites.length; ls++) {
      legacySites[ls].remove();
    }

    // Clean up legacy container memory keys
    if (room.memory) {
      delete room.memory.storageContainer;
      delete room.memory.spawnerContainer;
    }

    // 1. If storage structure already exists, record its position and ensure rampart protection
    if (room.storage) {
      if (room.memory) {
        room.memory.storagePos = {
          x: room.storage.pos.x,
          y: room.storage.pos.y,
          id: room.storage.id,
        };
      }
      if (
        room.controller &&
        room.controller.level >= 2 &&
        this.getTotalSiteCount(room) < 85
      ) {
        var hasRampart = room
          .lookForAt(LOOK_STRUCTURES, room.storage.pos.x, room.storage.pos.y)
          .some((st) => st.structureType === STRUCTURE_RAMPART);
        var hasRampartSite = room
          .lookForAt(
            LOOK_CONSTRUCTION_SITES,
            room.storage.pos.x,
            room.storage.pos.y
          )
          .some((st) => st.structureType === STRUCTURE_RAMPART);

        if (
          !hasRampart &&
          !hasRampartSite &&
          !this.hasInTickSiteAt(
            room,
            room.storage.pos.x,
            room.storage.pos.y,
            STRUCTURE_RAMPART
          )
        ) {
          this.createSite(
            room,
            room.storage.pos.x,
            room.storage.pos.y,
            STRUCTURE_RAMPART,
            85
          );
        }
      }
      return;
    }

    // 2. Check if a storage construction site is already placed
    var existingStorageSites = room.find(FIND_CONSTRUCTION_SITES, {
      filter: { structureType: STRUCTURE_STORAGE },
    });
    var inTickStorage = this._inTickSites.filter(function (s) {
      return s.structureType === STRUCTURE_STORAGE;
    });

    if (existingStorageSites.length > 0 || inTickStorage.length > 0) {
      var sSite = existingStorageSites[0] || inTickStorage[0];
      if (room.memory) {
        room.memory.storagePos = {
          x: sSite.pos ? sSite.pos.x : sSite.x,
          y: sSite.pos ? sSite.pos.y : sSite.y,
        };
      }
      return;
    }

    // 3. Determine tiles inside the rampart perimeter
    var terrain = room.getTerrain();
    var insidePerimeter = precomputedInsideGrid;
    if (!insidePerimeter) {
      var calc = minCut.calculate(room, this.getProtectedRects(spawner));
      insidePerimeter = calc.insideGrid;
    }

    // Helper to validate a candidate tile near the spawner
    var isValidCandidate = function (cx, cy) {
      if (cx < 2 || cx > 47 || cy < 2 || cy > 47) return false;
      if (cx === spawnPos.x && cy === spawnPos.y) return false;
      if (terrain.get(cx, cy) === TERRAIN_MASK_WALL) return false;
      if (self.isNearSource(room, { x: cx, y: cy })) return false;
      if (room.controller && room.controller.pos.getRangeTo(cx, cy) <= 3) {
        return false;
      }

      // Do NOT block immediate cardinal egress roads around spawner (dx=0 or dy=0 at radius 1)
      if (Math.abs(cx - spawnPos.x) + Math.abs(cy - spawnPos.y) === 1) {
        return false;
      }

      // Do not overlap with controller container if recorded
      if (
        room.memory &&
        room.memory.controllerContainer &&
        cx === room.memory.controllerContainer.x &&
        cy === room.memory.controllerContainer.y
      ) {
        return false;
      }

      if (self.hasInTickSiteAt(room, cx, cy)) return false;

      var structures = room.lookForAt(LOOK_STRUCTURES, cx, cy);
      if (
        structures.some(
          (st) =>
            st.structureType !== STRUCTURE_ROAD &&
            st.structureType !== STRUCTURE_RAMPART &&
            st.structureType !== STRUCTURE_STORAGE
        )
      ) {
        return false;
      }

      var sites = room.lookForAt(LOOK_CONSTRUCTION_SITES, cx, cy);
      if (
        sites.some(
          (st) =>
            st.structureType !== STRUCTURE_ROAD &&
            st.structureType !== STRUCTURE_RAMPART &&
            st.structureType !== STRUCTURE_STORAGE
        )
      ) {
        return false;
      }

      return true;
    };

    // 4. Search candidate positions around spawner (radius 1 diagonal first, then expanding to radius 2..3)
    var candidates = [];
    for (let radius = 1; radius <= 3; radius++) {
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) continue;
          let cx = spawnPos.x + dx;
          let cy = spawnPos.y + dy;

          if (!isValidCandidate(cx, cy)) continue;

          var idx = cy * 50 + cx;
          if (insidePerimeter && !insidePerimeter[idx]) continue;

          candidates.push(new RoomPosition(cx, cy, room.name));
        }
      }
    }

    if (candidates.length === 0) return;

    // Prioritize:
    // 1. Diagonal distance 1 from spawner (|dx| === 1 && |dy| === 1)
    // 2. Closer range to spawner
    // 3. Touching an existing road or road blueprint
    candidates.sort(function (a, b) {
      var isDiagA =
        Math.abs(a.x - spawnPos.x) === 1 && Math.abs(a.y - spawnPos.y) === 1;
      var isDiagB =
        Math.abs(b.x - spawnPos.x) === 1 && Math.abs(b.y - spawnPos.y) === 1;
      if (isDiagA && !isDiagB) return -1;
      if (!isDiagA && isDiagB) return 1;

      var rangeA = a.getRangeTo(spawnPos);
      var rangeB = b.getRangeTo(spawnPos);
      if (rangeA !== rangeB) return rangeA - rangeB;

      var roadA = self.isAdjacentToRoadOrBlueprint(room, a) ? 0 : 1;
      var roadB = self.isAdjacentToRoadOrBlueprint(room, b) ? 0 : 1;
      return roadA - roadB;
    });

    var bestPos = candidates[0];
    if (bestPos) {
      // Record reserved storage position in memory for all RCL levels
      if (room.memory) {
        room.memory.storagePos = {
          x: bestPos.x,
          y: bestPos.y,
        };
      }

      // If room controller reaches RCL 4+, place the STRUCTURE_STORAGE site
      if (room.controller && room.controller.level >= 4) {
        if (this.getTotalSiteCount(room) < 80) {
          var res = this.createSite(
            room,
            bestPos.x,
            bestPos.y,
            STRUCTURE_STORAGE,
            80
          );
          if (res === OK) {
            this.connectToRoadNetwork(room, bestPos);
          }
        }
      }
    }
  },

  /**
   * Helper aliases for storage placement near spawner.
   */
  buildStorage: function (spawner, precomputedInsideGrid) {
    return this.buildSpawnerStorage(spawner, precomputedInsideGrid);
  },
  buildStorageStructure: function (spawner, precomputedInsideGrid) {
    return this.buildSpawnerStorage(spawner, precomputedInsideGrid);
  },
  buildSpawnerStorageContainer: function (spawner, precomputedInsideGrid) {
    return this.buildSpawnerStorage(spawner, precomputedInsideGrid);
  },
  buildSpawnContainer: function (spawner, precomputedInsideGrid) {
    return this.buildSpawnerStorage(spawner, precomputedInsideGrid);
  },
  buildStorageContainer: function (spawner, precomputedInsideGrid) {
    return this.buildSpawnerStorage(spawner, precomputedInsideGrid);
  },

  /**
   * Automatically places towers at mathematically optimal locations for defending choke points
   * and repairing base structures.
   * Towers are placed inside the rampart perimeter, maximizing combat damage at choke points (up to 600 HP/tick)
   * while minimizing repair energy falloff across base infrastructure and preventing tower clustering.
   * @param {StructureSpawn} spawner
   * @param {Uint8Array} [precomputedInsideGrid]
   */
  buildOptimalTowers: function (spawner, precomputedInsideGrid) {
    var room = spawner.room;
    if (!room || !room.controller || room.controller.level < 3) return;
    this.ensureTickState(room);

    var maxTowers =
      (typeof CONTROLLER_STRUCTURES !== "undefined" &&
        CONTROLLER_STRUCTURES[STRUCTURE_TOWER] &&
        CONTROLLER_STRUCTURES[STRUCTURE_TOWER][room.controller.level]) ||
      (room.controller.level >= 8
        ? 6
        : room.controller.level >= 7
        ? 3
        : room.controller.level >= 5
        ? 2
        : room.controller.level >= 3
        ? 1
        : 0);

    if (maxTowers <= 0) return;

    // Check existing built towers, tower construction sites, and in-tick sites
    var existingTowers = room.find(FIND_MY_STRUCTURES, {
      filter: { structureType: STRUCTURE_TOWER },
    });
    var towerSites = room.find(FIND_CONSTRUCTION_SITES, {
      filter: { structureType: STRUCTURE_TOWER },
    });
    var inTickTowers = this._inTickSites.filter(function (s) {
      return s.structureType === STRUCTURE_TOWER;
    });

    var neededTowers =
      maxTowers -
      (existingTowers.length + towerSites.length + inTickTowers.length);
    if (neededTowers <= 0) return;

    if (this.getTotalSiteCount(room) >= 80) return;

    var self = this;
    var terrain = room.getTerrain();
    var spawnPos = spawner.pos;

    var insidePerimeter = precomputedInsideGrid;
    if (!insidePerimeter) {
      var calc = minCut.calculate(room, this.getProtectedRects(spawner));
      insidePerimeter = calc.insideGrid;
    }

    // Get choke rampart positions to optimize defensive coverage
    var chokePositions = this.findChokePoints(spawner);

    // Existing and planned tower positions for multi-tower dispersion
    var allTowers = existingTowers
      .concat(towerSites)
      .concat(inTickTowers)
      .map(function (t) {
        return t.pos || t;
      });

    // Screeps tower power factor based on range: range <= 5 -> 1.0, range >= 20 -> 0.25
    var getPowerFactor = function (range) {
      if (range <= 5) return 1.0;
      if (range >= 20) return 0.25;
      return 1.0 - 0.75 * ((range - 5) / 15);
    };

    var isValidTowerCandidate = function (cx, cy) {
      if (cx < 3 || cx > 46 || cy < 3 || cy > 46) return false;
      if (cx === spawnPos.x && cy === spawnPos.y) return false;
      if (terrain.get(cx, cy) === TERRAIN_MASK_WALL) return false;

      // Must be inside the rampart perimeter
      var idx = cy * 50 + cx;
      if (insidePerimeter && !insidePerimeter[idx]) return false;

      // Do not block cardinal egress roads around spawner
      if (Math.abs(cx - spawnPos.x) + Math.abs(cy - spawnPos.y) === 1) {
        return false;
      }

      // Do not block sources or controller
      if (self.isNearSource(room, { x: cx, y: cy })) return false;
      if (room.controller && room.controller.pos.getRangeTo(cx, cy) <= 2) {
        return false;
      }

      // Do not place on top of another existing/planned tower (keep at least range 3 separation for dispersion)
      for (var t = 0; t < allTowers.length; t++) {
        if (
          Math.max(
            Math.abs(cx - allTowers[t].x),
            Math.abs(cy - allTowers[t].y)
          ) < 3
        ) {
          return false;
        }
      }

      // Do not place on controller container or spawner storage container
      if (
        room.memory &&
        room.memory.controllerContainer &&
        cx === room.memory.controllerContainer.x &&
        cy === room.memory.controllerContainer.y
      ) {
        return false;
      }
      if (
        room.memory &&
        room.memory.storagePos &&
        cx === room.memory.storagePos.x &&
        cy === room.memory.storagePos.y
      ) {
        return false;
      }
      if (
        room.storage &&
        cx === room.storage.pos.x &&
        cy === room.storage.pos.y
      ) {
        return false;
      }

      if (self.hasInTickSiteAt(room, cx, cy)) return false;

      var structures = room.lookForAt(LOOK_STRUCTURES, cx, cy);
      if (
        structures.some(
          (s) =>
            s.structureType !== STRUCTURE_ROAD &&
            s.structureType !== STRUCTURE_RAMPART
        )
      ) {
        return false;
      }

      var sites = room.lookForAt(LOOK_CONSTRUCTION_SITES, cx, cy);
      if (
        sites.some(
          (s) =>
            s.structureType !== STRUCTURE_ROAD &&
            s.structureType !== STRUCTURE_RAMPART
        )
      ) {
        return false;
      }

      return true;
    };

    // Collect valid candidate tiles within range 2 to 8 of spawner
    var candidates = [];
    for (let r = 2; r <= 8; r++) {
      for (let dx = -r; dx <= r; dx++) {
        for (let dy = -r; dy <= r; dy++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          let cx = spawnPos.x + dx;
          let cy = spawnPos.y + dy;

          if (!isValidTowerCandidate(cx, cy)) continue;

          // 1. Choke defense score: average and minimum power factor against choke points
          var totalChokePower = 0;
          var minChokePower = 1.0;
          if (chokePositions.length > 0) {
            for (var c = 0; c < chokePositions.length; c++) {
              var rangeToChoke = Math.max(
                Math.abs(cx - chokePositions[c].x),
                Math.abs(cy - chokePositions[c].y)
              );
              var pf = getPowerFactor(rangeToChoke);
              totalChokePower += pf;
              if (pf < minChokePower) minChokePower = pf;
            }
          }
          var avgChokePower =
            chokePositions.length > 0
              ? totalChokePower / chokePositions.length
              : 0.5;

          // 2. Base repair & core defense score: proximity to spawn, controller, storage
          var rangeToSpawn = Math.max(
            Math.abs(cx - spawnPos.x),
            Math.abs(cy - spawnPos.y)
          );
          var spawnPower = getPowerFactor(rangeToSpawn);

          var storagePower = 0.5;
          if (room.storage) {
            var rangeToStorage = Math.max(
              Math.abs(cx - room.storage.pos.x),
              Math.abs(cy - room.storage.pos.y)
            );
            storagePower = getPowerFactor(rangeToStorage);
          } else if (room.memory && room.memory.storagePos) {
            var rangeToStoragePos = Math.max(
              Math.abs(cx - room.memory.storagePos.x),
              Math.abs(cy - room.memory.storagePos.y)
            );
            storagePower = getPowerFactor(rangeToStoragePos);
          }

          // Checkerboard parity bonus (allows smooth road routing around tower)
          var parity = (spawnPos.x + spawnPos.y) % 2;
          var parityBonus = (cx + cy) % 2 === parity ? 0.05 : 0;

          // Road adjacency bonus (easier connection)
          var pos = new RoomPosition(cx, cy, room.name);
          var roadBonus = self.isAdjacentToRoadOrBlueprint(room, pos)
            ? 0.05
            : 0;

          // Overall composite optimization score:
          // 40% avg choke defense + 25% min choke defense (no blind spots) +
          // 20% spawn defense/repair + 15% storage repair + bonuses
          var score =
            avgChokePower * 0.4 +
            minChokePower * 0.25 +
            spawnPower * 0.2 +
            storagePower * 0.15 +
            parityBonus +
            roadBonus;

          candidates.push({ pos: pos, score: score, x: cx, y: cy });
        }
      }
    }

    if (candidates.length === 0) return;

    // Sort candidates descending by optimization score
    candidates.sort(function (a, b) {
      return b.score - a.score;
    });

    var towersPlaced = 0;
    for (
      let i = 0;
      i < candidates.length && towersPlaced < neededTowers;
      i++
    ) {
      let candidate = candidates[i];
      // Re-verify no other tower was placed adjacent in this same loop
      var tooClose = false;
      for (var at = 0; at < allTowers.length; at++) {
        if (
          Math.max(
            Math.abs(candidate.x - allTowers[at].x),
            Math.abs(candidate.y - allTowers[at].y)
          ) < 3
        ) {
          tooClose = true;
          break;
        }
      }
      if (tooClose) continue;

      var res = this.createSite(
        room,
        candidate.x,
        candidate.y,
        STRUCTURE_TOWER,
        80
      );
      if (res === OK) {
        towersPlaced++;
        allTowers.push(candidate.pos);

        // Ensure newly placed tower is connected to the road network
        this.connectToRoadNetwork(room, candidate.pos);
      } else if (res === ERR_FULL || res === ERR_RCL_NOT_ENOUGH || res === -1) {
        break;
      }
    }
  },

  /**
   * Helper alias for buildOptimalTowers.
   */
  buildTowers: function (spawner, precomputedInsideGrid) {
    return this.buildOptimalTowers(spawner, precomputedInsideGrid);
  },

  /**
   * Automatically places extensions in an optimized checkerboard layout around the spawn,
   * placing roads only where needed and connecting to the existing road network.
   * @param {StructureSpawn} spawner
   */
  buildExtensions: function (spawner) {
    var self = this;
    var room = spawner.room;
    this.ensureTickState(room);

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
    var inTickExtensions = this._inTickSites.filter(function (s) {
      return s.structureType === STRUCTURE_EXTENSION;
    });

    var neededExtensions =
      maxExtensions -
      (existingExtensions.length +
        extensionSites.length +
        inTickExtensions.length);
    if (neededExtensions <= 0) return;

    // Avoid exceeding the global construction sites budget (max 100 per player)
    if (this.getTotalSiteCount(room) >= 80) return;

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

          // Must not occupy storage position near spawner
          if (room.storage && x === room.storage.pos.x && y === room.storage.pos.y) continue;
          if (
            room.memory &&
            room.memory.storagePos &&
            x === room.memory.storagePos.x &&
            y === room.memory.storagePos.y
          ) {
            continue;
          }

          // Must not already have structures or construction sites
          if (room.lookForAt(LOOK_STRUCTURES, x, y).length > 0) continue;
          if (room.lookForAt(LOOK_CONSTRUCTION_SITES, x, y).length > 0) continue;
          if (self.hasInTickSiteAt(room, x, y)) continue;

          candidates.push(new RoomPosition(x, y, room.name));
        }
      }
    }

    // Sort candidate positions by range to spawner
    candidates.sort((a, b) => a.getRangeTo(spawnPos) - b.getRangeTo(spawnPos));

    var placedCount = 0;
    // Place extensions up to needed count (limit to 10 per cycle to prevent overwhelming builders)
    var batchLimit = Math.min(neededExtensions, 10);

    for (let i = 0; i < candidates.length && placedCount < batchLimit; i++) {
      let extPos = candidates[i];
      let res = self.createSite(
        room,
        extPos.x,
        extPos.y,
        STRUCTURE_EXTENSION,
        80
      );

      if (res === OK) {
        placedCount++;

        // Connect this extension to the existing road network FIRST before placing
        // its local cardinal roads so connectToRoadNetwork doesn't short-circuit on isolated local roads!
        self.connectToRoadNetwork(room, extPos);

        // Place road sites on empty checkerboard road neighbors (skips existing roads and blueprints)
        var adjacentRoads = [
          { x: extPos.x + 1, y: extPos.y },
          { x: extPos.x - 1, y: extPos.y },
          { x: extPos.x, y: extPos.y + 1 },
          { x: extPos.x, y: extPos.y - 1 },
        ];

        for (const adj of adjacentRoads) {
          self.placeRoadSite(room, adj.x, adj.y);
        }
      } else if (
        res === ERR_FULL ||
        res === ERR_RCL_NOT_ENOUGH ||
        res === -1
      ) {
        break;
      }
    }
  },

  /**
   * Computes the list of protected bounding rectangles around the spawn, built/planned extensions,
   * storage, towers, and existing controller container.
   * @param {StructureSpawn} spawner
   * @returns {Array<{x1: number, y1: number, x2: number, y2: number}>}
   */
  getProtectedRects: function (spawner) {
    var room = spawner.room;
    this.ensureTickState(room);
    var spawnPos = spawner.pos;

    var protectedRects = [
      {
        x1: Math.max(3, spawnPos.x - 5),
        y1: Math.max(3, spawnPos.y - 5),
        x2: Math.min(46, spawnPos.x + 5),
        y2: Math.min(46, spawnPos.y + 5),
      },
    ];

    var addPosToProtected = function (sPos) {
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
    };

    // Include built vital structures (extensions, storage, towers)
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
      addPosToProtected(vitalStructures[vs].pos);
    }

    // Include planned vital structure construction sites (extensions, storage, towers)
    var vitalSites = room.find(FIND_CONSTRUCTION_SITES, {
      filter: function (s) {
        return (
          s.structureType === STRUCTURE_EXTENSION ||
          s.structureType === STRUCTURE_STORAGE ||
          s.structureType === STRUCTURE_TOWER
        );
      },
    });
    for (var cs = 0; cs < vitalSites.length; cs++) {
      addPosToProtected(vitalSites[cs].pos);
    }

    // Include in-tick extension and tower sites
    for (var it = 0; it < this._inTickSites.length; it++) {
      if (
        this._inTickSites[it].structureType === STRUCTURE_EXTENSION ||
        this._inTickSites[it].structureType === STRUCTURE_TOWER
      ) {
        addPosToProtected(this._inTickSites[it]);
      }
    }

    // Include controller container in protected zones if present
    if (room.controller) {
      var ctrlContainer =
        room.controller.pos.findInRange(FIND_STRUCTURES, 4, {
          filter: { structureType: STRUCTURE_CONTAINER },
        })[0] ||
        room.controller.pos.findInRange(FIND_CONSTRUCTION_SITES, 4, {
          filter: { structureType: STRUCTURE_CONTAINER },
        })[0];

      if (ctrlContainer) {
        addPosToProtected(ctrlContainer.pos);
      }
    }

    // Include storage near spawner in protected zones if present or planned
    if (room.storage) {
      addPosToProtected(room.storage.pos);
    } else if (room.memory && room.memory.storagePos) {
      addPosToProtected(room.memory.storagePos);
    }

    return protectedRects;
  },

  /**
   * Detects complete, gapless choke point cuts using the 8-directional Min-Cut algorithm,
   * then creates rampart construction sites to seal off the base from all room exits.
   * @param {StructureSpawn} spawner
   * @returns {{ cutTiles: RoomPosition[], insideGrid: Uint8Array }}
   */
  buildChokePointRamparts: function (spawner) {
    var room = spawner.room;
    this.ensureTickState(room);

    var protectedRects = this.getProtectedRects(spawner);
    var minCutResult = minCut.calculate(room, protectedRects);
    var cutPositions = minCutResult.cutTiles;

    if (!room.controller || room.controller.level < 2) {
      return minCutResult; // Rampart construction requires RCL 2 or higher
    }

    if (this.getTotalSiteCount(room) >= 80) {
      return minCutResult;
    }

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

      if (
        !hasRampart &&
        !hasRampartSite &&
        !this.hasInTickSiteAt(room, corePos.x, corePos.y, STRUCTURE_RAMPART)
      ) {
        this.createSite(room, corePos.x, corePos.y, STRUCTURE_RAMPART, 80);
      }
    }

    // 2. Place rampart construction sites along the gapless min-cut choke perimeter
    for (var i = 0; i < cutPositions.length; i++) {
      var pos = cutPositions[i];

      var hasRampart = room
        .lookForAt(LOOK_STRUCTURES, pos.x, pos.y)
        .some((s) => s.structureType === STRUCTURE_RAMPART);
      var hasAnySite =
        room.lookForAt(LOOK_CONSTRUCTION_SITES, pos.x, pos.y).length > 0 ||
        this.hasInTickSiteAt(room, pos.x, pos.y);

      if (!hasRampart && !hasAnySite && this.getTotalSiteCount(room) < 80) {
        this.createSite(room, pos.x, pos.y, STRUCTURE_RAMPART, 80);
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

    return minCutResult;
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
    if (!protectedRects) {
      protectedRects = this.getProtectedRects(spawner);
    }
    return minCut.getCutTiles(room, protectedRects);
  },
};

module.exports = roomBuilder;
