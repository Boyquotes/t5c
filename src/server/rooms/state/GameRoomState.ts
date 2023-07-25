import { Schema, type, MapSchema, filterChildren } from "@colyseus/schema";
import { Client } from "colyseus";
import { Player, Enemy, Loot } from "../brain";
import { BrainSchema, Entity, LootSchema, PlayerSchema } from "../schema";

import { spawnCTRL } from "../controllers/spawnCTRL";
import { entityCTRL } from "../controllers/entityCTRL";

import { GameRoom } from "../GameRoom";
import { EntityState } from "../../../shared/Entities/Entity/EntityState";
import { NavMesh } from "../../../shared/yuka";

import { nanoid } from "nanoid";
import Logger from "../../../shared/Logger";
import { randomNumberInRange } from "../../../shared/Utils";
import { dataDB } from "../../../shared/Data/dataDB";

import { GetLoot, LootTableEntry } from "../../../shared/Entities/Player/LootTable";
import Config from "../../../shared/Config";

export class GameRoomState extends Schema {
    // networked variables
    /*
    @filterChildren(function (client, key, value: BrainSchema | LootSchema | PlayerSchema, root) {
        const isSelf = value.sessionId === client.sessionId;
        const player = (this as GameRoomState).entityCTRL.get(client.sessionId);
        const isWithinXBounds = Math.abs(player.x - value.x) < Config.PLAYER_VIEW_DISTANCE;
        const isWithinZBounds = Math.abs(player.z - value.z) < Config.PLAYER_VIEW_DISTANCE;
        const isWithinBounds = isWithinXBounds && isWithinZBounds;
        return isSelf || isWithinBounds;
    })*/
    @type({ map: Entity }) entities = new MapSchema<BrainSchema | LootSchema | PlayerSchema>();
    @type("number") serverTime: number = 0.0;

    // not networked variables
    public _gameroom: GameRoom = null;
    public spawnCTRL: spawnCTRL;
    public navMesh: NavMesh = null;
    public entityCTRL: entityCTRL;
    private roomDetails;

    constructor(gameroom: GameRoom, _navMesh: NavMesh, ...args: any[]) {
        super(...args);
        this._gameroom = gameroom;
        this.navMesh = _navMesh;
        this.roomDetails = dataDB.get("location", this._gameroom.metadata.location);
        //this._spawnCTRL = new spawnController(this);
        this.entityCTRL = new entityCTRL();

        setTimeout(() => {
            // add entity
            this.addEntity(1);
            this.addBot();
            this.addItem();
        }, 1000);
    }

    public update(deltaTime: number) {
        this.entityCTRL.all.forEach((entity) => {
            entity.update(deltaTime);
        });
    }

    getEntity(sessionId) {
        return this.entityCTRL.get(sessionId);
    }

    deleteEntity(sessionId) {
        return this.entityCTRL.delete(sessionId);
    }

    /**
     * Add item
     */
    public addItem() {
        // get starting starting position
        let randomRegion = this.navMesh.getRandomRegion();
        let point = randomRegion.centroid;

        // set up loot
        let lootTable = [
            LootTableEntry("sword_01", 25, 1, 1, 1, 1),
            LootTableEntry("potion_heal", 25, 1, 1, 1, 1),
            LootTableEntry("pear", 5, 1, 10, 1, 1),
            LootTableEntry("apple", 20, 1, 10, 1, 1),
            LootTableEntry(null, 20, 1, 1, 1, 1),
            LootTableEntry("amulet_01", 1, 1, 1, 1, 2),
            LootTableEntry(null, 150, 1, 1, 1, 2),
        ];
        // generate loot
        let loot = GetLoot(lootTable);

        // iterate loot
        loot.forEach((drop) => {
            console.log(drop);
            // drop item on the ground
            let item = dataDB.get("item", drop.id);
            let sessionId = nanoid(10);
            let currentPosition = point;
            currentPosition.x += randomNumberInRange(0.1, 1.5);
            currentPosition.z += randomNumberInRange(0.1, 1.5);
            let data = {
                key: drop.id,
                name: item.name,
                description: item.description,
                sessionId: sessionId,
                x: currentPosition.x,
                y: 0.25,
                z: currentPosition.z,
                quantity: drop.quantity,
            };

            // add to manager
            this.entityCTRL.add(new Loot(this, data));

            Logger.info("[gameroom][state][createEntity] created new item " + item.key + ": " + sessionId);
        });
    }

    /**
     * Add entity
     */
    public addEntity(delta) {
        // random id
        let sessionId = nanoid(10);

        // get starting starting position
        let randomRegion = this.navMesh.getRandomRegion();
        let point = randomRegion.centroid;

        // monster pool to chose from
        let randTypes = ["male_enemy"];
        let randResult = randTypes[Math.floor(Math.random() * randTypes.length)];
        let randData = dataDB.get("race", randResult);

        // create entity
        let data = {
            sessionId: sessionId,
            type: "entity",
            race: randData.key,
            name: randData.title + " #" + delta,
            location: this._gameroom.metadata.location,
            x: point.x,
            y: 0,
            z: point.z,
            rot: randomNumberInRange(0, Math.PI),
            health: randData.baseHealth,
            mana: randData.baseMana,
            maxHealth: randData.baseHealth,
            maxMana: randData.baseMana,
            level: 1,
            state: EntityState.IDLE,
            toRegion: false,
        };

        // add to manager
        this.entityCTRL.add(new Enemy(this, data));

        // log
        Logger.info("[gameroom][state][createEntity] created new entity " + randData.key + ": " + sessionId);
    }

    /**
     * Add player
     * @param client
     */
    addBot(): void {
        // random id
        let sessionId = nanoid(10);

        let data = this._gameroom.database.getCharacter(1).then((data) => {
            let player_data = {
                strength: 15,
                endurance: 16,
                agility: 15,
                intelligence: 20,
                wisdom: 20,
                experience: data.experience ?? 0,
                gold: data.gold ?? 0,
            };

            let player = {
                id: data.id,

                x: data.x,
                y: data.y,
                z: data.z,
                rot: data.rot,

                health: data.health,
                maxHealth: data.health,
                mana: data.mana,
                maxMana: data.mana,
                level: data.level,

                sessionId: sessionId,
                name: data.name,
                type: "player",
                race: "male_adventurer",

                location: data.location,
                sequence: 0,
                blocked: false,
                state: EntityState.IDLE,

                player_data: player_data,
                abilities: data.abilities ?? [],
                inventory: data.inventory ?? [],
            };

            this.entityCTRL.add(new Player(this, player));

            // log
            Logger.info(`[gameroom][onJoin] player ${sessionId} joined room ${this._gameroom.roomId}.`);
        });
    }

    /**
     * Add player
     * @param client
     */
    addPlayer(client: Client): void {
        // prepare player data

        let data = client.auth;

        let player_data = {
            strength: 15,
            endurance: 16,
            agility: 15,
            intelligence: 20,
            wisdom: 20,
            experience: data.experience ?? 0,
            gold: data.gold ?? 0,
        };

        let player = {
            id: data.id,

            x: data.x,
            y: data.y,
            z: data.z,
            rot: data.rot,

            health: data.health,
            maxHealth: data.health,
            mana: data.mana,
            maxMana: data.mana,
            level: data.level,

            sessionId: client.sessionId,
            name: data.name,
            type: "player",
            race: "male_adventurer",

            location: data.location,
            sequence: 0,
            blocked: false,
            state: EntityState.IDLE,

            player_data: player_data,
            abilities: data.abilities ?? [],
            inventory: data.inventory ?? [],
        };

        this.entityCTRL.add(new Player(this, player));

        // set player as online
        this._gameroom.database.toggleOnlineStatus(client.auth.id, 1);

        // log
        Logger.info(`[gameroom][onJoin] player ${client.sessionId} joined room ${this._gameroom.roomId}.`);
    }
}
